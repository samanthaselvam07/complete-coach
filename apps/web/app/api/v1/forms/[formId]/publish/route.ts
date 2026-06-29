import { FormStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { publishFormSchema, serializeForm } from "@/lib/forms/form-records";

interface PublishFormRouteContext {
  params: Promise<{ formId: string }>;
}

export async function POST(request: Request, context: PublishFormRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "forms:publish");
    const { formId } = await context.params;
    const input = publishFormSchema.parse(await request.json());
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!form) {
      return errorResponse("not_found", "Form not found.", 404);
    }

    const version = await prisma.formVersion.findFirst({
      where: {
        id: input.formVersionId,
        formId,
        organizationId: actor.organizationId
      }
    });

    if (!version) {
      return errorResponse("not_found", "Form version not found.", 404);
    }

    const publishedForm = await prisma.$transaction(async (tx) => {
      await tx.formVersion.update({
        where: { id: version.id, organizationId: actor.organizationId },
        data: { publishedAt: version.publishedAt ?? new Date() }
      });

      const updatedForm = await tx.form.update({
        where: { id: formId, organizationId: actor.organizationId },
        data: {
          currentVersionId: version.id,
          status: FormStatus.PUBLISHED
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "form.published",
          targetType: "form",
          targetId: formId,
          metadata: {
            formVersionId: version.id,
            versionNumber: version.versionNumber
          }
        }
      });

      return updatedForm;
    });

    return dataResponse(serializeForm(publishedForm));
  } catch (error) {
    return handleApiError(error);
  }
}
