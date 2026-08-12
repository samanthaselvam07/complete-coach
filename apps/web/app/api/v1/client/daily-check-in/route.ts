import type { InputJsonValue } from "@prisma/client/runtime/client";

import {
  CheckInStatus,
  FormAssignmentStatus,
  FormSubmissionStatus,
  FormType
} from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { extractMeasurementsFromSubmission } from "@/lib/forms/metric-extraction";
import { FormDefinitionSchema } from "@/lib/forms/schema";
import { serializeAssignment, serializeSubmission, submitAssignmentSchema } from "@/lib/forms/submission-records";

type CheckInAssignmentKind = "daily" | "weekly";

export async function GET(request: Request = new Request("http://test.local/api/v1/client/daily-check-in")) {
  try {
    const actor = requireActiveClientActor(await auth());
    const assignment = await getCurrentAssignment(actor.organizationId, actor.clientId, getAssignmentKind(request));

    if (!assignment) {
      return dataResponse(null);
    }

    return dataResponse(serializeAssignment(assignment));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = submitAssignmentSchema.parse(await request.json());
    const assignment = await getCurrentAssignment(actor.organizationId, actor.clientId, getAssignmentKind(request));

    if (!assignment) {
      return errorResponse("not_found", "No assigned check-in form was found.", 404);
    }

    if (assignment.status === FormAssignmentStatus.CANCELLED) {
      return errorResponse("invalid_state", "Cancelled assignments cannot be submitted.", 409);
    }

    const definitionResult = FormDefinitionSchema.safeParse(assignment.formVersion.schemaJson);
    const submittedAt = new Date();
    let measurements: ReturnType<typeof extractMeasurementsFromSubmission> = [];

    if (definitionResult.success) {
      try {
        measurements = extractMeasurementsFromSubmission({
          answers: input.answers,
          clientId: actor.clientId,
          definition: definitionResult.data,
          organizationId: actor.organizationId,
          sourceId: "pending",
          submittedAt
        });
      } catch {
        return errorResponse("validation_failed", "Metric answers must be valid finite numbers.", 422);
      }
    }

    const submission = await prisma.$transaction(async (tx) => {
      const createdSubmission = await tx.formSubmission.create({
        data: {
          organizationId: actor.organizationId,
          formId: assignment.formId,
          formVersionId: assignment.formVersionId,
          assignmentId: assignment.id,
          clientId: actor.clientId,
          submittedByUserId: actor.userId,
          answersJson: input.answers as InputJsonValue,
          status: FormSubmissionStatus.SUBMITTED,
          submittedAt
        }
      });

      if (assignment.form.type === FormType.CHECK_IN) {
        await tx.checkIn.create({
          data: {
            organizationId: actor.organizationId,
            clientId: actor.clientId,
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
            clientId: actor.clientId,
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
          action: "client.daily_check_in.submitted",
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

      return createdSubmission;
    });

    return dataResponse(serializeSubmission(submission), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function getAssignmentKind(request: Request): CheckInAssignmentKind | null {
  const kind = new URL(request.url).searchParams.get("kind");

  return kind === "daily" || kind === "weekly" ? kind : null;
}

async function getCurrentAssignment(organizationId: string, clientId: string, kind: CheckInAssignmentKind | null) {
  if (kind === "daily") {
    return getCurrentAssignmentByType(organizationId, clientId, FormType.HABIT_TRACKER);
  }

  if (kind === "weekly") {
    return getCurrentAssignmentByType(organizationId, clientId, FormType.CHECK_IN);
  }

  const habitAssignment = await getCurrentAssignmentByType(organizationId, clientId, FormType.HABIT_TRACKER);

  return habitAssignment ?? getCurrentAssignmentByType(organizationId, clientId, FormType.CHECK_IN);
}

function getCurrentAssignmentByType(organizationId: string, clientId: string, type: FormType) {
  return prisma.formAssignment.findFirst({
    where: {
      organizationId,
      clientId,
      status: { not: FormAssignmentStatus.CANCELLED },
      form: {
        type,
        deletedAt: null
      },
      formVersion: {
        publishedAt: { not: null }
      }
    },
    include: {
      client: true,
      form: true,
      formVersion: true
    },
    orderBy: [
      { dueAt: "desc" },
      { createdAt: "desc" }
    ]
  });
}
