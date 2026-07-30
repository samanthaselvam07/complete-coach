import type { InputJsonValue } from "@prisma/client/runtime/client";

import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import type { MembershipRole } from "@/lib/auth/permissions";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  clientAccountActivityQuerySchema,
  createClientAccountActivitySchema,
  serializeClientAccountActivity,
  toPrismaClientAccountActivityType
} from "@/lib/clients/client-goals-activity";
import { prisma } from "@/lib/db/prisma";

interface ClientActivityRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(request: Request, context: ClientActivityRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const query = clientAccountActivityQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const activity = await prisma.clientAccountActivityLog.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { occurredAt: "desc" },
      take: query.limit
    });

    return dataResponse(activity.map(serializeClientAccountActivity));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ClientActivityRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = createClientAccountActivitySchema.parse(await request.json());
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const activity = await prisma.clientAccountActivityLog.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        actorUserId: actor.userId,
        type: toPrismaClientAccountActivityType(input.type),
        title: input.title,
        metadata: input.metadata as InputJsonValue | undefined
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return dataResponse(serializeClientAccountActivity(activity), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function findAccessibleClient(clientId: string, organizationId: string, userId: string, role: MembershipRole) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId,
      deletedAt: null,
      ...(canViewAllClientActivity(role) ? {} : { primaryCoachUserId: userId })
    },
    select: { id: true }
  });
}

function canViewAllClientActivity(role: MembershipRole) {
  return role === "owner" || role === "admin";
}
