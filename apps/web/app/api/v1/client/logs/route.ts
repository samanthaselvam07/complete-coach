import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import {
  buildClientActivityLogSummary,
  clientActivityLogsQuerySchema,
  getClientActivityLogDateRange,
  serializeClientActivityLog,
  toDateOnly,
  toPrismaClientActivityLogDomain,
  toPrismaClientActivityLogStatus,
  upsertClientActivityLogSchema
} from "@/lib/clients/client-activity-logs";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const query = clientActivityLogsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = await prisma.client.findFirstOrThrow({
      where: {
        id: actor.clientId,
        organizationId: actor.organizationId,
        clientUserId: actor.userId,
        deletedAt: null
      },
      select: {
        id: true,
        profile: {
          select: {
            trainingLogTargetDays: true
          }
        }
      }
    });
    const { dateFrom, dateTo } = getClientActivityLogDateRange(query);
    const logs = await prisma.clientActivityLog.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        logDate: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      orderBy: [{ logDate: "asc" }, { domain: "asc" }]
    });

    return dataResponse({
      logs: logs.map(serializeClientActivityLog),
      summary: buildClientActivityLogSummary(logs, dateFrom, dateTo, {
        trainingLogTargetDays: client.profile?.trainingLogTargetDays
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = upsertClientActivityLogSchema.parse(await request.json());
    const client = await prisma.client.findFirstOrThrow({
      where: {
        id: actor.clientId,
        organizationId: actor.organizationId,
        clientUserId: actor.userId,
        deletedAt: null
      },
      select: {
        id: true,
        profile: {
          select: {
            trainingLogTargetDays: true
          }
        }
      }
    });
    const domain = toPrismaClientActivityLogDomain(input.domain);
    const status = toPrismaClientActivityLogStatus(input.status);
    const logDate = toDateOnly(input.logDate);
    const log = await prisma.clientActivityLog.upsert({
      where: {
        organizationId_clientId_domain_logDate: {
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          domain,
          logDate
        }
      },
      create: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        domain,
        logDate,
        status,
        sourceType: "client_app",
        sourceId: actor.userId,
        notes: input.notes ?? null
      },
      update: {
        status,
        sourceType: "client_app",
        sourceId: actor.userId,
        notes: input.notes ?? null
      }
    });
    const { dateFrom, dateTo } = getClientActivityLogDateRange({ days: 7 });
    const logs = await prisma.clientActivityLog.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        logDate: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      orderBy: [{ logDate: "asc" }, { domain: "asc" }]
    });
    const summary = buildClientActivityLogSummary(logs, dateFrom, dateTo, {
      trainingLogTargetDays: client.profile?.trainingLogTargetDays
    });

    await prisma.client.update({
      where: { id: actor.clientId, organizationId: actor.organizationId },
      data: { compliance: summary.complianceScore }
    });

    return dataResponse({
      log: serializeClientActivityLog(log),
      summary
    });
  } catch (error) {
    return handleApiError(error);
  }
}
