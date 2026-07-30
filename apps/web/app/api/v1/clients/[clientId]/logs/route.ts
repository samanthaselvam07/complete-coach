import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
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
import { canViewAllClientNotes } from "@/lib/clients/client-notes";
import { prisma } from "@/lib/db/prisma";

interface ClientActivityLogsRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(request: Request, context: ClientActivityLogsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const query = clientActivityLogsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null,
        ...(canViewAllClientNotes(actor.role) ? {} : { primaryCoachUserId: actor.userId })
      },
      select: { id: true }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const { dateFrom, dateTo } = getClientActivityLogDateRange(query);
    const logs = await prisma.clientActivityLog.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId,
        logDate: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      orderBy: [{ logDate: "asc" }, { domain: "asc" }]
    });

    return dataResponse({
      logs: logs.map(serializeClientActivityLog),
      summary: buildClientActivityLogSummary(logs, dateFrom, dateTo)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ClientActivityLogsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = upsertClientActivityLogSchema.parse(await request.json());
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null,
        ...(canViewAllClientNotes(actor.role) ? {} : { primaryCoachUserId: actor.userId })
      },
      select: { id: true }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const domain = toPrismaClientActivityLogDomain(input.domain);
    const status = toPrismaClientActivityLogStatus(input.status);
    const logDate = toDateOnly(input.logDate);
    const log = await prisma.clientActivityLog.upsert({
      where: {
        organizationId_clientId_domain_logDate: {
          organizationId: actor.organizationId,
          clientId,
          domain,
          logDate
        }
      },
      create: {
        organizationId: actor.organizationId,
        clientId,
        domain,
        logDate,
        status,
        notes: input.notes ?? null
      },
      update: {
        status,
        notes: input.notes ?? null
      }
    });

    const { dateFrom, dateTo } = getClientActivityLogDateRange({ days: 7 });
    const logs = await prisma.clientActivityLog.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId,
        logDate: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      orderBy: [{ logDate: "asc" }, { domain: "asc" }]
    });
    const summary = buildClientActivityLogSummary(logs, dateFrom, dateTo);

    await prisma.client.update({
      where: { id: clientId, organizationId: actor.organizationId },
      data: { compliance: summary.complianceScore }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.activity_log_upserted",
        targetType: "client",
        targetId: clientId,
        metadata: {
          domain: input.domain,
          logDate: input.logDate,
          status: input.status
        }
      }
    });

    return dataResponse({
      log: serializeClientActivityLog(log),
      summary
    });
  } catch (error) {
    return handleApiError(error);
  }
}
