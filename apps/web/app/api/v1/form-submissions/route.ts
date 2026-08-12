import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  serializeSubmission,
  submissionListQuerySchema,
  toPrismaFormType,
  toPrismaSubmissionStatus
} from "@/lib/forms/submission-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "submissions:read");
    const query = submissionListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const submissions = await prisma.formSubmission.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.formId ? { formId: query.formId } : {}),
        ...(query.formType ? { form: { type: toPrismaFormType(query.formType), deletedAt: null } } : {}),
        ...(query.status ? { status: toPrismaSubmissionStatus(query.status) } : {})
      },
      include: {
        client: true,
        form: true,
        formVersion: true
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: query.limit
    });

    return dataResponse(submissions.map(serializeSubmission));
  } catch (error) {
    return handleApiError(error);
  }
}
