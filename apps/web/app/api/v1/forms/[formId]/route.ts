import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getFormUpdateData,
  serializeForm,
  serializeFormVersion,
  updateFormSchema
} from "@/lib/forms/form-records";

interface FormRouteContext {
  params: Promise<{ formId: string }>;
}

export async function GET(_request: Request, context: FormRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "forms:read");
    const { formId } = await context.params;
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: actor.organizationId,
        deletedAt: null
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      }
    });

    if (!form) {
      return errorResponse("not_found", "Form not found.", 404);
    }

    return dataResponse({
      ...serializeForm(form),
      versions: form.versions.map(serializeFormVersion)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: FormRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "forms:write");
    const { formId } = await context.params;
    const input = updateFormSchema.parse(await request.json());
    const existingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingForm) {
      return errorResponse("not_found", "Form not found.", 404);
    }

    const form = await prisma.form.update({
      where: { id: formId, organizationId: actor.organizationId },
      data: getFormUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "form.updated",
        targetType: "form",
        targetId: form.id
      }
    });

    return dataResponse(serializeForm(form));
  } catch (error) {
    return handleApiError(error);
  }
}
