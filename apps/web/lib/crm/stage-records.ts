import { z } from "zod";

import { LeadStage } from "@/app/generated/prisma/enums";
import type { LeadStage as ClientLeadStage } from "@/lib/crm/lead-models";

export const crmStageColorValues = ["gray", "blue", "purple", "yellow", "green", "orange", "red"] as const;

export type CrmStageColor = (typeof crmStageColorValues)[number];

export const defaultCrmStages = [
  { id: "initial-contact", title: "Initial Contact", color: "gray", defaultStage: LeadStage.INITIAL_CONTACT },
  { id: "consultation", title: "Consultation Scheduled", color: "blue", defaultStage: LeadStage.CONSULTATION },
  { id: "proposal", title: "Proposal Sent", color: "purple", defaultStage: LeadStage.PROPOSAL },
  { id: "negotiation", title: "In Negotiation", color: "yellow", defaultStage: LeadStage.NEGOTIATION },
  { id: "closed-won", title: "Closed - Won", color: "green", defaultStage: LeadStage.CLOSED_WON }
] satisfies Array<ClientLeadStage & { defaultStage: LeadStage }>;

export const defaultCrmStageIds = defaultCrmStages.map((stage) => stage.id);

const defaultStageBySlug = new Map(defaultCrmStages.map((stage) => [stage.id, stage.defaultStage]));

export const saveCrmStagesSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
        title: z.string().trim().min(1).max(80),
        color: z.enum(crmStageColorValues),
        position: z.number().int().min(0).optional()
      })
    )
    .min(1)
    .max(12)
});

export interface CrmStageRecord {
  slug: string;
  title: string;
  color: string;
  position: number;
  defaultStage: LeadStage | null;
}

export function serializeCrmStage(record: CrmStageRecord): ClientLeadStage {
  return {
    id: record.slug,
    title: record.title,
    color: isCrmStageColor(record.color) ? record.color : "gray"
  };
}

export function getDefaultCrmStages(): ClientLeadStage[] {
  return defaultCrmStages.map(({ id, title, color }) => ({ id, title, color }));
}

export function getDefaultStageForSlug(slug: string) {
  return defaultStageBySlug.get(slug) ?? null;
}

export function isDefaultCrmStage(slug: string) {
  return defaultStageBySlug.has(slug);
}

export function isCrmStageColor(value: string): value is CrmStageColor {
  return crmStageColorValues.includes(value as CrmStageColor);
}

export function createCrmStageSlug(title: string, existingSlugs: Set<string>) {
  const baseSlug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "stage";
  let slug = baseSlug;
  let suffix = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
