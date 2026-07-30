import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import type { MembershipRole } from "@/lib/auth/permissions";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  createClientGoalSchema,
  clientGoalsQuerySchema,
  serializeClientGoal,
  toClientGoalDate
} from "@/lib/clients/client-goals-activity";
import { prisma } from "@/lib/db/prisma";

interface ClientGoalsRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(request: Request, context: ClientGoalsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const query = clientGoalsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const goals = await prisma.clientGoal.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId
      },
      include: {
        roadmapPhase: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
      take: query.limit
    });

    return dataResponse(goals.map(serializeClientGoal));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ClientGoalsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = createClientGoalSchema.parse(await request.json());
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (input.roadmapPhaseId) {
      const phase = await prisma.clientRoadmapPhase.findFirst({
        where: {
          id: input.roadmapPhaseId,
          organizationId: actor.organizationId,
          clientId
        },
        select: { id: true }
      });

      if (!phase) {
        return errorResponse("not_found", "Roadmap phase not found.", 404);
      }
    }

    const goal = await prisma.clientGoal.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        roadmapPhaseId: input.roadmapPhaseId ?? null,
        title: input.title,
        targetDate: toClientGoalDate(input.targetDate),
        notes: input.notes || null
      },
      include: {
        roadmapPhase: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await prisma.clientAccountActivityLog.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        actorUserId: actor.userId,
        type: "CLIENT_GOAL_CREATED",
        title: `Goal added: ${goal.title}`,
        metadata: {
          goalId: goal.id,
          targetDate: input.targetDate,
          roadmapPhaseId: input.roadmapPhaseId ?? null
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.goal_created",
        targetType: "client",
        targetId: client.id,
        metadata: { goalId: goal.id, targetDate: input.targetDate }
      }
    });

    return dataResponse(serializeClientGoal(goal), { status: 201 });
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
      ...(canViewAllClientGoals(role) ? {} : { primaryCoachUserId: userId })
    },
    select: { id: true }
  });
}

function canViewAllClientGoals(role: MembershipRole) {
  return role === "owner" || role === "admin";
}
