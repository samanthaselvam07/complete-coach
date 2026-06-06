import { SocialConnectionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeSocialConnection } from "@/lib/social/social-records";

interface SocialConnectionRouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function DELETE(_request: Request, context: SocialConnectionRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const { connectionId } = await context.params;
    const existingConnection = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        organizationId: actor.organizationId
      }
    });

    if (!existingConnection) {
      return errorResponse("not_found", "Social connection not found.", 404);
    }

    const connection = await prisma.socialConnection.update({
      where: { id: connectionId },
      data: {
        status: SocialConnectionStatus.REVOKED,
        revokedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "social.connection.revoked",
        targetType: "social_connection",
        targetId: connection.id,
        metadata: {
          provider: connection.provider,
          accountName: connection.accountName
        }
      }
    });

    return dataResponse(serializeSocialConnection(connection));
  } catch (error) {
    return handleApiError(error);
  }
}
