import type {
  ImportedFoodCandidate
} from "@/lib/nutrition/food-import-types";
import type {
  UsdaFoodSearchResult
} from "@/lib/nutrition/usda-fooddata-central";

export function usdaFoodToImportCandidate(
  food: UsdaFoodSearchResult
): ImportedFoodCandidate {
  return {
    sourceId: "usda_fdc",
    sourceFoodId: String(food.fdcId),
    sourceDataType: food.dataType,
    region: "United States",
    countryCodes: ["US"],
    name: food.description,
    brandName: food.brandName ?? food.brandOwner,
    barcode: food.gtinUpc,
    category: food.foodCategory,
    servingSizeText:
      food.servingSize && food.servingSizeUnit
        ? `${food.servingSize}${food.servingSizeUnit}`
        : undefined,
    servingSizeGrams:
      food.servingSizeUnit?.toLowerCase() === "g" ? food.servingSize : undefined,
    nutrientsPer100g: food.nutrients.map((nutrient) => ({
      sourceNutrientId: String(nutrient.nutrientId),
      name: nutrient.nutrientName,
      unit: nutrient.unitName,
      value: nutrient.value
    })),
    raw: food
  };
}
