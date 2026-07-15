import { z } from "zod";

import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getStripeConfig,
  listConnectedBalanceTransactions,
  retrieveConnectedBalance,
  StripeApiError,
  StripeConfigurationError,
  type StripeBalanceTransaction
} from "@/lib/payments/stripe-connect";

const financialPeriodValues = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;

const financialReportingQuerySchema = z
  .object({
    period: z.enum(financialPeriodValues).default("monthly"),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional()
  })
  .superRefine((query, context) => {
    if (query.period !== "custom") {
      return;
    }

    if (!query.startDate) {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Custom reports require a start date."
      });
    }

    if (!query.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Custom reports require an end date."
      });
    }

    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Custom report end date must be on or after the start date."
      });
    }
  });

type FinancialPeriod = (typeof financialPeriodValues)[number];

const revenueLabels: Record<FinancialPeriod, string> = {
  weekly: "Weekly Revenue",
  monthly: "Monthly Revenue",
  quarterly: "Quarterly Revenue",
  yearly: "Yearly Revenue",
  custom: "Custom Revenue"
};

const stripeRevenueReportingCategories = new Set(["charge", "refund", "dispute", "dispute_reversal"]);

export async function GET(request: Request) {
  let query: z.infer<typeof financialReportingQuerySchema> | undefined;
  let range: ReturnType<typeof resolveReportingRange> | undefined;

  try {
    const actor = requireActiveActor(await auth(), "payments:read");
    query = financialReportingQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    range = resolveReportingRange(query.period, query.startDate, query.endDate);
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true
      }
    });

    if (!organization?.stripeConnectAccountId) {
      return dataResponse(buildEmptyReport(query.period, range, "Connect Stripe to view live revenue."));
    }

    const config = getStripeConfig();
    const [transactions, balance] = await Promise.all([
      listConnectedBalanceTransactions(config, {
        accountId: organization.stripeConnectAccountId,
        createdGte: toUnixSeconds(range.start),
        createdLte: toUnixSeconds(range.end)
      }),
      retrieveConnectedBalance(config, organization.stripeConnectAccountId)
    ]);
    const revenueTransactions = transactions.filter(isRevenueBalanceTransaction);
    const currency = getReportCurrency(revenueTransactions, balance);
    const summary = summarizeStripeTransactions(revenueTransactions, currency);
    const availableBalance = sumBalanceAmounts(balance.available, summary.currency);
    const pendingBalance = sumBalanceAmounts(balance.pending, summary.currency);

    return dataResponse({
      period: query.period,
      label: revenueLabels[query.period],
      amount: summary.netAmount,
      grossAmount: summary.grossAmount,
      feeAmount: summary.feeAmount,
      currency: summary.currency,
      change: revenueTransactions.length === 1 ? "1 Stripe transaction" : `${revenueTransactions.length} Stripe transactions`,
      source: "stripe_live",
      stripeTransactionCount: revenueTransactions.length,
      stripeConnectStatus: organization.stripeConnectStatus ?? "unknown",
      availableBalance,
      pendingBalance,
      startDate: toDateOnly(range.start),
      endDate: toDateOnly(range.end),
      bars: buildRevenueBars(summary.netAmount, revenueTransactions.length)
    });
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return dataResponse(buildEmptyReport(query?.period ?? "monthly", range ?? resolveReportingRange("monthly"), "Stripe is not configured."));
    }

    if (error instanceof StripeApiError) {
      return dataResponse(buildEmptyReport(query?.period ?? "monthly", range ?? resolveReportingRange("monthly"), "Stripe data unavailable."));
    }

    return handleApiError(error);
  }
}

function resolveReportingRange(period: FinancialPeriod, startDate?: string, endDate?: string) {
  if (period === "custom") {
    return {
      start: startOfDay(parseDateOnly(startDate as string)),
      end: endOfDay(parseDateOnly(endDate as string))
    };
  }

  const now = new Date();

  if (period === "weekly") {
    const start = startOfDay(now);
    const dayOffset = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - dayOffset);
    const end = endOfDay(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start, end };
  }

  if (period === "quarterly") {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    const start = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
    const end = endOfDay(new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth + 3, 0)));
    return { start, end };
  }

  if (period === "yearly") {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      end: endOfDay(new Date(Date.UTC(now.getUTCFullYear(), 11, 31)))
    };
  }

  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: endOfDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)))
  };
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toUnixSeconds(value: Date) {
  return Math.floor(value.getTime() / 1000);
}

function isRevenueBalanceTransaction(transaction: StripeBalanceTransaction) {
  return stripeRevenueReportingCategories.has(transaction.reporting_category ?? transaction.type);
}

function summarizeStripeTransactions(transactions: StripeBalanceTransaction[], currency: string) {
  return transactions.reduce(
    (summary, transaction) => ({
      grossAmount: summary.grossAmount + transaction.amount,
      feeAmount: summary.feeAmount + transaction.fee,
      netAmount: summary.netAmount + transaction.net,
      currency: summary.currency
    }),
    {
      grossAmount: 0,
      feeAmount: 0,
      netAmount: 0,
      currency
    }
  );
}

function getReportCurrency(transactions: StripeBalanceTransaction[], balance: { available: Array<{ currency: string }>; pending: Array<{ currency: string }> }) {
  return transactions[0]?.currency ?? balance.available[0]?.currency ?? balance.pending[0]?.currency ?? "usd";
}

function sumBalanceAmounts(amounts: Array<{ amount: number; currency: string }>, currency: string) {
  return amounts
    .filter((amount) => amount.currency === currency)
    .reduce((sum, amount) => sum + amount.amount, 0);
}

function buildEmptyReport(period: FinancialPeriod, range: { start: Date; end: Date }, change: string) {
  return {
    period,
    label: revenueLabels[period],
    amount: 0,
    grossAmount: 0,
    feeAmount: 0,
    currency: "usd",
    change,
    source: "stripe_live",
    stripeTransactionCount: 0,
    availableBalance: 0,
    pendingBalance: 0,
    startDate: toDateOnly(range.start),
    endDate: toDateOnly(range.end),
    bars: buildRevenueBars(0, 0)
  };
}

function buildRevenueBars(amount: number, transactionCount: number) {
  if (amount <= 0 || transactionCount <= 0) {
    return [10, 10, 10, 10, 10, 10, 10];
  }

  const base = Math.min(85, Math.max(28, Math.round(amount / 10000)));
  return [0.55, 0.62, 0.7, 0.76, 0.84, 0.92, 1].map((multiplier) =>
    Math.min(95, Math.max(12, Math.round(base * multiplier)))
  );
}
