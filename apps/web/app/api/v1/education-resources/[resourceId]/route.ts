import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getEducationResourceUpdateData,
  serializeEducationResource,
  updateEducationResourceSchema
} from "@/lib/education/education-records";

interface RouteContext {
  params: Promise<{ resourceId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "education:read");
    const { resourceId } = await context.params;
    const resource = await prisma.educationResource.findFirst({
      where: {
        id: resourceId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!resource) {
      return errorResponse("not_found", "Education resource not found.", 404);
    }

    return dataResponse(serializeEducationResource(resource));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "education:write");
    const { resourceId } = await context.params;
    const input = updateEducationResourceSchema.parse(await request.json());
    const existing = await prisma.educationResource.findFirst({
      where: {
        id: resourceId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existing) {
      return errorResponse("not_found", "Education resource not found.", 404);
    }

    const resource = await prisma.educationResource.update({
      where: { id: resourceId, organizationId: actor.organizationId },
      data: getEducationResourceUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "education_resource.updated",
        targetType: "education_resource",
        targetId: resource.id,
        metadata: {
          fields: Object.keys(input)
        }
      }
    });

    return dataResponse(serializeEducationResource(resource));
  } catch (error) {
    return handleApiError(error);
  }
}
