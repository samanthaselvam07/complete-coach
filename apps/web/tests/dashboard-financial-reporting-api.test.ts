import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getFinancialReporting } from "@/app/api/v1/dashboard/financial-reporting/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    organization: {
      findUnique: vi.fn()
    }
  },
  getStripeConfig: vi.fn(),
  listConnectedBalanceTransactions: vi.fn(),
  retrieveConnectedBalance: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/payments/stripe-connect", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/stripe-connect")>();

  return {
    ...actual,
    getStripeConfig: mocks.getStripeConfig,
    listConnectedBalanceTransactions: mocks.listConnectedBalanceTransactions,
    retrieveConnectedBalance: mocks.retrieveConnectedBalance
  };
});

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
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organization.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_1",
      stripeConnectStatus: "active"
    });
    mocks.getStripeConfig.mockReset();
    mocks.getStripeConfig.mockReturnValue({ secretKey: "sk_test_mock", apiBaseUrl: "https://api.stripe.test" });
    mocks.listConnectedBalanceTransactions.mockReset();
    mocks.listConnectedBalanceTransactions.mockResolvedValue([]);
    mocks.retrieveConnectedBalance.mockReset();
    mocks.retrieveConnectedBalance.mockResolvedValue({
      available: [{ amount: 42000, currency: "usd" }],
      pending: [{ amount: 18000, currency: "usd" }]
    });
  });

  it("reports live revenue from Stripe balance transactions on the connected account", async () => {
    mocks.listConnectedBalanceTransactions.mockResolvedValue([
      {
        id: "txn_charge_1",
        amount: 39900,
        fee: 1200,
        net: 38700,
        currency: "usd",
        created: 1782864000,
        type: "charge",
        reporting_category: "charge"
      },
      {
        id: "txn_refund_1",
        amount: -9900,
        fee: -300,
        net: -9600,
        currency: "usd",
        created: 1782950400,
        type: "refund",
        reporting_category: "refund"
      },
      {
        id: "txn_payout_1",
        amount: -15000,
        fee: 0,
        net: -15000,
        currency: "usd",
        created: 1783036800,
        type: "payout",
        reporting_category: "payout"
      }
    ]);

    const response = await getFinancialReporting(
      new Request("http://test.local/api/v1/dashboard/financial-reporting?period=monthly")
    );
    const payload = (await response.json()) as {
      data: {
        amount: number;
        grossAmount: number;
        feeAmount: number;
        source: string;
        stripeTransactionCount: number;
        availableBalance: number;
        pendingBalance: number;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        amount: 29100,
        grossAmount: 30000,
        feeAmount: 900,
        source: "stripe_live",
        stripeTransactionCount: 2,
        availableBalance: 42000,
        pendingBalance: 18000
      })
    );
    expect(mocks.prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org_1" },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true
      }
    });
    expect(mocks.listConnectedBalanceTransactions).toHaveBeenCalledWith(
      { secretKey: "sk_test_mock", apiBaseUrl: "https://api.stripe.test" },
      expect.objectContaining({ accountId: "acct_1" })
    );
    expect(mocks.retrieveConnectedBalance).toHaveBeenCalledWith(
      { secretKey: "sk_test_mock", apiBaseUrl: "https://api.stripe.test" },
      "acct_1"
    );
  });

  it("returns an empty live Stripe report when the organization has not connected Stripe", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
      stripeConnectStatus: null
    });

    const response = await getFinancialReporting(
      new Request("http://test.local/api/v1/dashboard/financial-reporting?period=monthly")
    );
    const payload = (await response.json()) as { data: { amount: number; change: string; source: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({
      amount: 0,
      change: "Connect Stripe to view live revenue.",
      source: "stripe_live"
    }));
    expect(mocks.listConnectedBalanceTransactions).not.toHaveBeenCalled();
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
    expect(mocks.prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("resolves weekly, quarterly, yearly, and custom date ranges without local revenue fallback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:30:00.000Z"));

    const periods = [
      {
        query: "period=weekly",
        label: "Weekly Revenue",
        startDate: "2026-06-15",
        endDate: "2026-06-21",
        createdGte: 1781481600,
        createdLte: 1782086399
      },
      {
        query: "period=quarterly",
        label: "Quarterly Revenue",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        createdGte: 1775001600,
        createdLte: 1782863999
      },
      {
        query: "period=yearly",
        label: "Yearly Revenue",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        createdGte: 1767225600,
        createdLte: 1798761599
      },
      {
        query: "period=custom&startDate=2026-06-03&endDate=2026-06-09",
        label: "Custom Revenue",
        startDate: "2026-06-03",
        endDate: "2026-06-09",
        createdGte: 1780444800,
        createdLte: 1781049599
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
          source: "stripe_live",
          startDate: period.startDate,
          endDate: period.endDate
        })
      );
      expect(mocks.listConnectedBalanceTransactions).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.objectContaining({
          accountId: "acct_1",
          createdGte: period.createdGte,
          createdLte: period.createdLte
        })
      );
    }
  });
});
