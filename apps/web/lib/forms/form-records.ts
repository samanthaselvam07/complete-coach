import { z } from "zod";

import { FormAssignmentStatus, FormStatus, FormType } from "@/app/generated/prisma/enums";
import { FormDefinitionSchema } from "@/lib/forms/schema";

export const formTypeValues = [
  "check-in",
  "intake",
  "application",
  "contact",
  "habit-tracker",
  "terms-and-conditions"
] as const;
export const formStatusValues = ["draft", "published", "archived"] as const;

export type ApiFormType = (typeof formTypeValues)[number];
export type ApiFormStatus = (typeof formStatusValues)[number];

const typeToPrisma: Record<ApiFormType, FormType> = {
  "check-in": FormType.CHECK_IN,
  intake: FormType.INTAKE,
  application: FormType.APPLICATION,
  contact: FormType.CONTACT,
  "habit-tracker": FormType.HABIT_TRACKER,
  "terms-and-conditions": FormType.TERMS_AND_CONDITIONS
};

const typeFromPrisma: Record<FormType, ApiFormType> = {
  [FormType.CHECK_IN]: "check-in",
  [FormType.INTAKE]: "intake",
  [FormType.APPLICATION]: "application",
  [FormType.CONTACT]: "contact",
  [FormType.HABIT_TRACKER]: "habit-tracker",
  [FormType.TERMS_AND_CONDITIONS]: "terms-and-conditions"
};

const statusToPrisma: Record<ApiFormStatus, FormStatus> = {
  draft: FormStatus.DRAFT,
  published: FormStatus.PUBLISHED,
  archived: FormStatus.ARCHIVED
};

const statusFromPrisma: Record<FormStatus, ApiFormStatus> = {
  [FormStatus.DRAFT]: "draft",
  [FormStatus.PUBLISHED]: "published",
  [FormStatus.ARCHIVED]: "archived"
};

export const formListQuerySchema = z.object({
  status: z.enum(formStatusValues).optional(),
  type: z.enum(formTypeValues).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const formMetadataSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(formTypeValues)
});

export const createFormSchema = formMetadataSchema.extend({
  status: z.enum(formStatusValues).default("draft")
});

export const updateFormSchema = formMetadataSchema
  .extend({
    status: z.enum(formStatusValues)
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required."
  });

export const createFormVersionSchema = z.object({
  schema: FormDefinitionSchema,
  ui: z.record(z.string(), z.unknown()).optional()
});

export const publishFormSchema = z.object({
  formVersionId: z.string().min(1)
});

export const createFormAssignmentSchema = z.object({
  clientId: z.string().min(1),
  formVersionId: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional()
});

export type FormListQuery = z.infer<typeof formListQuerySchema>;
export type CreateFormInput = z.infer<typeof createFormSchema>;
export type UpdateFormInput = z.infer<typeof updateFormSchema>;

interface FormRecord {
  id: string;
  name: string;
  description: string | null;
  type: FormType;
  status: FormStatus;
  shareSlug?: string | null;
  currentVersionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface FormVersionRecord {
  id: string;
  formId: string;
  versionNumber: number;
  schemaJson: unknown;
  uiJson: unknown;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

interface FormAssignmentRecord {
  id: string;
  formId: string;
  formVersionId: string;
  clientId: string;
  status: FormAssignmentStatus | string;
  dueAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
}

export function toPrismaFormType(type: ApiFormType) {
  return typeToPrisma[type];
}

export function toPrismaFormStatus(status: ApiFormStatus) {
  return statusToPrisma[status];
}

export function buildFormWhere(organizationId: string, query: FormListQuery) {
  return {
    organizationId,
    deletedAt: null,
    ...(query.status ? { status: toPrismaFormStatus(query.status) } : {}),
    ...(query.type ? { type: toPrismaFormType(query.type) } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { description: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

export function getFormCreateData(organizationId: string, userId: string, input: CreateFormInput) {
  return {
    organizationId,
    createdByUserId: userId,
    name: input.name,
    description: input.description,
    type: toPrismaFormType(input.type),
    status: toPrismaFormStatus(input.status)
  };
}

export function getFormUpdateData(input: UpdateFormInput) {
  return {
    ...(input.name ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.type ? { type: toPrismaFormType(input.type) } : {}),
    ...(input.status ? { status: toPrismaFormStatus(input.status) } : {})
  };
}

export function serializeForm(record: FormRecord) {
  const shareSlug = record.shareSlug ?? record.id;

  return {
    id: record.id,
    name: record.name,
    description: record.description,
    type: typeFromPrisma[record.type],
    status: statusFromPrisma[record.status],
    shareSlug,
    shareUrlPath: `/forms/respond/${shareSlug}`,
    currentVersionId: record.currentVersionId,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeFormVersion(record: FormVersionRecord) {
  return {
    id: record.id,
    formId: record.formId,
    versionNumber: record.versionNumber,
    schema: record.schemaJson,
    ui: record.uiJson,
    publishedAt: record.publishedAt ? toIsoString(record.publishedAt) : null,
    createdAt: toIsoString(record.createdAt)
  };
}

export function serializeFormAssignment(record: FormAssignmentRecord) {
  return {
    id: record.id,
    formId: record.formId,
    formVersionId: record.formVersionId,
    clientId: record.clientId,
    status: serializeAssignmentStatus(record.status),
    dueAt: record.dueAt ? toIsoString(record.dueAt) : null,
    completedAt: record.completedAt ? toIsoString(record.completedAt) : null,
    createdAt: toIsoString(record.createdAt)
  };
}

function serializeAssignmentStatus(status: FormAssignmentStatus | string) {
  if (typeof status === "string") {
    return status;
  }

  const assignmentStatusMap: Record<FormAssignmentStatus, string> = {
    [FormAssignmentStatus.ASSIGNED]: "assigned",
    [FormAssignmentStatus.SUBMITTED]: "submitted",
    [FormAssignmentStatus.REVIEWED]: "reviewed",
    [FormAssignmentStatus.COMPLETED]: "completed",
    [FormAssignmentStatus.CANCELLED]: "cancelled"
  };

  return assignmentStatusMap[status];
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
