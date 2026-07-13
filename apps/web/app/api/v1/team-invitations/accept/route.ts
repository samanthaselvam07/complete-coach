import { z } from "zod";

import {
  MembershipStatus,
  TeamInvitationStatus
} from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireAuthenticatedSession } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { assertPlatformTeamSeatAvailableForAcceptance, PlatformLimitError } from "@/lib/platform-billing/limits";
import { hashInvitationToken } from "@/lib/team/team-records";

const acceptInvitationSchema = z
  .object({
    token: z.string().min(32).max(512)
  })
  .strict();

export async function POST(request: Request) {
  try {
    const session = requireAuthenticatedSession(await auth());
    const input = acceptInvitationSchema.parse(await request.json());
    const invitation = await prisma.teamInvitation.findFirst({
      where: {
        tokenHash: hashInvitationToken(input.token),
        status: TeamInvitationStatus.PENDING
      }
    });

    if (!invitation || invitation.expiresAt <= new Date()) {
      return errorResponse("invitation_invalid", "Invitation is invalid or expired.", 404);
    }

    if (!session.user.email || session.user.email.toLowerCase() !== invitation.email) {
      return errorResponse(
        "invitation_email_mismatch",
        "Sign in with the email address that was invited.",
        403
      );
    }

    await assertPlatformTeamSeatAvailableForAcceptance(invitation.organizationId);

    const membership = await prisma.$transaction(async (transaction) => {
      const acceptedMembership = await transaction.organizationMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: session.user.id
          }
        },
        update: {
          role: invitation.role,
          status: MembershipStatus.ACTIVE,
          invitedByUserId: invitation.invitedByUserId,
          joinedAt: new Date()
        },
        create: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
          role: invitation.role,
          status: MembershipStatus.ACTIVE,
          invitedByUserId: invitation.invitedByUserId,
          joinedAt: new Date()
        },
        include: { user: true }
      });

      await transaction.teamInvitation.update({
        where: { id: invitation.id, organizationId: invitation.organizationId },
        data: {
          status: TeamInvitationStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      });
      await transaction.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          actorUserId: session.user.id,
          action: "membership.invitation_accepted",
          targetType: "organization_membership",
          targetId: acceptedMembership.id
        }
      });

      return acceptedMembership;
    });

    return dataResponse({
      membershipId: membership.id,
      organizationId: invitation.organizationId,
      role: membership.role.toLowerCase(),
      status: membership.status.toLowerCase()
    });
  } catch (error) {
    if (error instanceof PlatformLimitError) {
      return errorResponse(error.code, error.message, 409, { limit: error.limit });
    }

    return handleApiError(error);
  }
}
