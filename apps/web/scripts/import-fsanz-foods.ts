import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { prisma } from "@/lib/db/prisma";
import { parseFsanzFoodCsv } from "@/lib/nutrition/fsanz-food-csv-parser";
import type { FoodImportSourceId } from "@/lib/nutrition/food-import-types";
import {
  applyFoodImportCandidates,
  createDryRunFoodImportRepository,
  createPrismaFoodImportRepository
} from "@/lib/nutrition/food-import-writer";

type FsanzCsvSourceId = Extract<
  FoodImportSourceId,
  "fsanz_afcd" | "fsanz_ausnut" | "fsanz_branded"
>;

const args = parseArgs(process.argv.slice(2));
const inputPath = args.file ?? args._[0];

if (!inputPath) {
  throw new Error(
    "AUS/NZ food CSV file is required. Example: pnpm --dir apps/web food:import:fsanz ./ausnut.csv"
  );
}

const candidates = parseFsanzFoodCsv(await readFile(resolve(inputPath), "utf8"), {
  sourceId: args.sourceId ?? "fsanz_ausnut",
  version: args.version
});
const dryRun = !args.commit;
const result = await applyFoodImportCandidates({
  candidates,
  repository: getRepository(dryRun),
  dryRun
});

console.log("AUS/NZ food import");
console.log(`mode: ${dryRun ? "dry-run" : "commit"}`);
console.log(`file: ${inputPath}`);
console.log(`sourceId: ${args.sourceId ?? "fsanz_ausnut"}`);
console.log(`version: ${args.version ?? "current"}`);
console.log(`candidates: ${candidates.length}`);
console.log(`creates: ${result.plan.create.length}`);
console.log(`updates: ${result.plan.update.length}`);
console.log(`skipped: ${result.plan.skipped.length}`);

if (result.createdIds.length || result.updatedIds.length) {
  console.log(`createdIds: ${result.createdIds.join(", ") || "none"}`);
  console.log(`updatedIds: ${result.updatedIds.join(", ") || "none"}`);
}

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

function parseArgs(argv: string[]) {
  const parsed: {
    _: string[];
    commit?: boolean;
    file?: string;
    sourceId?: FsanzCsvSourceId;
    version?: string;
  } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--commit") {
      parsed.commit = true;
    } else if (arg === "--file") {
      parsed.file = argv[index + 1];
      index += 1;
    } else if (arg === "--source-id") {
      parsed.sourceId = parseSourceId(argv[index + 1]);
      index += 1;
    } else if (arg === "--version") {
      parsed.version = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}

function parseSourceId(value: string | undefined) {
  if (value === "fsanz_afcd" || value === "fsanz_ausnut" || value === "fsanz_branded") {
    return value;
  }

  throw new Error("--source-id must be one of fsanz_afcd, fsanz_ausnut, or fsanz_branded.");
}
