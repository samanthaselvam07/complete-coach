import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";
import { PLATFORM_PLANS } from "@/lib/platform-billing/plans";
import {
  createPlatformCheckoutSession,
  createPlatformCustomer,
  getPlatformStripeConfig,
  platformCheckoutSchema,
  resolvePlatformRedirectUrl
} from "@/lib/platform-billing/stripe-platform";

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const input = platformCheckoutSchema.parse(await request.json().catch(() => ({})));
    const plan = PLATFORM_PLANS[input.planId];
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        id: true,
        name: true,
        platformStripeCustomerId: true
      }
    });

    if (!organization) {
      return errorResponse("organization_not_found", "Organization not found.", 404);
    }

    const config = getPlatformStripeConfig();
    let customerId = organization.platformStripeCustomerId;

    if (!customerId) {
      const customer = await createPlatformCustomer(config, {
        organizationId: actor.organizationId,
        organizationName: organization.name
      });
      customerId = customer.id;

      await prisma.organization.update({
        where: { id: actor.organizationId },
        data: { platformStripeCustomerId: customerId }
      });
    }

    const checkout = await createPlatformCheckoutSession(config, {
      organizationId: actor.organizationId,
      customerId,
      plan,
      successUrl: resolvePlatformRedirectUrl(request.url, input.successUrl, "/organization-settings?billing=success"),
      cancelUrl: resolvePlatformRedirectUrl(request.url, input.cancelUrl, "/organization-settings?billing=cancelled")
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "platform_billing.checkout_created",
        targetType: "platform_subscription",
        metadata: {
          plan: plan.id,
          stripeCheckoutSessionId: checkout.id
        }
      }
    });

    return dataResponse({
      checkoutUrl: checkout.url,
      plan
    });
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
