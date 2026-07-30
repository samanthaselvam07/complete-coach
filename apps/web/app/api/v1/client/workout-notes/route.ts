import { z } from "zod";

import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeClientNote } from "@/lib/clients/client-notes";

const workoutNotesQuerySchema = z.object({
  assignmentName: z.string().trim().min(1).max(160),
  dayName: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const createWorkoutNoteSchema = z.object({
  assignmentName: z.string().trim().min(1).max(160),
  dayName: z.string().trim().min(1).max(120),
  exerciseName: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(5000)
});

export async function GET(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const query = workoutNotesQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const prefix = buildWorkoutNotePrefix(query.assignmentName, query.dayName);
    const notes = await prisma.clientNote.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        body: {
          contains: prefix,
          mode: "insensitive"
        }
      },
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [{ noteDate: "desc" }, { createdAt: "desc" }],
      take: query.limit
    });

    return dataResponse(notes.map(serializeClientNote));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = createWorkoutNoteSchema.parse(await request.json());
    const noteDate = new Date();
    const note = await prisma.clientNote.create({
      data: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        authorUserId: actor.userId,
        noteDate: new Date(`${noteDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
        body: formatWorkoutNoteBody(input)
      },
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.workout_note_created",
        targetType: "client",
        targetId: actor.clientId,
        metadata: {
          assignmentName: input.assignmentName,
          dayName: input.dayName,
          exerciseName: input.exerciseName ?? null
        }
      }
    });

    return dataResponse(serializeClientNote(note), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function buildWorkoutNotePrefix(assignmentName: string, dayName: string) {
  return `Workout note: ${assignmentName} / ${dayName}`;
}

function formatWorkoutNoteBody(input: z.infer<typeof createWorkoutNoteSchema>) {
  const exerciseContext = input.exerciseName ? ` / ${input.exerciseName}` : "";

  return `${buildWorkoutNotePrefix(input.assignmentName, input.dayName)}${exerciseContext}\n\n${input.body}`;
}
