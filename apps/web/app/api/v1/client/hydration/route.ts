import { z } from "zod";

import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

const hydrationQuerySchema = z.object({
  date: z.string().date().optional()
});

const updateHydrationSchema = z.object({
  date: z.string().date().optional(),
  amountMl: z.number().int().min(0).max(10_000)
});

const waterMetricKey = "water_intake";
const waterSourceType = "client_hydration";

export async function GET(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const query = hydrationQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const date = query.date ?? getTodayDateValue();
    await assertActiveClient(actor);

    const measurement = await prisma.clientMeasurement.findFirst({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        sourceType: waterSourceType,
        sourceId: getWaterSourceId(date),
        metricKey: waterMetricKey
      }
    });

    return dataResponse({
      date,
      hydrationMl: measurement ? Number(measurement.metricValue) : 0
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = updateHydrationSchema.parse(await request.json());
    const date = input.date ?? getTodayDateValue();
    await assertActiveClient(actor);

    const hydration = await prisma.$transaction(async (tx) => {
      const existingMeasurement = await tx.clientMeasurement.findFirst({
        where: {
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          sourceType: waterSourceType,
          sourceId: getWaterSourceId(date),
          metricKey: waterMetricKey
        }
      });
      const nextHydrationMl = Math.min(Number(existingMeasurement?.metricValue ?? 0) + input.amountMl, 20_000);

      const measurement = await tx.clientMeasurement.upsert({
        where: {
          organizationId_sourceType_sourceId_metricKey: {
            organizationId: actor.organizationId,
            sourceType: waterSourceType,
            sourceId: getWaterSourceId(date),
            metricKey: waterMetricKey
          }
        },
        create: {
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          sourceType: waterSourceType,
          sourceId: getWaterSourceId(date),
          measuredAt: new Date(`${date}T00:00:00.000Z`),
          metricKey: waterMetricKey,
          metricValue: nextHydrationMl,
          unit: "ml",
          metadata: { date }
        },
        update: {
          measuredAt: new Date(`${date}T00:00:00.000Z`),
          metricValue: nextHydrationMl,
          unit: "ml",
          metadata: { date }
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.hydration_logged",
          targetType: "client_measurement",
          targetId: measurement.id,
          metadata: {
            date,
            amountMl: input.amountMl,
            hydrationMl: nextHydrationMl
          }
        }
      });

      return {
        date,
        hydrationMl: nextHydrationMl
      };
    });

    return dataResponse(hydration);
  } catch (error) {
    return handleApiError(error);
  }
}

async function assertActiveClient(actor: { clientId: string; organizationId: string; userId: string }) {
  await prisma.client.findFirstOrThrow({
    where: {
      id: actor.clientId,
      organizationId: actor.organizationId,
      clientUserId: actor.userId,
      deletedAt: null
    },
    select: { id: true }
  });
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getWaterSourceId(date: string) {
  return `hydration:${date}`;
}
