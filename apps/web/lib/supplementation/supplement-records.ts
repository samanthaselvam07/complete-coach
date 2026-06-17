import { z } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";

import {
  LibraryScope,
  SupplementPlanAssignmentStatus,
  SupplementPlanTemplateStatus
} from "@/app/generated/prisma/enums";

export const supplementScopeValues = ["global", "private"] as const;
export const supplementTemplateStatusValues = ["draft", "published", "archived"] as const;
export const supplementAssignmentStatusValues = ["active", "paused", "completed", "cancelled"] as const;

type SupplementScope = (typeof supplementScopeValues)[number];
type SupplementTemplateStatus = (typeof supplementTemplateStatusValues)[number];
type SupplementAssignmentStatus = (typeof supplementAssignmentStatusValues)[number];

const scopeToPrisma: Record<SupplementScope, LibraryScope> = {
  global: LibraryScope.GLOBAL,
  private: LibraryScope.PRIVATE
};

const scopeFromPrisma: Record<LibraryScope, SupplementScope> = {
  [LibraryScope.GLOBAL]: "global",
  [LibraryScope.PRIVATE]: "private"
};

const templateStatusToPrisma: Record<SupplementTemplateStatus, SupplementPlanTemplateStatus> = {
  draft: SupplementPlanTemplateStatus.DRAFT,
  published: SupplementPlanTemplateStatus.PUBLISHED,
  archived: SupplementPlanTemplateStatus.ARCHIVED
};

const templateStatusFromPrisma: Record<SupplementPlanTemplateStatus, SupplementTemplateStatus> = {
  [SupplementPlanTemplateStatus.DRAFT]: "draft",
  [SupplementPlanTemplateStatus.PUBLISHED]: "published",
  [SupplementPlanTemplateStatus.ARCHIVED]: "archived"
};

const assignmentStatusFromPrisma: Record<SupplementPlanAssignmentStatus, SupplementAssignmentStatus> = {
  [SupplementPlanAssignmentStatus.ACTIVE]: "active",
  [SupplementPlanAssignmentStatus.PAUSED]: "paused",
  [SupplementPlanAssignmentStatus.COMPLETED]: "completed",
  [SupplementPlanAssignmentStatus.CANCELLED]: "cancelled"
};

const stringArraySchema = z.array(z.string().trim().min(1).max(80)).max(20);

export const supplementListQuerySchema = z.object({
  scope: z.enum(supplementScopeValues).optional(),
  category: z.string().trim().max(80).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50)
});

export const createSupplementSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  recommendedTiming: z.string().trim().max(160).optional(),
  dosage: z.string().trim().max(160).optional(),
  bioavailabilityNotes: z.string().trim().max(2000).optional(),
  clinicalDescription: z.string().trim().max(4000).optional(),
  tags: stringArraySchema.optional(),
  imageObjectId: z.string().trim().max(500).optional()
});

export const supplementCoachDetailsSchema = z.object({
  coachDosageInstructions: z.string().trim().max(2000).optional(),
  coachNotes: z.string().trim().max(4000).optional(),
  affiliateLink: z.union([z.string().trim().url().max(1000), z.literal("")]).optional()
});

export const supplementTemplateListQuerySchema = z.object({
  status: z.enum(supplementTemplateStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const supplementTemplateItemSchema = z.object({
  supplementId: z.string().min(1).optional(),
  supplementName: z.string().trim().min(1).max(160),
  dosage: z.string().trim().min(1).max(160),
  timing: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(1000).optional()
});

export const supplementTemplateJsonSchema = z.object({
  phases: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        supplements: z.array(supplementTemplateItemSchema).min(1).max(30)
      })
    )
    .min(1)
    .max(12)
});

export const createSupplementTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(supplementTemplateStatusValues).default("draft"),
  template: supplementTemplateJsonSchema
});

export const createSupplementAssignmentSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().trim().max(160).optional(),
  startsOn: z.string().date(),
  endsOn: z.string().date().optional()
});

type SupplementListQuery = z.infer<typeof supplementListQuerySchema>;
type CreateSupplementInput = z.infer<typeof createSupplementSchema>;
type SupplementCoachDetailsInput = z.infer<typeof supplementCoachDetailsSchema>;
type SupplementTemplateListQuery = z.infer<typeof supplementTemplateListQuerySchema>;
type CreateSupplementTemplateInput = z.infer<typeof createSupplementTemplateSchema>;

interface SupplementRecord {
  id: string;
  organizationId: string | null;
  scope: LibraryScope;
  name: string;
  category: string;
  recommendedTiming: string | null;
  dosage: string | null;
  bioavailabilityNotes: string | null;
  clinicalDescription: string | null;
  tags: unknown;
  imageObjectId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface SupplementTemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: SupplementPlanTemplateStatus;
  templateJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface SupplementCoachDetailRecord {
  id: string;
  organizationId: string;
  supplementId: string;
  coachDosageInstructions: string | null;
  coachNotes: string | null;
  affiliateLink: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface SupplementAssignmentRecord {
  id: string;
  organizationId: string;
  clientId: string;
  templateId: string | null;
  name: string;
  status: SupplementPlanAssignmentStatus;
  snapshotJson: unknown;
  startsOn: Date | string;
  endsOn: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: { firstName: string; lastName: string };
}

export function buildSupplementWhere(organizationId: string, query: SupplementListQuery) {
  return {
    deletedAt: null,
    OR: [{ scope: LibraryScope.GLOBAL }, { organizationId }],
    ...(query.scope ? { scope: scopeToPrisma[query.scope] } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          AND: [
            {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { category: { contains: query.search, mode: "insensitive" as const } },
                { recommendedTiming: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          ]
        }
      : {})
  };
}

export function getSupplementCreateData(organizationId: string, userId: string, input: CreateSupplementInput) {
  return {
    organizationId,
    createdByUserId: userId,
    scope: LibraryScope.PRIVATE,
    name: input.name,
    category: input.category,
    recommendedTiming: input.recommendedTiming,
    dosage: input.dosage,
    bioavailabilityNotes: input.bioavailabilityNotes,
    clinicalDescription: input.clinicalDescription,
    tags: input.tags as InputJsonValue | undefined,
    imageObjectId: input.imageObjectId
  };
}

export function getSupplementCoachDetailsUpsertData(
  organizationId: string,
  userId: string,
  supplementId: string,
  input: SupplementCoachDetailsInput
) {
  const coachDosageInstructions = emptyToNull(input.coachDosageInstructions);
  const coachNotes = emptyToNull(input.coachNotes);
  const affiliateLink = emptyToNull(input.affiliateLink);

  return {
    where: {
      organizationId_supplementId: {
        organizationId,
        supplementId
      }
    },
    update: {
      coachDosageInstructions,
      coachNotes,
      affiliateLink,
      updatedByUserId: userId
    },
    create: {
      organizationId,
      supplementId,
      coachDosageInstructions,
      coachNotes,
      affiliateLink,
      createdByUserId: userId,
      updatedByUserId: userId
    }
  };
}

export function buildSupplementTemplateWhere(organizationId: string, query: SupplementTemplateListQuery) {
  return {
    organizationId,
    deletedAt: null,
    ...(query.status ? { status: templateStatusToPrisma[query.status] } : {})
  };
}

export function getSupplementTemplateCreateData(
  organizationId: string,
  userId: string,
  input: CreateSupplementTemplateInput
) {
  return {
    organizationId,
    createdByUserId: userId,
    name: input.name,
    description: input.description,
    status: templateStatusToPrisma[input.status],
    templateJson: input.template as InputJsonValue
  };
}

export function buildSupplementAssignmentSnapshot(template: SupplementTemplateRecord) {
  return {
    templateId: template.id,
    templateName: template.name,
    description: template.description,
    template: template.templateJson
  };
}

export function serializeSupplement(record: SupplementRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    scope: scopeFromPrisma[record.scope],
    name: record.name,
    category: record.category,
    recommendedTiming: record.recommendedTiming,
    dosage: record.dosage,
    bioavailabilityNotes: record.bioavailabilityNotes,
    clinicalDescription: record.clinicalDescription,
    tags: Array.isArray(record.tags) ? record.tags : [],
    imageObjectId: record.imageObjectId,
    createdAt: toIsoDate(record.createdAt),
    updatedAt: toIsoDate(record.updatedAt)
  };
}

export function serializeSupplementCoachDetails(record: SupplementCoachDetailRecord | null) {
  return {
    coachDosageInstructions: record?.coachDosageInstructions ?? "",
    coachNotes: record?.coachNotes ?? "",
    affiliateLink: record?.affiliateLink ?? "",
    createdAt: record ? toIsoDate(record.createdAt) : null,
    updatedAt: record ? toIsoDate(record.updatedAt) : null
  };
}

export function serializeSupplementTemplate(record: SupplementTemplateRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    description: record.description,
    status: templateStatusFromPrisma[record.status],
    template: record.templateJson,
    createdAt: toIsoDate(record.createdAt),
    updatedAt: toIsoDate(record.updatedAt)
  };
}

export function serializeSupplementAssignment(record: SupplementAssignmentRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    clientId: record.clientId,
    clientName: record.client ? `${record.client.firstName} ${record.client.lastName}` : null,
    templateId: record.templateId,
    name: record.name,
    status: assignmentStatusFromPrisma[record.status],
    snapshot: record.snapshotJson,
    startsOn: toDateOnly(record.startsOn),
    endsOn: record.endsOn ? toDateOnly(record.endsOn) : null,
    createdAt: toIsoDate(record.createdAt),
    updatedAt: toIsoDate(record.updatedAt)
  };
}

function toIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value: Date | string) {
  return toIsoDate(value).slice(0, 10);
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
