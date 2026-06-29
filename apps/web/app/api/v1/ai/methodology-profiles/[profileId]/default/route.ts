import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { serializeAiMethodologyProfile } from "@/lib/ai/ai-records";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

interface SetDefaultMethodologyProfileRouteContext {
  params: Promise<{ profileId: string }>;
}

export async function POST(_request: Request, context: SetDefaultMethodologyProfileRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "ai:approve");
    const { profileId } = await context.params;

    const profile = await prisma.aiMethodologyProfile.findFirst({
      where: {
        id: profileId,
        organizationId: actor.organizationId,
        isActive: true
      }
    });

    if (!profile) {
      return errorResponse("not_found", "AI methodology profile not found.", 404);
    }

    await prisma.aiMethodologyProfile.updateMany({
      where: { organizationId: actor.organizationId, isDefault: true },
      data: { isDefault: false }
    });

    const updated = await prisma.aiMethodologyProfile.update({
      where: { id: profile.id, organizationId: actor.organizationId },
      data: { isDefault: true }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "ai.methodology_profile.default_set",
        targetType: "ai_methodology_profile",
        targetId: profile.id,
        metadata: {
          methodology: profile.methodology
        }
      }
    });

    return dataResponse(serializeAiMethodologyProfile(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
