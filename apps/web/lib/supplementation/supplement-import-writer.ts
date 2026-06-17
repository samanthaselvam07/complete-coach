import { LibraryScope } from "@/app/generated/prisma/enums";
import { buildSupplementImportPlan } from "@/lib/supplementation/supplement-import-processor";
import type {
  ExistingImportedSupplement,
  SupplementCsvRow,
  SupplementImportCandidate,
  SupplementImportPlan
} from "@/lib/supplementation/supplement-import-types";

export type AppliedSupplementImportResult = {
  dryRun: boolean;
  plan: SupplementImportPlan;
  createdIds: string[];
  updatedIds: string[];
};

export type SupplementImportRepository = {
  listExistingImportedSupplements(): Promise<ExistingImportedSupplement[]>;
  createGlobalSupplement(record: SupplementImportCandidate): Promise<{ id: string }>;
  updateGlobalSupplement(
    id: string,
    record: SupplementImportCandidate
  ): Promise<{ id: string }>;
};

type PrismaSupplementImportClient = {
  supplementLibraryItem: {
    findMany(args: {
      where: { scope: LibraryScope };
      select: { id: true; name: true; category: true; tags: true };
    }): Promise<Array<{ id: string; name: string; category: string; tags: unknown }>>;
    create(args: { data: ReturnType<typeof getGlobalSupplementImportCreateData> }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: ReturnType<typeof getGlobalSupplementImportUpdateData>;
    }): Promise<{ id: string }>;
  };
};

export function createPrismaSupplementImportRepository(
  prisma: PrismaSupplementImportClient
): SupplementImportRepository {
  return {
    async listExistingImportedSupplements() {
      return prisma.supplementLibraryItem.findMany({
        where: { scope: LibraryScope.GLOBAL },
        select: { id: true, name: true, category: true, tags: true }
      });
    },
    async createGlobalSupplement(record) {
      return prisma.supplementLibraryItem.create({
        data: getGlobalSupplementImportCreateData(record)
      });
    },
    async updateGlobalSupplement(id, record) {
      return prisma.supplementLibraryItem.update({
        where: { id },
        data: getGlobalSupplementImportUpdateData(record)
      });
    }
  };
}

export function createDryRunSupplementImportRepository(
  existingSupplements: ExistingImportedSupplement[] = []
): SupplementImportRepository {
  return {
    async listExistingImportedSupplements() {
      return existingSupplements;
    },
    async createGlobalSupplement() {
      throw new Error("Dry-run repository cannot create supplements.");
    },
    async updateGlobalSupplement() {
      throw new Error("Dry-run repository cannot update supplements.");
    }
  };
}

export async function applySupplementCsvImport({
  rows,
  repository,
  dryRun = true
}: {
  rows: SupplementCsvRow[];
  repository: SupplementImportRepository;
  dryRun?: boolean;
}): Promise<AppliedSupplementImportResult> {
  const existingSupplements = await repository.listExistingImportedSupplements();
  const plan = buildSupplementImportPlan(rows, existingSupplements);
  const createdIds: string[] = [];
  const updatedIds: string[] = [];

  if (dryRun) {
    return { dryRun, plan, createdIds, updatedIds };
  }

  for (const item of plan.create) {
    const created = await repository.createGlobalSupplement(item.record);
    createdIds.push(created.id);
  }

  for (const item of plan.update) {
    const updated = await repository.updateGlobalSupplement(item.id, item.record);
    updatedIds.push(updated.id);
  }

  return { dryRun, plan, createdIds, updatedIds };
}

export function getGlobalSupplementImportCreateData(
  record: SupplementImportCandidate
) {
  return {
    organizationId: null,
    createdByUserId: null,
    scope: LibraryScope.GLOBAL,
    name: record.name,
    category: record.category,
    recommendedTiming: record.recommendedTiming,
    dosage: record.dosage,
    bioavailabilityNotes: record.bioavailabilityNotes,
    clinicalDescription: record.clinicalDescription,
    tags: buildSupplementTags(record),
    imageObjectId: null
  };
}

export function getGlobalSupplementImportUpdateData(
  record: SupplementImportCandidate
) {
  return {
    name: record.name,
    category: record.category,
    recommendedTiming: record.recommendedTiming,
    dosage: record.dosage,
    bioavailabilityNotes: record.bioavailabilityNotes,
    clinicalDescription: record.clinicalDescription,
    tags: buildSupplementTags(record),
    imageObjectId: null,
    deletedAt: null
  };
}

function buildSupplementTags(record: SupplementImportCandidate) {
  return [
    ...record.tags,
    `import-key:${record.importKey}`,
    "source:supplement_csv",
    ...(record.sourceUrl ? [`source-url:${record.sourceUrl}`] : [])
  ];
}
