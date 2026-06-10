import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  createExpressDashboardLoginLink,
  getStripeConfig,
  StripeApiError,
  StripeConfigurationError
} from "@/lib/payments/stripe-connect";

export async function POST() {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const config = getStripeConfig();
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true
      }
    });

    if (!organization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    if (!organization.stripeConnectAccountId) {
      return errorResponse("stripe_connect_required", "Stripe Connect onboarding is required before opening the dashboard.", 409);
    }

    const loginLink = await createExpressDashboardLoginLink(config, {
      accountId: organization.stripeConnectAccountId
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "stripe_connect.dashboard_link_created",
        targetType: "stripe_connect_account",
        targetId: organization.stripeConnectAccountId,
        metadata: {
          status: organization.stripeConnectStatus
        }
      }
    });

    return dataResponse({
      accountId: organization.stripeConnectAccountId,
      status: organization.stripeConnectStatus ?? "unknown",
      dashboardUrl: loginLink.url
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
