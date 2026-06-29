import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ClientProfilePage,
  createNutritionPlansFromAssignments,
  createTrainingProgramsFromAssignments
} from "@/components/clients/client-profile-page";

const marcusClient = {
  id: "1",
  name: "Marcus Rodriguez",
  packageName: "Elite Performance",
  compliance: 96,
  checkInDay: "Monday",
  latestCheckIn: "Apr 18, 2026",
  status: "active",
  startDate: "Jan 15, 2026",
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

function mockMarcusProfile() {
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

    if (url === "/api/v1/check-ins?clientId=1&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: marcusCheckIns }), { status: 200 }));
    }

    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });
}

describe("ClientProfilePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a client profile by id", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Marcus Rodriguez" })).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy II")).toBeInTheDocument();
    expect(screen.getByText("Elite Performance")).toBeInTheDocument();
    expect(screen.getByText("Recovery Score")).toBeInTheDocument();
  });

  it("renders the updated Figma client dashboard surface", async () => {
    mockMarcusProfile();
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(await screen.findByText("Active Protocol: Hypertrophy II")).toBeInTheDocument();
    expect(screen.getByText("Assigned Check-In: Every Monday")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Trellis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Protocol" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Daily Check-Ins" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Progress Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Weekly Check-In History")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Goals & Countdowns")).toBeInTheDocument();
    expect(screen.getByText("Account Activity Log")).toBeInTheDocument();
    expect(screen.getByText("No persisted progress analytics are available for this client yet.")).toBeInTheDocument();
    expect(screen.getByText("No persisted goals or countdowns are available for this client yet.")).toBeInTheDocument();
    expect(screen.getByText("No persisted activity events are available for this client yet.")).toBeInTheDocument();
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

    render(createElement(ClientProfilePage, { clientId: "client_api_1" }));

    expect(await screen.findByRole("heading", { level: 1, name: "API Client" })).toBeInTheDocument();
    expect(screen.getByText("Persisted Package")).toBeInTheDocument();
    expect(screen.getByText("Persisted profile bio")).toBeInTheDocument();
    expect(screen.getByText("Strength rebuild")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/profile");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/training-programs");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients/client_api_1/meal-plans");
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
      .mockResolvedValueOnce(new Response(null, { status: 403 }));

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
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

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

    expect(screen.getByRole("tabpanel", { name: "Training" })).toHaveTextContent("Weekly Training Schedule");
    expect(screen.getByText("No persisted training programs have been assigned yet.")).toBeInTheDocument();
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
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_training" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Training API Client" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Training" }));

    expect(screen.getByRole("tabpanel", { name: "Training" })).toHaveTextContent("Assigned Training Programs");
    expect(screen.getAllByText("Strength Foundation").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("8 week program")).toBeInTheDocument();
    expect(screen.getByText("Tempo Split Squat, High-Bar Back Squat")).toBeInTheDocument();
    expect(screen.getByText("2 exercises")).toBeInTheDocument();
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
      );

    render(createElement(ClientProfilePage, { clientId: "client_api_nutrition" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Nutrition API Client" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Nutrition" }));

    expect(screen.getByRole("tabpanel", { name: "Nutrition" })).toHaveTextContent("Hypertrophy Fuel");
    expect(screen.getByText("2900")).toBeInTheDocument();
    expect(screen.getByText("215g")).toBeInTheDocument();
    expect(screen.getByText("Training Day")).toBeInTheDocument();
    expect(screen.getByText("Chicken Breast (200g cooked), Basmati Rice (250g cooked)")).toBeInTheDocument();
    expect(screen.getByText("633 calories")).toBeInTheDocument();
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
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(ClientProfilePage, { clientId: "client_api_no_nutrition" }));

    expect(await screen.findByRole("heading", { level: 1, name: "No Nutrition API Client" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Nutrition" }));

    expect(screen.getByText("Unassigned Nutrition Plan")).toBeInTheDocument();
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
