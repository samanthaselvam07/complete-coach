import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { getStripeRecurringForPackage, serializePackage } from "@/lib/payments/package-records";
import {
  createStripePrice,
  createStripeProduct,
  getStripeConfig,
  StripeApiError,
  StripeConfigurationError
} from "@/lib/payments/stripe-connect";

interface PackageStripeSyncRouteContext {
  params: Promise<{ packageId: string }>;
}

export async function POST(_request: Request, context: PackageStripeSyncRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const config = getStripeConfig();
    const { packageId } = await context.params;
    const [organization, coachingPackage] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: actor.organizationId },
        select: {
          id: true,
          stripeConnectAccountId: true
        }
      }),
      prisma.coachingPackage.findFirst({
        where: {
          id: packageId,
          organizationId: actor.organizationId,
          deletedAt: null
        }
      })
    ]);

    if (!organization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    if (!organization.stripeConnectAccountId) {
      return errorResponse("stripe_connect_required", "Stripe Connect onboarding is required before syncing packages.", 409);
    }

    if (!coachingPackage) {
      return errorResponse("not_found", "Package not found.", 404);
    }

    let stripeProductId = coachingPackage.stripeProductId;
    let stripePriceId = coachingPackage.stripePriceId;

    if (!stripeProductId) {
      const product = await createStripeProduct(config, {
        organizationId: actor.organizationId,
        packageId: coachingPackage.id,
        accountId: organization.stripeConnectAccountId,
        name: coachingPackage.name,
        description: coachingPackage.description
      });
      stripeProductId = product.id;
    }

    if (!stripePriceId) {
      const recurring = getStripeRecurringForPackage(coachingPackage);
      const price = await createStripePrice(config, {
        organizationId: actor.organizationId,
        packageId: coachingPackage.id,
        accountId: organization.stripeConnectAccountId,
        productId: stripeProductId,
        unitAmount: coachingPackage.priceAmount,
        currency: coachingPackage.currency,
        recurringInterval: recurring?.interval,
        recurringIntervalCount: recurring?.intervalCount
      });
      stripePriceId = price.id;
    }

    const syncedPackage = await prisma.coachingPackage.update({
      where: { id: coachingPackage.id, organizationId: actor.organizationId },
      data: {
        stripeProductId,
        stripePriceId
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "package.stripe_synced",
        targetType: "package",
        targetId: syncedPackage.id,
        metadata: {
          stripeProductId,
          stripePriceId
        }
      }
    });

    return dataResponse(serializePackage(syncedPackage));
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return errorResponse("stripe_unconfigured", "Stripe is not configured.", 503);
    }

    if (error instanceof StripeApiError) {
      return errorResponse("stripe_request_failed", "Stripe request failed.", 502, {
        status: error.status,
        message: error.message
      });
    }

    return handleApiError(error);
  }
}
