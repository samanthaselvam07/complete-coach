import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  calendarConnectionListQuerySchema,
  createAppleCalendarConnectionSchema,
  serializeCalendarConnection,
  toCalendarProvider,
  toCalendarScope
} from "@/lib/calendar/calendar-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "calendar:read");
    const query = calendarConnectionListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const scope = toCalendarScope(query.scope);

    if (query.scope === "organization" && !["owner", "admin"].includes(actor.role)) {
      return errorResponse("forbidden", "Only owners and admins can view organisation calendar connections.", 403);
    }

    const connections = await prisma.calendarConnection.findMany({
      where: {
        organizationId: actor.organizationId,
        scope,
        ...(query.scope === "coach" ? { createdByUserId: actor.userId } : {})
      },
      orderBy: [{ status: "asc" }, { provider: "asc" }, { accountName: "asc" }]
    });

    return dataResponse(connections.map(serializeCalendarConnection));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "calendar:manage");
    const input = createAppleCalendarConnectionSchema.parse(await request.json());
    const scope = toCalendarScope(input.scope);

    if (input.scope === "organization" && !["owner", "admin"].includes(actor.role)) {
      return errorResponse("forbidden", "Only owners and admins can manage organisation calendar connections.", 403);
    }

    const connection = await prisma.calendarConnection.upsert({
      where: {
        organizationId_scope_provider_providerAccountId_createdByUserId: {
          organizationId: actor.organizationId,
          scope,
          provider: toCalendarProvider("apple"),
          providerAccountId: `apple-${input.scope}-${actor.userId}`,
          createdByUserId: actor.userId
        }
      },
      create: {
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        provider: toCalendarProvider("apple"),
        scope,
        providerAccountId: `apple-${input.scope}-${actor.userId}`,
        accountName: "Apple Calendar setup",
        calendarName: "Apple Calendar",
        scopes: ["caldav"],
        status: "PENDING"
      },
      update: {
        accountName: "Apple Calendar setup",
        calendarName: "Apple Calendar",
        scopes: ["caldav"],
        status: "PENDING",
        lastError: null,
        revokedAt: null,
        connectedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "calendar.connection.created",
        targetType: "calendar_connection",
        targetId: connection.id,
        metadata: {
          provider: "apple",
          scope: input.scope,
          accountName: connection.accountName
        }
      }
    });

    return dataResponse(serializeCalendarConnection(connection), {
      status: 201,
      headers: { Location: `/api/v1/calendar/connections/${connection.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
