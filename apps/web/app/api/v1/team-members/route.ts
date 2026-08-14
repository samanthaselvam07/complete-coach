import { ClientStatus, MembershipRole, TeamInvitationStatus } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeTeamInvitation, serializeTeamMember } from "@/lib/team/team-records";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "team:read");
    const [members, invitations, clientCounts, capacityProfiles] = await Promise.all([
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
      }),
      getCoachCapacityProfiles(actor.organizationId)
    ]);
    const clientCountByUserId = new Map(
      clientCounts.map((clientCount) => [clientCount.primaryCoachUserId, clientCount._count._all])
    );
    const capacityLimitByUserId = new Map(
      capacityProfiles
        .filter((profile) => typeof profile.client_capacity_limit === "number")
        .map((profile) => [profile.user_id, profile.client_capacity_limit as number])
    );

    return dataResponse({
      members: members.map((member) => {
        const activeClientCount = clientCountByUserId.get(member.userId) ?? 0;
        const capacityLimit = capacityLimitByUserId.get(member.userId) ?? getCapacityLimit(member.role);

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

function getCoachCapacityProfiles(organizationId: string) {
  return prisma.$queryRaw<Array<{ user_id: string; client_capacity_limit: number | null }>>(Prisma.sql`
    SELECT "user_id", "client_capacity_limit"
    FROM "coach_profiles"
    WHERE "organization_id" = ${organizationId}
  `);
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
