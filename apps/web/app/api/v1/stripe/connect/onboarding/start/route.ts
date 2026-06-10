import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api/responses";
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

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const url = new URL(request.url);
    const input = stripeAccountLinkSchema.parse({
      returnUrl: url.searchParams.get("returnUrl") ?? undefined,
      refreshUrl: url.searchParams.get("refreshUrl") ?? undefined
    });
    const config = getStripeConfig();
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        id: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true
      }
    });

    if (!organization) {
      return redirectToOrganizationSettings(request.url, "Organization not found.");
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

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return redirectToOrganizationSettings(request.url, "Stripe is not configured.");
    }

    if (error instanceof StripeApiError) {
      return redirectToOrganizationSettings(request.url, error.message);
    }

    return handleApiError(error);
  }
}

function redirectToOrganizationSettings(requestUrl: string, message: string) {
  const redirectUrl = new URL("/organization-settings", new URL(requestUrl).origin);
  redirectUrl.searchParams.set("stripe_error", message);
  return NextResponse.redirect(redirectUrl);
}
