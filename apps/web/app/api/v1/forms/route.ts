import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { logger, redactLogValue } from "@/lib/observability/logger";
import {
  buildFormWhere,
  createFormSchema,
  formListQuerySchema,
  getFormCreateData,
  serializeForm
} from "@/lib/forms/form-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "forms:read");
    const query = formListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const forms = await prisma.form.findMany({
      where: buildFormWhere(actor.organizationId, query),
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: query.limit
    });

    return dataResponse(forms.map(serializeForm));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "forms:write");
    const input = createFormSchema.parse(await request.json());
    const form = await prisma.form.create({
      data: getFormCreateData(actor.organizationId, actor.userId, input)
    });

    try {
      await prisma.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "form.created",
          targetType: "form",
          targetId: form.id,
          metadata: {
            type: input.type,
            status: input.status
          }
        }
      });
    } catch (auditError) {
      logger.warn({
        event: "forms.audit_log_failed",
        action: "form.created",
        formId: form.id,
        error: redactLogValue(auditError)
      });
    }

    return dataResponse(serializeForm(form), {
      status: 201,
      headers: { Location: `/api/v1/forms/${form.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
