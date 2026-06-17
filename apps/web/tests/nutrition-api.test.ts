import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LibraryScope,
  MealPlanAssignmentStatus,
  MealPlanTemplateStatus
} from "@/app/generated/prisma/enums";
import { GET as getFoods, POST as createFood } from "@/app/api/v1/foods/route";
import { GET as getFood, PATCH as updateFood } from "@/app/api/v1/foods/[foodId]/route";
import {
  GET as getMealPlanTemplates,
  POST as createMealPlanTemplate
} from "@/app/api/v1/meal-plan-templates/route";
import {
  DELETE as deleteMealPlanTemplate,
  PATCH as updateMealPlanTemplate
} from "@/app/api/v1/meal-plan-templates/[templateId]/route";
import {
  GET as getMealPlanAssignments,
  POST as createMealPlanAssignment
} from "@/app/api/v1/meal-plan-assignments/route";
import { GET as getClientMealPlans } from "@/app/api/v1/clients/[clientId]/meal-plans/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    foodLibraryItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    client: { findFirst: vi.fn() },
    mealPlanTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    mealPlanAssignment: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const globalFood = {
  id: "food_global",
  organizationId: null,
  scope: LibraryScope.GLOBAL,
  name: "Basmati Rice",
  category: "Carbs",
  servingSize: "100g, Long Grain",
  calories: 121,
  proteinGrams: 3,
  carbsGrams: 25,
  fatGrams: 0.4,
  fiberGrams: 0.4,
  metadataJson: { source: "global" },
  createdAt: new Date("2026-05-18T00:00:00.000Z"),
  updatedAt: new Date("2026-05-18T00:00:00.000Z")
};

const privateFood = {
  ...globalFood,
  id: "food_private",
  organizationId: "org_1",
  scope: LibraryScope.PRIVATE,
  name: "Coach Chicken Breast",
  category: "Proteins",
  servingSize: "100g, Boneless",
  calories: 165,
  proteinGrams: 31,
  carbsGrams: 0,
  fatGrams: 3.6,
  metadataJson: { source: "coach" }
};

const mealTemplateJson = {
  days: [
    {
      name: "Training Day",
      meals: [
        {
          meal: "Breakfast",
          foods: [
            {
              foodId: "food_private",
              foodName: "Coach Chicken Breast",
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

const mealTemplateRecord = {
  id: "meal_template_1",
  organizationId: "org_1",
  name: "Hypertrophy Meal Plan",
  phase: "Hypertrophy",
  targetCalories: 2800,
  proteinGrams: 210,
  carbsGrams: 280,
  fatGrams: 93,
  status: MealPlanTemplateStatus.PUBLISHED,
  templateJson: mealTemplateJson,
  createdAt: new Date("2026-05-18T00:00:00.000Z"),
  updatedAt: new Date("2026-05-18T00:00:00.000Z")
};

const mealAssignmentRecord = {
  id: "meal_assignment_1",
  organizationId: "org_1",
  clientId: "client_1",
  templateId: "meal_template_1",
  name: "Hypertrophy Meal Plan",
  phase: "Hypertrophy",
  targetCalories: 2800,
  proteinGrams: 210,
  carbsGrams: 280,
  fatGrams: 93,
  status: MealPlanAssignmentStatus.ACTIVE,
  snapshotJson: {
    templateId: "meal_template_1",
    templateName: "Hypertrophy Meal Plan",
    template: mealTemplateJson
  },
  startsOn: new Date("2026-05-18T00:00:00.000Z"),
  endsOn: null,
  createdAt: new Date("2026-05-18T00:00:00.000Z"),
  updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  client: {
    firstName: "Api",
    lastName: "Client"
  }
};

describe("nutrition persistence APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.foodLibraryItem.create.mockReset();
    mocks.prisma.foodLibraryItem.findMany.mockReset();
    mocks.prisma.foodLibraryItem.findFirst.mockReset();
    mocks.prisma.foodLibraryItem.update.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.mealPlanTemplate.create.mockReset();
    mocks.prisma.mealPlanTemplate.findMany.mockReset();
    mocks.prisma.mealPlanTemplate.findFirst.mockReset();
    mocks.prisma.mealPlanAssignment.create.mockReset();
    mocks.prisma.mealPlanAssignment.findMany.mockReset();
  });

  it("lists global and tenant private foods for the active organization", async () => {
    mocks.prisma.foodLibraryItem.findMany.mockResolvedValue([globalFood, privateFood]);

    const response = await getFoods(new Request("http://test.local/api/v1/foods?search=rice"));
    const payload = (await response.json()) as { data: Array<{ id: string; scope: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({ id: "food_global", scope: "global" }),
      expect.objectContaining({ id: "food_private", scope: "private" })
    ]);
    expect(mocks.prisma.foodLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
        })
      })
    );
  });

  it("allows large food library reads for imported databases", async () => {
    mocks.prisma.foodLibraryItem.findMany.mockResolvedValue([]);

    const response = await getFoods(new Request("http://test.local/api/v1/foods?limit=5000"));

    expect(response.status).toBe(200);
    expect(mocks.prisma.foodLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5000
      })
    );
  });

  it("filters foods by imported AUS/NZ source metadata", async () => {
    mocks.prisma.foodLibraryItem.findMany.mockResolvedValue([globalFood]);

    const response = await getFoods(new Request("http://test.local/api/v1/foods?source=AUS%2FNZ&search=kangaroo&limit=5000"));

    expect(response.status).toBe(200);
    expect(mocks.prisma.foodLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { metadataJson: { path: ["sourceId"], equals: "fsanz_ausnut" } },
                { metadataJson: { path: ["sourceId"], equals: "fsanz_branded" } }
              ])
            })
          ])
        }),
        take: 5000
      })
    );
  });

  it("creates private tenant foods and audit logs the write", async () => {
    mocks.prisma.foodLibraryItem.create.mockResolvedValue(privateFood);

    const response = await createFood(
      new Request("http://test.local/api/v1/foods", {
        method: "POST",
        body: JSON.stringify({
          name: "Coach Chicken Breast",
          category: "Proteins",
          servingSize: "100g, Boneless",
          calories: 165,
          proteinGrams: 31,
          carbsGrams: 0,
          fatGrams: 3.6,
          fiberGrams: 0
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; scope: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "food_private", scope: "private" }));
    expect(mocks.prisma.foodLibraryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          scope: LibraryScope.PRIVATE,
          createdByUserId: "user_1"
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "food.created" })
      })
    );
  });

  it("rejects invalid macro values before persistence", async () => {
    const response = await createFood(
      new Request("http://test.local/api/v1/foods", {
        method: "POST",
        body: JSON.stringify({
          name: "Impossible Macro Food",
          category: "Custom",
          servingSize: "100g",
          calories: -1,
          proteinGrams: 10,
          carbsGrams: 10,
          fatGrams: 10
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.foodLibraryItem.create).not.toHaveBeenCalled();
  });

  it("reads one global food through tenant-scoped access", async () => {
    mocks.prisma.foodLibraryItem.findFirst.mockResolvedValue(globalFood);

    const response = await getFood(new Request("http://test.local/api/v1/foods/food_global"), {
      params: Promise.resolve({ foodId: "food_global" })
    });
    const payload = (await response.json()) as { data: { id: string; scope: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ id: "food_global", scope: "global" }));
    expect(mocks.prisma.foodLibraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
        })
      })
    );
  });

  it("returns not found for inaccessible foods", async () => {
    mocks.prisma.foodLibraryItem.findFirst.mockResolvedValue(null);

    const response = await getFood(new Request("http://test.local/api/v1/foods/missing"), {
      params: Promise.resolve({ foodId: "missing" })
    });
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
  });

  it("updates only private tenant foods and audit logs the write", async () => {
    const updatedFood = {
      ...privateFood,
      name: "Updated Coach Chicken Breast",
      calories: 175,
      metadataJson: { source: "coach", verified: true }
    };
    mocks.prisma.foodLibraryItem.findFirst.mockResolvedValue(privateFood);
    mocks.prisma.foodLibraryItem.update.mockResolvedValue(updatedFood);

    const response = await updateFood(
      new Request("http://test.local/api/v1/foods/food_private", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Coach Chicken Breast",
          calories: 175,
          metadata: { source: "coach", verified: true }
        })
      }),
      { params: Promise.resolve({ foodId: "food_private" }) }
    );
    const payload = (await response.json()) as { data: { id: string; name: string; calories: number } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({ id: "food_private", name: "Updated Coach Chicken Breast", calories: 175 })
    );
    expect(mocks.prisma.foodLibraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "food_private",
          organizationId: "org_1",
          scope: LibraryScope.PRIVATE,
          deletedAt: null
        })
      })
    );
    expect(mocks.prisma.foodLibraryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "food_private" },
        data: expect.objectContaining({
          name: "Updated Coach Chicken Breast",
          calories: 175,
          metadataJson: { source: "coach", verified: true }
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "food.updated", targetId: "food_private" })
      })
    );
  });

  it("does not update global foods through tenant write access", async () => {
    mocks.prisma.foodLibraryItem.findFirst.mockResolvedValue(null);

    const response = await updateFood(
      new Request("http://test.local/api/v1/foods/food_global", {
        method: "PATCH",
        body: JSON.stringify({ name: "Tenant Override" })
      }),
      { params: Promise.resolve({ foodId: "food_global" }) }
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: "not_found", message: "Editable private food not found." });
    expect(mocks.prisma.foodLibraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "food_global",
          organizationId: "org_1",
          scope: LibraryScope.PRIVATE,
          deletedAt: null
        })
      })
    );
    expect(mocks.prisma.foodLibraryItem.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects empty food update payloads before persistence", async () => {
    const response = await updateFood(
      new Request("http://test.local/api/v1/foods/food_private", {
        method: "PATCH",
        body: JSON.stringify({})
      }),
      { params: Promise.resolve({ foodId: "food_private" }) }
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.foodLibraryItem.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.foodLibraryItem.update).not.toHaveBeenCalled();
  });

  it("creates and lists meal plan templates", async () => {
    mocks.prisma.mealPlanTemplate.create.mockResolvedValue(mealTemplateRecord);
    mocks.prisma.mealPlanTemplate.findMany.mockResolvedValue([mealTemplateRecord]);

    const createResponse = await createMealPlanTemplate(
      new Request("http://test.local/api/v1/meal-plan-templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Hypertrophy Meal Plan",
          phase: "Hypertrophy",
          targetCalories: 2800,
          proteinGrams: 210,
          carbsGrams: 280,
          fatGrams: 93,
          status: "published",
          template: mealTemplateJson
        })
      })
    );
    const listResponse = await getMealPlanTemplates(
      new Request("http://test.local/api/v1/meal-plan-templates?status=published")
    );
    const listPayload = (await listResponse.json()) as { data: Array<{ id: string; status: string }> };

    expect(createResponse.status).toBe(201);
    expect(listResponse.status).toBe(200);
    expect(listPayload.data).toEqual([expect.objectContaining({ id: "meal_template_1", status: "published" })]);
    expect(mocks.prisma.mealPlanTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          createdByUserId: "user_1",
          templateJson: mealTemplateJson
        })
      })
    );
  });

  it("updates an existing meal plan template in place", async () => {
    const updatedTemplate = {
      ...mealTemplateRecord,
      name: "Edited Hypertrophy Meal Plan",
      templateJson: {
        days: [
          {
            name: "Day 1",
            meals: [
              {
                meal: "Breakfast",
                foods: [
                  {
                    foodId: "food_global",
                    foodName: "Basmati Rice",
                    servingSize: "100 g",
                    calories: 121,
                    proteinGrams: 3,
                    carbsGrams: 25,
                    fatGrams: 0.4,
                    fiberGrams: 0.4,
                    quantity: 1,
                    measurementUnit: "g"
                  }
                ]
              }
            ]
          }
        ]
      },
      updatedAt: new Date("2026-05-19T00:00:00.000Z")
    };
    mocks.prisma.mealPlanTemplate.findFirst.mockResolvedValue(mealTemplateRecord);
    mocks.prisma.mealPlanTemplate.update.mockResolvedValue(updatedTemplate);

    const response = await updateMealPlanTemplate(
      new Request("http://test.local/api/v1/meal-plan-templates/meal_template_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Edited Hypertrophy Meal Plan",
          targetCalories: 2900,
          template: updatedTemplate.templateJson
        })
      }),
      { params: Promise.resolve({ templateId: "meal_template_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; name: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ id: "meal_template_1", name: "Edited Hypertrophy Meal Plan" });
    expect(mocks.prisma.mealPlanTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "meal_template_1" },
        data: expect.objectContaining({
          name: "Edited Hypertrophy Meal Plan",
          targetCalories: 2900,
          templateJson: updatedTemplate.templateJson
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "meal_plan_template.updated",
          targetId: "meal_template_1"
        })
      })
    );
  });

  it("soft deletes an existing meal plan template", async () => {
    mocks.prisma.mealPlanTemplate.findFirst.mockResolvedValue(mealTemplateRecord);
    mocks.prisma.mealPlanTemplate.update.mockResolvedValue({
      ...mealTemplateRecord,
      deletedAt: new Date("2026-06-17T00:00:00.000Z")
    });

    const response = await deleteMealPlanTemplate(
      new Request("http://test.local/api/v1/meal-plan-templates/meal_template_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ templateId: "meal_template_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; deleted: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ id: "meal_template_1", deleted: true });
    expect(mocks.prisma.mealPlanTemplate.update).toHaveBeenCalledWith({
      where: { id: "meal_template_1" },
      data: { deletedAt: expect.any(Date) }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "meal_plan_template.deleted",
          targetId: "meal_template_1"
        })
      })
    );
  });

  it("creates immutable meal assignment snapshots from templates", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.mealPlanTemplate.findFirst.mockResolvedValue(mealTemplateRecord);
    mocks.prisma.mealPlanAssignment.create.mockResolvedValue(mealAssignmentRecord);

    const response = await createMealPlanAssignment(
      new Request("http://test.local/api/v1/meal-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client_1",
          templateId: "meal_template_1",
          startsOn: "2026-05-18"
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; snapshot: { templateName: string } } };

    expect(response.status).toBe(201);
    expect(payload.data.snapshot.templateName).toBe("Hypertrophy Meal Plan");
    expect(mocks.prisma.mealPlanAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          templateId: "meal_template_1",
          snapshotJson: expect.objectContaining({
            templateName: "Hypertrophy Meal Plan",
            template: mealTemplateJson
          })
        })
      })
    );
  });

  it("returns not found when assigning a meal plan to an inaccessible client", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(null);
    mocks.prisma.mealPlanTemplate.findFirst.mockResolvedValue(mealTemplateRecord);

    const response = await createMealPlanAssignment(
      new Request("http://test.local/api/v1/meal-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "missing_client",
          templateId: "meal_template_1",
          startsOn: "2026-05-18"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: "not_found", message: "Client not found." });
    expect(mocks.prisma.mealPlanAssignment.create).not.toHaveBeenCalled();
  });

  it("returns not found when assigning an inaccessible meal template", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.mealPlanTemplate.findFirst.mockResolvedValue(null);

    const response = await createMealPlanAssignment(
      new Request("http://test.local/api/v1/meal-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client_1",
          templateId: "missing_template",
          startsOn: "2026-05-18"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: "not_found", message: "Meal plan template not found." });
    expect(mocks.prisma.mealPlanAssignment.create).not.toHaveBeenCalled();
  });

  it("lists meal assignments and client meal plans with organization scope", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.mealPlanAssignment.findMany.mockResolvedValue([mealAssignmentRecord]);

    const assignmentsResponse = await getMealPlanAssignments(
      new Request("http://test.local/api/v1/meal-plan-assignments?clientId=client_1")
    );
    const clientResponse = await getClientMealPlans(new Request("http://test.local/api/v1/clients/client_1/meal-plans"), {
      params: Promise.resolve({ clientId: "client_1" })
    });

    expect(assignmentsResponse.status).toBe(200);
    expect(clientResponse.status).toBe(200);
    expect(mocks.prisma.mealPlanAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1"
        })
      })
    );
  });

  it("returns not found for inaccessible client meal plans", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await getClientMealPlans(new Request("http://test.local/api/v1/clients/missing/meal-plans"), {
      params: Promise.resolve({ clientId: "missing" })
    });
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: "not_found", message: "Client not found." });
    expect(mocks.prisma.mealPlanAssignment.findMany).not.toHaveBeenCalled();
  });

  it("rejects invalid meal template payloads before persistence", async () => {
    const response = await createMealPlanTemplate(
      new Request("http://test.local/api/v1/meal-plan-templates", {
        method: "POST",
        body: JSON.stringify({
          name: "",
          targetCalories: -1,
          proteinGrams: -1,
          carbsGrams: 0,
          fatGrams: 0,
          status: "published",
          template: { days: [] }
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.mealPlanTemplate.create).not.toHaveBeenCalled();
  });

  it("rejects invalid meal assignment payloads before persistence", async () => {
    const response = await createMealPlanAssignment(
      new Request("http://test.local/api/v1/meal-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "",
          templateId: "meal_template_1",
          startsOn: "not-a-date"
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.client.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.mealPlanAssignment.create).not.toHaveBeenCalled();
  });
});
