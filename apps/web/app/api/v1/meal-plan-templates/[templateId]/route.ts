import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getMealPlanTemplateUpdateData,
  serializeMealPlanTemplate,
  updateMealPlanTemplateSchema
} from "@/lib/nutrition/nutrition-records";

interface MealPlanTemplateRouteContext {
  params: Promise<{ templateId: string }>;
}

export async function PATCH(request: Request, context: MealPlanTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:write");
    const { templateId } = await context.params;
    const input = updateMealPlanTemplateSchema.parse(await request.json());
    const existingTemplate = await prisma.mealPlanTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingTemplate) {
      return errorResponse("not_found", "Meal plan template not found.", 404);
    }

    const template = await prisma.mealPlanTemplate.update({
      where: { id: templateId },
      data: getMealPlanTemplateUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "meal_plan_template.updated",
        targetType: "meal_plan_template",
        targetId: template.id,
        metadata: {
          status: input.status,
          targetCalories: input.targetCalories
        }
      }
    });

    return dataResponse(serializeMealPlanTemplate(template));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: MealPlanTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:write");
    const { templateId } = await context.params;
    const existingTemplate = await prisma.mealPlanTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingTemplate) {
      return errorResponse("not_found", "Meal plan template not found.", 404);
    }

    const template = await prisma.mealPlanTemplate.update({
      where: { id: templateId },
      data: { deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "meal_plan_template.deleted",
        targetType: "meal_plan_template",
        targetId: template.id,
        metadata: {
          name: template.name
        }
      }
    });

    return dataResponse({ id: template.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
