import { z } from "zod";

import { CheckInStatus, ClientStatus, FormSubmissionStatus } from "@/app/generated/prisma/enums";
import { FormDefinitionSchema } from "@/lib/forms/schema";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

export const externalClientQuerySchema = z.object({
  status: z.string().optional(),
  updated_since: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  include_pii: z.coerce.boolean().default(false)
});

export const externalMetricsQuerySchema = z.object({
  metric_key: z.string().min(1).max(80).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  source_type: z.string().min(1).max(80).optional(),
  client_external_ids: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
});

export const externalSubmissionsQuerySchema = z.object({
  form_id: z.string().min(1).optional(),
  submitted_since: z.string().datetime().optional(),
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
});

export const externalCheckInsQuerySchema = z.object({
  status: z.string().optional(),
  submitted_since: z.string().datetime().optional(),
  reviewed_since: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
});

interface ClientRecord {
  id: string;
  externalClientId: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: ClientStatus | string;
  packageName?: string | null;
  checkInDay?: string | null;
  timezone?: string | null;
  startDate?: Date | string | null;
  latestCheckInAt?: Date | string | null;
  compliance?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  profile?: {
    waterTargetLitres?: number | string | { toString: () => string } | null;
    stepTarget?: number | null;
  } | null;
}

interface MetricRecord {
  id: string;
  clientId: string;
  sourceType: string;
  sourceId: string;
  measuredAt: Date | string;
  metricKey: string;
  metricValue: number | string | { toString: () => string };
  unit: string | null;
  metadata: unknown;
  createdAt: Date | string;
  client?: ClientRecord | null;
}

interface SubmissionRecord {
  id: string;
  formId: string;
  formVersionId: string;
  assignmentId: string | null;
  answersJson: unknown;
  status: FormSubmissionStatus | string;
  submittedAt: Date | string;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: ClientRecord | null;
  form?: { id: string; name: string; type?: unknown } | null;
  formVersion?: { versionNumber: number; schemaJson: unknown } | null;
}

interface CheckInRecord {
  id: string;
  clientId: string;
  formSubmissionId: string | null;
  type: string;
  status: CheckInStatus | string;
  dueAt: Date | string | null;
  submittedAt: Date | string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: ClientRecord | null;
  formSubmission?: SubmissionRecord | null;
}

export function createExternalPageCursor(id: string, timestamp: Date | string) {
  return Buffer.from(JSON.stringify({ id, timestamp: toIsoString(timestamp) }), "utf8").toString("base64url");
}

export function parseExternalPageCursor(cursor: string | undefined) {
  if (!cursor) {
    return null;
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const parsed = z
    .object({
      id: z.string().min(1),
      timestamp: z.string().datetime()
    })
    .safeParse(decoded);

  if (!parsed.success) {
    return null;
  }

  return {
    id: parsed.data.id,
    timestamp: new Date(parsed.data.timestamp)
  };
}

export function buildExternalCursorWhere(cursor: string | undefined, column: "updatedAt" | "measuredAt" | "submittedAt") {
  const parsed = parseExternalPageCursor(cursor);

  if (!parsed) {
    return {};
  }

  return {
    OR: [{ [column]: { lt: parsed.timestamp } }, { [column]: parsed.timestamp, id: { lt: parsed.id } }]
  };
}

export function buildExternalPage<T extends { id: string }>(
  records: T[],
  limit: number,
  timestampAccessor: (record: T) => Date | string | null | undefined,
  serializer: (record: T) => unknown
  ) {
  const pageRecords = records.slice(0, limit);
  const lastRecord = pageRecords.at(-1);

  return {
    data: pageRecords.map(serializer),
    meta: {
      limit,
      hasMore: records.length > limit,
      nextCursor:
        records.length > limit && lastRecord
          ? createExternalPageCursor(lastRecord.id, timestampAccessor(lastRecord) ?? new Date(0))
          : null
    }
  };
}

export function serializeExternalClient(record: ClientRecord, includePii = false) {
  return {
    externalClientId: record.externalClientId,
    status: serializeClientStatus(record.status),
    packageName: record.packageName,
    checkInDay: record.checkInDay,
    timezone: record.timezone,
    startDate: record.startDate ? toDateOnly(record.startDate) : null,
    latestCheckInAt: record.latestCheckInAt ? toIsoString(record.latestCheckInAt) : null,
    compliance: record.compliance,
    waterTargetLitres: record.profile?.waterTargetLitres === null || record.profile?.waterTargetLitres === undefined
      ? null
      : Number(record.profile.waterTargetLitres),
    stepTarget: record.profile?.stepTarget ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    ...(includePii
      ? {
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
          phone: record.phone
        }
      : {})
  };
}

export function serializeExternalMetric(record: MetricRecord) {
  return {
    id: record.id,
    externalClientId: record.client?.externalClientId ?? null,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    measuredAt: toIsoString(record.measuredAt),
    metricKey: record.metricKey,
    metricValue: Number(record.metricValue),
    unit: record.unit,
    metadata: record.metadata,
    createdAt: toIsoString(record.createdAt)
  };
}

export function serializeExternalSubmission(record: SubmissionRecord) {
  return {
    id: record.id,
    externalClientId: record.client?.externalClientId ?? null,
    formId: record.formId,
    formName: record.form?.name ?? null,
    formVersionId: record.formVersionId,
    formVersionNumber: record.formVersion?.versionNumber ?? null,
    assignmentId: record.assignmentId,
    status: serializeSubmissionStatus(record.status),
    submittedAt: toIsoString(record.submittedAt),
    reviewedAt: record.reviewedAt ? toIsoString(record.reviewedAt) : null,
    answers: serializeExportableAnswers(record.formVersion?.schemaJson, record.answersJson),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeExternalCheckIn(record: CheckInRecord) {
  return {
    id: record.id,
    externalClientId: record.client?.externalClientId ?? null,
    formSubmissionId: record.formSubmissionId,
    type: record.type,
    status: serializeCheckInStatus(record.status),
    dueAt: record.dueAt ? toIsoString(record.dueAt) : null,
    submittedAt: record.submittedAt ? toIsoString(record.submittedAt) : null,
    reviewedAt: record.reviewedAt ? toIsoString(record.reviewedAt) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function toExternalClientStatus(status: string | undefined) {
  const statusMap: Record<string, ClientStatus> = {
    active: ClientStatus.ACTIVE,
    archived: ClientStatus.ARCHIVED,
    new: ClientStatus.NEW,
    deactivated: ClientStatus.DEACTIVATED
  };

  return status ? statusMap[status] : undefined;
}

export function toExternalSubmissionStatus(status: string | undefined) {
  const statusMap: Record<string, FormSubmissionStatus> = {
    submitted: FormSubmissionStatus.SUBMITTED,
    reviewed: FormSubmissionStatus.REVIEWED,
    completed: FormSubmissionStatus.COMPLETED
  };

  return status ? statusMap[status] : undefined;
}

export function toExternalCheckInStatus(status: string | undefined) {
  const statusMap: Record<string, CheckInStatus> = {
    "pending-review": CheckInStatus.PENDING_REVIEW,
    reviewed: CheckInStatus.REVIEWED,
    completed: CheckInStatus.COMPLETED
  };

  return status ? statusMap[status] : undefined;
}

export function splitExternalClientIds(value: string | undefined) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function serializeExportableAnswers(schemaJson: unknown, answersJson: unknown) {
  const definition = FormDefinitionSchema.safeParse(schemaJson);

  if (!definition.success || !isRecord(answersJson)) {
    return {};
  }

  return Object.fromEntries(
    definition.data.fields
      .filter((field) => field.exportPolicy === "metadata" || field.exportPolicy === "metric")
      .filter((field) => Object.prototype.hasOwnProperty.call(answersJson, field.id))
      .map((field) => [field.id, answersJson[field.id]])
  );
}

function serializeClientStatus(status: ClientStatus | string) {
  const statusMap: Record<ClientStatus, string> = {
    [ClientStatus.ACTIVE]: "active",
    [ClientStatus.ARCHIVED]: "archived",
    [ClientStatus.NEW]: "new",
    [ClientStatus.DEACTIVATED]: "deactivated"
  };

  return statusMap[status as ClientStatus] ?? status;
}

function serializeSubmissionStatus(status: FormSubmissionStatus | string) {
  const statusMap: Record<FormSubmissionStatus, string> = {
    [FormSubmissionStatus.SUBMITTED]: "submitted",
    [FormSubmissionStatus.REVIEWED]: "reviewed",
    [FormSubmissionStatus.COMPLETED]: "completed"
  };

  return statusMap[status as FormSubmissionStatus] ?? status;
}

function serializeCheckInStatus(status: CheckInStatus | string) {
  const statusMap: Record<CheckInStatus, string> = {
    [CheckInStatus.PENDING_REVIEW]: "pending-review",
    [CheckInStatus.REVIEWED]: "reviewed",
    [CheckInStatus.COMPLETED]: "completed"
  };

  return statusMap[status as CheckInStatus] ?? status;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toDateOnly(value: Date | string) {
  return toIsoString(value).slice(0, 10);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
