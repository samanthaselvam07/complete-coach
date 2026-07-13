import { randomBytes } from "node:crypto";

import { TeamInvitationStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { assertPlatformCoachSeatCapacity, PlatformLimitError } from "@/lib/platform-billing/limits";
import {
  createTeamInvitationSchema,
  getInvitationCreateData,
  hashInvitationToken,
  serializeTeamInvitation
} from "@/lib/team/team-records";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const input = createTeamInvitationSchema.parse(await request.json());
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        organizationId: actor.organizationId,
        email: input.email,
        status: TeamInvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      return errorResponse("invitation_exists", "A pending invitation already exists.", 409);
    }

    await assertPlatformCoachSeatCapacity(actor.organizationId);

    const token = randomBytes(32).toString("base64url");
    const invitation = await prisma.teamInvitation.create({
      data: getInvitationCreateData(
        actor.organizationId,
        actor.userId,
        input,
        hashInvitationToken(token),
        new Date(Date.now() + INVITATION_TTL_MS)
      )
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "membership.invited",
        targetType: "team_invitation",
        targetId: invitation.id,
        metadata: { email: input.email, role: input.role }
      }
    });
    const appUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
    const acceptanceUrl = `${appUrl}/team-invitations/accept?token=${encodeURIComponent(token)}`;
    const delivery = await sendTransactionalEmail({
      organizationId: actor.organizationId,
      toEmail: input.email,
      subject: `You have been invited to ${actor.organizationName}`,
      text: [
        `${actor.organizationName} invited you to join Complete Coach as ${input.role}.`,
        `Accept your invitation: ${acceptanceUrl}`,
        "This invitation expires in seven days."
      ].join("\n\n"),
      metadata: {
        type: "team_invitation",
        invitationId: invitation.id
      }
    });

    return dataResponse(
      {
        invitation: serializeTeamInvitation(invitation),
        deliveryStatus: delivery.status,
        ...(process.env.NODE_ENV === "production" ? {} : { token })
      },
      {
        status: 201,
        headers: { Location: `/api/v1/team-members/invitations/${invitation.id}` }
      }
    );
  } catch (error) {
    if (error instanceof PlatformLimitError) {
      return errorResponse(error.code, error.message, 409, { limit: error.limit });
    }

    return handleApiError(error);
  }
}
