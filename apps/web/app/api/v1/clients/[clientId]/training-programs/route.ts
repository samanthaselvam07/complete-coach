import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeTrainingAssignment } from "@/lib/training/training-records";

interface ClientTrainingRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: Request, context: ClientTrainingRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "training:read");
    const { clientId } = await context.params;
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        ...(actor.role === "client" ? { clientUserId: actor.userId } : {}),
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const assignments = await prisma.trainingProgramAssignment.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId
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
    });

    return dataResponse(assignments.map(serializeTrainingAssignment));
  } catch (error) {
    return handleApiError(error);
  }
}
