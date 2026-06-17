import { z } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";

import {
  LibraryScope,
  MealPlanAssignmentStatus,
  MealPlanTemplateStatus
} from "@/app/generated/prisma/enums";

export const foodLibraryScopeValues = ["global", "private"] as const;
export const mealPlanTemplateStatusValues = ["draft", "published", "archived"] as const;
export type ApiFoodLibraryScope = (typeof foodLibraryScopeValues)[number];
export type ApiMealPlanTemplateStatus = (typeof mealPlanTemplateStatusValues)[number];

const foodLibraryScopeToPrisma: Record<ApiFoodLibraryScope, LibraryScope> = {
  global: LibraryScope.GLOBAL,
  private: LibraryScope.PRIVATE
};

const foodLibraryScopeFromPrisma: Record<LibraryScope, ApiFoodLibraryScope> = {
  [LibraryScope.GLOBAL]: "global",
  [LibraryScope.PRIVATE]: "private"
};

const mealPlanTemplateStatusToPrisma: Record<ApiMealPlanTemplateStatus, MealPlanTemplateStatus> = {
  draft: MealPlanTemplateStatus.DRAFT,
  published: MealPlanTemplateStatus.PUBLISHED,
  archived: MealPlanTemplateStatus.ARCHIVED
};

const mealPlanTemplateStatusFromPrisma: Record<MealPlanTemplateStatus, ApiMealPlanTemplateStatus> = {
  [MealPlanTemplateStatus.DRAFT]: "draft",
  [MealPlanTemplateStatus.PUBLISHED]: "published",
  [MealPlanTemplateStatus.ARCHIVED]: "archived"
};

const mealPlanAssignmentStatusFromPrisma: Record<
  MealPlanAssignmentStatus,
  "active" | "paused" | "completed" | "cancelled"
> = {
  [MealPlanAssignmentStatus.ACTIVE]: "active",
  [MealPlanAssignmentStatus.PAUSED]: "paused",
  [MealPlanAssignmentStatus.COMPLETED]: "completed",
  [MealPlanAssignmentStatus.CANCELLED]: "cancelled"
};

export const foodListQuerySchema = z.object({
  scope: z.enum(foodLibraryScopeValues).optional(),
  category: z.string().trim().max(80).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  servingSize: z.string().trim().min(1).max(120),
  calories: z.number().int().min(0).max(20_000),
  proteinGrams: z.number().min(0).max(5_000),
  carbsGrams: z.number().min(0).max(5_000),
  fatGrams: z.number().min(0).max(5_000),
  fiberGrams: z.number().min(0).max(1_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const updateFoodSchema = createFoodSchema.partial().refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required."
});

export const mealPlanTemplateListQuerySchema = z.object({
  status: z.enum(mealPlanTemplateStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const mealPlanItemSchema = z.object({
  meal: z.string().trim().min(1).max(120),
  foods: z
    .array(
      z.object({
        foodId: z.string().min(1).optional(),
        foodName: z.string().trim().min(1).max(160),
        servingSize: z.string().trim().min(1).max(120),
        calories: z.number().int().min(0).max(20_000),
        proteinGrams: z.number().min(0).max(5_000),
        carbsGrams: z.number().min(0).max(5_000),
        fatGrams: z.number().min(0).max(5_000),
        fiberGrams: z.number().min(0).max(1_000).optional(),
        quantity: z.number().min(0).max(10_000).optional(),
        measurementUnit: z.string().trim().max(40).optional(),
        micronutrients: z.record(z.string(), z.number()).optional()
      })
    )
    .max(30)
});

export const mealPlanTemplateSchema = z.object({
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        meals: z.array(mealPlanItemSchema).min(1).max(12)
      })
    )
    .min(1)
    .max(14)
});

export const createMealPlanTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phase: z.string().trim().max(120).optional(),
  targetCalories: z.number().int().min(0).max(20_000),
  proteinGrams: z.number().min(0).max(5_000),
  carbsGrams: z.number().min(0).max(5_000),
  fatGrams: z.number().min(0).max(5_000),
  status: z.enum(mealPlanTemplateStatusValues).default("draft"),
  template: mealPlanTemplateSchema
});

export const updateMealPlanTemplateSchema = createMealPlanTemplateSchema.partial().refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required."
});

export const createMealPlanAssignmentSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().trim().max(160).optional(),
  startsOn: z.string().date(),
  endsOn: z.string().date().optional()
});

export type FoodListQuery = z.infer<typeof foodListQuerySchema>;
export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;
export type MealPlanTemplateListQuery = z.infer<typeof mealPlanTemplateListQuerySchema>;
export type CreateMealPlanTemplateInput = z.infer<typeof createMealPlanTemplateSchema>;
export type UpdateMealPlanTemplateInput = z.infer<typeof updateMealPlanTemplateSchema>;

interface FoodRecord {
  id: string;
  organizationId: string | null;
  scope: LibraryScope;
  name: string;
  category: string;
  servingSize: string;
  calories: number;
  proteinGrams: unknown;
  carbsGrams: unknown;
  fatGrams: unknown;
  fiberGrams: unknown;
  metadataJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface MealPlanTemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  phase: string | null;
  targetCalories: number;
  proteinGrams: unknown;
  carbsGrams: unknown;
  fatGrams: unknown;
  status: MealPlanTemplateStatus;
  templateJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface MealPlanAssignmentRecord {
  id: string;
  organizationId: string;
  clientId: string;
  templateId: string | null;
  name: string;
  phase: string | null;
  targetCalories: number;
  proteinGrams: unknown;
  carbsGrams: unknown;
  fatGrams: unknown;
  status: MealPlanAssignmentStatus;
  snapshotJson: unknown;
  startsOn: Date | string;
  endsOn: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: {
    firstName: string;
    lastName: string;
  };
}

export function toPrismaFoodLibraryScope(scope: ApiFoodLibraryScope) {
  return foodLibraryScopeToPrisma[scope];
}

export function toPrismaMealPlanTemplateStatus(status: ApiMealPlanTemplateStatus) {
  return mealPlanTemplateStatusToPrisma[status];
}

export function buildFoodWhere(organizationId: string, query: FoodListQuery) {
  return {
    deletedAt: null,
    OR: [{ scope: LibraryScope.GLOBAL }, { organizationId }],
    ...(query.scope ? { scope: toPrismaFoodLibraryScope(query.scope) } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          AND: [
            {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { category: { contains: query.search, mode: "insensitive" as const } },
                { servingSize: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          ]
        }
      : {})
  };
}

export function getFoodCreateData(organizationId: string, userId: string, input: CreateFoodInput) {
  return {
    organizationId,
    createdByUserId: userId,
    scope: LibraryScope.PRIVATE,
    name: input.name,
    category: input.category,
    servingSize: input.servingSize,
    calories: input.calories,
    proteinGrams: input.proteinGrams,
    carbsGrams: input.carbsGrams,
    fatGrams: input.fatGrams,
    fiberGrams: input.fiberGrams,
    metadataJson: input.metadata as InputJsonValue | undefined
  };
}

export function getFoodUpdateData(input: UpdateFoodInput) {
  return {
    ...(input.name ? { name: input.name } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.servingSize ? { servingSize: input.servingSize } : {}),
    ...(input.calories !== undefined ? { calories: input.calories } : {}),
    ...(input.proteinGrams !== undefined ? { proteinGrams: input.proteinGrams } : {}),
    ...(input.carbsGrams !== undefined ? { carbsGrams: input.carbsGrams } : {}),
    ...(input.fatGrams !== undefined ? { fatGrams: input.fatGrams } : {}),
    ...(input.fiberGrams !== undefined ? { fiberGrams: input.fiberGrams } : {}),
    ...(input.metadata !== undefined ? { metadataJson: input.metadata as InputJsonValue } : {})
  };
}

export function buildMealPlanTemplateWhere(organizationId: string, query: MealPlanTemplateListQuery) {
  return {
    organizationId,
    deletedAt: null,
    ...(query.status ? { status: toPrismaMealPlanTemplateStatus(query.status) } : {})
  };
}

export function getMealPlanTemplateCreateData(
  organizationId: string,
  userId: string,
  input: CreateMealPlanTemplateInput
) {
  return {
    organizationId,
    createdByUserId: userId,
    name: input.name,
    phase: input.phase,
    targetCalories: input.targetCalories,
    proteinGrams: input.proteinGrams,
    carbsGrams: input.carbsGrams,
    fatGrams: input.fatGrams,
    status: toPrismaMealPlanTemplateStatus(input.status),
    templateJson: input.template as InputJsonValue
  };
}

export function getMealPlanTemplateUpdateData(input: UpdateMealPlanTemplateInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.phase !== undefined ? { phase: input.phase } : {}),
    ...(input.targetCalories !== undefined ? { targetCalories: input.targetCalories } : {}),
    ...(input.proteinGrams !== undefined ? { proteinGrams: input.proteinGrams } : {}),
    ...(input.carbsGrams !== undefined ? { carbsGrams: input.carbsGrams } : {}),
    ...(input.fatGrams !== undefined ? { fatGrams: input.fatGrams } : {}),
    ...(input.status !== undefined ? { status: toPrismaMealPlanTemplateStatus(input.status) } : {}),
    ...(input.template !== undefined ? { templateJson: input.template as InputJsonValue } : {})
  };
}

export function buildMealPlanAssignmentSnapshot(template: MealPlanTemplateRecord) {
  return {
    templateId: template.id,
    templateName: template.name,
    phase: template.phase,
    targetCalories: template.targetCalories,
    proteinGrams: toNullableNumber(template.proteinGrams) ?? 0,
    carbsGrams: toNullableNumber(template.carbsGrams) ?? 0,
    fatGrams: toNullableNumber(template.fatGrams) ?? 0,
    template: template.templateJson
  };
}

export function serializeFood(record: FoodRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    scope: foodLibraryScopeFromPrisma[record.scope],
    name: record.name,
    category: record.category,
    servingSize: record.servingSize,
    calories: record.calories,
    proteinGrams: toNullableNumber(record.proteinGrams) ?? 0,
    carbsGrams: toNullableNumber(record.carbsGrams) ?? 0,
    fatGrams: toNullableNumber(record.fatGrams) ?? 0,
    fiberGrams: toNullableNumber(record.fiberGrams),
    metadata: record.metadataJson,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeMealPlanTemplate(record: MealPlanTemplateRecord) {
  return {
    id: record.id,
    name: record.name,
    phase: record.phase,
    targetCalories: record.targetCalories,
    proteinGrams: toNullableNumber(record.proteinGrams) ?? 0,
    carbsGrams: toNullableNumber(record.carbsGrams) ?? 0,
    fatGrams: toNullableNumber(record.fatGrams) ?? 0,
    status: mealPlanTemplateStatusFromPrisma[record.status],
    template: record.templateJson,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeMealPlanAssignment(record: MealPlanAssignmentRecord) {
  return {
    id: record.id,
    clientId: record.clientId,
    clientName: record.client ? `${record.client.firstName} ${record.client.lastName}` : null,
    templateId: record.templateId,
    name: record.name,
    phase: record.phase,
    targetCalories: record.targetCalories,
    proteinGrams: toNullableNumber(record.proteinGrams) ?? 0,
    carbsGrams: toNullableNumber(record.carbsGrams) ?? 0,
    fatGrams: toNullableNumber(record.fatGrams) ?? 0,
    status: mealPlanAssignmentStatusFromPrisma[record.status],
    snapshot: record.snapshotJson,
    startsOn: toDateString(record.startsOn),
    endsOn: record.endsOn ? toDateString(record.endsOn) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toDateString(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}
