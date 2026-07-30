import { z } from "zod";

import { ClientAccountActivityType } from "@/app/generated/prisma/enums";

export const clientAccountActivityTypeValues = [
  "training-plan-updated",
  "nutrition-plan-updated",
  "supplement-plan-updated",
  "billing-started",
  "billing-paused",
  "billing-failed",
  "billing-cancelled",
  "client-goal-created",
  "client-profile-target-updated"
] as const;

type ApiClientAccountActivityType = (typeof clientAccountActivityTypeValues)[number];

const activityTypeToPrisma: Record<ApiClientAccountActivityType, ClientAccountActivityType> = {
  "training-plan-updated": ClientAccountActivityType.TRAINING_PLAN_UPDATED,
  "nutrition-plan-updated": ClientAccountActivityType.NUTRITION_PLAN_UPDATED,
  "supplement-plan-updated": ClientAccountActivityType.SUPPLEMENT_PLAN_UPDATED,
  "billing-started": ClientAccountActivityType.BILLING_STARTED,
  "billing-paused": ClientAccountActivityType.BILLING_PAUSED,
  "billing-failed": ClientAccountActivityType.BILLING_FAILED,
  "billing-cancelled": ClientAccountActivityType.BILLING_CANCELLED,
  "client-goal-created": ClientAccountActivityType.CLIENT_GOAL_CREATED,
  "client-profile-target-updated": ClientAccountActivityType.CLIENT_PROFILE_TARGET_UPDATED
};

const activityTypeFromPrisma: Record<ClientAccountActivityType, ApiClientAccountActivityType> = {
  [ClientAccountActivityType.TRAINING_PLAN_UPDATED]: "training-plan-updated",
  [ClientAccountActivityType.NUTRITION_PLAN_UPDATED]: "nutrition-plan-updated",
  [ClientAccountActivityType.SUPPLEMENT_PLAN_UPDATED]: "supplement-plan-updated",
  [ClientAccountActivityType.BILLING_STARTED]: "billing-started",
  [ClientAccountActivityType.BILLING_PAUSED]: "billing-paused",
  [ClientAccountActivityType.BILLING_FAILED]: "billing-failed",
  [ClientAccountActivityType.BILLING_CANCELLED]: "billing-cancelled",
  [ClientAccountActivityType.CLIENT_GOAL_CREATED]: "client-goal-created",
  [ClientAccountActivityType.CLIENT_PROFILE_TARGET_UPDATED]: "client-profile-target-updated"
};

export const clientGoalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const createClientGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetDate: z.string().date(),
  notes: z.string().trim().max(5000).optional().default(""),
  roadmapPhaseId: z.string().trim().min(1).nullable().optional()
});

export const clientAccountActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const createClientAccountActivitySchema = z.object({
  type: z.enum(clientAccountActivityTypeValues),
  title: z.string().trim().min(1).max(240),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export interface ClientGoalRecord {
  id: string;
  clientId: string;
  roadmapPhaseId: string | null;
  title: string;
  targetDate: Date | string;
  notes: string | null;
  createdAt: Date | string;
  roadmapPhase?: {
    id: string;
    name: string;
  } | null;
}

export interface ClientAccountActivityRecord {
  id: string;
  clientId: string;
  type: ClientAccountActivityType;
  title: string;
  occurredAt: Date | string;
  metadata: unknown;
  actor?: {
    name: string | null;
    email: string | null;
  } | null;
}

export function toPrismaClientAccountActivityType(type: ApiClientAccountActivityType) {
  return activityTypeToPrisma[type];
}

export function serializeClientGoal(goal: ClientGoalRecord) {
  return {
    id: goal.id,
    clientId: goal.clientId,
    title: goal.title,
    targetDate: toDateValue(goal.targetDate),
    notes: goal.notes ?? "",
    roadmapPhaseId: goal.roadmapPhaseId,
    roadmapPhaseName: goal.roadmapPhase?.name ?? null,
    daysRemaining: getDaysRemaining(goal.targetDate),
    createdAt: toIsoString(goal.createdAt)
  };
}

export function serializeClientAccountActivity(activity: ClientAccountActivityRecord) {
  return {
    id: activity.id,
    clientId: activity.clientId,
    type: activityTypeFromPrisma[activity.type],
    title: activity.title,
    occurredAt: toIsoString(activity.occurredAt),
    metadata: activity.metadata,
    actorName: activity.actor?.name ?? activity.actor?.email ?? null
  };
}

export function toClientGoalDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getDaysRemaining(value: Date | string, today = new Date()) {
  const target = new Date(`${toDateValue(value)}T00:00:00.000Z`);
  const current = new Date(`${toDateValue(today)}T00:00:00.000Z`);

  return Math.ceil((target.getTime() - current.getTime()) / 86_400_000);
}

function toDateValue(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
