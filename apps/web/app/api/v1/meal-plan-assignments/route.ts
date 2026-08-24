import type { InputJsonValue } from "@prisma/client/runtime/client";

import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { enqueueClientAutomationJob } from "@/lib/organizations/automation-records";
import {
  buildMealPlanAssignmentSnapshot,
  createMealPlanAssignmentSchema,
  serializeMealPlanAssignment
} from "@/lib/nutrition/nutrition-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:read");
    const searchParams = new URL(request.url).searchParams;
    const clientId = searchParams.get("clientId") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const assignments = await prisma.mealPlanAssignment.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(clientId ? { clientId } : {})
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [{ startsOn: "desc" }, { name: "asc" }],
      take: limit
    });

    return dataResponse(assignments.map(serializeMealPlanAssignment));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:assign");
    const input = createMealPlanAssignmentSchema.parse(await request.json());
    const [client, template] = await Promise.all([
      prisma.client.findFirst({
        where: {
          id: input.clientId,
          organizationId: actor.organizationId,
          deletedAt: null
        }
      }),
      prisma.mealPlanTemplate.findFirst({
        where: {
          id: input.templateId,
          organizationId: actor.organizationId,
          deletedAt: null
        }
      })
    ]);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (!template) {
      return errorResponse("not_found", "Meal plan template not found.", 404);
    }

    const assignment = await prisma.mealPlanAssignment.create({
      data: {
        organizationId: actor.organizationId,
        clientId: client.id,
        templateId: template.id,
        name: input.name || template.name,
        phase: template.phase,
        targetCalories: template.targetCalories,
        proteinGrams: template.proteinGrams,
        carbsGrams: template.carbsGrams,
        fatGrams: template.fatGrams,
        startsOn: new Date(input.startsOn),
        endsOn: input.endsOn ? new Date(input.endsOn) : null,
        snapshotJson: buildMealPlanAssignmentSnapshot(template) as InputJsonValue,
        createdByUserId: actor.userId
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "meal_plan_assignment.created",
        targetType: "meal_plan_assignment",
        targetId: assignment.id,
        metadata: {
          clientId: client.id,
          templateId: template.id
        }
      }
    });

    await enqueueClientAutomationJob({
      organizationId: actor.organizationId,
      trigger: "nutrition-plan-added",
      clientId: client.id,
      source: "meal_plan_assignment",
      sourceId: assignment.id,
      metadata: {
        assignmentId: assignment.id,
        templateId: template.id
      }
    });

    return dataResponse(serializeMealPlanAssignment(assignment), {
      status: 201,
      headers: { Location: `/api/v1/meal-plan-assignments/${assignment.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
