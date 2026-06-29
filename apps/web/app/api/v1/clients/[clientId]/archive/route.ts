import { ClientStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { serializeClient } from "@/lib/clients/client-records";
import { prisma } from "@/lib/db/prisma";

interface ClientArchiveRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function POST(_request: Request, context: ClientArchiveRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingClient) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const client = await prisma.client.update({
      where: { id: clientId, organizationId: actor.organizationId },
      data: {
        status: ClientStatus.ARCHIVED,
        archivedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.archived",
        targetType: "client",
        targetId: client.id
      }
    });

    return dataResponse(serializeClient(client));
  } catch (error) {
    return handleApiError(error);
  }
}
