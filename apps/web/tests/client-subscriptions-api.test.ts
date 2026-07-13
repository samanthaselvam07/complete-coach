import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ClientSubscriptionStatus,
  PackageBillingInterval,
  PackageStatus
} from "@/app/generated/prisma/enums";
import { GET as listClientSubscriptions, POST as createClientSubscription } from "@/app/api/v1/client-subscriptions/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    client: { findFirst: vi.fn() },
    clientSubscription: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    coachingPackage: { findFirst: vi.fn() },
    organization: { findUnique: vi.fn() }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const now = new Date("2026-05-18T00:00:00.000Z");

const clientRecord = {
  id: "client_1",
  firstName: "Sarah",
  lastName: "Johnson",
  email: "sarah@example.com"
};

const packageRecord = {
  id: "package_1",
  organizationId: "org_1",
  name: "Gold Standard",
  description: "Premium coaching",
  priceAmount: 39900,
  currency: "usd",
  billingInterval: PackageBillingInterval.MONTHLY,
  stripeProductId: "prod_1",
  stripePriceId: "price_1",
  status: PackageStatus.ACTIVE,
  featuresJson: [],
  color: "yellow",
  createdAt: now,
  updatedAt: now,
  deletedAt: null
};

const subscriptionRecord = {
  id: "subscription_1",
  organizationId: "org_1",
  clientId: "client_1",
  packageId: "package_1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: null,
  stripeCheckoutSessionId: "cs_1",
  status: ClientSubscriptionStatus.INCOMPLETE,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAt: null,
  createdAt: now,
  updatedAt: now,
  client: clientRecord,
  coachingPackage: {
    name: "Gold Standard",
    priceAmount: 39900,
    currency: "usd"
  }
};

describe("client subscription APIs", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_BASE_URL;
    vi.unstubAllGlobals();
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.clientSubscription.create.mockReset();
    mocks.prisma.clientSubscription.findMany.mockReset();
    mocks.prisma.clientSubscription.findFirst.mockReset();
    mocks.prisma.coachingPackage.findFirst.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
  });

  it("lists tenant-scoped client subscriptions", async () => {
    mocks.prisma.clientSubscription.findMany.mockResolvedValue([subscriptionRecord]);

    const response = await listClientSubscriptions(
      new Request("http://test.local/api/v1/client-subscriptions?clientId=client_1&status=incomplete")
    );
    const payload = (await response.json()) as {
      data: Array<{ id: string; client: { name: string } | null; package: { name: string } | null }>;
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "subscription_1",
        client: { name: "Sarah Johnson", email: "sarah@example.com" },
        package: { name: "Gold Standard", priceAmount: 39900, currency: "usd" }
      })
    ]);
    expect(mocks.prisma.clientSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1",
          status: ClientSubscriptionStatus.INCOMPLETE
        }
      })
    );
  });

  it("creates a Stripe Checkout session and local incomplete subscription", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "cus_1" }))
      .mockResolvedValueOnce(Response.json({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);
    mocks.prisma.clientSubscription.create.mockResolvedValue(subscriptionRecord);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client_1",
          packageId: "package_1",
          successUrl: "https://app.example.com/success",
          cancelUrl: "https://app.example.com/cancel"
        })
      })
    );
    const payload = (await response.json()) as {
      data: { checkoutUrl: string; subscription: { stripeCheckoutSessionId: string | null } };
    };

    expect(response.status).toBe(201);
    expect(payload.data.checkoutUrl).toBe("https://checkout.stripe.test/cs_1");
    expect(payload.data.subscription.stripeCheckoutSessionId).toBe("cs_1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(fetchMock.mock.calls[1][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("email=sarah%40example.com");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("mode=subscription");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("line_items%5B0%5D%5Bprice%5D=price_1");
    expect(String(fetchMock.mock.calls[1][1].body)).not.toContain("transfer_data");
    expect(mocks.prisma.clientSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          packageId: "package_1",
          stripeCustomerId: "cus_1",
          stripeCheckoutSessionId: "cs_1",
          status: ClientSubscriptionStatus.INCOMPLETE
        })
      })
    );
  });

  it("reuses an existing Stripe customer id for the client", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue({ stripeCustomerId: "cus_existing" });
    mocks.prisma.clientSubscription.create.mockResolvedValue({
      ...subscriptionRecord,
      stripeCustomerId: "cus_existing"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("customer=cus_existing");
  });

  it("requires Stripe Connect and synced monthly packages before creation", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: null });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("returns not found when the active organization record is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue(null);
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("returns service unavailable when Stripe is not configured", async () => {
    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("stripe_unconfigured");
    expect(mocks.prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("returns not found when the client is outside the active organization", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(null);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_other", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("rejects one-time or unsynced packages", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue({
      ...packageRecord,
      billingInterval: PackageBillingInterval.ONE_TIME
    });
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("returns not found for packages outside the active organization", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(null);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_other" })
      })
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("requires a Stripe price before creating a monthly subscription", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue({
      ...packageRecord,
      stripePriceId: null
    });
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("maps Stripe Checkout request failures to a gateway error", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "cus_1" }))
      .mockResolvedValueOnce(Response.json({ error: { message: "checkout unavailable" } }, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );
    const payload = (await response.json()) as { error: { code: string; details: { status: number } } };

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe("stripe_request_failed");
    expect(payload.error.details.status).toBe(400);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("rejects synced monthly package creation when Stripe omits a checkout URL", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "cus_1" }))
      .mockResolvedValueOnce(Response.json({ id: "cs_1", url: null }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", stripeConnectAccountId: "acct_1" });
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);

    const response = await createClientSubscription(
      new Request("http://test.local/api/v1/client-subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", packageId: "package_1" })
      })
    );

    expect(response.status).toBe(502);
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });
});
