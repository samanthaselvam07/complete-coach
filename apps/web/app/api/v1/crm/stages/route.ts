import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  getDefaultCrmStages,
  getDefaultStageForSlug,
  saveCrmStagesSchema,
  serializeCrmStage
} from "@/lib/crm/stage-records";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const stages = await prisma.crmStage.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    });

    return dataResponse(stages.length ? stages.map(serializeCrmStage) : getDefaultCrmStages());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const input = saveCrmStagesSchema.parse(await request.json());
    const incomingSlugs = input.stages.map((stage) => stage.id);

    const stages = await prisma.$transaction(async (tx) => {
      await tx.crmStage.deleteMany({
        where: {
          organizationId: actor.organizationId,
          slug: { notIn: incomingSlugs }
        }
      });

      await Promise.all(
        input.stages.map((stage, index) =>
          tx.crmStage.upsert({
            where: {
              organizationId_slug: {
                organizationId: actor.organizationId,
                slug: stage.id
              }
            },
            create: {
              organizationId: actor.organizationId,
              slug: stage.id,
              title: stage.title,
              color: stage.color,
              position: stage.position ?? index,
              defaultStage: getDefaultStageForSlug(stage.id)
            },
            update: {
              title: stage.title,
              color: stage.color,
              position: stage.position ?? index,
              defaultStage: getDefaultStageForSlug(stage.id)
            }
          })
        )
      );

      return tx.crmStage.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }]
      });
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "crm.stages.updated",
        targetType: "crm_stage",
        metadata: { stageCount: stages.length }
      }
    });

    return dataResponse(stages.map(serializeCrmStage));
  } catch (error) {
    return handleApiError(error);
  }
}
