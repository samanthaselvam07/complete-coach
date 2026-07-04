import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

interface SupplementAssignmentRouteContext {
  params: Promise<{ assignmentId: string }>;
}

export async function DELETE(_request: Request, context: SupplementAssignmentRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:assign");
    const { assignmentId } = await context.params;
    const assignment = await prisma.supplementPlanAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId: actor.organizationId
      }
    });

    if (!assignment) {
      return errorResponse("not_found", "Supplement plan assignment not found.", 404);
    }

    await prisma.supplementPlanAssignment.deleteMany({
      where: {
        id: assignment.id,
        organizationId: actor.organizationId
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "supplement_plan_assignment.deleted",
        targetType: "supplement_plan_assignment",
        targetId: assignment.id,
        metadata: {
          clientId: assignment.clientId,
          templateId: assignment.templateId
        }
      }
    });

    return dataResponse({ id: assignment.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
