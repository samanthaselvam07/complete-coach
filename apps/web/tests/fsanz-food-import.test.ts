import { describe, expect, it } from "vitest";

import { parseFsanzFoodCsv } from "@/lib/nutrition/fsanz-food-csv-parser";
import { normaliseImportedFoodCandidate } from "@/lib/nutrition/food-import-normalizer";

const csv = `Food ID,Food Name,Food Group,Energy (kJ),Protein (g),Available carbohydrate (g),Total fat (g),Dietary fibre (g),Serving size
AUSNUT-001,"Chicken breast, grilled",Poultry,690,31,0,3.6,0,100g
AUSNUT-002,"Greek yoghurt, plain",Dairy,330,9.2,4.4,0.3,0,100g
`;

describe("FSANZ AUS/NZ food CSV import", () => {
  it("parses AUS/NZ food CSV rows into import candidates", () => {
    const candidates = parseFsanzFoodCsv(csv, {
      sourceId: "fsanz_ausnut",
      version: "2023"
    });

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      sourceId: "fsanz_ausnut",
      sourceFoodId: "AUSNUT-001",
      sourceVersion: "2023",
      region: "Australia/New Zealand",
      countryCodes: ["AU", "NZ"],
      name: "Chicken breast, grilled",
      category: "Poultry",
      servingSizeText: "100g"
    });
    expect(candidates[0].nutrientsPer100g).toEqual([
      { name: "Energy", unit: "kJ", value: 690 },
      { name: "Protein", unit: "g", value: 31 },
      { name: "Available carbohydrate", unit: "g", value: 0 },
      { name: "Total fat", unit: "g", value: 3.6 },
      { name: "Dietary fibre", unit: "g", value: 0 }
    ]);
  });

  it("normalises AUS/NZ foods into global food records", () => {
    const [candidate] = parseFsanzFoodCsv(csv, {
      sourceId: "fsanz_ausnut",
      version: "2023"
    });
    const record = normaliseImportedFoodCandidate(candidate);

    expect(record).toMatchObject({
      importKey: "fsanz_ausnut:AUSNUT-001:2023",
      name: "Chicken breast, grilled",
      category: "Poultry",
      servingSize: "100g",
      calories: 165,
      proteinGrams: 31,
      carbsGrams: 0,
      fatGrams: 3.6,
      fiberGrams: 0
    });
    expect(record.metadata).toMatchObject({
      sourceId: "fsanz_ausnut",
      sourceFoodId: "AUSNUT-001",
      sourceVersion: "2023",
      countryCodes: ["AU", "NZ"]
    });
  });

  it("accepts branded AUS/NZ headers for packaged food imports", () => {
    const [candidate] = parseFsanzFoodCsv(
      `food_code,description,brand_name,gtin,category,energy_kj,protein,carbohydrate,total_fat,fibre,serving_size_grams
12345,"Protein Bar",Complete Coach,9300000000000,Snack,820,20,18,7,5,60
`,
      { sourceId: "fsanz_branded" }
    );

    expect(candidate).toMatchObject({
      sourceId: "fsanz_branded",
      sourceDataType: "Branded",
      sourceFoodId: "12345",
      brandName: "Complete Coach",
      barcode: "9300000000000",
      servingSizeGrams: 60
    });
  });

  it("reports missing required headers clearly", () => {
    expect(() => parseFsanzFoodCsv("Name,Energy (kJ)\nChicken,690\n")).toThrow(
      "Missing required AUS/NZ food CSV headers: food id"
    );
  });
});
