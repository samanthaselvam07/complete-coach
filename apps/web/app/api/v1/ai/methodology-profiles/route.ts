import type { InputJsonValue } from "@prisma/client/runtime/client";

import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import {
  aiMethodologyProfileCreateSchema,
  serializeAiMethodologyProfile
} from "@/lib/ai/ai-records";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request?: Request) {
  try {
    const actor = requireActiveActor(await auth(), "ai:read");
    const profiles = await prisma.aiMethodologyProfile.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    return dataResponse(profiles.map(serializeAiMethodologyProfile));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "ai:approve");
    const body = aiMethodologyProfileCreateSchema.parse(await request.json());

    if (body.isDefault) {
      await prisma.aiMethodologyProfile.updateMany({
        where: { organizationId: actor.organizationId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const profile = await prisma.aiMethodologyProfile.create({
      data: {
        organizationId: actor.organizationId,
        name: body.name,
        methodology: body.methodology,
        description: body.description || null,
        tone: body.tone || null,
        principlesJson: body.principles as InputJsonValue,
        checkInSectionsJson: body.checkInSections as InputJsonValue,
        redFlagRulesJson: body.redFlagRules as InputJsonValue,
        adjustmentRulesJson: body.adjustmentRules as InputJsonValue,
        forbiddenRecommendationsJson: body.forbiddenRecommendations as InputJsonValue,
        isDefault: body.isDefault,
        createdByUserId: actor.userId
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "ai.methodology_profile.created",
        targetType: "ai_methodology_profile",
        targetId: profile.id,
        metadata: {
          isDefault: profile.isDefault,
          methodology: profile.methodology,
          principlesCount: body.principles.length,
          checkInSectionsCount: body.checkInSections.length,
          redFlagRulesCount: body.redFlagRules.length,
          adjustmentRulesCount: body.adjustmentRules.length,
          forbiddenRecommendationsCount: body.forbiddenRecommendations.length
        }
      }
    });

    return dataResponse(serializeAiMethodologyProfile(profile), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
