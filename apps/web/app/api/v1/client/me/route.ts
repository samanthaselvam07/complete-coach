import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeClient } from "@/lib/clients/client-records";
import { serializeMealPlanAssignment } from "@/lib/nutrition/nutrition-records";
import { serializeSupplementAssignment } from "@/lib/supplementation/supplement-records";
import { serializeTrainingAssignment } from "@/lib/training/training-records";

export async function GET() {
  try {
    const actor = requireActiveClientActor(await auth());
    const [client, trainingAssignments, mealPlanAssignments, supplementPlanAssignments] = await Promise.all([
      prisma.client.findFirstOrThrow({
        where: {
          id: actor.clientId,
          organizationId: actor.organizationId,
          clientUserId: actor.userId,
          deletedAt: null
        },
        include: {
          primaryCoach: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.trainingProgramAssignment.findMany({
        where: {
          organizationId: actor.organizationId,
          clientId: actor.clientId
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [{ startsOn: "desc" }, { name: "asc" }]
      }),
      prisma.mealPlanAssignment.findMany({
        where: {
          organizationId: actor.organizationId,
          clientId: actor.clientId
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [{ startsOn: "desc" }, { name: "asc" }]
      }),
      prisma.supplementPlanAssignment.findMany({
        where: {
          organizationId: actor.organizationId,
          clientId: actor.clientId
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [{ startsOn: "desc" }, { name: "asc" }]
      })
    ]);

    return dataResponse({
      organization: {
        id: actor.organizationId,
        slug: actor.organizationSlug,
        name: actor.organizationName
      },
      client: serializeClient(client),
      trainingAssignments: trainingAssignments.map(serializeTrainingAssignment),
      mealPlanAssignments: mealPlanAssignments.map(serializeMealPlanAssignment),
      supplementPlanAssignments: supplementPlanAssignments.map(serializeSupplementAssignment)
    });
  } catch (error) {
    return handleApiError(error);
  }
}
