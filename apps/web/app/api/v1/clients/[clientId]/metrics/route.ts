import { auth } from "@/auth";
import { FormType } from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { clientMetricsQuerySchema, serializeMetric } from "@/lib/forms/submission-records";

interface ClientMetricsRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(request: Request, context: ClientMetricsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "metrics:read");
    const { clientId } = await context.params;
    const query = clientMetricsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        ...(actor.role === "client" ? { clientUserId: actor.userId } : {}),
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (query.summary === "weight") {
      const initialQuestionnaireSubmissions = await prisma.formSubmission.findMany({
        where: {
          organizationId: actor.organizationId,
          clientId,
          form: {
            type: {
              in: [FormType.INTAKE, FormType.APPLICATION, FormType.CONTACT]
            }
          }
        },
        select: { id: true },
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }]
      });
      const initialQuestionnaireSubmissionIds = initialQuestionnaireSubmissions.map((submission) => submission.id);
      const bodyWeightKeys = ["body_weight", "bodyweight"];
      const [initialQuestionnaireWeight, fallbackStartingWeight, currentWeight] = await Promise.all([
        initialQuestionnaireSubmissionIds.length > 0
          ? prisma.clientMeasurement.findFirst({
              where: {
                organizationId: actor.organizationId,
                clientId,
                metricKey: { in: bodyWeightKeys },
                sourceType: "form_submission",
                sourceId: { in: initialQuestionnaireSubmissionIds }
              },
              orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }]
            })
          : Promise.resolve(null),
        prisma.clientMeasurement.findFirst({
          where: {
            organizationId: actor.organizationId,
            clientId,
            metricKey: { in: bodyWeightKeys }
          },
          orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }]
        }),
        prisma.clientMeasurement.findFirst({
          where: {
            organizationId: actor.organizationId,
            clientId,
            metricKey: { in: bodyWeightKeys }
          },
          orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }]
        })
      ]);
      const startingWeight = initialQuestionnaireWeight ?? fallbackStartingWeight;

      return dataResponse({
        startingWeight: startingWeight ? serializeMetric(startingWeight) : null,
        currentWeight: currentWeight ? serializeMetric(currentWeight) : null
      });
    }

    const metrics = await prisma.clientMeasurement.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId,
        ...(query.metricKey ? { metricKey: query.metricKey } : {}),
        ...(query.dateFrom || query.dateTo
          ? {
              measuredAt: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
              }
            }
          : {})
      },
      orderBy: [{ measuredAt: "desc" }, { metricKey: "asc" }],
      take: query.limit
    });

    return dataResponse(metrics.map(serializeMetric));
  } catch (error) {
    return handleApiError(error);
  }
}
