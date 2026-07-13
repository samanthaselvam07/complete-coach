import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";
import {
  createPlatformPortalSession,
  getPlatformStripeConfig,
  platformPortalSchema,
  resolvePlatformRedirectUrl
} from "@/lib/platform-billing/stripe-platform";

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const input = platformPortalSchema.parse(await request.json().catch(() => ({})));
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        platformStripeCustomerId: true
      }
    });

    if (!organization?.platformStripeCustomerId) {
      return errorResponse("platform_billing_required", "Start a platform subscription before opening billing management.", 409);
    }

    const portal = await createPlatformPortalSession(getPlatformStripeConfig(), {
      customerId: organization.platformStripeCustomerId,
      returnUrl: resolvePlatformRedirectUrl(request.url, input.returnUrl, "/organization-settings")
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "platform_billing.portal_opened",
        targetType: "platform_subscription",
        metadata: {
          stripeCustomerId: organization.platformStripeCustomerId,
          stripePortalSessionId: portal.id
        }
      }
    });

    return dataResponse({ portalUrl: portal.url });
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
