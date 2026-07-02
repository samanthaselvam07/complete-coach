import { readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { LibraryScope } from "@/app/generated/prisma/enums";
import { createR2PresignedPutUrl, getR2Config } from "@/lib/storage/r2";
import { getExerciseMediaMaxBytes } from "@/lib/training/exercise-media";
import { normaliseExerciseName } from "@/lib/training/exercise-import-normalizer";

export type ExerciseVideoImportExercise = {
  id: string;
  name: string;
  videoObjectKey: string | null;
};

export type ExerciseImageImportExercise = {
  id: string;
  name: string;
  imageObjectKey: string | null;
};

export type ExerciseVideoMappingRow = {
  exerciseName: string;
  videoFilename: string;
};

export type ExerciseImageMappingRow = {
  exerciseName: string;
  imageFilename: string;
};

export type ExerciseVideoMapping = {
  exerciseId: string;
  exerciseName: string;
  filePath: string;
  objectKey: string;
  contentType: string;
};

export type ExerciseImageMapping = {
  exerciseId: string;
  exerciseName: string;
  filePath: string;
  objectKey: string;
  contentType: string;
};

export type AppliedExerciseVideoImportResult = {
  dryRun: boolean;
  planned: ExerciseVideoMapping[];
  uploaded: Array<{ exerciseId: string; exerciseName: string; objectKey: string }>;
  skipped: Array<{ exerciseName?: string; filePath?: string; reason: string }>;
};

export type AppliedExerciseImageImportResult = {
  dryRun: boolean;
  planned: ExerciseImageMapping[];
  uploaded: Array<{ exerciseId: string; exerciseName: string; objectKey: string }>;
  skipped: Array<{ exerciseName?: string; filePath?: string; reason: string }>;
};

export type ExerciseVideoImportRepository = {
  listGlobalExercises(): Promise<ExerciseVideoImportExercise[]>;
  updateExerciseVideo(id: string, videoObjectKey: string): Promise<{ id: string }>;
};

export type ExerciseImageImportRepository = {
  listGlobalExercises(): Promise<ExerciseImageImportExercise[]>;
  updateExerciseImage(id: string, imageObjectKey: string): Promise<{ id: string }>;
};

export type ExerciseVideoStorage = {
  uploadVideo(input: { filePath: string; objectKey: string; contentType: string }): Promise<void>;
};

export type ExerciseImageStorage = {
  uploadImage(input: { filePath: string; objectKey: string; contentType: string }): Promise<void>;
};

type PrismaExerciseVideoImportClient = {
  exerciseLibraryItem: {
    findMany(args: {
      where: { scope: LibraryScope; deletedAt: null };
      select: { id: true; name: true; videoObjectKey: true };
    }): Promise<Array<{ id: string; name: string; videoObjectKey: string | null }>>;
    update(args: {
      where: { id: string };
      data: { videoObjectKey: string; videoUrl: null; updatedAt?: Date };
    }): Promise<{ id: string }>;
  };
};

type PrismaExerciseImageImportClient = {
  exerciseLibraryItem: {
    findMany(args: {
      where: { scope: LibraryScope; deletedAt: null };
      select: { id: true; name: true; imageObjectKey: true };
    }): Promise<Array<{ id: string; name: string; imageObjectKey: string | null }>>;
    update(args: {
      where: { id: string };
      data: { imageObjectKey: string; updatedAt?: Date };
    }): Promise<{ id: string }>;
  };
};

const supportedVideoContentTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm"
};

const supportedImageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export function createPrismaExerciseVideoImportRepository(
  prisma: PrismaExerciseVideoImportClient
): ExerciseVideoImportRepository {
  return {
    async listGlobalExercises() {
      return prisma.exerciseLibraryItem.findMany({
        where: { scope: LibraryScope.GLOBAL, deletedAt: null },
        select: { id: true, name: true, videoObjectKey: true }
      });
    },
    async updateExerciseVideo(id, videoObjectKey) {
      return prisma.exerciseLibraryItem.update({
        where: { id },
        data: { videoObjectKey, videoUrl: null }
      });
    }
  };
}

export function createPrismaExerciseImageImportRepository(
  prisma: PrismaExerciseImageImportClient
): ExerciseImageImportRepository {
  return {
    async listGlobalExercises() {
      return prisma.exerciseLibraryItem.findMany({
        where: { scope: LibraryScope.GLOBAL, deletedAt: null },
        select: { id: true, name: true, imageObjectKey: true }
      });
    },
    async updateExerciseImage(id, imageObjectKey) {
      return prisma.exerciseLibraryItem.update({
        where: { id },
        data: { imageObjectKey }
      });
    }
  };
}

export function createDryRunExerciseVideoImportRepository(
  exercises: ExerciseVideoImportExercise[] = []
): ExerciseVideoImportRepository {
  return {
    async listGlobalExercises() {
      return exercises;
    },
    async updateExerciseVideo() {
      throw new Error("Dry-run repository cannot update exercise videos.");
    }
  };
}

export function createDryRunExerciseImageImportRepository(
  exercises: ExerciseImageImportExercise[] = []
): ExerciseImageImportRepository {
  return {
    async listGlobalExercises() {
      return exercises;
    },
    async updateExerciseImage() {
      throw new Error("Dry-run repository cannot update exercise images.");
    }
  };
}

export function createR2ExerciseVideoStorage(
  config: NonNullable<ReturnType<typeof getR2Config>>
): ExerciseVideoStorage {
  return {
    async uploadVideo(input) {
      const fileStats = await stat(input.filePath);

      if (fileStats.size > getExerciseMediaMaxBytes("video")) {
        throw new Error(`${basename(input.filePath)} exceeds the maximum exercise video size.`);
      }

      const file = await import("node:fs/promises").then((fs) => fs.readFile(input.filePath));
      const uploadUrl = createR2PresignedPutUrl(config, {
        objectKey: input.objectKey,
        contentType: input.contentType,
        expiresInSeconds: 900
      });
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": input.contentType },
        body: new Uint8Array(file)
      });

      if (!response.ok) {
        throw new Error(`R2 upload failed for ${basename(input.filePath)} (${response.status}).`);
      }
    }
  };
}

export function createR2ExerciseImageStorage(
  config: NonNullable<ReturnType<typeof getR2Config>>
): ExerciseImageStorage {
  return {
    async uploadImage(input) {
      await uploadMediaToR2({
        filePath: input.filePath,
        objectKey: input.objectKey,
        contentType: input.contentType,
        maxBytes: getExerciseMediaMaxBytes("image"),
        config
      });
    }
  };
}

async function uploadMediaToR2({
  filePath,
  objectKey,
  contentType,
  maxBytes,
  config
}: {
  filePath: string;
  objectKey: string;
  contentType: string;
  maxBytes: number;
  config: NonNullable<ReturnType<typeof getR2Config>>;
}) {
  const fileStats = await stat(filePath);

  if (fileStats.size > maxBytes) {
    throw new Error(`${basename(filePath)} exceeds the maximum exercise media size.`);
  }

  const file = await import("node:fs/promises").then((fs) => fs.readFile(filePath));
  const uploadUrl = createR2PresignedPutUrl(config, {
    objectKey,
    contentType,
    expiresInSeconds: 900
  });
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(file)
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed for ${basename(filePath)} (${response.status}).`);
  }
}

export async function listExerciseVideoFiles(directory: string): Promise<string[]> {
  return listExerciseMediaFiles(directory, getVideoContentType);
}

export async function listExerciseImageFiles(directory: string): Promise<string[]> {
  return listExerciseMediaFiles(directory, getImageContentType);
}

async function listExerciseMediaFiles(
  directory: string,
  getContentType: (filename: string) => string | null
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[][] = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listExerciseMediaFiles(entryPath, getContentType);
      }

      if (entry.isFile() && getContentType(entry.name)) {
        return [entryPath];
      }

      return [];
    })
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

export async function applyExerciseVideoImport({
  localFiles,
  mappingRows = [],
  repository,
  storage,
  dryRun = true
}: {
  localFiles: string[];
  mappingRows?: ExerciseVideoMappingRow[];
  repository: ExerciseVideoImportRepository;
  storage: ExerciseVideoStorage;
  dryRun?: boolean;
}): Promise<AppliedExerciseVideoImportResult> {
  const exercises = await repository.listGlobalExercises();
  const planned = buildExerciseVideoMappings({ exercises, localFiles, mappingRows });
  const skipped = buildSkippedVideoMappings({ exercises, localFiles, mappingRows, planned });
  const uploaded: AppliedExerciseVideoImportResult["uploaded"] = [];

  if (dryRun) {
    return { dryRun, planned, uploaded, skipped };
  }

  for (const mapping of planned) {
    await storage.uploadVideo({
      filePath: mapping.filePath,
      objectKey: mapping.objectKey,
      contentType: mapping.contentType
    });
    await repository.updateExerciseVideo(mapping.exerciseId, mapping.objectKey);
    uploaded.push({
      exerciseId: mapping.exerciseId,
      exerciseName: mapping.exerciseName,
      objectKey: mapping.objectKey
    });
  }

  return { dryRun, planned, uploaded, skipped };
}

export async function applyExerciseImageImport({
  localFiles,
  mappingRows = [],
  repository,
  storage,
  dryRun = true
}: {
  localFiles: string[];
  mappingRows?: ExerciseImageMappingRow[];
  repository: ExerciseImageImportRepository;
  storage: ExerciseImageStorage;
  dryRun?: boolean;
}): Promise<AppliedExerciseImageImportResult> {
  const exercises = await repository.listGlobalExercises();
  const planned = buildExerciseImageMappings({ exercises, localFiles, mappingRows });
  const skipped = buildSkippedImageMappings({ exercises, localFiles, mappingRows, planned });
  const uploaded: AppliedExerciseImageImportResult["uploaded"] = [];

  if (dryRun) {
    return { dryRun, planned, uploaded, skipped };
  }

  for (const mapping of planned) {
    await storage.uploadImage({
      filePath: mapping.filePath,
      objectKey: mapping.objectKey,
      contentType: mapping.contentType
    });
    await repository.updateExerciseImage(mapping.exerciseId, mapping.objectKey);
    uploaded.push({
      exerciseId: mapping.exerciseId,
      exerciseName: mapping.exerciseName,
      objectKey: mapping.objectKey
    });
  }

  return { dryRun, planned, uploaded, skipped };
}

export function buildExerciseVideoMappings({
  exercises,
  localFiles,
  mappingRows = []
}: {
  exercises: ExerciseVideoImportExercise[];
  localFiles: string[];
  mappingRows?: ExerciseVideoMappingRow[];
}) {
  const exercisesByName = new Map(exercises.map((exercise) => [normaliseExerciseName(exercise.name), exercise]));
  const filesByStem = new Map(localFiles.map((filePath) => [normaliseFileStem(filePath), filePath]));
  const filesByBasename = new Map(localFiles.map((filePath) => [basename(filePath).toLowerCase(), filePath]));
  const mappings: ExerciseVideoMapping[] = [];
  const mappedExerciseIds = new Set<string>();

  for (const row of mappingRows) {
    const exercise = exercisesByName.get(normaliseExerciseName(row.exerciseName));
    const filePath = filesByBasename.get(row.videoFilename.trim().toLowerCase());

    if (!exercise || !filePath || mappedExerciseIds.has(exercise.id)) {
      continue;
    }

    const contentType = getVideoContentType(filePath);
    if (!contentType) {
      continue;
    }

    mappings.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      filePath,
      objectKey: getExerciseVideoObjectKey(exercise.name, filePath),
      contentType
    });
    mappedExerciseIds.add(exercise.id);
  }

  for (const exercise of exercises) {
    if (mappedExerciseIds.has(exercise.id)) {
      continue;
    }

    const filePath = filesByStem.get(normaliseExerciseName(exercise.name));
    const contentType = filePath ? getVideoContentType(filePath) : null;

    if (!filePath || !contentType) {
      continue;
    }

    mappings.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      filePath,
      objectKey: getExerciseVideoObjectKey(exercise.name, filePath),
      contentType
    });
    mappedExerciseIds.add(exercise.id);
  }

  return mappings;
}

export function buildExerciseImageMappings({
  exercises,
  localFiles,
  mappingRows = []
}: {
  exercises: ExerciseImageImportExercise[];
  localFiles: string[];
  mappingRows?: ExerciseImageMappingRow[];
}) {
  const exercisesByName = new Map(exercises.map((exercise) => [normaliseExerciseName(exercise.name), exercise]));
  const filesByStem = new Map(localFiles.map((filePath) => [normaliseFileStem(filePath), filePath]));
  const filesByBasename = new Map(localFiles.map((filePath) => [basename(filePath).toLowerCase(), filePath]));
  const mappings: ExerciseImageMapping[] = [];
  const mappedExerciseIds = new Set<string>();

  for (const row of mappingRows) {
    const exercise = exercisesByName.get(normaliseExerciseName(row.exerciseName));
    const filePath = filesByBasename.get(row.imageFilename.trim().toLowerCase());

    if (!exercise || !filePath || mappedExerciseIds.has(exercise.id)) {
      continue;
    }

    const contentType = getImageContentType(filePath);
    if (!contentType) {
      continue;
    }

    mappings.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      filePath,
      objectKey: getExerciseImageObjectKey(exercise.name, filePath),
      contentType
    });
    mappedExerciseIds.add(exercise.id);
  }

  for (const exercise of exercises) {
    if (mappedExerciseIds.has(exercise.id)) {
      continue;
    }

    const filePath = filesByStem.get(normaliseExerciseName(exercise.name));
    const contentType = filePath ? getImageContentType(filePath) : null;

    if (!filePath || !contentType) {
      continue;
    }

    mappings.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      filePath,
      objectKey: getExerciseImageObjectKey(exercise.name, filePath),
      contentType
    });
    mappedExerciseIds.add(exercise.id);
  }

  return mappings;
}

export function getExerciseVideoObjectKey(exerciseName: string, filename: string) {
  const extension = extname(filename).toLowerCase();
  return `global/training/exercises/video/${normaliseExerciseName(exerciseName)}${extension}`;
}

export function getExerciseImageObjectKey(exerciseName: string, filename: string) {
  const extension = extname(filename).toLowerCase() === ".jpeg" ? ".jpg" : extname(filename).toLowerCase();
  return `global/training/exercises/image/${normaliseExerciseName(exerciseName)}${extension}`;
}

export function getVideoContentType(filename: string) {
  return supportedVideoContentTypes[extname(filename).toLowerCase()] ?? null;
}

export function getImageContentType(filename: string) {
  return supportedImageContentTypes[extname(filename).toLowerCase()] ?? null;
}

function buildSkippedVideoMappings({
  exercises,
  localFiles,
  mappingRows,
  planned
}: {
  exercises: ExerciseVideoImportExercise[];
  localFiles: string[];
  mappingRows: ExerciseVideoMappingRow[];
  planned: ExerciseVideoMapping[];
}) {
  const plannedExerciseIds = new Set(planned.map((mapping) => mapping.exerciseId));
  const plannedFiles = new Set(planned.map((mapping) => mapping.filePath));
  const exercisesByName = new Map(exercises.map((exercise) => [normaliseExerciseName(exercise.name), exercise]));
  const filesByBasename = new Set(localFiles.map((filePath) => basename(filePath).toLowerCase()));
  const skipped: AppliedExerciseVideoImportResult["skipped"] = [];

  for (const row of mappingRows) {
    const exercise = exercisesByName.get(normaliseExerciseName(row.exerciseName));
    if (!exercise) {
      skipped.push({ exerciseName: row.exerciseName, reason: "Exercise not found." });
    } else if (!filesByBasename.has(row.videoFilename.trim().toLowerCase())) {
      skipped.push({ exerciseName: exercise.name, reason: "Mapped video file not found." });
    }
  }

  for (const exercise of exercises) {
    if (!plannedExerciseIds.has(exercise.id)) {
      skipped.push({ exerciseName: exercise.name, reason: "No matching video file found." });
    }
  }

  for (const filePath of localFiles) {
    if (!plannedFiles.has(filePath)) {
      skipped.push({ filePath, reason: "No matching exercise found for video file." });
    }
  }

  return skipped;
}

function buildSkippedImageMappings({
  exercises,
  localFiles,
  mappingRows,
  planned
}: {
  exercises: ExerciseImageImportExercise[];
  localFiles: string[];
  mappingRows: ExerciseImageMappingRow[];
  planned: ExerciseImageMapping[];
}) {
  const plannedExerciseIds = new Set(planned.map((mapping) => mapping.exerciseId));
  const plannedFiles = new Set(planned.map((mapping) => mapping.filePath));
  const exercisesByName = new Map(exercises.map((exercise) => [normaliseExerciseName(exercise.name), exercise]));
  const filesByBasename = new Set(localFiles.map((filePath) => basename(filePath).toLowerCase()));
  const skipped: AppliedExerciseImageImportResult["skipped"] = [];

  for (const row of mappingRows) {
    if (!exercisesByName.has(normaliseExerciseName(row.exerciseName))) {
      skipped.push({ exerciseName: row.exerciseName, reason: "Exercise was not found in the global library." });
    } else if (!filesByBasename.has(row.imageFilename.trim().toLowerCase())) {
      skipped.push({ exerciseName: row.exerciseName, reason: "Mapped image file was not found." });
    }
  }

  for (const exercise of exercises) {
    if (!plannedExerciseIds.has(exercise.id)) {
      skipped.push({ exerciseName: exercise.name, reason: "No matching image file found." });
    }
  }

  for (const filePath of localFiles) {
    if (!plannedFiles.has(filePath)) {
      skipped.push({ filePath, reason: "Image file did not match a global exercise." });
    }
  }

  return skipped;
}

function normaliseFileStem(filePath: string) {
  return normaliseExerciseName(basename(filePath, extname(filePath)));
}
