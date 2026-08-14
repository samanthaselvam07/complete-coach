import { z } from "zod";

import { ClientSubscriptionStatus } from "@/app/generated/prisma/enums";

export const clientSubscriptionStatusValues = [
  "incomplete",
  "incomplete-expired",
  "trialing",
  "active",
  "past-due",
  "canceled",
  "unpaid",
  "paused"
] as const;

type ApiClientSubscriptionStatus = (typeof clientSubscriptionStatusValues)[number];

const clientSubscriptionStatusToPrisma: Record<ApiClientSubscriptionStatus, ClientSubscriptionStatus> = {
  incomplete: ClientSubscriptionStatus.INCOMPLETE,
  "incomplete-expired": ClientSubscriptionStatus.INCOMPLETE_EXPIRED,
  trialing: ClientSubscriptionStatus.TRIALING,
  active: ClientSubscriptionStatus.ACTIVE,
  "past-due": ClientSubscriptionStatus.PAST_DUE,
  canceled: ClientSubscriptionStatus.CANCELED,
  unpaid: ClientSubscriptionStatus.UNPAID,
  paused: ClientSubscriptionStatus.PAUSED
};

const clientSubscriptionStatusFromPrisma: Record<ClientSubscriptionStatus, ApiClientSubscriptionStatus> = {
  [ClientSubscriptionStatus.INCOMPLETE]: "incomplete",
  [ClientSubscriptionStatus.INCOMPLETE_EXPIRED]: "incomplete-expired",
  [ClientSubscriptionStatus.TRIALING]: "trialing",
  [ClientSubscriptionStatus.ACTIVE]: "active",
  [ClientSubscriptionStatus.PAST_DUE]: "past-due",
  [ClientSubscriptionStatus.CANCELED]: "canceled",
  [ClientSubscriptionStatus.UNPAID]: "unpaid",
  [ClientSubscriptionStatus.PAUSED]: "paused"
};

export const clientSubscriptionListQuerySchema = z.object({
  clientId: z.string().trim().min(1).optional(),
  status: z.enum(clientSubscriptionStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createClientSubscriptionSchema = z.object({
  clientId: z.string().trim().min(1),
  packageId: z.string().trim().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const pauseClientMembershipSchema = z
  .object({
    pauseStartDate: z.string().date(),
    pauseResumeDate: z.string().date()
  })
  .refine((input) => input.pauseResumeDate > input.pauseStartDate, {
    path: ["pauseResumeDate"],
    message: "Resume date must be after the pause date."
  });

export type ClientSubscriptionListQuery = z.infer<typeof clientSubscriptionListQuerySchema>;

interface ClientSubscriptionRecord {
  id: string;
  organizationId: string;
  clientId: string;
  packageId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string | null;
  status: ClientSubscriptionStatus;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  cancelAt: Date | string | null;
  pauseStartAt?: Date | string | null;
  pauseResumeAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
  coachingPackage?: {
    name: string;
    priceAmount: number;
    currency: string;
  };
}

export function buildClientSubscriptionWhere(organizationId: string, query: ClientSubscriptionListQuery) {
  return {
    organizationId,
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: clientSubscriptionStatusToPrisma[query.status] } : {})
  };
}

export function serializeClientSubscription(record: ClientSubscriptionRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    clientId: record.clientId,
    packageId: record.packageId,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    stripeCheckoutSessionId: record.stripeCheckoutSessionId,
    status: clientSubscriptionStatusFromPrisma[record.status],
    currentPeriodStart: toNullableIsoString(record.currentPeriodStart),
    currentPeriodEnd: toNullableIsoString(record.currentPeriodEnd),
    cancelAt: toNullableIsoString(record.cancelAt),
    pauseStartAt: toNullableIsoString(record.pauseStartAt ?? null),
    pauseResumeAt: toNullableIsoString(record.pauseResumeAt ?? null),
    client: record.client
      ? {
          name: `${record.client.firstName} ${record.client.lastName}`,
          email: record.client.email
        }
      : null,
    package: record.coachingPackage
      ? {
          name: record.coachingPackage.name,
          priceAmount: record.coachingPackage.priceAmount,
          currency: record.coachingPackage.currency
        }
      : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
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
