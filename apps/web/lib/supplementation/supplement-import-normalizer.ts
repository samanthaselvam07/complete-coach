import type {
  SupplementCsvRow,
  SupplementImportCandidate
} from "@/lib/supplementation/supplement-import-types";

export function normaliseSupplementCsvRow(row: SupplementCsvRow): SupplementImportCandidate {
  const name = row["Supplement name"]?.trim();
  const category = row.category?.trim();

  if (!name) {
    throw new Error("Supplement name is required.");
  }

  if (!category) {
    throw new Error(`Category is required for supplement ${name}.`);
  }

  const importKey = buildSupplementImportKey(name, category);
  const description = optional(row.description);
  const usedFor = optional(row["used for"]);
  const benefits = optional(row.benefits);
  const howItWorks = optional(row["how it works"]);
  const clinicalDescription = buildClinicalDescription({
    description,
    usedFor,
    benefits,
    howItWorks,
    clinicalDescription: optional(row["clinical description"])
  });

  return {
    importKey,
    name,
    category,
    recommendedTiming: optional(row["recommended timing"]),
    dosage: optional(row["recommended dosage"]),
    bioavailabilityNotes: optional(row["bioavailably notes"]),
    clinicalDescription,
    tags: parseTags(row.tags),
    sourceUrl: optional(row["source url"]),
    notes: optional(row.notes),
    metadata: {
      importKey,
      sourceId: "supplement_csv",
      description,
      usedFor,
      benefits,
      howItWorks,
      sourceUrl: optional(row["source url"]),
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
