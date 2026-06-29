import { describe, expect, it } from "vitest";

import {
  ExerciseDifficulty,
  LibraryScope,
  TrainingProgramAssignmentStatus,
  TrainingProgramTemplateStatus
} from "@/app/generated/prisma/enums";
import {
  buildExerciseWhere,
  buildTrainingAssignmentSnapshot,
  buildTrainingTemplateWhere,
  createExerciseSchema,
  createTrainingTemplateSchema,
  getExerciseCreateData,
  getExerciseUpdateData,
  getTrainingTemplateCreateData,
  serializeExercise,
  serializeTrainingAssignment,
  serializeTrainingTemplate,
  toPrismaExerciseDifficulty,
  toPrismaLibraryScope,
  toPrismaTrainingTemplateStatus,
  updateExerciseSchema
} from "@/lib/training/training-records";

const templateJson = {
  days: [
    {
      name: "Lower A",
      exercises: [
        {
          exerciseId: "exercise_1",
          exerciseName: "Tempo Split Squat",
          sets: 3,
          reps: "8/side",
          restSeconds: 120
        }
      ]
    }
  ]
};

describe("training record mappers", () => {
  it("maps public API enum values to Prisma enums", () => {
    expect(toPrismaLibraryScope("global")).toBe(LibraryScope.GLOBAL);
    expect(toPrismaLibraryScope("private")).toBe(LibraryScope.PRIVATE);
    expect(toPrismaExerciseDifficulty("beginner")).toBe(ExerciseDifficulty.BEGINNER);
    expect(toPrismaExerciseDifficulty("intermediate")).toBe(ExerciseDifficulty.INTERMEDIATE);
    expect(toPrismaExerciseDifficulty("advanced")).toBe(ExerciseDifficulty.ADVANCED);
    expect(toPrismaTrainingTemplateStatus("draft")).toBe(TrainingProgramTemplateStatus.DRAFT);
    expect(toPrismaTrainingTemplateStatus("published")).toBe(TrainingProgramTemplateStatus.PUBLISHED);
    expect(toPrismaTrainingTemplateStatus("archived")).toBe(TrainingProgramTemplateStatus.ARCHIVED);
  });

  it("builds scoped exercise filters with optional facets", () => {
    expect(buildExerciseWhere("org_1", { limit: 50 })).toMatchObject({
      deletedAt: null,
      OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
    });

    expect(
      buildExerciseWhere("org_1", {
        scope: "private",
        category: "Quads",
        search: "squat",
        limit: 100
      })
    ).toMatchObject({
      scope: LibraryScope.PRIVATE,
      category: "Quads",
      AND: [
        {
          OR: [
            { name: { contains: "squat", mode: "insensitive" } },
            { category: { contains: "squat", mode: "insensitive" } },
            { equipment: { contains: "squat", mode: "insensitive" } }
          ]
        }
      ]
    });
  });

  it("normalizes exercise create and update payloads", () => {
    const createInput = createExerciseSchema.parse({
      name: "Tempo Split Squat",
      category: "Quads",
      equipment: "Dumbbells",
      primaryMuscles: ["Quads"],
      secondaryMuscles: ["Glutes"],
      difficulty: "advanced",
      videoObjectKey: "videos/split-squat.mp4",
      videoUrl: "https://www.youtube.com/watch?v=split-squat",
      imageObjectKey: "images/split-squat.jpg",
      defaultSets: 3,
      defaultReps: "8/side",
      defaultRestSeconds: 120,
      defaultRpe: 8.5,
      defaultRir: "1-2",
      executionCues: ["Stay tall"]
    });

    expect(getExerciseCreateData("org_1", "user_1", createInput)).toMatchObject({
      organizationId: "org_1",
      createdByUserId: "user_1",
      scope: LibraryScope.PRIVATE,
      difficulty: ExerciseDifficulty.ADVANCED,
      primaryMuscles: ["Quads"],
      videoUrl: "https://www.youtube.com/watch?v=split-squat",
      defaultRir: "1-2",
      executionCues: ["Stay tall"]
    });

    const defaultedInput = createExerciseSchema.parse({
      name: "Goblet Squat",
      category: "Quads",
      primaryMuscles: ["Quads"]
    });

    expect(getExerciseCreateData("org_1", "user_1", defaultedInput)).toMatchObject({
      difficulty: ExerciseDifficulty.INTERMEDIATE
    });

    const updateInput = updateExerciseSchema.parse({
      name: "Updated Split Squat",
      category: "Single Leg",
      equipment: "",
      primaryMuscles: ["Quads"],
      secondaryMuscles: [],
      difficulty: "beginner",
      videoObjectKey: "",
      videoUrl: "https://example.com/split-squat",
      imageObjectKey: "",
      defaultSets: 4,
      defaultReps: "10/side",
      defaultRestSeconds: 90,
      defaultRpe: 7,
      defaultRir: "2",
      executionCues: []
    });

    expect(getExerciseUpdateData(updateInput)).toMatchObject({
      name: "Updated Split Squat",
      category: "Single Leg",
      equipment: "",
      primaryMuscles: ["Quads"],
      secondaryMuscles: [],
      difficulty: ExerciseDifficulty.BEGINNER,
      videoObjectKey: "",
      videoUrl: "https://example.com/split-squat",
      imageObjectKey: "",
      defaultSets: 4,
      defaultReps: "10/side",
      defaultRestSeconds: 90,
      defaultRpe: 7,
      defaultRir: "2",
      executionCues: []
    });

    expect(getExerciseUpdateData(updateExerciseSchema.parse({ name: "Only Name" }))).toEqual({
      name: "Only Name"
    });

    expect(getExerciseUpdateData(updateExerciseSchema.parse({ category: "Hamstrings" }))).toEqual({
      category: "Hamstrings"
    });
  });

  it("builds template filters and create payloads", () => {
    expect(buildTrainingTemplateWhere("org_1", { limit: 50 })).toEqual({
      organizationId: "org_1",
      deletedAt: null
    });

    expect(buildTrainingTemplateWhere("org_1", { status: "published", limit: 50 })).toMatchObject({
      status: TrainingProgramTemplateStatus.PUBLISHED
    });

    const createInput = createTrainingTemplateSchema.parse({
      name: "Strength Foundation",
      description: "Base strength block",
      goal: "strength",
      durationWeeks: 8,
      status: "archived",
      template: templateJson
    });

    expect(getTrainingTemplateCreateData("org_1", "user_1", createInput)).toMatchObject({
      organizationId: "org_1",
      createdByUserId: "user_1",
      status: TrainingProgramTemplateStatus.ARCHIVED,
      templateJson
    });
  });

  it("serializes exercises across scope, difficulty, and nullable branches", () => {
    expect(
      serializeExercise({
        id: "exercise_global",
        organizationId: null,
        scope: LibraryScope.GLOBAL,
        name: "High-Bar Back Squat",
        category: "Quads",
        equipment: null,
        primaryMuscles: ["Quads", 42],
        secondaryMuscles: "not-array",
        difficulty: ExerciseDifficulty.BEGINNER,
        videoObjectKey: null,
        videoUrl: null,
        imageObjectKey: null,
        defaultSets: null,
        defaultReps: null,
        defaultRestSeconds: null,
        defaultRpe: null,
        defaultRir: null,
        executionCues: ["Brace", false],
        createdAt: new Date("2026-05-14T00:00:00.000Z"),
        updatedAt: "2026-05-14T01:00:00.000Z"
      })
    ).toMatchObject({
      scope: "global",
      difficulty: "beginner",
      primaryMuscles: ["Quads"],
      secondaryMuscles: [],
      executionCues: ["Brace"],
      defaultRpe: null,
      defaultRir: null,
      createdAt: "2026-05-14T00:00:00.000Z",
      updatedAt: "2026-05-14T01:00:00.000Z"
    });

    expect(
      serializeExercise({
        id: "exercise_private",
        organizationId: "org_1",
        scope: LibraryScope.PRIVATE,
        name: "Tempo Split Squat",
        category: "Quads",
        equipment: "Dumbbells",
        primaryMuscles: ["Quads"],
        secondaryMuscles: ["Glutes"],
        difficulty: ExerciseDifficulty.ADVANCED,
        videoObjectKey: "videos/split-squat.mp4",
        videoUrl: "https://example.com/split-squat",
        imageObjectKey: "images/split-squat.jpg",
        defaultSets: 3,
        defaultReps: "8/side",
        defaultRestSeconds: 120,
        defaultRpe: "8.5",
        defaultRir: "1-2",
        executionCues: [],
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: new Date("2026-05-14T01:00:00.000Z")
      })
    ).toMatchObject({
      scope: "private",
      difficulty: "advanced",
      defaultRpe: 8.5,
      defaultRir: "1-2",
      videoUrl: "https://example.com/split-squat"
    });
  });

  it("serializes templates and assignment snapshots", () => {
    const baseTemplate = {
      id: "template_1",
      organizationId: "org_1",
      name: "Strength Foundation",
      description: null,
      goal: "strength",
      durationWeeks: 8,
      status: TrainingProgramTemplateStatus.DRAFT,
      templateJson,
      createdAt: "2026-05-14T00:00:00.000Z",
      updatedAt: new Date("2026-05-14T01:00:00.000Z")
    };

    expect(serializeTrainingTemplate(baseTemplate)).toMatchObject({
      status: "draft",
      template: templateJson
    });

    expect(
      serializeTrainingTemplate({
        ...baseTemplate,
        status: TrainingProgramTemplateStatus.PUBLISHED
      }).status
    ).toBe("published");

    expect(
      serializeTrainingTemplate({
        ...baseTemplate,
        status: TrainingProgramTemplateStatus.ARCHIVED
      }).status
    ).toBe("archived");

    expect(buildTrainingAssignmentSnapshot(baseTemplate)).toEqual({
      templateId: "template_1",
      templateName: "Strength Foundation",
      goal: "strength",
      durationWeeks: 8,
      template: templateJson
    });
  });

  it("serializes assignments across status and date branches", () => {
    const baseAssignment = {
      id: "assignment_1",
      organizationId: "org_1",
      clientId: "client_1",
      templateId: "template_1",
      name: "Client Strength Foundation",
      status: TrainingProgramAssignmentStatus.ACTIVE,
      startsOn: new Date("2026-05-14T00:00:00.000Z"),
      endsOn: "2026-07-09T00:00:00.000Z",
      snapshotJson: { template: templateJson },
      createdAt: new Date("2026-05-14T00:00:00.000Z"),
      updatedAt: "2026-05-14T01:00:00.000Z",
      client: {
        firstName: "Demo",
        lastName: "Client"
      }
    };

    expect(serializeTrainingAssignment(baseAssignment)).toMatchObject({
      clientName: "Demo Client",
      status: "active",
      startsOn: "2026-05-14",
      endsOn: "2026-07-09"
    });

    expect(
      serializeTrainingAssignment({
        ...baseAssignment,
        status: TrainingProgramAssignmentStatus.PAUSED,
        client: undefined,
        startsOn: "2026-05-15T00:00:00.000Z",
        endsOn: null
      })
    ).toMatchObject({
      clientName: null,
      status: "paused",
      startsOn: "2026-05-15",
      endsOn: null
    });

    expect(
      serializeTrainingAssignment({
        ...baseAssignment,
        status: TrainingProgramAssignmentStatus.COMPLETED
      }).status
    ).toBe("completed");

    expect(
      serializeTrainingAssignment({
        ...baseAssignment,
        status: TrainingProgramAssignmentStatus.CANCELLED
      }).status
    ).toBe("cancelled");
  });
});
