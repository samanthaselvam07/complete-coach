import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadLocalEnvFiles } from "@/lib/env-loader";
import { getR2Config } from "@/lib/storage/r2";
import { parseExerciseCsv } from "@/lib/training/exercise-csv-parser";
import {
  applyExerciseVideoImport,
  createDryRunExerciseVideoImportRepository,
  createPrismaExerciseVideoImportRepository,
  createR2ExerciseVideoStorage,
  listExerciseVideoFiles,
  type ExerciseVideoMappingRow
} from "@/lib/training/exercise-video-importer";

loadLocalEnvFiles();

const args = parseArgs(process.argv.slice(2));

if (!args.directory) {
  throw new Error(
    "Video directory is required. Example: pnpm --dir apps/web exercise:upload-videos --dir ./exercise-videos"
  );
}

const dryRun = !args.commit;
const localFiles = await listExerciseVideoFiles(resolve(args.directory));
const mappingRows = args.mapping ? parseMappingCsv(await readFile(resolve(args.mapping), "utf8")) : [];
const { prisma } = await import("@/lib/db/prisma");
const repository = getRepository(dryRun);
const storage = getStorage(dryRun);
const result = await applyExerciseVideoImport({
  localFiles,
  mappingRows,
  repository,
  storage,
  dryRun,
  concurrency: args.concurrency,
  onProgress: (progress) => {
    if (progress.uploaded === 1 || progress.uploaded % 50 === 0 || progress.uploaded === progress.total) {
      console.log(`progress: uploaded ${progress.uploaded}/${progress.total} (${progress.exerciseName})`);
    }
  }
});

console.log("Exercise video upload");
console.log(`mode: ${dryRun ? "dry-run" : "commit"}`);
console.log(`directory: ${args.directory}`);
console.log(`mapping: ${args.mapping ?? "filename stem matching"}`);
console.log(`concurrency: ${args.concurrency}`);
console.log(`videoFiles: ${localFiles.length}`);
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
process.exit(0);

function getRepository(dryRunMode: boolean) {
  if (process.env.DATABASE_URL) {
    return createPrismaExerciseVideoImportRepository(prisma);
  }

  if (dryRunMode) {
    return createDryRunExerciseVideoImportRepository();
  }

  throw new Error("DATABASE_URL is required when running exercise video uploads with --commit.");
}

function getStorage(dryRunMode: boolean) {
  if (dryRunMode) {
    return {
      async uploadVideo() {
        throw new Error("Dry-run storage cannot upload exercise videos.");
      }
    };
  }

  const config = getR2Config();

  if (!config) {
    throw new Error("R2 storage is not configured.");
  }

  return createR2ExerciseVideoStorage(config);
}

function parseMappingCsv(contents: string): ExerciseVideoMappingRow[] {
  return parseExerciseCsv(contents).map((row) => {
    const exerciseName = row["exercise name"] || row.exercise_name || row.name;
    const videoFilename = row["video filename"] || row.video_filename || row.filename || row.file;

    if (!exerciseName || !videoFilename) {
      throw new Error("Video mapping CSV requires exercise name and video filename columns.");
    }

    return { exerciseName, videoFilename };
  });
}

function parseArgs(argv: string[]) {
  const parsed: { _: string[]; commit?: boolean; concurrency: number; directory?: string; mapping?: string } = {
    _: [],
    concurrency: 1
  };

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
    } else if (arg === "--concurrency") {
      parsed.concurrency = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  parsed.directory ??= parsed._[0];
  if (!Number.isFinite(parsed.concurrency) || parsed.concurrency < 1) {
    parsed.concurrency = 1;
  }
  return parsed;
}
