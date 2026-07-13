import { beforeEach, describe, expect, it, vi } from "vitest";

import { PackageBillingInterval, PackageStatus } from "@/app/generated/prisma/enums";
import { POST as syncPackageToStripe } from "@/app/api/v1/packages/[packageId]/stripe-sync/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    coachingPackage: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    organization: {
      findUnique: vi.fn()
    }
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

const packageRecord = {
  id: "package_1",
  organizationId: "org_1",
  name: "Gold Standard",
  description: "Premium coaching",
  priceAmount: 39900,
  currency: "usd",
  billingInterval: PackageBillingInterval.MONTHLY,
  stripeProductId: null,
  stripePriceId: null,
  status: PackageStatus.ACTIVE,
  featuresJson: [],
  color: "yellow",
  createdAt: now,
  updatedAt: now,
  deletedAt: null
};

describe("package Stripe sync API", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_BASE_URL;
    vi.unstubAllGlobals();
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.coachingPackage.findFirst.mockReset();
    mocks.prisma.coachingPackage.update.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
  });

  it("creates trusted Stripe product and recurring price ids for a monthly package", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "prod_package_1" }))
      .mockResolvedValueOnce(Response.json({ id: "price_package_1" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: "acct_1"
    });
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.coachingPackage.update.mockResolvedValue({
      ...packageRecord,
      stripeProductId: "prod_package_1",
      stripePriceId: "price_package_1"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await syncPackageToStripe(
      new Request("http://test.local/api/v1/packages/package_1/stripe-sync", {
        method: "POST"
      }),
      { params: Promise.resolve({ packageId: "package_1" }) }
    );
    const payload = (await response.json()) as {
      data: { stripeProductId: string | null; stripePriceId: string | null };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({
      stripeProductId: "prod_package_1",
      stripePriceId: "price_package_1"
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(fetchMock.mock.calls[1][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("name=Gold+Standard");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("metadata%5Bpackage_id%5D=package_1");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("product=prod_package_1");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("unit_amount=39900");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("recurring%5Binterval%5D=month");
    expect(mocks.prisma.coachingPackage.update).toHaveBeenCalledWith({
      where: { id: "package_1", organizationId: "org_1" },
      data: {
        stripeProductId: "prod_package_1",
        stripePriceId: "price_package_1"
      }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "package.stripe_synced",
          targetId: "package_1"
        })
      })
    );
  });

  it("creates one-time prices without recurring parameters", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "prod_package_1" }))
      .mockResolvedValueOnce(Response.json({ id: "price_package_1" }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: "acct_1"
    });
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue({
      ...packageRecord,
      billingInterval: PackageBillingInterval.ONE_TIME
    });
    mocks.prisma.coachingPackage.update.mockResolvedValue({
      ...packageRecord,
      billingInterval: PackageBillingInterval.ONE_TIME,
      stripeProductId: "prod_package_1",
      stripePriceId: "price_package_1"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await syncPackageToStripe(
      new Request("http://test.local/api/v1/packages/package_1/stripe-sync", {
        method: "POST"
      }),
      { params: Promise.resolve({ packageId: "package_1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(fetchMock.mock.calls[1][1].headers["Stripe-Account"]).toBe("acct_1");
    expect(String(fetchMock.mock.calls[1][1].body)).not.toContain("recurring");
  });

  it("reuses existing Stripe ids without creating duplicate Stripe objects", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: "acct_1"
    });
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue({
      ...packageRecord,
      stripeProductId: "prod_existing",
      stripePriceId: "price_existing"
    });
    mocks.prisma.coachingPackage.update.mockResolvedValue({
      ...packageRecord,
      stripeProductId: "prod_existing",
      stripePriceId: "price_existing"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await syncPackageToStripe(
      new Request("http://test.local/api/v1/packages/package_1/stripe-sync", {
        method: "POST"
      }),
      { params: Promise.resolve({ packageId: "package_1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires Stripe Connect onboarding before package sync", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: null
    });
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);

    const response = await syncPackageToStripe(
      new Request("http://test.local/api/v1/packages/package_1/stripe-sync", {
        method: "POST"
      }),
      { params: Promise.resolve({ packageId: "package_1" }) }
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.coachingPackage.update).not.toHaveBeenCalled();
  });

  it("does not call Stripe when package is outside the active organization", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: "acct_1"
    });
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(null);

    const response = await syncPackageToStripe(
      new Request("http://test.local/api/v1/packages/package_other/stripe-sync", {
        method: "POST"
      }),
      { params: Promise.resolve({ packageId: "package_other" }) }
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
