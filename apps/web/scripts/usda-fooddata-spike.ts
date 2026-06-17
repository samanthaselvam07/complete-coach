import "dotenv/config";

import {
  findNutrient,
  searchUsdaFoods,
  type UsdaFoodDataType
} from "@/lib/nutrition/usda-fooddata-central";

const apiKey = process.env.FDC_API_KEY ?? "DEMO_KEY";
const query = process.argv[2] ?? "greek yogurt";
const dataTypes = parseDataTypes(process.env.FDC_DATA_TYPES);

const results = await searchUsdaFoods({
  apiKey,
  query,
  pageSize: Number(process.env.FDC_PAGE_SIZE ?? 5),
  dataTypes
});

console.log(`USDA FoodData Central search`);
console.log(`query: ${query}`);
console.log(`totalHits: ${results.totalHits}`);
console.log(`currentPage: ${results.currentPage}`);
console.log("");

for (const food of results.foods) {
  const energy = findNutrient(food, "Energy");
  const protein = findNutrient(food, "Protein");
  const carbs = findNutrient(food, "Carbohydrate, by difference");
  const fat = findNutrient(food, "Total lipid (fat)");

  console.log(`${food.fdcId} | ${food.description} | ${food.dataType}`);
  if (food.brandOwner ?? food.brandName) {
    console.log(`brand: ${food.brandName ?? food.brandOwner}`);
  }
  if (food.gtinUpc) {
    console.log(`barcode: ${food.gtinUpc}`);
  }
  if (food.servingSize && food.servingSizeUnit) {
    console.log(`serving: ${food.servingSize}${food.servingSizeUnit}`);
  }
  console.log(
    `per 100g: ${formatNutrient(energy)}, ${formatNutrient(protein)}, ${formatNutrient(carbs)}, ${formatNutrient(fat)}`
  );
  console.log("");
}

function parseDataTypes(value?: string): UsdaFoodDataType[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as UsdaFoodDataType[];
}

function formatNutrient(nutrient: ReturnType<typeof findNutrient>) {
  if (!nutrient) {
    return "missing";
  }

  return `${nutrient.nutrientName} ${nutrient.value}${nutrient.unitName.toLowerCase()}`;
}
