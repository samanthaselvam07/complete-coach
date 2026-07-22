import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createPlatformBillingCheckout } from "@/app/api/v1/platform-billing/checkout/route";
import { POST as createPlatformBillingPortal } from "@/app/api/v1/platform-billing/portal/route";
import { GET as getPlatformBillingStatus } from "@/app/api/v1/platform-billing/status/route";
import { POST as createStripeCustomerPortal } from "@/app/api/v1/stripe/customer-portal/route";
import {
  getPlatformPlanById,
  getPlatformPlanByPriceId,
  PLATFORM_PLANS
} from "@/lib/platform-billing/plans";
import { evaluatePlatformBillingAccess } from "@/lib/platform-billing/rules";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    client: { count: vi.fn() },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    organizationMembership: { count: vi.fn() }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "owner@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const coachSession = {
  ...ownerSession,
  activeOrganization: {
    ...ownerSession.activeOrganization,
    role: "coach"
  }
};

const organizationRecord = {
  id: "org_1",
  name: "Complete Coach Demo",
  platformPlan: "core",
  platformStripeCustomerId: "cus_platform_1",
  platformStripeSubscriptionId: "sub_platform_1",
  platformSubscriptionStatus: "active",
  platformCurrentPeriodEnd: new Date("2026-08-13T00:00:00.000Z")
};

describe("platform billing plan config", () => {
  it("maps Design Partners, Core, Pro, and Scale Stripe products and monthly prices to platform limits", () => {
    expect(PLATFORM_PLANS).toEqual({
      design_partner: expect.objectContaining({
        id: "design_partner",
        name: "Design Partners",
        stripeProductId: "prod_UsKvRz38e79sjQ",
        stripePriceId: "price_1TsaFuI51UQp7jCTfRTLC7UH",
        stripePaymentLinkUrl: "https://buy.stripe.com/6oU4gzgYk1X71ZagMJ0ZW04",
        coachSeatLimit: 10,
        clientLimit: 200
      }),
      core: expect.objectContaining({
        id: "core",
        name: "Core",
        stripeProductId: "prod_UsL4rRweWAB2XU",
        stripePriceId: "price_1Tvoc2I51UQp7jCTLDt3lc9w",
        stripePaymentLinkUrl: "https://buy.stripe.com/cNi00jgYkbxHeLW2VT0ZW02",
        coachSeatLimit: 1,
        clientLimit: 40
      }),
      pro: expect.objectContaining({
        id: "pro",
        name: "Pro",
        stripeProductId: "prod_UsL4hUCHyBkvkK",
        stripePriceId: "price_1TsaOPI51UQp7jCTB9TvXUIK",
        stripePaymentLinkUrl: "https://buy.stripe.com/cNi7sLdM8fNX0V6gMJ0ZW00",
        coachSeatLimit: 3,
        clientLimit: 60
      }),
      scale: expect.objectContaining({
        id: "scale",
        name: "Scale",
        stripeProductId: "prod_UvfzpLEEOi5N4H",
        stripePriceId: "price_1TvoddI51UQp7jCTIwk4C6rI",
        stripePaymentLinkUrl: "https://buy.stripe.com/aFafZh6jG6dnbzK9kh0ZW03",
        coachSeatLimit: 10,
        clientLimit: 200
      })
    });
    expect(getPlatformPlanById("core")?.clientLimit).toBe(40);
    expect(getPlatformPlanByPriceId("price_1TsaFuI51UQp7jCTfRTLC7UH")?.id).toBe("design_partner");
    expect(getPlatformPlanByPriceId("price_1TsaOPI51UQp7jCTB9TvXUIK")?.id).toBe("pro");
    expect(getPlatformPlanByPriceId("price_1TvoddI51UQp7jCTIwk4C6rI")?.id).toBe("scale");
    expect(getPlatformPlanByPriceId("price_unknown")).toBeNull();
  });
});

describe("platform billing access rules", () => {
  it("allows active and trialing organizations", () => {
    expect(evaluatePlatformBillingAccess("active")).toEqual(
      expect.objectContaining({
        state: "active",
        canUsePlatform: true
      })
    );
    expect(evaluatePlatformBillingAccess("trialing").canUsePlatform).toBe(true);
  });

  it("blocks past-due organizations because payment is overdue", () => {
    expect(evaluatePlatformBillingAccess("past_due")).toEqual(
      expect.objectContaining({
        state: "blocked",
        canUsePlatform: false,
        reason: "payment_attention_required"
      })
    );
  });

  it("blocks cancelled subscriptions immediately", () => {
    expect(evaluatePlatformBillingAccess("canceled")).toEqual(
      expect.objectContaining({
        state: "blocked",
        canUsePlatform: false,
        reason: "subscription_inactive"
      })
    );
  });

  it("blocks incomplete, unpaid, expired, and ended subscriptions", () => {
    expect(evaluatePlatformBillingAccess("not_started").canUsePlatform).toBe(false);
    expect(evaluatePlatformBillingAccess("incomplete").canUsePlatform).toBe(false);
    expect(evaluatePlatformBillingAccess("unpaid").canUsePlatform).toBe(false);
    expect(evaluatePlatformBillingAccess("incomplete_expired").canUsePlatform).toBe(false);
    expect(
      evaluatePlatformBillingAccess("canceled")
    ).toEqual(
      expect.objectContaining({
        state: "blocked",
        canUsePlatform: false,
        reason: "subscription_inactive"
      })
    );
  });
});

describe("platform billing APIs", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_BASE_URL;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(ownerSession);
  });

  it("returns organization platform billing state with plan limits and usage", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue(organizationRecord);
    mocks.prisma.organizationMembership.count.mockResolvedValue(1);
    mocks.prisma.client.count.mockResolvedValue(24);

    const response = await getPlatformBillingStatus();
    const payload = (await response.json()) as {
      data: {
        organizationId: string;
        plan: { id: string; coachSeatLimit: number; clientLimit: number };
        status: string;
        access: { state: string; canUsePlatform: boolean; reason: string };
        usage: { coachSeats: number; clients: number };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        organizationId: "org_1",
        status: "active",
        access: expect.objectContaining({
          state: "active",
          canUsePlatform: true,
          reason: "subscription_active"
        }),
        plan: expect.objectContaining({ id: "core", coachSeatLimit: 1, clientLimit: 40 }),
        usage: { coachSeats: 1, clients: 24 }
      })
    );
    expect(mocks.prisma.organizationMembership.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN", "COACH", "ASSISTANT"] }
      }
    });
    expect(mocks.prisma.client.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        deletedAt: null
      }
    });
  });

  it("creates a Checkout subscription for the selected platform plan without a connected-account header", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "cus_new" }))
      .mockResolvedValueOnce(Response.json({ id: "cs_platform", url: "https://checkout.stripe.test/platform" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      ...organizationRecord,
      platformPlan: null,
      platformStripeCustomerId: null,
      platformStripeSubscriptionId: null,
      platformSubscriptionStatus: "not_started",
      platformCurrentPeriodEnd: null
    });
    mocks.prisma.organization.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createPlatformBillingCheckout(
      new Request("https://app.example.com/api/v1/platform-billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: "pro", successUrl: "/organization-settings?billing=success" })
      })
    );
    const payload = (await response.json()) as { data: { checkoutUrl: string } };

    expect(response.status).toBe(200);
    expect(payload.data.checkoutUrl).toBe("https://checkout.stripe.test/platform");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://stripe.test/v1/customers");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("metadata%5Borganization_id%5D=org_1");
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Stripe-Account");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://stripe.test/v1/checkout/sessions");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("mode=subscription");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("line_items%5B0%5D%5Bprice%5D=price_1TsaOPI51UQp7jCTB9TvXUIK");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("metadata%5Bbilling_type%5D=platform_subscription");
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty("Stripe-Account");
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: { platformStripeCustomerId: "cus_new" }
    });
  });

  it("reuses an existing platform customer when creating Checkout", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "cs_platform", url: "https://checkout.stripe.test/core" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue(organizationRecord);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createPlatformBillingCheckout(
      new Request("https://app.example.com/api/v1/platform-billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: "core" })
      })
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("customer=cus_platform_1");
    expect(mocks.prisma.organization.update).not.toHaveBeenCalled();
  });

  it("creates a Stripe billing portal session for the platform customer", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "bps_1", url: "https://billing.stripe.test/session" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue(organizationRecord);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createPlatformBillingPortal(
      new Request("https://app.example.com/api/v1/platform-billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl: "/organization-settings" })
      })
    );
    const payload = (await response.json()) as { data: { portalUrl: string } };

    expect(response.status).toBe(200);
    expect(payload.data.portalUrl).toBe("https://billing.stripe.test/session");
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://stripe.test/v1/billing_portal/sessions");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("customer=cus_platform_1");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("return_url=https%3A%2F%2Fapp.example.com%2Forganization-settings");
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Stripe-Account");
  });

  it("exposes an explicit Stripe customer portal endpoint for the platform customer", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "bps_2", url: "https://billing.stripe.test/customer" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue(organizationRecord);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createStripeCustomerPortal(
      new Request("https://app.example.com/api/v1/stripe/customer-portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl: "/organization-settings" })
      })
    );
    const payload = (await response.json()) as { data: { portalUrl: string } };

    expect(response.status).toBe(200);
    expect(payload.data.portalUrl).toBe("https://billing.stripe.test/customer");
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://stripe.test/v1/billing_portal/sessions");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("customer=cus_platform_1");
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Stripe-Account");
  });

  it("requires an existing platform customer before opening the billing portal", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({
      ...organizationRecord,
      platformStripeCustomerId: null
    });

    const response = await createPlatformBillingPortal(
      new Request("https://app.example.com/api/v1/platform-billing/portal", {
        method: "POST",
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(409);
  });

  it("blocks non-owner platform billing management", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.auth.mockResolvedValue(coachSession);

    const response = await createPlatformBillingCheckout(
      new Request("https://app.example.com/api/v1/platform-billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: "core" })
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.organization.findUnique).not.toHaveBeenCalled();
  });
});
