import type { InputJsonValue } from "@prisma/client/runtime/client";

import { LibraryScope } from "@/app/generated/prisma/enums";
import { buildFoodImportPlan } from "@/lib/nutrition/food-import-processor";
import {
  getGlobalFoodImportCreateData,
  getGlobalFoodImportUpdateData
} from "@/lib/nutrition/food-import-persistence";
import type {
  ExistingImportedFood,
  FoodImportPlan,
  FoodLibraryImportRecord,
  ImportedFoodCandidate
} from "@/lib/nutrition/food-import-types";

export type AppliedFoodImportResult = {
  dryRun: boolean;
  plan: FoodImportPlan;
  createdIds: string[];
  updatedIds: string[];
};

export type FoodImportRepository = {
  listExistingImportedFoods(): Promise<ExistingImportedFood[]>;
  createGlobalFood(record: FoodLibraryImportRecord): Promise<{ id: string }>;
  updateGlobalFood(
    id: string,
    record: FoodLibraryImportRecord
  ): Promise<{ id: string }>;
};

type PrismaFoodImportClient = {
  foodLibraryItem: {
    findMany(args: {
      where: {
        scope: LibraryScope;
      };
      select: { id: true; metadataJson: true };
    }): Promise<Array<{ id: string; metadataJson: unknown }>>;
    create(args: { data: ReturnType<typeof getGlobalFoodImportCreateData> }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: ReturnType<typeof getGlobalFoodImportUpdateData>;
    }): Promise<{ id: string }>;
  };
};

export function createPrismaFoodImportRepository(
  prisma: PrismaFoodImportClient
): FoodImportRepository {
  return {
    async listExistingImportedFoods() {
      const foods = await prisma.foodLibraryItem.findMany({
        where: {
          scope: LibraryScope.GLOBAL
        },
        select: {
          id: true,
          metadataJson: true
        }
      });

      return foods
        .filter((food) => food.metadataJson !== null)
        .map((food) => ({
          id: food.id,
          metadataJson: food.metadataJson
        }));
    },
    async createGlobalFood(record) {
      return prisma.foodLibraryItem.create({
        data: getGlobalFoodImportCreateData(record)
      });
    },
    async updateGlobalFood(id, record) {
      return prisma.foodLibraryItem.update({
        where: { id },
        data: getGlobalFoodImportUpdateData(record)
      });
    }
  };
}

export function createDryRunFoodImportRepository(
  existingFoods: ExistingImportedFood[] = []
): FoodImportRepository {
  return {
    async listExistingImportedFoods() {
      return existingFoods;
    },
    async createGlobalFood() {
      throw new Error("Dry-run repository cannot create foods.");
    },
    async updateGlobalFood() {
      throw new Error("Dry-run repository cannot update foods.");
    }
  };
}

export async function applyFoodImportCandidates({
  candidates,
  repository,
  dryRun = true
}: {
  candidates: ImportedFoodCandidate[];
  repository: FoodImportRepository;
  dryRun?: boolean;
}): Promise<AppliedFoodImportResult> {
  const existingFoods = await repository.listExistingImportedFoods();
  const plan = buildFoodImportPlan(candidates, existingFoods);
  const createdIds: string[] = [];
  const updatedIds: string[] = [];

  if (dryRun) {
    return { dryRun, plan, createdIds, updatedIds };
  }

  for (const item of plan.create) {
    const created = await repository.createGlobalFood(item.record);
    createdIds.push(created.id);
  }

  for (const item of plan.update) {
    const updated = await repository.updateGlobalFood(item.id, item.record);
    updatedIds.push(updated.id);
  }

  return { dryRun, plan, createdIds, updatedIds };
}

export function toImportMetadataJson(record: FoodLibraryImportRecord) {
  return record.metadata as InputJsonValue;
}
