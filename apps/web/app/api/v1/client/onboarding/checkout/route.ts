import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { createClientSubscriptionCheckout } from "@/lib/payments/client-subscription-checkout";
import { StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const client = await prisma.client.findFirst({
      where: {
        id: actor.clientId,
        organizationId: actor.organizationId,
        clientUserId: actor.userId,
        deletedAt: null
      },
      select: {
        packageId: true,
        requiresOnlinePayment: true
      }
    });

    if (!client?.packageId) {
      return errorResponse("client_package_required", "No package payment is assigned to this client.", 404);
    }

    if (!client.requiresOnlinePayment) {
      return errorResponse("client_payment_not_required", "No online payment is assigned to this client.", 404);
    }

    const origin = new URL(request.url).origin;
    const checkout = await createClientSubscriptionCheckout({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      clientId: actor.clientId,
      packageId: client.packageId,
      requestUrl: request.url,
      successUrl: `${origin}/?payment=success`,
      cancelUrl: `${origin}/?payment=cancelled`
    });

    if ("response" in checkout) {
      return checkout.response;
    }

    return dataResponse(
      {
        checkoutUrl: checkout.checkoutUrl,
        subscription: checkout.serializedSubscription
      },
      { status: 201 }
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
