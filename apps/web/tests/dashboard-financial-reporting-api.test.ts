import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientSubscriptionStatus } from "@/app/generated/prisma/enums";
import { GET as getFinancialReporting } from "@/app/api/v1/dashboard/financial-reporting/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    clientSubscription: {
      findMany: vi.fn()
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

describe("GET /api/v1/dashboard/financial-reporting", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.clientSubscription.findMany.mockReset();
  });

  it("reports revenue from Stripe-backed active subscriptions only", async () => {
    mocks.prisma.clientSubscription.findMany.mockResolvedValue([
      {
        id: "sub_1",
        stripeSubscriptionId: "sub_stripe_1",
        status: ClientSubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        coachingPackage: { priceAmount: 39900, currency: "usd" }
      },
      {
        id: "sub_2",
        stripeSubscriptionId: "sub_stripe_2",
        status: ClientSubscriptionStatus.TRIALING,
        currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        coachingPackage: { priceAmount: 59900, currency: "usd" }
      },
      {
        id: "local_projection",
        stripeSubscriptionId: null,
        status: ClientSubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        coachingPackage: { priceAmount: 99900, currency: "usd" }
      }
    ]);

    const response = await getFinancialReporting(
      new Request("http://test.local/api/v1/dashboard/financial-reporting?period=monthly")
    );
    const payload = (await response.json()) as { data: { amount: number; source: string } };

    expect(response.status).toBe(200);
    expect(payload.data.amount).toBe(99800);
    expect(payload.data.source).toBe("stripe");
    expect(mocks.prisma.clientSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          stripeSubscriptionId: { not: null },
          status: { in: [ClientSubscriptionStatus.ACTIVE, ClientSubscriptionStatus.TRIALING, ClientSubscriptionStatus.PAST_DUE] }
        }),
        include: {
          coachingPackage: {
            select: {
              priceAmount: true,
              currency: true
            }
          }
        }
      })
    );
  });

  it("requires a custom start and end date for custom reports", async () => {
    const response = await getFinancialReporting(
      new Request("http://test.local/api/v1/dashboard/financial-reporting?period=custom&startDate=2026-06-01")
    );
    const payload = (await response.json()) as { error: { code: string } };
    const missingStartResponse = await getFinancialReporting(
      new Request("http://test.local/api/v1/dashboard/financial-reporting?period=custom&endDate=2026-06-30")
    );
    const missingStartPayload = (await missingStartResponse.json()) as { error: { code: string } };

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("validation_failed");
    expect(missingStartResponse.status).toBe(422);
    expect(missingStartPayload.error.code).toBe("validation_failed");
    expect(mocks.prisma.clientSubscription.findMany).not.toHaveBeenCalled();
  });

  it("resolves weekly, quarterly, yearly, and custom date ranges without local revenue fallback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:30:00.000Z"));
    mocks.prisma.clientSubscription.findMany.mockResolvedValue([]);

    const periods = [
      {
        query: "period=weekly",
        label: "Weekly Revenue",
        startDate: "2026-06-15",
        endDate: "2026-06-21"
      },
      {
        query: "period=quarterly",
        label: "Quarterly Revenue",
        startDate: "2026-04-01",
        endDate: "2026-06-30"
      },
      {
        query: "period=yearly",
        label: "Yearly Revenue",
        startDate: "2026-01-01",
        endDate: "2026-12-31"
      },
      {
        query: "period=custom&startDate=2026-06-03&endDate=2026-06-09",
        label: "Custom Revenue",
        startDate: "2026-06-03",
        endDate: "2026-06-09"
      }
    ];

    for (const period of periods) {
      const response = await getFinancialReporting(
        new Request(`http://test.local/api/v1/dashboard/financial-reporting?${period.query}`)
      );
      const payload = (await response.json()) as {
        data: {
          amount: number;
          bars: number[];
          label: string;
          source: string;
          startDate: string;
          endDate: string;
        };
      };

      expect(response.status).toBe(200);
      expect(payload.data).toEqual(
        expect.objectContaining({
          amount: 0,
          bars: [10, 10, 10, 10, 10, 10, 10],
          label: period.label,
          source: "stripe",
          startDate: period.startDate,
          endDate: period.endDate
        })
      );
    }
  });
});
