import type { InputJsonValue } from "@prisma/client/runtime/client";

import { LibraryScope } from "@/app/generated/prisma/enums";
import type {
  FoodLibraryImportRecord
} from "@/lib/nutrition/food-import-types";

export function getGlobalFoodImportCreateData(record: FoodLibraryImportRecord) {
  return {
    organizationId: null,
    createdByUserId: null,
    scope: LibraryScope.GLOBAL,
    name: record.name,
    category: record.category,
    servingSize: record.servingSize,
    calories: record.calories,
    proteinGrams: record.proteinGrams,
    carbsGrams: record.carbsGrams,
    fatGrams: record.fatGrams,
    fiberGrams: record.fiberGrams,
    metadataJson: record.metadata as InputJsonValue
  };
}

export function getGlobalFoodImportUpdateData(record: FoodLibraryImportRecord) {
  return {
    name: record.name,
    category: record.category,
    servingSize: record.servingSize,
    calories: record.calories,
    proteinGrams: record.proteinGrams,
    carbsGrams: record.carbsGrams,
    fatGrams: record.fatGrams,
    fiberGrams: record.fiberGrams,
    metadataJson: record.metadata as InputJsonValue,
    deletedAt: null
  };
}
