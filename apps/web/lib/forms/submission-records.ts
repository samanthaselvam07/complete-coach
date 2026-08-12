import { z } from "zod";

import {
  CheckInStatus,
  FormAssignmentStatus,
  FormSubmissionStatus,
  FormType
} from "@/app/generated/prisma/enums";

export const assignmentStatusValues = ["assigned", "submitted", "reviewed", "completed", "cancelled"] as const;
export const submissionStatusValues = ["submitted", "reviewed", "completed"] as const;
export const checkInStatusValues = ["pending-review", "reviewed", "completed"] as const;
export const formTypeValues = ["intake", "application", "contact", "habit-tracker", "check-in"] as const;

export const assignmentListQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  status: z.enum(assignmentStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const submitAssignmentSchema = z.object({
  answers: z.record(z.string(), z.unknown())
});

export const submissionListQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  formId: z.string().min(1).optional(),
  formType: z.enum(formTypeValues).optional(),
  status: z.enum(submissionStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const checkInListQuerySchema = z.object({
  status: z.enum(checkInStatusValues).optional(),
  clientId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const reviewCheckInSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
  coachNotes: z.string().trim().max(4000).optional()
});

export const clientMetricsQuerySchema = z.object({
  metricKey: z.string().min(1).max(80).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  summary: z.enum(["weight"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

const assignmentStatusToPrisma: Record<(typeof assignmentStatusValues)[number], FormAssignmentStatus> = {
  assigned: FormAssignmentStatus.ASSIGNED,
  submitted: FormAssignmentStatus.SUBMITTED,
  reviewed: FormAssignmentStatus.REVIEWED,
  completed: FormAssignmentStatus.COMPLETED,
  cancelled: FormAssignmentStatus.CANCELLED
};

const assignmentStatusFromPrisma: Record<FormAssignmentStatus, (typeof assignmentStatusValues)[number]> = {
  [FormAssignmentStatus.ASSIGNED]: "assigned",
  [FormAssignmentStatus.SUBMITTED]: "submitted",
  [FormAssignmentStatus.REVIEWED]: "reviewed",
  [FormAssignmentStatus.COMPLETED]: "completed",
  [FormAssignmentStatus.CANCELLED]: "cancelled"
};

const submissionStatusToPrisma: Record<(typeof submissionStatusValues)[number], FormSubmissionStatus> = {
  submitted: FormSubmissionStatus.SUBMITTED,
  reviewed: FormSubmissionStatus.REVIEWED,
  completed: FormSubmissionStatus.COMPLETED
};

const checkInStatusToPrisma: Record<(typeof checkInStatusValues)[number], CheckInStatus> = {
  "pending-review": CheckInStatus.PENDING_REVIEW,
  reviewed: CheckInStatus.REVIEWED,
  completed: CheckInStatus.COMPLETED
};

const formTypeToPrisma: Record<(typeof formTypeValues)[number], FormType> = {
  intake: FormType.INTAKE,
  application: FormType.APPLICATION,
  contact: FormType.CONTACT,
  "habit-tracker": FormType.HABIT_TRACKER,
  "check-in": FormType.CHECK_IN
};

const checkInStatusFromPrisma: Record<CheckInStatus, (typeof checkInStatusValues)[number]> = {
  [CheckInStatus.PENDING_REVIEW]: "pending-review",
  [CheckInStatus.REVIEWED]: "reviewed",
  [CheckInStatus.COMPLETED]: "completed"
};

interface PersonRecord {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}

interface AssignmentRecord {
  id: string;
  formId: string;
  formVersionId: string;
  clientId: string;
  status: FormAssignmentStatus | string;
  dueAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  form?: { id: string; name: string; type?: unknown } | null;
  formVersion?: {
    id: string;
    formId: string;
    versionNumber: number;
    schemaJson: unknown;
    uiJson: unknown;
    publishedAt: Date | string | null;
    createdAt: Date | string;
  } | null;
  client?: PersonRecord | null;
}

interface SubmissionRecord {
  id: string;
  formId: string;
  formVersionId: string;
  assignmentId: string | null;
  clientId: string;
  answersJson: unknown;
  status: FormSubmissionStatus | string;
  submittedAt: Date | string;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  form?: { id: string; name: string; type?: unknown } | null;
  formVersion?: AssignmentRecord["formVersion"];
  client?: PersonRecord | null;
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
  summary: string | null;
  coachNotes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: PersonRecord | null;
  formSubmission?: SubmissionRecord | null;
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
  createdAt?: Date | string;
}

export function toPrismaAssignmentStatus(status: (typeof assignmentStatusValues)[number]) {
  return assignmentStatusToPrisma[status];
}

export function toPrismaSubmissionStatus(status: (typeof submissionStatusValues)[number]) {
  return submissionStatusToPrisma[status];
}

export function toPrismaCheckInStatus(status: (typeof checkInStatusValues)[number]) {
  return checkInStatusToPrisma[status];
}

export function toPrismaFormType(type: (typeof formTypeValues)[number]) {
  return formTypeToPrisma[type];
}

export function serializeAssignment(record: AssignmentRecord) {
  return {
    id: record.id,
    formId: record.formId,
    formVersionId: record.formVersionId,
    clientId: record.clientId,
    clientName: formatPersonName(record.client),
    formName: record.form?.name ?? "Assigned form",
    formType: record.form?.type ? serializeFormType(record.form.type) : null,
    status: serializeAssignmentStatus(record.status),
    dueAt: record.dueAt ? toIsoString(record.dueAt) : null,
    completedAt: record.completedAt ? toIsoString(record.completedAt) : null,
    createdAt: toIsoString(record.createdAt),
    ...(record.formVersion
      ? {
          formVersion: {
            id: record.formVersion.id,
            formId: record.formVersion.formId,
            versionNumber: record.formVersion.versionNumber,
            schema: record.formVersion.schemaJson,
            ui: record.formVersion.uiJson,
            publishedAt: record.formVersion.publishedAt ? toIsoString(record.formVersion.publishedAt) : null,
            createdAt: toIsoString(record.formVersion.createdAt)
          }
        }
      : {})
  };
}

function serializeFormType(type: unknown) {
  if (typeof type !== "string") {
    return null;
  }

  return type.toLowerCase().replaceAll("_", "-");
}

export function serializeSubmission(record: SubmissionRecord) {
  return {
    id: record.id,
    formId: record.formId,
    formVersionId: record.formVersionId,
    assignmentId: record.assignmentId,
    clientId: record.clientId,
    clientName: formatPersonName(record.client),
    formName: record.form?.name ?? "Submitted form",
    formType: record.form?.type ? serializeFormType(record.form.type) : null,
    answers: record.answersJson,
    status: serializeSubmissionStatus(record.status),
    submittedAt: toIsoString(record.submittedAt),
    reviewedAt: record.reviewedAt ? toIsoString(record.reviewedAt) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeCheckIn(record: CheckInRecord) {
  const submittedAt = record.submittedAt ? toIsoString(record.submittedAt) : toIsoString(record.createdAt);
  const dueAt = record.dueAt ? toIsoString(record.dueAt) : null;

  return {
    id: record.id,
    clientId: record.clientId,
    formSubmissionId: record.formSubmissionId,
    name: formatPersonName(record.client),
    initials: getInitials(record.client),
    status: serializeCheckInQueueStatus(record.status),
    checkInStatus: serializeCheckInStatus(record.status),
    dueAt,
    submittedAt,
    assignedDay: dueAt,
    lastCheckIn: formatRelativeDate(submittedAt),
    summary: record.summary,
    coachNotes: record.coachNotes,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeCheckInDetail(record: CheckInRecord, metrics: MetricRecord[]) {
  return {
    ...serializeCheckIn(record),
    answers: record.formSubmission?.answersJson ?? null,
    submission: record.formSubmission ? serializeSubmission(record.formSubmission) : null,
    metrics: metrics.map(serializeMetric)
  };
}

export function serializeMetric(record: MetricRecord) {
  const measuredAt = toIsoString(record.measuredAt);
  const metricValue = Number(record.metricValue);

  return {
    id: record.id,
    clientId: record.clientId,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    measuredAt,
    metricKey: record.metricKey,
    metricValue,
    x: measuredAt,
    y: metricValue,
    unit: record.unit,
    metadata: record.metadata,
    ...(record.createdAt ? { createdAt: toIsoString(record.createdAt) } : {})
  };
}

function serializeAssignmentStatus(status: FormAssignmentStatus | string) {
  return assignmentStatusFromPrisma[status as FormAssignmentStatus] ?? status;
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
  return checkInStatusFromPrisma[status as CheckInStatus] ?? status;
}

function serializeCheckInQueueStatus(status: CheckInStatus | string) {
  const apiStatus = serializeCheckInStatus(status);

  return apiStatus === "completed" ? "completed" : "pending";
}

function formatPersonName(person: PersonRecord | null | undefined) {
  if (!person) {
    return "Unknown client";
  }

  if (person.name) {
    return person.name;
  }

  return [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unknown client";
}

function getInitials(person: PersonRecord | null | undefined) {
  return formatPersonName(person)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const deltaMs = Date.now() - date.getTime();

  if (!Number.isFinite(deltaMs)) {
    return "Recently";
  }

  const days = Math.max(0, Math.round(deltaMs / 86_400_000));

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
