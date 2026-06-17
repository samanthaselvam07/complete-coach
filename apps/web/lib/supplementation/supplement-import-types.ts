export type SupplementCsvRow = {
  "Supplement name": string;
  category: string;
  description?: string;
  "used for"?: string;
  benefits?: string;
  "how it works"?: string;
  "recommended dosage"?: string;
  "recommended timing"?: string;
  "bioavailably notes"?: string;
  "clinical description"?: string;
  tags?: string;
  "source url"?: string;
  notes?: string;
};

export type SupplementImportCandidate = {
  importKey: string;
  name: string;
  category: string;
  recommendedTiming?: string;
  dosage?: string;
  bioavailabilityNotes?: string;
  clinicalDescription?: string;
  tags: string[];
  sourceUrl?: string;
  notes?: string;
  metadata: {
    importKey: string;
    sourceId: "supplement_csv";
    description?: string;
    usedFor?: string;
    benefits?: string;
    howItWorks?: string;
    sourceUrl?: string;
    notes?: string;
  };
};

export type ExistingImportedSupplement = {
  id: string;
  name: string;
  category: string;
  tags: unknown;
};

export type SupplementImportCreatePlanItem = {
  action: "create";
  record: SupplementImportCandidate;
};

export type SupplementImportUpdatePlanItem = {
  action: "update";
  id: string;
  record: SupplementImportCandidate;
};

export type SupplementImportPlan = {
  create: SupplementImportCreatePlanItem[];
  update: SupplementImportUpdatePlanItem[];
  skipped: Array<{ row: SupplementCsvRow; reason: string }>;
};
