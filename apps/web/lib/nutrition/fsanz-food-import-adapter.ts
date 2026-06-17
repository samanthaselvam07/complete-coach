import type {
  ImportedFoodCandidate,
  ImportedFoodNutrient
} from "@/lib/nutrition/food-import-types";

export type FsanzFoodImportRow = {
  sourceId: "fsanz_afcd" | "fsanz_ausnut" | "fsanz_branded";
  foodId: string;
  name: string;
  version?: string;
  brandName?: string;
  barcode?: string;
  category?: string;
  servingSizeText?: string;
  servingSizeGrams?: number;
  nutrientsPer100g: ImportedFoodNutrient[];
  raw?: unknown;
};

export function fsanzRowToImportCandidate(
  row: FsanzFoodImportRow
): ImportedFoodCandidate {
  return {
    sourceId: row.sourceId,
    sourceFoodId: row.foodId,
    sourceVersion: row.version,
    sourceDataType: row.sourceId === "fsanz_branded" ? "Branded" : "Generic",
    region: "Australia/New Zealand",
    countryCodes: ["AU", "NZ"],
    name: row.name,
    brandName: row.brandName,
    barcode: row.barcode,
    category: row.category,
    servingSizeText: row.servingSizeText,
    servingSizeGrams: row.servingSizeGrams,
    nutrientsPer100g: row.nutrientsPer100g,
    raw: row.raw
  };
}
