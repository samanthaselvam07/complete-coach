import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getTrainingTemplateUpdateData,
  serializeTrainingTemplate,
  updateTrainingTemplateSchema
} from "@/lib/training/training-records";

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

export async function PATCH(request: Request, context: TrainingProgramTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "training:write");
    const { templateId } = await context.params;
    const input = updateTrainingTemplateSchema.parse(await request.json());
    const existingTemplate = await prisma.trainingProgramTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingTemplate) {
      return errorResponse("not_found", "Training template not found.", 404);
    }

    const template = await prisma.trainingProgramTemplate.update({
      where: { id: existingTemplate.id },
      data: getTrainingTemplateUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "training_template.updated",
        targetType: "training_program_template",
        targetId: template.id,
        metadata: {
          status: input.status,
          durationWeeks: input.durationWeeks
        }
      }
    });

    return dataResponse(serializeTrainingTemplate(template));
  } catch (error) {
    return handleApiError(error);
  }
}
