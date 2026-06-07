import { ClientStatus, MembershipRole, TeamInvitationStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeTeamInvitation, serializeTeamMember } from "@/lib/team/team-records";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "team:read");
    const [members, invitations, clientCounts] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { organizationId: actor.organizationId },
        include: { user: true },
        orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }]
      }),
      prisma.teamInvitation.findMany({
        where: {
          organizationId: actor.organizationId,
          status: TeamInvitationStatus.PENDING
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.client.groupBy({
        by: ["primaryCoachUserId"],
        where: {
          organizationId: actor.organizationId,
          status: ClientStatus.ACTIVE,
          deletedAt: null,
          primaryCoachUserId: { not: null }
        },
        _count: { _all: true }
      })
    ]);
    const clientCountByUserId = new Map(
      clientCounts.map((clientCount) => [clientCount.primaryCoachUserId, clientCount._count._all])
    );

    return dataResponse({
      members: members.map((member) => {
        const activeClientCount = clientCountByUserId.get(member.userId) ?? 0;
        const capacityLimit = getCapacityLimit(member.role);

        return {
          ...serializeTeamMember(member),
          activeClientCount,
          capacityLimit,
          capacityPercent: capacityLimit > 0 ? Math.min(Math.round((activeClientCount / capacityLimit) * 100), 100) : 0
        };
      }),
      invitations: invitations.map(serializeTeamInvitation)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getCapacityLimit(role: MembershipRole) {
  switch (role) {
    case MembershipRole.OWNER:
    case MembershipRole.ADMIN:
    case MembershipRole.COACH:
      return 40;
    default:
      return 0;
  }
}
