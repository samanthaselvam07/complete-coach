import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ClientProfilePage,
  createNutritionPlansFromAssignments,
  createTrainingProgramsFromAssignments
} from "@/components/clients/client-profile-page";

describe("ClientProfilePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a client profile by id", () => {
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(screen.getByRole("heading", { level: 1, name: "Marcus Rodriguez" })).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy II")).toBeInTheDocument();
    expect(screen.getByText("88.4")).toBeInTheDocument();
    expect(screen.getByText("Recovery Score")).toBeInTheDocument();
  });

  it("renders the updated Figma client dashboard surface", () => {
    render(createElement(ClientProfilePage, { clientId: "1" }));

    expect(screen.getByText("Active Protocol: Hypertrophy II")).toBeInTheDocument();
    expect(screen.getByText("Assigned Check-In: Every Monday")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Trellis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Protocol" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Daily Check-Ins" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Progress Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Weekly Check-In History")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Goals & Countdowns")).toBeInTheDocument();
    expect(screen.getByText("Account Activity Log")).toBeInTheDocument();
    expect(screen.getAllByText("Check-in submitted")).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Week 24/i })[0]).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24"
    );
    expect(screen.getByText("Competition Day - Natural Pro Show")).toBeInTheDocument();
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

  it("switches profile tabs locally", () => {
    render(createElement(ClientProfilePage, { clientId: "1" }));

    fireEvent.click(screen.getByRole("tab", { name: "Training" }));

    expect(screen.getByRole("tabpanel", { name: "Training" })).toHaveTextContent("Weekly Training Schedule");
    expect(screen.getByText("Upper Power")).toBeInTheDocument();
  });

  it("renders the Figma daily check-in matrix and check-in history tabs", () => {
    render(createElement(ClientProfilePage, { clientId: "1" }));

    fireEvent.click(screen.getByRole("tab", { name: "Daily Check-Ins" }));

    expect(screen.getByRole("heading", { name: "Daily Check-Ins" })).toBeInTheDocument();
    expect(screen.getByText("Form configured by coaching team")).toBeInTheDocument();
    expect(screen.getByText("Energy Level")).toBeInTheDocument();
    expect(screen.getByText("Coach Note:")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Check-Ins" }));

    expect(screen.getByRole("heading", { name: "Check-In History" })).toBeInTheDocument();
    expect(screen.getByText("Week 24")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Week 24 check-in" })).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24"
    );
    expect(screen.getAllByText("View Check-In Recording")).toHaveLength(3);
    expect(screen.getAllByText("Main Challenge")).toHaveLength(3);
  });

  it("can open directly to a highlighted check-in inside the client profile", () => {
    render(createElement(ClientProfilePage, { clientId: "1", initialTab: "Check-Ins", highlightedCheckInId: "demo-weekly-check-in" }));

    expect(screen.getByRole("tab", { name: "Check-Ins" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Check-Ins" })).toBeInTheDocument();
    expect(screen.getByText("Selected check-in")).toBeInTheDocument();
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
