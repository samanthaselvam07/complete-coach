import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientStatus, ClientSubscriptionStatus, PackageBillingInterval, PackageStatus } from "@/app/generated/prisma/enums";
import {
  buildPackageWhere,
  createPackageSchema,
  getPackageCreateData,
  getPackageUpdateData,
  getStripeRecurringForPackage,
  packageListQuerySchema,
  serializePackage,
  updatePackageSchema
} from "@/lib/payments/package-records";

const now = new Date("2026-05-18T00:00:00.000Z");

afterEach(() => {
  vi.useRealTimers();
});

const basePackageRecord = {
  id: "package_1",
  organizationId: "org_1",
  name: "12-Week Transform",
  description: null,
  priceAmount: 149900,
  currency: "usd",
  billingInterval: PackageBillingInterval.ONE_TIME,
  customBillingIntervalCount: null,
  customBillingIntervalUnit: null,
  termWeeks: null,
  scheduledPriceAmount: null,
  scheduledPriceCurrency: null,
  scheduledPriceStartsAt: null,
  stripeProductId: "prod_123",
  stripePriceId: "price_123",
  status: PackageStatus.ACTIVE,
  featuresJson: null,
  color: null,
  createdAt: now,
  updatedAt: now
};

describe("package record helpers", () => {
  it("builds package filters with and without status", () => {
    expect(buildPackageWhere("org_1", packageListQuerySchema.parse({}))).toEqual({
      organizationId: "org_1",
      deletedAt: null
    });
    expect(buildPackageWhere("org_1", packageListQuerySchema.parse({ status: "archived" }))).toEqual({
      organizationId: "org_1",
      deletedAt: null,
      status: PackageStatus.ARCHIVED
    });
  });

  it("applies create defaults and maps API enums to Prisma values", () => {
    const input = createPackageSchema.parse({
      name: "Gold Standard",
      priceAmount: 39900,
      billingInterval: "monthly"
    });

    expect(getPackageCreateData("org_1", "user_1", input)).toEqual({
      organizationId: "org_1",
      createdByUserId: "user_1",
      name: "Gold Standard",
      description: undefined,
      priceAmount: 39900,
      currency: "usd",
      billingInterval: PackageBillingInterval.MONTHLY,
      customBillingIntervalCount: undefined,
      customBillingIntervalUnit: undefined,
      termWeeks: undefined,
      scheduledPriceAmount: undefined,
      scheduledPriceCurrency: undefined,
      scheduledPriceStartsAt: undefined,
      featuresJson: [],
      color: undefined
    });
  });

  it("maps custom billing, package terms, and scheduled pricing metadata", () => {
    const input = createPackageSchema.parse({
      name: "Season Build",
      priceAmount: 49900,
      currency: "aud",
      billingInterval: "custom",
      customBillingIntervalCount: 2,
      customBillingIntervalUnit: "week",
      termWeeks: 16,
      scheduledPriceAmount: 59900,
      scheduledPriceCurrency: "aud",
      scheduledPriceStartsAt: "2026-08-01T00:00:00.000Z",
      features: ["Weekly check-ins"]
    });

    expect(getPackageCreateData("org_1", "user_1", input)).toEqual(
      expect.objectContaining({
        currency: "aud",
        billingInterval: PackageBillingInterval.CUSTOM,
        customBillingIntervalCount: 2,
        customBillingIntervalUnit: "week",
        termWeeks: 16,
        scheduledPriceAmount: 59900,
        scheduledPriceCurrency: "aud",
        scheduledPriceStartsAt: new Date("2026-08-01T00:00:00.000Z"),
        featuresJson: ["Weekly check-ins"]
      })
    );
  });

  it("requires custom billing details and complete scheduled price changes", () => {
    expect(() =>
      createPackageSchema.parse({
        name: "Custom",
        priceAmount: 10000,
        billingInterval: "custom"
      })
    ).toThrow(/Custom billing requires/);
    expect(() =>
      updatePackageSchema.parse({
        scheduledPriceAmount: 20000
      })
    ).toThrow(/Scheduled price changes require/);
  });

  it("builds partial update data without adding omitted defaults", () => {
    const input = updatePackageSchema.parse({
      description: "Updated package",
      billingInterval: "one-time",
      features: ["Video review"],
      color: "indigo",
      status: "archived"
    });

    expect(getPackageUpdateData(input)).toEqual({
      description: "Updated package",
      billingInterval: PackageBillingInterval.ONE_TIME,
      featuresJson: ["Video review"],
      color: "indigo",
      status: PackageStatus.ARCHIVED,
      stripePriceId: null
    });
  });

  it("serializes one-time packages without monthly revenue and normalizes invalid feature metadata", () => {
    expect(serializePackage(basePackageRecord)).toEqual(
      expect.objectContaining({
        billingInterval: "one-time",
        features: [],
        activeSubscriptions: 0,
        projectedMonthlyRevenue: 0,
        customerLtv: 0,
        ltvCustomerCount: 0,
        createdAt: "2026-05-18T00:00:00.000Z"
      })
    );
  });

  it("serializes monthly packages with string timestamps and filtered features", () => {
    expect(
      serializePackage({
        ...basePackageRecord,
        billingInterval: PackageBillingInterval.MONTHLY,
        featuresJson: ["Check-ins", 123, "Messaging"],
        createdAt: "2026-05-18T01:00:00.000Z",
        updatedAt: "2026-05-18T02:00:00.000Z",
        _count: { subscriptions: 2 }
      })
    ).toEqual(
      expect.objectContaining({
        billingInterval: "monthly",
        customBillingIntervalCount: null,
        customBillingIntervalUnit: null,
        termWeeks: null,
        scheduledPriceAmount: null,
        scheduledPriceCurrency: null,
        scheduledPriceStartsAt: null,
        features: ["Check-ins", "Messaging"],
        activeSubscriptions: 2,
        projectedMonthlyRevenue: 299800,
        customerLtv: 0,
        ltvCustomerCount: 0,
        createdAt: "2026-05-18T01:00:00.000Z",
        updatedAt: "2026-05-18T02:00:00.000Z"
      })
    );
  });

  it("calculates customer LTV from subscription duration and archived client dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));

    expect(
      serializePackage({
        ...basePackageRecord,
        priceAmount: 10000,
        billingInterval: PackageBillingInterval.MONTHLY,
        subscriptions: [
          {
            status: ClientSubscriptionStatus.ACTIVE,
            currentPeriodStart: "2026-05-01T00:00:00.000Z",
            currentPeriodEnd: null,
            cancelAt: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            client: {
              status: ClientStatus.ACTIVE,
              archivedAt: null
            }
          },
          {
            status: ClientSubscriptionStatus.CANCELED,
            currentPeriodStart: "2026-05-01T00:00:00.000Z",
            currentPeriodEnd: "2026-08-01T00:00:00.000Z",
            cancelAt: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z",
            client: {
              status: ClientStatus.ARCHIVED,
              archivedAt: "2026-06-01T00:00:00.000Z"
            }
          },
          {
            status: ClientSubscriptionStatus.INCOMPLETE,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAt: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            client: {
              status: ClientStatus.ACTIVE,
              archivedAt: null
            }
          }
        ]
      })
    ).toEqual(
      expect.objectContaining({
        customerLtv: 10000,
        ltvCustomerCount: 2,
        customerMetrics: expect.objectContaining({
          monthly: expect.objectContaining({
            arpu: 5000,
            churnRate: 0.5,
            retentionRate: 0.5,
            newCustomers: 0,
            endingCustomers: 1,
            lostCustomers: 1,
            customersAtStart: 2,
            revenue: 10000,
            customerLtv: 10000
          })
        })
      })
    );
  });

  it("maps recurring Stripe intervals for supported billing cadences", () => {
    expect(getStripeRecurringForPackage({ billingInterval: PackageBillingInterval.WEEKLY })).toEqual({
      interval: "week",
      intervalCount: 1
    });
    expect(getStripeRecurringForPackage({ billingInterval: PackageBillingInterval.FORTNIGHTLY })).toEqual({
      interval: "week",
      intervalCount: 2
    });
    expect(getStripeRecurringForPackage({ billingInterval: PackageBillingInterval.ANNUALLY })).toEqual({
      interval: "year",
      intervalCount: 1
    });
    expect(
      getStripeRecurringForPackage({
        billingInterval: PackageBillingInterval.CUSTOM,
        customBillingIntervalCount: 3,
        customBillingIntervalUnit: "month"
      })
    ).toEqual({ interval: "month", intervalCount: 3 });
  });
});
