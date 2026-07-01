import type { ApiExerciseDifficulty } from "@/lib/training/training-records";
import type { ExerciseCsvRow, ExerciseImportCandidate } from "@/lib/training/exercise-import-types";

const difficultyValues: ApiExerciseDifficulty[] = ["beginner", "intermediate", "advanced"];

export function normaliseExerciseCsvRow(row: ExerciseCsvRow): ExerciseImportCandidate {
  const name = getFirst(row, "exercise", "exercise name", "exercise_name", "name");

  if (!name) {
    throw new Error("Exercise name is required.");
  }

  const category = getFirst(row, "category", "categories", "body part", "body_part", "movement pattern", "movement_pattern") || "General";
  const difficulty = normaliseDifficulty(getFirst(row, "difficulty"));

  return {
    importKey: `exercise_csv:${slugify(name)}`,
    name,
    category,
    equipment: getOptional(row, "equipment", "equipment needed", "equipment_needed"),
    primaryMuscles: splitList(getFirst(row, "primary muscles", "primary_muscles", "primary activating muscles", "muscles", "target muscles", "target_muscles")) || ["General"],
    secondaryMuscles: splitList(getFirst(row, "secondary muscles", "secondary_muscles", "secondary activating muscles")),
    difficulty,
    defaultSets: parseOptionalInteger(getFirst(row, "default sets", "default_sets", "sets")),
    defaultReps: getOptional(row, "default reps", "default_reps", "reps"),
    defaultRestSeconds: parseOptionalInteger(getFirst(row, "default rest seconds", "default_rest_seconds", "rest seconds", "rest_seconds")),
    executionCues: splitList(getFirst(row, "execution cues", "execution_cues", "coaching cues", "coaching_cues", "exercise tips", "exercise instructions (step by step)", "instructions"))
  };
}

export function normaliseExerciseName(value: string) {
  return slugify(value);
}

function normaliseDifficulty(value: string): ApiExerciseDifficulty {
  const normalisedValue = value.trim().toLowerCase();
  return difficultyValues.includes(normalisedValue as ApiExerciseDifficulty)
    ? (normalisedValue as ApiExerciseDifficulty)
    : "intermediate";
}

function getOptional(row: ExerciseCsvRow, ...headers: string[]) {
  const value = getFirst(row, ...headers);
  return value || undefined;
}

function getFirst(row: ExerciseCsvRow, ...headers: string[]) {
  for (const header of headers) {
    const value = row[header.toLowerCase()]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function splitList(value: string) {
  const items = value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.round(parsedValue) : undefined;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
