import { z } from "zod";

import { LeadStage, LeadStatus } from "@/app/generated/prisma/enums";
import type { Lead } from "@/lib/crm/lead-models";
import { isDefaultCrmStage } from "@/lib/crm/stage-records";

export const leadStatusValues = ["hot", "warm", "cold"] as const;
export const leadStageValues = [
  "initial-contact",
  "consultation",
  "proposal",
  "negotiation",
  "closed-won"
] as const;

export type ApiLeadStatus = (typeof leadStatusValues)[number];
export type ApiLeadStage = (typeof leadStageValues)[number];

const statusToPrisma: Record<ApiLeadStatus, LeadStatus> = {
  hot: LeadStatus.HOT,
  warm: LeadStatus.WARM,
  cold: LeadStatus.COLD
};

const statusFromPrisma: Record<LeadStatus, ApiLeadStatus> = {
  [LeadStatus.HOT]: "hot",
  [LeadStatus.WARM]: "warm",
  [LeadStatus.COLD]: "cold"
};

const stageToPrisma: Record<ApiLeadStage, LeadStage> = {
  "initial-contact": LeadStage.INITIAL_CONTACT,
  consultation: LeadStage.CONSULTATION,
  proposal: LeadStage.PROPOSAL,
  negotiation: LeadStage.NEGOTIATION,
  "closed-won": LeadStage.CLOSED_WON
};

const stageFromPrisma: Record<LeadStage, ApiLeadStage> = {
  [LeadStage.INITIAL_CONTACT]: "initial-contact",
  [LeadStage.CONSULTATION]: "consultation",
  [LeadStage.PROPOSAL]: "proposal",
  [LeadStage.NEGOTIATION]: "negotiation",
  [LeadStage.CLOSED_WON]: "closed-won"
};

export const leadListQuerySchema = z.object({
  status: z.enum(leadStatusValues).optional(),
  stage: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100)
});

export const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  source: z.string().trim().max(80).optional(),
  status: z.enum(leadStatusValues).default("warm"),
  stage: z.string().trim().min(1).max(80).default("initial-contact"),
  location: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional()
});

export const leadStageTransitionSchema = z.object({
  stage: z.string().trim().min(1).max(80)
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

interface LeadRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  stage: LeadStage;
  crmStageSlug?: string | null;
  location: string | null;
  notes: string | null;
  lastContactAt: Date | string | null;
  daysInStage: number;
}

export function toPrismaLeadStage(stage: ApiLeadStage) {
  return stageToPrisma[stage];
}

export function isApiLeadStage(stage: string): stage is ApiLeadStage {
  return leadStageValues.includes(stage as ApiLeadStage);
}

export function toPrismaLeadStatus(status: ApiLeadStatus) {
  return statusToPrisma[status];
}

export function buildLeadWhere(organizationId: string, query: LeadListQuery) {
  return {
    organizationId,
    deletedAt: null,
    ...(query.status ? { status: toPrismaLeadStatus(query.status) } : {}),
    ...(query.stage
      ? isApiLeadStage(query.stage)
        ? { stage: toPrismaLeadStage(query.stage), crmStageSlug: null }
        : { crmStageSlug: query.stage }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
            { location: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

export function serializeLead(record: LeadRecord): Lead {
  return {
    id: record.id,
    name: record.name,
    email: record.email || "",
    phone: record.phone || "",
    source: record.source || "Unknown",
    lastContact: formatRelativeContact(record.lastContactAt),
    notes: record.notes || "",
    location: record.location || "Unknown",
    status: statusFromPrisma[record.status],
    stage: record.crmStageSlug || stageFromPrisma[record.stage],
    daysInStage: record.daysInStage,
    initials: getInitials(record.name),
    applicationResponses: parseApplicationResponses(record.notes)
  };
}

export function getLeadCreateData(
  organizationId: string,
  input: CreateLeadInput,
  stageData = getLeadStageData(input.stage)
) {
  return {
    organizationId,
    name: input.name,
    email: input.email?.toLowerCase(),
    phone: input.phone,
    source: input.source,
    status: toPrismaLeadStatus(input.status),
    ...stageData,
    location: input.location,
    notes: input.notes,
    lastContactAt: new Date(),
    daysInStage: 0
  };
}

export function getLeadStageData(stage: string) {
  if (isApiLeadStage(stage)) {
    return {
      stage: toPrismaLeadStage(stage),
      crmStageSlug: null
    };
  }

  return {
    stage: LeadStage.INITIAL_CONTACT,
    crmStageSlug: stage
  };
}

export function shouldResolveCustomStage(stage: string) {
  return !isApiLeadStage(stage) && !isDefaultCrmStage(stage);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function formatRelativeContact(value: Date | string | null) {
  if (!value) {
    return "Not contacted";
  }

  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "1 day ago";
  }

  return `${diffDays} days ago`;
}

function parseApplicationResponses(notes: string | null) {
  if (!notes?.trim()) {
    return [];
  }

  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return { question: line, answer: "" };
      }

      return {
        question: line.slice(0, separatorIndex).trim(),
        answer: line.slice(separatorIndex + 1).trim()
      };
    });
}
