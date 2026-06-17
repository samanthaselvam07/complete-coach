import { describe, expect, it } from "vitest";

import { buildFoodImportPlan } from "@/lib/nutrition/food-import-processor";
import { fsanzRowToImportCandidate } from "@/lib/nutrition/fsanz-food-import-adapter";
import {
  getGlobalFoodImportCreateData,
  getGlobalFoodImportUpdateData
} from "@/lib/nutrition/food-import-persistence";
import { normaliseImportedFoodCandidate } from "@/lib/nutrition/food-import-normalizer";
import { usdaFoodToImportCandidate } from "@/lib/nutrition/usda-food-import-adapter";
import { LibraryScope } from "@/app/generated/prisma/enums";
import type { ImportedFoodCandidate } from "@/lib/nutrition/food-import-types";
import type { UsdaFoodSearchResult } from "@/lib/nutrition/usda-fooddata-central";

const usdaFood = {
  fdcId: 2038865,
  description: "GREEK YOGURT",
  dataType: "Branded",
  brandName: "CHOBANI",
  gtinUpc: "894700010038",
  foodCategory: "Yogurt",
  servingSize: 150,
  servingSizeUnit: "g",
  nutrients: [
    { nutrientId: 1008, nutrientName: "Energy", unitName: "KCAL", value: 80 },
    { nutrientId: 1003, nutrientName: "Protein", unitName: "G", value: 8.67 },
    {
      nutrientId: 1005,
      nutrientName: "Carbohydrate, by difference",
      unitName: "G",
      value: 10.7
    },
    {
      nutrientId: 1004,
      nutrientName: "Total lipid (fat)",
      unitName: "G",
      value: 0
    }
  ]
} satisfies UsdaFoodSearchResult;

describe("food import processing", () => {
  it("normalises USDA branded foods into food library import records", () => {
    const record = normaliseImportedFoodCandidate(
      usdaFoodToImportCandidate(usdaFood)
    );

    expect(record).toMatchObject({
      importKey: "usda_fdc:2038865:current",
      name: "CHOBANI GREEK YOGURT",
      category: "Yogurt",
      servingSize: "150g",
      calories: 80,
      proteinGrams: 8.67,
      carbsGrams: 10.7,
      fatGrams: 0
    });
    expect(record.metadata).toMatchObject({
      sourceId: "usda_fdc",
      sourceFoodId: "2038865",
      barcode: "894700010038",
      countryCodes: ["US"]
    });
  });

  it("normalises FSANZ-style rows into Australian and New Zealand import records", () => {
    const candidate = fsanzRowToImportCandidate({
      sourceId: "fsanz_ausnut",
      foodId: "AUSNUT-001",
      version: "2023",
      name: "Chicken breast, grilled",
      category: "Poultry",
      servingSizeText: "100g",
      nutrientsPer100g: [
        { name: "Energy", unit: "kJ", value: 690 },
        { name: "Protein", unit: "g", value: 31 },
        { name: "Available carbohydrate", unit: "g", value: 0 },
        { name: "Total fat", unit: "g", value: 3.6 },
        { name: "Dietary fibre", unit: "g", value: 0 }
      ]
    });

    const record = normaliseImportedFoodCandidate(candidate);

    expect(record.importKey).toBe("fsanz_ausnut:AUSNUT-001:2023");
    expect(record.calories).toBe(165);
    expect(record.proteinGrams).toBe(31);
    expect(record.carbsGrams).toBe(0);
    expect(record.fatGrams).toBe(3.6);
    expect(record.metadata.countryCodes).toEqual(["AU", "NZ"]);
  });

  it("plans creates, updates, and duplicate skips by source import key", () => {
    const candidate = usdaFoodToImportCandidate(usdaFood);
    const newCandidate: ImportedFoodCandidate = {
      ...candidate,
      sourceFoodId: "new-food"
    };

    const plan = buildFoodImportPlan([candidate, candidate, newCandidate], [
      {
        id: "existing-food",
        metadataJson: { importKey: "usda_fdc:2038865:current" }
      }
    ]);

    expect(plan.update).toHaveLength(1);
    expect(plan.update[0]).toMatchObject({
      action: "update",
      id: "existing-food"
    });
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).toMatchObject({
      action: "create",
      record: { importKey: "usda_fdc:new-food:current" }
    });
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].reason).toBe("Duplicate candidate in import batch.");
  });

  it("maps normalised import records into global food library writes", () => {
    const record = normaliseImportedFoodCandidate(
      usdaFoodToImportCandidate(usdaFood)
    );

    expect(getGlobalFoodImportCreateData(record)).toMatchObject({
      organizationId: null,
      createdByUserId: null,
      scope: LibraryScope.GLOBAL,
      name: "CHOBANI GREEK YOGURT",
      category: "Yogurt",
      calories: 80,
      metadataJson: {
        importKey: "usda_fdc:2038865:current",
        sourceId: "usda_fdc"
      }
    });
    expect(getGlobalFoodImportUpdateData(record)).toMatchObject({
      deletedAt: null,
      name: "CHOBANI GREEK YOGURT",
      metadataJson: {
        importKey: "usda_fdc:2038865:current",
        sourceId: "usda_fdc"
      }
    });
  });
});
