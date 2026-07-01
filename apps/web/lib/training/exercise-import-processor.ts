import { normaliseExerciseCsvRow, normaliseExerciseName } from "@/lib/training/exercise-import-normalizer";
import type {
  ExerciseCsvRow,
  ExerciseImportPlan,
  ExistingImportedExercise
} from "@/lib/training/exercise-import-types";

export function buildExerciseImportPlan(
  rows: ExerciseCsvRow[],
  existingExercises: ExistingImportedExercise[]
): ExerciseImportPlan {
  const existingByName = new Map(
    existingExercises.map((exercise) => [normaliseExerciseName(exercise.name), exercise])
  );
  const seenImportNames = new Set<string>();
  const plan: ExerciseImportPlan = {
    create: [],
    update: [],
    skipped: []
  };

  for (const row of rows) {
    const record = normaliseExerciseCsvRow(row);
    const importName = normaliseExerciseName(record.name);

    if (seenImportNames.has(importName)) {
      plan.skipped.push({ row, reason: "Duplicate exercise in import batch." });
      continue;
    }

    seenImportNames.add(importName);
    const existing = existingByName.get(importName);

    if (existing) {
      plan.update.push({ id: existing.id, record });
      continue;
    }

    plan.create.push({ record });
  }

  return plan;
}
