import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { createClientSubscriptionCheckout } from "@/lib/payments/client-subscription-checkout";
import {
  buildClientSubscriptionWhere,
  clientSubscriptionListQuerySchema,
  createClientSubscriptionSchema,
  serializeClientSubscription
} from "@/lib/payments/subscription-records";
import {
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
    const checkout = await createClientSubscriptionCheckout({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      clientId: input.clientId,
      packageId: input.packageId,
      requestUrl: request.url,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    });

    if ("response" in checkout) {
      return checkout.response;
    }

    return dataResponse(
      {
        subscription: checkout.serializedSubscription,
        checkoutUrl: checkout.checkoutUrl
      },
      {
        status: 201,
        headers: { Location: `/api/v1/client-subscriptions/${checkout.subscription.id}` }
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
