import { auth } from "@/auth";
import { AiOutputStatus } from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { rejectRecommendationSchema, serializeAiOutput } from "@/lib/ai/ai-records";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

interface RejectRecommendationRouteContext {
  params: Promise<{ recommendationId: string }>;
}

export async function POST(request: Request, context: RejectRecommendationRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "ai:approve");
    const { recommendationId } = await context.params;
    const body = rejectRecommendationSchema.parse(await request.json());

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
      return errorResponse("invalid_state", "Only pending AI recommendations can be rejected.", 409);
    }

    const updated = await prisma.aiOutput.update({
      where: { id: recommendation.id, organizationId: actor.organizationId },
      data: {
        status: AiOutputStatus.REJECTED,
        rejectedByUserId: actor.userId,
        rejectedAt: new Date(),
        rejectionReason: body.reason
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "ai.recommendation.rejected",
        targetType: "ai_output",
        targetId: recommendation.id,
        metadata: {
          type: recommendation.type,
          clientId: recommendation.clientId,
          sourceTargetType: recommendation.targetType,
          sourceTargetId: recommendation.targetId,
          reasonLength: body.reason.length
        }
      }
    });

    return dataResponse(serializeAiOutput(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
