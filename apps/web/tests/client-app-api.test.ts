import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CheckInStatus,
  ClientActivityLogDomain,
  ClientActivityLogStatus,
  ClientStatus,
  ClientSubscriptionStatus,
  FormAssignmentStatus,
  FormSubmissionStatus,
  FormType,
  MealPlanAssignmentStatus,
  PackageBillingInterval,
  PackageStatus,
  SupplementPlanAssignmentStatus,
  TrainingProgramAssignmentStatus
} from "@/app/generated/prisma/enums";
import { GET as getClientCheckIns } from "@/app/api/v1/client/check-ins/route";
import { GET as getClientCheckInPhotoUrl } from "@/app/api/v1/client/check-in-photo-url/route";
import { POST as uploadClientCheckInPhoto } from "@/app/api/v1/client/check-in-photo-upload/route";
import { GET as getDailyCheckIn, POST as postDailyCheckIn } from "@/app/api/v1/client/daily-check-in/route";
import { GET as getClientHydration, POST as postClientHydration } from "@/app/api/v1/client/hydration/route";
import { GET as getClientLogs, POST as postClientLog } from "@/app/api/v1/client/logs/route";
import { GET as getClientMe } from "@/app/api/v1/client/me/route";
import { POST as postClientOnboardingCheckout } from "@/app/api/v1/client/onboarding/checkout/route";
import { POST as postClientOnboardingQuestionnaire } from "@/app/api/v1/client/onboarding/questionnaire/route";
import { GET as getClientOnboardingStatus } from "@/app/api/v1/client/onboarding/status/route";
import { GET as getClientRoadmap } from "@/app/api/v1/client/roadmap/route";
import { GET as getWorkoutNotes, POST as postWorkoutNote } from "@/app/api/v1/client/workout-notes/route";
import { POST as postWorkoutSession } from "@/app/api/v1/client/workout-sessions/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    client: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      update: vi.fn()
    },
    organization: {
      findUnique: vi.fn()
    },
    coachingPackage: {
      findFirst: vi.fn()
    },
    clientSubscription: {
      create: vi.fn(),
      findFirst: vi.fn()
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
      create: vi.fn(),
      findMany: vi.fn()
    },
    clientMeasurement: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    formAssignment: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    formSubmission: {
      create: vi.fn()
    },
    clientRoadmapPhase: {
      findMany: vi.fn()
    },
    clientActivityLog: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    clientWorkoutSession: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    r2: {
      createR2PresignedGetUrl: vi.fn(),
      createR2PresignedPutUrl: vi.fn(),
      getR2Config: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/storage/r2", () => ({
  createR2PresignedGetUrl: mocks.prisma.r2.createR2PresignedGetUrl,
  createR2PresignedPutUrl: mocks.prisma.r2.createR2PresignedPutUrl,
  getR2Config: mocks.prisma.r2.getR2Config
}));

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
    mocks.prisma.client.findFirst.mockResolvedValue({
      id: "client_1",
      firstName: "Client",
      lastName: "One",
      email: "client@example.com",
      packageId: "package_1",
      requiresOnlinePayment: true
    });
    mocks.prisma.client.findFirstOrThrow.mockResolvedValue({
      id: "client_1",
      firstName: "Client",
      lastName: "One",
      email: "client@example.com",
      status: ClientStatus.ACTIVE,
      packageId: "package_1",
      packageName: "Pro Coaching",
      requiresOnlinePayment: true,
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
    mocks.prisma.organization.findUnique.mockResolvedValue({ id: "org_1", name: "Complete Coach Demo", stripeConnectAccountId: "acct_1" });
    mocks.prisma.coachingPackage.findFirst.mockResolvedValue(coachingPackageRecord());
    mocks.prisma.clientSubscription.findFirst.mockResolvedValue(null);
    mocks.prisma.clientSubscription.create.mockResolvedValue(clientSubscriptionRecord());
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
    mocks.prisma.checkIn.create.mockResolvedValue({
      id: "check_in_1",
      organizationId: "org_1",
      clientId: "client_1",
      formSubmissionId: "submission_weekly_1",
      type: "check-in",
      status: CheckInStatus.PENDING_REVIEW,
      dueAt: null,
      submittedAt: now,
      reviewedAt: null,
      reviewedByUserId: null,
      summary: null,
      coachNotes: null,
      createdAt: now,
      updatedAt: now
    });
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
    mocks.prisma.clientWorkoutSession.create.mockResolvedValue(workoutSessionRecord());
    mocks.prisma.clientWorkoutSession.findMany.mockResolvedValue([workoutSessionRecord()]);
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
    mocks.prisma.r2.getR2Config.mockReturnValue({
      accountId: "account_1",
      accessKeyId: "access_1",
      secretAccessKey: "secret_1",
      bucketName: "complete-coach-test"
    });
    mocks.prisma.r2.createR2PresignedPutUrl.mockReturnValue("https://r2.example/check-in-photo-upload");
    mocks.prisma.r2.createR2PresignedGetUrl.mockReturnValue("https://r2.example/signed-check-in-photo.jpg");
    mocks.prisma.formAssignment.findFirst.mockResolvedValue(null);
    mocks.prisma.formAssignment.update.mockResolvedValue({});
    mocks.prisma.formSubmission.create.mockResolvedValue({
      id: "submission_daily_1",
      formId: "form_daily",
      formVersionId: "form_version_daily",
      assignmentId: "assignment_daily_1",
      clientId: "client_1",
      answersJson: { body_weight: 74.5 },
      status: FormSubmissionStatus.SUBMITTED,
      submittedAt: now,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
      client: { firstName: "Client", lastName: "One" },
      form: { id: "form_daily", name: "Daily Basics", type: FormType.HABIT_TRACKER },
      formVersion: {
        id: "form_version_daily",
        formId: "form_daily",
        versionNumber: 1,
        schemaJson: {},
        uiJson: {},
        publishedAt: now,
        createdAt: now
      }
    });
    mocks.prisma.clientMeasurement.findFirst.mockResolvedValue(null);
    mocks.prisma.clientMeasurement.upsert.mockResolvedValue({ id: "measurement_1" });
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
        where: {
          organizationId: "org_1",
          clientId: "client_1"
        }
      })
    );
    expect(mocks.prisma.mealPlanAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1",
          status: MealPlanAssignmentStatus.ACTIVE
        }
      })
    );
    expect(mocks.prisma.supplementPlanAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1",
          status: SupplementPlanAssignmentStatus.ACTIVE
        }
      })
    );
  });

  it("uploads a signed-in client's check-in photo into their scoped storage path", async () => {
    const uploadFetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", uploadFetch);

    const response = await uploadClientCheckInPhoto(
      new Request("http://test.local/api/v1/client/check-in-photo-upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "x-filename": encodeURIComponent("front-progress.jpg")
        },
        body: new Blob(["photo-bytes"], { type: "image/jpeg" })
      })
    );
    const payload = (await response.json()) as { data: { objectKey: string; photoUrl: string } };

    expect(response.status).toBe(200);
    expect(payload.data.objectKey).toMatch(
      /^organizations\/org_1\/clients\/client_1\/check-ins\/photos\/[0-9a-fA-F-]{36}\.jpg$/
    );
    expect(payload.data.photoUrl).toBe(`r2://${payload.data.objectKey}`);
    expect(uploadFetch).toHaveBeenCalledWith(
      "https://r2.example/check-in-photo-upload",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: expect.any(Uint8Array)
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          actorUserId: "user_client",
          action: "client.check_in_photo.uploaded",
          targetType: "check_in_photo",
          metadata: expect.objectContaining({
            clientId: "client_1",
            contentType: "image/jpeg"
          })
        })
      })
    );
  });

  it("infers the check-in photo content type for camera roll uploads", async () => {
    const uploadFetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", uploadFetch);

    const response = await uploadClientCheckInPhoto(
      new Request("http://test.local/api/v1/client/check-in-photo-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-filename": encodeURIComponent("front-progress.HEIC")
        },
        body: new Blob(["photo-bytes"], { type: "application/octet-stream" })
      })
    );
    const payload = (await response.json()) as { data: { objectKey: string; photoUrl: string } };

    expect(response.status).toBe(200);
    expect(payload.data.objectKey).toMatch(
      /^organizations\/org_1\/clients\/client_1\/check-ins\/photos\/[0-9a-fA-F-]{36}\.heic$/
    );
    expect(uploadFetch).toHaveBeenCalledWith(
      "https://r2.example/check-in-photo-upload",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/heic" },
        body: expect.any(Uint8Array)
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: "image/heic"
          })
        })
      })
    );
  });

  it("prefers the allowed check-in photo filename extension when browser content type metadata conflicts", async () => {
    const uploadFetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", uploadFetch);

    const response = await uploadClientCheckInPhoto(
      new Request("http://test.local/api/v1/client/check-in-photo-upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "x-filename": encodeURIComponent("front-progress.heic")
        },
        body: new Blob(["photo-bytes"], { type: "image/jpeg" })
      })
    );

    expect(response.status).toBe(200);
    expect(uploadFetch).toHaveBeenCalledWith(
      "https://r2.example/check-in-photo-upload",
      expect.objectContaining({
        headers: { "Content-Type": "image/heic" }
      })
    );
  });

  it("accepts extensionless check-in photo filenames when the browser provides an allowed image type", async () => {
    const uploadFetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", uploadFetch);

    const response = await uploadClientCheckInPhoto(
      new Request("http://test.local/api/v1/client/check-in-photo-upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "x-filename": encodeURIComponent("check-in-photo")
        },
        body: new Blob(["photo-bytes"], { type: "image/jpeg" })
      })
    );
    const payload = (await response.json()) as { data: { objectKey: string } };

    expect(response.status).toBe(200);
    expect(payload.data.objectKey).toMatch(
      /^organizations\/org_1\/clients\/client_1\/check-ins\/photos\/[0-9a-fA-F-]{36}\.jpg$/
    );
    expect(uploadFetch).toHaveBeenCalledWith(
      "https://r2.example/check-in-photo-upload",
      expect.objectContaining({
        headers: { "Content-Type": "image/jpeg" }
      })
    );
  });

  it("creates a signed display URL for the signed-in client's uploaded check-in photo", async () => {
    const photoUrl = "r2://organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.jpg";
    const response = await getClientCheckInPhotoUrl(
      new Request(`http://test.local/api/v1/client/check-in-photo-url?photoUrl=${encodeURIComponent(photoUrl)}`)
    );
    const payload = (await response.json()) as { data: { url: string } };

    expect(response.status).toBe(200);
    expect(payload.data.url).toBe("https://r2.example/signed-check-in-photo.jpg");
    expect(mocks.prisma.r2.createR2PresignedGetUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.jpg"
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

  it("returns the signed-in client's daily hydration total", async () => {
    mocks.prisma.clientMeasurement.findFirst.mockResolvedValueOnce({
      id: "measurement_water_1",
      organizationId: "org_1",
      clientId: "client_1",
      sourceType: "client_hydration",
      sourceId: "hydration:2026-07-29",
      measuredAt: now,
      metricKey: "water_intake",
      metricValue: 1250,
      unit: "ml",
      metadata: { date: "2026-07-29" },
      createdAt: now
    });

    const response = await getClientHydration(new Request("http://test.local/api/v1/client/hydration?date=2026-07-29"));
    const payload = (await response.json()) as { data: { date: string; hydrationMl: number } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ date: "2026-07-29", hydrationMl: 1250 });
    expect(mocks.prisma.clientMeasurement.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        clientId: "client_1",
        sourceType: "client_hydration",
        sourceId: "hydration:2026-07-29",
        metricKey: "water_intake"
      }
    });
  });

  it("adds water to the signed-in client's daily hydration total", async () => {
    mocks.prisma.clientMeasurement.findFirst.mockResolvedValueOnce({
      id: "measurement_water_1",
      organizationId: "org_1",
      clientId: "client_1",
      sourceType: "client_hydration",
      sourceId: "hydration:2026-07-29",
      measuredAt: now,
      metricKey: "water_intake",
      metricValue: 500,
      unit: "ml",
      metadata: { date: "2026-07-29" },
      createdAt: now
    });

    const response = await postClientHydration(
      new Request("http://test.local/api/v1/client/hydration", {
        method: "POST",
        body: JSON.stringify({ date: "2026-07-29", amountMl: 250 })
      })
    );
    const payload = (await response.json()) as { data: { date: string; hydrationMl: number } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ date: "2026-07-29", hydrationMl: 750 });
    expect(mocks.prisma.clientMeasurement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_sourceType_sourceId_metricKey: {
            organizationId: "org_1",
            sourceType: "client_hydration",
            sourceId: "hydration:2026-07-29",
            metricKey: "water_intake"
          }
        },
        update: expect.objectContaining({
          metricValue: 750,
          unit: "ml"
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.hydration_logged",
          targetType: "client_measurement"
        })
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

  it("returns the signed-in client's assigned daily check-in form", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(dailyAssignmentRecord());

    const response = await getDailyCheckIn();
    const payload = (await response.json()) as {
      data: {
        id: string;
        formName: string;
        formVersion: { schema: { title: string } };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("assignment_daily_1");
    expect(payload.data.formName).toBe("Daily Basics");
    expect(payload.data.formVersion.schema.title).toBe("Daily Basics");
    expect(mocks.prisma.formAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          form: expect.objectContaining({ type: FormType.HABIT_TRACKER })
        })
      })
    );
  });

  it("returns the signed-in client's assigned weekly check-in form", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(weeklyAssignmentRecord());

    const response = await getDailyCheckIn(new Request("http://test.local/api/v1/client/daily-check-in?kind=weekly"));
    const payload = (await response.json()) as {
      data: {
        id: string;
        formName: string;
        formVersion: { schema: { title: string } };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("assignment_weekly_1");
    expect(payload.data.formName).toBe("Weekly Review");
    expect(payload.data.formVersion.schema.title).toBe("Weekly Review");
    expect(mocks.prisma.formAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          form: expect.objectContaining({ type: FormType.CHECK_IN })
        })
      })
    );
  });

  it("requires connected Stripe payment before returning an assigned onboarding Q&A", async () => {
    mocks.prisma.clientSubscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(clientSubscriptionRecord());
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(onboardingQuestionnaireAssignmentRecord());

    const response = await getClientOnboardingStatus();
    const payload = (await response.json()) as {
      data: {
        payment: { required: boolean; packageId: string | null; packageName: string | null };
        questionnaire: unknown;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.payment.required).toBe(true);
    expect(payload.data.payment.packageId).toBe("package_1");
    expect(payload.data.payment.packageName).toBe("Pro Coaching");
    expect(payload.data.questionnaire).toBeNull();
  });

  it("does not show the payment paywall when a package is assigned without an online payment subscription", async () => {
    mocks.prisma.client.findFirstOrThrow.mockResolvedValueOnce({
      id: "client_1",
      packageId: "package_1",
      packageName: "Pro Coaching",
      requiresOnlinePayment: false
    });
    mocks.prisma.clientSubscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(onboardingQuestionnaireAssignmentRecord());

    const response = await getClientOnboardingStatus();
    const payload = (await response.json()) as {
      data: {
        payment: { required: boolean; packageId: string | null; packageName: string | null };
        questionnaire: unknown;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.payment.required).toBe(false);
    expect(payload.data.payment.packageId).toBe("package_1");
    expect(payload.data.questionnaire).not.toBeNull();
  });

  it("creates a connected Stripe checkout session for the signed-in client's assigned package", async () => {
    const originalSecret = process.env.STRIPE_SECRET_KEY;
    const originalBaseUrl = process.env.STRIPE_API_BASE_URL;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: "cus_1" }))
      .mockResolvedValueOnce(Response.json({ id: "cs_1", url: "https://checkout.stripe.test/client" }));

    process.env.STRIPE_SECRET_KEY = "sk_test_client";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.client.findFirst.mockResolvedValueOnce({
      id: "client_1",
      firstName: "Client",
      lastName: "One",
      email: "client@example.com",
      packageId: "package_1",
      requiresOnlinePayment: true
    });
    mocks.prisma.clientSubscription.findFirst.mockResolvedValueOnce(null);

    try {
      const response = await postClientOnboardingCheckout(new Request("https://client.completecoach.fit/api/v1/client/onboarding/checkout", { method: "POST" }));
      const payload = (await response.json()) as { data: { checkoutUrl: string } };

      expect(response.status).toBe(201);
      expect(payload.data.checkoutUrl).toBe("https://checkout.stripe.test/client");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][1].headers["Stripe-Account"]).toBe("acct_1");
      expect(fetchMock.mock.calls[1][1].headers["Stripe-Account"]).toBe("acct_1");
      expect(String(fetchMock.mock.calls[1][1].body)).toContain("success_url=https%3A%2F%2Fclient.completecoach.fit%2F%3Fpayment%3Dsuccess");
      expect(mocks.prisma.clientSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org_1",
            clientId: "client_1",
            packageId: "package_1",
            stripeCustomerId: "cus_1",
            stripeCheckoutSessionId: "cs_1",
            status: ClientSubscriptionStatus.INCOMPLETE
          })
        })
      );
    } finally {
      process.env.STRIPE_SECRET_KEY = originalSecret;
      process.env.STRIPE_API_BASE_URL = originalBaseUrl;
      vi.unstubAllGlobals();
    }
  });

  it("does not create checkout when the assigned package is not an online payment requirement", async () => {
    mocks.prisma.client.findFirst.mockResolvedValueOnce({
      packageId: "package_1",
      requiresOnlinePayment: false
    });

    const response = await postClientOnboardingCheckout(new Request("https://client.completecoach.fit/api/v1/client/onboarding/checkout", { method: "POST" }));
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("client_payment_not_required");
    expect(payload.error.message).toBe("No online payment is assigned to this client.");
    expect(mocks.prisma.clientSubscription.create).not.toHaveBeenCalled();
  });

  it("submits the signed-in client's onboarding Q&A and stores it on their profile history", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(onboardingQuestionnaireAssignmentRecord());
    mocks.prisma.formSubmission.create.mockResolvedValueOnce({
      id: "submission_onboarding_1",
      formId: "form_intake",
      formVersionId: "form_version_intake",
      assignmentId: "assignment_intake_1",
      clientId: "client_1",
      answersJson: { goal: "Build strength", starting_weight: 74.5 },
      status: FormSubmissionStatus.SUBMITTED,
      submittedAt: now,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
      client: { firstName: "Client", lastName: "One" },
      form: { id: "form_intake", name: "Initial Q&A", type: FormType.INTAKE },
      formVersion: {
        id: "form_version_intake",
        formId: "form_intake",
        versionNumber: 1,
        schemaJson: onboardingQuestionnaireDefinition(),
        uiJson: {},
        publishedAt: now,
        createdAt: now
      }
    });

    const response = await postClientOnboardingQuestionnaire(
      new Request("http://test.local/api/v1/client/onboarding/questionnaire", {
        method: "POST",
        body: JSON.stringify({ answers: { goal: "Build strength", starting_weight: 74.5 } })
      })
    );
    const payload = (await response.json()) as { data: { id: string; formType: string | null; answers: Record<string, unknown> } };

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("submission_onboarding_1");
    expect(payload.data.formType).toBe("intake");
    expect(payload.data.answers.goal).toBe("Build strength");
    expect(mocks.prisma.formAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assignment_intake_1", organizationId: "org_1" },
        data: expect.objectContaining({ status: FormAssignmentStatus.SUBMITTED })
      })
    );
    expect(mocks.prisma.clientMeasurement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          clientId: "client_1",
          metricKey: "starting_weight",
          metricValue: 74.5
        })
      })
    );
  });

  it("submits the signed-in client's reusable daily habit form without completing the assignment", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(dailyAssignmentRecord());

    const response = await postDailyCheckIn(
      new Request("http://test.local/api/v1/client/daily-check-in", {
        method: "POST",
        body: JSON.stringify({ answers: { body_weight: 74.5, notes: "Good recovery." } })
      })
    );
    const payload = (await response.json()) as { data: { id: string; answers: { body_weight: number } } };

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("submission_daily_1");
    expect(payload.data.answers.body_weight).toBe(74.5);
    expect(mocks.prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          submittedByUserId: "user_client",
          answersJson: { body_weight: 74.5, notes: "Good recovery." }
        })
      })
    );
    expect(mocks.prisma.formAssignment.update).not.toHaveBeenCalled();
    expect(mocks.prisma.clientMeasurement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_sourceType_sourceId_metricKey: {
            organizationId: "org_1",
            sourceType: "form_submission",
            sourceId: "submission_daily_1",
            metricKey: "body_weight"
          }
        },
        create: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          sourceType: "form_submission",
          sourceId: "submission_daily_1",
          metricKey: "body_weight",
          metricValue: 74.5,
          unit: "kg",
          metadata: {
            fieldId: "body_weight",
            label: "Bodyweight"
          }
        }),
        update: expect.objectContaining({
          metricValue: 74.5,
          unit: "kg",
          metadata: {
            fieldId: "body_weight",
            label: "Bodyweight"
          }
        })
      })
    );
  });

  it("submits the signed-in client's weekly check-in and saves it for coach review", async () => {
    const photoAnswer = {
      byteSize: 11,
      contentType: "image/heic",
      fileName: "front-progress.heic",
      objectKey: "organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.heic",
      photoUrl: "r2://organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.heic"
    };
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(weeklyAssignmentRecord());
    mocks.prisma.formSubmission.create.mockResolvedValueOnce({
      id: "submission_weekly_1",
      formId: "form_weekly",
      formVersionId: "form_version_weekly",
      assignmentId: "assignment_weekly_1",
      clientId: "client_1",
      answersJson: { weekly_notes: "Good week overall.", progress_photo: photoAnswer },
      status: FormSubmissionStatus.SUBMITTED,
      submittedAt: now,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
      client: { firstName: "Client", lastName: "One" },
      form: { id: "form_weekly", name: "Weekly Review", type: FormType.CHECK_IN },
      formVersion: {
        id: "form_version_weekly",
        formId: "form_weekly",
        versionNumber: 1,
        schemaJson: weeklyAssignmentRecord().formVersion.schemaJson,
        uiJson: {},
        publishedAt: now,
        createdAt: now
      }
    });

    const response = await postDailyCheckIn(
      new Request("http://test.local/api/v1/client/daily-check-in?kind=weekly", {
        method: "POST",
        body: JSON.stringify({ answers: { weekly_notes: "Good week overall.", progress_photo: photoAnswer } })
      })
    );
    const payload = (await response.json()) as { data: { id: string; answers: { weekly_notes: string; progress_photo: typeof photoAnswer } } };

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("submission_weekly_1");
    expect(payload.data.answers.weekly_notes).toBe("Good week overall.");
    expect(payload.data.answers.progress_photo.photoUrl).toBe(photoAnswer.photoUrl);
    expect(mocks.prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          formId: "form_weekly",
          formVersionId: "form_version_weekly",
          assignmentId: "assignment_weekly_1",
          clientId: "client_1",
          answersJson: { weekly_notes: "Good week overall.", progress_photo: photoAnswer }
        })
      })
    );
    expect(mocks.prisma.formAssignment.update).not.toHaveBeenCalled();
    expect(mocks.prisma.checkIn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          formSubmissionId: "submission_weekly_1",
          type: "check-in",
          status: CheckInStatus.PENDING_REVIEW
        })
      })
    );
  });

  it("saves a weekly check-in even when the assigned form schema contains legacy fields", async () => {
    const legacyAssignment = weeklyAssignmentRecord();
    legacyAssignment.formVersion.schemaJson = {
      title: "Weekly Review",
      fields: [
        {
          id: "Progress photos",
          type: "file-upload",
          label: "Progress photos",
          required: true,
          exportPolicy: "private"
        },
        {
          id: "weekly_notes",
          type: "long-text",
          label: "Weekly notes",
          required: true,
          exportPolicy: "private"
        }
      ]
    };
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(legacyAssignment);
    mocks.prisma.formSubmission.create.mockResolvedValueOnce({
      id: "submission_weekly_legacy",
      formId: "form_weekly",
      formVersionId: "form_version_weekly",
      assignmentId: "assignment_weekly_1",
      clientId: "client_1",
      answersJson: { "Progress photos": "uploaded", weekly_notes: "Good week overall." },
      status: FormSubmissionStatus.SUBMITTED,
      submittedAt: now,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
      client: { firstName: "Client", lastName: "One" },
      form: { id: "form_weekly", name: "Weekly Review", type: FormType.CHECK_IN },
      formVersion: {
        id: "form_version_weekly",
        formId: "form_weekly",
        versionNumber: 1,
        schemaJson: legacyAssignment.formVersion.schemaJson,
        uiJson: {},
        publishedAt: now,
        createdAt: now
      }
    });

    const response = await postDailyCheckIn(
      new Request("http://test.local/api/v1/client/daily-check-in?kind=weekly", {
        method: "POST",
        body: JSON.stringify({ answers: { "Progress photos": "uploaded", weekly_notes: "Good week overall." } })
      })
    );
    const payload = (await response.json()) as { data: { id: string } };

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("submission_weekly_legacy");
    expect(mocks.prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          answersJson: { "Progress photos": "uploaded", weekly_notes: "Good week overall." }
        })
      })
    );
    expect(mocks.prisma.clientMeasurement.upsert).not.toHaveBeenCalled();
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

  it("stores a completed workout session and marks training completed for the client", async () => {
    mocks.prisma.clientActivityLog.findMany.mockResolvedValue([
      {
        id: "log_1",
        domain: ClientActivityLogDomain.TRAINING,
        logDate: new Date("2026-07-29T00:00:00.000Z"),
        status: ClientActivityLogStatus.COMPLETED,
        notes: "Strength Block / Lower A",
        createdAt: now,
        updatedAt: now
      }
    ]);

    const response = await postWorkoutSession(
      new Request("http://test.local/api/v1/client/workout-sessions", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: "assignment_1",
          assignmentName: "Strength Block",
          dayId: "day_lower_a",
          dayName: "Lower A",
          startedAt: "2026-07-29T08:00:00.000Z",
          durationSeconds: 1800,
          exercises: [
            {
              exerciseId: "exercise_leg_extension",
              exerciseName: "Seated Leg Extension",
              prescribedSets: "3",
              prescribedReps: "15-20",
              prescribedRpe: "9",
              prescribedRestSeconds: 120,
              sets: [
                { setNumber: 1, reps: "15", weightKg: 45, rpe: 9.5, completed: true }
              ]
            }
          ],
          personalBests: [
            { exerciseName: "Seated Leg Extension", setNumber: 1, weightKg: 45, previousBestKg: 40 }
          ]
        })
      })
    );
    const payload = (await response.json()) as { data: { session: { id: string; exercises: Array<{ exerciseName: string }> } } };

    expect(response.status).toBe(201);
    expect(payload.data.session.id).toBe("session_1");
    expect(payload.data.session.exercises[0].exerciseName).toBe("Seated Leg Extension");
    expect(mocks.prisma.clientWorkoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          assignmentName: "Strength Block",
          dayName: "Lower A",
          durationSeconds: 1800,
          exercisesJson: [
            expect.objectContaining({
              exerciseName: "Seated Leg Extension",
              prescribedRpe: "9",
              sets: [
                expect.objectContaining({
                  setNumber: 1,
                  reps: "15",
                  weightKg: 45,
                  rpe: 9.5,
                  completed: true
                })
              ]
            })
          ],
          personalBestsJson: [
            expect.objectContaining({
              exerciseName: "Seated Leg Extension",
              setNumber: 1,
              weightKg: 45,
              previousBestKg: 40
            })
          ]
        })
      })
    );
    expect(mocks.prisma.clientActivityLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          domain: ClientActivityLogDomain.TRAINING,
          status: ClientActivityLogStatus.COMPLETED,
          sourceType: "workout_session",
          sourceId: "session_1",
          notes: "Strength Block / Lower A"
        }),
        update: expect.objectContaining({
          status: ClientActivityLogStatus.COMPLETED,
          sourceType: "workout_session",
          sourceId: "session_1",
          notes: "Strength Block / Lower A"
        })
      })
    );
  });
});

function dailyAssignmentRecord() {
  return {
    id: "assignment_daily_1",
    organizationId: "org_1",
    formId: "form_daily",
    formVersionId: "form_version_daily",
    clientId: "client_1",
    status: FormAssignmentStatus.ASSIGNED,
    dueAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    client: { firstName: "Client", lastName: "One" },
    form: {
      id: "form_daily",
      name: "Daily Basics",
      type: FormType.HABIT_TRACKER
    },
    formVersion: {
      id: "form_version_daily",
      formId: "form_daily",
      versionNumber: 1,
      schemaJson: {
        title: "Daily Basics",
        fields: [
          {
            id: "body_weight",
            type: "number",
            label: "Bodyweight",
            required: true,
            metricKey: "body_weight",
            metricUnit: "kg",
            exportPolicy: "metric"
          },
          {
            id: "notes",
            type: "long-text",
            label: "Notes",
            required: false,
            exportPolicy: "private"
          }
        ]
      },
      uiJson: {},
      publishedAt: now,
      createdAt: now
    }
  };
}

function weeklyAssignmentRecord() {
  return {
    ...dailyAssignmentRecord(),
    id: "assignment_weekly_1",
    formId: "form_weekly",
    formVersionId: "form_version_weekly",
    form: {
      id: "form_weekly",
      name: "Weekly Review",
      type: FormType.CHECK_IN
    },
    formVersion: {
      ...dailyAssignmentRecord().formVersion,
      id: "form_version_weekly",
      formId: "form_weekly",
      schemaJson: {
        title: "Weekly Review",
        fields: [
          {
            id: "weekly_notes",
            type: "long-text",
            label: "Weekly notes",
            required: true,
            exportPolicy: "private"
          }
        ]
      }
    }
  };
}

function onboardingQuestionnaireDefinition() {
  return {
    title: "Initial Q&A",
    description: "Tell your coach what matters most.",
    fields: [
      {
        id: "goal",
        type: "long-text",
        label: "Primary goal",
        required: true,
        exportPolicy: "private"
      },
      {
        id: "starting_weight",
        type: "number",
        label: "Starting weight",
        required: false,
        metricKey: "starting_weight",
        metricUnit: "kg",
        exportPolicy: "metric"
      }
    ]
  };
}

function onboardingQuestionnaireAssignmentRecord() {
  return {
    id: "assignment_intake_1",
    organizationId: "org_1",
    formId: "form_intake",
    formVersionId: "form_version_intake",
    clientId: "client_1",
    status: FormAssignmentStatus.ASSIGNED,
    dueAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    client: { firstName: "Client", lastName: "One" },
    form: {
      id: "form_intake",
      name: "Initial Q&A",
      type: FormType.INTAKE
    },
    formVersion: {
      id: "form_version_intake",
      formId: "form_intake",
      versionNumber: 1,
      schemaJson: onboardingQuestionnaireDefinition(),
      uiJson: {},
      publishedAt: now,
      createdAt: now
    }
  };
}

function coachingPackageRecord() {
  return {
    id: "package_1",
    organizationId: "org_1",
    name: "Pro Coaching",
    description: null,
    priceAmount: 30000,
    currency: "aud",
    billingInterval: PackageBillingInterval.MONTHLY,
    customBillingIntervalCount: null,
    customBillingIntervalUnit: null,
    termWeeks: null,
    scheduledPriceAmount: null,
    scheduledPriceCurrency: null,
    scheduledPriceStartsAt: null,
    stripeProductId: "prod_1",
    stripePriceId: "price_1",
    status: PackageStatus.ACTIVE,
    featuresJson: [],
    color: null,
    createdByUserId: "user_1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}

function clientSubscriptionRecord() {
  return {
    id: "subscription_1",
    organizationId: "org_1",
    clientId: "client_1",
    packageId: "package_1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: null,
    stripeCheckoutSessionId: "cs_1",
    status: ClientSubscriptionStatus.INCOMPLETE,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAt: null,
    createdAt: now,
    updatedAt: now,
    client: { firstName: "Client", lastName: "One", email: "client@example.com" },
    coachingPackage: { name: "Pro Coaching", priceAmount: 30000, currency: "aud" }
  };
}

function workoutSessionRecord() {
  return {
    id: "session_1",
    organizationId: "org_1",
    clientId: "client_1",
    assignmentId: "assignment_1",
    assignmentName: "Strength Block",
    dayId: "day_lower_a",
    dayName: "Lower A",
    startedAt: new Date("2026-07-29T08:00:00.000Z"),
    completedAt: new Date("2026-07-29T08:30:00.000Z"),
    durationSeconds: 1800,
    exercisesJson: [
      {
        exerciseName: "Seated Leg Extension",
        prescribedRpe: "9",
        sets: [{ setNumber: 1, reps: "15", weightKg: 45, rpe: 9.5, completed: true }]
      }
    ],
    personalBestsJson: [
      { exerciseName: "Seated Leg Extension", setNumber: 1, weightKg: 45, previousBestKg: 40 }
    ],
    createdAt: now,
    updatedAt: now
  };
}
