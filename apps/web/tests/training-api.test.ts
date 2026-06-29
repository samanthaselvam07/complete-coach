import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ExerciseDifficulty,
  LibraryScope,
  TrainingProgramAssignmentStatus,
  TrainingProgramTemplateStatus
} from "@/app/generated/prisma/enums";
import { GET as getExercises, POST as createExercise } from "@/app/api/v1/exercises/route";
import { GET as getExercise, PATCH as updateExercise } from "@/app/api/v1/exercises/[exerciseId]/route";
import {
  GET as getTrainingTemplates,
  POST as createTrainingTemplate
} from "@/app/api/v1/training-program-templates/route";
import {
  DELETE as deleteTrainingTemplate,
  PATCH as updateTrainingTemplate
} from "@/app/api/v1/training-program-templates/[templateId]/route";
import {
  GET as getTrainingAssignments,
  POST as createTrainingAssignment
} from "@/app/api/v1/training-program-assignments/route";
import { GET as getClientTrainingPrograms } from "@/app/api/v1/clients/[clientId]/training-programs/route";
import { POST as createExerciseMediaUploadUrl } from "@/app/api/v1/exercises/media-upload-url/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    client: { findFirst: vi.fn() },
    exerciseLibraryItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    trainingProgramTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    trainingProgramAssignment: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const globalExercise = {
  id: "exercise_global",
  organizationId: null,
  scope: LibraryScope.GLOBAL,
  name: "High-Bar Back Squat",
  category: "Quads",
  equipment: "Barbell",
  primaryMuscles: ["Quads"],
  secondaryMuscles: ["Glutes"],
  difficulty: ExerciseDifficulty.INTERMEDIATE,
  videoObjectKey: null,
  videoUrl: null,
  imageObjectKey: null,
  defaultSets: 4,
  defaultReps: "6-8",
  defaultRestSeconds: 180,
  defaultRpe: 8,
  defaultRir: "1-2",
  executionCues: ["Brace hard"],
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  updatedAt: new Date("2026-05-14T00:00:00.000Z")
};

const privateExercise = {
  ...globalExercise,
  id: "exercise_private",
  organizationId: "org_1",
  scope: LibraryScope.PRIVATE,
  name: "Tempo Split Squat"
};

const templateRecord = {
  id: "template_1",
  organizationId: "org_1",
  name: "Strength Foundation",
  description: "Base strength template",
  goal: "strength",
  durationWeeks: 8,
  status: TrainingProgramTemplateStatus.PUBLISHED,
  templateJson: {
    days: [
      {
        name: "Lower A",
        exercises: [
          {
            exerciseId: "exercise_private",
            exerciseName: "Tempo Split Squat",
            sets: 3,
            reps: "8/side",
            restSeconds: 120
          }
        ]
      }
    ]
  },
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  updatedAt: new Date("2026-05-14T00:00:00.000Z")
};

const assignmentRecord = {
  id: "assignment_1",
  organizationId: "org_1",
  clientId: "client_1",
  templateId: "template_1",
  name: "Strength Foundation",
  status: TrainingProgramAssignmentStatus.ACTIVE,
  startsOn: new Date("2026-05-14T00:00:00.000Z"),
  endsOn: new Date("2026-07-09T00:00:00.000Z"),
  snapshotJson: {
    templateId: "template_1",
    templateName: "Strength Foundation",
    template: templateRecord.templateJson
  },
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  updatedAt: new Date("2026-05-14T00:00:00.000Z"),
  client: {
    firstName: "Api",
    lastName: "Client"
  }
};

describe("training persistence APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.exerciseLibraryItem.create.mockReset();
    mocks.prisma.exerciseLibraryItem.findMany.mockReset();
    mocks.prisma.exerciseLibraryItem.findFirst.mockReset();
    mocks.prisma.exerciseLibraryItem.update.mockReset();
    mocks.prisma.trainingProgramTemplate.create.mockReset();
    mocks.prisma.trainingProgramTemplate.findMany.mockReset();
    mocks.prisma.trainingProgramTemplate.findFirst.mockReset();
    mocks.prisma.trainingProgramTemplate.update.mockReset();
    mocks.prisma.trainingProgramAssignment.create.mockReset();
    mocks.prisma.trainingProgramAssignment.findMany.mockReset();
    process.env.R2_ACCOUNT_ID = "account_123";
    process.env.R2_ACCESS_KEY_ID = "access_key";
    process.env.R2_SECRET_ACCESS_KEY = "secret_key";
    process.env.R2_BUCKET_NAME = "complete-coach-test";
  });

  it("lists global and tenant private exercises for the active organization", async () => {
    mocks.prisma.exerciseLibraryItem.findMany.mockResolvedValue([globalExercise, privateExercise]);

    const response = await getExercises(new Request("http://test.local/api/v1/exercises?search=squat"));
    const payload = (await response.json()) as { data: Array<{ id: string; scope: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({ id: "exercise_global", scope: "global" }),
      expect.objectContaining({ id: "exercise_private", scope: "private" })
    ]);
    expect(mocks.prisma.exerciseLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
        })
      })
    );
  });

  it("creates private tenant exercises and audit logs the write", async () => {
    mocks.prisma.exerciseLibraryItem.create.mockResolvedValue(privateExercise);

    const response = await createExercise(
      new Request("http://test.local/api/v1/exercises", {
        method: "POST",
        body: JSON.stringify({
          name: "Tempo Split Squat",
          category: "Quads",
          equipment: "Dumbbells",
          primaryMuscles: ["Quads"],
          difficulty: "intermediate",
          defaultSets: 3,
          defaultReps: "8/side",
          defaultRestSeconds: 150,
          defaultRpe: 8.5,
          defaultRir: "1-2",
          videoUrl: "https://example.com/split-squat",
          executionCues: ["Control the eccentric"]
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; scope: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "exercise_private", scope: "private" }));
    expect(mocks.prisma.exerciseLibraryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          scope: LibraryScope.PRIVATE,
          createdByUserId: "user_1",
          defaultRestSeconds: 150,
          defaultRpe: 8.5,
          defaultRir: "1-2",
          videoUrl: "https://example.com/split-squat"
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "exercise.created" })
      })
    );
  });

  it("rejects exercise media object keys that were not generated for the active organization", async () => {
    const response = await createExercise(
      new Request("http://test.local/api/v1/exercises", {
        method: "POST",
        body: JSON.stringify({
          name: "Tempo Split Squat",
          category: "Quads",
          primaryMuscles: ["Quads"],
          videoObjectKey: "organizations/org_2/training/exercises/video/00000000-0000-4000-8000-000000000000.mp4"
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.exerciseLibraryItem.create).not.toHaveBeenCalled();
  });

  it("prevents tenant users from mutating global exercises", async () => {
    mocks.prisma.exerciseLibraryItem.findFirst.mockResolvedValue(null);

    const response = await updateExercise(
      new Request("http://test.local/api/v1/exercises/exercise_global", {
        method: "PATCH",
        body: JSON.stringify({ name: "Mutated" })
      }),
      { params: Promise.resolve({ exerciseId: "exercise_global" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.exerciseLibraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          scope: LibraryScope.PRIVATE
        })
      })
    );
    expect(mocks.prisma.exerciseLibraryItem.update).not.toHaveBeenCalled();
  });

  it("rejects private exercise updates with media keys outside the active organization scope", async () => {
    const response = await updateExercise(
      new Request("http://test.local/api/v1/exercises/exercise_private", {
        method: "PATCH",
        body: JSON.stringify({
          imageObjectKey: "organizations/org_2/training/exercises/image/00000000-0000-4000-8000-000000000000.jpg"
        })
      }),
      { params: Promise.resolve({ exerciseId: "exercise_private" }) }
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.exerciseLibraryItem.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.exerciseLibraryItem.update).not.toHaveBeenCalled();
  });

  it("reads one global exercise through tenant-scoped access", async () => {
    mocks.prisma.exerciseLibraryItem.findFirst.mockResolvedValue(globalExercise);

    const response = await getExercise(new Request("http://test.local/api/v1/exercises/exercise_global"), {
      params: Promise.resolve({ exerciseId: "exercise_global" })
    });
    const payload = (await response.json()) as { data: { id: string; scope: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ id: "exercise_global", scope: "global" }));
  });

  it("creates and lists training program templates", async () => {
    mocks.prisma.trainingProgramTemplate.create.mockResolvedValue(templateRecord);
    mocks.prisma.trainingProgramTemplate.findMany.mockResolvedValue([templateRecord]);

    const createResponse = await createTrainingTemplate(
      new Request("http://test.local/api/v1/training-program-templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Strength Foundation",
          description: "Base strength template",
          goal: "strength",
          durationWeeks: 8,
          status: "published",
          template: templateRecord.templateJson
        })
      })
    );

    expect(createResponse.status).toBe(201);
    expect(mocks.prisma.trainingProgramTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          templateJson: templateRecord.templateJson
        })
      })
    );

    const listResponse = await getTrainingTemplates(
      new Request("http://test.local/api/v1/training-program-templates?status=published")
    );
    const payload = (await listResponse.json()) as { data: Array<{ id: string; status: string }> };

    expect(listResponse.status).toBe(200);
    expect(payload.data[0]).toEqual(expect.objectContaining({ id: "template_1", status: "published" }));
  });

  it("soft deletes tenant training program templates and audit logs the change", async () => {
    mocks.prisma.trainingProgramTemplate.findFirst.mockResolvedValue(templateRecord);
    mocks.prisma.trainingProgramTemplate.update.mockResolvedValue({ ...templateRecord, deletedAt: new Date() });

    const response = await deleteTrainingTemplate(
      new Request("http://test.local/api/v1/training-program-templates/template_1", { method: "DELETE" }),
      { params: Promise.resolve({ templateId: "template_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; deleted: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ id: "template_1", deleted: true });
    expect(mocks.prisma.trainingProgramTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: "template_1",
        organizationId: "org_1",
        deletedAt: null
      }
    });
    expect(mocks.prisma.trainingProgramTemplate.update).toHaveBeenCalledWith({
      where: { id: "template_1" },
      data: { deletedAt: expect.any(Date) }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "training_template.deleted",
          targetId: "template_1"
        })
      })
    );
  });

  it("updates an existing training program template in place", async () => {
    const updatedTemplate = {
      ...templateRecord,
      name: "Edited Strength Foundation",
      durationWeeks: 10,
      templateJson: {
        days: [
          {
            name: "Upper Strength",
            exercises: [
              {
                exerciseId: "bench_press",
                exerciseName: "Bench Press",
                sets: 4,
                reps: "5",
                restSeconds: 180,
                section: "workout"
              }
            ]
          }
        ],
        instructions: "Keep one rep in reserve."
      },
      updatedAt: new Date("2026-06-17T00:00:00.000Z")
    };
    mocks.prisma.trainingProgramTemplate.findFirst.mockResolvedValue(templateRecord);
    mocks.prisma.trainingProgramTemplate.update.mockResolvedValue(updatedTemplate);

    const response = await updateTrainingTemplate(
      new Request("http://test.local/api/v1/training-program-templates/template_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Edited Strength Foundation",
          durationWeeks: 10,
          template: updatedTemplate.templateJson
        })
      }),
      { params: Promise.resolve({ templateId: "template_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; name: string; durationWeeks: number } };

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ id: "template_1", name: "Edited Strength Foundation", durationWeeks: 10 });
    expect(mocks.prisma.trainingProgramTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "template_1" },
        data: expect.objectContaining({
          name: "Edited Strength Foundation",
          durationWeeks: 10,
          templateJson: updatedTemplate.templateJson
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "training_template.updated",
          targetId: "template_1"
        })
      })
    );
  });

  it("returns not found when deleting a template outside the active organization", async () => {
    mocks.prisma.trainingProgramTemplate.findFirst.mockResolvedValue(null);

    const response = await deleteTrainingTemplate(
      new Request("http://test.local/api/v1/training-program-templates/missing", { method: "DELETE" }),
      { params: Promise.resolve({ templateId: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.trainingProgramTemplate.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("creates immutable assignment snapshots from templates", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.trainingProgramTemplate.findFirst.mockResolvedValue(templateRecord);
    mocks.prisma.trainingProgramAssignment.create.mockResolvedValue(assignmentRecord);

    const response = await createTrainingAssignment(
      new Request("http://test.local/api/v1/training-program-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client_1",
          templateId: "template_1",
          startsOn: "2026-05-14",
          endsOn: "2026-07-09"
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; snapshot: { templateName: string } } };

    expect(response.status).toBe(201);
    expect(payload.data.snapshot.templateName).toBe("Strength Foundation");
    expect(mocks.prisma.trainingProgramAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          snapshotJson: expect.objectContaining({
            templateId: "template_1",
            templateName: "Strength Foundation"
          })
        })
      })
    );
  });

  it("lists training assignments and client training programs with organization scope", async () => {
    mocks.prisma.trainingProgramAssignment.findMany.mockResolvedValue([assignmentRecord]);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });

    const listResponse = await getTrainingAssignments(
      new Request("http://test.local/api/v1/training-program-assignments?clientId=client_1")
    );
    const clientResponse = await getClientTrainingPrograms(
      new Request("http://test.local/api/v1/clients/client_1/training-programs"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(listResponse.status).toBe(200);
    expect(clientResponse.status).toBe(200);
    expect(mocks.prisma.trainingProgramAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1", clientId: "client_1" })
      })
    );
  });

  it("creates organization-scoped signed upload URLs for exercise media", async () => {
    const response = await createExerciseMediaUploadUrl(
      new Request("http://test.local/api/v1/exercises/media-upload-url", {
        method: "POST",
        body: JSON.stringify({
          mediaType: "video",
          filename: "squat-demo.mp4",
          contentType: "video/mp4",
          byteSize: 12_345,
          checksumSha256: "a".repeat(64)
        })
      })
    );
    const payload = (await response.json()) as {
      data: {
        objectKey: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
        maxBytes: number;
        mediaType: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.objectKey).toMatch(
      /^organizations\/org_1\/training\/exercises\/video\/[0-9a-f-]{36}\.mp4$/
    );
    expect(payload.data.uploadUrl).toContain("X-Amz-Signature=");
    expect(payload.data.uploadUrl).toContain("complete-coach-test");
    expect(payload.data.requiredHeaders).toEqual({ "Content-Type": "video/mp4" });
    expect(payload.data.maxBytes).toBe(500 * 1024 * 1024);
    expect(payload.data.mediaType).toBe("video");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "exercise_media.upload_url_created",
          targetType: "exercise_media",
          targetId: payload.data.objectKey,
          metadata: expect.objectContaining({
            mediaType: "video",
            contentType: "video/mp4",
            byteSize: 12_345
          })
        })
      })
    );
  });

  it("validates exercise media upload type and size before signing", async () => {
    const response = await createExerciseMediaUploadUrl(
      new Request("http://test.local/api/v1/exercises/media-upload-url", {
        method: "POST",
        body: JSON.stringify({
          mediaType: "image",
          filename: "progress.gif",
          contentType: "image/gif",
          byteSize: 20 * 1024 * 1024
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns a safe service error when R2 is not configured", async () => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;

    const response = await createExerciseMediaUploadUrl(
      new Request("http://test.local/api/v1/exercises/media-upload-url", {
        method: "POST",
        body: JSON.stringify({
          mediaType: "image",
          filename: "squat.jpg",
          contentType: "image/jpeg",
          byteSize: 100_000
        })
      })
    );

    expect(response.status).toBe(503);
  });
});
