export type UsdaFoodDataType =
  | "Foundation"
  | "SR Legacy"
  | "Survey (FNDDS)"
  | "Branded";

export type UsdaFoodSearchOptions = {
  apiKey: string;
  query: string;
  pageSize?: number;
  pageNumber?: number;
  dataTypes?: UsdaFoodDataType[];
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export type UsdaFoodNutrient = {
  nutrientId: number;
  nutrientName: string;
  unitName: string;
  value: number;
};

export type UsdaFoodSearchResult = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients: UsdaFoodNutrient[];
};

export type UsdaFoodSearchResponse = {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: UsdaFoodSearchResult[];
};

type RawUsdaFoodNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type RawUsdaFood = {
  fdcId?: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: RawUsdaFoodNutrient[];
};

type RawUsdaSearchResponse = {
  totalHits?: number;
  currentPage?: number;
  totalPages?: number;
  foods?: RawUsdaFood[];
};

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

export function buildUsdaFoodSearchUrl({
  apiKey,
  query,
  pageSize = 10,
  pageNumber = 1,
  dataTypes,
  baseUrl = USDA_SEARCH_URL
}: Omit<UsdaFoodSearchOptions, "fetcher">) {
  const url = new URL(baseUrl);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("pageNumber", String(pageNumber));

  if (dataTypes?.length) {
    for (const dataType of dataTypes) {
      url.searchParams.append("dataType", dataType);
    }
  }

  return url;
}

export async function searchUsdaFoods({
  apiKey,
  query,
  pageSize = 10,
  pageNumber = 1,
  dataTypes,
  baseUrl,
  fetcher = fetch
}: UsdaFoodSearchOptions): Promise<UsdaFoodSearchResponse> {
  const url = buildUsdaFoodSearchUrl({
    apiKey,
    query,
    pageSize,
    pageNumber,
    dataTypes,
    baseUrl
  });

  const response = await fetcher(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `USDA FoodData Central request failed with ${response.status}: ${body}`
    );
  }

  const payload = (await response.json()) as RawUsdaSearchResponse;

  return {
    totalHits: payload.totalHits ?? 0,
    currentPage: payload.currentPage ?? pageNumber,
    totalPages: payload.totalPages ?? 0,
    foods: (payload.foods ?? [])
      .filter((food): food is RawUsdaFood & { fdcId: number; description: string } => {
        return typeof food.fdcId === "number" && typeof food.description === "string";
      })
      .map((food) => ({
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType ?? "Unknown",
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        gtinUpc: food.gtinUpc,
        foodCategory: food.foodCategory,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        nutrients: (food.foodNutrients ?? [])
          .filter(
            (nutrient): nutrient is Required<RawUsdaFoodNutrient> =>
              typeof nutrient.nutrientId === "number" &&
              typeof nutrient.nutrientName === "string" &&
              typeof nutrient.unitName === "string" &&
              typeof nutrient.value === "number"
          )
          .map((nutrient) => ({
            nutrientId: nutrient.nutrientId,
            nutrientName: nutrient.nutrientName,
            unitName: nutrient.unitName,
            value: nutrient.value
          }))
      }))
  };
}

export function findNutrient(
  food: UsdaFoodSearchResult,
  nutrientName: string
) {
  return food.nutrients.find(
    (nutrient) =>
      nutrient.nutrientName.toLowerCase() === nutrientName.toLowerCase()
  );
}
