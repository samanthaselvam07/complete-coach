import {
  CheckInStatus,
  ClientAccountActivityType,
  ClientStatus,
  FormStatus,
  FormSubmissionStatus,
  FormType,
  Prisma
} from "@/app/generated/prisma/client";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { parseMigratedClientPayload } from "@/lib/migrations/client-import-normalizer";
import type { ClientMigrationResult, MigratedClientPayload } from "@/lib/migrations/client-import-types";

type MigrationDbClient = PrismaClient | Prisma.TransactionClient;

interface CommitClientMigrationInput {
  payload: unknown;
  prisma: PrismaClient;
  organizationId: string;
  actorUserId?: string;
}

interface ImportActorContext {
  organizationId: string;
  actorUserId?: string;
}

export async function commitClientMigration(input: CommitClientMigrationInput): Promise<ClientMigrationResult> {
  const payload = parseMigratedClientPayload(input.payload);

  const client = await upsertClient(input.prisma, payload, input.organizationId);
  await upsertClientProfile(input.prisma, payload, input.organizationId, client.id);
  await upsertLegacyCheckIns(input.prisma, payload, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId
  }, client.id);
  await upsertMeasurements(input.prisma, payload, input.organizationId, client.id);
  await upsertActivityLog(input.prisma, payload, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId
  }, client.id);

  return {
    clientId: client.id,
    plan: {
      mode: "commit",
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? "system",
      replaceExisting: false,
      externalClientId: payload.client.externalClientId,
      counts: {
        client: 1,
        profile: payload.profile ? 1 : 0,
        notes: payload.notes.length,
        legacyCheckIns: payload.legacyCheckIns.length,
        goals: payload.goals.length,
        roadmapPhases: payload.roadmapPhases.length,
        roadmapItems: payload.roadmapPhases.reduce((total, phase) => total + phase.items.length, 0),
        calendarEvents: payload.calendarEvents.length,
        measurements: payload.measurements.length,
        activityLogs: payload.activityLogs.length,
        workoutSessions: payload.workoutSessions.length
      },
      warnings: []
    }
  };
}

export function buildLegacyCheckInFormSchema(payload: MigratedClientPayload) {
  const questionLabels = Array.from(
    new Set(payload.legacyCheckIns.flatMap((checkIn) => Object.keys(checkIn.answers)))
  );

  return {
    title: "Legacy Clinical Physiques Check-in",
    description: "Imported check-in history from Clinical Physiques.",
    fields: questionLabels.map((label) => ({
      id: label,
      label,
      type: "short-text",
      required: false
    }))
  };
}

async function upsertClient(tx: MigrationDbClient, payload: MigratedClientPayload, organizationId: string) {
  return tx.client.upsert({
    where: {
      organizationId_externalClientId: {
        organizationId,
        externalClientId: payload.client.externalClientId
      }
    },
    update: {
      firstName: payload.client.firstName,
      lastName: payload.client.lastName,
      email: payload.client.email?.toLowerCase(),
      phone: payload.client.phone,
      status: toClientStatus(payload.client.status),
      packageName: payload.client.packageName,
      checkInDay: payload.client.checkInDay,
      timezone: payload.client.timezone,
      startDate: payload.client.startDate ? toDateOnly(payload.client.startDate) : undefined,
      latestCheckInAt: payload.client.latestCheckInAt ? new Date(payload.client.latestCheckInAt) : undefined,
      compliance: payload.client.compliance
    },
    create: {
      organizationId,
      firstName: payload.client.firstName,
      lastName: payload.client.lastName,
      email: payload.client.email?.toLowerCase(),
      phone: payload.client.phone,
      status: toClientStatus(payload.client.status),
      packageName: payload.client.packageName,
      checkInDay: payload.client.checkInDay,
      timezone: payload.client.timezone,
      startDate: payload.client.startDate ? toDateOnly(payload.client.startDate) : undefined,
      latestCheckInAt: payload.client.latestCheckInAt ? new Date(payload.client.latestCheckInAt) : undefined,
      compliance: payload.client.compliance,
      externalClientId: payload.client.externalClientId
    }
  });
}

async function upsertClientProfile(
  tx: MigrationDbClient,
  payload: MigratedClientPayload,
  organizationId: string,
  clientId: string
) {
  if (!payload.profile) {
    return;
  }

  await tx.clientProfile.upsert({
    where: { clientId },
    update: {
      dateOfBirth: payload.profile.dateOfBirth ? toDateOnly(payload.profile.dateOfBirth) : undefined,
      sex: payload.profile.sex,
      goals: toJsonInput(payload.profile.goals),
      injuries: toJsonInput(payload.profile.injuries),
      medicalNotes: payload.profile.medicalNotes,
      bio: payload.profile.bio,
      emergencyContact: toJsonInput(payload.profile.emergencyContact),
      waterTargetLitres: payload.profile.waterTargetLitres,
      stepTarget: payload.profile.stepTarget,
      trainingLogTargetDays: payload.profile.trainingLogTargetDays
    },
    create: {
      organizationId,
      clientId,
      dateOfBirth: payload.profile.dateOfBirth ? toDateOnly(payload.profile.dateOfBirth) : undefined,
      sex: payload.profile.sex,
      goals: toJsonInput(payload.profile.goals),
      injuries: toJsonInput(payload.profile.injuries),
      medicalNotes: payload.profile.medicalNotes,
      bio: payload.profile.bio,
      emergencyContact: toJsonInput(payload.profile.emergencyContact),
      waterTargetLitres: payload.profile.waterTargetLitres,
      stepTarget: payload.profile.stepTarget,
      trainingLogTargetDays: payload.profile.trainingLogTargetDays
    }
  });
}

async function upsertLegacyCheckIns(
  tx: MigrationDbClient,
  payload: MigratedClientPayload,
  context: ImportActorContext,
  clientId: string
) {
  if (payload.legacyCheckIns.length === 0) {
    return;
  }

  const form = await upsertLegacyCheckInForm(tx, payload, context.organizationId, context.actorUserId);

  for (const checkIn of payload.legacyCheckIns) {
    const submittedAt = new Date(checkIn.submittedAt);
    const submissionId = deterministicImportId(payload, `submission-${checkIn.sourceId}`);
    const checkInId = deterministicImportId(payload, `check-in-${checkIn.sourceId}`);

    await tx.formSubmission.upsert({
      where: { id: submissionId },
      update: {
        answersJson: checkIn.answers as Prisma.InputJsonValue,
        status: FormSubmissionStatus.COMPLETED,
        submittedAt,
        reviewedAt: submittedAt
      },
      create: {
        id: submissionId,
        organizationId: context.organizationId,
        formId: form.id,
        formVersionId: form.currentVersionId,
        clientId,
        answersJson: checkIn.answers as Prisma.InputJsonValue,
        status: FormSubmissionStatus.COMPLETED,
        submittedAt,
        reviewedAt: submittedAt
      }
    });

    await tx.checkIn.upsert({
      where: { id: checkInId },
      update: {
        formSubmissionId: submissionId,
        status: CheckInStatus.COMPLETED,
        submittedAt,
        reviewedAt: submittedAt,
        summary: buildLegacyCheckInSummary(checkIn),
        coachNotes: null
      },
      create: {
        id: checkInId,
        organizationId: context.organizationId,
        clientId,
        formSubmissionId: submissionId,
        type: "legacy-check-in",
        status: CheckInStatus.COMPLETED,
        dueAt: submittedAt,
        submittedAt,
        reviewedAt: submittedAt,
        summary: buildLegacyCheckInSummary(checkIn),
        coachNotes: null
      }
    });
  }
}

async function upsertLegacyCheckInForm(
  tx: MigrationDbClient,
  payload: MigratedClientPayload,
  organizationId: string,
  actorUserId?: string
) {
  const formId = deterministicImportId(payload, "legacy-check-in-form");
  const formVersionId = deterministicImportId(payload, "legacy-check-in-form-version-1");
  const schemaJson = buildLegacyCheckInFormSchema(payload) as Prisma.InputJsonValue;

  const form = await tx.form.upsert({
    where: { id: formId },
    update: {
      name: "Legacy Clinical Physiques Check-in",
      description: "Imported check-in history from Clinical Physiques.",
      type: FormType.CHECK_IN,
      status: FormStatus.PUBLISHED
    },
    create: {
      id: formId,
      organizationId,
      name: "Legacy Clinical Physiques Check-in",
      description: "Imported check-in history from Clinical Physiques.",
      type: FormType.CHECK_IN,
      status: FormStatus.PUBLISHED,
      shareSlug: deterministicImportId(payload, "legacy-check-in-share"),
      createdByUserId: actorUserId
    }
  });

  await tx.formVersion.upsert({
    where: { id: formVersionId },
    update: {
      schemaJson,
      uiJson: Prisma.JsonNull,
      publishedAt: new Date()
    },
    create: {
      id: formVersionId,
      organizationId,
      formId,
      versionNumber: 1,
      schemaJson,
      uiJson: Prisma.JsonNull,
      publishedAt: new Date(),
      createdByUserId: actorUserId
    }
  });

  if (form.currentVersionId !== formVersionId) {
    await tx.form.update({
      where: { id: formId },
      data: { currentVersionId: formVersionId }
    });
  }

  return { ...form, currentVersionId: formVersionId };
}

async function upsertMeasurements(
  tx: MigrationDbClient,
  payload: MigratedClientPayload,
  organizationId: string,
  clientId: string
) {
  for (const measurement of payload.measurements) {
    await tx.clientMeasurement.upsert({
      where: {
        organizationId_sourceType_sourceId_metricKey: {
          organizationId,
          sourceType: measurement.sourceType,
          sourceId: measurement.sourceId,
          metricKey: measurement.metricKey
        }
      },
      update: {
        clientId,
        measuredAt: new Date(measurement.measuredAt),
        metricValue: measurement.metricValue,
        unit: measurement.unit,
        metadata: toJsonInput(measurement.metadata)
      },
      create: {
        organizationId,
        clientId,
        sourceType: measurement.sourceType,
        sourceId: measurement.sourceId,
        measuredAt: new Date(measurement.measuredAt),
        metricKey: measurement.metricKey,
        metricValue: measurement.metricValue,
        unit: measurement.unit,
        metadata: toJsonInput(measurement.metadata)
      }
    });
  }
}

async function upsertActivityLog(
  tx: MigrationDbClient,
  payload: MigratedClientPayload,
  context: ImportActorContext,
  clientId: string
) {
  await tx.clientAccountActivityLog.upsert({
    where: { id: deterministicImportId(payload, "account-activity-imported") },
    update: {
      title: "Legacy Clinical Physiques data imported",
      occurredAt: payload.extractedAt ? new Date(payload.extractedAt) : new Date(),
      metadata: {
        sourceSystem: payload.sourceSystem,
        legacyCheckIns: payload.legacyCheckIns.length,
        measurements: payload.measurements.length
      }
    },
    create: {
      id: deterministicImportId(payload, "account-activity-imported"),
      organizationId: context.organizationId,
      clientId,
      actorUserId: context.actorUserId,
      type: ClientAccountActivityType.CLIENT_PROFILE_TARGET_UPDATED,
      title: "Legacy Clinical Physiques data imported",
      occurredAt: payload.extractedAt ? new Date(payload.extractedAt) : new Date(),
      metadata: {
        sourceSystem: payload.sourceSystem,
        legacyCheckIns: payload.legacyCheckIns.length,
        measurements: payload.measurements.length
      }
    }
  });
}

function toClientStatus(status: MigratedClientPayload["client"]["status"]) {
  const statuses = {
    active: ClientStatus.ACTIVE,
    archived: ClientStatus.ARCHIVED,
    new: ClientStatus.NEW,
    deactivated: ClientStatus.DEACTIVATED
  };

  return statuses[status];
}

function deterministicImportId(payload: MigratedClientPayload, suffix: string) {
  return `mig_${slugify(payload.client.externalClientId)}_${slugify(suffix)}`.slice(0, 190);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toJsonInput(value: unknown) {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

function buildLegacyCheckInSummary(checkIn: MigratedClientPayload["legacyCheckIns"][number]) {
  const label = checkIn.checkInNumber ? `Check-in #${checkIn.checkInNumber}` : "Legacy check-in";
  return `${label} imported from Clinical Physiques.`;
}
