import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { createClientSchema, serializeClient, toPrismaClientStatus } from "@/lib/clients/client-records";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";

interface ClientRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: Request, context: ClientRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    return dataResponse(serializeClient(client));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: ClientRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = createClientSchema.partial().parse(await request.json());
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
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.status ? { status: toPrismaClientStatus(input.status) } : {}),
        ...(input.packageId ? { packageId: input.packageId } : {}),
        ...(input.packageName ? { packageName: input.packageName } : {}),
        ...(input.checkInDay ? { checkInDay: input.checkInDay } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.startDate ? { startDate: new Date(`${input.startDate}T00:00:00.000Z`) } : {})
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.updated",
        targetType: "client",
        targetId: client.id
      }
    });

    return dataResponse(serializeClient(client));
  } catch (error) {
    return handleApiError(error);
  }
}
