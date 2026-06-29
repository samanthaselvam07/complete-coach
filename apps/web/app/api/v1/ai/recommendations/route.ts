import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  aiRecommendationsQuerySchema,
  serializeAiOutput,
  toPrismaAiOutputType,
  toPrismaAiOutputStatus
} from "@/lib/ai/ai-records";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "ai:read");
    const url = new URL(request.url);
    const query = aiRecommendationsQuerySchema.parse(Object.fromEntries(url.searchParams));

    const outputs = await prisma.aiOutput.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
        ...(query.type ? { type: toPrismaAiOutputType(query.type) } : {}),
        ...(query.status ? { status: toPrismaAiOutputStatus(query.status) } : {})
      },
      include: {
        generation: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: query.limit
    });

    return dataResponse(outputs.map(serializeAiOutput));
  } catch (error) {
    return handleApiError(error);
  }
}
