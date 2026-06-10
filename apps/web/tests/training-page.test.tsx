import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddExercisePage } from "@/components/training/add-exercise-page";
import { ExerciseDatabasePage } from "@/components/training/exercise-database-page";
import {
  formatRelativeDate,
  getAssignmentProgress,
  getProgramAssignmentRows,
  getProgramTemplateCards,
  getWeeksBetween,
  TrainingProgramsPage
} from "@/components/training/training-programs-page";
import { TrainingPage } from "@/components/training/training-page";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigationMocks.push }) }));

afterEach(() => {
  vi.restoreAllMocks();
  navigationMocks.push.mockReset();
});

describe("TrainingPage", () => {
  it("renders training overview cards and recent workout activity", () => {
    render(createElement(TrainingPage));

    expect(screen.getByRole("heading", { level: 1, name: "Training Programs" })).toBeInTheDocument();
    expect(screen.getByText("Active Athletes")).toBeInTheDocument();
    expect(screen.getAllByText("Elite Strength - Phase 2").length).toBeGreaterThan(0);
    expect(screen.getByText("Recent Workout Completions")).toBeInTheDocument();
  });
});

describe("TrainingProgramsPage", () => {
  it("switches between custom programs and program templates", () => {
    render(createElement(TrainingProgramsPage));

    expect(screen.getByRole("heading", { level: 1, name: "Program Library" })).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy Phase II")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Program templates" }));

    expect(screen.getByRole("tabpanel", { name: "Program templates" })).toHaveTextContent("Body Recomp v3");
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Strength" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Endurance" })).not.toBeInTheDocument();
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();
  });

  it("loads persisted templates and assignments when the API is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/training-program-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Persisted Strength Foundation",
                  description: "API-backed training template",
                  goal: "strength",
                  durationWeeks: 8,
                  status: "published",
                  template: { days: [] },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/training-program-assignments")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "assignment_api",
                  clientId: "client_api",
                  clientName: "Persisted Client",
                  templateId: "template_api",
                  name: "Persisted Strength Foundation",
                  status: "active",
                  startsOn: "2026-05-01",
                  endsOn: "2026-06-26",
                  snapshot: { durationWeeks: 8 },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                },
                {
                  id: "assignment_api_2",
                  clientId: "client_api_2",
                  clientName: "Second Persisted Client",
                  templateId: "template_api",
                  name: "Persisted Strength Foundation",
                  status: "active",
                  startsOn: "2026-05-03",
                  endsOn: "2026-06-28",
                  snapshot: { durationWeeks: 8 },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                },
                {
                  id: "assignment_api_completed",
                  clientId: "client_api_3",
                  clientName: "Completed Persisted Client",
                  templateId: "template_api",
                  name: "Persisted Strength Foundation",
                  status: "completed",
                  startsOn: "2026-04-01",
                  endsOn: "2026-05-01",
                  snapshot: { durationWeeks: 4 },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    expect(await screen.findByText("Persisted Strength Foundation")).toBeInTheDocument();
    expect(screen.getByText("2 active clients")).toBeInTheDocument();
    expect(screen.queryByText("Persisted Client")).not.toBeInTheDocument();
    expect(screen.queryByText("Second Persisted Client")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /more actions for persisted strength foundation/i }));

    const actions = screen.getByRole("menu", { name: /actions for persisted strength foundation/i });
    expect(actions.closest(".overflow-visible")).toBeInTheDocument();
    expect(within(actions).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(actions).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(actions).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(actions).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Program templates" }));

    expect(screen.getByRole("tabpanel", { name: "Program templates" })).toHaveTextContent(
      "API-backed training template"
    );
    expect(screen.queryByText("Body Recomp v3")).not.toBeInTheDocument();
  });

  it("opens the workout builder from an active client program edit action", async () => {
    const templateJson = {
      days: [
        {
          name: "Upper Strength",
          exercises: [
            {
              exerciseId: "bench_press",
              exerciseName: "Bench Press",
              sets: 3,
              reps: "5",
              restSeconds: 180,
              rpe: "8",
              rir: "2",
              section: "workout"
            }
          ]
        }
      ],
      instructions: "Keep one rep in reserve."
    };

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/training-program-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Persisted Strength Foundation",
                  description: "API-backed training template",
                  goal: "strength",
                  durationWeeks: 8,
                  status: "published",
                  template: templateJson,
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/training-program-assignments")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "assignment_api",
                  clientId: "client_api",
                  clientName: "Persisted Client",
                  templateId: "template_api",
                  name: "Persisted Strength Foundation",
                  status: "active",
                  startsOn: "2026-05-01",
                  endsOn: "2026-06-26",
                  snapshot: {
                    templateId: "template_api",
                    templateName: "Persisted Strength Foundation",
                    goal: "strength",
                    durationWeeks: 8,
                    template: templateJson
                  },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("button", { name: "Edit Persisted Strength Foundation" }));

    expect(screen.getByRole("heading", { level: 1, name: "Create a Program" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persisted Strength Foundation")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Persisted Strength Foundation Copy")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Bench Press")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("creates a persisted template from the program library", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_created",
                name: "Strength Template 1",
                description: "Coach-created template from the program library.",
                goal: "strength",
                durationWeeks: 8,
                status: "draft",
                template: { days: [] },
                updatedAt: "2026-05-14T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/training-program-templates?limit=100"));
    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.change(screen.getByLabelText(/Program Title/i), { target: { value: "Strength Template 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Template" }));

    expect(await screen.findByText("Program template saved.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("heading", { level: 1, name: "Program Library" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Create a Program" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Strength Template 1")
      })
    );
    expect(screen.getByRole("tabpanel", { name: "Program templates" })).toHaveTextContent("Strength Template 1");
  });

  it("opens a create-program chooser and saves a from-scratch program to custom programs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_created",
                name: "Lower Strength Build",
                description: "Four week lower body progression.",
                goal: "custom",
                durationWeeks: 1,
                status: "draft",
                template: { days: [] },
                updatedAt: "2026-05-14T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    expect(screen.getByRole("dialog", { name: "How do you want to create this program?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));

    expect(screen.getByRole("heading", { level: 1, name: "Create a Program" })).toBeInTheDocument();
    expect(screen.getByText("Complete Coach Builder")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Program Title/i), { target: { value: "Lower Strength Build" } });
    fireEvent.change(screen.getByLabelText(/Program Overview/i), { target: { value: "Four week lower body progression." } });
    fireEvent.change(screen.getByLabelText(/Day Name/i), { target: { value: "Lower Day" } });
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add manual workout row" }));
    fireEvent.change(screen.getByLabelText("Exercise name"), { target: { value: "Back Squat" } });
    fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "6-8" } });
    fireEvent.change(screen.getByLabelText("RPE"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("RIR"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Rest time"), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText(/Workout Instructions/i), {
      target: { value: "Progress only if reps stay crisp." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add training day" }));

    expect(screen.getByRole("tab", { name: "Day 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save & Close" }));

    expect(await screen.findByText("Lower Strength Build added to Custom programs.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("tab", { name: "Custom programs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Custom programs" })).toHaveTextContent("Lower Strength Build");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({ method: "POST" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Lower Strength Build" }));

    expect(screen.getByDisplayValue("Back Squat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4")).toBeInTheDocument();
    expect(screen.getByDisplayValue("6-8")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Progress only if reps stay crisp.")).toBeInTheDocument();
  });

  it("duplicates an existing template into an editable program builder", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/training-program-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Persisted Strength Foundation",
                  description: "API-backed training template",
                  goal: "strength",
                  durationWeeks: 8,
                  status: "published",
                  template: {
                    days: [
                      {
                        name: "Upper Strength",
                        exercises: [
                          {
                            exerciseId: "bench_press",
                            exerciseName: "Bench Press",
                            sets: 3,
                            reps: "5",
                            restSeconds: 180,
                            rpe: "8",
                            rir: "2",
                            section: "workout"
                          }
                        ]
                      }
                    ],
                    instructions: "Keep one rep in reserve."
                  },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/training-program-templates?limit=100"));
    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Create From Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Persisted Strength Foundation" }));

    expect(screen.getByRole("heading", { level: 1, name: "Create a Program" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persisted Strength Foundation Copy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bench Press")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "4" } });
    expect(screen.getByDisplayValue("4")).toBeInTheDocument();
  });

  it("duplicates a persisted template from the master template use action", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/training-program-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Persisted Strength Foundation",
                  description: "API-backed training template",
                  goal: "strength",
                  durationWeeks: 8,
                  status: "published",
                  template: {
                    days: [
                      {
                        name: "Upper Strength",
                        exercises: [
                          {
                            exerciseId: "bench_press",
                            exerciseName: "Bench Press",
                            sets: 3,
                            reps: "5",
                            restSeconds: 180,
                            rpe: "8",
                            rir: "2",
                            section: "workout"
                          }
                        ]
                      }
                    ],
                    instructions: "Keep one rep in reserve."
                  },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/training-program-assignments")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Program templates" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Template" }));

    expect(screen.getByRole("heading", { level: 1, name: "Create a Program" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persisted Strength Foundation Copy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bench Press")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Assign Program Template" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/training-program-assignments", expect.objectContaining({ method: "POST" }));
  });
});

describe("training program view model helpers", () => {
  it("maps fixture and API templates into reusable cards", () => {
    expect(getProgramTemplateCards("fixtures", [], [])[0]).toMatchObject({
      name: "Body Recomp v3",
      apiTemplate: null
    });

    expect(
      getProgramTemplateCards(
        "api",
        [
          {
            id: "template_api",
            name: "Persisted Strength Foundation",
            description: null,
            goal: null,
            durationWeeks: 8,
            status: "published",
            template: { days: [] },
            updatedAt: "2026-05-14T00:00:00.000Z"
          }
        ],
        [
          {
            id: "assignment_api",
            clientId: "client_api",
            clientName: null,
            templateId: "template_api",
            name: "Persisted Strength Foundation",
            status: "active",
            startsOn: "2026-05-01",
            endsOn: null,
            snapshot: {},
            updatedAt: "2026-05-14T00:00:00.000Z"
          }
        ]
      )[0]
    ).toMatchObject({
      description: "No description recorded.",
      goal: "template",
      badge: "PUBLISHED",
      uses: 1
    });
  });

  it("maps fixture and API assignments into active program rows", () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-05-15T00:00:00.000Z").getTime());

    expect(getProgramAssignmentRows("fixtures", [])[0]).toMatchObject({
      name: "Hypertrophy Phase II"
    });

    expect(
      getProgramAssignmentRows("api", [
        {
          id: "assignment_api",
          clientId: "client_api",
          clientName: null,
          templateId: null,
          name: "Persisted Strength Foundation",
          status: "active",
          startsOn: "2026-05-01",
          endsOn: "2026-05-29",
          snapshot: {},
          updatedAt: "2026-05-14T00:00:00.000Z"
        },
        {
          id: "assignment_api_2",
          clientId: "client_api_2",
          clientName: "Persisted Client",
          templateId: "template_api",
          name: "Persisted Endurance Foundation",
          status: "paused",
          startsOn: "2026-05-15",
          endsOn: null,
          snapshot: { durationWeeks: 12 },
          updatedAt: "not-a-date"
        }
      ])
    ).toMatchObject([
      {
        clientName: "Unassigned client",
        activeClientCount: 1,
        progress: 50,
        weeksTotal: 4,
        icon: "P",
        lastEdited: "Yesterday"
      },
      {
        clientName: "Persisted Client",
        activeClientCount: 0,
        progress: 0,
        weeksTotal: 12,
        icon: "P",
        lastEdited: "Recently"
      }
    ]);
  });

  it("handles assignment progress and date edge cases", () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-05-15T00:00:00.000Z").getTime());

    expect(getAssignmentProgress("2026-05-01", null)).toBe(0);
    expect(getAssignmentProgress("invalid", "2026-05-30")).toBe(0);
    expect(getAssignmentProgress("2026-05-30", "2026-05-01")).toBe(0);
    expect(getAssignmentProgress("2026-05-01", "2026-05-29")).toBe(50);
    expect(getAssignmentProgress("2026-04-01", "2026-04-30")).toBe(100);
    expect(getWeeksBetween("2026-05-01", null)).toBe(1);
    expect(getWeeksBetween("invalid", "2026-05-30")).toBe(1);
    expect(getWeeksBetween("2026-05-01", "2026-05-29")).toBe(4);
    expect(formatRelativeDate("2026-05-15T00:00:00.000Z")).toBe("Today");
    expect(formatRelativeDate("2026-05-13T00:00:00.000Z")).toBe("2 days ago");
  });
});

describe("ExerciseDatabasePage", () => {
  it("loads API-backed exercises when persistence is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "api-exercise-1",
              name: "Persisted Tempo Squat",
              category: "Quads",
              scope: "private",
              equipment: "Barbell",
              difficulty: "intermediate",
              videoObjectKey: null,
              primaryMuscles: ["Quads"]
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(ExerciseDatabasePage));

    expect(await screen.findByText("Persisted Tempo Squat")).toBeInTheDocument();
    expect(screen.queryByText("High-Bar Back Squat")).not.toBeInTheDocument();
  });

  it("searches exercises by name", () => {
    render(createElement(ExerciseDatabasePage));

    fireEvent.change(screen.getByRole("searchbox", { name: /search exercises/i }), {
      target: { value: "squat" }
    });

    expect(screen.getByText("High-Bar Back Squat")).toBeInTheDocument();
    expect(screen.queryByText("Incline DB Press")).not.toBeInTheDocument();
  });

  it("filters exercises by category", () => {
    render(createElement(ExerciseDatabasePage));

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    const grid = screen.getByRole("region", { name: "Exercise grid" });
    expect(within(grid).getByText("Wide-Grip Pull-Ups")).toBeInTheDocument();
    expect(within(grid).queryByText("High-Bar Back Squat")).not.toBeInTheDocument();
  });
});

describe("AddExercisePage", () => {
  it("updates local exercise details and coaching cues", () => {
    render(createElement(AddExercisePage));

    expect(screen.getByRole("heading", { level: 1, name: "Add New Exercise" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Exercise Name"), {
      target: { value: "Tempo Goblet Squat" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Decrease sets" }));
    fireEvent.change(screen.getByLabelText("New coaching cue"), {
      target: { value: "Brace before each rep" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add coaching cue" }));

    expect(screen.getByDisplayValue("Tempo Goblet Squat")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText("Brace before each rep")).toBeInTheDocument();
  });

  it("toggles anatomical target pills", () => {
    render(createElement(AddExercisePage));

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("button", { name: "Back" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Chest" }));
    expect(screen.getByRole("button", { name: "Chest" })).toHaveAttribute("aria-pressed", "false");
  });

  it("saves a new exercise through the persistence API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "exercise_created",
            name: "Tempo Goblet Squat",
            category: "Compound",
            scope: "private",
            primaryMuscles: ["Chest", "Shoulders"]
          }
        }),
        { status: 201 }
      )
    );

    render(createElement(AddExercisePage));

    fireEvent.change(screen.getByLabelText("Exercise Name"), {
      target: { value: "Tempo Goblet Squat" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save Exercise" })[0]);

    await waitFor(() => expect(navigationMocks.push).toHaveBeenCalledWith("/training/exercises"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exercises",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Tempo Goblet Squat")
      })
    );
  });

  it("uploads exercise video through a signed URL before save", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/exercises/media-upload-url") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                objectKey: "organizations/org_1/training/exercises/video/00000000-0000-4000-8000-000000000000.mp4",
                uploadUrl: "https://r2.example/upload",
                requiredHeaders: { "Content-Type": "video/mp4" }
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "https://r2.example/upload" && init?.method === "PUT") {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      if (String(input) === "/api/v1/exercises" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 201 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    });

    render(createElement(AddExercisePage));

    const file = new File(["demo"], "squat-demo.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText("Exercise video file"), {
      target: { files: [file] }
    });

    expect(await screen.findByText("Exercise video uploaded and ready to save.")).toBeInTheDocument();
    expect(screen.getByText("squat-demo.mp4 uploaded.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exercises/media-upload-url",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("squat-demo.mp4")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://r2.example/upload",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: file
      })
    );

    fireEvent.change(screen.getByLabelText("Exercise Name"), {
      target: { value: "Uploaded Video Squat" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save Exercise" })[0]);

    await waitFor(() => expect(navigationMocks.push).toHaveBeenCalledWith("/training/exercises"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exercises",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("organizations/org_1/training/exercises/video")
      })
    );
  });
});
