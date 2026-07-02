import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadLocalEnvFiles } from "@/lib/env-loader";
import { getR2Config } from "@/lib/storage/r2";
import { parseExerciseCsv } from "@/lib/training/exercise-csv-parser";
import {
  applyExerciseImageImport,
  createDryRunExerciseImageImportRepository,
  createPrismaExerciseImageImportRepository,
  createR2ExerciseImageStorage,
  listExerciseImageFiles,
  type ExerciseImageMappingRow
} from "@/lib/training/exercise-video-importer";

loadLocalEnvFiles();

const args = parseArgs(process.argv.slice(2));

if (!args.directory) {
  throw new Error(
    "Thumbnail directory is required. Example: pnpm --dir apps/web exercise:upload-thumbnails --dir ./exercise-thumbnails"
  );
}

const dryRun = !args.commit;
const localFiles = await listExerciseImageFiles(resolve(args.directory));
const mappingRows = args.mapping ? parseMappingCsv(await readFile(resolve(args.mapping), "utf8")) : [];
const { prisma } = await import("@/lib/db/prisma");
const repository = getRepository(dryRun);
const storage = getStorage(dryRun);
const result = await applyExerciseImageImport({
  localFiles,
  mappingRows,
  repository,
  storage,
  dryRun
});

console.log("Exercise thumbnail upload");
console.log(`mode: ${dryRun ? "dry-run" : "commit"}`);
console.log(`directory: ${args.directory}`);
console.log(`mapping: ${args.mapping ?? "filename stem matching"}`);
console.log(`imageFiles: ${localFiles.length}`);
console.log(`planned: ${result.planned.length}`);
console.log(`uploaded: ${result.uploaded.length}`);
console.log(`skipped: ${result.skipped.length}`);

if (result.planned.length) {
  console.log("plannedUploads:");
  for (const planned of result.planned.slice(0, 20)) {
    console.log(`- ${planned.exerciseName} -> ${planned.objectKey}`);
  }
}

if (result.skipped.length) {
  console.log("skipped:");
  for (const skipped of result.skipped.slice(0, 30)) {
    const subject = skipped.exerciseName ?? skipped.filePath ?? "unknown";
    console.log(`- ${subject}: ${skipped.reason}`);
  }
}

await prisma.$disconnect();

function getRepository(dryRunMode: boolean) {
  if (process.env.DATABASE_URL) {
    return createPrismaExerciseImageImportRepository(prisma);
  }

  if (dryRunMode) {
    return createDryRunExerciseImageImportRepository();
  }

  throw new Error("DATABASE_URL is required when running exercise thumbnail uploads with --commit.");
}

function getStorage(dryRunMode: boolean) {
  if (dryRunMode) {
    return {
      async uploadImage() {
        throw new Error("Dry-run storage cannot upload exercise thumbnails.");
      }
    };
  }

  const config = getR2Config();

  if (!config) {
    throw new Error("R2 storage is not configured.");
  }

  return createR2ExerciseImageStorage(config);
}

function parseMappingCsv(contents: string): ExerciseImageMappingRow[] {
  return parseExerciseCsv(contents).map((row) => {
    const exerciseName = row["exercise name"] || row.exercise_name || row.name;
    const imageFilename = row["thumbnail filename"] || row.thumbnail_filename || row["image filename"] || row.image_filename || row.filename || row.file;

    if (!exerciseName || !imageFilename) {
      throw new Error("Thumbnail mapping CSV requires exercise name and thumbnail filename columns.");
    }

    return { exerciseName, imageFilename };
  });
}

function parseArgs(argv: string[]) {
  const parsed: { _: string[]; commit?: boolean; directory?: string; mapping?: string } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--commit") {
      parsed.commit = true;
    } else if (arg === "--dir") {
      parsed.directory = argv[index + 1];
      index += 1;
    } else if (arg === "--mapping") {
      parsed.mapping = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  parsed.directory ??= parsed._[0];
  return parsed;
}
