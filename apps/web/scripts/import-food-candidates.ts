import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { prisma } from "@/lib/db/prisma";
import type { ImportedFoodCandidate } from "@/lib/nutrition/food-import-types";
import {
  applyFoodImportCandidates,
  createDryRunFoodImportRepository,
  createPrismaFoodImportRepository
} from "@/lib/nutrition/food-import-writer";

const args = parseArgs(process.argv.slice(2));
const inputPath = args.file ?? args._[0];

if (!inputPath) {
  throw new Error(
    "Input JSON file is required. Example: pnpm --dir apps/web exec tsx scripts/import-food-candidates.ts ./foods.json"
  );
}

const candidates = await readCandidates(inputPath);
const dryRun = !args.commit;
const result = await applyFoodImportCandidates({
  candidates,
  repository: getRepository(dryRun),
  dryRun
});

console.log("Food candidate import");
console.log(`mode: ${args.commit ? "commit" : "dry-run"}`);
console.log(`file: ${inputPath}`);
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

async function readCandidates(path: string): Promise<ImportedFoodCandidate[]> {
  const contents = await readFile(resolve(path), "utf8");
  const parsed = JSON.parse(contents) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Import candidate file must contain a JSON array.");
  }

  return parsed as ImportedFoodCandidate[];
}

function parseArgs(argv: string[]) {
  const parsed: { _: string[]; commit?: boolean; file?: string } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--commit") {
      parsed.commit = true;
    } else if (arg === "--file") {
      parsed.file = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}
