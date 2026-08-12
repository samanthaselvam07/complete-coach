import { FormStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { createFormAssignmentSchema, serializeFormAssignment } from "@/lib/forms/form-records";

interface FormAssignmentRouteContext {
  params: Promise<{ formId: string }>;
}

export async function POST(request: Request, context: FormAssignmentRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "forms:write");
    const { formId } = await context.params;
    const input = createFormAssignmentSchema.parse(await request.json());
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: actor.organizationId,
        deletedAt: null
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1
        }
      }
    });

    if (!form) {
      return errorResponse("not_found", "Form not found.", 404);
    }

    const formVersionId = input.formVersionId ?? form.currentVersionId ?? form.versions?.[0]?.id;

    if (!formVersionId) {
      return errorResponse("form_version_required", "Form fields must be saved before assignment.", 409);
    }

    const version = await prisma.formVersion.findFirst({
      where: {
        id: formVersionId,
        formId,
        organizationId: actor.organizationId
      }
    });

    if (!version) {
      return errorResponse("not_found", "Form version not found.", 404);
    }

    if (!version.publishedAt || form.currentVersionId !== version.id || form.status !== FormStatus.PUBLISHED) {
      await prisma.$transaction(async (tx) => {
        if (!version.publishedAt) {
          await tx.formVersion.update({
            where: { id: version.id, organizationId: actor.organizationId },
            data: { publishedAt: new Date() }
          });
        }

        await tx.form.update({
          where: { id: formId, organizationId: actor.organizationId },
          data: {
            currentVersionId: version.id,
            status: FormStatus.PUBLISHED
          }
        });
      });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const assignment = await prisma.formAssignment.create({
      data: {
        organizationId: actor.organizationId,
        formId,
        formVersionId,
        clientId: input.clientId,
        createdByUserId: actor.userId,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "form.assigned",
        targetType: "form_assignment",
        targetId: assignment.id,
        metadata: {
          formId,
          formVersionId,
          clientId: input.clientId
        }
      }
    });

    return dataResponse(serializeFormAssignment(assignment), {
      status: 201,
      headers: { Location: `/api/v1/form-assignments/${assignment.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
