import { ClientStatus, ClientSubscriptionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { pauseClientMembershipSchema, serializeClientSubscription } from "@/lib/payments/subscription-records";
import {
  getStripeConfig,
  pauseStripeSubscriptionCollection,
  StripeApiError,
  StripeConfigurationError
} from "@/lib/payments/stripe-connect";

interface ClientMembershipPauseContext {
  params: Promise<{ clientId: string }>;
}

export async function POST(request: Request, context: ClientMembershipPauseContext) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const { clientId } = await context.params;
    const input = pauseClientMembershipSchema.parse(await request.json());
    const pauseStartAt = dateOnlyToUtc(input.pauseStartDate);
    const pauseResumeAt = dateOnlyToUtc(input.pauseResumeDate);
    const pauseStartsNow = pauseStartAt.getTime() <= Date.now();
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const subscription = await prisma.clientSubscription.findFirst({
      where: {
        organizationId: actor.organizationId,
        clientId,
        status: {
          in: [
            ClientSubscriptionStatus.ACTIVE,
            ClientSubscriptionStatus.TRIALING,
            ClientSubscriptionStatus.PAST_DUE,
            ClientSubscriptionStatus.PAUSED
          ]
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    if (!subscription) {
      return errorResponse("subscription_not_found", "No active subscription was found for this client.", 404);
    }

    if (pauseStartsNow && subscription.stripeSubscriptionId) {
      const organization = await prisma.organization.findUnique({
        where: { id: actor.organizationId },
        select: { stripeConnectAccountId: true }
      });

      if (!organization?.stripeConnectAccountId) {
        return errorResponse("stripe_connect_required", "Stripe Connect onboarding is required before pausing subscriptions.", 409);
      }

      await pauseStripeSubscriptionCollection(getStripeConfig(), {
        connectedAccountId: organization.stripeConnectAccountId,
        subscriptionId: subscription.stripeSubscriptionId,
        resumeAt: pauseResumeAt
      });
    }

    const [updatedSubscription, updatedClient] = await prisma.$transaction(async (tx) => {
      const nextSubscription = await tx.clientSubscription.update({
        where: { id: subscription.id },
        data: {
          status: pauseStartsNow ? ClientSubscriptionStatus.PAUSED : subscription.status,
          pauseStartAt,
          pauseResumeAt
        }
      });
      const nextClient = pauseStartsNow
        ? await tx.client.update({
            where: { id: clientId, organizationId: actor.organizationId },
            data: { status: ClientStatus.DEACTIVATED }
          })
        : client;

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client_subscription.pause_scheduled",
          targetType: "client_subscription",
          targetId: subscription.id,
          metadata: {
            clientId,
            pauseStartDate: input.pauseStartDate,
            pauseResumeDate: input.pauseResumeDate,
            appliedImmediately: pauseStartsNow
          }
        }
      });

      return [nextSubscription, nextClient] as const;
    });

    return dataResponse({
      subscription: serializeClientSubscription(updatedSubscription),
      clientStatus: updatedClient.status.toLowerCase()
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

function dateOnlyToUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
