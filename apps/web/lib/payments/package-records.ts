import type { InputJsonValue } from "@prisma/client/runtime/client";
import { z } from "zod";

import { PackageBillingInterval, PackageStatus } from "@/app/generated/prisma/enums";

export const packageBillingIntervalValues = ["weekly", "fortnightly", "monthly", "annually", "custom", "one-time"] as const;
export const customBillingIntervalUnitValues = ["day", "week", "month", "year"] as const;
export const packageStatusValues = ["active", "archived"] as const;

type ApiPackageBillingInterval = (typeof packageBillingIntervalValues)[number];
type ApiCustomBillingIntervalUnit = (typeof customBillingIntervalUnitValues)[number];
type ApiPackageStatus = (typeof packageStatusValues)[number];

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
}

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
