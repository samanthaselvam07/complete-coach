import { z } from "zod";

import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { canViewAllClientNotes } from "@/lib/clients/client-notes";
import { prisma } from "@/lib/db/prisma";

interface ClientWorkoutSessionsRouteContext {
  params: Promise<{ clientId: string }>;
}

const workoutSessionsQuerySchema = z.object({
  assignmentName: z.string().trim().min(1).max(160).optional(),
  dayName: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export async function GET(request: Request, context: ClientWorkoutSessionsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const query = workoutSessionsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
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

    const sessions = await prisma.clientWorkoutSession.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId,
        ...(query.assignmentName ? { assignmentName: query.assignmentName } : {}),
        ...(query.dayName ? { dayName: query.dayName } : {})
      },
      orderBy: [{ completedAt: "desc" }],
      take: query.limit
    });

    return dataResponse(sessions.map(serializeWorkoutSession));
  } catch (error) {
    return handleApiError(error);
  }
}

function serializeWorkoutSession(record: {
  id: string;
  assignmentId: string | null;
  assignmentName: string;
  dayId: string | null;
  dayName: string;
  startedAt: Date | string;
  completedAt: Date | string;
  durationSeconds: number;
  exercisesJson: unknown;
  personalBestsJson: unknown;
  createdAt: Date | string;
}) {
  return {
    id: record.id,
    assignmentId: record.assignmentId,
    assignmentName: record.assignmentName,
    dayId: record.dayId,
    dayName: record.dayName,
    startedAt: toIsoString(record.startedAt),
    completedAt: toIsoString(record.completedAt),
    durationSeconds: record.durationSeconds,
    exercises: record.exercisesJson,
    personalBests: record.personalBestsJson ?? [],
    createdAt: toIsoString(record.createdAt)
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
