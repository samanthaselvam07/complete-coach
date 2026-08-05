import { z } from "zod";

export const migratedClientStatusSchema = z.enum(["active", "archived", "new", "deactivated"]).default("active");
export const migratedActivityDomainSchema = z.enum(["training", "nutrition", "supplementation"]);
export const migratedActivityStatusSchema = z.enum(["completed", "missed"]).default("completed");

const dateStringSchema = z.string().date();
const dateTimeStringSchema = z.string().datetime();
const jsonValueSchema: z.ZodType<unknown> = z.unknown();

export const migratedClientPayloadSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(80).default("manual-extraction"),
  extractedAt: dateTimeStringSchema.optional(),
  client: z.object({
    externalClientId: z.string().trim().min(1).max(160),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(255).optional(),
    phone: z.string().trim().max(40).optional(),
    status: migratedClientStatusSchema,
    packageName: z.string().trim().max(120).optional(),
    checkInDay: z.string().trim().max(20).optional(),
    timezone: z.string().trim().max(80).default("Australia/Melbourne"),
    startDate: dateStringSchema.optional(),
    latestCheckInAt: dateTimeStringSchema.optional(),
    compliance: z.number().int().min(0).max(100).default(0)
  }),
  profile: z
    .object({
      dateOfBirth: dateStringSchema.optional(),
      sex: z.string().trim().max(80).optional(),
      goals: jsonValueSchema.optional(),
      injuries: jsonValueSchema.optional(),
      medicalNotes: z.string().trim().max(10000).optional(),
      bio: z.string().trim().max(10000).optional(),
      emergencyContact: jsonValueSchema.optional(),
      waterTargetLitres: z.number().min(0).max(20).optional(),
      stepTarget: z.number().int().min(0).max(100000).optional(),
      trainingLogTargetDays: z.number().int().min(0).max(7).optional()
    })
    .optional(),
  notes: z
    .array(
      z.object({
        noteDate: dateStringSchema,
        body: z.string().trim().min(1).max(10000)
      })
    )
    .default([]),
  legacyCheckIns: z
    .array(
      z.object({
        sourceId: z.string().trim().min(1).max(160),
        submittedAt: dateTimeStringSchema,
        checkInNumber: z.number().int().min(1).optional(),
        checkInDay: z.string().trim().max(40).optional(),
        answers: z.record(z.string(), jsonValueSchema)
      })
    )
    .default([]),
  goals: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        targetDate: dateStringSchema,
        notes: z.string().trim().max(10000).optional(),
        roadmapPhaseKey: z.string().trim().min(1).max(120).optional()
      })
    )
    .default([]),
  roadmapPhases: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(200),
        startDate: dateStringSchema,
        endDate: dateStringSchema,
        status: z.string().trim().min(1).max(80).default("planned"),
        items: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(200),
              type: z.string().trim().min(1).max(80),
              eventDate: dateStringSchema,
              notes: z.string().trim().max(10000).optional()
            })
          )
          .default([])
      })
    )
    .default([]),
  calendarEvents: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        type: z.string().trim().min(1).max(80),
        startDate: dateStringSchema,
        endDate: dateStringSchema,
        allDay: z.boolean().default(true),
        eventTime: z.string().trim().max(20).optional(),
        recurring: z.boolean().default(false),
        recurrenceCount: z.number().int().min(1).max(100).optional(),
        recurrenceEndsOn: dateStringSchema.optional(),
        recurrenceDays: z.array(z.string().trim().min(1).max(20)).default([]),
        goal: z.string().trim().max(200).optional(),
        notes: z.string().trim().max(10000).optional(),
        meetingUrl: z.string().trim().url().optional(),
        roadmapPhaseKey: z.string().trim().min(1).max(120).optional(),
        scheduledTrainingProgramId: z.string().trim().max(160).optional(),
        scheduledTrainingProgramName: z.string().trim().max(200).optional(),
        scheduledTrainingDayName: z.string().trim().max(200).optional()
      })
    )
    .default([]),
  measurements: z
    .array(
      z.object({
        sourceType: z.string().trim().min(1).max(80),
        sourceId: z.string().trim().min(1).max(160),
        measuredAt: dateTimeStringSchema,
        metricKey: z.string().trim().min(1).max(80),
        metricValue: z.number(),
        unit: z.string().trim().max(40).optional(),
        metadata: jsonValueSchema.optional()
      })
    )
    .default([]),
  activityLogs: z
    .array(
      z.object({
        domain: migratedActivityDomainSchema,
        logDate: dateStringSchema,
        status: migratedActivityStatusSchema,
        sourceType: z.string().trim().max(80).optional(),
        sourceId: z.string().trim().max(160).optional(),
        notes: z.string().trim().max(10000).optional()
      })
    )
    .default([]),
  workoutSessions: z
    .array(
      z.object({
        assignmentName: z.string().trim().min(1).max(200),
        dayId: z.string().trim().max(160).optional(),
        dayName: z.string().trim().min(1).max(200),
        startedAt: dateTimeStringSchema,
        completedAt: dateTimeStringSchema,
        durationSeconds: z.number().int().min(0).default(0),
        exercises: jsonValueSchema,
        personalBests: jsonValueSchema.optional()
      })
    )
    .default([])
});

export type MigratedClientPayload = z.infer<typeof migratedClientPayloadSchema>;

export interface ClientMigrationPlan {
  mode: "dry-run" | "commit";
  organizationId: string;
  actorUserId: string;
  replaceExisting: boolean;
  externalClientId: string;
  counts: {
    client: 1;
    profile: 0 | 1;
    notes: number;
    legacyCheckIns: number;
    goals: number;
    roadmapPhases: number;
    roadmapItems: number;
    calendarEvents: number;
    measurements: number;
    activityLogs: number;
    workoutSessions: number;
  };
  warnings: string[];
}

export interface ClientMigrationResult {
  plan: ClientMigrationPlan;
  clientId: string | null;
}
