import { auth } from "@/auth";
import { AiOutputStatus } from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { serializeAiOutput } from "@/lib/ai/ai-records";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

interface ApproveRecommendationRouteContext {
  params: Promise<{ recommendationId: string }>;
}

export async function POST(_request: Request, context: ApproveRecommendationRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "ai:approve");
    const { recommendationId } = await context.params;

    const recommendation = await prisma.aiOutput.findFirst({
      where: {
        id: recommendationId,
        organizationId: actor.organizationId
      }
    });

    if (!recommendation) {
      return errorResponse("not_found", "AI recommendation not found.", 404);
    }

    if (recommendation.status !== AiOutputStatus.PENDING_APPROVAL) {
      return errorResponse("invalid_state", "Only pending AI recommendations can be approved.", 409);
    }

    const updated = await prisma.aiOutput.update({
      where: { id: recommendation.id },
      data: {
        status: AiOutputStatus.APPROVED,
        approvedByUserId: actor.userId,
        approvedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "ai.recommendation.approved",
        targetType: "ai_output",
        targetId: recommendation.id,
        metadata: {
          type: recommendation.type,
          clientId: recommendation.clientId,
          sourceTargetType: recommendation.targetType,
          sourceTargetId: recommendation.targetId
        }
      }
    });

    return dataResponse(serializeAiOutput(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
