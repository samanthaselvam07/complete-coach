import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

interface TrainingProgramTemplateRouteContext {
  params: Promise<{ templateId: string }>;
}

export async function DELETE(_request: Request, context: TrainingProgramTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "training:write");
    const { templateId } = await context.params;
    const template = await prisma.trainingProgramTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!template) {
      return errorResponse("not_found", "Training template not found.", 404);
    }

    await prisma.trainingProgramTemplate.update({
      where: { id: template.id },
      data: { deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "training_template.deleted",
        targetType: "training_program_template",
        targetId: template.id
      }
    });

    return dataResponse({ id: template.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
