import type { InputJsonValue } from "@prisma/client/runtime/client";

import {
  CheckInStatus,
  FormAssignmentStatus,
  FormSubmissionStatus,
  FormType,
  LeadActivityType,
  LeadStage,
  LeadStatus
} from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildClientActivityLogSummary,
  getClientActivityLogDateRange,
  inferClientActivityLogsFromSubmission,
  toPrismaClientActivityLogDomain,
  toPrismaClientActivityLogStatus
} from "@/lib/clients/client-activity-logs";
import { prisma } from "@/lib/db/prisma";
import { extractMeasurementsFromSubmission } from "@/lib/forms/metric-extraction";
import { FormDefinitionSchema, type FormDefinition, type FormFieldDefinition } from "@/lib/forms/schema";
import { serializeSubmission, submitAssignmentSchema } from "@/lib/forms/submission-records";
import { enqueueClientAutomationJob } from "@/lib/organizations/automation-records";

interface SubmitAssignmentRouteContext {
  params: Promise<{ assignmentId: string }>;
}

type LeadSyncClient = Pick<typeof prisma, "auditLog" | "lead" | "leadActivity">;

interface ApplicationLeadAssignment {
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  form: {
    id: string;
    name: string;
  };
  formId: string;
  formVersionId: string;
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
        client: {
          include: {
            profile: true
          }
        },
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

        await tx.client.update({
          where: { id: assignment.clientId, organizationId: actor.organizationId },
          data: { latestCheckInAt: submittedAt }
        });
      }

      if (assignment.form.type === FormType.APPLICATION) {
        await syncApplicationSubmissionToLead(tx, {
          actorUserId: actor.userId,
          answers: input.answers,
          assignment,
          definition,
          organizationId: actor.organizationId,
          submittedAt,
          submissionId: createdSubmission.id
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

      const inferredLogs = inferClientActivityLogsFromSubmission({
        answers: input.answers,
        definition,
        submittedAt
      });

      for (const inferredLog of inferredLogs) {
        const domain = toPrismaClientActivityLogDomain(inferredLog.domain);

        await tx.clientActivityLog.upsert({
          where: {
            organizationId_clientId_domain_logDate: {
              organizationId: actor.organizationId,
              clientId: assignment.clientId,
              domain,
              logDate: inferredLog.logDate
            }
          },
          create: {
            organizationId: actor.organizationId,
            clientId: assignment.clientId,
            domain,
            logDate: inferredLog.logDate,
            status: toPrismaClientActivityLogStatus(inferredLog.status),
            sourceType: "form_submission",
            sourceId: createdSubmission.id,
            notes: inferredLog.notes
          },
          update: {
            status: toPrismaClientActivityLogStatus(inferredLog.status),
            sourceType: "form_submission",
            sourceId: createdSubmission.id,
            notes: inferredLog.notes
          }
        });
      }

      if (inferredLogs.length > 0) {
        const { dateFrom, dateTo } = getClientActivityLogDateRange({ days: 7 }, submittedAt);
        const logs = await tx.clientActivityLog.findMany({
          where: {
            organizationId: actor.organizationId,
            clientId: assignment.clientId,
            logDate: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          orderBy: [{ logDate: "asc" }, { domain: "asc" }]
        });
        const summary = buildClientActivityLogSummary(logs, dateFrom, dateTo, {
          trainingLogTargetDays: assignment.client.profile?.trainingLogTargetDays
        });

        await tx.client.update({
          where: { id: assignment.clientId, organizationId: actor.organizationId },
          data: { compliance: summary.complianceScore }
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
            extractedMetricCount: measurements.length,
            inferredActivityLogCount: inferredLogs.length
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
    const automationTrigger =
      assignment.form.type === FormType.CHECK_IN
        ? "client-completes-check-in"
        : assignment.form.type === FormType.INTAKE
          ? "initial-qa-completed"
          : null;

    if (automationTrigger) {
      await enqueueClientAutomationJob({
        organizationId: actor.organizationId,
        trigger: automationTrigger,
        clientId: assignment.clientId,
        source: "form_assignment_submission",
        sourceId: submission.id,
        metadata: {
          assignmentId: assignment.id,
          formId: assignment.formId,
          submissionId: submission.id
        }
      });
    }

    return dataResponse(serializeSubmission(submission), {
      status: 201,
      headers: { Location: `/api/v1/form-submissions/${submission.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function syncApplicationSubmissionToLead(
  tx: LeadSyncClient,
  {
    actorUserId,
    answers,
    assignment,
    definition,
    organizationId,
    submittedAt,
    submissionId
  }: {
    actorUserId: string;
    answers: Record<string, unknown>;
    assignment: ApplicationLeadAssignment;
    definition: FormDefinition;
    organizationId: string;
    submittedAt: Date;
    submissionId: string;
  }
) {
  const leadDetails = extractLeadDetailsFromApplication({
    answers,
    assignment,
    definition
  });

  if (!leadDetails.name && !leadDetails.email) {
    return;
  }

  const existingLead = leadDetails.email
    ? await tx.lead.findFirst({
        where: {
          organizationId,
          email: leadDetails.email,
          deletedAt: null
        }
      })
    : null;
  const lead = existingLead
    ? await tx.lead.update({
        where: {
          id: existingLead.id,
          organizationId
        },
        data: {
          name: leadDetails.name || existingLead.name,
          phone: leadDetails.phone ?? existingLead.phone,
          location: leadDetails.location ?? existingLead.location,
          source: leadDetails.source,
          notes: mergeLeadNotes(existingLead.notes, leadDetails.notes),
          lastContactAt: submittedAt
        }
      })
    : await tx.lead.create({
        data: {
          organizationId,
          name: leadDetails.name || leadDetails.email || "Application lead",
          email: leadDetails.email,
          phone: leadDetails.phone,
          source: leadDetails.source,
          status: LeadStatus.WARM,
          stage: LeadStage.INITIAL_CONTACT,
          location: leadDetails.location,
          notes: leadDetails.notes,
          lastContactAt: submittedAt,
          daysInStage: 0
        }
      });

  await tx.leadActivity.create({
    data: {
      organizationId,
      leadId: lead.id,
      actorUserId,
      type: LeadActivityType.NOTE,
      body: `Application form submitted: ${assignment.form.name}`,
      occurredAt: submittedAt
    }
  });

  await tx.auditLog.create({
    data: {
      organizationId,
      actorUserId,
      action: existingLead ? "lead.updated_from_application_form" : "lead.created_from_application_form",
      targetType: "lead",
      targetId: lead.id,
      metadata: {
        formId: assignment.formId,
        formVersionId: assignment.formVersionId,
        formSubmissionId: submissionId
      }
    }
  });
}

function extractLeadDetailsFromApplication({
  answers,
  assignment,
  definition
}: {
  answers: Record<string, unknown>;
  assignment: ApplicationLeadAssignment;
  definition: FormDefinition;
}) {
  const detailFields = {
    name: findAnswer(definition.fields, answers, isNameField),
    email: findAnswer(definition.fields, answers, isEmailField),
    phone: findAnswer(definition.fields, answers, isPhoneField),
    location: findAnswer(definition.fields, answers, isLocationField)
  };
  const fallbackName = [assignment.client.firstName, assignment.client.lastName].filter(Boolean).join(" ").trim();

  return {
    name: stringifyAnswer(detailFields.name) || fallbackName,
    email: normalizeEmail(stringifyAnswer(detailFields.email) || assignment.client.email),
    phone: stringifyAnswer(detailFields.phone) || assignment.client.phone,
    source: "Application form",
    location: stringifyAnswer(detailFields.location),
    notes: buildApplicationLeadNotes(definition.fields, answers)
  };
}

function findAnswer(
  fields: FormFieldDefinition[],
  answers: Record<string, unknown>,
  predicate: (field: FormFieldDefinition) => boolean
) {
  const field = fields.find(predicate);
  return field ? answers[field.id] : undefined;
}

function isNameField(field: FormFieldDefinition) {
  const label = normalizeLabel(field.label);
  return label === "name" || label.includes("full name") || label.includes("client name") || label.includes("your name");
}

function isEmailField(field: FormFieldDefinition) {
  return field.type === "email" || normalizeLabel(field.label).includes("email");
}

function isPhoneField(field: FormFieldDefinition) {
  const label = normalizeLabel(field.label);
  return field.type === "phone" || label.includes("phone") || label.includes("mobile");
}

function isLocationField(field: FormFieldDefinition) {
  const label = normalizeLabel(field.label);
  return label.includes("location") || label.includes("timezone") || label.includes("time zone");
}

function buildApplicationLeadNotes(fields: FormFieldDefinition[], answers: Record<string, unknown>) {
  return fields
    .filter((field) => !["content-block", "photo"].includes(field.type))
    .filter((field) => !isNameField(field) && !isEmailField(field) && !isPhoneField(field) && !isLocationField(field))
    .map((field) => {
      const answer = stringifyAnswer(answers[field.id]);
      return answer ? `${field.label}: ${answer}` : null;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function mergeLeadNotes(existingNotes: string | null, applicationNotes: string | null) {
  if (!existingNotes) {
    return applicationNotes;
  }

  if (!applicationNotes) {
    return existingNotes;
  }

  return `${existingNotes}\n\n${applicationNotes}`;
}

function normalizeEmail(value: string | null) {
  return value ? value.trim().toLowerCase() : null;
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function stringifyAnswer(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const answer = value
      .map((item) => stringifyAnswer(item))
      .filter((item): item is string => Boolean(item))
      .join(", ");
    return answer || null;
  }

  return null;
}
