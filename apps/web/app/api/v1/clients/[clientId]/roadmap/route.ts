import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import type { MembershipRole } from "@/lib/auth/permissions";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  createRoadmapEntrySchema,
  serializeRoadmapItem,
  serializeRoadmapPhase,
  toRoadmapDate
} from "@/lib/clients/client-roadmap";
import { prisma } from "@/lib/db/prisma";

interface ClientRoadmapRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: Request, context: ClientRoadmapRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const phases = await prisma.clientRoadmapPhase.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId
      },
      include: {
        items: {
          orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }]
    });

    return dataResponse(phases.map(serializeRoadmapPhase));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ClientRoadmapRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = createRoadmapEntrySchema.parse(await request.json());
    const client = await findAccessibleClient(clientId, actor.organizationId, actor.userId, actor.role);

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (input.kind === "phase") {
      const phase = await prisma.clientRoadmapPhase.create({
        data: {
          organizationId: actor.organizationId,
          clientId,
          name: input.name,
          startDate: toRoadmapDate(input.startDate),
          endDate: toRoadmapDate(input.endDate)
        },
        include: { items: true }
      });

      await prisma.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.roadmap_phase_created",
          targetType: "client",
          targetId: client.id,
          metadata: { phaseId: phase.id, startDate: input.startDate, endDate: input.endDate }
        }
      });

      return dataResponse(serializeRoadmapPhase(phase), { status: 201 });
    }

    const phase = await prisma.clientRoadmapPhase.findFirst({
      where: {
        id: input.phaseId,
        organizationId: actor.organizationId,
        clientId
      }
    });

    if (!phase) {
      return errorResponse("not_found", "Roadmap phase not found.", 404);
    }

    const item = await prisma.clientRoadmapItem.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        phaseId: phase.id,
        title: input.title,
        type: input.type,
        eventDate: toRoadmapDate(input.date),
        notes: input.notes || null
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.roadmap_item_created",
        targetType: "client",
        targetId: client.id,
        metadata: { phaseId: phase.id, itemId: item.id, type: input.type }
      }
    });

    return dataResponse(serializeRoadmapItem(item), { status: 201 });
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
      ...(canViewAllClientRoadmap(role) ? {} : { primaryCoachUserId: userId })
    }
  });
}

function canViewAllClientRoadmap(role: MembershipRole) {
  return role === "owner" || role === "admin";
}
