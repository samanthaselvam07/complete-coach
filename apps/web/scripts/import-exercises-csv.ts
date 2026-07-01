import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadLocalEnvFiles } from "@/lib/env-loader";
import { parseExerciseCsv } from "@/lib/training/exercise-csv-parser";
import {
  applyExerciseCsvImport,
  createDryRunExerciseImportRepository,
  createPrismaExerciseImportRepository
} from "@/lib/training/exercise-import-writer";

loadLocalEnvFiles();

const args = parseArgs(process.argv.slice(2));
const inputPath = args.file ?? args._[0];

if (!inputPath) {
  throw new Error(
    "Exercise CSV file is required. Example: pnpm --dir apps/web exercise:import:csv ./exercises.csv"
  );
}

const rows = parseExerciseCsv(await readFile(resolve(inputPath), "utf8"));
const dryRun = !args.commit;
const { prisma } = await import("@/lib/db/prisma");
const result = await applyExerciseCsvImport({
  rows,
  repository: getRepository(dryRun),
  dryRun
});

console.log("Exercise CSV import");
console.log(`mode: ${dryRun ? "dry-run" : "commit"}`);
console.log(`file: ${inputPath}`);
console.log(`rows: ${rows.length}`);
console.log(`creates: ${result.plan.create.length}`);
console.log(`updates: ${result.plan.update.length}`);
console.log(`skipped: ${result.plan.skipped.length}`);

if (result.createdIds.length || result.updatedIds.length) {
  console.log(`createdIds: ${result.createdIds.join(", ") || "none"}`);
  console.log(`updatedIds: ${result.updatedIds.join(", ") || "none"}`);
}

if (result.plan.skipped.length) {
  console.log("skippedReasons:");
  for (const skipped of result.plan.skipped.slice(0, 20)) {
    console.log(`- ${skipped.reason}`);
  }
}

await prisma.$disconnect();

function getRepository(dryRunMode: boolean) {
  if (process.env.DATABASE_URL) {
    return createPrismaExerciseImportRepository(prisma);
  }

  if (dryRunMode) {
    return createDryRunExerciseImportRepository();
  }

  throw new Error("DATABASE_URL is required when running exercise imports with --commit.");
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
