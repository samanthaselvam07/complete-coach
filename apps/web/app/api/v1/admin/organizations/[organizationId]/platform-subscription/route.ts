import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { serializeAdminPlatformBilling } from "@/lib/admin/admin-records";
import {
  adminPlatformSubscriptionSyncSchema,
  handlePlatformAdminGuardError,
  requirePlatformAdmin
} from "@/lib/admin/platform-admin";
import { prisma } from "@/lib/db/prisma";
import { getStripeConfig, StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";
import { PLATFORM_PLANS } from "@/lib/platform-billing/plans";

interface AdminOrganizationPlatformSubscriptionRouteContext {
  params: Promise<{ organizationId: string }>;
}

interface StripeSubscription {
  id: string;
  status?: string | null;
  customer?: string | { id?: string; name?: string | null; email?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  } | null;
}

interface StripeSubscriptionList {
  data?: StripeSubscription[];
}

export async function GET() {
  try {
    requirePlatformAdmin(await auth());

    return dataResponse({
      plans: Object.values(PLATFORM_PLANS).map((plan) => ({
        id: plan.id,
        name: plan.name,
        stripeProductId: plan.stripeProductId,
        stripePriceId: plan.stripePriceId,
        coachSeatLimit: plan.coachSeatLimit,
        clientLimit: plan.clientLimit
      }))
    });
  } catch (error) {
    const guardError = handlePlatformAdminGuardError(error);

    if (guardError) {
      return errorResponse(guardError.code, guardError.message, guardError.status);
    }

    return handleApiError(error);
  }
}

export async function POST(request: Request, context: AdminOrganizationPlatformSubscriptionRouteContext) {
  try {
    const actor = requirePlatformAdmin(await auth());
    const { organizationId } = await context.params;
    const input = adminPlatformSubscriptionSyncSchema.parse(await request.json().catch(() => ({})));
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        platformStripeCustomerId: true,
        platformStripeSubscriptionId: true
      }
    });

    if (!organization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    const plan = PLATFORM_PLANS[input.planId];
    const stripeSubscription = await findActiveStripeSubscriptionForPlan({
      organizationId,
      stripeCustomerId: organization.platformStripeCustomerId,
      stripeSubscriptionId: organization.platformStripeSubscriptionId,
      stripePriceId: plan.stripePriceId
    });

    if (!stripeSubscription) {
      return errorResponse(
        "active_stripe_subscription_not_found",
        `No active Complete Coach Stripe subscription was found for ${plan.name}.`,
        409
      );
    }

    const stripeCustomerId = getStripeCustomerId(stripeSubscription);
    const existingLinkedOrganization = await prisma.organization.findFirst({
      where: {
        id: { not: organizationId },
        OR: [
          { platformStripeSubscriptionId: stripeSubscription.id },
          ...(stripeCustomerId ? [{ platformStripeCustomerId: stripeCustomerId }] : [])
        ]
      },
      select: { id: true, name: true }
    });

    if (existingLinkedOrganization) {
      return errorResponse(
        "stripe_subscription_already_linked",
        `This Stripe subscription is already linked to ${existingLinkedOrganization.name}.`,
        409
      );
    }

    const stripePriceId = stripeSubscription.items?.data?.[0]?.price?.id ?? null;
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        platformPlan: plan.id,
        platformStripeCustomerId: stripeCustomerId,
        platformStripeSubscriptionId: stripeSubscription.id,
        platformSubscriptionStatus: stripeSubscription.status ?? "incomplete",
        platformCurrentPeriodStart: stripeTimestampToDate(stripeSubscription.current_period_start),
        platformCurrentPeriodEnd: stripeTimestampToDate(stripeSubscription.current_period_end),
        platformCancelAt: stripeTimestampToDate(stripeSubscription.cancel_at)
      },
      select: {
        platformPlan: true,
        platformStripeCustomerId: true,
        platformStripeSubscriptionId: true,
        platformSubscriptionStatus: true,
        platformCurrentPeriodStart: true,
        platformCurrentPeriodEnd: true,
        platformCancelAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: actor.userId,
        action: "platform.organization.platform_subscription_synced",
        targetType: "organization",
        targetId: organizationId,
        metadata: {
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId,
          stripePriceId,
          platformPlan: plan.id,
          platformSubscriptionStatus: stripeSubscription.status ?? null
        }
      }
    });

    return dataResponse({
      billing: serializeAdminPlatformBilling(updatedOrganization)
    });
  } catch (error) {
    const guardError = handlePlatformAdminGuardError(error);

    if (guardError) {
      return errorResponse(guardError.code, guardError.message, guardError.status);
    }

    if (error instanceof StripeConfigurationError) {
      return errorResponse("stripe_not_configured", "Stripe is not configured.", 503);
    }

    if (error instanceof StripeApiError) {
      return errorResponse("stripe_subscription_sync_failed", error.message, error.status);
    }

    return handleApiError(error);
  }
}

async function retrievePlatformStripeSubscription(subscriptionId: string) {
  const config = getStripeConfig();
  const response = await fetch(`${config.apiBaseUrl}/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new StripeApiError(getStripeErrorMessage(payload), response.status);
  }

  return payload as StripeSubscription;
}

async function findActiveStripeSubscriptionForPlan(input: {
  organizationId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string;
}) {
  if (input.stripeSubscriptionId) {
    const subscription = await retrievePlatformStripeSubscription(input.stripeSubscriptionId);

    if (stripeSubscriptionMatchesPlanAndOrganization(subscription, input)) {
      return subscription;
    }
  }

  const subscriptions = await listPlatformStripeSubscriptionsForPrice(input.stripePriceId);

  return subscriptions.find((subscription) => stripeSubscriptionMatchesPlanAndOrganization(subscription, input)) ?? null;
}

async function listPlatformStripeSubscriptionsForPrice(stripePriceId: string) {
  const config = getStripeConfig();
  const params = new URLSearchParams({
    status: "all",
    price: stripePriceId,
    limit: "100",
    "expand[]": "data.customer"
  });
  const response = await fetch(`${config.apiBaseUrl}/v1/subscriptions?${params.toString()}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new StripeApiError(getStripeErrorMessage(payload), response.status);
  }

  return (payload as StripeSubscriptionList).data ?? [];
}

function stripeSubscriptionMatchesPlanAndOrganization(
  subscription: StripeSubscription,
  input: { organizationId: string; stripeCustomerId: string | null; stripePriceId: string }
) {
  const status = subscription.status ?? "incomplete";

  return (
    (status === "active" || status === "trialing") &&
    getStripePriceId(subscription) === input.stripePriceId &&
    (subscription.metadata?.organization_id === input.organizationId ||
      Boolean(input.stripeCustomerId && getStripeCustomerId(subscription) === input.stripeCustomerId))
  );
}

function getStripePriceId(subscription: StripeSubscription) {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

function getStripeCustomerId(subscription: StripeSubscription) {
  if (typeof subscription.customer === "string") {
    return subscription.customer;
  }

  return subscription.customer?.id ?? null;
}

function stripeTimestampToDate(timestamp: number | null | undefined) {
  return typeof timestamp === "number" && Number.isFinite(timestamp) ? new Date(timestamp * 1000) : null;
}

function getStripeErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
  ) {
    return (payload as { error: { message: string } }).error.message;
  }

  return "Stripe request failed.";
}
