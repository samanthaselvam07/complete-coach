import { describe, expect, it } from "vitest";

import {
  buildClientMigrationPlan,
  parseMigratedClientPayload
} from "@/lib/migrations/client-import-normalizer";
import { buildClinicalPhysiquesPayload, parseCsv } from "@/lib/migrations/clinical-physiques-importer";
import { buildLegacyCheckInFormSchema } from "@/lib/migrations/client-import-writer";

const samplePayload = {
  sourceSystem: "trial-export",
  client: {
    externalClientId: "trial-client-001",
    firstName: "Sample",
    lastName: "Client",
    email: "sample.client@example.com",
    status: "active",
    compliance: 82
  },
  profile: {
    dateOfBirth: "1994-05-14",
    goals: ["Improve strength"],
    waterTargetLitres: 2.5,
    stepTarget: 10000,
    trainingLogTargetDays: 4
  },
  notes: [{ noteDate: "2026-07-20", body: "Sample note." }],
  legacyCheckIns: [],
  goals: [{ title: "Complete first phase", targetDate: "2026-10-01", roadmapPhaseKey: "phase-1" }],
  roadmapPhases: [
    {
      key: "phase-1",
      name: "Foundation",
      startDate: "2026-08-01",
      endDate: "2026-10-24",
      items: [{ title: "Review metrics", type: "milestone", eventDate: "2026-08-08" }]
    }
  ],
  calendarEvents: [
    {
      title: "Weekly check-in",
      type: "check-in",
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      roadmapPhaseKey: "phase-1"
    }
  ],
  measurements: [
    {
      sourceType: "initial-questionnaire",
      sourceId: "trial-client-001-initial",
      measuredAt: "2026-08-01T08:00:00.000Z",
      metricKey: "bodyweight",
      metricValue: 72.4,
      unit: "kg"
    }
  ],
  activityLogs: [{ domain: "training", logDate: "2026-08-01", status: "completed" }],
  workoutSessions: [
    {
      assignmentName: "Foundation Training",
      dayName: "Lower 1",
      startedAt: "2026-08-01T07:00:00.000Z",
      completedAt: "2026-08-01T08:00:00.000Z",
      exercises: []
    }
  ]
};

describe("client migration import dry run", () => {
  it("builds a one-client migration plan from the extraction payload", () => {
    const plan = buildClientMigrationPlan({
      payload: samplePayload,
      organizationId: "local-dev-organization",
      actorUserId: "local-dev-user",
      mode: "dry-run"
    });

    expect(plan.externalClientId).toBe("trial-client-001");
    expect(plan.counts).toEqual({
      client: 1,
      profile: 1,
      notes: 1,
      legacyCheckIns: 0,
      goals: 1,
      roadmapPhases: 1,
      roadmapItems: 1,
      calendarEvents: 1,
      measurements: 1,
      activityLogs: 1,
      workoutSessions: 1
    });
    expect(plan.warnings).toEqual([]);
  });

  it("requires an external client id so repeated imports can be controlled", () => {
    expect(() =>
      parseMigratedClientPayload({
        client: {
          firstName: "Missing",
          lastName: "External Id"
        }
      })
    ).toThrow();
  });

  it("warns when goal or calendar event phase references cannot be resolved", () => {
    const plan = buildClientMigrationPlan({
      payload: {
        ...samplePayload,
        goals: [{ title: "Missing phase goal", targetDate: "2026-10-01", roadmapPhaseKey: "missing-phase" }],
        calendarEvents: [
          {
            title: "Missing phase event",
            type: "check-in",
            startDate: "2026-08-10",
            endDate: "2026-08-10",
            roadmapPhaseKey: "missing-phase"
          }
        ]
      },
      organizationId: "local-dev-organization",
      actorUserId: "local-dev-user",
      mode: "dry-run"
    });

    expect(plan.warnings).toEqual([
      'Goal "Missing phase goal" references missing roadmapPhaseKey "missing-phase".',
      'Calendar event "Missing phase event" references missing roadmapPhaseKey "missing-phase".'
    ]);
  });

  it("converts Clinical Physiques check-ins and measurements into the migration payload", () => {
    const payload = buildClinicalPhysiquesPayload({
      checkInsCsv:
        "Check-in #,Date,Check-in Day,Waist Circumference (cm),Fluids (L/day)\n1,2024-06-12,Wednesday,72.5,2.4\n",
      bodyweightWaistCsv: "Date,Bodyweight (kg),Waist Circumference (cm)\n2024-06-12,65.1,72.5\n",
      extractedAt: "2026-08-05T00:00:00.000Z",
      client: {
        externalClientId: "clinical-physiques-angie",
        firstName: "Angie",
        lastName: "Client"
      }
    });

    expect(payload.client.startDate).toBe("2024-06-12");
    expect(payload.client.latestCheckInAt).toBe("2024-06-12T00:00:00.000Z");
    expect(payload.legacyCheckIns).toHaveLength(1);
    expect(payload.legacyCheckIns[0]?.answers).toEqual({
      "Waist Circumference (cm)": 72.5,
      "Fluids (L/day)": 2.4
    });
    expect(payload.measurements).toHaveLength(3);
    expect(payload.measurements.map((measurement) => measurement.metricKey)).toEqual(["bodyweight", "waist", "waist"]);
    expect(payload.measurements.at(-1)).toMatchObject({
      sourceType: "clinical-physiques-check-in",
      metricKey: "waist",
      metricValue: 72.5,
      unit: "cm"
    });
  });

  it("parses quoted CSV cells", () => {
    expect(parseCsv('Name,Notes\n"Sample, Client","Line ""quoted"""\n')).toEqual([
      { Name: "Sample, Client", Notes: 'Line "quoted"' }
    ]);
  });

  it("builds a legacy check-in form schema from imported answer labels", () => {
    const payload = parseMigratedClientPayload({
      ...samplePayload,
      legacyCheckIns: [
        {
          sourceId: "legacy-1",
          submittedAt: "2026-08-01T00:00:00.000Z",
          answers: {
            "Waist Circumference (cm)": 72,
            "Fluids (L/day)": 2.5
          }
        },
        {
          sourceId: "legacy-2",
          submittedAt: "2026-08-08T00:00:00.000Z",
          answers: {
            "Fluids (L/day)": 2.7
          }
        }
      ]
    });

    expect(buildLegacyCheckInFormSchema(payload).fields).toEqual([
      {
        id: "Waist Circumference (cm)",
        label: "Waist Circumference (cm)",
        type: "short-text",
        required: false
      },
      {
        id: "Fluids (L/day)",
        label: "Fluids (L/day)",
        type: "short-text",
        required: false
      }
    ]);
  });
});
