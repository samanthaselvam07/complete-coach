import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ClientSubscriptionStatus,
  PaymentEventProcessingStatus
} from "@/app/generated/prisma/enums";
import { POST as processStripeWebhook } from "@/app/api/webhooks/stripe/route";
import {
  getConnectStatusFromStripeObject,
  getFailedStatus,
  getStripeMetadataValue,
  getStripeString,
  mapStripeSubscriptionStatus,
  parseStripeEvent,
  sanitizeStripeEventPayload,
  StripeWebhookPayloadError,
  StripeWebhookSignatureError,
  verifyStripeWebhookSignature
} from "@/lib/payments/stripe-webhooks";

const mocks = vi.hoisted(() => ({
  prisma: {
    clientSubscription: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    paymentEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const nowSeconds = 1_779_033_600;

describe("Stripe webhook API", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowSeconds * 1000));
    mocks.prisma.clientSubscription.findFirst.mockReset();
    mocks.prisma.clientSubscription.update.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organization.findFirst.mockReset();
    mocks.prisma.organization.update.mockReset();
    mocks.prisma.paymentEvent.create.mockReset();
    mocks.prisma.paymentEvent.findUnique.mockReset();
    mocks.prisma.paymentEvent.update.mockReset();
    mocks.prisma.paymentEvent.findUnique.mockResolvedValue(null);
    mocks.prisma.paymentEvent.create.mockResolvedValue({ id: "payment_event_1" });
    mocks.prisma.paymentEvent.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid signatures before database writes", async () => {
    const response = await processStripeWebhook(
      new Request("http://test.local/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1779033600,v1=bad" },
        body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("invalid_signature");
    expect(mocks.prisma.paymentEvent.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.paymentEvent.create).not.toHaveBeenCalled();
  });

  it("treats duplicate Stripe events as idempotent no-ops", async () => {
    const event = {
      id: "evt_duplicate",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1", metadata: { organization_id: "org_1" } } }
    };
    mocks.prisma.paymentEvent.findUnique.mockResolvedValue({ id: "payment_event_existing" });

    const response = await processStripeWebhook(buildSignedRequest(event));
    const payload = (await response.json()) as { data: { received: boolean; duplicate: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ received: true, duplicate: true });
    expect(mocks.prisma.paymentEvent.create).not.toHaveBeenCalled();
    expect(mocks.prisma.clientSubscription.update).not.toHaveBeenCalled();
  });

  it("rejects signed payloads that are not valid Stripe event objects", async () => {
    const body = JSON.stringify({ id: "evt_missing_type" });
    const response = await processStripeWebhook(
      new Request("http://test.local/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": signStripePayload(body) },
        body
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("invalid_payload");
    expect(mocks.prisma.paymentEvent.create).not.toHaveBeenCalled();
  });

  it("persists checkout completion events and links Stripe ids to the local subscription", async () => {
    const event = {
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          subscription: "sub_1",
          metadata: {
            organization_id: "org_1",
            subscription_id: "client_subscription_1"
          }
        }
      }
    };
    mocks.prisma.clientSubscription.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.paymentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        stripeEventId: "evt_checkout",
        type: "checkout.session.completed",
        processingStatus: PaymentEventProcessingStatus.RECEIVED
      })
    });
    expect(mocks.prisma.clientSubscription.update).toHaveBeenCalledWith({
      where: {
        id: "client_subscription_1",
        organizationId: "org_1"
      },
      data: {
        stripeCheckoutSessionId: "cs_1",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1"
      }
    });
    expect(mocks.prisma.paymentEvent.update).toHaveBeenCalledWith({
      where: { id: "payment_event_1" },
      data: expect.objectContaining({
        processingStatus: PaymentEventProcessingStatus.PROCESSED,
        processedAt: expect.any(Date)
      })
    });
  });

  it("maps subscription update webhooks to trusted local subscription status and period dates", async () => {
    const event = {
      id: "evt_subscription",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          current_period_start: 1_779_033_600,
          current_period_end: 1_781_625_600,
          metadata: {
            organization_id: "org_1",
            subscription_id: "client_subscription_1"
          }
        }
      }
    };
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue({ id: "client_subscription_1" });
    mocks.prisma.clientSubscription.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.clientSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client_subscription_1",
        organizationId: "org_1"
      },
      select: { id: true }
    });
    expect(mocks.prisma.clientSubscription.update).toHaveBeenCalledWith({
      where: { id: "client_subscription_1" },
      data: {
        stripeSubscriptionId: "sub_1",
        stripeCustomerId: "cus_1",
        status: ClientSubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date("2026-05-17T16:00:00.000Z"),
        currentPeriodEnd: new Date("2026-06-16T16:00:00.000Z"),
        cancelAt: null
      }
    });
  });

  it("updates connected account status from account.updated webhooks", async () => {
    const event = {
      id: "evt_account",
      type: "account.updated",
      data: {
        object: {
          id: "acct_1",
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true
        }
      }
    };
    mocks.prisma.organization.findFirst.mockResolvedValue({ id: "org_1" });
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.findFirst).toHaveBeenCalledWith({
      where: { stripeConnectAccountId: "acct_1" },
      select: { id: true }
    });
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        stripeConnectAccountId: "acct_1",
        stripeConnectStatus: "active"
      }
    });
  });

  it("updates organization platform billing state from Checkout completion events", async () => {
    const event = {
      id: "evt_platform_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_platform_1",
          customer: "cus_platform_1",
          subscription: "sub_platform_1",
          metadata: {
            billing_type: "platform_subscription",
            organization_id: "org_1",
            platform_plan: "pro"
          }
        }
      }
    };
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        platformPlan: "pro",
        platformStripeCustomerId: "cus_platform_1",
        platformStripeSubscriptionId: "sub_platform_1",
        platformSubscriptionStatus: "incomplete"
      }
    });
    expect(mocks.prisma.clientSubscription.update).not.toHaveBeenCalled();
  });

  it("matches Payment Link checkout completion by client reference id", async () => {
    const event = {
      id: "evt_payment_link_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_payment_link_1",
          customer: "cus_payment_link_1",
          subscription: "sub_payment_link_1",
          client_reference_id: "org_1",
          metadata: {}
        }
      }
    };
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1" });
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org_1" },
      select: { id: true }
    });
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        platformStripeCustomerId: "cus_payment_link_1",
        platformStripeSubscriptionId: "sub_payment_link_1",
        platformSubscriptionStatus: "incomplete"
      }
    });
    expect(mocks.prisma.clientSubscription.update).not.toHaveBeenCalled();
  });

  it("updates organization platform billing state from subscription update events", async () => {
    const event = {
      id: "evt_platform_subscription",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_platform_1",
          customer: "cus_platform_1",
          status: "active",
          current_period_start: 1_779_033_600,
          current_period_end: 1_781_625_600,
          items: {
            data: [
              {
                price: {
                  id: "price_1TsaOPI51UQp7jCTB9TvXUIK"
                }
              }
            ]
          },
          metadata: {
            billing_type: "platform_subscription",
            organization_id: "org_1"
          }
        }
      }
    };
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        platformPlan: "pro",
        platformStripeCustomerId: "cus_platform_1",
        platformStripeSubscriptionId: "sub_platform_1",
        platformSubscriptionStatus: "active",
        platformCurrentPeriodStart: new Date("2026-05-17T16:00:00.000Z"),
        platformCurrentPeriodEnd: new Date("2026-06-16T16:00:00.000Z"),
        platformCancelAt: null
      }
    });
    expect(mocks.prisma.clientSubscription.update).not.toHaveBeenCalled();
  });

  it("treats metadata-free subscription updates with platform prices as platform billing", async () => {
    const event = {
      id: "evt_payment_link_subscription",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_payment_link_1",
          customer: "cus_payment_link_1",
          status: "active",
          current_period_start: 1_779_033_600,
          current_period_end: 1_781_625_600,
          items: {
            data: [
              {
                price: {
                  id: "price_1Tvoc2I51UQp7jCTLDt3lc9w"
                }
              }
            ]
          },
          metadata: {}
        }
      }
    };
    mocks.prisma.organization.findFirst.mockResolvedValue({ id: "org_1" });
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ platformStripeSubscriptionId: "sub_payment_link_1" }, { platformStripeCustomerId: "cus_payment_link_1" }]
      },
      select: { id: true }
    });
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        platformPlan: "core",
        platformStripeCustomerId: "cus_payment_link_1",
        platformStripeSubscriptionId: "sub_payment_link_1",
        platformSubscriptionStatus: "active",
        platformCurrentPeriodStart: new Date("2026-05-17T16:00:00.000Z"),
        platformCurrentPeriodEnd: new Date("2026-06-16T16:00:00.000Z"),
        platformCancelAt: null
      }
    });
    expect(mocks.prisma.clientSubscription.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.clientSubscription.update).not.toHaveBeenCalled();
  });

  it("maps the new Scale price when platform subscriptions update", async () => {
    const event = {
      id: "evt_platform_subscription_scale",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_platform_2",
          customer: "cus_platform_2",
          status: "active",
          current_period_start: 1_779_033_600,
          current_period_end: 1_781_625_600,
          items: {
            data: [
              {
                price: {
                  id: "price_1TvoddI51UQp7jCTIwk4C6rI"
                }
              }
            ]
          },
          metadata: {
            billing_type: "platform_subscription",
            organization_id: "org_1"
          }
        }
      }
    };
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        platformPlan: "scale",
        platformStripeCustomerId: "cus_platform_2",
        platformStripeSubscriptionId: "sub_platform_2",
        platformSubscriptionStatus: "active",
        platformCurrentPeriodStart: new Date("2026-05-17T16:00:00.000Z"),
        platformCurrentPeriodEnd: new Date("2026-06-16T16:00:00.000Z"),
        platformCancelAt: null
      }
    });
  });

  it("maps the Design Partners price when platform subscriptions update", async () => {
    const event = {
      id: "evt_platform_subscription_design_partner",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_platform_design_partner",
          customer: "cus_platform_design_partner",
          status: "active",
          current_period_start: 1_779_033_600,
          current_period_end: 1_781_625_600,
          items: {
            data: [
              {
                price: {
                  id: "price_1TsaFuI51UQp7jCTfRTLC7UH"
                }
              }
            ]
          },
          metadata: {
            billing_type: "platform_subscription",
            organization_id: "org_1"
          }
        }
      }
    };
    mocks.prisma.organization.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        platformPlan: "design_partner",
        platformStripeCustomerId: "cus_platform_design_partner",
        platformStripeSubscriptionId: "sub_platform_design_partner",
        platformSubscriptionStatus: "active",
        platformCurrentPeriodStart: new Date("2026-05-17T16:00:00.000Z"),
        platformCurrentPeriodEnd: new Date("2026-06-16T16:00:00.000Z"),
        platformCancelAt: null
      }
    });
  });

  it("persists unhandled matched events as ignored", async () => {
    const event = {
      id: "evt_unhandled",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_1",
          metadata: { organization_id: "org_1" }
        }
      }
    };

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.paymentEvent.update).toHaveBeenCalledWith({
      where: { id: "payment_event_1" },
      data: expect.objectContaining({
        processingStatus: PaymentEventProcessingStatus.IGNORED
      })
    });
  });

  it("returns accepted when a valid event cannot be matched to an organization", async () => {
    const event = {
      id: "evt_unmatched",
      type: "invoice.payment_succeeded",
      data: { object: { id: "in_1" } }
    };

    const response = await processStripeWebhook(buildSignedRequest(event));
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(202);
    expect(payload.error.code).toBe("unmatched_payment_event");
    expect(mocks.prisma.paymentEvent.create).not.toHaveBeenCalled();
  });

  it("marks payment events failed when a matched webhook cannot apply its state transition", async () => {
    const event = {
      id: "evt_failed_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          metadata: { organization_id: "org_1" }
        }
      }
    };

    const response = await processStripeWebhook(buildSignedRequest(event));
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(500);
    expect(payload.error.code).toBe("payment_event_processing_failed");
    expect(mocks.prisma.paymentEvent.update).toHaveBeenCalledWith({
      where: { id: "payment_event_1" },
      data: expect.objectContaining({
        processingStatus: PaymentEventProcessingStatus.FAILED,
        errorMessage: "Checkout session webhook is missing subscription metadata."
      })
    });
  });

  it("matches subscription events by trusted Stripe ids when local metadata is unavailable", async () => {
    const event = {
      id: "evt_subscription_fallback",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          metadata: { organization_id: "org_1" }
        }
      }
    };
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue({ id: "client_subscription_1" });
    mocks.prisma.clientSubscription.update.mockResolvedValue({});

    const response = await processStripeWebhook(buildSignedRequest(event));

    expect(response.status).toBe(200);
    expect(mocks.prisma.clientSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        OR: [{ stripeSubscriptionId: "sub_1" }, { stripeCustomerId: "cus_1" }]
      },
      select: { id: true }
    });
    expect(mocks.prisma.clientSubscription.update).toHaveBeenCalledWith({
      where: { id: "client_subscription_1" },
      data: expect.objectContaining({
        status: ClientSubscriptionStatus.CANCELED
      })
    });
  });

  it("redacts sensitive payment fields before persistence", () => {
    expect(
      sanitizeStripeEventPayload({
        id: "evt_1",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_1",
            client_secret: "secret",
            charges: {
              data: [
                {
                  billing_details: { email: "client@example.com" },
                  payment_method_details: { card: { last4: "4242" } }
                }
              ]
            }
          }
        }
      })
    ).toEqual({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          client_secret: "[redacted]",
          charges: {
            data: [
              {
                billing_details: "[redacted]",
                payment_method_details: "[redacted]"
              }
            ]
          }
        }
      }
    });
  });
});

describe("Stripe webhook helpers", () => {
  it("rejects missing, malformed, expired, and mismatched signatures", () => {
    expect(() =>
      verifyStripeWebhookSignature({ rawBody: "{}", signatureHeader: null, secret: "whsec_test", now: nowSeconds })
    ).toThrow(StripeWebhookSignatureError);
    expect(() =>
      verifyStripeWebhookSignature({ rawBody: "{}", signatureHeader: "t=1779033600", secret: "whsec_test", now: nowSeconds })
    ).toThrow(StripeWebhookSignatureError);
    expect(() =>
      verifyStripeWebhookSignature({
        rawBody: "{}",
        signatureHeader: signStripePayload("{}"),
        secret: "whsec_test",
        now: nowSeconds + 301
      })
    ).toThrow(StripeWebhookSignatureError);
    expect(() =>
      verifyStripeWebhookSignature({
        rawBody: "{}",
        signatureHeader: signStripePayload("different"),
        secret: "whsec_test",
        now: nowSeconds
      })
    ).toThrow(StripeWebhookSignatureError);
    expect(() =>
      verifyStripeWebhookSignature({ rawBody: "{}", signatureHeader: signStripePayload("{}"), secret: undefined, now: nowSeconds })
    ).toThrow(StripeWebhookSignatureError);
  });

  it("accepts any matching v1 signature and validates event shape", () => {
    const payload = JSON.stringify({ id: "evt_1", type: "invoice.created" });

    expect(() =>
      verifyStripeWebhookSignature({
        rawBody: payload,
        signatureHeader: `t=${nowSeconds},v1=00,${signStripePayload(payload).split(",")[1]}`,
        secret: "whsec_test",
        now: nowSeconds
      })
    ).not.toThrow();
    expect(parseStripeEvent(payload)).toEqual({ id: "evt_1", type: "invoice.created" });
    expect(() => parseStripeEvent(JSON.stringify({ id: "evt_1" }))).toThrow(StripeWebhookPayloadError);
    expect(() => parseStripeEvent("{")).toThrow(StripeWebhookPayloadError);
  });

  it("normalizes Stripe metadata, strings, statuses, and Connect flags defensively", () => {
    expect(getStripeMetadataValue({}, "organization_id")).toBeNull();
    expect(getStripeMetadataValue({ metadata: null }, "organization_id")).toBeNull();
    expect(getStripeMetadataValue({ metadata: { organization_id: "" } }, "organization_id")).toBeNull();
    expect(getStripeMetadataValue({ metadata: { organization_id: "org_1" } }, "organization_id")).toBe("org_1");
    expect(getStripeString({ id: "" }, "id")).toBeNull();
    expect(getStripeString({ id: 1 }, "id")).toBeNull();
    expect(mapStripeSubscriptionStatus("trialing")).toBe(ClientSubscriptionStatus.TRIALING);
    expect(mapStripeSubscriptionStatus("past_due")).toBe(ClientSubscriptionStatus.PAST_DUE);
    expect(mapStripeSubscriptionStatus("unpaid")).toBe(ClientSubscriptionStatus.UNPAID);
    expect(mapStripeSubscriptionStatus("paused")).toBe(ClientSubscriptionStatus.PAUSED);
    expect(mapStripeSubscriptionStatus("incomplete_expired")).toBe(ClientSubscriptionStatus.INCOMPLETE_EXPIRED);
    expect(mapStripeSubscriptionStatus("unknown")).toBe(ClientSubscriptionStatus.INCOMPLETE);
    expect(getConnectStatusFromStripeObject({ id: "acct_1" })).toBe("onboarding-required");
    expect(getConnectStatusFromStripeObject({ id: "acct_1", details_submitted: true })).toBe("pending-review");
    expect(getFailedStatus()).toBe(PaymentEventProcessingStatus.FAILED);
  });
});

function buildSignedRequest(event: unknown) {
  const body = JSON.stringify(event);

  return new Request("http://test.local/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signStripePayload(body) },
    body
  });
}

function signStripePayload(payload: string, timestamp = nowSeconds) {
  const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${payload}`).digest("hex");

  return `t=${timestamp},v1=${signature}`;
}
