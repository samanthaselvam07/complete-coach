import type { InputJsonValue } from "@prisma/client/runtime/client";
import { z } from "zod";

import { ClientStatus, ClientSubscriptionStatus, PackageBillingInterval, PackageStatus } from "@/app/generated/prisma/enums";

export const packageBillingIntervalValues = ["weekly", "fortnightly", "monthly", "annually", "custom", "one-time"] as const;
export const customBillingIntervalUnitValues = ["day", "week", "month", "year"] as const;
export const packageStatusValues = ["active", "archived"] as const;

type ApiPackageBillingInterval = (typeof packageBillingIntervalValues)[number];
type ApiCustomBillingIntervalUnit = (typeof customBillingIntervalUnitValues)[number];
type ApiPackageStatus = (typeof packageStatusValues)[number];
type CustomerMetricsPeriod = "monthly" | "quarterly" | "annually";

const customerMetricsPeriods: Record<CustomerMetricsPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12
};

const defaultGrossMarginPercent = 100;

const packageBillingIntervalToPrisma: Record<ApiPackageBillingInterval, PackageBillingInterval> = {
  weekly: PackageBillingInterval.WEEKLY,
  fortnightly: PackageBillingInterval.FORTNIGHTLY,
  monthly: PackageBillingInterval.MONTHLY,
  annually: PackageBillingInterval.ANNUALLY,
  custom: PackageBillingInterval.CUSTOM,
  "one-time": PackageBillingInterval.ONE_TIME
};

const packageBillingIntervalFromPrisma: Record<PackageBillingInterval, ApiPackageBillingInterval> = {
  [PackageBillingInterval.WEEKLY]: "weekly",
  [PackageBillingInterval.FORTNIGHTLY]: "fortnightly",
  [PackageBillingInterval.MONTHLY]: "monthly",
  [PackageBillingInterval.ANNUALLY]: "annually",
  [PackageBillingInterval.CUSTOM]: "custom",
  [PackageBillingInterval.ONE_TIME]: "one-time"
};

const packageStatusToPrisma: Record<ApiPackageStatus, PackageStatus> = {
  active: PackageStatus.ACTIVE,
  archived: PackageStatus.ARCHIVED
};

const packageStatusFromPrisma: Record<PackageStatus, ApiPackageStatus> = {
  [PackageStatus.ACTIVE]: "active",
  [PackageStatus.ARCHIVED]: "archived"
};

export const packageListQuerySchema = z.object({
  status: z.enum(packageStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const packageFeatureSchema = z.string().trim().min(1).max(160);
const packageBillingDetailsShape = {
  customBillingIntervalCount: z.number().int().min(1).max(52).optional(),
  customBillingIntervalUnit: z.enum(customBillingIntervalUnitValues).optional(),
  termWeeks: z.number().int().min(1).max(520).optional(),
  scheduledPriceAmount: z.number().int().min(0).max(10_000_000).optional(),
  scheduledPriceCurrency: z.string().trim().toLowerCase().regex(/^[a-z]{3}$/).optional(),
  scheduledPriceStartsAt: z.string().datetime().optional()
};

const packageInputShape = {
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  priceAmount: z.number().int().min(0).max(10_000_000),
  currency: z.string().trim().toLowerCase().regex(/^[a-z]{3}$/),
  billingInterval: z.enum(packageBillingIntervalValues),
  features: z.array(packageFeatureSchema).max(30),
  color: z.string().trim().max(40).optional(),
  ...packageBillingDetailsShape
};

export const createPackageSchema = z
  .object({
    ...packageInputShape,
    currency: packageInputShape.currency.default("usd"),
    features: packageInputShape.features.default([])
  })
  .strict()
  .superRefine(validatePackageBillingDetails);

export const updatePackageSchema = z
  .object(packageInputShape)
  .partial()
  .extend({
    status: z.enum(packageStatusValues).optional()
  })
  .strict()
  .superRefine(validatePackageBillingDetails)
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required."
  });

export type PackageListQuery = z.infer<typeof packageListQuerySchema>;
export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

interface PackageRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  billingInterval: PackageBillingInterval;
  customBillingIntervalCount?: number | null;
  customBillingIntervalUnit?: string | null;
  termWeeks?: number | null;
  scheduledPriceAmount?: number | null;
  scheduledPriceCurrency?: string | null;
  scheduledPriceStartsAt?: Date | string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  status: PackageStatus;
  featuresJson: unknown;
  color: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    subscriptions?: number;
  };
  subscriptions?: PackageSubscriptionRecord[];
}

interface PackageSubscriptionRecord {
  status: ClientSubscriptionStatus;
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  cancelAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: {
    status: ClientStatus;
    archivedAt?: Date | string | null;
  } | null;
}

const customerLtvSubscriptionStatuses = new Set<ClientSubscriptionStatus>([
  ClientSubscriptionStatus.TRIALING,
  ClientSubscriptionStatus.ACTIVE,
  ClientSubscriptionStatus.PAST_DUE,
  ClientSubscriptionStatus.CANCELED,
  ClientSubscriptionStatus.UNPAID,
  ClientSubscriptionStatus.PAUSED
]);

export function buildPackageWhere(organizationId: string, query: PackageListQuery) {
  return {
    organizationId,
    deletedAt: null,
    ...(query.status ? { status: packageStatusToPrisma[query.status] } : {})
  };
}

export function getPackageCreateData(organizationId: string, userId: string, input: CreatePackageInput) {
  return {
    organizationId,
    createdByUserId: userId,
    name: input.name,
    description: input.description,
    priceAmount: input.priceAmount,
    currency: input.currency,
    billingInterval: packageBillingIntervalToPrisma[input.billingInterval],
    customBillingIntervalCount: input.customBillingIntervalCount,
    customBillingIntervalUnit: input.customBillingIntervalUnit,
    termWeeks: input.termWeeks,
    scheduledPriceAmount: input.scheduledPriceAmount,
    scheduledPriceCurrency:
      input.scheduledPriceAmount !== undefined ? input.scheduledPriceCurrency ?? input.currency : undefined,
    scheduledPriceStartsAt: input.scheduledPriceStartsAt ? new Date(input.scheduledPriceStartsAt) : undefined,
    featuresJson: input.features as InputJsonValue,
    color: input.color
  };
}

export function getPackageUpdateData(input: UpdatePackageInput) {
  const shouldResetStripePrice =
    input.priceAmount !== undefined ||
    input.currency !== undefined ||
    input.billingInterval !== undefined ||
    input.customBillingIntervalCount !== undefined ||
    input.customBillingIntervalUnit !== undefined;

  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.priceAmount !== undefined ? { priceAmount: input.priceAmount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.billingInterval !== undefined
      ? { billingInterval: packageBillingIntervalToPrisma[input.billingInterval] }
      : {}),
    ...(input.customBillingIntervalCount !== undefined
      ? { customBillingIntervalCount: input.customBillingIntervalCount }
      : {}),
    ...(input.customBillingIntervalUnit !== undefined ? { customBillingIntervalUnit: input.customBillingIntervalUnit } : {}),
    ...(input.termWeeks !== undefined ? { termWeeks: input.termWeeks } : {}),
    ...(input.scheduledPriceAmount !== undefined ? { scheduledPriceAmount: input.scheduledPriceAmount } : {}),
    ...(input.scheduledPriceCurrency !== undefined ? { scheduledPriceCurrency: input.scheduledPriceCurrency } : {}),
    ...(input.scheduledPriceStartsAt !== undefined
      ? { scheduledPriceStartsAt: input.scheduledPriceStartsAt ? new Date(input.scheduledPriceStartsAt) : null }
      : {}),
    ...(input.features !== undefined ? { featuresJson: input.features as InputJsonValue } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.status !== undefined ? { status: packageStatusToPrisma[input.status] } : {}),
    ...(shouldResetStripePrice ? { stripePriceId: null } : {})
  };
}

export function serializePackage(record: PackageRecord) {
  const customerMetrics = calculateCustomerMetrics(record);

  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    description: record.description,
    priceAmount: record.priceAmount,
    currency: record.currency,
    billingInterval: packageBillingIntervalFromPrisma[record.billingInterval],
    customBillingIntervalCount: record.customBillingIntervalCount ?? null,
    customBillingIntervalUnit: normalizeCustomBillingIntervalUnit(record.customBillingIntervalUnit),
    termWeeks: record.termWeeks ?? null,
    scheduledPriceAmount: record.scheduledPriceAmount ?? null,
    scheduledPriceCurrency: record.scheduledPriceCurrency ?? null,
    scheduledPriceStartsAt: toNullableIsoString(record.scheduledPriceStartsAt ?? null),
    stripeProductId: record.stripeProductId,
    stripePriceId: record.stripePriceId,
    status: packageStatusFromPrisma[record.status],
    features: normalizeFeatures(record.featuresJson),
    color: record.color,
    activeSubscriptions: record._count?.subscriptions ?? 0,
    projectedMonthlyRevenue:
      record.billingInterval === PackageBillingInterval.MONTHLY
        ? record.priceAmount * (record._count?.subscriptions ?? 0)
        : 0,
    customerLtv: customerMetrics.monthly.customerLtv,
    ltvCustomerCount: customerMetrics.monthly.customersAtStart,
    customerMetrics,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function getStripeRecurringForPackage(record: {
  billingInterval: PackageBillingInterval;
  customBillingIntervalCount?: number | null;
  customBillingIntervalUnit?: string | null;
}) {
  if (record.billingInterval === PackageBillingInterval.ONE_TIME) {
    return null;
  }

  if (record.billingInterval === PackageBillingInterval.WEEKLY) {
    return { interval: "week" as const, intervalCount: 1 };
  }

  if (record.billingInterval === PackageBillingInterval.FORTNIGHTLY) {
    return { interval: "week" as const, intervalCount: 2 };
  }

  if (record.billingInterval === PackageBillingInterval.MONTHLY) {
    return { interval: "month" as const, intervalCount: 1 };
  }

  if (record.billingInterval === PackageBillingInterval.ANNUALLY) {
    return { interval: "year" as const, intervalCount: 1 };
  }

  const customUnit = normalizeCustomBillingIntervalUnit(record.customBillingIntervalUnit);

  return {
    interval: customUnit ?? "month",
    intervalCount: record.customBillingIntervalCount ?? 1
  };
}

export function isRecurringPackage(record: { billingInterval: PackageBillingInterval }) {
  return record.billingInterval !== PackageBillingInterval.ONE_TIME;
}

function normalizeFeatures(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((feature): feature is string => typeof feature === "string");
}

function normalizeCustomBillingIntervalUnit(value: string | null | undefined): ApiCustomBillingIntervalUnit | null {
  if (customBillingIntervalUnitValues.includes(value as ApiCustomBillingIntervalUnit)) {
    return value as ApiCustomBillingIntervalUnit;
  }

  return null;
}

function calculateCustomerMetrics(record: PackageRecord) {
  const subscriptions = (record.subscriptions ?? []).filter((subscription) =>
    customerLtvSubscriptionStatuses.has(subscription.status)
  );

  return Object.fromEntries(
    Object.entries(customerMetricsPeriods).map(([period, monthCount]) => [
      period,
      calculateCustomerMetricsForPeriod(record, subscriptions, monthCount)
    ])
  ) as Record<CustomerMetricsPeriod, ReturnType<typeof calculateCustomerMetricsForPeriod>>;
}

function calculateCustomerMetricsForPeriod(
  record: PackageRecord,
  subscriptions: PackageSubscriptionRecord[],
  monthCount: number
) {
  const periodEnd = new Date();
  const periodStart = subtractUtcMonths(periodEnd, monthCount);
  const customersAtStart = subscriptions.filter((subscription) => wasSubscriptionActiveAt(subscription, periodStart)).length;
  const lostCustomers = subscriptions.filter((subscription) => wasClientArchivedDuringPeriod(subscription, periodStart, periodEnd)).length;
  const revenue = subscriptions.reduce(
    (sum, subscription) => sum + calculateSubscriptionRevenueForPeriod(record, subscription, periodStart, periodEnd),
    0
  );
  const arpu = customersAtStart > 0 ? Math.round(revenue / customersAtStart) : 0;
  const churnRate = customersAtStart > 0 ? lostCustomers / customersAtStart : 0;
  const grossMarginRate = defaultGrossMarginPercent / 100;
  const customerLtv = churnRate > 0 ? Math.round((arpu * grossMarginRate) / churnRate) : 0;

  return {
    arpu,
    grossMarginPercent: defaultGrossMarginPercent,
    churnRate,
    lostCustomers,
    customersAtStart,
    revenue,
    customerLtv
  };
}

function wasSubscriptionActiveAt(subscription: PackageSubscriptionRecord, date: Date) {
  const startedAt = toDate(subscription.createdAt);
  const endedAt = getSubscriptionLtvEndDate(subscription);

  return startedAt.getTime() <= date.getTime() && endedAt.getTime() >= date.getTime();
}

function wasClientArchivedDuringPeriod(subscription: PackageSubscriptionRecord, periodStart: Date, periodEnd: Date) {
  if (subscription.client?.status !== ClientStatus.ARCHIVED || !subscription.client.archivedAt) {
    return false;
  }

  const archivedAt = toDate(subscription.client.archivedAt);

  return archivedAt.getTime() >= periodStart.getTime() && archivedAt.getTime() <= periodEnd.getTime();
}

function calculateSubscriptionRevenueForPeriod(
  record: PackageRecord,
  subscription: PackageSubscriptionRecord,
  periodStart: Date,
  periodEnd: Date
) {
  if (record.billingInterval === PackageBillingInterval.ONE_TIME) {
    const startedAt = toDate(subscription.createdAt);
    return startedAt.getTime() >= periodStart.getTime() && startedAt.getTime() <= periodEnd.getTime()
      ? record.priceAmount
      : 0;
  }

  const intervalDays = getBillingIntervalDays(record);
  const startedAt = toDate(subscription.createdAt);
  const endedAt = getSubscriptionLtvEndDate(subscription);
  const cappedEnd = capDateToPackageTerm(startedAt, endedAt, record.termWeeks);
  const revenueStart = startedAt.getTime() > periodStart.getTime() ? startedAt : periodStart;
  const revenueEnd = cappedEnd.getTime() < periodEnd.getTime() ? cappedEnd : periodEnd;
  const durationMs = Math.max(revenueEnd.getTime() - revenueStart.getTime(), 0);
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const billedIntervals = Math.ceil(durationMs / intervalMs);

  return record.priceAmount * billedIntervals;
}

function getBillingIntervalDays(record: PackageRecord) {
  if (record.billingInterval === PackageBillingInterval.WEEKLY) {
    return 7;
  }

  if (record.billingInterval === PackageBillingInterval.FORTNIGHTLY) {
    return 14;
  }

  if (record.billingInterval === PackageBillingInterval.ANNUALLY) {
    return 365.25;
  }

  if (record.billingInterval === PackageBillingInterval.CUSTOM) {
    const count = record.customBillingIntervalCount ?? 1;
    const unit = normalizeCustomBillingIntervalUnit(record.customBillingIntervalUnit) ?? "month";

    if (unit === "day") {
      return count;
    }

    if (unit === "week") {
      return count * 7;
    }

    if (unit === "year") {
      return count * 365.25;
    }

    return count * 30.4375;
  }

  return 30.4375;
}

function getSubscriptionLtvEndDate(subscription: PackageSubscriptionRecord) {
  if (subscription.client?.status === ClientStatus.ARCHIVED && subscription.client.archivedAt) {
    return toDate(subscription.client.archivedAt);
  }

  if (subscription.cancelAt) {
    return toDate(subscription.cancelAt);
  }

  if (
    subscription.status === ClientSubscriptionStatus.CANCELED ||
    subscription.status === ClientSubscriptionStatus.UNPAID ||
    subscription.status === ClientSubscriptionStatus.PAUSED
  ) {
    return toDate(subscription.currentPeriodEnd ?? subscription.updatedAt);
  }

  return new Date();
}

function capDateToPackageTerm(startedAt: Date, endedAt: Date, termWeeks: number | null | undefined) {
  if (!termWeeks) {
    return endedAt;
  }

  const termEnd = new Date(startedAt.getTime() + termWeeks * 7 * 24 * 60 * 60 * 1000);

  return endedAt.getTime() > termEnd.getTime() ? termEnd : endedAt;
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function subtractUtcMonths(date: Date, monthCount: number) {
  const periodStart = new Date(date);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - monthCount);

  return periodStart;
}

function validatePackageBillingDetails(
  input: {
    billingInterval?: ApiPackageBillingInterval;
    customBillingIntervalCount?: number;
    customBillingIntervalUnit?: ApiCustomBillingIntervalUnit;
    scheduledPriceAmount?: number;
    scheduledPriceStartsAt?: string;
  },
  context: z.RefinementCtx
) {
  if (input.billingInterval === "custom" && (!input.customBillingIntervalCount || !input.customBillingIntervalUnit)) {
    context.addIssue({
      code: "custom",
      path: ["customBillingIntervalCount"],
      message: "Custom billing requires an interval count and unit."
    });
  }

  if (
    (input.scheduledPriceAmount !== undefined && !input.scheduledPriceStartsAt) ||
    (input.scheduledPriceStartsAt !== undefined && input.scheduledPriceAmount === undefined)
  ) {
    context.addIssue({
      code: "custom",
      path: ["scheduledPriceStartsAt"],
      message: "Scheduled price changes require an amount and start date."
    });
  }
}

function toNullableIsoString(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return toIsoString(value);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
