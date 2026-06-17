import { describe, expect, it, vi } from "vitest";

import { parseSupplementCsv } from "@/lib/supplementation/supplement-csv-parser";
import { normaliseSupplementCsvRow } from "@/lib/supplementation/supplement-import-normalizer";
import { buildSupplementImportPlan } from "@/lib/supplementation/supplement-import-processor";
import {
  applySupplementCsvImport,
  createDryRunSupplementImportRepository,
  getGlobalSupplementImportCreateData,
  type SupplementImportRepository
} from "@/lib/supplementation/supplement-import-writer";
import { LibraryScope } from "@/app/generated/prisma/enums";

const csv = `Supplement name,category,description,used for,benefits,how it works,recommended dosage,recommended timing,bioavailably notes,clinical description,tags,source url,notes
"Creatine Monohydrate",Performance,"Well studied supplement",Strength and power,"Improves repeat high-intensity performance","Supports phosphocreatine resynthesis",3-5g daily,Daily,Consistent daily dosing matters,,"strength;performance",https://example.com/creatine,"Use micronized where possible"
"Magnesium Glycinate",Recovery,"Highly tolerated form",Sleep and relaxation,"May support sleep quality","Supports magnesium status",200-400mg,Night,Generally well tolerated,"Coach-facing clinical notes","sleep,recovery",https://example.com/magnesium,
`;

describe("supplement CSV import", () => {
  it("parses the supplied supplement CSV headers and quoted values", () => {
    const rows = parseSupplementCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]["Supplement name"]).toBe("Creatine Monohydrate");
    expect(rows[0].benefits).toBe("Improves repeat high-intensity performance");
    expect(rows[1]["clinical description"]).toBe("Coach-facing clinical notes");
  });

  it("normalises supplement CSV rows into global supplement candidates", () => {
    const [row] = parseSupplementCsv(csv);
    const record = normaliseSupplementCsvRow(row);

    expect(record).toMatchObject({
      importKey: "supplement_csv:performance:creatine-monohydrate",
      name: "Creatine Monohydrate",
      category: "Performance",
      dosage: "3-5g daily",
      recommendedTiming: "Daily",
      bioavailabilityNotes: "Consistent daily dosing matters",
      sourceUrl: "https://example.com/creatine",
      notes: "Use micronized where possible"
    });
    expect(record.tags).toEqual(["strength", "performance"]);
    expect(record.clinicalDescription).toContain("Used for: Strength and power");
    expect(record.clinicalDescription).toContain(
      "How it works: Supports phosphocreatine resynthesis"
    );
  });

  it("accepts snake_case supplement CSV headers from export files", () => {
    const rows = parseSupplementCsv(`supplement_name,category,description,used_for,benefits,how_it_works,recommended_dosage,recommended_timing,bioavailability_notes,clinical_description,tags,source_url,notes
"Creatine Monohydrate",Performance,"Well studied supplement",Strength and power,"Improves repeat high-intensity performance","Supports phosphocreatine resynthesis",3-5g daily,Daily,Consistent daily dosing matters,,"strength;performance",https://example.com/creatine,"Use micronized where possible"
`);

    const record = normaliseSupplementCsvRow(rows[0]);

    expect(record).toMatchObject({
      name: "Creatine Monohydrate",
      category: "Performance",
      dosage: "3-5g daily",
      recommendedTiming: "Daily",
      bioavailabilityNotes: "Consistent daily dosing matters",
      sourceUrl: "https://example.com/creatine",
      notes: "Use micronized where possible"
    });
    expect(record.clinicalDescription).toContain("Used for: Strength and power");
  });

  it("plans supplement creates, updates, and duplicate skips", () => {
    const rows = parseSupplementCsv(`${csv}${csv.split("\n")[1]}\n`);

    const plan = buildSupplementImportPlan(rows, [
      {
        id: "existing-creatine",
        name: "Creatine Monohydrate",
        category: "Performance",
        tags: ["import-key:supplement_csv:performance:creatine-monohydrate"]
      }
    ]);

    expect(plan.update).toHaveLength(1);
    expect(plan.update[0]).toMatchObject({
      id: "existing-creatine",
      record: { name: "Creatine Monohydrate" }
    });
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).toMatchObject({
      record: { name: "Magnesium Glycinate" }
    });
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].reason).toBe("Duplicate supplement in import batch.");
  });

  it("maps supplement import records to global supplement writes", () => {
    const [row] = parseSupplementCsv(csv);
    const record = normaliseSupplementCsvRow(row);

    expect(getGlobalSupplementImportCreateData(record)).toMatchObject({
      organizationId: null,
      createdByUserId: null,
      scope: LibraryScope.GLOBAL,
      name: "Creatine Monohydrate",
      category: "Performance",
      recommendedTiming: "Daily",
      dosage: "3-5g daily",
      tags: [
        "strength",
        "performance",
        "import-key:supplement_csv:performance:creatine-monohydrate",
        "source:supplement_csv",
        "source-url:https://example.com/creatine"
      ]
    });
  });

  it("dry-runs without writing and commits create/update operations", async () => {
    const rows = parseSupplementCsv(csv);
    const dryRun = await applySupplementCsvImport({
      rows,
      repository: createDryRunSupplementImportRepository(),
      dryRun: true
    });

    expect(dryRun.plan.create).toHaveLength(2);

    const repository = createRepository([
      {
        id: "existing-creatine",
        name: "Creatine Monohydrate",
        category: "Performance",
        tags: ["import-key:supplement_csv:performance:creatine-monohydrate"]
      }
    ]);

    const committed = await applySupplementCsvImport({
      rows,
      repository,
      dryRun: false
    });

    expect(committed.createdIds).toEqual(["created-supplement"]);
    expect(committed.updatedIds).toEqual(["updated-existing-creatine"]);
    expect(repository.createGlobalSupplement).toHaveBeenCalledOnce();
    expect(repository.updateGlobalSupplement).toHaveBeenCalledOnce();
  });
});

function createRepository(
  existingSupplements: Awaited<
    ReturnType<SupplementImportRepository["listExistingImportedSupplements"]>
  > = []
) {
  return {
    listExistingImportedSupplements: vi.fn().mockResolvedValue(existingSupplements),
    createGlobalSupplement: vi.fn().mockResolvedValue({ id: "created-supplement" }),
    updateGlobalSupplement: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve({ id: `updated-${id}` })
      )
  } satisfies SupplementImportRepository;
}
