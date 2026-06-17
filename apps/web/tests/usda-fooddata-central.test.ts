import { describe, expect, it, vi } from "vitest";

import {
  buildUsdaFoodSearchUrl,
  findNutrient,
  searchUsdaFoods
} from "@/lib/nutrition/usda-fooddata-central";

describe("USDA FoodData Central client", () => {
  it("builds search URLs using the USDA query shape", () => {
    const url = buildUsdaFoodSearchUrl({
      apiKey: "test-key",
      query: "greek yogurt",
      pageSize: 3,
      dataTypes: ["Foundation", "Branded"]
    });

    expect(url.origin + url.pathname).toBe(
      "https://api.nal.usda.gov/fdc/v1/foods/search"
    );
    expect(url.searchParams.get("api_key")).toBe("test-key");
    expect(url.searchParams.get("query")).toBe("greek yogurt");
    expect(url.searchParams.get("pageSize")).toBe("3");
    expect(url.searchParams.getAll("dataType")).toEqual([
      "Foundation",
      "Branded"
    ]);
  });

  it("maps USDA search responses into Complete Coach import candidates", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalHits: 1,
        currentPage: 1,
        totalPages: 1,
        foods: [
          {
            fdcId: 123,
            description: "GREEK YOGURT",
            dataType: "Branded",
            brandOwner: "Example Foods",
            gtinUpc: "000123456789",
            servingSize: 170,
            servingSizeUnit: "g",
            foodNutrients: [
              {
                nutrientId: 1008,
                nutrientName: "Energy",
                unitName: "KCAL",
                value: 96
              },
              {
                nutrientId: 1003,
                nutrientName: "Protein",
                unitName: "G",
                value: 9
              }
            ]
          }
        ]
      })
    });

    const response = await searchUsdaFoods({
      apiKey: "test-key",
      query: "greek yogurt",
      fetcher
    });

    expect(response.totalHits).toBe(1);
    expect(response.foods[0]).toMatchObject({
      fdcId: 123,
      description: "GREEK YOGURT",
      dataType: "Branded",
      brandOwner: "Example Foods",
      gtinUpc: "000123456789",
      servingSize: 170,
      servingSizeUnit: "g"
    });
    expect(findNutrient(response.foods[0], "Protein")).toMatchObject({
      value: 9,
      unitName: "G"
    });
  });
});
