import {
  normaliseSupplementCsvRow
} from "@/lib/supplementation/supplement-import-normalizer";
import type {
  ExistingImportedSupplement,
  SupplementCsvRow,
  SupplementImportPlan
} from "@/lib/supplementation/supplement-import-types";

export function buildSupplementImportPlan(
  rows: SupplementCsvRow[],
  existingSupplements: ExistingImportedSupplement[]
): SupplementImportPlan {
  const existingByKey = new Map(
    existingSupplements.map((supplement) => [
      readSupplementImportKey(supplement) ??
        fallbackSupplementImportKey(supplement.name, supplement.category),
      supplement
    ])
  );
  const seen = new Set<string>();
  const create: SupplementImportPlan["create"] = [];
  const update: SupplementImportPlan["update"] = [];
  const skipped: SupplementImportPlan["skipped"] = [];

  for (const row of rows) {
    let record;
    try {
      record = normaliseSupplementCsvRow(row);
    } catch (error) {
      skipped.push({
        row,
        reason: error instanceof Error ? error.message : "Invalid supplement row."
      });
      continue;
    }

    if (seen.has(record.importKey)) {
      skipped.push({ row, reason: "Duplicate supplement in import batch." });
      continue;
    }
    seen.add(record.importKey);

    const existing = existingByKey.get(record.importKey);
    if (existing) {
      update.push({ action: "update", id: existing.id, record });
    } else {
      create.push({ action: "create", record });
    }
  }

  return { create, update, skipped };
}

function readSupplementImportKey(supplement: ExistingImportedSupplement) {
  if (!Array.isArray(supplement.tags)) {
    return undefined;
  }

  const importKeyTag = supplement.tags.find(
    (tag) => typeof tag === "string" && tag.startsWith("import-key:")
  );

  if (typeof importKeyTag !== "string") {
    return undefined;
  }

  return importKeyTag.replace("import-key:", "");
}

function fallbackSupplementImportKey(name: string, category: string) {
  return `supplement_csv:${slugify(category)}:${slugify(name)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
