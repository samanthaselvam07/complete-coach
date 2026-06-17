import {
  normaliseImportedFoodCandidate
} from "@/lib/nutrition/food-import-normalizer";
import type {
  ExistingImportedFood,
  FoodImportCreatePlanItem,
  FoodImportPlan,
  FoodImportUpdatePlanItem,
  ImportedFoodCandidate
} from "@/lib/nutrition/food-import-types";

export function buildFoodImportPlan(
  candidates: ImportedFoodCandidate[],
  existingFoods: ExistingImportedFood[]
): FoodImportPlan {
  const existingByKey = new Map(
    existingFoods
      .map((food) => [readImportKey(food.metadataJson), food] as const)
      .filter((entry): entry is [string, ExistingImportedFood] => Boolean(entry[0]))
  );

  const create: FoodImportCreatePlanItem[] = [];
  const update: FoodImportUpdatePlanItem[] = [];
  const skipped: FoodImportPlan["skipped"] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const record = normaliseImportedFoodCandidate(candidate);

    if (seen.has(record.importKey)) {
      skipped.push({ candidate, reason: "Duplicate candidate in import batch." });
      continue;
    }

    seen.add(record.importKey);

    const existing = existingByKey.get(record.importKey);
    if (existing) {
      update.push({ action: "update", id: existing.id, record });
      continue;
    }

    create.push({ action: "create", record });
  }

  return { create, update, skipped };
}

export function readImportKey(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object") {
    return undefined;
  }

  const metadata = metadataJson as { importKey?: unknown };
  return typeof metadata.importKey === "string" ? metadata.importKey : undefined;
}
