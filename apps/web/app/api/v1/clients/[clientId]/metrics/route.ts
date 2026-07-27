import { auth } from "@/auth";
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
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (query.summary === "weight") {
      const [startingWeight, currentWeight] = await Promise.all([
        prisma.clientMeasurement.findFirst({
          where: {
            organizationId: actor.organizationId,
            clientId,
            metricKey: "body_weight"
          },
          orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }]
        }),
        prisma.clientMeasurement.findFirst({
          where: {
            organizationId: actor.organizationId,
            clientId,
            metricKey: "body_weight"
          },
          orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }]
        })
      ]);

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
