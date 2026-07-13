import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  deriveConnectStatus,
  getStripeConfig,
  retrieveConnectedAccount,
  StripeApiError,
  StripeConfigurationError
} from "@/lib/payments/stripe-connect";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "payments:read");
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
      return dataResponse({
        connected: false,
        status: "not-connected"
      });
    }

    let status = organization.stripeConnectStatus ?? "unknown";

    try {
      const account = await retrieveConnectedAccount(getStripeConfig(), organization.stripeConnectAccountId);
      status = deriveConnectStatus(account);

      if (status !== organization.stripeConnectStatus) {
        await prisma.organization.update({
          where: { id: actor.organizationId },
          data: { stripeConnectStatus: status }
        });
      }
    } catch (error) {
      if (!(error instanceof StripeConfigurationError || error instanceof StripeApiError)) {
        throw error;
      }
    }

    return dataResponse({
      connected: true,
      status
    });
  } catch (error) {
    return handleApiError(error);
  }
}
