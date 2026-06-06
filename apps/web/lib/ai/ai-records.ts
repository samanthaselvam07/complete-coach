import { z } from "zod";

import {
  AiGenerationStatus,
  AiOutputStatus,
  AiOutputType,
  AiWorkflowType
} from "@/app/generated/prisma/enums";
import type { AiReviewOutputDraft } from "@/lib/ai/ai-review";

export const aiRecommendationStatusValues = [
  "pending-approval",
  "approved",
  "rejected",
  "applied",
  "discarded"
] as const;

export const aiRecommendationsQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  targetType: z.string().min(1).max(80).optional(),
  targetId: z.string().min(1).optional(),
  status: z.enum(aiRecommendationStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const aiUsageQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export const rejectRecommendationSchema = z.object({
  reason: z.string().trim().min(1).max(1000)
});

export const CHFI_CHECK_IN_PROMPT = {
  workflow: AiWorkflowType.CHECK_IN_REVIEW,
  version: "chfi-17-step-v1",
  name: "CHFI 17-step weekly check-in review",
  provider: "complete-coach",
  model: "heuristic-v1",
  systemPrompt:
    "Generate a concise weekly fitness review using the CHFI 17-step check-in review method. Use only supplied client data. Flag injury, fatigue, stress, nutrition, measurement, and progression risks. Do not send client-facing recommendations without human approval.",
  userPromptTemplate:
    "Review the minimized check-in payload and return five sections: Weight / Waist, Training & Progression, Fatigue / Recovery, Nutrition, Goals for Next Week.",
  outputSchema: {
    type: "object",
    required: ["summaryMarkdown", "flags", "outputs"]
  }
} as const;

const outputTypeToPrisma: Record<AiReviewOutputDraft["type"], AiOutputType> = {
  "check-in-summary": AiOutputType.CHECK_IN_SUMMARY,
  "risk-flag": AiOutputType.RISK_FLAG,
  "workout-suggestion": AiOutputType.WORKOUT_SUGGESTION,
  "nutrition-suggestion": AiOutputType.NUTRITION_SUGGESTION,
  "message-draft": AiOutputType.MESSAGE_DRAFT,
  "resource-recommendation": AiOutputType.RESOURCE_RECOMMENDATION,
  "extraction-enhancement": AiOutputType.EXTRACTION_ENHANCEMENT
};

const outputTypeFromPrisma: Record<AiOutputType, AiReviewOutputDraft["type"]> = {
  [AiOutputType.CHECK_IN_SUMMARY]: "check-in-summary",
  [AiOutputType.RISK_FLAG]: "risk-flag",
  [AiOutputType.WORKOUT_SUGGESTION]: "workout-suggestion",
  [AiOutputType.NUTRITION_SUGGESTION]: "nutrition-suggestion",
  [AiOutputType.MESSAGE_DRAFT]: "message-draft",
  [AiOutputType.RESOURCE_RECOMMENDATION]: "resource-recommendation",
  [AiOutputType.EXTRACTION_ENHANCEMENT]: "extraction-enhancement"
};

const outputStatusToPrisma: Record<(typeof aiRecommendationStatusValues)[number], AiOutputStatus> = {
  "pending-approval": AiOutputStatus.PENDING_APPROVAL,
  approved: AiOutputStatus.APPROVED,
  rejected: AiOutputStatus.REJECTED,
  applied: AiOutputStatus.APPLIED,
  discarded: AiOutputStatus.DISCARDED
};

const outputStatusFromPrisma: Record<AiOutputStatus, (typeof aiRecommendationStatusValues)[number]> = {
  [AiOutputStatus.PENDING_APPROVAL]: "pending-approval",
  [AiOutputStatus.APPROVED]: "approved",
  [AiOutputStatus.REJECTED]: "rejected",
  [AiOutputStatus.APPLIED]: "applied",
  [AiOutputStatus.DISCARDED]: "discarded"
};

const generationStatusFromPrisma: Record<AiGenerationStatus, string> = {
  [AiGenerationStatus.RUNNING]: "running",
  [AiGenerationStatus.SUCCEEDED]: "succeeded",
  [AiGenerationStatus.FAILED]: "failed"
};

interface AiGenerationRecord {
  id: string;
  workflow: AiWorkflowType | string;
  status: AiGenerationStatus | string;
  provider: string;
  model: string;
  clientId: string | null;
  targetType: string | null;
  targetId: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number | string | { toString: () => string };
  promptVersionId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface AiOutputRecord {
  id: string;
  generationId: string;
  clientId: string | null;
  targetType: string | null;
  targetId: string | null;
  type: AiOutputType | string;
  status: AiOutputStatus | string;
  severity: string | null;
  title: string;
  contentMarkdown: string;
  dataJson: unknown;
  requiresApproval: boolean;
  approvedByUserId: string | null;
  approvedAt: Date | string | null;
  rejectedByUserId: string | null;
  rejectedAt: Date | string | null;
  rejectionReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  generation?: AiGenerationRecord | null;
}

export function toPrismaAiOutputType(type: AiReviewOutputDraft["type"]) {
  return outputTypeToPrisma[type];
}

export function toPrismaAiOutputStatus(status: (typeof aiRecommendationStatusValues)[number]) {
  return outputStatusToPrisma[status];
}

export function serializeAiGeneration(record: AiGenerationRecord) {
  return {
    id: record.id,
    workflow: serializeWorkflow(record.workflow),
    status: generationStatusFromPrisma[record.status as AiGenerationStatus] ?? record.status,
    provider: record.provider,
    model: record.model,
    promptVersionId: record.promptVersionId,
    clientId: record.clientId,
    targetType: record.targetType,
    targetId: record.targetId,
    usage: {
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      estimatedCostCents: Number(record.estimatedCostCents)
    },
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeAiOutput(record: AiOutputRecord) {
  return {
    id: record.id,
    generationId: record.generationId,
    clientId: record.clientId,
    targetType: record.targetType,
    targetId: record.targetId,
    type: outputTypeFromPrisma[record.type as AiOutputType] ?? record.type,
    status: outputStatusFromPrisma[record.status as AiOutputStatus] ?? record.status,
    severity: record.severity,
    title: record.title,
    contentMarkdown: record.contentMarkdown,
    data: record.dataJson,
    requiresApproval: record.requiresApproval,
    approvedByUserId: record.approvedByUserId,
    approvedAt: record.approvedAt ? toIsoString(record.approvedAt) : null,
    rejectedByUserId: record.rejectedByUserId,
    rejectedAt: record.rejectedAt ? toIsoString(record.rejectedAt) : null,
    rejectionReason: record.rejectionReason,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    ...(record.generation ? { generation: serializeAiGeneration(record.generation) } : {})
  };
}

function serializeWorkflow(workflow: AiWorkflowType | string) {
  const workflows: Record<AiWorkflowType, string> = {
    [AiWorkflowType.CHECK_IN_REVIEW]: "check-in-review",
    [AiWorkflowType.MESSAGE_DRAFT]: "message-draft",
    [AiWorkflowType.RESOURCE_RECOMMENDATION]: "resource-recommendation",
    [AiWorkflowType.EXTRACTION_ENHANCEMENT]: "extraction-enhancement"
  };

  return workflows[workflow as AiWorkflowType] ?? workflow;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
