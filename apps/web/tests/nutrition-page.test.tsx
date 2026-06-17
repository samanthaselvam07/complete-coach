import { fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText("Hypertrophy Phase II")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Meal Templates" }));

    expect(screen.getByRole("tabpanel", { name: "Meal Templates" })).toHaveTextContent(
      "High-Protein Breakfast Bowl"
    );
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();
  });

  it("renders meal-plan actions", () => {
    render(createElement(MealPlansPage));

    expect(screen.queryByRole("button", { name: "Recipes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Access Protocol" })).not.toBeInTheDocument();
    expect(screen.queryByText("Master Nutrition Protocol 2024")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View All Plans" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create New Nutritional Plan" })).toBeInTheDocument();
  });

  it("opens the meal plan quick action menu and closes it from the page overlay", () => {
    render(createElement(MealPlansPage));

    fireEvent.click(screen.getAllByRole("button", { name: /more actions for/i })[0]);

    const menu = screen.getByRole("menu", { name: /meal plan actions/i });
    expect(menu).toHaveClass("z-[60]");
    expect(menu.closest("article")).toHaveClass("z-40");
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close meal plan actions" }));

    expect(screen.queryByRole("menu", { name: /meal plan actions/i })).not.toBeInTheDocument();
  });

  it("runs meal plan quick actions for edit, copy, delete, and assign", () => {
    render(createElement(MealPlansPage));

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(screen.getByText("Hypertrophy Phase II (copy)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II (copy)" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.queryByText("Hypertrophy Phase II (copy)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Assign to" }));
    expect(screen.getByRole("dialog", { name: "Assign Meal Plan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search clients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByRole("heading", { level: 2, name: "Hypertrophy Phase II" })).toBeInTheDocument();
  });

  it("opens the selected meal plan from the row edit button", () => {
    render(createElement(MealPlansPage));

    fireEvent.click(screen.getByRole("button", { name: "Edit Hypertrophy Phase II" }));

    expect(screen.getByRole("heading", { level: 2, name: "Hypertrophy Phase II" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nutrition plan title")).toHaveValue("Hypertrophy Phase II");
    expect(screen.getByText("2800 Kcal")).toBeInTheDocument();
    expect(screen.getByText("210 g Protein")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Nutrition Plan & Close" })).toBeInTheDocument();
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

    expect(await screen.findByText("Persisted Hypertrophy Fuel")).toBeInTheDocument();
    expect(screen.getByText("1 active client")).toBeInTheDocument();
    expect(screen.getByText("2900 cal")).toBeInTheDocument();
    expect(screen.getByText("P 215g")).toBeInTheDocument();
    expect(screen.queryByText("Persisted Nutrition Client")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Meal Templates" }));

    expect(screen.getByRole("tabpanel", { name: "Meal Templates" })).toHaveTextContent(
      "Hypertrophy protocol"
    );
    expect(screen.queryByText("High-Protein Breakfast Bowl")).not.toBeInTheDocument();
  });

  it("opens a create nutritional plan chooser before building a plan", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));

    expect(screen.getByRole("dialog", { name: "Create new nutritional plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full Meal Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Macro Only Meal Plan" })).toBeInTheDocument();
  });

  it("saves a full meal plan into the meal plans tab", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));

    expect(screen.getByRole("heading", { level: 2, name: "New Nutrition Plan" })).toBeInTheDocument();
    expect(screen.getByText("DAY TOTAL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nutrition plan title"), { target: { value: "Contest Prep Meal Plan" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Nutrition Plan & Close" }));

    expect(await screen.findByText("Nutrition plan added to Meal Plans.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("tabpanel", { name: "Meal Plans" })).toHaveTextContent("Contest Prep Meal Plan");
  });

  it("builds full meal plans with editable meals, additional days, food search, and meal template import", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));

    expect(screen.getByRole("heading", { level: 2, name: "New Nutrition Plan" })).toBeInTheDocument();
    expect(screen.getByText("Complete Coach nutrition builder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add day" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Meal name for Day 1 meal 1"), { target: { value: "Breakfast" } });
    expect(screen.getByDisplayValue("Breakfast")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    expect(screen.getByLabelText("Meal name for Day 1 meal 2")).toHaveValue("Meal 2");

    fireEvent.click(screen.getByRole("button", { name: "Add day" }));
    expect(screen.getByLabelText("Day name for Day 2")).toHaveValue("Day 2");
    expect(screen.getByLabelText("Meal name for Day 2 meal 1")).toHaveValue("Main Meal");
    fireEvent.change(screen.getByLabelText("Day name for Day 2"), { target: { value: "High Carb Day" } });
    expect(screen.getByDisplayValue("High Carb Day")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add food" })[0]);
    const foodDrawer = screen.getByRole("dialog", { name: "Add food from database" });
    expect(foodDrawer).toHaveClass("left-0");
    expect(screen.getByRole("button", { name: "Add day" })).toBeEnabled();
    expect(within(foodDrawer).getByRole("searchbox", { name: "Search food database" })).toHaveAttribute(
      "placeholder",
      "Search foods..."
    );
    expect(within(foodDrawer).getByRole("button", { name: "AUS / NZ" })).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "EFSA" })).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "USDA" })).toBeInTheDocument();
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "USDA" }));
    expect(within(foodDrawer).getByText("Showing USDA foods")).toBeInTheDocument();
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "Select Chicken Breast" }));
    expect(within(foodDrawer).getByLabelText("Food quantity")).toHaveValue(1);
    fireEvent.change(within(foodDrawer).getByLabelText("Food quantity"), { target: { value: "2" } });
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "Add selected food" }));

    const chickenRow = screen.getByRole("row", { name: /Chicken Breast 2 servings 330 kcal 62g protein 0g carbs 7.2g fat 0g fibre/i });
    expect(chickenRow).toBeInTheDocument();
    expect(screen.getByText("330 Kcal")).toBeInTheDocument();
    expect(screen.getByText("62 g Protein")).toBeInTheDocument();
    expect(screen.getByText("0 g Carbs")).toBeInTheDocument();
    expect(screen.getByText("7.2 g Fat")).toBeInTheDocument();
    expect(screen.getByText("0 g Fibre")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Micronutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Vitamins nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /B3 \(Niacin\) 27.4 mg/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Protein nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Protein 62 g/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Minerals nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Sodium 148 mg/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add meal from template" }));
    const templateDialog = screen.getByRole("dialog", { name: "Import meal from template" });
    expect(within(templateDialog).getByText("High-Protein Breakfast Bowl")).toBeInTheDocument();
    fireEvent.click(within(templateDialog).getByRole("button", { name: "Import High-Protein Breakfast Bowl" }));

    expect(screen.getByLabelText("Meal name for High Carb Day meal 2")).toHaveValue("High-Protein Breakfast Bowl");
  });

  it("builds macro-only plans from daily totals or meal-level macros", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Macro Only Meal Plan" }));

    expect(screen.getByRole("dialog", { name: "Choose macro plan type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Total For Day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Each Meal" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Total For Day" }));
    expect(screen.getByRole("heading", { level: 2, name: "Macro Only Nutrition Plan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Protein")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meal Title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to meal plans" }));

    fireEvent.click(screen.getByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Macro Only Meal Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Each Meal" }));
    expect(screen.getByLabelText("Meal Title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal" })).toBeInTheDocument();
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
      "Persisted Hypertrophy Fuel"
    );
  });

  it("falls back to fixture meal plans when the persistence API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));

    render(createElement(MealPlansPage));

    expect(await screen.findByText("Meal plan persistence API unavailable. Showing fixture meal plan library.")).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy Phase II")).toBeInTheDocument();
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
      activeClientCount: 1,
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
        },
        {
          id: "meal_assignment_api_2",
          clientId: "client_api_2",
          clientName: "Second Client",
          templateId: "meal_template_api",
          name: "Persisted Hypertrophy Fuel",
          phase: "Hypertrophy",
          targetCalories: 2800,
          proteinGrams: 210,
          carbsGrams: 280,
          fatGrams: 93,
          status: "active",
          snapshot: { targetCalories: 2900, proteinGrams: 215 },
          startsOn: "2026-05-03",
          endsOn: null,
          updatedAt: "2026-05-19T00:00:00.000Z"
        }
      ])[0]
    ).toMatchObject({
      id: "meal_template_api",
      planName: "Persisted Hypertrophy Fuel",
      activeClientCount: 2,
      calories: 2900,
      protein: 215,
      carbs: 280,
      fats: 93,
      lastEdited: "May 19, 2026"
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

    expect(await screen.findByText("Food saved.")).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes("Saved"))).toBe(true);
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
