import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FoodDatabasePage } from "@/components/nutrition/food-database-page";
import {
  getMealAssignmentRows,
  getMealTemplateCards,
  MealPlansPage
} from "@/components/nutrition/meal-plans-page";
import { NutritionPage } from "@/components/nutrition/nutrition-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NutritionPage", () => {
  it("renders nutrition overview cards and recent logs", () => {
    render(createElement(NutritionPage));

    expect(screen.getByRole("heading", { level: 1, name: "Nutrition Plans" })).toBeInTheDocument();
    expect(screen.getByText("Active Meal Plans")).toBeInTheDocument();
    expect(screen.getByText("High Performance Macro Split")).toBeInTheDocument();
    expect(screen.getByText("Recent Meal Logs")).toBeInTheDocument();
  });
});

describe("MealPlansPage", () => {
  it("switches between meal plans and meal templates", () => {
    render(createElement(MealPlansPage));

    expect(screen.getByRole("heading", { level: 1, name: "Meal Plan Library" })).toBeInTheDocument();
    expect(screen.getByText("James S. Miller")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Meal Templates" }));

    expect(screen.getByRole("tabpanel", { name: "Meal Templates" })).toHaveTextContent(
      "High-Protein Breakfast Bowl"
    );
    expect(screen.queryByText("James S. Miller")).not.toBeInTheDocument();
  });

  it("renders meal-plan actions", () => {
    render(createElement(MealPlansPage));

    expect(screen.queryByRole("button", { name: "Recipes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Access Protocol" })).not.toBeInTheDocument();
    expect(screen.queryByText("Master Nutrition Protocol 2024")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View All Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Meal Template" })).toBeInTheDocument();
  });

  it("opens the meal plan quick action menu and closes it from the page overlay", () => {
    render(createElement(MealPlansPage));

    fireEvent.click(screen.getAllByRole("button", { name: /more actions for/i })[0]);

    const menu = screen.getByRole("menu", { name: /meal plan actions/i });
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close meal plan actions" }));

    expect(screen.queryByRole("menu", { name: /meal plan actions/i })).not.toBeInTheDocument();
  });

  it("loads persisted meal templates and assignments when the API is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_template_api",
                  name: "Persisted Hypertrophy Fuel",
                  phase: "Hypertrophy",
                  targetCalories: 2900,
                  proteinGrams: 215,
                  carbsGrams: 305,
                  fatGrams: 82,
                  status: "published",
                  template: { days: [] },
                  updatedAt: "2026-05-18T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/meal-plan-assignments")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_assignment_api",
                  clientId: "client_api",
                  clientName: "Persisted Nutrition Client",
                  templateId: "meal_template_api",
                  name: "Persisted Hypertrophy Fuel",
                  phase: "Hypertrophy",
                  targetCalories: 2900,
                  proteinGrams: 215,
                  carbsGrams: 305,
                  fatGrams: 82,
                  status: "active",
                  snapshot: {
                    targetCalories: 2900,
                    proteinGrams: 215,
                    carbsGrams: 305,
                    fatGrams: 82
                  },
                  startsOn: "2026-05-01",
                  endsOn: null,
                  updatedAt: "2026-05-18T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MealPlansPage));

    expect(await screen.findByText("Persisted Nutrition Client")).toBeInTheDocument();
    expect(screen.getByText("Persisted Hypertrophy Fuel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Meal Templates" }));

    expect(screen.getByRole("tabpanel", { name: "Meal Templates" })).toHaveTextContent(
      "Hypertrophy protocol"
    );
    expect(screen.queryByText("High-Protein Breakfast Bowl")).not.toBeInTheDocument();
  });

  it("creates a persisted meal template from the meal plan library", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "meal_template_created",
                name: "Performance Meal Template 1",
                phase: "Hypertrophy",
                targetCalories: 2800,
                proteinGrams: 210,
                carbsGrams: 280,
                fatGrams: 93,
                status: "draft",
                template: { days: [] },
                updatedAt: "2026-05-18T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MealPlansPage));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients?status=active&limit=100"));
    fireEvent.click(screen.getByRole("button", { name: "Create Meal Template" }));

    expect(await screen.findByText("Meal plan template saved to persistence API.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Performance Meal Template 1")
      })
    );
    expect(screen.getByRole("tabpanel", { name: "Meal Templates" })).toHaveTextContent(
      "Performance Meal Template 1"
    );
  });

  it("assigns a persisted meal template to a client", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_template_api",
                  name: "Persisted Hypertrophy Fuel",
                  phase: "Hypertrophy",
                  targetCalories: 2900,
                  proteinGrams: 215,
                  carbsGrams: 305,
                  fatGrams: 82,
                  status: "published",
                  template: { days: [] },
                  updatedAt: "2026-05-18T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/meal-plan-assignments" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "meal_assignment_created",
                clientId: "client_api",
                clientName: "Persisted Nutrition Client",
                templateId: "meal_template_api",
                name: "Persisted Hypertrophy Fuel",
                phase: "Hypertrophy",
                targetCalories: 2900,
                proteinGrams: 215,
                carbsGrams: 305,
                fatGrams: 82,
                status: "active",
                snapshot: {
                  targetCalories: 2900,
                  proteinGrams: 215,
                  carbsGrams: 305,
                  fatGrams: 82
                },
                startsOn: "2026-05-18",
                endsOn: null,
                updatedAt: "2026-05-18T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      if (url.startsWith("/api/v1/meal-plan-assignments")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "client_api",
                name: "Persisted Nutrition Client",
                packageName: "Nutrition",
                compliance: 90,
                checkInDay: "Monday",
                latestCheckIn: "Today",
                status: "active",
                startDate: "May 1, 2026",
                initials: "PN",
                avatarColor: "bg-green-700"
              }
            ]
          }),
          { status: 200 }
        )
      );
    });

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Meal Templates" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Template" }));
    fireEvent.change(screen.getByLabelText("Client"), { target: { value: "client_api" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Meal Plan" }));

    expect(await screen.findByText("Meal plan assigned to client.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-assignments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("client_api")
      })
    );
    expect(screen.getByRole("tabpanel", { name: "Meal Plans" })).toHaveTextContent(
      "Persisted Nutrition Client"
    );
  });

  it("falls back to fixture meal plans when the persistence API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));

    render(createElement(MealPlansPage));

    expect(await screen.findByText("Meal plan persistence API unavailable. Showing fixture meal plan library.")).toBeInTheDocument();
    expect(screen.getByText("James S. Miller")).toBeInTheDocument();
  });

  it("handles non-array meal plan API payloads as empty persisted state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ data: { unexpected: true } }), { status: 200 }))
    );

    render(createElement(MealPlansPage));

    expect(await screen.findByText("No active meal plans have been assigned yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Meal Templates" }));

    expect(screen.getByText("No meal plan templates exist yet. Create a new template to start the library.")).toBeInTheDocument();
  });

  it("shows API errors when persisted meal template creation fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/meal-plan-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Template macro values are invalid." } }), {
            status: 422
          })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create Meal Template" }));

    expect(await screen.findByText("Template macro values are invalid.")).toBeInTheDocument();
  });

  it("shows API errors when persisted meal assignment fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_template_api",
                  name: "Persisted Hypertrophy Fuel",
                  phase: "Hypertrophy",
                  targetCalories: 2900,
                  proteinGrams: 215,
                  carbsGrams: 305,
                  fatGrams: 82,
                  status: "published",
                  template: { days: [] },
                  updatedAt: "2026-05-18T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/meal-plan-assignments" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Client is not available for assignment." } }), {
            status: 404
          })
        );
      }

      if (url.startsWith("/api/v1/meal-plan-assignments")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "client_api",
                name: "Persisted Nutrition Client",
                packageName: "Nutrition",
                compliance: 90,
                checkInDay: "Monday",
                latestCheckIn: "Today",
                status: "active",
                startDate: "May 1, 2026",
                initials: "PN",
                avatarColor: "bg-green-700"
              }
            ]
          }),
          { status: 200 }
        )
      );
    });

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Meal Templates" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Template" }));
    fireEvent.change(screen.getByLabelText("Client"), { target: { value: "client_api" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Meal Plan" }));

    expect(await screen.findByText("Client is not available for assignment.")).toBeInTheDocument();
  });
});

describe("meal plan view model helpers", () => {
  it("maps fixture and API templates into reusable cards", () => {
    expect(getMealTemplateCards("fixtures", [])[0]).toMatchObject({
      name: "High-Protein Breakfast Bowl",
      apiTemplate: null
    });

    expect(
      getMealTemplateCards("api", [
        {
          id: "meal_template_api",
          name: "Persisted Hypertrophy Fuel",
          phase: null,
          targetCalories: 2900,
          proteinGrams: 215,
          carbsGrams: 305,
          fatGrams: 82,
          status: "published",
          template: { days: [] },
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ])[0]
    ).toMatchObject({
      description: "Nutrition protocol",
      calories: 2900,
      badge: "published"
    });
  });

  it("maps fixture and API assignments into active nutrition rows", () => {
    expect(getMealAssignmentRows("fixtures", [])[0]).toMatchObject({
      planName: "Hypertrophy Phase II",
      status: "active"
    });

    expect(
      getMealAssignmentRows("api", [
        {
          id: "meal_assignment_api",
          clientId: "client_api",
          clientName: null,
          templateId: "meal_template_api",
          name: "Persisted Hypertrophy Fuel",
          phase: "Hypertrophy",
          targetCalories: 2800,
          proteinGrams: 210,
          carbsGrams: 280,
          fatGrams: 93,
          status: "active",
          snapshot: { targetCalories: 2900, proteinGrams: 215 },
          startsOn: "2026-05-01",
          endsOn: null,
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      ])[0]
    ).toMatchObject({
      clientName: "Unassigned client",
      calories: 2900,
      protein: 215,
      carbs: 280,
      fats: 93,
      started: "May 1, 2026"
    });
  });
});

describe("FoodDatabasePage", () => {
  it("renders the Figma food database search and source controls", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(createElement(FoodDatabasePage));

    expect(await screen.findByRole("heading", { level: 1, name: "Food Database" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search foods/i })).toHaveAttribute(
      "placeholder",
      "Search thousands of ingredients..."
    );
    expect(screen.getByText("Source:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /USDA 600,000\+ items/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aus & NZ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EU" })).toBeInTheDocument();
    expect(screen.getByText("USDA FoodData Central")).toBeInTheDocument();
    expect(screen.getByAltText("Chicken Breast")).toBeInTheDocument();
  });

  it("loads API-backed foods when persistence is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "food_api_1",
              scope: "private",
              name: "API Turkey Mince",
              category: "Proteins",
              servingSize: "100g cooked",
              calories: 180,
              proteinGrams: 28,
              carbsGrams: 0,
              fatGrams: 8
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("API Turkey Mince")).toBeInTheDocument();
    expect(screen.getByText("100g cooked")).toBeInTheDocument();
    expect(screen.getByText("28g")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Breast")).not.toBeInTheDocument();
  });

  it("creates a persisted food from the food database", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "food_created",
              scope: "private",
              name: "Coach Food 1",
              category: "Custom",
              servingSize: "100g",
              calories: 250,
              proteinGrams: 20,
              carbsGrams: 25,
              fatGrams: 8
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(FoodDatabasePage));

    await screen.findByText("No persisted foods match the current filters.");
    fireEvent.click(screen.getByRole("button", { name: "Create New Food" }));

    expect(await screen.findByText("Food saved to persistence API.")).toBeInTheDocument();
    expect(screen.getByText("Coach Food 1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/foods",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Coach Food 1")
      })
    );
  });

  it("falls back to fixture foods when the persistence API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("Food persistence API unavailable. Showing fixture food library.")).toBeInTheDocument();
    expect(screen.getByText("Chicken Breast")).toBeInTheDocument();
  });

  it("shows a save error when persisted food creation fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Macro values are invalid." } }), {
          status: 422
        })
      );

    render(createElement(FoodDatabasePage));

    await screen.findByText("No persisted foods match the current filters.");
    fireEvent.click(screen.getByRole("button", { name: "Create New Food" }));

    expect(await screen.findByText("Macro values are invalid.")).toBeInTheDocument();
  });

  it("searches foods by name", () => {
    render(createElement(FoodDatabasePage));

    fireEvent.change(screen.getByRole("searchbox", { name: /search foods/i }), {
      target: { value: "rice" }
    });

    expect(screen.getByText("Basmati Rice")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Breast")).not.toBeInTheDocument();
  });

  it("filters foods by category", () => {
    render(createElement(FoodDatabasePage));

    fireEvent.click(screen.getByRole("button", { name: "Proteins" }));

    const grid = screen.getByRole("region", { name: "Food grid" });
    expect(within(grid).getByText("Chicken Breast")).toBeInTheDocument();
    expect(within(grid).getByText("Whey Isolate")).toBeInTheDocument();
    expect(within(grid).queryByText("Basmati Rice")).not.toBeInTheDocument();
  });

  it("updates pagination controls locally", () => {
    render(createElement(FoodDatabasePage));

    expect(screen.getByRole("status", { name: "Food database page" })).toHaveTextContent("Page 1");

    fireEvent.click(screen.getByRole("button", { name: "Next food page" }));

    expect(screen.getByRole("status", { name: "Food database page" })).toHaveTextContent("Page 2");

    fireEvent.click(screen.getByRole("button", { name: "Previous food page" }));

    expect(screen.getByRole("status", { name: "Food database page" })).toHaveTextContent("Page 1");
  });
});
