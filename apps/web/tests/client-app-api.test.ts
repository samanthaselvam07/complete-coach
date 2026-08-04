import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CheckInStatus,
  ClientActivityLogDomain,
  ClientActivityLogStatus,
  ClientStatus,
  MealPlanAssignmentStatus,
  SupplementPlanAssignmentStatus,
  TrainingProgramAssignmentStatus
} from "@/app/generated/prisma/enums";
import { GET as getClientCheckIns } from "@/app/api/v1/client/check-ins/route";
import { GET as getClientLogs, POST as postClientLog } from "@/app/api/v1/client/logs/route";
import { GET as getClientMe } from "@/app/api/v1/client/me/route";
import { GET as getClientRoadmap } from "@/app/api/v1/client/roadmap/route";
import { GET as getWorkoutNotes, POST as postWorkoutNote } from "@/app/api/v1/client/workout-notes/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    client: {
      findFirstOrThrow: vi.fn(),
      update: vi.fn()
    },
    mealPlanAssignment: {
      findMany: vi.fn()
    },
    trainingProgramAssignment: {
      findMany: vi.fn()
    },
    supplementPlanAssignment: {
      findMany: vi.fn()
    },
    clientNote: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    checkIn: {
      findMany: vi.fn()
    },
    clientMeasurement: {
      findMany: vi.fn()
    },
    clientRoadmapPhase: {
      findMany: vi.fn()
    },
    clientActivityLog: {
      findMany: vi.fn(),
      upsert: vi.fn()
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
      },
      profile: {
        trainingLogTargetDays: 4,
        waterTargetLitres: 3,
        stepTarget: 10000
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
    mocks.prisma.supplementPlanAssignment.findMany.mockResolvedValue([
      {
        id: "supplement_assignment_1",
        organizationId: "org_1",
        clientId: "client_1",
        templateId: "supplement_template_1",
        name: "Sleep Support",
        status: SupplementPlanAssignmentStatus.ACTIVE,
        startsOn: new Date("2026-07-01T00:00:00.000Z"),
        endsOn: null,
        snapshotJson: {
          templateName: "Sleep Support",
          template: {
            phases: [
              {
                name: "Evening",
                supplements: [
                  {
                    supplementName: "Magnesium Glycinate",
                    dosage: "300mg",
                    timing: "Before bed"
                  }
                ]
              }
            ]
          }
        },
        createdAt: now,
        updatedAt: now,
        client: { firstName: "Client", lastName: "One" }
      }
    ]);
    mocks.prisma.clientNote.findMany.mockResolvedValue([]);
    mocks.prisma.checkIn.findMany.mockResolvedValue([
      {
        id: "checkin_1",
        organizationId: "org_1",
        clientId: "client_1",
        formSubmissionId: "submission_1",
        type: "check-in",
        status: CheckInStatus.COMPLETED,
        dueAt: new Date("2026-07-28T00:00:00.000Z"),
        submittedAt: new Date("2026-07-29T00:00:00.000Z"),
        reviewedAt: null,
        summary: "Strong week.",
        coachNotes: null,
        createdAt: now,
        updatedAt: now,
        client: { firstName: "Client", lastName: "One" },
        formSubmission: {
          id: "submission_1",
          formId: "form_1",
          formVersionId: "form_version_1",
          assignmentId: "assignment_1",
          clientId: "client_1",
          answersJson: {
            progressPhotos: [{ url: "https://cdn.completecoach.fit/front.jpg" }]
          },
          status: "submitted",
          submittedAt: new Date("2026-07-29T00:00:00.000Z"),
          reviewedAt: null,
          createdAt: now,
          updatedAt: now,
          form: { id: "form_1", name: "Weekly Check-in", type: "check-in" },
          formVersion: {
            id: "form_version_1",
            formId: "form_1",
            versionNumber: 1,
            schemaJson: {},
            uiJson: {},
            publishedAt: now,
            createdAt: now
          },
          client: { firstName: "Client", lastName: "One" }
        }
      }
    ]);
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([
      {
        id: "metric_1",
        organizationId: "org_1",
        clientId: "client_1",
        sourceType: "form_submission",
        sourceId: "submission_1",
        measuredAt: new Date("2026-07-29T00:00:00.000Z"),
        metricKey: "body_weight",
        metricValue: 74.6,
        unit: "kg",
        metadata: { label: "Bodyweight" },
        createdAt: now
      }
    ]);
    mocks.prisma.clientRoadmapPhase.findMany.mockResolvedValue([
      {
        id: "phase_1",
        organizationId: "org_1",
        clientId: "client_1",
        name: "Hypertrophy Phase",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-08-01T00:00:00.000Z"),
        status: "active",
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: "item_1",
            organizationId: "org_1",
            clientId: "client_1",
            phaseId: "phase_1",
            title: "Weekly coaching sync",
            type: "event",
            eventDate: new Date("2026-07-31T00:00:00.000Z"),
            notes: "Review progress.",
            createdAt: now,
            updatedAt: now
          }
        ]
      }
    ]);
    mocks.prisma.clientActivityLog.findMany.mockResolvedValue([]);
    mocks.prisma.clientActivityLog.upsert.mockResolvedValue({
      id: "log_1",
      domain: ClientActivityLogDomain.TRAINING,
      logDate: new Date("2026-07-29T00:00:00.000Z"),
      status: ClientActivityLogStatus.COMPLETED,
      notes: "Lower session completed.",
      createdAt: now,
      updatedAt: now
    });
    mocks.prisma.client.update.mockResolvedValue({ id: "client_1", compliance: 6 });
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
        profile: { trainingLogTargetDays: number | null };
        trainingAssignments: Array<{ id: string }>;
        mealPlanAssignments: Array<{ id: string }>;
        supplementPlanAssignments: Array<{ id: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.organization.id).toBe("org_1");
    expect(payload.data.client).toMatchObject({ id: "client_1", name: "Client One" });
    expect(payload.data.profile.trainingLogTargetDays).toBe(4);
    expect(payload.data.trainingAssignments).toHaveLength(1);
    expect(payload.data.mealPlanAssignments).toHaveLength(1);
    expect(payload.data.supplementPlanAssignments).toHaveLength(1);
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
    expect(mocks.prisma.supplementPlanAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", clientId: "client_1" }
      })
    );
  });

  it("lets the signed-in client upsert their own activity log and updates compliance", async () => {
    mocks.prisma.clientActivityLog.findMany.mockResolvedValue([
      {
        id: "log_1",
        domain: ClientActivityLogDomain.TRAINING,
        logDate: new Date("2026-07-29T00:00:00.000Z"),
        status: ClientActivityLogStatus.COMPLETED,
        notes: "Lower session completed.",
        createdAt: now,
        updatedAt: now
      }
    ]);

    const response = await postClientLog(
      new Request("http://test.local/api/v1/client/logs", {
        method: "POST",
        body: JSON.stringify({
          domain: "training",
          logDate: "2026-07-29",
          status: "completed",
          notes: "Lower session completed."
        })
      })
    );
    const payload = (await response.json()) as { data: { summary: { possibleLogs: number; complianceScore: number } } };

    expect(response.status).toBe(200);
    expect(payload.data.summary).toMatchObject({
      possibleLogs: 18,
      complianceScore: 6
    });
    expect(mocks.prisma.clientActivityLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_clientId_domain_logDate: {
            organizationId: "org_1",
            clientId: "client_1",
            domain: ClientActivityLogDomain.TRAINING,
            logDate: new Date("2026-07-29T00:00:00.000Z")
          }
        },
        create: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          sourceType: "client_app",
          sourceId: "user_client"
        })
      })
    );
    expect(mocks.prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client_1", organizationId: "org_1" },
      data: { compliance: 6 }
    });
  });

  it("returns client activity logs using the coach-set training target", async () => {
    mocks.prisma.clientActivityLog.findMany.mockResolvedValue([
      {
        id: "log_1",
        domain: ClientActivityLogDomain.TRAINING,
        logDate: new Date("2026-07-29T00:00:00.000Z"),
        status: ClientActivityLogStatus.COMPLETED,
        notes: null,
        createdAt: now,
        updatedAt: now
      }
    ]);

    const response = await getClientLogs(new Request("http://test.local/api/v1/client/logs?days=7"));
    const payload = (await response.json()) as { data: { summary: { possibleLogs: number; complianceScore: number } } };

    expect(response.status).toBe(200);
    expect(payload.data.summary).toMatchObject({
      possibleLogs: 18,
      complianceScore: 6
    });
    expect(mocks.prisma.clientActivityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1",
          logDate: expect.any(Object)
        }
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

  it("returns weekly check-ins for only the signed-in client", async () => {
    const response = await getClientCheckIns(new Request("http://test.local/api/v1/client/check-ins?limit=3"));
    const payload = (await response.json()) as {
      data: Array<{
        id: string;
        answers: { progressPhotos: Array<{ url: string }> };
        metrics: Array<{ metricKey: string }>;
      }>;
    };

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].answers.progressPhotos[0].url).toContain("front.jpg");
    expect(payload.data[0].metrics[0].metricKey).toBe("body_weight");
    expect(mocks.prisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", clientId: "client_1" },
        take: 3
      })
    );
    expect(mocks.prisma.clientMeasurement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          sourceType: "form_submission"
        })
      })
    );
  });

  it("returns the signed-in client's roadmap phases from their coach profile", async () => {
    const response = await getClientRoadmap();
    const payload = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        items: Array<{ title: string }>;
      }>;
    };

    expect(response.status).toBe(200);
    expect(payload.data[0].name).toBe("Hypertrophy Phase");
    expect(payload.data[0].items[0].title).toBe("Weekly coaching sync");
    expect(mocks.prisma.clientRoadmapPhase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", clientId: "client_1" }
      })
    );
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
