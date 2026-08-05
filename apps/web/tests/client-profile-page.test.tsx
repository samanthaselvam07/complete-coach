import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientNotesPage } from "@/components/clients/client-notes-page";
import {
  createProgressChartSeries,
  normalizeProgressMetricRecord
} from "@/components/clients/client-profile-dashboard";
import {
  ClientProfilePage,
  createNutritionPlansFromAssignments,
  createTrainingProgramsFromAssignments
} from "@/components/clients/client-profile-page";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push
  })
}));

const marcusClient = {
  id: "1",
  name: "Marcus Rodriguez",
  email: "marcus@example.com",
  phone: "+61 400 000 111",
  packageId: "package_elite",
  packageName: "Elite Performance",
  compliance: 96,
  checkInDay: "Monday",
  latestCheckIn: "Apr 18, 2026",
  status: "active",
  startDate: "Jan 15, 2026",
  timezone: "Australia/Melbourne",
  initials: "MR",
  avatarColor: "bg-indigo-600"
};

const marcusCheckIns = [
  {
    id: "week-24",
    clientId: "1",
    name: "Marcus Rodriguez",
    submittedAt: "2026-04-18T08:24:00.000Z",
    dueAt: "2026-04-18T08:12:00.000Z",
    status: "completed",
    summary: "Hit new squat PR at 120kg.",
    coachNotes: "Cravings for sugar mid-afternoon."
  },
  {
    id: "week-23",
    clientId: "1",
    name: "Marcus Rodriguez",
    submittedAt: "2026-04-11T08:24:00.000Z",
    dueAt: "2026-04-11T08:12:00.000Z",
    status: "completed",
    summary: "Still managed to get 3 workouts in.",
    coachNotes: "Work stress affecting sleep."
  }
];

const marcusNotes = [
  {
    id: "note_1",
    clientId: "1",
    noteDate: "2026-07-22",
    body: "Sleep was more stable after the earlier bedtime change.",
    authorName: "Sam Coach",
    createdAt: "2026-07-22T05:00:00.000Z"
  },
  {
    id: "note_2",
    clientId: "1",
    noteDate: "2026-07-15",
    body: "Added a walking target for recovery days.",
    authorName: "Sam Coach",
    createdAt: "2026-07-15T05:00:00.000Z"
  }
];

const marcusWorkoutNotes = [
  {
    id: "workout_note_1",
    clientId: "1",
    noteDate: "2026-07-22",
    body: "Workout note: Strength Foundation / Day 1 / Back Squat\n\nFelt strong today, but left knee felt tight on the final set.",
    authorName: "Marcus Rodriguez",
    createdAt: "2026-07-22T06:00:00.000Z"
  }
];

const marcusWeightSummary = {
  startingWeight: {
    measuredAt: "2026-05-01T00:00:00.000Z",
    metricValue: 84.2,
    unit: "kg"
  },
  currentWeight: {
    measuredAt: "2026-07-22T00:00:00.000Z",
    metricValue: 81.7,
    unit: "kg"
  }
};

const marcusProgressMetrics = [
  {
    id: "metric_weight_1",
    clientId: "1",
    sourceType: "form_submission",
    sourceId: "submission_1",
    measuredAt: "2026-07-01T00:00:00.000Z",
    metricKey: "body_weight",
    metricValue: 82.6,
    unit: "kg",
    metadata: { fieldId: "body-weight", label: "Body weight" }
  },
  {
    id: "metric_weight_2",
    clientId: "1",
    sourceType: "form_submission",
    sourceId: "submission_2",
    measuredAt: "2026-07-22T00:00:00.000Z",
    metricKey: "body_weight",
    metricValue: 81.7,
    unit: "kg",
    metadata: { fieldId: "body-weight", label: "Body weight" }
  },
  {
    id: "metric_steps_1",
    clientId: "1",
    sourceType: "form_submission",
    sourceId: "submission_2",
    measuredAt: "2026-07-22T00:00:00.000Z",
    metricKey: "steps",
    metricValue: 9800,
    unit: null,
    metadata: { fieldId: "habit-steps", label: "Steps" }
  },
  {
    id: "metric_sleep_1",
    clientId: "1",
    sourceType: "form_submission",
    sourceId: "submission_2",
    measuredAt: "2026-07-22T00:00:00.000Z",
    metricKey: "sleep_quality",
    metricValue: 8,
    unit: "score",
    metadata: { fieldId: "habit-sleep-quality", label: "Sleep quality last night" }
  }
];

const marcusTrainingAssignments = [
  {
    id: "training_assignment_1",
    clientId: "1",
    clientName: "Marcus Rodriguez",
    templateId: "training_template_1",
    name: "Strength Foundation",
    status: "active",
    startsOn: "2026-07-01",
    endsOn: "2026-08-26",
    snapshot: {
      templateId: "training_template_1",
      templateName: "Strength Foundation",
      goal: "strength",
      durationWeeks: 8,
      template: {
        days: [
          {
            name: "Day 1",
            exercises: [
              { exerciseId: "ex_1", exerciseName: "Back Squat", sets: 4, reps: "6", section: "workout" },
              { exerciseId: "ex_2", exerciseName: "Romanian Deadlift", sets: 3, reps: "8", section: "workout", notes: "Tempo controlled" }
            ]
          },
          {
            name: "Day 2",
            exercises: [{ exerciseId: "ex_3", exerciseName: "Bench Press", sets: 4, reps: "6", section: "workout" }]
          }
        ],
        instructions: "Progress load weekly."
      }
    }
  },
  {
    id: "training_assignment_2",
    clientId: "1",
    clientName: "Marcus Rodriguez",
    templateId: "training_template_2",
    name: "Conditioning Reset",
    status: "paused",
    startsOn: "2026-06-01",
    endsOn: null,
    snapshot: {
      templateId: "training_template_2",
      templateName: "Conditioning Reset",
      goal: "conditioning",
      durationWeeks: 4,
      template: {
        days: [
          {
            name: "Conditioning Day",
            exercises: [{ exerciseId: "ex_4", exerciseName: "Bike Intervals", sets: 5, reps: "60 sec", section: "workout" }]
          }
        ],
        instructions: "Keep conditioning aerobic and repeatable."
      }
    }
  }
];

const marcusMealPlanAssignments = [
  {
    id: "meal_assignment_1",
    clientId: "1",
    clientName: "Marcus Rodriguez",
    templateId: "meal_template_1",
    name: "Hypertrophy Fuel",
    phase: "Build",
    status: "active",
    targetCalories: 2500,
    proteinGrams: 180,
    carbsGrams: 300,
    fatGrams: 70,
    startsOn: "2026-07-01",
    endsOn: null,
    snapshot: {
      templateId: "meal_template_1",
      templateName: "Hypertrophy Fuel",
      phase: "Build",
      targetCalories: 2500,
      proteinGrams: 180,
      carbsGrams: 300,
      fatGrams: 70,
      template: {
        days: [
          {
            name: "Training Day",
            meals: [
              {
                meal: "Breakfast",
                foods: [{ foodName: "Oats", servingSize: "80g", calories: 300, proteinGrams: 10, carbsGrams: 50, fatGrams: 6 }]
              },
              {
                meal: "Post Workout",
                foods: [{ foodName: "Chicken Rice Bowl", servingSize: "1 bowl", calories: 620, proteinGrams: 45, carbsGrams: 75, fatGrams: 14 }]
              }
            ]
          },
          {
            name: "Rest Day",
            meals: [
              {
                meal: "Lunch",
                foods: [{ foodName: "Salmon Salad", servingSize: "1 plate", calories: 520, proteinGrams: 38, carbsGrams: 30, fatGrams: 24 }]
              }
            ]
          }
        ]
      }
    }
  },
  {
    id: "meal_assignment_2",
    clientId: "1",
    clientName: "Marcus Rodriguez",
    templateId: "meal_template_2",
    name: "Rest Day Fuel",
    phase: "Maintenance",
    status: "paused",
    targetCalories: 2100,
    proteinGrams: 165,
    carbsGrams: 220,
    fatGrams: 65,
    startsOn: "2026-06-01",
    endsOn: null,
    snapshot: {
      templateId: "meal_template_2",
      templateName: "Rest Day Fuel",
      phase: "Maintenance",
      targetCalories: 2100,
      proteinGrams: 165,
      carbsGrams: 220,
      fatGrams: 65,
      template: {
        days: [
          {
            name: "Low Day",
            meals: [
              {
                meal: "Breakfast",
                foods: [{ foodName: "Greek Yogurt", servingSize: "250g", calories: 180, proteinGrams: 28, carbsGrams: 12, fatGrams: 3 }]
              }
            ]
          }
        ]
      }
    }
  }
];

const marcusSupplementAssignments = [
  {
    id: "supplement_assignment_1",
    clientId: "1",
    clientName: "Marcus Rodriguez",
    templateId: "supplement_template_1",
    name: "Sleep Support",
    status: "active",
    startsOn: "2026-07-01",
    endsOn: null,
    snapshot: {
      templateId: "supplement_template_1",
      templateName: "Sleep Support",
      description: "Sleep and recovery support.",
      template: {
        phases: [
          {
            name: "Night Routine",
            supplements: [
              {
                supplementId: "supp_1",
                supplementName: "Magnesium Glycinate",
                dosage: "300mg",
                timing: "Evening",
                notes: "Take with dinner.\nSupplement link: https://completecoach.fit/magnesium"
              }
            ]
          }
        ]
      }
    }
  }
];

const marcusRoadmapPhases = [
  {
    id: "phase_completed",
    name: "Foundation",
    startDate: "2026-01-01",
    endDate: "2026-02-28",
    status: "completed",
    items: []
  },
  {
    id: "phase_active",
    name: "Hypertrophy II",
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    status: "active",
    items: [
      {
        id: "roadmap_item_review",
        phaseId: "phase_active",
        title: "Phase review",
        type: "event",
        date: "2026-08-14",
        notes: "Review adherence, recovery, and progression."
      }
    ]
  },
  {
    id: "phase_planned",
    name: "Performance",
    startDate: "2026-09-01",
    endDate: "2026-10-31",
    status: "planned",
    items: []
  }
];

interface CalendarEventFixture {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  time: string;
  recurring: boolean;
  recurrenceCount: string;
  recurrenceEndsOn: string;
  recurrenceDays: string[];
  goal: string;
  notes: string;
  meetingUrl: string;
  roadmapPhaseId: string;
  scheduledTrainingProgramId: string;
  scheduledTrainingProgramName: string;
  scheduledTrainingDayName: string;
}

function mockMarcusProfile(
  initialCalendarEvents: CalendarEventFixture[] = [],
  options: { profileGoals?: string[] } = {}
) {
  let calendarEventCounter = 0;
  let calendarEvents = [...initialCalendarEvents];
  const profileGoals = options.profileGoals ?? ["Hypertrophy II"];

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url === "/api/v1/clients/1") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusClient }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/profile") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              bio: "Persisted Marcus coaching profile.",
              goals: profileGoals,
              dateOfBirth: "1994-05-14T00:00:00.000Z",
              waterTargetLitres: 3,
              stepTarget: 10000
            }
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/check-ins?clientId=1&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusCheckIns }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/notes?limit=3") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusNotes }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/notes?limit=10&search=Workout+note%3A+Strength+Foundation+%2F+Day+1") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusWorkoutNotes }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/workout-sessions?assignmentName=Strength+Foundation&dayName=Day+1&limit=12") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "session_1",
                assignmentName: "Strength Foundation",
                dayName: "Day 1",
                startedAt: "2026-07-29T08:00:00.000Z",
                completedAt: "2026-07-29T08:45:00.000Z",
                durationSeconds: 2700,
                exercises: [
                  {
                    exerciseName: "Back Squat",
                    prescribedSets: "4",
                    prescribedReps: "6",
                    prescribedRestSeconds: 180,
                    sets: [
                      { setNumber: 1, reps: "6", weightKg: 100, completed: true },
                      { setNumber: 2, reps: "6", weightKg: 105, completed: true }
                    ]
                  }
                ],
                personalBests: [
                  { exerciseName: "Back Squat", setNumber: 2, weightKg: 105, previousBestKg: 100 }
                ]
              }
            ]
          }),
          { status: 200 }
        )
      );
    }

    if (url.startsWith("/api/v1/clients/1/workout-sessions?")) {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/metrics?summary=weight") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusWeightSummary }), { status: 200 }));
    }

    if (url === "/api/v1/form-submissions?clientId=1&limit=100") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "submission_initial_qa",
                formName: "Initial Q&A",
                formType: "intake",
                submittedAt: "2026-01-15T00:00:00.000Z",
                answers: {
                  "starting-weight": "84.2",
                  goal: "Build muscle while improving conditioning",
                  "training-history": "Three years consistent lifting"
                }
              },
              {
                id: "submission_photos",
                formName: "Weekly Check-In",
                formType: "check-in",
                submittedAt: "2026-07-22T00:00:00.000Z",
                answers: {
                  progressPhotos: [
                    { url: "https://cdn.completecoach.fit/photos/front.jpg" },
                    { url: "https://cdn.completecoach.fit/photos/side.jpg" }
                  ]
                }
              }
            ]
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/clients/1/metrics?limit=200") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusProgressMetrics }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/logs?days=7") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              logs: [],
              summary: {
                dateFrom: "2026-07-24",
                dateTo: "2026-07-30",
                days: 7,
                completedLogs: 0,
                possibleLogs: 21,
                complianceScore: 0,
                byDomain: [
                  { domain: "training", completedLogs: 0, possibleLogs: 7, complianceScore: 0 },
                  { domain: "nutrition", completedLogs: 0, possibleLogs: 7, complianceScore: 0 },
                  { domain: "supplementation", completedLogs: 0, possibleLogs: 7, complianceScore: 0 }
                ]
              }
            }
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/clients/1/logs" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { domain: string; logDate: string; status: string; notes?: string };

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              log: {
                id: "log_saved",
                domain: body.domain,
                logDate: body.logDate,
                status: body.status,
                notes: body.notes ?? null
              },
              summary: {
                dateFrom: "2026-07-24",
                dateTo: "2026-07-30",
                days: 7,
                completedLogs: 1,
                possibleLogs: 21,
                complianceScore: 5,
                byDomain: [
                  { domain: "training", completedLogs: 1, possibleLogs: 7, complianceScore: 14 },
                  { domain: "nutrition", completedLogs: 0, possibleLogs: 7, complianceScore: 0 },
                  { domain: "supplementation", completedLogs: 0, possibleLogs: 7, complianceScore: 0 }
                ]
              }
            }
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/clients/1/goals" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { title: string; targetDate: string; notes: string; roadmapPhaseId: string | null };

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: "goal_created",
              title: body.title,
              targetDate: body.targetDate,
              notes: body.notes,
              roadmapPhaseId: body.roadmapPhaseId,
              roadmapPhaseName: "Hypertrophy II",
              daysRemaining: 14
            }
          }),
          { status: 201 }
        )
      );
    }

    if (url === "/api/v1/clients/1/goals?limit=20") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/activity?limit=6") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/training-programs") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusTrainingAssignments }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/meal-plans") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusMealPlanAssignments }), { status: 200 }));
    }

    if (url === "/api/v1/supplement-plan-assignments?clientId=1&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusSupplementAssignments }), { status: 200 }));
    }

    if (url === "/api/v1/forms?status=published&limit=100") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              { id: "form_initial_qa", name: "Initial Q&A Form", type: "intake" },
              { id: "form_daily_habits", name: "Daily Habit Form", type: "habit-tracker" },
              { id: "form_check_in", name: "Weekly Check-In Form", type: "check-in" }
            ]
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/supplement-plan-templates/supplement_template_1") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: "supplement_template_1",
              name: "Sleep Support",
              description: "Sleep and recovery support.",
              status: "published",
              template: marcusSupplementAssignments[0].snapshot.template
            }
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/packages?status=active&limit=100") {
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: "package_elite", name: "Elite Performance", currency: "aud" }] }), { status: 200 })
      );
    }

    if (url === "/api/v1/forms?type=intake&status=published&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "form_initial_qa", name: "Initial Q&A Form" }] }), { status: 200 }));
    }

    if (url === "/api/v1/forms?type=application&status=published&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/forms?type=contact&status=published&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/forms?type=terms-and-conditions&status=published&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/forms?type=habit-tracker&status=published&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "form_daily_habits", name: "Daily Habit Form" }] }), { status: 200 }));
    }

    if (url === "/api/v1/forms?type=check-in&status=published&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "form_check_in", name: "Weekly Check-In Form" }] }), { status: 200 }));
    }

    if (url === "/api/v1/form-assignments?clientId=1&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/training-program-assignments?clientId=1&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/meal-plan-assignments?clientId=1&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/training-program-templates?limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/meal-plan-templates?limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/supplement-plan-templates?limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/supplements?limit=20") {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/roadmap" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        kind: "phase" | "item";
        name?: string;
        title?: string;
        phaseId?: string;
        type?: string;
        date?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        notes?: string;
      };

      if (body.kind === "phase") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "phase_created",
                name: body.name,
                startDate: body.startDate,
                endDate: body.endDate,
                status: body.status ?? "planned",
                items: []
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: "roadmap_item_created",
              phaseId: body.phaseId,
              title: body.title,
              type: body.type,
              date: body.date,
              notes: body.notes
            }
          }),
          { status: 201 }
        )
      );
    }

    if (url === "/api/v1/clients/1/roadmap") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusRoadmapPhases }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/calendar-events" && !init?.method) {
      return Promise.resolve(new Response(JSON.stringify({ data: calendarEvents }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/calendar-events" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as (typeof calendarEvents)[number];
      const event = {
        ...body,
        id: `calendar_event_created_${calendarEventCounter++}`,
        endDate: body.endDate || body.startDate
      };
      calendarEvents = [...calendarEvents, event];

      return Promise.resolve(new Response(JSON.stringify({ data: event }), { status: 201 }));
    }

    if (url.startsWith("/api/v1/clients/1/calendar-events?eventId=") && init?.method === "PATCH") {
      const eventId = new URL(`http://test.local${url}`).searchParams.get("eventId");
      const body = JSON.parse(String(init.body)) as (typeof calendarEvents)[number];
      const event = {
        ...body,
        id: eventId ?? "calendar_event_updated",
        endDate: body.endDate || body.startDate
      };
      calendarEvents = calendarEvents.map((currentEvent) => (currentEvent.id === event.id ? event : currentEvent));

      return Promise.resolve(new Response(JSON.stringify({ data: event }), { status: 200 }));
    }

    if (url.startsWith("/api/v1/clients/1/calendar-events?eventId=") && init?.method === "DELETE") {
      const eventId = new URL(`http://test.local${url}`).searchParams.get("eventId");
      calendarEvents = calendarEvents.filter((event) => event.id !== eventId);

      return Promise.resolve(new Response(JSON.stringify({ data: { id: eventId, deleted: true } }), { status: 200 }));
    }

    if (url === "/api/v1/clients/1/notes") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: "note_3",
              clientId: "1",
              noteDate: "2026-07-22",
              body: "New note about nutrition consistency.",
              authorName: "Sam Coach",
              createdAt: "2026-07-22T06:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      );
    }

    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });
}

function getTestDateValueInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "08";
  const day = parts.find((part) => part.type === "day")?.value ?? "05";

  return `${year}-${month}-${day}`;
}

function getTestWeeksSince(startDate: string) {
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / millisecondsPerWeek));
}

async function searchAndSelectPlan(label: string, query: string, optionName: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: query } });
  fireEvent.click(await screen.findByLabelText(optionName));
}

describe("ClientProfilePage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    navigationMocks.push.mockReset();
  });

  it("renders a client profile by id", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" })).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy II")).toBeInTheDocument();
    expect(screen.getByText("Elite Performance")).toBeInTheDocument();
    expect(screen.getByText("Starting Weight")).toBeInTheDocument();
    expect(screen.getByText("Current Weight")).toBeInTheDocument();
    expect(screen.getByText("84.2")).toBeInTheDocument();
    expect(screen.getByText("81.7")).toBeInTheDocument();
    expect(screen.getByText(`${getTestWeeksSince("Jan 15, 2026")}`)).toBeInTheDocument();
    expect(screen.getByText("Born 1994")).toBeInTheDocument();
    expect(screen.getByText("initial Q&A - May 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("latest daily habit entry - Jul 22, 2026")).toBeInTheDocument();
    expect(screen.queryByText("Daily Habit Streak")).not.toBeInTheDocument();
    expect(screen.queryByText("Recovery Score")).not.toBeInTheDocument();
  });

  it("renders the updated Figma client dashboard surface", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(await screen.findByText("Active Phase: Hypertrophy II")).toBeInTheDocument();
    expect(screen.getByText("Assigned Check-In: Every Monday")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Trellis" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Message" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open client messages" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open progress analytics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add client note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set water target" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set step target" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Protocol" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit client" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Daily Check-Ins" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Roadmap" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Progress Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Weekly Check-In History")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByText("Goals & Countdowns")).toBeInTheDocument();
    expect(screen.getByText("Notes Timeline")).toBeInTheDocument();
    expect(screen.getByText("Sleep was more stable after the earlier bedtime change.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/clients/1/notes");
    expect(screen.getByText("Account Activity Log")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Progress analytics chart" })).toBeInTheDocument();
    const bodyweightPoint = document.querySelector('circle[data-metric-key="body_weight"]');
    expect(bodyweightPoint).toHaveAttribute("data-x", "2026-07-01T00:00:00.000Z");
    expect(bodyweightPoint).toHaveAttribute("data-y", "82.6");
    expect(screen.getByRole("button", { name: "Metrics (1)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Metrics (1)" }));
    expect(screen.getByRole("menuitemcheckbox", { name: /Bodyweight/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: /Steps/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: /Sleep quality last night/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Steps/i }));
    expect(screen.getByRole("button", { name: "Metrics (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
    expect(screen.getByText("No persisted goals or countdowns are available for this client yet.")).toBeInTheDocument();
    expect(screen.getByText("No persisted activity events are available for this client yet.")).toBeInTheDocument();
  });

  it("uses the client's active roadmap phase in the profile header instead of the saved goal", async () => {
    mockMarcusProfile([], { profileGoals: ["Body recomposition"] });
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(await screen.findByText("Active Phase: Hypertrophy II")).toBeInTheDocument();
    expect(screen.queryByText("Active Phase: Body recomposition")).not.toBeInTheDocument();
  });

  it("adds a client goal and renders it as a countdown", async () => {
    const fetchMock = mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Goal" }));
    fireEvent.change(await screen.findByLabelText("Goal"), { target: { value: "Stage photos" } });
    fireEvent.change(screen.getByLabelText("Target date"), { target: { value: "2026-08-14" } });
    fireEvent.change(screen.getByLabelText("Roadmap phase"), { target: { value: "phase_active" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Final check before shoot." } });
    fireEvent.click(screen.getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("Stage photos")).toBeInTheDocument();
    expect(screen.getByText("14d")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/1/goals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Stage photos",
          targetDate: "2026-08-14",
          notes: "Final check before shoot.",
          roadmapPhaseId: "phase_active"
        })
      })
    );
  });

  it("shows assigned training nutrition and supplement plans once with day rows and embedded builders", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });

    fireEvent.click(screen.getByRole("tab", { name: "Training" }));
    expect(screen.getByRole("heading", { name: "Strength Foundation" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Strength Foundation" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Copy Strength Foundation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to Strength Foundation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Strength Foundation/i })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Strength Foundation exercises" })).toBeInTheDocument();
    expect(screen.getByText("Back Squat")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Workout Notes" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Completed Workouts" })).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("Best 105kg x 6 reps")).toBeInTheDocument();
    expect(screen.getAllByText("Back Squat").length).toBeGreaterThan(1);
    expect(screen.getByText("Felt strong today, but left knee felt tight on the final set.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch training program" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Conditioning Reset/i }));
    expect(screen.getByRole("heading", { name: "Conditioning Reset" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Conditioning Reset exercises" })).toBeInTheDocument();
    expect(screen.getByText("Bike Intervals")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch training program" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Strength Foundation/i }));
    fireEvent.click(screen.getByRole("button", { name: "Day 2" }));
    const activeExerciseTable = screen.getByRole("table", { name: "Strength Foundation exercises" });
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(within(activeExerciseTable).queryByText("Back Squat")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit training program" }));
    expect(screen.getByLabelText(/Program Title/i)).toHaveValue("Strength Foundation");

    fireEvent.click(screen.getByRole("tab", { name: "Nutrition" }));
    expect(screen.getByRole("heading", { name: "Hypertrophy Fuel" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Hypertrophy Fuel" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Copy Hypertrophy Fuel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to Hypertrophy Fuel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Hypertrophy Fuel/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nutrition plan nutrient breakdown")).toBeInTheDocument();
    expect(screen.getByText("920 / 2500")).toBeInTheDocument();
    expect(screen.getByText("55 / 180")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Hypertrophy Fuel meals" })).toBeInTheDocument();
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch nutrition plan" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Rest Day Fuel/i }));
    expect(screen.getByRole("heading", { name: "Rest Day Fuel" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Rest Day Fuel meals" })).toBeInTheDocument();
    expect(screen.getByText("Greek Yogurt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch nutrition plan" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Hypertrophy Fuel/i }));
    fireEvent.click(screen.getByRole("button", { name: "Rest Day" }));
    expect(screen.getByText("Salmon Salad")).toBeInTheDocument();
    expect(screen.getByText("1 plate")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit nutrition plan" }));
    expect(screen.getByLabelText("Nutrition plan title")).toHaveValue("Hypertrophy Fuel");

    fireEvent.click(screen.getByRole("tab", { name: "Supplementation" }));
    expect(screen.getByRole("heading", { name: "Sleep Support" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Sleep Support" })).toHaveLength(1);
    expect(screen.getByRole("table", { name: "Sleep Support supplements" })).toBeInTheDocument();
    expect(screen.getByText("Magnesium Glycinate")).toBeInTheDocument();
    expect(screen.getByText("Take with dinner.")).toBeInTheDocument();
    expect(screen.queryByText(/Supplement link:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buy supplement" })).toHaveAttribute("href", "https://completecoach.fit/magnesium");
    fireEvent.click(screen.getByRole("button", { name: "Edit supplement protocol" }));
    expect(await screen.findByRole("heading", { name: "Edit Supplement Protocol" })).toBeInTheDocument();
  });

  it("renders a 14 day dashboard calendar with colored event legend and event creation fields", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });

    expect(screen.getByRole("grid", { name: "14 day client calendar" })).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell", { name: /Create event on/i })).toHaveLength(14);
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("Cardio")).toBeInTheDocument();
    expect(screen.getByText("Rest")).toBeInTheDocument();
    expect(screen.getByText("Face-to-face")).toBeInTheDocument();
    expect(screen.getByText("Video call")).toBeInTheDocument();
    expect(screen.getByText("Phone call")).toBeInTheDocument();
    expect(screen.getByText("Phase")).toBeInTheDocument();
    expect(screen.getByText("Milestone")).toBeInTheDocument();
    expect(screen.getByText(/14-day client schedule/i)).toHaveTextContent(/\| [A-Z][a-z]{2} \d{1,2} - [A-Z][a-z]{2} \d{1,2}, \d{4}/);
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous calendar period" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next calendar period" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));

    expect(await screen.findByRole("dialog", { name: "Create Event" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();
    expect(screen.getByLabelText("End date")).toBeInTheDocument();
    expect(screen.getByLabelText("All day event")).toBeChecked();
    expect(screen.getByLabelText("Recurring event")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Roadmap phase" })).toHaveValue("");

    fireEvent.click(screen.getByLabelText("Recurring event"));

    expect(screen.getByLabelText("Number of recurrences")).toBeInTheDocument();
    expect(screen.getByLabelText("Recurring finishes on")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monday" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Associated goal" })).toHaveValue("Hypertrophy II");
  });

  it("loads persisted calendar events into the client profile calendar", async () => {
    const today = getTestDateValueInTimeZone(marcusClient.timezone);

    mockMarcusProfile([
      {
        id: "calendar_event_persisted",
        title: "Persisted strength session",
        type: "strength",
        startDate: today,
        endDate: today,
        allDay: true,
        time: "",
        recurring: false,
        recurrenceCount: "",
        recurrenceEndsOn: "",
        recurrenceDays: [],
        goal: "Hypertrophy II",
        notes: "Loaded from the client calendar endpoint.",
        meetingUrl: "",
        roadmapPhaseId: "",
        scheduledTrainingProgramId: "training_assignment_1",
        scheduledTrainingProgramName: "Strength Foundation",
        scheduledTrainingDayName: "Day 1"
      }
    ]);
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });

    expect(await screen.findByRole("button", { name: "Open event Persisted strength session" })).toBeInTheDocument();
  });

  it("moves the dashboard calendar date range with left and right controls", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    const scheduleLabel = screen.getByText(/14-day client schedule/i);
    const initialRange = scheduleLabel.textContent;

    fireEvent.click(screen.getByRole("button", { name: "Next calendar period" }));

    expect(scheduleLabel.textContent).not.toBe(initialRange);

    fireEvent.click(screen.getByRole("button", { name: "Previous calendar period" }));

    expect(scheduleLabel.textContent).toBe(initialRange);
  });

  it("opens a ranged event draft when dragging across calendar dates", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    const cells = screen.getAllByRole("gridcell", { name: /Create event on/i });

    fireEvent.mouseDown(cells[1]);
    fireEvent.mouseUp(cells[4]);

    expect(await screen.findByRole("dialog", { name: "Create Event" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).not.toHaveValue("");
    expect(screen.getByLabelText("End date")).not.toHaveValue("");
  });

  it("clears the calendar date range highlight after range selection ends", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    const cells = screen.getAllByRole("gridcell", { name: /Create event on/i });

    fireEvent.mouseDown(cells[1]);
    fireEvent.mouseEnter(cells[2], { buttons: 1 });

    expect(cells[2]).toHaveClass("ring-2");

    fireEvent.mouseUp(cells[4]);

    expect(await screen.findByRole("dialog", { name: "Create Event" })).toBeInTheDocument();
    expect(cells[2]).not.toHaveClass("ring-2");
    expect(cells[2]).not.toHaveClass("ring-indigo-300");
  });

  it("opens dashboard calendar event details", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));
    fireEvent.change(await screen.findByLabelText("Event title"), { target: { value: "Training block" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Event type" }), { target: { value: "strength" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open event Training block" }));

    expect(await screen.findByRole("dialog", { name: "Event Details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Event title")).toHaveValue("Training block");
    expect(screen.getByRole("combobox", { name: "Event type" })).toHaveValue("strength");
    expect(screen.getByRole("button", { name: "Update event" })).toBeInTheDocument();
  });

  it("schedules a strength calendar event from an assigned training program", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));

    expect(await screen.findByRole("combobox", { name: "Training program" })).toHaveValue("training_assignment_1");
    expect(screen.getByRole("combobox", { name: "Workout day" })).toHaveValue("Day 1");

    fireEvent.change(screen.getByRole("combobox", { name: "Workout day" }), { target: { value: "Day 2" } });

    expect(screen.getByLabelText("Event title")).toHaveValue("Strength: Day 2");
    expect(screen.getByText("Strength Foundation / Day 2 will be scheduled for this client.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open event Strength: Day 2" }));

    expect(await screen.findByRole("dialog", { name: "Event Details" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Training program" })).toHaveValue("training_assignment_1");
    expect(screen.getByRole("combobox", { name: "Workout day" })).toHaveValue("Day 2");
  });

  it("deletes a calendar event only after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));
    fireEvent.change(await screen.findByLabelText("Event title"), { target: { value: "Technique review" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));

    fireEvent.click(await screen.findByRole("button", { name: "Open event Technique review" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete event" }));

    expect(confirmSpy).toHaveBeenCalledWith("Delete Technique review? This calendar event will be removed from the client schedule.");
    expect(screen.getByRole("dialog", { name: "Event Details" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Event Details" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Open event Technique review" })).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("saves notes directly to a calendar event", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));
    fireEvent.change(await screen.findByLabelText("Event title"), { target: { value: "Technique review" } });
    fireEvent.change(screen.getByLabelText("Event notes"), { target: { value: "Review squat bar path and warm-up pacing." } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));

    fireEvent.click(await screen.findByRole("button", { name: "Open event Technique review" }));

    expect(await screen.findByRole("dialog", { name: "Event Details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Event notes")).toHaveValue("Review squat bar path and warm-up pacing.");
  });

  it("saves a client-accessible meeting URL for video call calendar events", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));

    expect(screen.queryByLabelText("Meeting URL")).not.toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("Event title"), { target: { value: "Client review call" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Event type" }), { target: { value: "video-call" } });
    fireEvent.change(screen.getByLabelText("Meeting URL"), { target: { value: "https://meet.example.com/client-review" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));

    fireEvent.click(await screen.findByRole("button", { name: "Open event Client review call" }));

    expect(await screen.findByRole("dialog", { name: "Event Details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Meeting URL")).toHaveValue("https://meet.example.com/client-review");
    expect(screen.getByText("This link is visible to the client for video call events.")).toBeInTheDocument();
  });

  it("saves a roadmap phase link directly to a calendar event", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));
    fireEvent.change(await screen.findByLabelText("Event title"), { target: { value: "Phase check-in" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Roadmap phase" }), { target: { value: "phase_active" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));

    fireEvent.click(await screen.findByRole("button", { name: "Open event Phase check-in" }));

    expect(await screen.findByRole("dialog", { name: "Event Details" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Roadmap phase" })).toHaveValue("phase_active");
  });

  it("shows a full calendar tab between supplementation and check-ins", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);

    expect(tabs).toEqual(["Dashboard", "Initial Q&A", "Photos", "Daily Check-Ins", "Check-Ins", "Training", "Nutrition", "Supplementation", "Roadmap", "Calendar", "Logs"]);
    expect(screen.getByRole("tab", { name: "Supplementation" })).toHaveClass("text-xs", "px-3", "py-2");

    fireEvent.click(screen.getByRole("tab", { name: "Calendar" }));

    expect(screen.getByRole("tabpanel", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Full client calendar" })).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell", { name: /Create event on/i })).toHaveLength(42);
  });

  it("renders submitted initial Q&A and progress photos in dedicated tabs", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Initial Q&A" }));
    const initialQuestionnairePanel = screen.getByRole("tabpanel", { name: "Initial Q&A" });

    expect(initialQuestionnairePanel).toHaveTextContent("Initial Q&A - submitted Jan 15, 2026");
    expect(within(initialQuestionnairePanel).getByText("Starting Weight")).toBeInTheDocument();
    expect(within(initialQuestionnairePanel).getByText("Build muscle while improving conditioning")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Photos" }));

    expect(screen.getByRole("tabpanel", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Left photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Right photo")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Weekly Check-In.*submitted Jul 22, 2026/i })).toHaveLength(2);
  });

  it("saves completed client logs and updates the compliance summary", async () => {
    mockMarcusProfile();
    const fetchMock = vi.mocked(globalThis.fetch);
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }));

    expect(await screen.findByRole("tabpanel", { name: "Logs" })).toBeInTheDocument();
    expect(await screen.findByText("0/21 logs completed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark Training completed on 2026-07-24" }));

    expect(await screen.findByText("1/21 logs completed")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/1/logs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          domain: "training",
          logDate: "2026-07-24",
          status: "completed",
          notes: undefined
        })
      })
    );
  });

  it("renders a yearly roadmap periodisation with the active phase highlighted", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Roadmap" }));

    expect(screen.getByRole("tabpanel", { name: "Roadmap" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Roadmap Periodisation" })).toBeInTheDocument();
    expect(screen.getByText("Annual phase plan for Marcus Rodriguez")).toBeInTheDocument();
    expect(await screen.findByText("Active Phase")).toBeInTheDocument();
    expect(screen.getAllByText("Hypertrophy II").length).toBeGreaterThan(0);
    expect(screen.getByTestId("roadmap-phase-active")).toHaveClass("border-purple-500");
    expect(screen.getByTestId("roadmap-phase-planned")).toHaveClass("border-slate-200");
    expect(screen.getByTestId("roadmap-phase-completed")).toHaveClass("border-slate-200");
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Past")).not.toBeInTheDocument();
    expect(screen.queryByText("Future")).not.toBeInTheDocument();
    const roadmapMonths = screen.getAllByRole("grid", { name: /roadmap month/i });
    const roadmapCells = roadmapMonths.flatMap((month) => within(month).getAllByRole("gridcell"));
    const todayParts = new Intl.DateTimeFormat("en", {
      timeZone: "Australia/Melbourne",
      month: "long",
      day: "numeric"
    }).formatToParts(new Date());
    const currentMonthName = todayParts.find((part) => part.type === "month")?.value ?? "";
    const currentDay = todayParts.find((part) => part.type === "day")?.value ?? "";
    const currentMonthGrid = screen.getByRole("grid", { name: `${currentMonthName} roadmap month` });

    expect(roadmapMonths).toHaveLength(12);
    expect(within(currentMonthGrid).getByText(currentDay)).toHaveClass("ring-purple-800");
    expect(roadmapCells.every((cell) => !cell.className.includes("ring-emerald-300"))).toBe(true);
  });

  it("resets visible roadmap phases when switching to a year with nothing scheduled", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Roadmap" }));
    fireEvent.click(screen.getByRole("button", { name: "Next roadmap year" }));

    expect(await screen.findByText(/No phases scheduled for/i)).toBeInTheDocument();
    expect(screen.queryByTestId("roadmap-phase-active")).not.toBeInTheDocument();
  });

  it("collapses and expands roadmap phase event details", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Roadmap" }));

    expect(await screen.findByText("Phase review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hypertrophy II/i }));

    expect(screen.queryByText("Phase review")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Hypertrophy II/i }));

    expect(await screen.findByText("Phase review")).toBeInTheDocument();
  });

  it("adds a roadmap event linked to a phase and shows it in the phase breakdown", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Roadmap" }));
    fireEvent.click(screen.getByRole("button", { name: "Add roadmap event" }));
    fireEvent.change(await screen.findByLabelText("Roadmap event title"), { target: { value: "Strength testing week" } });
    fireEvent.change(screen.getByLabelText("Roadmap event type"), { target: { value: "milestone" } });
    fireEvent.change(screen.getByLabelText("Linked phase"), { target: { value: "phase_active" } });
    fireEvent.change(screen.getByLabelText("Roadmap event notes"), { target: { value: "Test squat, bench, and client readiness markers." } });
    fireEvent.click(screen.getByRole("button", { name: "Save roadmap event" }));

    expect(await screen.findByText("Strength testing week")).toBeInTheDocument();
    expect(screen.getAllByText("Milestone").length).toBeGreaterThan(0);
    expect(screen.getByText("Test squat, bench, and client readiness markers.")).toBeInTheDocument();
  });

  it("opens full calendar event details", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Calendar" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Event" }));
    fireEvent.change(await screen.findByLabelText("Event title"), { target: { value: "Training block" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open event Training block" }));

    expect(await screen.findByRole("dialog", { name: "Event Details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Event title")).toHaveValue("Training block");
  });

  it("opens progress analytics from another client profile tab", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Training" }));
    fireEvent.click(screen.getByRole("button", { name: "Open progress analytics" }));

    const dialog = await screen.findByRole("dialog", { name: "Progress Analytics" });

    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Progress analytics chart" }).length).toBeGreaterThan(0);
  });

  it("normalizes imported progress metrics into readable x and y chart points", () => {
    const importedMetric = normalizeProgressMetricRecord({
      id: "imported_bodyweight_1",
      measuredAt: "2026-07-01T00:00:00.000Z",
      metricKey: "bodyweight",
      metricValue: 82.6,
      unit: "kg",
      metadata: { label: "Bodyweight" }
    });
    const series = createProgressChartSeries(
      [
        importedMetric,
        normalizeProgressMetricRecord({
          id: "imported_bodyweight_2",
          measuredAt: "2026-07-08T00:00:00.000Z",
          metricKey: "bodyweight",
          metricValue: 81.9,
          unit: "kg",
          metadata: { label: "Bodyweight" }
        })
      ],
      [{ key: "body_weight", label: "Bodyweight", color: "#4f46e5", unit: "kg" }]
    );

    expect(importedMetric.metricKey).toBe("body_weight");
    expect(importedMetric.x).toBe("2026-07-01T00:00:00.000Z");
    expect(importedMetric.y).toBe(82.6);
    expect(series[0]?.points).toEqual([
      expect.objectContaining({
        id: "imported_bodyweight_1",
        x: "2026-07-01T00:00:00.000Z",
        y: 82.6,
        chartX: expect.any(Number),
        chartY: expect.any(Number)
      }),
      expect.objectContaining({
        id: "imported_bodyweight_2",
        x: "2026-07-08T00:00:00.000Z",
        y: 81.9,
        chartX: expect.any(Number),
        chartY: expect.any(Number)
      })
    ]);
  });

  it("temporarily hides the client conversation action from the profile header", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/conversations" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "conversation_marcus",
                clientId: "1",
                clientName: "Marcus Rodriguez",
                title: null,
                latestMessage: null,
                createdAt: "2026-07-22T00:00:00.000Z",
                updatedAt: "2026-07-22T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/clients/1") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusClient }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/profile") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                bio: "Persisted Marcus coaching profile.",
                goals: ["Hypertrophy II"],
                dateOfBirth: "1994-05-14T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (
        url === "/api/v1/clients/1/training-programs" ||
        url === "/api/v1/clients/1/meal-plans" ||
        url === "/api/v1/clients/1/notes?limit=3"
      ) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/metrics?summary=weight") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusWeightSummary }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    expect(screen.queryByRole("button", { name: "Open client messages" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/conversations", expect.anything());
    expect(navigationMocks.push).not.toHaveBeenCalledWith(expect.stringContaining("/messages"));
  });

  it("opens the roster edit client dialog from the profile pencil icon", async () => {
    const fetchMock = mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "Edit client" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit client" });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Marcus");
    expect(screen.getByLabelText("Last name")).toHaveValue("Rodriguez");
    expect(screen.getByLabelText("Email")).toHaveValue("marcus@example.com");
    expect(screen.getByLabelText("Phone")).toHaveValue("+61 400 000 111");
    expect(screen.getByLabelText("Payment plan/package")).toHaveValue("package_elite");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1994-05-14");
    expect(await screen.findByRole("option", { name: "Initial Q&A Form" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Daily Habit Form" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Weekly Check-In Form" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/forms?type=intake&status=published&limit=100");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/forms?type=application&status=published&limit=100");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/forms?type=habit-tracker&status=published&limit=100");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/forms?type=check-in&status=published&limit=100");
    expect(screen.getByRole("button", { name: "Save client" })).toBeInTheDocument();
  });

  it("preselects assigned client plans in the profile edit dialog", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/clients/1") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusClient }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/profile") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                bio: "Persisted Marcus coaching profile.",
                goals: ["Hypertrophy II"],
                dateOfBirth: "1994-05-14T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/clients/1/training-programs" || url === "/api/v1/clients/1/meal-plans") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/notes?limit=3") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/metrics?summary=weight") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusWeightSummary }), { status: 200 }));
      }

      if (url === "/api/v1/training-program-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "training_template_1", name: "Strength Foundation" }] }), { status: 200 }));
      }

      if (url === "/api/v1/meal-plan-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "meal_template_1", name: "Hypertrophy Fuel" }] }), { status: 200 }));
      }

      if (url === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "supplement_template_1", name: "Sleep Support" }] }), { status: 200 }));
      }

      if (url === "/api/v1/training-program-assignments?clientId=1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ templateId: "training_template_1", status: "active" }] }), { status: 200 }));
      }

      if (url === "/api/v1/meal-plan-assignments?clientId=1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ templateId: "meal_template_1", status: "active" }] }), { status: 200 }));
      }

      if (url === "/api/v1/supplement-plan-assignments?clientId=1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ templateId: "supplement_template_1", status: "paused" }] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "Edit client" }));

    expect(await screen.findByRole("button", { name: /Strength Foundation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hypertrophy Fuel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sleep Support/i })).toBeInTheDocument();
  });

  it("refreshes profile sections from persisted plan assignments after saving the profile editor", async () => {
    let trainingAssignments: typeof marcusTrainingAssignments = [];
    let mealPlanAssignments: typeof marcusMealPlanAssignments = [];
    let supplementAssignments: typeof marcusSupplementAssignments = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "/api/v1/clients/1" && init?.method === "PATCH") {
        return new Response(JSON.stringify({ data: marcusClient }), { status: 200 });
      }

      if (url === "/api/v1/clients/1") {
        return new Response(JSON.stringify({ data: marcusClient }), { status: 200 });
      }

      if (url === "/api/v1/clients/1/profile" && init?.method === "PATCH") {
        return new Response(JSON.stringify({ data: { dateOfBirth: "1994-05-14T00:00:00.000Z" } }), { status: 200 });
      }

      if (url === "/api/v1/clients/1/profile") {
        return new Response(JSON.stringify({ data: { dateOfBirth: "1994-05-14T00:00:00.000Z" } }), { status: 200 });
      }

      if (url === "/api/v1/training-program-templates?limit=100") {
        return new Response(JSON.stringify({ data: [{ id: "training_template_1", name: "Strength Foundation" }] }), { status: 200 });
      }

      if (url === "/api/v1/meal-plan-templates?limit=100") {
        return new Response(JSON.stringify({ data: [{ id: "meal_template_1", name: "Hypertrophy Fuel" }] }), { status: 200 });
      }

      if (url === "/api/v1/supplement-plan-templates?limit=100") {
        return new Response(JSON.stringify({ data: [{ id: "supplement_template_1", name: "Sleep Support" }] }), { status: 200 });
      }

      if (url === "/api/v1/clients/1/training-programs" || url === "/api/v1/training-program-assignments?clientId=1&limit=100") {
        return new Response(JSON.stringify({ data: trainingAssignments }), { status: 200 });
      }

      if (url === "/api/v1/clients/1/meal-plans" || url === "/api/v1/meal-plan-assignments?clientId=1&limit=100") {
        return new Response(JSON.stringify({ data: mealPlanAssignments }), { status: 200 });
      }

      if (url === "/api/v1/supplement-plan-assignments?clientId=1&limit=100") {
        return new Response(JSON.stringify({ data: supplementAssignments }), { status: 200 });
      }

      if (url === "/api/v1/training-program-assignments" && init?.method === "POST") {
        trainingAssignments = [marcusTrainingAssignments[0]];
        return new Response(JSON.stringify({ data: trainingAssignments[0] }), { status: 201 });
      }

      if (url === "/api/v1/meal-plan-assignments" && init?.method === "POST") {
        mealPlanAssignments = [marcusMealPlanAssignments[0]];
        return new Response(JSON.stringify({ data: mealPlanAssignments[0] }), { status: 201 });
      }

      if (url === "/api/v1/supplement-plan-assignments" && init?.method === "POST") {
        supplementAssignments = [marcusSupplementAssignments[0]];
        return new Response(JSON.stringify({ data: supplementAssignments[0] }), { status: 201 });
      }

      if (
        url === "/api/v1/clients/1/notes?limit=3" ||
        url === "/api/v1/form-submissions?clientId=1&limit=100" ||
        url === "/api/v1/check-ins?clientId=1&limit=100"
      ) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }

      if (url === "/api/v1/clients/1/metrics?summary=weight") {
        return new Response(JSON.stringify({ data: marcusWeightSummary }), { status: 200 });
      }

      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });

    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("tab", { name: "Training" }));
    expect(screen.getByText("No persisted training program has been assigned yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit client" }));
    await screen.findByRole("dialog", { name: "Edit client" });
    await searchAndSelectPlan("Training plans", "Strength", "Strength Foundation");
    await searchAndSelectPlan("Nutrition plans", "Fuel", "Hypertrophy Fuel");
    await searchAndSelectPlan("Supplementation plans", "Sleep", "Sleep Support");
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/training-program-assignments", expect.objectContaining({ method: "POST" }));
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/meal-plan-assignments", expect.objectContaining({ method: "POST" }));
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/supplement-plan-assignments", expect.objectContaining({ method: "POST" }));
    });

    fireEvent.click(await screen.findByRole("tab", { name: "Training" }));
    expect(screen.getByRole("heading", { name: "Strength Foundation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Nutrition" }));
    expect(screen.getByRole("heading", { name: "Hypertrophy Fuel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Supplementation" }));
    expect(screen.getByRole("heading", { name: "Sleep Support" })).toBeInTheDocument();
  });

  it("adds a dated note from the client profile header", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/clients/1") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusClient }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/profile") {
        return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/training-programs" || url === "/api/v1/clients/1/meal-plans") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/notes?limit=3") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/metrics?summary=weight") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusWeightSummary }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/notes" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "note_3",
                clientId: "1",
                noteDate: "2026-07-22",
                body: "New note about nutrition consistency.",
                authorName: "Sam Coach",
                createdAt: "2026-07-22T06:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "Add client note" }));
    fireEvent.change(screen.getByLabelText("Note date"), { target: { value: "2026-07-22" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "New note about nutrition consistency." } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/clients/1/notes",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            noteDate: "2026-07-22",
            body: "New note about nutrition consistency."
          })
        })
      );
    });
    expect(await screen.findByText(/New note about nutrition consistency/)).toBeInTheDocument();
  });

  it("sets water and step targets from icon-only client profile actions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/clients/1") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusClient }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/profile" && init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/activity" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "activity_target" } }), { status: 201 }));
      }

      if (url === "/api/v1/clients/1/profile") {
        return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
      }

      if (
        url === "/api/v1/clients/1/training-programs" ||
        url === "/api/v1/clients/1/meal-plans" ||
        url === "/api/v1/clients/1/notes?limit=3"
      ) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/1/metrics?summary=weight") {
        return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });
    fireEvent.click(screen.getByRole("button", { name: "Set water target" }));
    fireEvent.change(screen.getByLabelText("Water target in litres"), { target: { value: "3.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save target" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/clients/1/profile",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ waterTargetLitres: 3.5 })
        })
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/1/activity",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "client-profile-target-updated",
          title: "Water target updated",
          metadata: {
            target: "water",
            value: 3.5
          }
        })
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Set step target" }));
    fireEvent.change(screen.getByLabelText("Step target"), { target: { value: "12000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save target" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/clients/1/profile",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ stepTarget: 12000 })
        })
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/1/activity",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "client-profile-target-updated",
          title: "Step target updated",
          metadata: {
            target: "steps",
            value: 12000
          }
        })
      })
    );
  });

  it("renders the full client notes page with word and date search", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/clients/1") {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusClient }), { status: 200 }));
      }

      if (url.startsWith("/api/v1/clients/1/notes")) {
        return Promise.resolve(new Response(JSON.stringify({ data: marcusNotes }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientNotesPage, { clientId: "1" }));

    expect(await screen.findByRole("heading", { name: "Marcus Rodriguez Notes" })).toBeInTheDocument();
    expect(await screen.findByText("Sleep was more stable after the earlier bedtime change.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to profile" })).toHaveAttribute("href", "/clients/1");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sleep" } });
    fireEvent.change(screen.getByLabelText("Search date"), { target: { value: "2026-07-22" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/1/notes?limit=100&search=sleep&date=2026-07-22");
    });
  });

  it("shows a deterministic fallback for an unknown client id", async () => {
    render(createElement(ClientProfilePage, { clientId: "missing" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Client Not Found" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to clients" })).toHaveAttribute(
      "href",
      "/clients"
    );
  });

  it("loads an API-backed profile when the client is not in fixtures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_api_1",
              name: "API Client",
              packageName: "Persisted Package",
              compliance: 91,
              checkInDay: "Wednesday",
              latestCheckIn: "May 1, 2026",
              status: "active",
              startDate: "Apr 1, 2026",
              initials: "AC",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              bio: "Persisted profile bio",
              goals: ["Strength rebuild"],
              dateOfBirth: "1990-05-14T00:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_1" }));

    expect(await screen.findByRole("heading", { level: 1, name: "API Client" })).toBeInTheDocument();
    expect(screen.getByText("Persisted Package")).toBeInTheDocument();
    expect(screen.getByText("Persisted profile bio")).toBeInTheDocument();
    expect(screen.getByText("Strength rebuild")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/profile");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/training-programs");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/meal-plans");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/notes?limit=3");
  });

  it("uses safe defaults when the persisted profile is unavailable", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_api_2",
              name: "API Client Two",
              packageName: "Persisted Package",
              compliance: 78,
              checkInDay: "Thursday",
              latestCheckIn: "May 2, 2026",
              status: "paused",
              startDate: "Apr 2, 2026",
              initials: "AT",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_2" }));

    expect(await screen.findByRole("heading", { level: 1, name: "API Client Two" })).toBeInTheDocument();
    expect(screen.getByText("Profile details are ready for persistence-backed coaching notes.")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("normalizes incomplete persisted profile fields safely", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_api_3",
              name: "API Client Three",
              packageName: "Persisted Package",
              compliance: 82,
              checkInDay: "Monday",
              latestCheckIn: "May 3, 2026",
              status: "active",
              startDate: "Apr 3, 2026",
              initials: "AH",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              bio: null,
              goals: [],
              dateOfBirth: "1990-12-31T00:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_3" }));

    expect(await screen.findByRole("heading", { level: 1, name: "API Client Three" })).toBeInTheDocument();
    expect(screen.getByText("Profile details are ready for persistence-backed coaching notes.")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("switches profile tabs locally", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });

    fireEvent.click(screen.getByRole("tab", { name: "Training" }));

    expect(screen.getByRole("tabpanel", { name: "Training" })).toHaveTextContent("Strength Foundation");
    expect(screen.getByRole("table", { name: "Strength Foundation exercises" })).toBeInTheDocument();
  });

  it("renders the persisted daily check-in and check-in history tabs", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" });

    fireEvent.click(screen.getByRole("tab", { name: "Daily Check-Ins" }));

    expect(screen.getByRole("heading", { name: "Daily Check-Ins" })).toBeInTheDocument();
    expect(screen.getByText("No persisted daily check-in grid has been configured for this client yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Check-Ins" }));

    expect(screen.getByRole("heading", { name: "Check-In History" })).toBeInTheDocument();
    expect(await screen.findByText("Hit new squat PR at 120kg.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open Marcus Rodriguez check-in" })[0]).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24"
    );
  });

  it("can open directly to the current check-in inside the client profile", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1", initialTab: "Check-Ins", highlightedCheckInId: "week-24" }));

    expect(await screen.findByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Check-Ins" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Check-Ins" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Check-In History" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toHaveValue("week-23");
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("check-ins")).toHaveAttribute("name", "tab");
    expect(screen.getByDisplayValue("week-24")).toHaveAttribute("name", "checkInId");
    expect(screen.getByRole("link", { name: "Go Back" })).toHaveAttribute("href", "/clients/1?tab=check-ins");
  });

  it("renders persisted client training assignments in the training tab", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_api_training",
              name: "Training API Client",
              packageName: "Persisted Package",
              compliance: 91,
              checkInDay: "Wednesday",
              latestCheckIn: "May 1, 2026",
              status: "active",
              startDate: "Apr 1, 2026",
              initials: "TC",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "assignment_1",
                name: "Strength Foundation",
                status: "active",
                startsOn: "2026-05-14",
                endsOn: "2026-07-09",
                snapshot: {
                  templateName: "Strength Foundation",
                  durationWeeks: 8,
                  template: {
                    days: [
                      {
                        name: "Lower A",
                        exercises: [
                          { exerciseName: "Tempo Split Squat", sets: 3, reps: "8/side" },
                          { exerciseName: "High-Bar Back Squat", sets: 4, reps: "6-8" }
                        ]
                      }
                    ]
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_training" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Training API Client" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Training" }));

    expect(screen.getByRole("tabpanel", { name: "Training" })).toHaveTextContent("Strength Foundation");
    expect(screen.getAllByRole("heading", { name: "Strength Foundation" })).toHaveLength(1);
    expect(screen.getByText("8 week program - active")).toBeInTheDocument();
    expect(screen.getByText("Tempo Split Squat")).toBeInTheDocument();
    expect(screen.getByText("High-Bar Back Squat")).toBeInTheDocument();
  });

  it("renders persisted client meal plan assignments in the nutrition tab", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_api_nutrition",
              name: "Nutrition API Client",
              packageName: "Persisted Package",
              compliance: 93,
              checkInDay: "Friday",
              latestCheckIn: "May 4, 2026",
              status: "active",
              startDate: "Apr 4, 2026",
              initials: "NC",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "meal_assignment_1",
                name: "Hypertrophy Fuel",
                phase: "Hypertrophy",
                status: "active",
                targetCalories: 2800,
                proteinGrams: 210,
                carbsGrams: 280,
                fatGrams: 93,
                startsOn: "2026-05-14",
                endsOn: null,
                snapshot: {
                  templateName: "Hypertrophy Fuel",
                  phase: "Hypertrophy",
                  targetCalories: 2900,
                  proteinGrams: 215,
                  carbsGrams: 305,
                  fatGrams: 82,
                  template: {
                    days: [
                      {
                        name: "Training Day",
                        meals: [
                          {
                            meal: "Breakfast",
                            foods: [
                              {
                                foodName: "Chicken Breast",
                                servingSize: "200g cooked",
                                calories: 330,
                                proteinGrams: 62,
                                carbsGrams: 0,
                                fatGrams: 7
                              },
                              {
                                foodName: "Basmati Rice",
                                servingSize: "250g cooked",
                                calories: 303,
                                proteinGrams: 8,
                                carbsGrams: 63,
                                fatGrams: 1
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_nutrition" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Nutrition API Client" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Nutrition" }));

    expect(screen.getByRole("tabpanel", { name: "Nutrition" })).toHaveTextContent("Hypertrophy Fuel");
    expect(screen.getByLabelText("633 / 2900 Kcal")).toBeInTheDocument();
    expect(screen.getByLabelText("70 / 215 g Protein")).toBeInTheDocument();
    expect(screen.getByLabelText("633 / 2900 Kcal")).toHaveClass("bg-slate-800", "text-white");
    expect(screen.getByLabelText("70 / 215 g Protein")).toHaveClass("bg-slate-800", "text-white");
    expect(screen.getByText("Chicken Breast")).toBeInTheDocument();
    expect(screen.getByText("200g cooked")).toBeInTheDocument();
    expect(screen.getByText("Basmati Rice")).toBeInTheDocument();
    expect(screen.getByText("250g cooked")).toBeInTheDocument();
    expect(screen.getByText("633 Kcal")).toBeInTheDocument();
  });

  it("shows an empty persisted nutrition state when no meal plan is assigned", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_api_no_nutrition",
              name: "No Nutrition API Client",
              packageName: "Persisted Package",
              compliance: 80,
              checkInDay: "Friday",
              latestCheckIn: "May 4, 2026",
              status: "active",
              startDate: "Apr 4, 2026",
              initials: "NN",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_no_nutrition" }));

    expect(await screen.findByRole("heading", { level: 1, name: "No Nutrition API Client" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Nutrition" }));

    expect(screen.getByText("No persisted meal schedule has been assigned yet.")).toBeInTheDocument();
  });

  it("maps assignment snapshots into client training programs", () => {
    expect(
      createTrainingProgramsFromAssignments([
        {
          id: "assignment_empty",
          name: "",
          status: "paused",
          startsOn: "2026-05-14",
          endsOn: null,
          snapshot: {
            templateName: "Fallback Template",
            template: {
              days: [
                {
                  name: "Day 1",
                  exercises: []
                }
              ]
            }
          }
        },
        {
          id: "assignment_no_template",
          name: "No Template",
          status: "completed",
          startsOn: "2026-05-14",
          endsOn: "2026-05-21",
          snapshot: {}
        }
      ])
    ).toMatchObject([
      {
        id: "assignment_empty",
        name: "Fallback Template",
        durationWeeks: 1,
        sessions: [
          {
            day: "Day 1",
            focus: "Assigned workout",
            duration: "0 exercises"
          }
        ]
      },
      {
        id: "assignment_no_template",
        name: "No Template",
        sessions: []
      }
    ]);
  });

  it("maps meal assignment snapshots into client nutrition plans", () => {
    expect(
      createNutritionPlansFromAssignments([
        {
          id: "meal_assignment_1",
          name: "",
          phase: null,
          status: "paused",
          targetCalories: 2200,
          proteinGrams: 180,
          carbsGrams: 220,
          fatGrams: 70,
          startsOn: "2026-05-14",
          endsOn: "2026-05-21",
          snapshot: {
            templateName: "Fallback Meal Template",
            phase: "Cut",
            targetCalories: 2100,
            template: {
              days: [
                {
                  name: "Day 1",
                  meals: [
                    {
                      meal: "Lunch",
                      foods: []
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          id: "meal_assignment_2",
          name: "Manual Nutrition",
          phase: "Maintenance",
          status: "completed",
          targetCalories: 2500,
          proteinGrams: 190,
          carbsGrams: 260,
          fatGrams: 80,
          startsOn: "2026-05-14",
          endsOn: null,
          snapshot: {}
        }
      ])
    ).toMatchObject([
      {
        id: "meal_assignment_1",
        name: "Fallback Meal Template",
        phase: "Cut",
        calories: 2100,
        protein: 180,
        meals: [
          {
            day: "Day 1",
            meal: "Lunch",
            foods: "No foods recorded",
            calories: 0
          }
        ]
      },
      {
        id: "meal_assignment_2",
        name: "Manual Nutrition",
        phase: "Maintenance",
        calories: 2500,
        meals: []
      }
    ]);
  });
});
