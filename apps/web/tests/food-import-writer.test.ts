import { describe, expect, it, vi } from "vitest";

import {
  applyFoodImportCandidates,
  createDryRunFoodImportRepository,
  type FoodImportRepository
} from "@/lib/nutrition/food-import-writer";
import type { ImportedFoodCandidate } from "@/lib/nutrition/food-import-types";

const candidate = {
  sourceId: "custom",
  sourceFoodId: "food-1",
  name: "Imported Rice",
  category: "Carbs",
  servingSizeText: "100g",
  nutrientsPer100g: [
    { name: "Energy", unit: "KCAL", value: 121 },
    { name: "Protein", unit: "G", value: 3 },
    { name: "Carbohydrate", unit: "G", value: 25 },
    { name: "Fat", unit: "G", value: 0.4 }
  ]
} satisfies ImportedFoodCandidate;

describe("food import writer", () => {
  it("plans without writing in dry-run mode", async () => {
    const repository = createRepository();

    const result = await applyFoodImportCandidates({
      candidates: [candidate],
      repository,
      dryRun: true
    });

    expect(result.dryRun).toBe(true);
    expect(result.plan.create).toHaveLength(1);
    expect(repository.createGlobalFood).not.toHaveBeenCalled();
    expect(repository.updateGlobalFood).not.toHaveBeenCalled();
  });

  it("supports offline dry-run planning without a database repository", async () => {
    const result = await applyFoodImportCandidates({
      candidates: [candidate],
      repository: createDryRunFoodImportRepository(),
      dryRun: true
    });

    expect(result.plan.create).toHaveLength(1);
  });

  it("creates and updates records when committed", async () => {
    const repository = createRepository([
      {
        id: "existing-food",
        metadataJson: { importKey: "custom:food-1:current" }
      }
    ]);

    const updateResult = await applyFoodImportCandidates({
      candidates: [candidate],
      repository,
      dryRun: false
    });

    expect(updateResult.updatedIds).toEqual(["updated-existing-food"]);
    expect(repository.updateGlobalFood).toHaveBeenCalledOnce();

    const createRepositoryMock = createRepository();
    const createResult = await applyFoodImportCandidates({
      candidates: [candidate],
      repository: createRepositoryMock,
      dryRun: false
    });

    expect(createResult.createdIds).toEqual(["created-food"]);
    expect(createRepositoryMock.createGlobalFood).toHaveBeenCalledOnce();
  });
});

function createRepository(
  existingFoods: Awaited<
    ReturnType<FoodImportRepository["listExistingImportedFoods"]>
  > = []
) {
  return {
    listExistingImportedFoods: vi.fn().mockResolvedValue(existingFoods),
    createGlobalFood: vi.fn().mockResolvedValue({ id: "created-food" }),
    updateGlobalFood: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve({ id: `updated-${id}` })
      )
  } satisfies FoodImportRepository;
}
