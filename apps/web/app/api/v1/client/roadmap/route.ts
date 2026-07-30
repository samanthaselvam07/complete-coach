import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { serializeRoadmapPhase } from "@/lib/clients/client-roadmap";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const actor = requireActiveClientActor(await auth());
    const phases = await prisma.clientRoadmapPhase.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId
      },
      include: {
        items: {
          orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }]
    });

    return dataResponse(phases.map(serializeRoadmapPhase));
  } catch (error) {
    return handleApiError(error);
  }
}
