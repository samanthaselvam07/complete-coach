import { CheckInStatus, FormAssignmentStatus, FormSubmissionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeCheckIn } from "@/lib/forms/submission-records";

interface CompleteCheckInRouteContext {
  params: Promise<{ checkInId: string }>;
}

export async function POST(_request: Request, context: CompleteCheckInRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "submissions:review");
    const { checkInId } = await context.params;
    const checkIn = await prisma.checkIn.findFirst({
      where: {
        id: checkInId,
        organizationId: actor.organizationId
      },
      include: {
        formSubmission: true
      }
    });

    if (!checkIn) {
      return errorResponse("not_found", "Check-in not found.", 404);
    }

    if (checkIn.status === CheckInStatus.COMPLETED) {
      return errorResponse("invalid_state", "Check-in is already complete.", 409);
    }

    const completedAt = new Date();
    const completedCheckIn = await prisma.$transaction(async (tx) => {
      const updated = await tx.checkIn.update({
        where: { id: checkIn.id, organizationId: actor.organizationId },
        data: {
          status: CheckInStatus.COMPLETED,
          reviewedAt: checkIn.reviewedAt ?? completedAt,
          reviewedByUserId: checkIn.reviewedByUserId ?? actor.userId
        }
      });

      if (checkIn.formSubmissionId) {
        await tx.formSubmission.update({
          where: { id: checkIn.formSubmissionId, organizationId: actor.organizationId },
          data: {
            status: FormSubmissionStatus.COMPLETED,
            reviewedAt: checkIn.formSubmission?.reviewedAt ?? completedAt,
            reviewedByUserId: checkIn.formSubmission?.reviewedByUserId ?? actor.userId
          }
        });

        if (checkIn.formSubmission?.assignmentId) {
          await tx.formAssignment.update({
            where: { id: checkIn.formSubmission.assignmentId, organizationId: actor.organizationId },
            data: {
              status: FormAssignmentStatus.COMPLETED,
              completedAt
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "check_in.completed",
          targetType: "check_in",
          targetId: checkIn.id
        }
      });

      return updated;
    });

    return dataResponse(serializeCheckIn(completedCheckIn));
  } catch (error) {
    return handleApiError(error);
  }
}
