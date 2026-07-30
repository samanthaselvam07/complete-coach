import { z } from "zod";

import { ClientActivityLogDomain, ClientActivityLogStatus } from "@/app/generated/prisma/enums";

export const clientActivityLogDomainValues = ["training", "nutrition", "supplementation"] as const;
export const clientActivityLogStatusValues = ["completed", "missed"] as const;

type ApiClientActivityLogDomain = (typeof clientActivityLogDomainValues)[number];
type ApiClientActivityLogStatus = (typeof clientActivityLogStatusValues)[number];

const domainToPrisma: Record<ApiClientActivityLogDomain, ClientActivityLogDomain> = {
  training: ClientActivityLogDomain.TRAINING,
  nutrition: ClientActivityLogDomain.NUTRITION,
  supplementation: ClientActivityLogDomain.SUPPLEMENTATION
};

const domainFromPrisma: Record<ClientActivityLogDomain, ApiClientActivityLogDomain> = {
  [ClientActivityLogDomain.TRAINING]: "training",
  [ClientActivityLogDomain.NUTRITION]: "nutrition",
  [ClientActivityLogDomain.SUPPLEMENTATION]: "supplementation"
};

const statusToPrisma: Record<ApiClientActivityLogStatus, ClientActivityLogStatus> = {
  completed: ClientActivityLogStatus.COMPLETED,
  missed: ClientActivityLogStatus.MISSED
};

const statusFromPrisma: Record<ClientActivityLogStatus, ApiClientActivityLogStatus> = {
  [ClientActivityLogStatus.COMPLETED]: "completed",
  [ClientActivityLogStatus.MISSED]: "missed"
};

export const clientActivityLogsQuerySchema = z.object({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  days: z.coerce.number().int().min(1).max(90).default(7)
});

export const upsertClientActivityLogSchema = z.object({
  domain: z.enum(clientActivityLogDomainValues),
  logDate: z.string().date(),
  status: z.enum(clientActivityLogStatusValues).default("completed"),
  notes: z.string().trim().max(2000).optional()
});

export type ClientActivityLogsQuery = z.infer<typeof clientActivityLogsQuerySchema>;
export type UpsertClientActivityLogInput = z.infer<typeof upsertClientActivityLogSchema>;

export interface ClientActivityLogRecord {
  id: string;
  domain: ClientActivityLogDomain;
  logDate: Date | string;
  status: ClientActivityLogStatus;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function toPrismaClientActivityLogDomain(domain: ApiClientActivityLogDomain) {
  return domainToPrisma[domain];
}

export function toPrismaClientActivityLogStatus(status: ApiClientActivityLogStatus) {
  return statusToPrisma[status];
}

export function getClientActivityLogDateRange(query: ClientActivityLogsQuery, now = new Date()) {
  if (query.dateFrom && query.dateTo) {
    return {
      dateFrom: toDateOnly(query.dateFrom),
      dateTo: toDateOnly(query.dateTo)
    };
  }

  const dateTo = toDateOnly(now.toISOString().slice(0, 10));
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - (query.days - 1));

  return { dateFrom, dateTo };
}

export function serializeClientActivityLog(record: ClientActivityLogRecord) {
  return {
    id: record.id,
    domain: domainFromPrisma[record.domain],
    logDate: toDateString(record.logDate),
    status: statusFromPrisma[record.status],
    notes: record.notes,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function buildClientActivityLogSummary(records: ClientActivityLogRecord[], dateFrom: Date, dateTo: Date) {
  const days = getInclusiveDayCount(dateFrom, dateTo);
  const possibleLogs = days * clientActivityLogDomainValues.length;
  const completedLogs = records.filter((record) => record.status === ClientActivityLogStatus.COMPLETED).length;
  const complianceScore = possibleLogs > 0 ? Math.round((completedLogs / possibleLogs) * 100) : 0;

  return {
    dateFrom: toDateString(dateFrom),
    dateTo: toDateString(dateTo),
    days,
    completedLogs,
    possibleLogs,
    complianceScore,
    byDomain: clientActivityLogDomainValues.map((domain) => {
      const prismaDomain = domainToPrisma[domain];
      const domainCompletedLogs = records.filter(
        (record) => record.domain === prismaDomain && record.status === ClientActivityLogStatus.COMPLETED
      ).length;

      return {
        domain,
        completedLogs: domainCompletedLogs,
        possibleLogs: days,
        complianceScore: days > 0 ? Math.round((domainCompletedLogs / days) * 100) : 0
      };
    })
  };
}

export function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getInclusiveDayCount(dateFrom: Date, dateTo: Date) {
  return Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86_400_000) + 1);
}

function toDateString(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
