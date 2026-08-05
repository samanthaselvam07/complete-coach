import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import type { MembershipRole } from "@/lib/auth/permissions";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  clientCalendarEventPayloadSchema,
  serializeClientCalendarEvent,
  toClientCalendarEventDate,
  toNullableClientCalendarEventDate,
  toNullableClientCalendarEventInt
} from "@/lib/clients/client-calendar-events";
import { prisma } from "@/lib/db/prisma";

interface ClientCalendarEventsRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: Request, context: ClientCalendarEventsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const events = await prisma.clientCalendarEvent.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }]
    });

    return dataResponse(events.map(serializeClientCalendarEvent));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ClientCalendarEventsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = clientCalendarEventPayloadSchema.parse(await request.json());
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const roadmapPhaseId = await getScopedRoadmapPhaseId(input.roadmapPhaseId, clientId, actor.organizationId);

    if (input.roadmapPhaseId && !roadmapPhaseId) {
      return errorResponse("not_found", "Roadmap phase not found.", 404);
    }

    const event = await prisma.clientCalendarEvent.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        ...toCalendarEventWriteData(input, roadmapPhaseId)
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.calendar_event_created",
        targetType: "client",
        targetId: client.id,
        metadata: { eventId: event.id, type: event.type, startDate: input.startDate }
      }
    });

    return dataResponse(serializeClientCalendarEvent(event), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: ClientCalendarEventsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const eventId = new URL(request.url).searchParams.get("eventId");

    if (!eventId) {
      return errorResponse("validation_failed", "Calendar event id is required.", 400);
    }

    const input = clientCalendarEventPayloadSchema.parse(await request.json());
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const existingEvent = await prisma.clientCalendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: actor.organizationId,
        clientId
      }
    });

    if (!existingEvent) {
      return errorResponse("not_found", "Calendar event not found.", 404);
    }

    const roadmapPhaseId = await getScopedRoadmapPhaseId(input.roadmapPhaseId, clientId, actor.organizationId);

    if (input.roadmapPhaseId && !roadmapPhaseId) {
      return errorResponse("not_found", "Roadmap phase not found.", 404);
    }

    const event = await prisma.clientCalendarEvent.update({
      where: {
        id: existingEvent.id,
        organizationId: actor.organizationId
      },
      data: toCalendarEventWriteData(input, roadmapPhaseId)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.calendar_event_updated",
        targetType: "client",
        targetId: client.id,
        metadata: { eventId: event.id, type: event.type, startDate: input.startDate }
      }
    });

    return dataResponse(serializeClientCalendarEvent(event));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: ClientCalendarEventsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const eventId = new URL(request.url).searchParams.get("eventId");

    if (!eventId) {
      return errorResponse("validation_failed", "Calendar event id is required.", 400);
    }

    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const existingEvent = await prisma.clientCalendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: actor.organizationId,
        clientId
      }
    });

    if (!existingEvent) {
      return errorResponse("not_found", "Calendar event not found.", 404);
    }

    await prisma.clientCalendarEvent.delete({
      where: {
        id: existingEvent.id,
        organizationId: actor.organizationId
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.calendar_event_deleted",
        targetType: "client",
        targetId: client.id,
        metadata: { eventId: existingEvent.id, type: existingEvent.type, startDate: existingEvent.startDate }
      }
    });

    return dataResponse({
      id: existingEvent.id,
      deleted: true
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function findAccessibleClient(clientId: string, organizationId: string, userId: string, role: MembershipRole) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId,
      deletedAt: null,
      ...(canViewAllClientCalendar(role) ? {} : { primaryCoachUserId: userId })
    },
    select: { id: true }
  });
}

function canViewAllClientCalendar(role: MembershipRole) {
  return role === "owner" || role === "admin";
}

async function getScopedRoadmapPhaseId(roadmapPhaseId: string, clientId: string, organizationId: string) {
  if (!roadmapPhaseId) {
    return null;
  }

  const phase = await prisma.clientRoadmapPhase.findFirst({
    where: {
      id: roadmapPhaseId,
      organizationId,
      clientId
    },
    select: { id: true }
  });

  return phase?.id ?? null;
}

function toCalendarEventWriteData(input: ReturnType<typeof clientCalendarEventPayloadSchema.parse>, roadmapPhaseId: string | null) {
  return {
    title: input.title,
    type: input.type,
    startDate: toClientCalendarEventDate(input.startDate),
    endDate: toClientCalendarEventDate(input.endDate || input.startDate),
    allDay: input.allDay,
    eventTime: input.allDay ? null : input.time || null,
    recurring: input.recurring,
    recurrenceCount: toNullableClientCalendarEventInt(input.recurrenceCount),
    recurrenceEndsOn: toNullableClientCalendarEventDate(input.recurrenceEndsOn),
    recurrenceDays: input.recurrenceDays,
    goal: input.goal || null,
    notes: input.notes || null,
    meetingUrl: input.meetingUrl || null,
    roadmapPhaseId,
    scheduledTrainingProgramId: input.scheduledTrainingProgramId || null,
    scheduledTrainingProgramName: input.scheduledTrainingProgramName || null,
    scheduledTrainingDayName: input.scheduledTrainingDayName || null
  };
}
