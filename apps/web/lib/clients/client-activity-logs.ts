import { z } from "zod";

import { ClientActivityLogDomain, ClientActivityLogStatus } from "@/app/generated/prisma/enums";
import type { FormDefinition } from "@/lib/forms/schema";

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

interface ClientActivityLogSummaryOptions {
  trainingLogTargetDays?: number | null;
}

export interface InferredClientActivityLog {
  domain: ApiClientActivityLogDomain;
  logDate: Date;
  status: ApiClientActivityLogStatus;
  notes: string | null;
}

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

export function buildClientActivityLogSummary(
  records: ClientActivityLogRecord[],
  dateFrom: Date,
  dateTo: Date,
  options: ClientActivityLogSummaryOptions = {}
) {
  const days = getInclusiveDayCount(dateFrom, dateTo);
  const possibleLogsByDomain = getPossibleLogsByDomain(days, options.trainingLogTargetDays);
  const possibleLogs = clientActivityLogDomainValues.reduce((total, domain) => total + possibleLogsByDomain[domain], 0);
  const completedLogs = clientActivityLogDomainValues.reduce((total, domain) => {
    const prismaDomain = domainToPrisma[domain];
    const domainCompletedLogs = records.filter(
      (record) => record.domain === prismaDomain && record.status === ClientActivityLogStatus.COMPLETED
    ).length;

    return total + Math.min(domainCompletedLogs, possibleLogsByDomain[domain]);
  }, 0);
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
      const domainPossibleLogs = possibleLogsByDomain[domain];
      const domainCompletedLogs = records.filter(
        (record) => record.domain === prismaDomain && record.status === ClientActivityLogStatus.COMPLETED
      ).length;
      const cappedCompletedLogs = Math.min(domainCompletedLogs, domainPossibleLogs);

      return {
        domain,
        completedLogs: cappedCompletedLogs,
        possibleLogs: domainPossibleLogs,
        complianceScore: domainPossibleLogs > 0 ? Math.round((cappedCompletedLogs / domainPossibleLogs) * 100) : 0
      };
    })
  };
}

export function inferClientActivityLogsFromSubmission({
  answers,
  definition,
  submittedAt
}: {
  answers: Record<string, unknown>;
  definition: FormDefinition;
  submittedAt: Date;
}): InferredClientActivityLog[] {
  const inferredLogs = new Map<ApiClientActivityLogDomain, InferredClientActivityLog>();
  const logDate = toDateOnly(submittedAt.toISOString().slice(0, 10));

  for (const field of definition.fields) {
    const answer = answers[field.id];
    const status = inferLogStatus(answer);

    if (!status) {
      continue;
    }

    const domain = inferLogDomain(field.id, field.label);

    if (!domain) {
      continue;
    }

    inferredLogs.set(domain, {
      domain,
      logDate,
      status,
      notes: `${field.label}: ${formatAnswerForLog(answer)}`
    });
  }

  return Array.from(inferredLogs.values());
}

function getPossibleLogsByDomain(days: number, trainingLogTargetDays?: number | null) {
  const normalizedTrainingTarget = normalizeTrainingLogTargetDays(trainingLogTargetDays);
  const trainingPossibleLogs = Math.min(days, Math.max(0, Math.round((days / 7) * normalizedTrainingTarget)));

  return {
    training: trainingPossibleLogs,
    nutrition: days,
    supplementation: days
  } satisfies Record<ApiClientActivityLogDomain, number>;
}

export function normalizeTrainingLogTargetDays(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 7;
  }

  return Math.min(7, Math.max(0, Math.round(value)));
}

function inferLogDomain(fieldId: string, label: string): ApiClientActivityLogDomain | null {
  const haystack = `${fieldId} ${label}`.toLowerCase();

  if (/\b(supplement|supplements|supplementation)\b/.test(haystack)) {
    return "supplementation";
  }

  if (/\b(training|train|trained|workout|session|sessions)\b/.test(haystack)) {
    return "training";
  }

  if (/\b(nutrition|meal|meals|macro|macros|calorie|calories|protein)\b/.test(haystack)) {
    return "nutrition";
  }

  return null;
}

function inferLogStatus(answer: unknown): ApiClientActivityLogStatus | null {
  if (typeof answer === "boolean") {
    return answer ? "completed" : "missed";
  }

  if (typeof answer !== "string") {
    return null;
  }

  const normalized = answer.trim().toLowerCase();

  if (["yes", "y", "true", "completed", "complete", "done", "hit", "adherent"].includes(normalized)) {
    return "completed";
  }

  if (["no", "n", "false", "missed", "incomplete", "not completed", "did not complete"].includes(normalized)) {
    return "missed";
  }

  return null;
}

function formatAnswerForLog(answer: unknown) {
  if (typeof answer === "string") {
    return answer.trim();
  }

  if (typeof answer === "boolean") {
    return answer ? "Yes" : "No";
  }

  return String(answer);
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
