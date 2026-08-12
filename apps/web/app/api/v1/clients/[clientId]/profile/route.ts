import { z } from "zod";

import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

const profileSchema = z.object({
  dateOfBirth: z.string().date().optional(),
  sex: z.string().trim().max(40).optional(),
  goals: z.array(z.string().trim().max(200)).optional(),
  injuries: z.array(z.string().trim().max(200)).optional(),
  medicalNotes: z.string().trim().max(5000).optional(),
  bio: z.string().trim().max(5000).optional(),
  waterTargetLitres: z.number().min(0).max(20).nullable().optional(),
  stepTarget: z.number().int().min(0).max(100000).nullable().optional(),
  trainingLogTargetDays: z.number().int().min(0).max(7).nullable().optional(),
  weightMeasurement: z.string().trim().max(80).nullable().optional(),
  checkInFrequency: z.string().trim().max(40).nullable().optional(),
  checkInDays: z.array(z.string().trim().max(20)).max(7).nullable().optional(),
  defaultExerciseMetricUnit: z.string().trim().max(40).nullable().optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(160),
      phone: z.string().trim().max(40)
    })
    .optional()
});

interface ClientProfileRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: Request, context: ClientProfileRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:pii:read");
    const { clientId } = await context.params;
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      },
      include: { profile: true }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.profile_read",
        targetType: "client",
        targetId: client.id
      }
    });

    return dataResponse(client.profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: ClientProfileRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = profileSchema.parse(await request.json());
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

    const checkInDays = input.checkInDays === null ? Prisma.DbNull : input.checkInDays;
    const profile = await prisma.clientProfile.upsert({
      where: { clientId },
      update: {
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : undefined,
        sex: input.sex,
        goals: input.goals,
        injuries: input.injuries,
        medicalNotes: input.medicalNotes,
        bio: input.bio,
        waterTargetLitres: input.waterTargetLitres,
        stepTarget: input.stepTarget,
        trainingLogTargetDays: input.trainingLogTargetDays,
        weightMeasurement: input.weightMeasurement,
        checkInFrequency: input.checkInFrequency,
        checkInDays,
        defaultExerciseMetricUnit: input.defaultExerciseMetricUnit,
        emergencyContact: input.emergencyContact
      },
      create: {
        organizationId: actor.organizationId,
        clientId,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : undefined,
        sex: input.sex,
        goals: input.goals,
        injuries: input.injuries,
        medicalNotes: input.medicalNotes,
        bio: input.bio,
        waterTargetLitres: input.waterTargetLitres,
        stepTarget: input.stepTarget,
        trainingLogTargetDays: input.trainingLogTargetDays,
        weightMeasurement: input.weightMeasurement,
        checkInFrequency: input.checkInFrequency,
        checkInDays,
        defaultExerciseMetricUnit: input.defaultExerciseMetricUnit,
        emergencyContact: input.emergencyContact
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.profile_updated",
        targetType: "client",
        targetId: client.id
      }
    });

    return dataResponse(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
