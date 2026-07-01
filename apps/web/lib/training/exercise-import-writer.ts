import { ExerciseDifficulty, LibraryScope } from "@/app/generated/prisma/enums";
import { buildExerciseImportPlan } from "@/lib/training/exercise-import-processor";
import type {
  ExerciseCsvRow,
  ExerciseImportCandidate,
  ExerciseImportPlan,
  ExistingImportedExercise
} from "@/lib/training/exercise-import-types";
import type { ApiExerciseDifficulty } from "@/lib/training/training-records";

export type AppliedExerciseImportResult = {
  dryRun: boolean;
  plan: ExerciseImportPlan;
  createdIds: string[];
  updatedIds: string[];
};

export type ExerciseImportRepository = {
  listExistingGlobalExercises(): Promise<ExistingImportedExercise[]>;
  createGlobalExercise(record: ExerciseImportCandidate): Promise<{ id: string }>;
  updateGlobalExercise(id: string, record: ExerciseImportCandidate): Promise<{ id: string }>;
};

type PrismaExerciseImportClient = {
  exerciseLibraryItem: {
    findMany(args: {
      where: { scope: LibraryScope; deletedAt: null };
      select: { id: true; name: true; category: true };
    }): Promise<Array<{ id: string; name: string; category: string }>>;
    create(args: { data: ReturnType<typeof getGlobalExerciseImportCreateData> }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: ReturnType<typeof getGlobalExerciseImportUpdateData>;
    }): Promise<{ id: string }>;
  };
};

const difficultyToPrisma: Record<ApiExerciseDifficulty, ExerciseDifficulty> = {
  beginner: ExerciseDifficulty.BEGINNER,
  intermediate: ExerciseDifficulty.INTERMEDIATE,
  advanced: ExerciseDifficulty.ADVANCED
};

export function createPrismaExerciseImportRepository(
  prisma: PrismaExerciseImportClient
): ExerciseImportRepository {
  return {
    async listExistingGlobalExercises() {
      return prisma.exerciseLibraryItem.findMany({
        where: { scope: LibraryScope.GLOBAL, deletedAt: null },
        select: { id: true, name: true, category: true }
      });
    },
    async createGlobalExercise(record) {
      return prisma.exerciseLibraryItem.create({
        data: getGlobalExerciseImportCreateData(record)
      });
    },
    async updateGlobalExercise(id, record) {
      return prisma.exerciseLibraryItem.update({
        where: { id },
        data: getGlobalExerciseImportUpdateData(record)
      });
    }
  };
}

export function createDryRunExerciseImportRepository(
  existingExercises: ExistingImportedExercise[] = []
): ExerciseImportRepository {
  return {
    async listExistingGlobalExercises() {
      return existingExercises;
    },
    async createGlobalExercise() {
      throw new Error("Dry-run repository cannot create exercises.");
    },
    async updateGlobalExercise() {
      throw new Error("Dry-run repository cannot update exercises.");
    }
  };
}

export async function applyExerciseCsvImport({
  rows,
  repository,
  dryRun = true
}: {
  rows: ExerciseCsvRow[];
  repository: ExerciseImportRepository;
  dryRun?: boolean;
}): Promise<AppliedExerciseImportResult> {
  const existingExercises = await repository.listExistingGlobalExercises();
  const plan = buildExerciseImportPlan(rows, existingExercises);
  const createdIds: string[] = [];
  const updatedIds: string[] = [];

  if (dryRun) {
    return { dryRun, plan, createdIds, updatedIds };
  }

  for (const item of plan.create) {
    const created = await repository.createGlobalExercise(item.record);
    createdIds.push(created.id);
  }

  for (const item of plan.update) {
    const updated = await repository.updateGlobalExercise(item.id, item.record);
    updatedIds.push(updated.id);
  }

  return { dryRun, plan, createdIds, updatedIds };
}

export function getGlobalExerciseImportCreateData(record: ExerciseImportCandidate) {
  return {
    organizationId: null,
    createdByUserId: null,
    scope: LibraryScope.GLOBAL,
    name: record.name,
    category: record.category,
    equipment: record.equipment,
    primaryMuscles: record.primaryMuscles,
    secondaryMuscles: record.secondaryMuscles,
    difficulty: difficultyToPrisma[record.difficulty],
    videoObjectKey: null,
    videoUrl: null,
    imageObjectKey: null,
    defaultSets: record.defaultSets,
    defaultReps: record.defaultReps,
    defaultRestSeconds: record.defaultRestSeconds,
    executionCues: record.executionCues
  };
}

export function getGlobalExerciseImportUpdateData(record: ExerciseImportCandidate) {
  return {
    name: record.name,
    category: record.category,
    equipment: record.equipment,
    primaryMuscles: record.primaryMuscles,
    secondaryMuscles: record.secondaryMuscles,
    difficulty: difficultyToPrisma[record.difficulty],
    defaultSets: record.defaultSets,
    defaultReps: record.defaultReps,
    defaultRestSeconds: record.defaultRestSeconds,
    executionCues: record.executionCues,
    deletedAt: null
  };
}
