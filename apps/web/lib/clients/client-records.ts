import { z } from "zod";

import { ClientStatus } from "@/app/generated/prisma/enums";
import type { ClientSummary } from "@/lib/clients/client-models";

export const clientStatusValues = ["active", "archived", "new", "deactivated"] as const;
export type ApiClientStatus = (typeof clientStatusValues)[number];

const statusToPrisma: Record<ApiClientStatus, ClientStatus> = {
  active: ClientStatus.ACTIVE,
  archived: ClientStatus.ARCHIVED,
  new: ClientStatus.NEW,
  deactivated: ClientStatus.DEACTIVATED
};

const statusFromPrisma: Record<ClientStatus, ApiClientStatus> = {
  [ClientStatus.ACTIVE]: "active",
  [ClientStatus.ARCHIVED]: "archived",
  [ClientStatus.NEW]: "new",
  [ClientStatus.DEACTIVATED]: "deactivated"
};
const newClientLabelDurationMs = 3 * 24 * 60 * 60 * 1000;

export const clientListQuerySchema = z.object({
  status: z.enum(clientStatusValues).optional(),
  search: z.string().trim().max(100).optional(),
  checkInDay: z.string().trim().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createClientSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(clientStatusValues).default("new"),
  packageId: z.string().trim().max(120).optional(),
  packageName: z.string().trim().max(120).optional(),
  checkInDay: z.string().trim().max(20).optional(),
  timezone: z.string().trim().max(80).default("UTC"),
  startDate: z.string().date().optional(),
  onboarding: z
    .object({
      dateOfBirth: z.string().date().optional(),
      needsPayment: z.boolean().optional(),
      paymentMode: z.enum(["offline", "payment-link"]).optional(),
      weightMeasurement: z.string().trim().max(80).optional(),
      initialQuestionnaire: z.string().trim().max(160).optional(),
      dailyHabitForm: z.string().trim().max(160).optional(),
      checkInForm: z.string().trim().max(160).optional(),
      checkInFrequency: z.string().trim().max(40).optional(),
      checkInDays: z.array(z.string().trim().max(20)).max(7).optional(),
      defaultExerciseMetricUnit: z.string().trim().max(40).optional()
    })
    .optional()
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;

interface ClientRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: ClientStatus;
  packageName: string | null;
  checkInDay: string | null;
  timezone?: string | null;
  startDate: Date | string | null;
  latestCheckInAt: Date | string | null;
  createdAt?: Date | string;
  compliance: number;
  primaryCoach?: {
    name: string | null;
    email: string | null;
  } | null;
}

export function toPrismaClientStatus(status: ApiClientStatus) {
  return statusToPrisma[status];
}

export function buildClientWhere(organizationId: string, query: ClientListQuery) {
  const newClientCutoff = new Date(Date.now() - newClientLabelDurationMs);
  const conditions = [
    query.status === "active"
      ? {
          OR: [
            { status: ClientStatus.ACTIVE },
            { status: ClientStatus.NEW, createdAt: { lte: newClientCutoff } }
          ]
        }
      : null,
    query.status === "new" ? { status: ClientStatus.NEW, createdAt: { gt: newClientCutoff } } : null,
    query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" as const } },
            { lastName: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : null
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));

  return {
    organizationId,
    deletedAt: null,
    ...(query.status && !["active", "new"].includes(query.status) ? { status: toPrismaClientStatus(query.status) } : {}),
    ...(query.checkInDay ? { checkInDay: query.checkInDay } : {}),
    ...(conditions.length > 0 ? { AND: conditions } : {})
  };
}

export function serializeClient(record: ClientRecord): ClientSummary {
  const name = `${record.firstName} ${record.lastName}`.trim();

  return {
    id: record.id,
    name,
    packageName: record.packageName || "Unassigned",
    compliance: record.compliance,
    checkInDay: record.checkInDay || "Unscheduled",
    latestCheckIn: formatDisplayDate(record.latestCheckInAt),
    status: getDisplayClientStatus(record),
    assignedCoachName: record.primaryCoach?.name || record.primaryCoach?.email || null,
    startDate: formatDisplayDate(record.startDate),
    timezone: record.timezone || "UTC",
    initials: getInitials(record.firstName, record.lastName),
    avatarColor: "bg-slate-900"
  };
}

function getDisplayClientStatus(record: ClientRecord): ApiClientStatus {
  if (record.status !== ClientStatus.NEW) {
    return statusFromPrisma[record.status];
  }

  if (!record.createdAt) {
    return "new";
  }

  const createdAt = record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt);

  return Date.now() - createdAt.getTime() > newClientLabelDurationMs ? "active" : "new";
}

export function getClientCreateData(organizationId: string, input: CreateClientInput) {
  return {
    organizationId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email?.toLowerCase(),
    phone: input.phone,
    status: toPrismaClientStatus(input.status),
    packageId: input.packageId,
    packageName: input.packageName,
    checkInDay: input.checkInDay,
    timezone: input.timezone,
    startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined
  };
}

export function getClientProfileCreateData(organizationId: string, clientId: string, input: CreateClientInput) {
  if (!input.onboarding?.dateOfBirth) {
    return null;
  }

  return {
    organizationId,
    clientId,
    dateOfBirth: new Date(`${input.onboarding.dateOfBirth}T00:00:00.000Z`)
  };
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "CC";
}

function formatDisplayDate(value: Date | string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
