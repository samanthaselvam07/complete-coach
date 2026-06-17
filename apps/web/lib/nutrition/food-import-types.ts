export const foodImportSourceIds = [
  "usda_fdc",
  "fsanz_afcd",
  "fsanz_ausnut",
  "fsanz_branded",
  "efsa_foodex2",
  "custom"
] as const;

export type FoodImportSourceId = (typeof foodImportSourceIds)[number];

export type ImportedFoodNutrient = {
  sourceNutrientId?: string;
  name: string;
  unit: string;
  value: number;
};

export type ImportedFoodCandidate = {
  sourceId: FoodImportSourceId;
  sourceFoodId: string;
  sourceVersion?: string;
  sourceDataType?: string;
  region?: string;
  countryCodes?: string[];
  name: string;
  brandName?: string;
  barcode?: string;
  category?: string;
  servingSizeText?: string;
  servingSizeGrams?: number;
  nutrientsPer100g: ImportedFoodNutrient[];
  raw?: unknown;
};

export type FoodLibraryImportMetadata = {
  importKey: string;
  sourceId: FoodImportSourceId;
  sourceFoodId: string;
  sourceVersion?: string;
  sourceDataType?: string;
  region?: string;
  countryCodes?: string[];
  brandName?: string;
  barcode?: string;
  servingSizeGrams?: number;
  nutrientsPer100g: ImportedFoodNutrient[];
  raw?: unknown;
};

export type FoodLibraryImportRecord = {
  importKey: string;
  name: string;
  category: string;
  servingSize: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  metadata: FoodLibraryImportMetadata;
};

export type ExistingImportedFood = {
  id: string;
  metadataJson: unknown;
};

export type FoodImportCreatePlanItem =
  | {
      action: "create";
      record: FoodLibraryImportRecord;
    };

export type FoodImportUpdatePlanItem = {
  action: "update";
  id: string;
  record: FoodLibraryImportRecord;
};

export type FoodImportPlanItem =
  | FoodImportCreatePlanItem
  | FoodImportUpdatePlanItem;

export type FoodImportPlan = {
  create: FoodImportCreatePlanItem[];
  update: FoodImportUpdatePlanItem[];
  skipped: Array<{ candidate: ImportedFoodCandidate; reason: string }>;
};
