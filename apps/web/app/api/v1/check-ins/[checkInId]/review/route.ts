import { CheckInStatus, FormSubmissionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { reviewCheckInSchema, serializeCheckIn } from "@/lib/forms/submission-records";

interface ReviewCheckInRouteContext {
  params: Promise<{ checkInId: string }>;
}

export async function POST(request: Request, context: ReviewCheckInRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "submissions:review");
    const { checkInId } = await context.params;
    const input = reviewCheckInSchema.parse(await request.json());
    const checkIn = await prisma.checkIn.findFirst({
      where: {
        id: checkInId,
        organizationId: actor.organizationId
      }
    });

    if (!checkIn) {
      return errorResponse("not_found", "Check-in not found.", 404);
    }

    if (checkIn.status !== CheckInStatus.PENDING_REVIEW) {
      return errorResponse("invalid_state", "Only pending check-ins can be reviewed.", 409);
    }

    const reviewedAt = new Date();
    const reviewedCheckIn = await prisma.$transaction(async (tx) => {
      const updated = await tx.checkIn.update({
        where: { id: checkIn.id, organizationId: actor.organizationId },
        data: {
          status: CheckInStatus.REVIEWED,
          reviewedAt,
          reviewedByUserId: actor.userId,
          summary: input.summary,
          coachNotes: input.coachNotes
        }
      });

      if (checkIn.formSubmissionId) {
        await tx.formSubmission.update({
          where: { id: checkIn.formSubmissionId, organizationId: actor.organizationId },
          data: {
            status: FormSubmissionStatus.REVIEWED,
            reviewedAt,
            reviewedByUserId: actor.userId
          }
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "check_in.reviewed",
          targetType: "check_in",
          targetId: checkIn.id
        }
      });

      return updated;
    });

    return dataResponse(serializeCheckIn(reviewedCheckIn));
  } catch (error) {
    return handleApiError(error);
  }
}
