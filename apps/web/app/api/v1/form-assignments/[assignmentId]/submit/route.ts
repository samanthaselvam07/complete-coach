import type { InputJsonValue } from "@prisma/client/runtime/client";

import { CheckInStatus, FormAssignmentStatus, FormSubmissionStatus, FormType } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { extractMeasurementsFromSubmission } from "@/lib/forms/metric-extraction";
import { FormDefinitionSchema } from "@/lib/forms/schema";
import { serializeSubmission, submitAssignmentSchema } from "@/lib/forms/submission-records";

interface SubmitAssignmentRouteContext {
  params: Promise<{ assignmentId: string }>;
}

export async function POST(request: Request, context: SubmitAssignmentRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "submissions:read");
    const { assignmentId } = await context.params;
    const input = submitAssignmentSchema.parse(await request.json());
    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId: actor.organizationId
      },
      include: {
        client: true,
        form: true,
        formVersion: true
      }
    });

    if (!assignment) {
      return errorResponse("not_found", "Form assignment not found.", 404);
    }

    if (assignment.status === FormAssignmentStatus.CANCELLED) {
      return errorResponse("invalid_state", "Cancelled assignments cannot be submitted.", 409);
    }

    const definition = FormDefinitionSchema.parse(assignment.formVersion.schemaJson);
    const submittedAt = new Date();
    let measurements;

    try {
      measurements = extractMeasurementsFromSubmission({
        answers: input.answers,
        clientId: assignment.clientId,
        definition,
        organizationId: actor.organizationId,
        sourceId: "pending",
        submittedAt
      });
    } catch {
      return errorResponse("validation_failed", "Metric answers must be valid finite numbers.", 422);
    }

    const submission = await prisma.$transaction(async (tx) => {
      const createdSubmission = await tx.formSubmission.create({
        data: {
          organizationId: actor.organizationId,
          formId: assignment.formId,
          formVersionId: assignment.formVersionId,
          assignmentId: assignment.id,
          clientId: assignment.clientId,
          submittedByUserId: actor.userId,
          answersJson: input.answers as InputJsonValue,
          status: FormSubmissionStatus.SUBMITTED,
          submittedAt
        }
      });

      await tx.formAssignment.update({
        where: { id: assignment.id, organizationId: actor.organizationId },
        data: {
          status: FormAssignmentStatus.SUBMITTED,
          completedAt: submittedAt
        }
      });

      if (assignment.form.type === FormType.CHECK_IN) {
        await tx.checkIn.create({
          data: {
            organizationId: actor.organizationId,
            clientId: assignment.clientId,
            formSubmissionId: createdSubmission.id,
            type: "check-in",
            status: CheckInStatus.PENDING_REVIEW,
            dueAt: assignment.dueAt,
            submittedAt
          }
        });
      }

      for (const measurement of measurements) {
        await tx.clientMeasurement.upsert({
          where: {
            organizationId_sourceType_sourceId_metricKey: {
              organizationId: actor.organizationId,
              sourceType: "form_submission",
              sourceId: createdSubmission.id,
              metricKey: measurement.metricKey
            }
          },
          create: {
            organizationId: actor.organizationId,
            clientId: assignment.clientId,
            sourceType: "form_submission",
            sourceId: createdSubmission.id,
            measuredAt: submittedAt,
            metricKey: measurement.metricKey,
            metricValue: measurement.metricValue,
            unit: measurement.unit,
            metadata: measurement.metadata
          },
          update: {
            measuredAt: submittedAt,
            metricValue: measurement.metricValue,
            unit: measurement.unit,
            metadata: measurement.metadata
          }
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "form.submission.created",
          targetType: "form_submission",
          targetId: createdSubmission.id,
          metadata: {
            formId: assignment.formId,
            formVersionId: assignment.formVersionId,
            assignmentId: assignment.id,
            extractedMetricCount: measurements.length
          }
        }
      });

      if (measurements.length > 0) {
        await tx.auditLog.create({
          data: {
            organizationId: actor.organizationId,
            actorUserId: actor.userId,
            action: "metric.extracted",
            targetType: "form_submission",
            targetId: createdSubmission.id,
            metadata: {
              metricKeys: measurements.map((measurement) => measurement.metricKey)
            }
          }
        });
      }

      return createdSubmission;
    });

    return dataResponse(serializeSubmission(submission), {
      status: 201,
      headers: { Location: `/api/v1/form-submissions/${submission.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
