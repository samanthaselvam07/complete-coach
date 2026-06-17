import type {
  SupplementCsvRow,
  SupplementImportCandidate
} from "@/lib/supplementation/supplement-import-types";

export function normaliseSupplementCsvRow(row: SupplementCsvRow): SupplementImportCandidate {
  const name = getFirst(row, "Supplement name", "supplement_name");
  const category = row.category?.trim();

  if (!name) {
    throw new Error("Supplement name is required.");
  }

  if (!category) {
    throw new Error(`Category is required for supplement ${name}.`);
  }

  const importKey = buildSupplementImportKey(name, category);
  const description = optional(row.description);
  const usedFor = getFirst(row, "used for", "used_for");
  const benefits = optional(row.benefits);
  const howItWorks = getFirst(row, "how it works", "how_it_works");
  const clinicalDescription = buildClinicalDescription({
    description,
    usedFor,
    benefits,
    howItWorks,
    clinicalDescription: getFirst(row, "clinical description", "clinical_description")
  });

  return {
    importKey,
    name,
    category,
    recommendedTiming: getFirst(row, "recommended timing", "recommended_timing"),
    dosage: getFirst(row, "recommended dosage", "recommended_dosage"),
    bioavailabilityNotes: getFirst(
      row,
      "bioavailably notes",
      "bioavailability notes",
      "bioavailability_notes"
    ),
    clinicalDescription,
    tags: parseTags(row.tags),
    sourceUrl: getFirst(row, "source url", "source_url"),
    notes: optional(row.notes),
    metadata: {
      importKey,
      sourceId: "supplement_csv",
      description,
      usedFor,
      benefits,
      howItWorks,
      sourceUrl: getFirst(row, "source url", "source_url"),
      notes: optional(row.notes)
    }
  };
}

export function buildSupplementImportKey(name: string, category: string) {
  return `supplement_csv:${slugify(category)}:${slugify(name)}`;
}

function buildClinicalDescription({
  description,
  usedFor,
  benefits,
  howItWorks,
  clinicalDescription
}: {
  description?: string;
  usedFor?: string;
  benefits?: string;
  howItWorks?: string;
  clinicalDescription?: string;
}) {
  if (clinicalDescription) {
    return clinicalDescription;
  }

  return [
    description,
    usedFor ? `Used for: ${usedFor}` : undefined,
    benefits ? `Benefits: ${benefits}` : undefined,
    howItWorks ? `How it works: ${howItWorks}` : undefined
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseTags(tags?: string) {
  return (tags ?? "")
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function optional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getFirst(row: SupplementCsvRow, ...keys: Array<keyof SupplementCsvRow>) {
  for (const key of keys) {
    const value = optional(row[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
