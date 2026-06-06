import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getMembershipUpdateData,
  serializeTeamMember,
  updateTeamMemberSchema
} from "@/lib/team/team-records";

interface TeamMemberRouteContext {
  params: Promise<{ membershipId: string }>;
}

export async function PATCH(request: Request, context: TeamMemberRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const { membershipId } = await context.params;
    const input = updateTeamMemberSchema.parse(await request.json());
    const membership = await findMembership(actor.organizationId, membershipId);

    if (!membership) {
      return errorResponse("not_found", "Team member not found.", 404);
    }

    if (membership.role === MembershipRole.OWNER && input.role) {
      const ownerCount = await countActiveOwners(actor.organizationId);

      if (ownerCount <= 1) {
        return errorResponse("last_owner", "The last active owner cannot be demoted.", 409);
      }
    }

    const updatedMembership = await prisma.organizationMembership.update({
      where: { id: membershipId },
      data: getMembershipUpdateData(input),
      include: { user: true }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: input.role ? "membership.role_changed" : "membership.status_changed",
        targetType: "organization_membership",
        targetId: membershipId,
        metadata: {
          previousRole: membership.role.toLowerCase(),
          previousStatus: membership.status.toLowerCase(),
          ...input
        }
      }
    });

    return dataResponse(serializeTeamMember(updatedMembership));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: TeamMemberRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const { membershipId } = await context.params;
    const membership = await findMembership(actor.organizationId, membershipId);

    if (!membership) {
      return errorResponse("not_found", "Team member not found.", 404);
    }

    if (membership.role === MembershipRole.OWNER) {
      const ownerCount = await countActiveOwners(actor.organizationId);

      if (ownerCount <= 1) {
        return errorResponse("last_owner", "The last active owner cannot be removed.", 409);
      }
    }

    await prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.REMOVED }
    });
    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "membership.removed",
        targetType: "organization_membership",
        targetId: membershipId
      }
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

function findMembership(organizationId: string, membershipId: string) {
  return prisma.organizationMembership.findFirst({
    where: { id: membershipId, organizationId },
    include: { user: true }
  });
}

function countActiveOwners(organizationId: string) {
  return prisma.organizationMembership.count({
    where: {
      organizationId,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE
    }
  });
}
