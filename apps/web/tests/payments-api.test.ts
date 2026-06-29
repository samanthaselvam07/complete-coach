import { beforeEach, describe, expect, it, vi } from "vitest";

import { PackageBillingInterval, PackageStatus } from "@/app/generated/prisma/enums";
import { GET as listPackages, POST as createPackage } from "@/app/api/v1/packages/route";
import { PATCH as updatePackage } from "@/app/api/v1/packages/[packageId]/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    coachingPackage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
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

const adminSession = {
  ...ownerSession,
  activeOrganization: {
    ...ownerSession.activeOrganization,
    role: "admin"
  }
};

const now = new Date("2026-05-18T00:00:00.000Z");

const packageRecord = {
  id: "package_1",
  organizationId: "org_1",
  name: "Gold Standard",
  description: "Premium coaching with weekly support",
  priceAmount: 39900,
  currency: "usd",
  billingInterval: PackageBillingInterval.MONTHLY,
  stripeProductId: null,
  stripePriceId: null,
  status: PackageStatus.ACTIVE,
  featuresJson: ["Custom training", "Weekly check-ins"],
  color: "yellow",
  createdByUserId: "user_1",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  _count: {
    subscriptions: 3
  }
};

describe("payments and packages APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.coachingPackage.create.mockReset();
    mocks.prisma.coachingPackage.findMany.mockReset();
    mocks.prisma.coachingPackage.findFirst.mockReset();
    mocks.prisma.coachingPackage.update.mockReset();
  });

  it("lists active organization packages with derived active subscription counts", async () => {
    mocks.prisma.coachingPackage.findMany.mockResolvedValue([packageRecord]);

    const response = await listPackages(new Request("http://test.local/api/v1/packages?status=active&limit=10"));
    const payload = (await response.json()) as {
      data: Array<{ id: string; activeSubscriptions: number; projectedMonthlyRevenue: number }>;
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "package_1",
        activeSubscriptions: 3,
        projectedMonthlyRevenue: 119700
      })
    ]);
    expect(mocks.prisma.coachingPackage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          deletedAt: null,
          status: PackageStatus.ACTIVE
        }),
        take: 10
      })
    );
  });

  it("creates packages without trusting client-provided Stripe identifiers", async () => {
    mocks.prisma.coachingPackage.create.mockResolvedValue(packageRecord);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createPackage(
      new Request("http://test.local/api/v1/packages", {
        method: "POST",
        body: JSON.stringify({
          name: "Gold Standard",
          description: "Premium coaching with weekly support",
          priceAmount: 39900,
          currency: "usd",
          billingInterval: "monthly",
          features: ["Custom training", "Weekly check-ins"],
          color: "yellow"
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; stripeProductId: string | null } };

    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe("/api/v1/packages/package_1");
    expect(payload.data).toEqual(expect.objectContaining({ id: "package_1", stripeProductId: null }));
    expect(mocks.prisma.coachingPackage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        createdByUserId: "user_1",
        name: "Gold Standard",
        priceAmount: 39900,
        billingInterval: PackageBillingInterval.MONTHLY,
        featuresJson: ["Custom training", "Weekly check-ins"]
      })
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "package.created",
          targetId: "package_1"
        })
      })
    );
  });

  it("rejects package creation when Stripe identifiers are supplied by the client", async () => {
    const response = await createPackage(
      new Request("http://test.local/api/v1/packages", {
        method: "POST",
        body: JSON.stringify({
          name: "Gold Standard",
          priceAmount: 39900,
          billingInterval: "monthly",
          stripePriceId: "price_client_supplied"
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.coachingPackage.create).not.toHaveBeenCalled();
  });

  it("blocks non-owner package management until payment admin rules are expanded", async () => {
    mocks.auth.mockResolvedValue(adminSession);

    const response = await createPackage(
      new Request("http://test.local/api/v1/packages", {
        method: "POST",
        body: JSON.stringify({
          name: "Gold Standard",
          priceAmount: 39900,
          billingInterval: "monthly"
        })
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.coachingPackage.create).not.toHaveBeenCalled();
  });

  it("updates only organization-scoped packages", async () => {
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(packageRecord);
    mocks.prisma.coachingPackage.update.mockResolvedValue({
      ...packageRecord,
      name: "Gold Plus",
      status: PackageStatus.ARCHIVED
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await updatePackage(
      new Request("http://test.local/api/v1/packages/package_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Gold Plus",
          status: "archived"
        })
      }),
      { params: Promise.resolve({ packageId: "package_1" }) }
    );
    const payload = (await response.json()) as { data: { name: string; status: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ name: "Gold Plus", status: "archived" }));
    expect(mocks.prisma.coachingPackage.findFirst).toHaveBeenCalledWith({
      where: {
        id: "package_1",
        organizationId: "org_1",
        deletedAt: null
      }
    });
    expect(mocks.prisma.coachingPackage.update).toHaveBeenCalledWith({
      where: { id: "package_1", organizationId: "org_1" },
      data: {
        name: "Gold Plus",
        status: PackageStatus.ARCHIVED
      }
    });
  });

  it("returns not found when updating a package outside the active organization", async () => {
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(null);

    const response = await updatePackage(
      new Request("http://test.local/api/v1/packages/package_other", {
        method: "PATCH",
        body: JSON.stringify({ name: "Other Package" })
      }),
      { params: Promise.resolve({ packageId: "package_other" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.coachingPackage.update).not.toHaveBeenCalled();
  });
});
