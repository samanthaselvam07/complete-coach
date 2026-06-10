import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildDefaultConnectReturnUrls,
  createAccountLink,
  createConnectedAccount,
  getStripeConfig,
  resolveConnectRedirectUrl,
  StripeApiError,
  StripeConfigurationError,
  stripeAccountLinkSchema
} from "@/lib/payments/stripe-connect";

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const input = stripeAccountLinkSchema.parse(await request.json().catch(() => ({})));
    const config = getStripeConfig();
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        id: true,
        name: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true
      }
    });

    if (!organization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    let accountId = organization.stripeConnectAccountId;
    let accountStatus = organization.stripeConnectStatus ?? "not-started";

    if (!accountId) {
      const account = await createConnectedAccount(config, {
        organizationId: organization.id
      });
      accountId = account.accountId;
      accountStatus = account.status;

      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          stripeConnectAccountId: accountId,
          stripeConnectStatus: accountStatus
        }
      });
    }

    const defaults = buildDefaultConnectReturnUrls(request.url);
    const accountLink = await createAccountLink(config, {
      accountId,
      returnUrl: resolveConnectRedirectUrl(request.url, input.returnUrl, defaults.returnUrl),
      refreshUrl: resolveConnectRedirectUrl(request.url, input.refreshUrl, defaults.refreshUrl)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "stripe_connect.account_link_created",
        targetType: "stripe_connect_account",
        targetId: accountId,
        metadata: {
          status: accountStatus,
          expiresAt: accountLink.expires_at
        }
      }
    });

    return dataResponse({
      accountId,
      status: accountStatus,
      onboardingUrl: accountLink.url,
      expiresAt: new Date(accountLink.expires_at * 1000).toISOString()
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
