import type { ApiExerciseDifficulty } from "@/lib/training/training-records";

export type ExerciseCsvRow = Record<string, string>;

export type ExerciseImportCandidate = {
  importKey: string;
  name: string;
  category: string;
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  difficulty: ApiExerciseDifficulty;
  defaultSets?: number;
  defaultReps?: string;
  defaultRestSeconds?: number;
  executionCues?: string[];
};

export type ExistingImportedExercise = {
  id: string;
  name: string;
  category: string;
};

export type ExerciseImportPlan = {
  create: Array<{ record: ExerciseImportCandidate }>;
  update: Array<{ id: string; record: ExerciseImportCandidate }>;
  skipped: Array<{ row: ExerciseCsvRow; reason: string }>;
};
