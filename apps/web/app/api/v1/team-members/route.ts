import { TeamInvitationStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeTeamInvitation, serializeTeamMember } from "@/lib/team/team-records";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "team:read");
    const [members, invitations] = await Promise.all([
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
      })
    ]);

    return dataResponse({
      members: members.map(serializeTeamMember),
      invitations: invitations.map(serializeTeamInvitation)
    });
  } catch (error) {
    return handleApiError(error);
  }
}
