import type { InputJsonValue } from "@prisma/client/runtime/client";
import { z } from "zod";

import { ClientActivityLogDomain, ClientActivityLogStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import {
  buildClientActivityLogSummary,
  getClientActivityLogDateRange,
  toDateOnly
} from "@/lib/clients/client-activity-logs";
import { prisma } from "@/lib/db/prisma";

const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1).max(100),
  reps: z.string().trim().max(80).optional(),
  weightKg: z.number().min(0).max(2000).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  completed: z.boolean()
});

const workoutExerciseSchema = z.object({
  exerciseId: z.string().trim().max(160).nullable().optional(),
  exerciseName: z.string().trim().min(1).max(160),
  prescribedSets: z.string().trim().max(40).nullable().optional(),
  prescribedReps: z.string().trim().max(80).nullable().optional(),
  prescribedRpe: z.string().trim().max(40).nullable().optional(),
  prescribedRir: z.string().trim().max(40).nullable().optional(),
  prescribedRestSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  sets: z.array(workoutSetSchema).max(100)
});

const personalBestSchema = z.object({
  exerciseName: z.string().trim().min(1).max(160),
  setNumber: z.number().int().min(1).max(100),
  weightKg: z.number().min(0).max(2000),
  previousBestKg: z.number().min(0).max(2000)
});

const createWorkoutSessionSchema = z.object({
  assignmentId: z.string().trim().max(160).nullable().optional(),
  assignmentName: z.string().trim().min(1).max(160),
  dayId: z.string().trim().max(160).nullable().optional(),
  dayName: z.string().trim().min(1).max(120),
  startedAt: z.string().datetime(),
  durationSeconds: z.number().int().min(0).max(86_400),
  exercises: z.array(workoutExerciseSchema).min(1).max(100),
  personalBests: z.array(personalBestSchema).max(100).default([])
});

const workoutSessionsQuerySchema = z.object({
  assignmentName: z.string().trim().min(1).max(160).optional(),
  dayName: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export async function GET(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const query = workoutSessionsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const sessions = await prisma.clientWorkoutSession.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
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

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = createWorkoutSessionSchema.parse(await request.json());
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
    const completedAt = new Date();
    const logDate = toDateOnly(completedAt.toISOString().slice(0, 10));

    const { session, summary } = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.clientWorkoutSession.create({
        data: {
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          assignmentId: input.assignmentId ?? null,
          assignmentName: input.assignmentName,
          dayId: input.dayId ?? null,
          dayName: input.dayName,
          startedAt: new Date(input.startedAt),
          completedAt,
          durationSeconds: input.durationSeconds,
          exercisesJson: input.exercises as InputJsonValue,
          personalBestsJson: input.personalBests as InputJsonValue
        }
      });

      await tx.clientActivityLog.upsert({
        where: {
          organizationId_clientId_domain_logDate: {
            organizationId: actor.organizationId,
            clientId: actor.clientId,
            domain: ClientActivityLogDomain.TRAINING,
            logDate
          }
        },
        create: {
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          domain: ClientActivityLogDomain.TRAINING,
          logDate,
          status: ClientActivityLogStatus.COMPLETED,
          sourceType: "workout_session",
          sourceId: createdSession.id,
          notes: `${input.assignmentName} / ${input.dayName}`
        },
        update: {
          status: ClientActivityLogStatus.COMPLETED,
          sourceType: "workout_session",
          sourceId: createdSession.id,
          notes: `${input.assignmentName} / ${input.dayName}`
        }
      });

      const { dateFrom, dateTo } = getClientActivityLogDateRange({ days: 7 }, completedAt);
      const logs = await tx.clientActivityLog.findMany({
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
      const nextSummary = buildClientActivityLogSummary(logs, dateFrom, dateTo, {
        trainingLogTargetDays: client.profile?.trainingLogTargetDays
      });

      await tx.client.update({
        where: { id: actor.clientId, organizationId: actor.organizationId },
        data: { compliance: nextSummary.complianceScore }
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.workout_session_completed",
          targetType: "client_workout_session",
          targetId: createdSession.id,
          metadata: {
            assignmentName: input.assignmentName,
            dayName: input.dayName,
            exerciseCount: input.exercises.length,
            personalBestCount: input.personalBests.length
          }
        }
      });

      return { session: createdSession, summary: nextSummary };
    });

    return dataResponse({ session: serializeWorkoutSession(session), summary }, { status: 201 });
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
