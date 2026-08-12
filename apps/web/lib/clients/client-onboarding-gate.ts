import type { InputJsonValue } from "@prisma/client/runtime/client";

import {
  ClientSubscriptionStatus,
  FormAssignmentStatus,
  FormSubmissionStatus,
  FormType
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { extractMeasurementsFromSubmission } from "@/lib/forms/metric-extraction";
import { FormDefinitionSchema } from "@/lib/forms/schema";
import { serializeAssignment, serializeSubmission } from "@/lib/forms/submission-records";

export const clientPaymentActiveStatuses = new Set<ClientSubscriptionStatus>([
  ClientSubscriptionStatus.ACTIVE,
  ClientSubscriptionStatus.TRIALING
]);

export const clientQuestionnaireFormTypes = [FormType.INTAKE, FormType.APPLICATION, FormType.CONTACT] as const;

export async function getClientOnboardingGateState(input: { organizationId: string; clientId: string }) {
  const client = await prisma.client.findFirstOrThrow({
    where: {
      id: input.clientId,
      organizationId: input.organizationId,
      deletedAt: null
    },
    select: {
      id: true,
      packageId: true,
      packageName: true,
      requiresOnlinePayment: true
    }
  });
  const [activeSubscription, latestSubscription, questionnaireAssignment] = await Promise.all([
    prisma.clientSubscription.findFirst({
      where: {
        organizationId: input.organizationId,
        clientId: input.clientId,
        ...(client.packageId ? { packageId: client.packageId } : {}),
        status: { in: Array.from(clientPaymentActiveStatuses) }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.clientSubscription.findFirst({
      where: {
        organizationId: input.organizationId,
        clientId: input.clientId,
        ...(client.packageId ? { packageId: client.packageId } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        coachingPackage: {
          select: {
            name: true,
            priceAmount: true,
            currency: true
          }
        }
      }
    }),
    getAssignedClientQuestionnaire(input.organizationId, input.clientId)
  ]);
  const paymentRequired = Boolean(
    client.requiresOnlinePayment &&
      client.packageId &&
      !activeSubscription
  );

  return {
    payment: {
      required: paymentRequired,
      packageId: client.packageId,
      packageName: latestSubscription?.coachingPackage?.name ?? client.packageName,
      status: latestSubscription?.status?.toLowerCase().replaceAll("_", "-") ?? null
    },
    questionnaire: !paymentRequired && questionnaireAssignment ? serializeAssignment(questionnaireAssignment) : null
  };
}

export function getAssignedClientQuestionnaire(organizationId: string, clientId: string) {
  return prisma.formAssignment.findFirst({
    where: {
      organizationId,
      clientId,
      status: FormAssignmentStatus.ASSIGNED,
      form: {
        type: { in: [...clientQuestionnaireFormTypes] },
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
      { dueAt: "asc" },
      { createdAt: "asc" }
    ]
  });
}

export async function submitAssignedClientQuestionnaire(input: {
  organizationId: string;
  clientId: string;
  userId: string;
  answers: Record<string, unknown>;
}) {
  const assignment = await getAssignedClientQuestionnaire(input.organizationId, input.clientId);

  if (!assignment) {
    return null;
  }

  const definition = FormDefinitionSchema.parse(assignment.formVersion.schemaJson);
  const submittedAt = new Date();
  const measurements = extractMeasurementsFromSubmission({
    answers: input.answers,
    clientId: input.clientId,
    definition,
    organizationId: input.organizationId,
    sourceId: "pending",
    submittedAt
  });

  return prisma.$transaction(async (tx) => {
    const createdSubmission = await tx.formSubmission.create({
      data: {
        organizationId: input.organizationId,
        formId: assignment.formId,
        formVersionId: assignment.formVersionId,
        assignmentId: assignment.id,
        clientId: input.clientId,
        submittedByUserId: input.userId,
        answersJson: input.answers as InputJsonValue,
        status: FormSubmissionStatus.SUBMITTED,
        submittedAt
      },
      include: {
        form: true,
        formVersion: true,
        client: true
      }
    });

    await tx.formAssignment.update({
      where: { id: assignment.id, organizationId: input.organizationId },
      data: {
        status: FormAssignmentStatus.SUBMITTED,
        completedAt: submittedAt
      }
    });

    for (const measurement of measurements) {
      await tx.clientMeasurement.upsert({
        where: {
          organizationId_sourceType_sourceId_metricKey: {
            organizationId: input.organizationId,
            sourceType: "form_submission",
            sourceId: createdSubmission.id,
            metricKey: measurement.metricKey
          }
        },
        create: {
          organizationId: input.organizationId,
          clientId: input.clientId,
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
        organizationId: input.organizationId,
        actorUserId: input.userId,
        action: "client.onboarding_questionnaire.submitted",
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

    return serializeSubmission(createdSubmission);
  });
}
