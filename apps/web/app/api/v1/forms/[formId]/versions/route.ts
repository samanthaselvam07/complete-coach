import { FormStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { createFormVersionSchema, serializeFormVersion } from "@/lib/forms/form-records";
import { logger, redactLogValue } from "@/lib/observability/logger";

interface FormVersionRouteContext {
  params: Promise<{ formId: string }>;
}

export async function POST(request: Request, context: FormVersionRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "forms:write");
    const { formId } = await context.params;
    const input = createFormVersionSchema.parse(await request.json());
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

    const versionAggregate = await prisma.formVersion.aggregate({
      where: {
        formId,
        organizationId: actor.organizationId
      },
      _max: { versionNumber: true }
    });
    const versionNumber = (versionAggregate._max.versionNumber ?? 0) + 1;

    const version = await prisma.$transaction(async (tx) => {
      const publishedVersion = await tx.formVersion.create({
        data: {
          organizationId: actor.organizationId,
          formId,
          versionNumber,
          schemaJson: input.schema as InputJsonValue,
          ...(input.ui ? { uiJson: input.ui as InputJsonValue } : {}),
          publishedAt: new Date(),
          createdByUserId: actor.userId
        }
      });

      await tx.form.update({
        where: { id: formId, organizationId: actor.organizationId },
        data: {
          currentVersionId: publishedVersion.id,
          status: FormStatus.PUBLISHED
        }
      });

      return publishedVersion;
    });

    try {
      await prisma.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "form.version.created",
          targetType: "form",
          targetId: formId,
          metadata: {
            formVersionId: version.id,
            versionNumber
          }
        }
      });
    } catch (auditError) {
      logger.warn({
        event: "forms.audit_log_failed",
        action: "form.version.created",
        formId,
        formVersionId: version.id,
        error: redactLogValue(auditError)
      });
    }

    return dataResponse(serializeFormVersion(version), {
      status: 201,
      headers: { Location: `/api/v1/forms/${formId}/versions/${version.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
