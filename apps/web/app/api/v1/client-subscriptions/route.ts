import { randomUUID } from "node:crypto";

import { ClientSubscriptionStatus, PackageStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildClientSubscriptionWhere,
  clientSubscriptionListQuerySchema,
  createClientSubscriptionSchema,
  serializeClientSubscription
} from "@/lib/payments/subscription-records";
import { isRecurringPackage } from "@/lib/payments/package-records";
import {
  buildDefaultConnectReturnUrls,
  createStripeCheckoutSession,
  createStripeCustomer,
  getStripeConfig,
  StripeApiError,
  StripeConfigurationError
} from "@/lib/payments/stripe-connect";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:read");
    const query = clientSubscriptionListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const subscriptions = await prisma.clientSubscription.findMany({
      where: buildClientSubscriptionWhere(actor.organizationId, query),
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        coachingPackage: {
          select: {
            name: true,
            priceAmount: true,
            currency: true
          }
        }
      }
    });

    return dataResponse(subscriptions.map(serializeClientSubscription));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const input = createClientSubscriptionSchema.parse(await request.json());
    const config = getStripeConfig();
    const [organization, client, coachingPackage, existingCustomerSubscription] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: actor.organizationId },
        select: {
          id: true,
          stripeConnectAccountId: true
        }
      }),
      prisma.client.findFirst({
        where: {
          id: input.clientId,
          organizationId: actor.organizationId,
          deletedAt: null
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }),
      prisma.coachingPackage.findFirst({
        where: {
          id: input.packageId,
          organizationId: actor.organizationId,
          deletedAt: null,
          status: PackageStatus.ACTIVE
        }
      }),
      prisma.clientSubscription.findFirst({
        where: {
          organizationId: actor.organizationId,
          clientId: input.clientId,
          stripeCustomerId: { not: null }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    if (!organization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    if (!organization.stripeConnectAccountId) {
      return errorResponse("stripe_connect_required", "Stripe Connect onboarding is required before creating subscriptions.", 409);
    }

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (!coachingPackage) {
      return errorResponse("not_found", "Package not found.", 404);
    }

    if (!isRecurringPackage(coachingPackage)) {
      return errorResponse("invalid_package", "Only recurring packages can create client subscriptions.", 422);
    }

    if (!coachingPackage.stripePriceId) {
      return errorResponse("stripe_price_required", "Package must be synced to Stripe before subscription creation.", 409);
    }

    const subscriptionId = randomUUID();
    const customerId =
      existingCustomerSubscription?.stripeCustomerId ??
      (
        await createStripeCustomer(config, {
          organizationId: actor.organizationId,
          clientId: client.id,
          accountId: organization.stripeConnectAccountId,
          email: client.email,
          name: `${client.firstName} ${client.lastName}`
        })
      ).id;
    const defaults = buildDefaultConnectReturnUrls(request.url);
    const checkoutSession = await createStripeCheckoutSession(config, {
      organizationId: actor.organizationId,
      clientId: client.id,
      packageId: coachingPackage.id,
      subscriptionId,
      customerId,
      priceId: coachingPackage.stripePriceId,
      connectedAccountId: organization.stripeConnectAccountId,
      successUrl: input.successUrl ?? defaults.returnUrl,
      cancelUrl: input.cancelUrl ?? defaults.refreshUrl
    });

    if (!checkoutSession.url) {
      return errorResponse("stripe_checkout_unavailable", "Stripe did not return a checkout URL.", 502);
    }

    const subscription = await prisma.clientSubscription.create({
      data: {
        id: subscriptionId,
        organizationId: actor.organizationId,
        clientId: client.id,
        packageId: coachingPackage.id,
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: checkoutSession.id,
        status: ClientSubscriptionStatus.INCOMPLETE
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        coachingPackage: {
          select: {
            name: true,
            priceAmount: true,
            currency: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client_subscription.checkout_created",
        targetType: "client_subscription",
        targetId: subscription.id,
        metadata: {
          clientId: client.id,
          packageId: coachingPackage.id,
          stripeCheckoutSessionId: checkoutSession.id
        }
      }
    });

    return dataResponse(
      {
        subscription: serializeClientSubscription(subscription),
        checkoutUrl: checkoutSession.url
      },
      {
        status: 201,
        headers: { Location: `/api/v1/client-subscriptions/${subscription.id}` }
      }
    );
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
