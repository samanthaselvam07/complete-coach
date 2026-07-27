import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildClientWhere,
  clientListQuerySchema,
  createClientSchema,
  getClientCreateData,
  getClientProfileCreateData,
  serializeClient
} from "@/lib/clients/client-records";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { assertPlatformClientCapacity, PlatformLimitError } from "@/lib/platform-billing/limits";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const query = clientListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const where = buildClientWhere(actor.organizationId, query);
    const clients = await prisma.client.findMany({
      where: canViewAllClients(actor.role)
        ? where
        : {
            ...where,
            primaryCoachUserId: actor.userId
          },
      include: {
        primaryCoach: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: query.limit
    });

    return dataResponse(clients.map(serializeClient));
  } catch (error) {
    return handleApiError(error);
  }
}

function canViewAllClients(role: string) {
  return role === "owner" || role === "admin";
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const input = createClientSchema.parse(await request.json());
    await assertPlatformClientCapacity(actor.organizationId);
    const client = await prisma.$transaction(async (tx) => {
      const createdClient = await tx.client.create({
        data: getClientCreateData(actor.organizationId, input)
      });

      const profileCreateData = getClientProfileCreateData(actor.organizationId, createdClient.id, input);

      if (profileCreateData) {
        await tx.clientProfile.upsert({
          where: { clientId: createdClient.id },
          create: profileCreateData,
          update: { dateOfBirth: profileCreateData.dateOfBirth }
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.created",
          targetType: "client",
          targetId: createdClient.id,
          metadata: {
            status: input.status,
            onboarding: input.onboarding
          }
        }
      });

      return createdClient;
    });

    return dataResponse(serializeClient(client), {
      status: 201,
      headers: { Location: `/api/v1/clients/${client.id}` }
    });
  } catch (error) {
    if (error instanceof PlatformLimitError) {
      return errorResponse(error.code, error.message, 409, { limit: error.limit });
    }

    return handleApiError(error);
  }
}
