import type { InputJsonValue } from "@prisma/client/runtime/client";

import { PaymentEventProcessingStatus } from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { prisma } from "@/lib/db/prisma";
import {
  getConnectStatusFromStripeObject,
  getIgnoredStatus,
  getProcessedStatus,
  getStripeEventObject,
  getStripeMetadataValue,
  getStripeString,
  mapStripeSubscriptionStatus,
  parseStripeEvent,
  sanitizeStripeEventPayload,
  StripeEventPayload,
  StripeWebhookPayloadError,
  StripeWebhookSignatureError,
  verifyStripeWebhookSignature
} from "@/lib/payments/stripe-webhooks";
import { getPlatformPlanByPriceId } from "@/lib/platform-billing/plans";

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    verifyStripeWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get("stripe-signature"),
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });
  } catch (error) {
    if (error instanceof StripeWebhookSignatureError) {
      return errorResponse("invalid_signature", "Invalid Stripe webhook signature.", 400);
    }

    return handleApiError(error);
  }

  try {
    const event = parseStripeEvent(rawBody);
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingEvent) {
      return dataResponse({ received: true, duplicate: true });
    }

    const organizationId = await resolveOrganizationId(event);

    if (!organizationId) {
      return errorResponse("unmatched_payment_event", "Stripe webhook cannot be matched to an organization.", 202);
    }

    const paymentEvent = await prisma.paymentEvent.create({
      data: {
        organizationId,
        stripeEventId: event.id,
        type: event.type,
        payloadJson: sanitizeStripeEventPayload(event) as unknown as InputJsonValue,
        processingStatus: PaymentEventProcessingStatus.RECEIVED
      }
    });

    try {
      const processingStatus = await processStripeEvent(event, organizationId);

      await prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          processingStatus,
          processedAt: new Date()
        }
      });

      return dataResponse({ received: true, duplicate: false, status: processingStatus });
    } catch (error) {
      await prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          processingStatus: PaymentEventProcessingStatus.FAILED,
          processedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Stripe webhook processing failed."
        }
      });

      return errorResponse("payment_event_processing_failed", "Stripe webhook processing failed.", 500);
    }
  } catch (error) {
    if (error instanceof StripeWebhookPayloadError) {
      return errorResponse("invalid_payload", "Invalid Stripe webhook payload.", 400);
    }

    return handleApiError(error);
  }
}

async function resolveOrganizationId(event: StripeEventPayload) {
  const object = getStripeEventObject(event);
  const metadataOrganizationId = getStripeMetadataValue(object, "organization_id");

  if (metadataOrganizationId) {
    return metadataOrganizationId;
  }

  const clientReferenceId = event.type === "checkout.session.completed" ? getStripeString(object, "client_reference_id") : null;

  if (clientReferenceId) {
    const organization = await prisma.organization.findUnique({
      where: { id: clientReferenceId },
      select: { id: true }
    });

    if (organization) {
      return organization.id;
    }
  }

  const accountId = getStripeString(object, "id") ?? event.account ?? null;

  if (event.type === "account.updated" && accountId) {
    const organization = await prisma.organization.findFirst({
      where: { stripeConnectAccountId: accountId },
      select: { id: true }
    });

    return organization?.id ?? null;
  }

  const subscriptionId = getStripeString(object, "id") ?? getStripeString(object, "subscription");
  const customerId = getStripeString(object, "customer");

  if (subscriptionId || customerId) {
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          ...(subscriptionId ? [{ platformStripeSubscriptionId: subscriptionId }] : []),
          ...(customerId ? [{ platformStripeCustomerId: customerId }] : [])
        ]
      },
      select: { id: true }
    });

    if (organization) {
      return organization.id;
    }

    const subscription = await prisma.clientSubscription.findFirst({
      where: {
        OR: [
          ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
          ...(customerId ? [{ stripeCustomerId: customerId }] : [])
        ]
      },
      select: { organizationId: true }
    });

    return subscription?.organizationId ?? null;
  }

  return null;
}

async function processStripeEvent(event: StripeEventPayload, organizationId: string) {
  switch (event.type) {
    case "checkout.session.completed":
      await processCheckoutSessionCompleted(event, organizationId);
      return getProcessedStatus();
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await processSubscriptionChanged(event, organizationId);
      return getProcessedStatus();
    case "account.updated":
      await processAccountUpdated(event, organizationId);
      return getProcessedStatus();
    default:
      return getIgnoredStatus();
  }
}

async function processCheckoutSessionCompleted(event: StripeEventPayload, organizationId: string) {
  const object = getStripeEventObject(event);

  if (isPlatformCheckoutSession(object, organizationId)) {
    const platformPlan = getStripeMetadataValue(object, "platform_plan");

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(platformPlan ? { platformPlan } : {}),
        platformStripeCustomerId: getStripeString(object, "customer"),
        platformStripeSubscriptionId: getStripeString(object, "subscription"),
        platformSubscriptionStatus: getPlatformCheckoutSessionStatus(object)
      }
    });

    return;
  }

  const subscriptionId = getStripeMetadataValue(object, "subscription_id");

  if (!subscriptionId) {
    throw new Error("Checkout session webhook is missing subscription metadata.");
  }

  await prisma.clientSubscription.update({
    where: {
      id: subscriptionId,
      organizationId
    },
    data: {
      stripeCheckoutSessionId: getStripeString(object, "id"),
      stripeCustomerId: getStripeString(object, "customer"),
      stripeSubscriptionId: getStripeString(object, "subscription")
    }
  });
}

async function processSubscriptionChanged(event: StripeEventPayload, organizationId: string) {
  const object = getStripeEventObject(event);
  const platformPlan = getPlatformPlanByPriceId(getStripePriceId(object));

  if (getStripeMetadataValue(object, "billing_type") === "platform_subscription" || platformPlan) {
    await processPlatformSubscriptionChanged(event, organizationId);
    return;
  }

  const localSubscriptionId = getStripeMetadataValue(object, "subscription_id");
  const stripeSubscriptionId = getStripeString(object, "id");
  const stripeCustomerId = getStripeString(object, "customer");
  const subscription = localSubscriptionId
    ? await prisma.clientSubscription.findFirst({
        where: {
          id: localSubscriptionId,
          organizationId
        },
        select: { id: true }
      })
    : await prisma.clientSubscription.findFirst({
        where: {
          organizationId,
          OR: [
            ...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
            ...(stripeCustomerId ? [{ stripeCustomerId }] : [])
          ]
        },
        select: { id: true }
      });

  if (!subscription) {
    throw new Error("Subscription webhook cannot be matched to a local subscription.");
  }

  await prisma.clientSubscription.update({
    where: { id: subscription.id },
    data: {
      stripeSubscriptionId,
      stripeCustomerId,
      status:
        event.type === "customer.subscription.deleted"
          ? mapStripeSubscriptionStatus(getStripeString(object, "status") ?? "canceled")
          : mapStripeSubscriptionStatus(getStripeString(object, "status")),
      currentPeriodStart: getStripeTimestamp(object, "current_period_start"),
      currentPeriodEnd: getStripeTimestamp(object, "current_period_end"),
      cancelAt: getStripeTimestamp(object, "cancel_at")
    }
  });
}

function isPlatformCheckoutSession(object: Record<string, unknown>, organizationId: string) {
  if (getStripeMetadataValue(object, "billing_type") === "platform_subscription") {
    return true;
  }

  return (
    getStripeString(object, "client_reference_id") === organizationId &&
    Boolean(getStripeString(object, "customer")) &&
    Boolean(getStripeString(object, "subscription"))
  );
}

function getPlatformCheckoutSessionStatus(object: Record<string, unknown>) {
  const paymentStatus = getStripeString(object, "payment_status");

  if (paymentStatus === "paid" || paymentStatus === "no_payment_required") {
    return "active";
  }

  return "incomplete";
}

async function processPlatformSubscriptionChanged(event: StripeEventPayload, organizationId: string) {
  const object = getStripeEventObject(event);
  const stripePriceId = getStripePriceId(object);
  const plan = getPlatformPlanByPriceId(stripePriceId);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(plan ? { platformPlan: plan.id } : {}),
      platformStripeSubscriptionId: getStripeString(object, "id"),
      platformStripeCustomerId: getStripeString(object, "customer"),
      platformSubscriptionStatus:
        event.type === "customer.subscription.deleted" ? "canceled" : getStripeString(object, "status") ?? "incomplete",
      platformCurrentPeriodStart: getStripeTimestamp(object, "current_period_start"),
      platformCurrentPeriodEnd: getStripeTimestamp(object, "current_period_end"),
      platformCancelAt: getStripeTimestamp(object, "cancel_at")
    }
  });
}

async function processAccountUpdated(event: StripeEventPayload, organizationId: string) {
  const object = getStripeEventObject(event);
  const accountId = getStripeString(object, "id") ?? event.account ?? null;

  if (!accountId) {
    throw new Error("Account webhook is missing account id.");
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeConnectAccountId: accountId,
      stripeConnectStatus: getConnectStatusFromStripeObject(object)
    }
  });
}

function getStripeTimestamp(object: Record<string, unknown>, key: string) {
  const value = object[key];

  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

function getStripePriceId(object: Record<string, unknown>) {
  const items = object.items;

  if (typeof items !== "object" || items === null || !("data" in items) || !Array.isArray((items as { data: unknown }).data)) {
    return null;
  }

  const [firstItem] = (items as { data: unknown[] }).data;

  if (typeof firstItem !== "object" || firstItem === null || !("price" in firstItem)) {
    return null;
  }

  const price = (firstItem as { price?: unknown }).price;

  if (typeof price !== "object" || price === null || !("id" in price)) {
    return null;
  }

  const id = (price as { id?: unknown }).id;

  return typeof id === "string" ? id : null;
}
