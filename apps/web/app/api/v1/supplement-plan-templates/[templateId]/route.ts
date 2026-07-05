import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getSupplementTemplateUpdateData,
  serializeSupplementTemplate,
  updateSupplementTemplateSchema
} from "@/lib/supplementation/supplement-records";

interface SupplementTemplateRouteContext {
  params: Promise<{ templateId: string }>;
}

export async function GET(_request: Request, context: SupplementTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:read");
    const { templateId } = await context.params;
    const template = await prisma.supplementPlanTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!template) {
      return errorResponse("not_found", "Supplement plan template not found.", 404);
    }

    return dataResponse(serializeSupplementTemplate(template));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: SupplementTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:write");
    const { templateId } = await context.params;
    const input = updateSupplementTemplateSchema.parse(await request.json());
    const template = await prisma.supplementPlanTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!template) {
      return errorResponse("not_found", "Supplement plan template not found.", 404);
    }

    await prisma.supplementPlanTemplate.updateMany({
      where: {
        id: template.id,
        organizationId: actor.organizationId,
        deletedAt: null
      },
      data: getSupplementTemplateUpdateData(input)
    });
    const updatedTemplate = await prisma.supplementPlanTemplate.findFirst({
      where: {
        id: template.id,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!updatedTemplate) {
      return errorResponse("not_found", "Supplement plan template not found.", 404);
    }

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "supplement_plan_template.updated",
        targetType: "supplement_plan_template",
        targetId: updatedTemplate.id,
        metadata: {
          status: input.status
        }
      }
    });

    return dataResponse(serializeSupplementTemplate(updatedTemplate));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: SupplementTemplateRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:write");
    const { templateId } = await context.params;
    const template = await prisma.supplementPlanTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!template) {
      return errorResponse("not_found", "Supplement plan template not found.", 404);
    }

    await prisma.supplementPlanTemplate.updateMany({
      where: {
        id: template.id,
        organizationId: actor.organizationId,
        deletedAt: null
      },
      data: { deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "supplement_plan_template.deleted",
        targetType: "supplement_plan_template",
        targetId: template.id,
        metadata: {}
      }
    });

    return dataResponse({ id: template.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
