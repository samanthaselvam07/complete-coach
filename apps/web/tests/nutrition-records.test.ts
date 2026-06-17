import { describe, expect, it } from "vitest";

import {
  LibraryScope,
  MealPlanAssignmentStatus,
  MealPlanTemplateStatus
} from "@/app/generated/prisma/enums";
import {
  buildMealPlanAssignmentSnapshot,
  buildFoodWhere,
  buildMealPlanTemplateWhere,
  createMealPlanTemplateSchema,
  createFoodSchema,
  getFoodCreateData,
  getMealPlanTemplateCreateData,
  serializeFood,
  serializeMealPlanAssignment,
  serializeMealPlanTemplate,
  toPrismaFoodLibraryScope,
  toPrismaMealPlanTemplateStatus
} from "@/lib/nutrition/nutrition-records";

const mealTemplateJson = {
  days: [
    {
      name: "Training Day",
      meals: [
        {
          meal: "Breakfast",
          foods: [
            {
              foodId: "food_1",
              foodName: "Chicken Breast",
              servingSize: "100g",
              calories: 165,
              proteinGrams: 31,
              carbsGrams: 0,
              fatGrams: 3.6
            }
          ]
        }
      ]
    }
  ]
};

describe("nutrition record mappers", () => {
  it("maps public food scope values to Prisma enums", () => {
    expect(toPrismaFoodLibraryScope("global")).toBe(LibraryScope.GLOBAL);
    expect(toPrismaFoodLibraryScope("private")).toBe(LibraryScope.PRIVATE);
    expect(toPrismaMealPlanTemplateStatus("draft")).toBe(MealPlanTemplateStatus.DRAFT);
    expect(toPrismaMealPlanTemplateStatus("published")).toBe(MealPlanTemplateStatus.PUBLISHED);
    expect(toPrismaMealPlanTemplateStatus("archived")).toBe(MealPlanTemplateStatus.ARCHIVED);
  });

  it("builds scoped food filters with optional facets", () => {
    expect(buildFoodWhere("org_1", { limit: 50, sort: "name" })).toMatchObject({
      deletedAt: null,
      OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
    });

    expect(
      buildFoodWhere("org_1", {
        scope: "private",
        category: "Proteins",
        search: "chicken",
        limit: 100,
        sort: "name"
      })
    ).toMatchObject({
      scope: LibraryScope.PRIVATE,
      category: "Proteins",
      AND: [
        {
          OR: [
            { name: { contains: "chicken", mode: "insensitive" } },
            { category: { contains: "chicken", mode: "insensitive" } },
            { servingSize: { contains: "chicken", mode: "insensitive" } }
          ]
        }
      ]
    });
  });

  it("builds meal template filters and create payloads", () => {
    expect(buildMealPlanTemplateWhere("org_1", { limit: 50 })).toEqual({
      organizationId: "org_1",
      deletedAt: null
    });

    expect(buildMealPlanTemplateWhere("org_1", { status: "published", limit: 50 })).toMatchObject({
      status: MealPlanTemplateStatus.PUBLISHED
    });

    const input = createMealPlanTemplateSchema.parse({
      name: "Hypertrophy Meal Plan",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: "published",
      template: mealTemplateJson
    });

    expect(getMealPlanTemplateCreateData("org_1", "user_1", input)).toMatchObject({
      organizationId: "org_1",
      createdByUserId: "user_1",
      status: MealPlanTemplateStatus.PUBLISHED,
      templateJson: mealTemplateJson
    });
  });

  it("normalizes food create payloads", () => {
    const input = createFoodSchema.parse({
      name: "Chicken Breast",
      category: "Proteins",
      servingSize: "100g, Boneless",
      calories: 165,
      proteinGrams: 31,
      carbsGrams: 0,
      fatGrams: 3.6,
      fiberGrams: 0,
      metadata: { source: "coach" }
    });

    expect(getFoodCreateData("org_1", "user_1", input)).toMatchObject({
      organizationId: "org_1",
      createdByUserId: "user_1",
      scope: LibraryScope.PRIVATE,
      name: "Chicken Breast",
      proteinGrams: 31,
      metadataJson: { source: "coach" }
    });
  });

  it("serializes foods across global/private and nullable branches", () => {
    expect(
      serializeFood({
        id: "food_global",
        organizationId: null,
        scope: LibraryScope.GLOBAL,
        name: "Basmati Rice",
        category: "Carbs",
        servingSize: "100g, Long Grain",
        calories: 121,
        proteinGrams: "3.00",
        carbsGrams: "25.00",
        fatGrams: "0.40",
        fiberGrams: null,
        metadataJson: null,
        createdAt: new Date("2026-05-18T00:00:00.000Z"),
        updatedAt: "2026-05-18T01:00:00.000Z"
      })
    ).toMatchObject({
      id: "food_global",
      organizationId: null,
      scope: "global",
      proteinGrams: 3,
      carbsGrams: 25,
      fatGrams: 0.4,
      fiberGrams: null,
      metadata: null,
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T01:00:00.000Z"
    });
  });

  it("serializes meal templates and assignment snapshots", () => {
    const templateRecord = {
      id: "meal_template_1",
      organizationId: "org_1",
      name: "Hypertrophy Meal Plan",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: "210.00",
      carbsGrams: "280.00",
      fatGrams: "93.00",
      status: MealPlanTemplateStatus.PUBLISHED,
      templateJson: mealTemplateJson,
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      updatedAt: new Date("2026-05-18T01:00:00.000Z")
    };

    expect(serializeMealPlanTemplate(templateRecord)).toMatchObject({
      id: "meal_template_1",
      status: "published",
      targetCalories: 2800,
      proteinGrams: 210,
      template: mealTemplateJson
    });

    expect(buildMealPlanAssignmentSnapshot(templateRecord)).toMatchObject({
      templateId: "meal_template_1",
      templateName: "Hypertrophy Meal Plan",
      targetCalories: 2800,
      proteinGrams: 210,
      template: mealTemplateJson
    });
  });

  it("serializes meal assignments with client names and date strings", () => {
    expect(
      serializeMealPlanAssignment({
        id: "meal_assignment_1",
        organizationId: "org_1",
        clientId: "client_1",
        templateId: "meal_template_1",
        name: "Hypertrophy Meal Plan",
        phase: "Hypertrophy",
        targetCalories: 2800,
        proteinGrams: "210.00",
        carbsGrams: "280.00",
        fatGrams: "93.00",
        status: MealPlanAssignmentStatus.ACTIVE,
        snapshotJson: { templateName: "Hypertrophy Meal Plan" },
        startsOn: new Date("2026-05-18T00:00:00.000Z"),
        endsOn: null,
        createdAt: new Date("2026-05-18T00:00:00.000Z"),
        updatedAt: new Date("2026-05-18T01:00:00.000Z"),
        client: {
          firstName: "Api",
          lastName: "Client"
        }
      })
    ).toMatchObject({
      id: "meal_assignment_1",
      clientName: "Api Client",
      status: "active",
      startsOn: "2026-05-18",
      endsOn: null
    });
  });

  it("serializes nullable meal template and assignment branches", () => {
    expect(
      buildMealPlanAssignmentSnapshot({
        id: "meal_template_nullable",
        organizationId: "org_1",
        name: "Nullable Macro Plan",
        phase: null,
        targetCalories: 2000,
        proteinGrams: null,
        carbsGrams: undefined,
        fatGrams: "55.00",
        status: MealPlanTemplateStatus.DRAFT,
        templateJson: mealTemplateJson,
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T01:00:00.000Z"
      })
    ).toMatchObject({
      phase: null,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 55
    });

    expect(
      serializeMealPlanTemplate({
        id: "meal_template_nullable",
        organizationId: "org_1",
        name: "Nullable Macro Plan",
        phase: null,
        targetCalories: 2000,
        proteinGrams: null,
        carbsGrams: undefined,
        fatGrams: "55.00",
        status: MealPlanTemplateStatus.DRAFT,
        templateJson: mealTemplateJson,
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T01:00:00.000Z"
      })
    ).toMatchObject({
      phase: null,
      status: "draft",
      proteinGrams: 0,
      carbsGrams: 0,
      createdAt: "2026-05-18T00:00:00.000Z"
    });

    expect(
      serializeMealPlanAssignment({
        id: "meal_assignment_nullable",
        organizationId: "org_1",
        clientId: "client_1",
        templateId: null,
        name: "Manual Meal Plan",
        phase: null,
        targetCalories: 2000,
        proteinGrams: null,
        carbsGrams: undefined,
        fatGrams: "55.00",
        status: MealPlanAssignmentStatus.PAUSED,
        snapshotJson: {},
        startsOn: "2026-05-18T00:00:00.000Z",
        endsOn: "2026-05-25T00:00:00.000Z",
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T01:00:00.000Z",
        client: undefined
      })
    ).toMatchObject({
      clientName: null,
      status: "paused",
      proteinGrams: 0,
      carbsGrams: 0,
      startsOn: "2026-05-18",
      endsOn: "2026-05-25"
    });
  });
});
