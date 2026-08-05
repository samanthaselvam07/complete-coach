import {
  type ClientMigrationPlan,
  type MigratedClientPayload,
  migratedClientPayloadSchema
} from "@/lib/migrations/client-import-types";

interface BuildClientMigrationPlanInput {
  payload: unknown;
  organizationId: string;
  actorUserId: string;
  mode: "dry-run" | "commit";
  replaceExisting?: boolean;
}

export function parseMigratedClientPayload(payload: unknown): MigratedClientPayload {
  return migratedClientPayloadSchema.parse(payload);
}

export function buildClientMigrationPlan(input: BuildClientMigrationPlanInput): ClientMigrationPlan {
  const payload = parseMigratedClientPayload(input.payload);
  const phaseKeys = new Set(payload.roadmapPhases.map((phase) => phase.key));
  const warnings: string[] = [];

  for (const goal of payload.goals) {
    if (goal.roadmapPhaseKey && !phaseKeys.has(goal.roadmapPhaseKey)) {
      warnings.push(`Goal "${goal.title}" references missing roadmapPhaseKey "${goal.roadmapPhaseKey}".`);
    }
  }

  for (const event of payload.calendarEvents) {
    if (event.roadmapPhaseKey && !phaseKeys.has(event.roadmapPhaseKey)) {
      warnings.push(`Calendar event "${event.title}" references missing roadmapPhaseKey "${event.roadmapPhaseKey}".`);
    }
  }

  return {
    mode: input.mode,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    replaceExisting: input.replaceExisting ?? false,
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
    warnings
  };
}

export function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateTime(value: string) {
  return new Date(value);
}
