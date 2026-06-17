import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import {
  applyFoodImportCandidates,
  createDryRunFoodImportRepository,
  createPrismaFoodImportRepository
} from "@/lib/nutrition/food-import-writer";
import { usdaFoodToImportCandidate } from "@/lib/nutrition/usda-food-import-adapter";
import {
  searchUsdaFoods,
  type UsdaFoodDataType
} from "@/lib/nutrition/usda-fooddata-central";

const args = parseArgs(process.argv.slice(2));
const query = args.query ?? args._[0];

if (!query) {
  throw new Error(
    'Food query is required. Example: pnpm --dir apps/web exec tsx scripts/import-usda-foods.ts "greek yogurt"'
  );
}

const apiKey = args.apiKey ?? process.env.FDC_API_KEY ?? "DEMO_KEY";
const pageSize = Number(args.pageSize ?? process.env.FDC_PAGE_SIZE ?? 25);
const dataTypes = parseDataTypes(args.dataTypes ?? process.env.FDC_DATA_TYPES);
const dryRun = !args.commit;

const response = await searchUsdaFoods({
  apiKey,
  query,
  pageSize,
  dataTypes
});

const candidates = response.foods.map(usdaFoodToImportCandidate);
const repository = getRepository(dryRun);
const result = await applyFoodImportCandidates({
  candidates,
  repository,
  dryRun
});

printSummary({
  dryRun,
  query,
  totalHits: response.totalHits,
  createCount: result.plan.create.length,
  updateCount: result.plan.update.length,
  skippedCount: result.plan.skipped.length,
  createdIds: result.createdIds,
  updatedIds: result.updatedIds
});

await prisma.$disconnect();

function getRepository(dryRunMode: boolean) {
  if (process.env.DATABASE_URL) {
    return createPrismaFoodImportRepository(prisma);
  }

  if (dryRunMode) {
    return createDryRunFoodImportRepository();
  }

  throw new Error("DATABASE_URL is required when running food imports with --commit.");
}

function parseDataTypes(value?: string): UsdaFoodDataType[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as UsdaFoodDataType[];
}

function parseArgs(argv: string[]) {
  const parsed: {
    _: string[];
    apiKey?: string;
    commit?: boolean;
    dataTypes?: string;
    pageSize?: string;
    query?: string;
  } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--commit") {
      parsed.commit = true;
    } else if (arg === "--api-key") {
      parsed.apiKey = argv[index + 1];
      index += 1;
    } else if (arg === "--data-types") {
      parsed.dataTypes = argv[index + 1];
      index += 1;
    } else if (arg === "--page-size") {
      parsed.pageSize = argv[index + 1];
      index += 1;
    } else if (arg === "--query") {
      parsed.query = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}

function printSummary({
  dryRun,
  query,
  totalHits,
  createCount,
  updateCount,
  skippedCount,
  createdIds,
  updatedIds
}: {
  dryRun: boolean;
  query: string;
  totalHits: number;
  createCount: number;
  updateCount: number;
  skippedCount: number;
  createdIds: string[];
  updatedIds: string[];
}) {
  console.log("USDA food import");
  console.log(`mode: ${dryRun ? "dry-run" : "commit"}`);
  console.log(`query: ${query}`);
  console.log(`totalHits: ${totalHits}`);
  console.log(`creates: ${createCount}`);
  console.log(`updates: ${updateCount}`);
  console.log(`skipped: ${skippedCount}`);

  if (createdIds.length || updatedIds.length) {
    console.log(`createdIds: ${createdIds.join(", ") || "none"}`);
    console.log(`updatedIds: ${updatedIds.join(", ") || "none"}`);
  }
}
