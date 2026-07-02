import { describe, expect, it, vi } from "vitest";

import { ExerciseDifficulty, LibraryScope } from "@/app/generated/prisma/enums";
import {
  applyExerciseCsvImport,
  createDryRunExerciseImportRepository,
  getGlobalExerciseImportCreateData,
  type ExerciseImportRepository
} from "@/lib/training/exercise-import-writer";
import { parseExerciseCsv } from "@/lib/training/exercise-csv-parser";
import { normaliseExerciseCsvRow } from "@/lib/training/exercise-import-normalizer";
import { buildExerciseImportPlan } from "@/lib/training/exercise-import-processor";
import {
  applyExerciseImageImport,
  applyExerciseVideoImport,
  buildExerciseImageMappings,
  buildExerciseVideoMappings,
  getExerciseImageObjectKey,
  getExerciseVideoObjectKey,
  type ExerciseImageImportRepository,
  type ExerciseImageStorage,
  type ExerciseVideoImportRepository,
  type ExerciseVideoStorage
} from "@/lib/training/exercise-video-importer";

const exerciseCsv = `exercise name,category,equipment,primary muscles,secondary muscles,difficulty,execution cues,default sets,default reps,default rest seconds
"Barbell Back Squat",Legs,Barbell,"Quads;Glutes",Hamstrings,intermediate,"Brace hard;Drive through midfoot",4,6-8,180
"Incline DB Press",Chest,Dumbbells,Chest,"Shoulders;Triceps",beginner,"Control the eccentric",3,8-12,120
`;

describe("exercise CSV import", () => {
  it("parses exercise CSV rows with quoted muscle and cue lists", () => {
    const rows = parseExerciseCsv(exerciseCsv);

    expect(rows).toHaveLength(2);
    expect(rows[0]["exercise name"]).toBe("Barbell Back Squat");
    expect(rows[0]["primary muscles"]).toBe("Quads;Glutes");
    expect(rows[1]["execution cues"]).toBe("Control the eccentric");
  });

  it("normalises CSV rows into global exercise import candidates", () => {
    const [row] = parseExerciseCsv(exerciseCsv);
    const record = normaliseExerciseCsvRow(row);

    expect(record).toMatchObject({
      importKey: "exercise_csv:barbell-back-squat",
      name: "Barbell Back Squat",
      category: "Legs",
      equipment: "Barbell",
      primaryMuscles: ["Quads", "Glutes"],
      secondaryMuscles: ["Hamstrings"],
      difficulty: "intermediate",
      defaultSets: 4,
      defaultReps: "6-8",
      defaultRestSeconds: 180,
      executionCues: ["Brace hard", "Drive through midfoot"]
    });
  });

  it("plans exercise creates, updates, and duplicate skips by normalized name", () => {
    const rows = parseExerciseCsv(`${exerciseCsv}${exerciseCsv.split("\n")[1]}\n`);
    const plan = buildExerciseImportPlan(rows, [
      {
        id: "existing-squat",
        name: "Barbell Back Squat",
        category: "Legs"
      }
    ]);

    expect(plan.update).toHaveLength(1);
    expect(plan.update[0]).toMatchObject({
      id: "existing-squat",
      record: { name: "Barbell Back Squat" }
    });
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).toMatchObject({
      record: { name: "Incline DB Press" }
    });
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].reason).toBe("Duplicate exercise in import batch.");
  });

  it("maps import records to global exercise writes", () => {
    const [row] = parseExerciseCsv(exerciseCsv);
    const record = normaliseExerciseCsvRow(row);

    expect(getGlobalExerciseImportCreateData(record)).toMatchObject({
      organizationId: null,
      createdByUserId: null,
      scope: LibraryScope.GLOBAL,
      name: "Barbell Back Squat",
      category: "Legs",
      equipment: "Barbell",
      primaryMuscles: ["Quads", "Glutes"],
      secondaryMuscles: ["Hamstrings"],
      difficulty: ExerciseDifficulty.INTERMEDIATE,
      defaultSets: 4,
      defaultReps: "6-8",
      defaultRestSeconds: 180,
      executionCues: ["Brace hard", "Drive through midfoot"]
    });
  });

  it("dry-runs without writing and commits create/update operations", async () => {
    const rows = parseExerciseCsv(exerciseCsv);
    const dryRun = await applyExerciseCsvImport({
      rows,
      repository: createDryRunExerciseImportRepository(),
      dryRun: true
    });

    expect(dryRun.plan.create).toHaveLength(2);

    const repository = createExerciseRepository([
      {
        id: "existing-squat",
        name: "Barbell Back Squat",
        category: "Legs"
      }
    ]);

    const committed = await applyExerciseCsvImport({
      rows,
      repository,
      dryRun: false
    });

    expect(committed.createdIds).toEqual(["created-exercise"]);
    expect(committed.updatedIds).toEqual(["updated-existing-squat"]);
    expect(repository.createGlobalExercise).toHaveBeenCalledOnce();
    expect(repository.updateGlobalExercise).toHaveBeenCalledOnce();
  });
});

describe("exercise video import", () => {
  it("builds deterministic R2 object keys for global exercise videos", () => {
    expect(getExerciseVideoObjectKey("Barbell Back Squat", "Back Squat Demo.MP4")).toBe(
      "global/training/exercises/video/barbell-back-squat.mp4"
    );
  });

  it("matches local videos to exercises by mapping CSV or file stem", () => {
    const mappings = buildExerciseVideoMappings({
      exercises: [
        { id: "squat", name: "Barbell Back Squat", videoObjectKey: null },
        { id: "press", name: "Incline DB Press", videoObjectKey: null }
      ],
      localFiles: [
        "/videos/barbell-back-squat.mp4",
        "/videos/press-demo.mov"
      ],
      mappingRows: [{ exerciseName: "Incline DB Press", videoFilename: "press-demo.mov" }]
    });

    expect(mappings.map((mapping) => mapping.exerciseId)).toEqual(["press", "squat"]);
    expect(mappings[0].filePath).toBe("/videos/press-demo.mov");
    expect(mappings[1].filePath).toBe("/videos/barbell-back-squat.mp4");
  });

  it("uploads matched videos and stores object keys against global exercises", async () => {
    const repository = createVideoRepository([
      { id: "squat", name: "Barbell Back Squat", videoObjectKey: null }
    ]);
    const storage = createVideoStorage();

    const result = await applyExerciseVideoImport({
      localFiles: ["/videos/barbell-back-squat.mp4"],
      repository,
      storage,
      dryRun: false
    });

    expect(result.uploaded).toEqual([
      {
        exerciseId: "squat",
        exerciseName: "Barbell Back Squat",
        objectKey: "global/training/exercises/video/barbell-back-squat.mp4"
      }
    ]);
    expect(storage.uploadVideo).toHaveBeenCalledWith({
      filePath: "/videos/barbell-back-squat.mp4",
      contentType: "video/mp4",
      objectKey: "global/training/exercises/video/barbell-back-squat.mp4"
    });
    expect(repository.updateExerciseVideo).toHaveBeenCalledWith(
      "squat",
      "global/training/exercises/video/barbell-back-squat.mp4"
    );
  });
});

describe("exercise thumbnail import", () => {
  it("builds deterministic R2 object keys for global exercise thumbnails", () => {
    expect(getExerciseImageObjectKey("Barbell Back Squat", "Back Squat Demo.JPEG")).toBe(
      "global/training/exercises/image/barbell-back-squat.jpg"
    );
  });

  it("matches local thumbnails to exercises by mapping CSV or file stem", () => {
    const mappings = buildExerciseImageMappings({
      exercises: [
        { id: "squat", name: "Barbell Back Squat", imageObjectKey: null },
        { id: "press", name: "Incline DB Press", imageObjectKey: null }
      ],
      localFiles: [
        "/images/barbell-back-squat.jpg",
        "/images/press-demo.webp"
      ],
      mappingRows: [{ exerciseName: "Incline DB Press", imageFilename: "press-demo.webp" }]
    });

    expect(mappings.map((mapping) => mapping.exerciseId)).toEqual(["press", "squat"]);
    expect(mappings[0].filePath).toBe("/images/press-demo.webp");
    expect(mappings[1].filePath).toBe("/images/barbell-back-squat.jpg");
  });

  it("uploads matched thumbnails and stores object keys against global exercises", async () => {
    const repository = createImageRepository([
      { id: "squat", name: "Barbell Back Squat", imageObjectKey: null }
    ]);
    const storage = createImageStorage();

    const result = await applyExerciseImageImport({
      localFiles: ["/images/barbell-back-squat.jpg"],
      repository,
      storage,
      dryRun: false
    });

    expect(result.uploaded).toEqual([
      {
        exerciseId: "squat",
        exerciseName: "Barbell Back Squat",
        objectKey: "global/training/exercises/image/barbell-back-squat.jpg"
      }
    ]);
    expect(storage.uploadImage).toHaveBeenCalledWith({
      filePath: "/images/barbell-back-squat.jpg",
      contentType: "image/jpeg",
      objectKey: "global/training/exercises/image/barbell-back-squat.jpg"
    });
    expect(repository.updateExerciseImage).toHaveBeenCalledWith(
      "squat",
      "global/training/exercises/image/barbell-back-squat.jpg"
    );
  });
});

function createExerciseRepository(
  existingExercises: Awaited<ReturnType<ExerciseImportRepository["listExistingGlobalExercises"]>> = []
) {
  return {
    listExistingGlobalExercises: vi.fn().mockResolvedValue(existingExercises),
    createGlobalExercise: vi.fn().mockResolvedValue({ id: "created-exercise" }),
    updateGlobalExercise: vi.fn().mockImplementation((id: string) => Promise.resolve({ id: `updated-${id}` }))
  } satisfies ExerciseImportRepository;
}

function createVideoRepository(
  exercises: Awaited<ReturnType<ExerciseVideoImportRepository["listGlobalExercises"]>>
) {
  return {
    listGlobalExercises: vi.fn().mockResolvedValue(exercises),
    updateExerciseVideo: vi.fn().mockResolvedValue({ id: "updated-exercise" })
  } satisfies ExerciseVideoImportRepository;
}

function createVideoStorage() {
  return {
    uploadVideo: vi.fn().mockResolvedValue(undefined)
  } satisfies ExerciseVideoStorage;
}

function createImageRepository(
  exercises: Awaited<ReturnType<ExerciseImageImportRepository["listGlobalExercises"]>>
) {
  return {
    listGlobalExercises: vi.fn().mockResolvedValue(exercises),
    updateExerciseImage: vi.fn().mockResolvedValue({ id: "updated-exercise" })
  } satisfies ExerciseImageImportRepository;
}

function createImageStorage() {
  return {
    uploadImage: vi.fn().mockResolvedValue(undefined)
  } satisfies ExerciseImageStorage;
}
