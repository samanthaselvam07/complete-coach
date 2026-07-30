import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientStatus, MealPlanAssignmentStatus, TrainingProgramAssignmentStatus } from "@/app/generated/prisma/enums";
import { GET as getClientMe } from "@/app/api/v1/client/me/route";
import { GET as getWorkoutNotes, POST as postWorkoutNote } from "@/app/api/v1/client/workout-notes/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    client: {
      findFirstOrThrow: vi.fn()
    },
    mealPlanAssignment: {
      findMany: vi.fn()
    },
    trainingProgramAssignment: {
      findMany: vi.fn()
    },
    clientNote: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));

const clientSession = {
  user: { id: "user_client", email: "client@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "client"
  },
  activeClient: {
    id: "client_1",
    organizationId: "org_1",
    name: "Client One",
    email: "client@example.com",
    timezone: "Australia/Melbourne"
  },
  expires: "2099-01-01T00:00:00.000Z"
};

const now = new Date("2026-07-29T00:00:00.000Z");

describe("client app APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(clientSession);
    mocks.prisma.client.findFirstOrThrow.mockResolvedValue({
      id: "client_1",
      firstName: "Client",
      lastName: "One",
      email: "client@example.com",
      status: ClientStatus.ACTIVE,
      packageName: "Pro Coaching",
      checkInDay: "Monday",
      timezone: "Australia/Melbourne",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      latestCheckInAt: null,
      compliance: 92,
      primaryCoach: {
        name: "Sam Coach",
        email: "sam@example.com"
      }
    });
    mocks.prisma.trainingProgramAssignment.findMany.mockResolvedValue([
      {
        id: "training_assignment_1",
        organizationId: "org_1",
        clientId: "client_1",
        templateId: "template_1",
        name: "Strength Block",
        status: TrainingProgramAssignmentStatus.ACTIVE,
        startsOn: new Date("2026-07-01T00:00:00.000Z"),
        endsOn: null,
        snapshotJson: { days: [] },
        createdAt: now,
        updatedAt: now,
        client: { firstName: "Client", lastName: "One" }
      }
    ]);
    mocks.prisma.mealPlanAssignment.findMany.mockResolvedValue([
      {
        id: "meal_assignment_1",
        organizationId: "org_1",
        clientId: "client_1",
        templateId: "meal_template_1",
        name: "Performance Nutrition",
        phase: "Build",
        targetCalories: 2300,
        proteinGrams: 150,
        carbsGrams: 250,
        fatGrams: 70,
        status: MealPlanAssignmentStatus.ACTIVE,
        snapshotJson: { days: [] },
        startsOn: new Date("2026-07-01T00:00:00.000Z"),
        endsOn: null,
        createdAt: now,
        updatedAt: now,
        client: { firstName: "Client", lastName: "One" }
      }
    ]);
    mocks.prisma.clientNote.findMany.mockResolvedValue([]);
    mocks.prisma.clientNote.create.mockResolvedValue({
      id: "workout_note_1",
      clientId: "client_1",
      noteDate: new Date("2026-07-29T00:00:00.000Z"),
      body: "Workout note: Strength Block / Lower A / Seated Leg Extension\n\nKnee felt stable today.",
      createdAt: now,
      author: { name: "Client One", email: "client@example.com" }
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});
  });

  it("returns the signed-in client's organization-scoped profile and assigned plans", async () => {
    const response = await getClientMe();
    const payload = (await response.json()) as {
      data: {
        organization: { id: string };
        client: { id: string; name: string };
        trainingAssignments: Array<{ id: string }>;
        mealPlanAssignments: Array<{ id: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.organization.id).toBe("org_1");
    expect(payload.data.client).toMatchObject({ id: "client_1", name: "Client One" });
    expect(payload.data.trainingAssignments).toHaveLength(1);
    expect(payload.data.mealPlanAssignments).toHaveLength(1);
    expect(mocks.prisma.client.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "client_1",
          organizationId: "org_1",
          clientUserId: "user_client",
          deletedAt: null
        }
      })
    );
    expect(mocks.prisma.trainingProgramAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", clientId: "client_1" }
      })
    );
  });

  it("requires a linked client profile", async () => {
    mocks.auth.mockResolvedValue({
      ...clientSession,
      activeClient: undefined
    });

    const response = await getClientMe();
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("active_client_required");
    expect(mocks.prisma.client.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it("stores workout notes as client notes scoped to the linked client", async () => {
    const response = await postWorkoutNote(
      new Request("http://test.local/api/v1/client/workout-notes", {
        method: "POST",
        body: JSON.stringify({
          assignmentName: "Strength Block",
          dayName: "Lower A",
          exerciseName: "Seated Leg Extension",
          body: "Knee felt stable today."
        })
      })
    );
    const payload = (await response.json()) as { data: { body: string; authorName: string } };

    expect(response.status).toBe(201);
    expect(payload.data.body).toContain("Knee felt stable today.");
    expect(mocks.prisma.clientNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          authorUserId: "user_client",
          body: "Workout note: Strength Block / Lower A / Seated Leg Extension\n\nKnee felt stable today."
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.workout_note_created",
          targetId: "client_1",
          metadata: expect.objectContaining({
            assignmentName: "Strength Block",
            dayName: "Lower A",
            exerciseName: "Seated Leg Extension"
          })
        })
      })
    );
  });

  it("lists workout notes for the signed-in client's workout context", async () => {
    mocks.prisma.clientNote.findMany.mockResolvedValue([
      {
        id: "workout_note_1",
        clientId: "client_1",
        noteDate: new Date("2026-07-29T00:00:00.000Z"),
        body: "Workout note: Strength Block / Lower A\n\nFirst note.",
        createdAt: now,
        author: { name: "Client One", email: "client@example.com" }
      }
    ]);

    const response = await getWorkoutNotes(
      new Request("http://test.local/api/v1/client/workout-notes?assignmentName=Strength%20Block&dayName=Lower%20A")
    );
    const payload = (await response.json()) as { data: Array<{ body: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(mocks.prisma.clientNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1",
          body: {
            contains: "Workout note: Strength Block / Lower A",
            mode: "insensitive"
          }
        }
      })
    );
  });
});
