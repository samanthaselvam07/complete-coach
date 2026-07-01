import { z } from "zod";

import {
  ExerciseDifficulty,
  LibraryScope,
  TrainingProgramAssignmentStatus,
  TrainingProgramTemplateStatus
} from "@/app/generated/prisma/enums";

export const libraryScopeValues = ["global", "private"] as const;
export const exerciseDifficultyValues = ["beginner", "intermediate", "advanced"] as const;
export const trainingTemplateStatusValues = ["draft", "published", "archived"] as const;
export const trainingAssignmentStatusValues = ["active", "paused", "completed", "cancelled"] as const;
export const trainingProgramSectionValues = ["warmUp", "workout", "coolDown"] as const;

export type ApiLibraryScope = (typeof libraryScopeValues)[number];
export type ApiExerciseDifficulty = (typeof exerciseDifficultyValues)[number];
export type ApiTrainingTemplateStatus = (typeof trainingTemplateStatusValues)[number];
export type ApiTrainingAssignmentStatus = (typeof trainingAssignmentStatusValues)[number];

const libraryScopeToPrisma: Record<ApiLibraryScope, LibraryScope> = {
  global: LibraryScope.GLOBAL,
  private: LibraryScope.PRIVATE
};

const libraryScopeFromPrisma: Record<LibraryScope, ApiLibraryScope> = {
  [LibraryScope.GLOBAL]: "global",
  [LibraryScope.PRIVATE]: "private"
};

const exerciseDifficultyToPrisma: Record<ApiExerciseDifficulty, ExerciseDifficulty> = {
  beginner: ExerciseDifficulty.BEGINNER,
  intermediate: ExerciseDifficulty.INTERMEDIATE,
  advanced: ExerciseDifficulty.ADVANCED
};

const exerciseDifficultyFromPrisma: Record<ExerciseDifficulty, ApiExerciseDifficulty> = {
  [ExerciseDifficulty.BEGINNER]: "beginner",
  [ExerciseDifficulty.INTERMEDIATE]: "intermediate",
  [ExerciseDifficulty.ADVANCED]: "advanced"
};

const trainingTemplateStatusToPrisma: Record<ApiTrainingTemplateStatus, TrainingProgramTemplateStatus> = {
  draft: TrainingProgramTemplateStatus.DRAFT,
  published: TrainingProgramTemplateStatus.PUBLISHED,
  archived: TrainingProgramTemplateStatus.ARCHIVED
};

const trainingTemplateStatusFromPrisma: Record<TrainingProgramTemplateStatus, ApiTrainingTemplateStatus> = {
  [TrainingProgramTemplateStatus.DRAFT]: "draft",
  [TrainingProgramTemplateStatus.PUBLISHED]: "published",
  [TrainingProgramTemplateStatus.ARCHIVED]: "archived"
};

const trainingAssignmentStatusFromPrisma: Record<TrainingProgramAssignmentStatus, ApiTrainingAssignmentStatus> = {
  [TrainingProgramAssignmentStatus.ACTIVE]: "active",
  [TrainingProgramAssignmentStatus.PAUSED]: "paused",
  [TrainingProgramAssignmentStatus.COMPLETED]: "completed",
  [TrainingProgramAssignmentStatus.CANCELLED]: "cancelled"
};

const jsonStringArraySchema = z.array(z.string().trim().min(1).max(80)).max(20);
const exerciseFieldSchemas = {
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  equipment: z.string().trim().max(120).optional(),
  primaryMuscles: jsonStringArraySchema.min(1),
  secondaryMuscles: jsonStringArraySchema.optional(),
  difficulty: z.enum(exerciseDifficultyValues),
  videoObjectKey: z.string().trim().max(500).optional(),
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((value) => value === undefined || value === "" || isValidUrl(value), {
      message: "Video link must be a valid URL."
    }),
  imageObjectKey: z.string().trim().max(500).optional(),
  defaultSets: z.number().int().min(1).max(20).optional(),
  defaultReps: z.string().trim().max(40).optional(),
  defaultRestSeconds: z.number().int().min(0).max(3600).optional(),
  defaultRpe: z.number().min(1).max(10).optional(),
  defaultRir: z.string().trim().max(20).optional(),
  executionCues: jsonStringArraySchema.optional()
};

export const exerciseListQuerySchema = z.object({
  scope: z.enum(libraryScopeValues).optional(),
  category: z.string().trim().max(80).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createExerciseSchema = z.object({
  ...exerciseFieldSchemas,
  difficulty: exerciseFieldSchemas.difficulty.default("intermediate")
});

export const updateExerciseSchema = z.object(exerciseFieldSchemas).partial().refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required."
});

export const trainingTemplateListQuerySchema = z.object({
  status: z.enum(trainingTemplateStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const trainingTemplateExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().trim().min(1).max(160),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(40),
  tempo: z.string().trim().max(40).optional(),
  restSeconds: z.number().int().min(0).max(3600).optional(),
  rpe: z.string().trim().max(20).optional(),
  rir: z.string().trim().max(20).optional(),
  section: z.enum(trainingProgramSectionValues).optional(),
  videoObjectKey: z.string().trim().max(500).optional(),
  cues: jsonStringArraySchema.optional(),
  notes: z.string().trim().max(1000).optional()
});

export const trainingTemplateSchema = z.object({
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        exercises: z.array(trainingTemplateExerciseSchema).max(30)
      })
    )
    .min(1)
    .max(14),
  instructions: z.string().trim().max(5000).optional()
});

export const createTrainingTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  goal: z.string().trim().max(120).optional(),
  durationWeeks: z.number().int().min(1).max(104),
  status: z.enum(trainingTemplateStatusValues).default("draft"),
  template: trainingTemplateSchema
});

export const updateTrainingTemplateSchema = createTrainingTemplateSchema.partial().refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required."
});

export const createTrainingAssignmentSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().trim().max(160).optional(),
  startsOn: z.string().date(),
  endsOn: z.string().date().optional()
});

export type ExerciseListQuery = z.infer<typeof exerciseListQuerySchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type TrainingTemplateListQuery = z.infer<typeof trainingTemplateListQuerySchema>;
export type CreateTrainingTemplateInput = z.infer<typeof createTrainingTemplateSchema>;
export type UpdateTrainingTemplateInput = z.infer<typeof updateTrainingTemplateSchema>;

interface ExerciseRecord {
  id: string;
  organizationId: string | null;
  scope: LibraryScope;
  name: string;
  category: string;
  equipment: string | null;
  primaryMuscles: unknown;
  secondaryMuscles: unknown;
  difficulty: ExerciseDifficulty;
  videoObjectKey: string | null;
  videoUrl: string | null;
  imageObjectKey: string | null;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultRestSeconds: number | null;
  defaultRpe: unknown;
  defaultRir: string | null;
  executionCues: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface TrainingTemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  goal: string | null;
  durationWeeks: number;
  status: TrainingProgramTemplateStatus;
  templateJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface TrainingAssignmentRecord {
  id: string;
  organizationId: string;
  clientId: string;
  templateId: string | null;
  name: string;
  status: TrainingProgramAssignmentStatus;
  startsOn: Date | string;
  endsOn: Date | string | null;
  snapshotJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: {
    firstName: string;
    lastName: string;
  };
}

export function toPrismaLibraryScope(scope: ApiLibraryScope) {
  return libraryScopeToPrisma[scope];
}

export function toPrismaExerciseDifficulty(difficulty: ApiExerciseDifficulty) {
  return exerciseDifficultyToPrisma[difficulty];
}

export function toPrismaTrainingTemplateStatus(status: ApiTrainingTemplateStatus) {
  return trainingTemplateStatusToPrisma[status];
}

export function buildExerciseWhere(organizationId: string, query: ExerciseListQuery) {
  return {
    deletedAt: null,
    OR: [{ scope: LibraryScope.GLOBAL }, { organizationId }],
    ...(query.scope ? { scope: toPrismaLibraryScope(query.scope) } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          AND: [
            {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { category: { contains: query.search, mode: "insensitive" as const } },
                { equipment: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          ]
        }
      : {})
  };
}

export function getExerciseCreateData(organizationId: string, userId: string, input: CreateExerciseInput) {
  return {
    organizationId,
    createdByUserId: userId,
    scope: LibraryScope.PRIVATE,
    name: input.name,
    category: input.category,
    equipment: input.equipment,
    primaryMuscles: input.primaryMuscles,
    secondaryMuscles: input.secondaryMuscles,
    difficulty: toPrismaExerciseDifficulty(input.difficulty),
    videoObjectKey: input.videoObjectKey,
    videoUrl: input.videoUrl,
    imageObjectKey: input.imageObjectKey,
    defaultSets: input.defaultSets,
    defaultReps: input.defaultReps,
    defaultRestSeconds: input.defaultRestSeconds,
    defaultRpe: input.defaultRpe,
    defaultRir: input.defaultRir,
    executionCues: input.executionCues
  };
}

export function getExerciseUpdateData(input: UpdateExerciseInput) {
  return {
    ...(input.name ? { name: input.name } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
    ...(input.primaryMuscles ? { primaryMuscles: input.primaryMuscles } : {}),
    ...(input.secondaryMuscles !== undefined ? { secondaryMuscles: input.secondaryMuscles } : {}),
    ...(input.difficulty ? { difficulty: toPrismaExerciseDifficulty(input.difficulty) } : {}),
    ...(input.videoObjectKey !== undefined ? { videoObjectKey: input.videoObjectKey } : {}),
    ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
    ...(input.imageObjectKey !== undefined ? { imageObjectKey: input.imageObjectKey } : {}),
    ...(input.defaultSets !== undefined ? { defaultSets: input.defaultSets } : {}),
    ...(input.defaultReps !== undefined ? { defaultReps: input.defaultReps } : {}),
    ...(input.defaultRestSeconds !== undefined ? { defaultRestSeconds: input.defaultRestSeconds } : {}),
    ...(input.defaultRpe !== undefined ? { defaultRpe: input.defaultRpe } : {}),
    ...(input.defaultRir !== undefined ? { defaultRir: input.defaultRir } : {}),
    ...(input.executionCues !== undefined ? { executionCues: input.executionCues } : {})
  };
}

export function buildTrainingTemplateWhere(organizationId: string, query: TrainingTemplateListQuery) {
  return {
    organizationId,
    deletedAt: null,
    ...(query.status ? { status: toPrismaTrainingTemplateStatus(query.status) } : {})
  };
}

export function getTrainingTemplateCreateData(
  organizationId: string,
  userId: string,
  input: CreateTrainingTemplateInput
) {
  return {
    organizationId,
    createdByUserId: userId,
    name: input.name,
    description: input.description,
    goal: input.goal,
    durationWeeks: input.durationWeeks,
    status: toPrismaTrainingTemplateStatus(input.status),
    templateJson: input.template
  };
}

export function getTrainingTemplateUpdateData(input: UpdateTrainingTemplateInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.goal !== undefined ? { goal: input.goal } : {}),
    ...(input.durationWeeks !== undefined ? { durationWeeks: input.durationWeeks } : {}),
    ...(input.status !== undefined ? { status: toPrismaTrainingTemplateStatus(input.status) } : {}),
    ...(input.template !== undefined ? { templateJson: input.template } : {})
  };
}

export function buildTrainingAssignmentSnapshot(template: TrainingTemplateRecord) {
  return {
    templateId: template.id,
    templateName: template.name,
    goal: template.goal,
    durationWeeks: template.durationWeeks,
    template: template.templateJson
  };
}

export function serializeExercise(record: ExerciseRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    scope: libraryScopeFromPrisma[record.scope],
    name: record.name,
    category: record.category,
    equipment: record.equipment,
    primaryMuscles: coerceStringArray(record.primaryMuscles),
    secondaryMuscles: coerceStringArray(record.secondaryMuscles),
    difficulty: exerciseDifficultyFromPrisma[record.difficulty],
    videoObjectKey: record.videoObjectKey,
    videoUrl: record.videoUrl,
    imageObjectKey: record.imageObjectKey,
    defaultSets: record.defaultSets,
    defaultReps: record.defaultReps,
    defaultRestSeconds: record.defaultRestSeconds,
    defaultRpe: record.defaultRpe === null ? null : Number(record.defaultRpe),
    defaultRir: record.defaultRir,
    executionCues: coerceStringArray(record.executionCues),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function serializeTrainingTemplate(record: TrainingTemplateRecord) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    goal: record.goal,
    durationWeeks: record.durationWeeks,
    status: trainingTemplateStatusFromPrisma[record.status],
    template: record.templateJson,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeTrainingAssignment(record: TrainingAssignmentRecord) {
  return {
    id: record.id,
    clientId: record.clientId,
    clientName: record.client ? `${record.client.firstName} ${record.client.lastName}` : null,
    templateId: record.templateId,
    name: record.name,
    status: trainingAssignmentStatusFromPrisma[record.status],
    startsOn: toDateString(record.startsOn),
    endsOn: record.endsOn ? toDateString(record.endsOn) : null,
    snapshot: record.snapshotJson,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function coerceStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateString(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}
