import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { checkInListQuerySchema, serializeCheckInDetail, toPrismaCheckInStatus } from "@/lib/forms/submission-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const query = checkInListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const checkIns = await prisma.checkIn.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        ...(query.status ? { status: toPrismaCheckInStatus(query.status) } : {})
      },
      include: {
        client: true,
        formSubmission: {
          include: {
            client: true,
            form: true,
            formVersion: true
          }
        }
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: query.limit
    });
    const formSubmissionIds = checkIns
      .map((checkIn) => checkIn.formSubmissionId)
      .filter((formSubmissionId): formSubmissionId is string => Boolean(formSubmissionId));
    const metrics = formSubmissionIds.length > 0
      ? await prisma.clientMeasurement.findMany({
          where: {
            organizationId: actor.organizationId,
            clientId: actor.clientId,
            sourceType: "form_submission",
            sourceId: { in: formSubmissionIds }
          },
          orderBy: [{ metricKey: "asc" }]
        })
      : [];

    return dataResponse(checkIns.map((checkIn) => serializeCheckInDetail(
      checkIn,
      metrics.filter((metric) => metric.sourceId === checkIn.formSubmissionId)
    )));
  } catch (error) {
    return handleApiError(error);
  }
}
