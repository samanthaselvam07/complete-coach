import type {
  FoodLibraryImportMetadata,
  FoodLibraryImportRecord,
  ImportedFoodCandidate,
  ImportedFoodNutrient
} from "@/lib/nutrition/food-import-types";

type MacroNutrientName = "calories" | "protein" | "carbs" | "fat" | "fiber";

const nutrientAliases: Record<MacroNutrientName, string[]> = {
  calories: ["energy", "energy, with dietary fibre", "energy, without dietary fibre"],
  protein: ["protein"],
  carbs: ["carbohydrate, by difference", "carbohydrate", "available carbohydrate"],
  fat: ["total lipid (fat)", "fat", "total fat"],
  fiber: ["fiber, total dietary", "fibre, total dietary", "dietary fibre", "fiber"]
};

export function normaliseImportedFoodCandidate(
  candidate: ImportedFoodCandidate
): FoodLibraryImportRecord {
  const calories = getCalories(candidate.nutrientsPer100g);
  const protein = getNutrientValue(candidate.nutrientsPer100g, "protein");
  const carbs = getNutrientValue(candidate.nutrientsPer100g, "carbs");
  const fat = getNutrientValue(candidate.nutrientsPer100g, "fat");
  const fiber = getNutrientValue(candidate.nutrientsPer100g, "fiber");
  const importKey = buildFoodImportKey(candidate);
  const metadata: FoodLibraryImportMetadata = {
    importKey,
    sourceId: candidate.sourceId,
    sourceFoodId: candidate.sourceFoodId,
    sourceVersion: candidate.sourceVersion,
    sourceDataType: candidate.sourceDataType,
    region: candidate.region,
    countryCodes: candidate.countryCodes,
    brandName: candidate.brandName,
    barcode: candidate.barcode,
    servingSizeGrams: candidate.servingSizeGrams,
    nutrientsPer100g: candidate.nutrientsPer100g,
    raw: candidate.raw
  };

  return {
    importKey,
    name: candidate.brandName
      ? `${candidate.brandName} ${candidate.name}`.trim()
      : candidate.name,
    category: candidate.category ?? "Imported Foods",
    servingSize:
      candidate.servingSizeText ??
      (candidate.servingSizeGrams ? `${candidate.servingSizeGrams}g` : "100g"),
    calories: Math.round(calories),
    proteinGrams: roundToTwo(protein),
    carbsGrams: roundToTwo(carbs),
    fatGrams: roundToTwo(fat),
    fiberGrams: fiber === undefined ? undefined : roundToTwo(fiber),
    metadata
  };
}

export function buildFoodImportKey(candidate: ImportedFoodCandidate) {
  return [
    candidate.sourceId,
    candidate.sourceFoodId,
    candidate.sourceVersion ?? "current"
  ].join(":");
}

export function getNutrientValue(
  nutrients: ImportedFoodNutrient[],
  nutrientName: Exclude<MacroNutrientName, "calories">
) {
  const aliases = nutrientAliases[nutrientName].map((alias) => alias.toLowerCase());
  const nutrient = nutrients.find((item) =>
    aliases.includes(item.name.trim().toLowerCase())
  );

  return nutrient?.value;
}

function getCalories(nutrients: ImportedFoodNutrient[]) {
  const energy = nutrients.find((item) =>
    nutrientAliases.calories.includes(item.name.trim().toLowerCase())
  );

  if (!energy) {
    return 0;
  }

  if (energy.unit.trim().toLowerCase() === "kj") {
    return energy.value / 4.184;
  }

  return energy.value;
}

function roundToTwo(value?: number) {
  if (value === undefined) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}
