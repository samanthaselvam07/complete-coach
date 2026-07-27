import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FoodDatabasePage,
  formatNutrientValue,
  formatServingSize,
  getDetailedNutrientRows,
  getFoodFibre,
  getFoodImageSrc,
  getFoodMacro,
  getFoodMacroRows,
  getFoodServing,
  getFoodSource,
  getMetadataNutrientRows,
  getPaginationPages,
  getSourceDescription,
  inferNutrientUnit,
  isApiFood,
  isDeletableFood,
  isImportedNutrient,
  isVerifiedFood,
  parseNumberInput,
  toTitleLabel
} from "@/components/nutrition/food-database-page";
import {
  appendMealTemplateToPlanTemplate,
  calculateDayTotals,
  calculateMacroDayTotals,
  calculateMacroPlanSummary,
  calculateMealTotals,
  calculateNutrientTotals,
  calculatePlanTotals,
  calculateTemplateTotals,
  calculateTdeeTargets,
  convertMeasurementToServingUnit,
  createBuilderDay,
  createBuilderDaysFromTemplate,
  createBuilderFood,
  createBuilderFoodFromTemplateFood,
  createBuilderMealsFromMealTemplate,
  createMacroBuilderDay,
  createMacroBuilderMeal,
  filterMealAssignments,
  filterMealTemplates,
  formatMealBuilderServingSize,
  getFullMealPlanTemplatePayload,
  getFoodQuantityDisplay,
  getFoodQuantityMultiplier,
  getMacroMealPlanTemplatePayload,
  getMealAssignmentRows,
  getMealTemplateCards,
  mapApiFoodToBuilderFood,
  MealPlansPage,
  normaliseServingUnit,
  parseMealBuilderNumberInput,
  parseServingAmount
} from "@/components/nutrition/meal-plans-page";
import { NutritionPage } from "@/components/nutrition/nutrition-page";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage?.clear();
});

const apiMealPlanTemplates = [
  {
    id: "meal_template_draft",
    name: "Hypertrophy Phase II",
    phase: "Full meal plan",
    targetCalories: 2900,
    proteinGrams: 215,
    carbsGrams: 305,
    fatGrams: 82,
    status: "draft",
    template: { days: [{ name: "Day 1", meals: [{ meal: "Main Meal", foods: [] }] }] },
    updatedAt: "2026-05-18T00:00:00.000Z"
  },
  {
    id: "meal_template_breakfast",
    name: "High-Protein Breakfast Bowl",
    phase: "Meal template",
    targetCalories: 520,
    proteinGrams: 45,
    carbsGrams: 55,
    fatGrams: 12,
    status: "published",
    template: {
      recipe: {
        prepTimeMinutes: 10,
        cookTimeMinutes: 15
      },
      days: []
    },
    updatedAt: "2026-05-19T00:00:00.000Z"
  }
];

function mockMealPlanLibrary() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);

    if (url === "/api/v1/meal-plan-templates/meal_template_draft" && init?.method === "DELETE") {
      return Promise.resolve(new Response(JSON.stringify({ data: { id: "meal_template_draft", deleted: true } }), { status: 200 }));
    }

    if (url === "/api/v1/meal-plan-templates/meal_template_draft" && init?.method === "PATCH") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              ...apiMealPlanTemplates[0],
              name: "Hypertrophy Phase II",
              updatedAt: "2026-05-20T00:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/meal-plan-templates" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { name?: string; phase?: string; targetCalories?: number };

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: `meal_template_created_${body.name ?? "copy"}`,
              name: body.name ?? "Copied Meal Plan",
              phase: body.phase ?? "Full meal plan",
              targetCalories: body.targetCalories ?? 0,
              proteinGrams: 0,
              carbsGrams: 0,
              fatGrams: 0,
              status: "draft",
              template: { days: [] },
              updatedAt: "2026-05-20T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      );
    }

    if (url.startsWith("/api/v1/meal-plan-templates")) {
      return Promise.resolve(new Response(JSON.stringify({ data: apiMealPlanTemplates }), { status: 200 }));
    }

    if (url.startsWith("/api/v1/meal-plan-assignments")) {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }

    if (url.startsWith("/api/v1/clients")) {
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
    }

    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });
}

const apiFoods = [
  {
    id: "food_usda_chicken",
    scope: "global",
    name: "Chicken Breast",
    category: "Protein",
    servingSize: "100g",
    calories: 165,
    proteinGrams: 31,
    carbsGrams: 0,
    fatGrams: 3.6,
    fiberGrams: 0,
    metadata: {
      sourceId: "usda_fdc",
      nutrientsPer100g: [
        { name: "B3 (Niacin)", unit: "mg", value: 13.7 },
        { name: "Sodium", unit: "mg", value: 74 }
      ]
    }
  },
  {
    id: "food_aus_rice",
    scope: "global",
    name: "Basmati Rice",
    category: "Carbohydrate",
    servingSize: "100g",
    calories: 121,
    proteinGrams: 3,
    carbsGrams: 25,
    fatGrams: 0.4,
    fiberGrams: 0.4,
    metadata: { sourceId: "fsanz_ausnut" }
  },
  {
    id: "food_efsa_avocado",
    scope: "global",
    name: "Raw Avocado",
    category: "Fat",
    servingSize: "100g",
    calories: 160,
    proteinGrams: 2,
    carbsGrams: 9,
    fatGrams: 15,
    fiberGrams: 7,
    metadata: { sourceId: "efsa_foodex2" }
  }
];

function mockFoodLibrary() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: apiFoods }), { status: 200 })
  );
}

describe("NutritionPage", () => {
  it("renders the persisted meal plan library shell without overview fixtures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(NutritionPage));

    expect(screen.getByRole("heading", { level: 1, name: "Meal Plan Library" })).toBeInTheDocument();
    expect(await screen.findByText("No active meal plans have been assigned yet.")).toBeInTheDocument();
    expect(screen.queryByText("Active Meal Plans")).not.toBeInTheDocument();
    expect(screen.queryByText("High Performance Macro Split")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Meal Logs")).not.toBeInTheDocument();
  });
});

describe("MealPlansPage", () => {
  it("switches between persisted meal plans and recipes", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    expect(screen.getByRole("heading", { level: 1, name: "Meal Plan Library" })).toBeInTheDocument();
    expect(await screen.findByText("Hypertrophy Phase II")).toBeInTheDocument();

    const mealPlanSearch = screen.getByRole("searchbox", { name: "Search meal plans" });
    expect(mealPlanSearch).toHaveAttribute("placeholder", "Search meal plans...");

    fireEvent.change(mealPlanSearch, { target: { value: "zzzz" } });
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();

    fireEvent.change(mealPlanSearch, { target: { value: "hypertrophy" } });
    expect(screen.getByText("Hypertrophy Phase II")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Recipes" }));

    const templateSearch = screen.getByRole("searchbox", { name: "Search recipes" });
    expect(templateSearch).toHaveValue("");
    expect(templateSearch).toHaveAttribute("placeholder", "Search recipes...");

    expect(screen.getByRole("tabpanel", { name: "Recipes" })).toHaveTextContent(
      "High-Protein Breakfast Bowl"
    );
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();

    fireEvent.change(templateSearch, { target: { value: "breakfast" } });
    expect(screen.getByRole("tabpanel", { name: "Recipes" })).toHaveTextContent(
      "High-Protein Breakfast Bowl"
    );
  });

  it("renders meal-plan actions", () => {
    render(createElement(MealPlansPage));

    expect(screen.queryByRole("button", { name: "Recipes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Access Protocol" })).not.toBeInTheDocument();
    expect(screen.queryByText("Master Nutrition Protocol 2024")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View All Plans" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create New Nutritional Plan" })).toBeInTheDocument();
  });

  it("renders meal plans as a list-only library", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    expect(await screen.findByText("Hypertrophy Phase II")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Meal plan list" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Meal plan cards" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Card view" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List view" })).not.toBeInTheDocument();
  });

  it("toggles recipes between card and list views", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Recipes" }));

    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Recipe cards" })).toBeInTheDocument();
    expect(screen.getByText("High-Protein Breakfast Bowl")).toBeInTheDocument();
    expect(screen.getByText("Prep 10 min")).toBeInTheDocument();
    expect(screen.getByText("Cook 15 min")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit recipe for High-Protein Breakfast Bowl" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use Recipe" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    const templateTable = screen.getByRole("table", { name: "Recipe list" });
    const templateRow = within(templateTable).getByRole("row", {
      name: /High-Protein Breakfast Bowl Recipe protocol/i
    });

    expect(templateTable).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Recipe cards" })).not.toBeInTheDocument();
    expect(templateRow).toHaveTextContent("520 cal");
    expect(templateRow).toHaveTextContent("P 45g");
    expect(templateRow).toHaveTextContent("C 55g");
    expect(templateRow).toHaveTextContent("F 12g");

    fireEvent.click(screen.getByRole("button", { name: "Card view" }));
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Recipe cards" })).toBeInTheDocument();
  });

  it("opens the meal plan quick action menu and closes it from the page overlay", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "More actions for Hypertrophy Phase II" }));

    const menu = screen.getByRole("menu", { name: /meal plan actions/i });
    expect(menu).toHaveClass("z-[60]");
    expect(menu.closest("tr")).toHaveClass("z-40");
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close meal plan actions" }));

    expect(screen.queryByRole("menu", { name: /meal plan actions/i })).not.toBeInTheDocument();
  });

  it("opens recipe list quick actions and closes them from the page overlay", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for High-Protein Breakfast Bowl" }));

    const menu = screen.getByRole("menu", { name: /meal plan actions for high-protein breakfast bowl/i });
    const templateTable = screen.getByRole("table", { name: "Recipe list" });
    const templateRow = within(templateTable).getByRole("row", {
      name: /High-Protein Breakfast Bowl Recipe protocol/i
    });

    expect(menu).toHaveClass("z-[60]");
    expect(templateRow).toHaveClass("z-40");
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Use recipe in existing meal plan" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close recipe actions" }));

    expect(screen.queryByRole("menu", { name: /meal plan actions for high-protein breakfast bowl/i })).not.toBeInTheDocument();
  });

  it("runs meal plan quick actions for edit, unavailable copy, delete, and assign", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(screen.getByText("Hypertrophy Phase II could not be copied until database-backed copy is available.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Assign to" }));
    expect(screen.getByRole("dialog", { name: "Assign Meal Plan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search clients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByRole("heading", { level: 2, name: "Hypertrophy Phase II" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to meal plans" }));
    fireEvent.click(await screen.findByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(await screen.findByText("Hypertrophy Phase II deleted from Meal Plans.")).toBeInTheDocument();
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();
  });

  it("opens the selected persisted meal plan from the row edit button", async () => {
    mockMealPlanLibrary();
    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Edit Hypertrophy Phase II" }));

    expect(screen.getByRole("heading", { level: 2, name: "Hypertrophy Phase II" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nutrition plan title")).toHaveValue("Hypertrophy Phase II");
    expect(screen.getByText("0/2900 Kcal")).toBeInTheDocument();
    expect(screen.getByText("0/215 g Protein")).toBeInTheDocument();
    expect(screen.getByText("0/305 g Carbs")).toBeInTheDocument();
    expect(screen.getByText("0/82 g Fat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("opens persisted meal plan ingredients and saves edits back to the same plan", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/meal-plan-templates") && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "meal_template_existing",
                name: "Edited Hypertrophy Fuel",
                phase: "Full meal plan",
                targetCalories: 452,
                proteinGrams: 34,
                carbsGrams: 25,
                fatGrams: 4,
                status: "draft",
                template: {
                  days: [
                    {
                      name: "Day 1",
                      meals: [
                        {
                          meal: "Breakfast",
                          foods: [
                            {
                              foodId: "chicken-breast",
                              foodName: "Chicken Breast",
                              servingSize: "200 g",
                              calories: 330,
                              proteinGrams: 62,
                              carbsGrams: 0,
                              fatGrams: 7.2,
                              fiberGrams: 0,
                              quantity: 2,
                              measurementUnit: "g"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                updatedAt: "2026-06-17T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_template_existing",
                  name: "Persisted Hypertrophy Fuel",
                  phase: "Full meal plan",
                  targetCalories: 452,
                  proteinGrams: 34,
                  carbsGrams: 25,
                  fatGrams: 4,
                  status: "draft",
                  template: {
                    days: [
                      {
                        name: "Day 1",
                        meals: [
                          {
                            meal: "Breakfast",
                            foods: [
                              {
                                foodId: "chicken-breast",
                                foodName: "Chicken Breast",
                                servingSize: "200 g",
                                calories: 330,
                                proteinGrams: 62,
                                carbsGrams: 0,
                                fatGrams: 7.2,
                                fiberGrams: 0,
                                quantity: 2,
                                measurementUnit: "g"
                              },
                              {
                                foodId: "basmati-rice",
                                foodName: "Basmati Rice",
                                servingSize: "100 g",
                                calories: 121,
                                proteinGrams: 3,
                                carbsGrams: 25,
                                fatGrams: 0.4,
                                fiberGrams: 0.4,
                                quantity: 1,
                                measurementUnit: "g"
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  updatedAt: "2026-06-16T00:00:00.000Z"
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

    fireEvent.click(await screen.findByRole("button", { name: "Edit Persisted Hypertrophy Fuel" }));

    expect(screen.getByLabelText("Nutrition plan title")).toHaveValue("Persisted Hypertrophy Fuel");
    expect(screen.getByRole("row", { name: /Chicken Breast 400 g 330 kcal 62g protein/i })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Basmati Rice 100 g 121 kcal 3g protein/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nutrition plan title"), { target: { value: "Edited Hypertrophy Fuel" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Nutrition plan saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates/meal_template_existing",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("Edited Hypertrophy Fuel")
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("loads persisted recipes and assignments when the API is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                ...apiMealPlanTemplates
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
    expect(screen.getAllByText("2900 cal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("P 215g").length).toBeGreaterThan(0);
    expect(screen.queryByText("Persisted Nutrition Client")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Recipes" }));

    expect(screen.getByRole("tabpanel", { name: "Recipes" })).toHaveTextContent(
      "Recipe protocol"
    );
    expect(screen.getByText("High-Protein Breakfast Bowl")).toBeInTheDocument();
  });

  it("deletes persisted draft meal plans through the template API so reloads do not restore them", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates/meal_template_draft" && init?.method === "DELETE") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "meal_template_draft", deleted: true } }), { status: 200 }));
      }

      if (url === "/api/v1/meal-plan-templates/meal_template_api" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Meal plan could not be updated." } }), {
            status: 404
          })
        );
      }

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_template_draft",
                  name: "Draft Cut Plan",
                  phase: "Full meal plan",
                  targetCalories: 2100,
                  proteinGrams: 180,
                  carbsGrams: 190,
                  fatGrams: 60,
                  status: "draft",
                  template: { days: [] },
                  updatedAt: "2026-06-17T00:00:00.000Z"
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

    expect(await screen.findByText("Draft Cut Plan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Draft Cut Plan" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(await screen.findByText("Draft Cut Plan deleted from Meal Plans.")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/meal-plan-templates/meal_template_draft",
        expect.objectContaining({ method: "DELETE" })
      )
    );
    expect(screen.queryByText("Draft Cut Plan")).not.toBeInTheDocument();
  });

  it("opens recipe details and saves edits to the selected recipe", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates/meal_template_api" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "meal_template_api",
                name: "Edited Breakfast Template",
                phase: "Meal template",
                targetCalories: 451,
                proteinGrams: 65,
                carbsGrams: 25,
                fatGrams: 7.6,
                status: "published",
                template: {
                  days: [
                    {
                      name: "Template Day",
                      meals: [
                        {
                          meal: "Breakfast",
                          notes: "Use pre-workout on heavy leg days.",
                          foods: [
                            {
                              foodId: "chicken-breast",
                              foodName: "Chicken Breast",
                              servingSize: "200 g",
                              calories: 330,
                              proteinGrams: 62,
                              carbsGrams: 0,
                              fatGrams: 7.2
                            },
                            {
                              foodId: "basmati-rice",
                              foodName: "Basmati Rice",
                              servingSize: "100 g",
                              calories: 121,
                              proteinGrams: 3,
                              carbsGrams: 25,
                              fatGrams: 0.4
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                updatedAt: "2026-06-17T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/foods")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "blueberries",
                  name: "Blueberries",
                  category: "Fruit",
                  servingSize: "100 g",
                  calories: 57,
                  proteinGrams: 0.7,
                  carbsGrams: 14.5,
                  fatGrams: 0.3,
                  fiberGrams: 2.4,
                  metadata: { source: "AUS/NZ" }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/meal-plan-templates/photo-upload-url" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                objectKey: "organizations/org_1/nutrition/recipes/photos/11111111-1111-4111-8111-111111111111.jpg",
                photoUrl: "r2://organizations/org_1/nutrition/recipes/photos/11111111-1111-4111-8111-111111111111.jpg",
                uploadUrl: "https://uploads.example.test/recipe-photo.jpg",
                method: "PUT",
                requiredHeaders: { "Content-Type": "image/jpeg" },
                maxBytes: 10 * 1024 * 1024
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "https://uploads.example.test/recipe-photo.jpg" && init?.method === "PUT") {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      if (url.startsWith("/api/v1/meal-plan-templates/photo-url")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { url: "https://uploads.example.test/signed-recipe-photo.jpg" } }), {
            status: 200
          })
        );
      }

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "meal_template_api",
                  name: "Persisted Breakfast Template",
                  phase: "Meal template",
                  targetCalories: 451,
                  proteinGrams: 65,
                  carbsGrams: 25,
                  fatGrams: 7.6,
                  status: "published",
                  template: {
                    recipe: {
                      prepTimeMinutes: 10,
                      cookTimeMinutes: 20,
                      servings: 2,
                      servingSize: "1 bowl",
                      photoUrl: "https://example.com/breakfast-bowl.jpg",
                      instructions: "Cook chicken and rice, then portion into bowls.",
                      instructionSteps: ["Cook chicken and rice.", "Portion into bowls."]
                    },
                    days: [
                      {
                        name: "Template Day",
                        meals: [
                          {
                            meal: "Breakfast",
                            notes: "Prep oats with cinnamon.",
                            foods: [
                              {
                                foodId: "chicken-breast",
                                foodName: "Chicken Breast",
                                servingSize: "200 g",
                                calories: 330,
                                proteinGrams: 62,
                                carbsGrams: 0,
                                fatGrams: 7.2,
                                fiberGrams: 0,
                                quantity: 200,
                                measurementUnit: "g"
                              },
                              {
                                foodId: "basmati-rice",
                                foodName: "Basmati Rice",
                                servingSize: "100 g",
                                calories: 121,
                                proteinGrams: 3,
                                carbsGrams: 25,
                                fatGrams: 0.4,
                                fiberGrams: 1,
                                quantity: 100,
                                measurementUnit: "g"
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  updatedAt: "2026-06-16T00:00:00.000Z"
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

    fireEvent.click(await screen.findByRole("tab", { name: "Recipes" }));
    expect(await screen.findByRole("img", { name: "Persisted Breakfast Template photo" })).toHaveAttribute(
      "src",
      "https://example.com/breakfast-bowl.jpg"
    );
    expect(screen.getByText("Prep 10 min")).toBeInTheDocument();
    expect(screen.getByText("Cook 20 min")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Edit recipe for Persisted Breakfast Template" }));

    expect(screen.getByText("Recipe builder")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persisted Breakfast Template")).toBeInTheDocument();
    expect(screen.getByLabelText("Prep time (min)")).toHaveValue(10);
    expect(screen.getByLabelText("Cook time (min)")).toHaveValue(20);
    expect(screen.getByLabelText("Servings")).toHaveValue(2);
    expect(screen.getByLabelText("Serving size")).toHaveValue("1 bowl");
    expect(screen.getByLabelText("Recipe photo URL")).toHaveValue("https://example.com/breakfast-bowl.jpg");
    expect(screen.getByRole("heading", { name: "Nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue("Chicken Breast");
    expect(screen.getByLabelText("Chicken Breast quantity")).toHaveValue(200);
    expect(screen.getByLabelText("Basmati Rice serving")).toHaveValue("100 g");

    fireEvent.change(screen.getByLabelText("Recipe name"), { target: { value: "Edited Breakfast Template" } });
    fireEvent.change(screen.getByLabelText("Prep time (min)"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Cook time (min)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Servings"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Serving size"), { target: { value: "1 meal prep bowl" } });
    fireEvent.change(screen.getByLabelText("Recipe photo URL"), { target: { value: "https://example.com/updated-bowl.jpg" } });
    fireEvent.change(screen.getByLabelText("Upload recipe photo"), {
      target: { files: [new File(["recipe photo"], "recipe-photo.jpg", { type: "image/jpeg" })] }
    });
    expect(await screen.findByText("recipe-photo.jpg uploaded.")).toBeInTheDocument();
    expect(screen.getByLabelText("Recipe photo URL")).toHaveValue(
      "r2://organizations/org_1/nutrition/recipes/photos/11111111-1111-4111-8111-111111111111.jpg"
    );
    fireEvent.change(screen.getByLabelText("Chicken Breast quantity"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 name"), { target: { value: "Grilled Chicken Breast" } });
    fireEvent.change(screen.getByLabelText("Grilled Chicken Breast serving"), { target: { value: "100 g cooked" } });
    fireEvent.change(screen.getByLabelText("Grilled Chicken Breast calories"), { target: { value: "180" } });
    fireEvent.click(screen.getByRole("button", { name: "Add food" }));
    const foodDrawer = screen.getByRole("dialog", { name: "Add food from database" });
    fireEvent.change(within(foodDrawer).getByRole("searchbox", { name: "Search food database" }), { target: { value: "blue" } });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/v1/foods"))).toBe(true)
    );
    fireEvent.click(await within(foodDrawer).findByRole("checkbox", { name: "Select Blueberries" }));
    fireEvent.change(within(foodDrawer).getByLabelText("Quantity for Blueberries"), { target: { value: "150" } });
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "Add selected foods" }));
    expect(screen.getByLabelText("Ingredient 3 name")).toHaveValue("Blueberries");
    expect(screen.getByLabelText("Blueberries quantity")).toHaveValue(150);
    fireEvent.click(screen.getByRole("tab", { name: /instructions/i }));
    expect(screen.getByLabelText("Recipe step 1")).toHaveValue("Cook chicken and rice.");
    expect(screen.getByLabelText("Recipe step 2")).toHaveValue("Portion into bowls.");
    fireEvent.change(screen.getByLabelText("Recipe step 1"), { target: { value: "Cook fresh rice and chicken." } });
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    fireEvent.change(screen.getByLabelText("Recipe step 3"), { target: { value: "Garnish before serving." } });
    fireEvent.change(screen.getByLabelText("Notes for Breakfast"), { target: { value: "Use pre-workout on heavy leg days." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));

    expect(await screen.findByText("Edited Breakfast Template saved to Recipes.")).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/v1/meal-plan-templates/meal_template_api" && (init as RequestInit | undefined)?.method === "PATCH"
    );
    expect(patchCall).toBeDefined();
    const patchBody = JSON.parse(String((patchCall?.[1] as RequestInit).body));
    expect(patchBody.template.recipe).toEqual({
      prepTimeMinutes: 12,
      cookTimeMinutes: 25,
      servings: 3,
      servingSize: "1 meal prep bowl",
      photoUrl: "r2://organizations/org_1/nutrition/recipes/photos/11111111-1111-4111-8111-111111111111.jpg",
      instructions: "Cook fresh rice and chicken.\n\nPortion into bowls.\n\nGarnish before serving.",
      instructionSteps: ["Cook fresh rice and chicken.", "Portion into bowls.", "Garnish before serving."]
    });
    expect(patchBody.template.days[0].meals[0].foods[0]).toMatchObject({
      foodName: "Grilled Chicken Breast",
      servingSize: "100 g cooked",
      quantity: 100,
      calories: 180,
      proteinGrams: 31,
      carbsGrams: 0,
      fatGrams: 3.6
    });
    expect(patchBody.template.days[0].meals[0].foods[2]).toMatchObject({
      foodId: "blueberries",
      foodName: "Blueberries",
      servingSize: "150 g",
      quantity: 150,
      calories: 85.5,
      proteinGrams: 1,
      carbsGrams: 21.8,
      fatGrams: 0.5,
      fiberGrams: 3.6
    });
    expect(patchBody.template.days[0].meals[0].notes).toBe("Use pre-workout on heavy leg days.");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("opens a create nutritional plan chooser before building a plan", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));

    expect(screen.getByRole("dialog", { name: "Create new nutritional plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full Meal Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Macro Only Meal Plan" })).toBeInTheDocument();
  });

  it("searches imported AUS/NZ foods from the nutrition builder selector", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/foods")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "food_ausnut_kangaroo",
                  scope: "global",
                  name: "AUSNUT Kangaroo Steak",
                  category: "Meat",
                  servingSize: "100g",
                  calories: 103,
                  proteinGrams: 22,
                  carbsGrams: 0,
                  fatGrams: 1,
                  fiberGrams: 0,
                  metadata: {
                    sourceId: "fsanz_ausnut",
                    sourceVersion: "2023"
                  }
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

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add food" }));

    const foodDrawer = screen.getByRole("dialog", { name: "Add food from database" });
    fireEvent.change(within(foodDrawer).getByRole("searchbox", { name: "Search food database" }), {
      target: { value: "kangaroo" }
    });

    expect(await within(foodDrawer).findByRole("checkbox", { name: "Select AUSNUT Kangaroo Steak" })).toBeInTheDocument();
    expect(within(foodDrawer).getByLabelText("Verified database food")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/foods?limit=50&source=AUS%2FNZ&sort=recent&search=kangaroo"))
    );
  });

  it("quick-adds a custom food from the nutrition builder selector", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/foods" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "food_custom_blueberries",
                scope: "private",
                name: "Coach Blueberries",
                category: "Custom",
                servingSize: "150 Grams",
                calories: 85,
                proteinGrams: 1,
                carbsGrams: 21,
                fatGrams: 0,
                fiberGrams: 4,
                metadata: {
                  source: "AUS/NZ",
                  servingDescription: "Grams"
                }
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add food" }));

    const foodDrawer = screen.getByRole("dialog", { name: "Add food from database" });
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "+ Quick add food" }));

    const quickAddDialog = screen.getByRole("dialog", { name: "Add Own Food item for your nutrition plan" });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter food name"), { target: { value: "Coach Blueberries" } });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter total calories"), { target: { value: "85" } });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter total protein"), { target: { value: "1" } });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter total carbs"), { target: { value: "21" } });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter total fat"), { target: { value: "0" } });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter total fiber"), { target: { value: "4" } });
    fireEvent.change(within(quickAddDialog).getByPlaceholderText("Enter serving size"), { target: { value: "150" } });
    fireEvent.click(within(quickAddDialog).getByRole("button", { name: "Add" }));

    expect(await within(foodDrawer).findByRole("checkbox", { name: "Select Coach Blueberries" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/foods",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Coach Blueberries")
      })
    );
  });

  it("saves and closes a full meal plan through the persistence API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "meal_plan_saved",
                name: "Contest Prep Meal Plan",
                phase: "Full meal plan",
                targetCalories: 0,
                proteinGrams: 0,
                carbsGrams: 0,
                fatGrams: 0,
                status: "draft",
                template: { days: [{ name: "Day 1", meals: [{ meal: "Main Meal", foods: [] }] }] },
                updatedAt: "2026-06-17T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));

    expect(screen.getByRole("heading", { level: 2, name: "New Nutrition Plan" })).toBeInTheDocument();
    expect(screen.getByText("DAY TOTAL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nutrition plan title"), { target: { value: "Contest Prep Meal Plan" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & Close" }));

    expect(await screen.findByText("Nutrition plan saved.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.queryByText("DAY TOTAL")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Meal Plans" })).toHaveTextContent("Contest Prep Meal Plan");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Contest Prep Meal Plan")
      })
    );
  });

  it("applies TDEE calculator targets to full meal plan day totals", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "TDEE Calculator" }));

    const dialog = screen.getByRole("dialog", { name: "TDEE calculator" });
    const [ageInput, heightInput, weightInput] = within(dialog).getAllByRole("spinbutton");
    fireEvent.change(ageInput, { target: { value: "32" } });
    fireEvent.change(heightInput, { target: { value: "165" } });
    fireEvent.change(weightInput, { target: { value: "70" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply to meal plan" }));

    expect(screen.queryByRole("dialog", { name: "TDEE calculator" })).not.toBeInTheDocument();
    expect(screen.getByText("0/2189 Kcal")).toBeInTheDocument();
    expect(screen.getByText("0/164 g Protein")).toBeInTheDocument();
    expect(screen.getByText("0/219 g Carbs")).toBeInTheDocument();
    expect(screen.getByText("0/73 g Fat")).toBeInTheDocument();
  });

  it("builds full meal plans with editable day tabs, meal actions, food search, and recipe import", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          name?: string;
          phase?: string;
          targetCalories?: number;
          proteinGrams?: number;
          carbsGrams?: number;
          fatGrams?: number;
          status?: string;
          template?: unknown;
        };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: `meal_template_${body.name ?? "created"}`,
                name: body.name ?? "Created Meal Template",
                phase: body.phase ?? "Meal template",
                targetCalories: body.targetCalories ?? 0,
                proteinGrams: body.proteinGrams ?? 0,
                carbsGrams: body.carbsGrams ?? 0,
                fatGrams: body.fatGrams ?? 0,
                status: body.status ?? "published",
                template: body.template ?? { days: [] },
                updatedAt: "2026-06-18T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      if (url.startsWith("/api/v1/foods")) {
        return Promise.resolve(new Response(JSON.stringify({ data: apiFoods }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Full Meal Plan" }));

    expect(screen.getByRole("heading", { level: 2, name: "New Nutrition Plan" })).toBeInTheDocument();
    expect(screen.getByText("Complete Coach nutrition builder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Day actions" }).compareDocumentPosition(screen.getByRole("tab", { name: "Day 1" }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    fireEvent.change(screen.getByLabelText("Meal name for Day 1 meal 1"), { target: { value: "Breakfast" } });
    expect(screen.getByDisplayValue("Breakfast")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    expect(screen.getByLabelText("Meal name for Day 1 meal 2")).toHaveValue("Meal 2");
    fireEvent.change(screen.getByLabelText("Meal name for Day 1 meal 2"), { target: { value: "Lunch" } });

    fireEvent.click(screen.getByRole("button", { name: "Add day" }));
    expect(screen.getByRole("tab", { name: "Day 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("0 Kcal")).toBeInTheDocument();
    expect(screen.getByText("0 g Protein")).toBeInTheDocument();
    expect(screen.getByText("0 g Carbs")).toBeInTheDocument();
    expect(screen.getByText("0 g Fat")).toBeInTheDocument();
    expect(screen.getByText("0 g Fibre")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meal name for Day 1 meal 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Day name for Day 2")).toHaveValue("Day 2");
    expect(screen.getByLabelText("Meal name for Day 2 meal 1")).toHaveValue("Main Meal");
    fireEvent.change(screen.getByLabelText("Day name for Day 2"), { target: { value: "High Carb Day" } });
    expect(screen.getByDisplayValue("High Carb Day")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "High Carb Day" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate day" }));
    expect(screen.getByRole("tab", { name: "High Carb Day copy" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete day" }));
    expect(screen.queryByRole("tab", { name: "High Carb Day copy" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "High Carb Day" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Day 1" }));
    expect(screen.getByLabelText("Meal name for Day 1 meal 1")).toHaveValue("Breakfast");
    fireEvent.click(screen.getAllByRole("button", { name: "Meal actions" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Create recipe" }));
    expect(await screen.findByText("Breakfast saved to Recipes.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Meal actions" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy to another day" }));
    const copyDialog = screen.getByRole("dialog", { name: "Copy meal to another day" });
    fireEvent.click(within(copyDialog).getByRole("button", { name: "Copy to High Carb Day" }));
    fireEvent.click(screen.getByRole("tab", { name: "High Carb Day" }));
    expect(screen.getByLabelText("Meal name for High Carb Day meal 2")).toHaveValue("Breakfast");

    fireEvent.click(screen.getAllByRole("button", { name: "Add food" })[0]);
    const foodDrawer = screen.getByRole("dialog", { name: "Add food from database" });
    expect(foodDrawer).toHaveAttribute("aria-modal", "true");
    expect(foodDrawer).toHaveClass("h-[86vh]");
    expect(foodDrawer).toHaveClass("max-w-6xl");
    expect(await within(foodDrawer).findByRole("checkbox", { name: "Select Basmati Rice" })).toBeInTheDocument();
    expect(within(foodDrawer).getAllByLabelText("Verified database food")[0]).toBeInTheDocument();
    expect(within(foodDrawer).queryByText("Verified")).not.toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "+ Quick add food" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add day" })).toBeEnabled();
    expect(within(foodDrawer).getByRole("searchbox", { name: "Search food database" })).toHaveAttribute(
      "placeholder",
      "Search foods..."
    );
    expect(within(foodDrawer).getByRole("button", { name: "AUS/NZ" })).toBeInTheDocument();
    expect(within(foodDrawer).queryByRole("button", { name: "EFSA" })).not.toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "USDA" })).toBeInTheDocument();
    expect(within(foodDrawer).getByText("Showing recent AUS/NZ foods")).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("list", { name: "Selectable foods" })).toBeInTheDocument();
    expect(within(foodDrawer).queryByRole("checkbox", { name: "Select Chicken Breast" })).not.toBeInTheDocument();
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "USDA" }));
    expect(within(foodDrawer).getByText("Showing recent USDA foods")).toBeInTheDocument();
    expect(await within(foodDrawer).findByRole("checkbox", { name: "Select Chicken Breast" })).toBeInTheDocument();
    expect(within(foodDrawer).queryByRole("checkbox", { name: "Select Basmati Rice" })).not.toBeInTheDocument();
    fireEvent.click(within(foodDrawer).getByRole("checkbox", { name: "Select Chicken Breast" }));
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "AUS/NZ" }));
    fireEvent.click(await within(foodDrawer).findByRole("checkbox", { name: "Select Basmati Rice" }));
    const selectedFoodsRegion = within(foodDrawer).getByRole("region", { name: "Selected foods" });
    expect(selectedFoodsRegion).toHaveClass("lg:min-w-[26rem]");
    expect(within(selectedFoodsRegion).getByRole("list", { name: "Selected food quantity list" })).toHaveClass("overflow-y-auto");
    expect(within(selectedFoodsRegion).getAllByRole("listitem")).toHaveLength(2);
    expect(within(foodDrawer).getByLabelText("Quantity for Chicken Breast")).toHaveValue(100);
    expect(within(foodDrawer).getByLabelText("Measurement for Chicken Breast")).toHaveClass("w-full");
    fireEvent.change(within(foodDrawer).getByLabelText("Quantity for Chicken Breast"), { target: { value: "200" } });
    fireEvent.change(within(foodDrawer).getByLabelText("Measurement for Chicken Breast"), { target: { value: "g" } });
    expect(within(foodDrawer).getByLabelText("Quantity for Basmati Rice")).toHaveValue(100);
    fireEvent.change(within(foodDrawer).getByLabelText("Quantity for Basmati Rice"), { target: { value: "1" } });
    fireEvent.change(within(foodDrawer).getByLabelText("Measurement for Basmati Rice"), { target: { value: "cups" } });
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "Add selected foods" }));

    const chickenRow = screen.getByRole("row", { name: /Chicken Breast 200 g 330 kcal 62g protein 0g carbs 7.2g fat 0g fibre/i });
    expect(chickenRow).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Basmati Rice 1 cups 121 kcal 3g protein 25g carbs 0.4g fat 0.4g fibre/i })).toBeInTheDocument();
    expect(within(chickenRow).queryByText("100g, Boneless")).not.toBeInTheDocument();
    expect(within(chickenRow).getByLabelText("Quantity for Chicken Breast")).toHaveValue(200);
    fireEvent.change(within(chickenRow).getByLabelText("Quantity for Chicken Breast"), { target: { value: "250" } });
    expect(
      screen.getByRole("row", { name: /Chicken Breast 250 g 412.5 kcal 77.5g protein 0g carbs 9g fat 0g fibre/i })
    ).toBeInTheDocument();
    expect(screen.getByText("533.5 Kcal")).toBeInTheDocument();
    expect(screen.getByText("80.5 g Protein")).toBeInTheDocument();
    expect(screen.getByText("25 g Carbs")).toBeInTheDocument();
    expect(screen.getByText("9.4 g Fat")).toBeInTheDocument();
    expect(screen.getByText("0.4 g Fibre")).toBeInTheDocument();
    expect(within(chickenRow).getByRole("button", { name: "Delete Chicken Breast" })).toBeInTheDocument();
    fireEvent.click(within(chickenRow).getByRole("button", { name: "Delete Chicken Breast" }));
    expect(screen.queryByRole("row", { name: /Chicken Breast/i })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Basmati Rice 1 cups 121 kcal 3g protein 25g carbs 0.4g fat 0.4g fibre/i })).toBeInTheDocument();
    expect(screen.getByText("121 Kcal")).toBeInTheDocument();
    expect(screen.getByText("3 g Protein")).toBeInTheDocument();
    expect(screen.getByText("25 g Carbs")).toBeInTheDocument();
    expect(screen.getByText("0.4 g Fat")).toBeInTheDocument();
    expect(screen.getByText("0.4 g Fibre")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Protein nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Protein 3 g/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Carbohydrates nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Dietary Fibre 0.4 g 1%/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Lipids nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Vitamins nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /B3 \(Niacin\) - mg 0%/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Minerals nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Sodium - mg 0%/i })).toBeInTheDocument();
    expect(screen.queryByText("Dynamic totals")).not.toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Protein nutrient breakdown" }).compareDocumentPosition(screen.getByRole("table", { name: "Carbohydrates nutrient breakdown" }))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    fireEvent.click(screen.getAllByRole("button", { name: "Meal actions" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Create recipe" }));
    expect(await screen.findByText("Main Meal saved to Recipes.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add meal from template" }));
    fireEvent.click(screen.getByRole("button", { name: "Import Main Meal" }));
    expect(screen.queryByRole("row", { name: /Main Meal 1 serving/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Chicken Breast/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("row", { name: /Basmati Rice/i })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Add meal from template" }));
    const templateDialog = screen.getByRole("dialog", { name: "Import meal from recipe" });
    expect(within(templateDialog).getByText("Breakfast")).toBeInTheDocument();
    fireEvent.click(within(templateDialog).getByRole("button", { name: "Import Breakfast" }));

    expect(screen.getByLabelText("Meal name for High Carb Day meal 4")).toHaveValue("Breakfast");

    const firstMeal = screen.getAllByLabelText("Meal card Main Meal")[0];
    const secondMeal = screen.getAllByLabelText("Meal card Breakfast")[0];
    fireEvent.dragStart(firstMeal);
    fireEvent.dragOver(secondMeal);
    fireEvent.drop(secondMeal);
    const mealNameInputs = screen.getAllByLabelText(/Meal name for High Carb Day meal/);
    expect(mealNameInputs[0]).toHaveValue("Breakfast");

    fireEvent.click(screen.getAllByRole("button", { name: "Meal actions" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete meal" }));
    expect(screen.queryByLabelText("Meal name for High Carb Day meal 1")).not.toHaveValue("Breakfast");

    fireEvent.click(screen.getByRole("button", { name: "Back to meal plans" }));
    fireEvent.click(screen.getByRole("tab", { name: "Recipes" }));
    expect(screen.getByRole("tabpanel", { name: "Recipes" })).toHaveTextContent("Breakfast");
  });

  it("builds macro-only plans from daily totals or meal-level macros", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(MealPlansPage));

    fireEvent.click(await screen.findByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Macro Only Meal Plan" }));

    expect(screen.getByRole("dialog", { name: "Choose macro plan type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Total For Day" })).toHaveClass("bg-orange-500");
    expect(screen.getByRole("button", { name: "Each Meal" })).toHaveClass("bg-indigo-600");

    fireEvent.click(screen.getByRole("button", { name: "Total For Day" }));
    expect(screen.getByRole("heading", { level: 2, name: "Macro Only Nutrition Plan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Protein")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meal Title")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Protein"), { target: { value: "180" } });
    fireEvent.change(screen.getByLabelText("Carbs"), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText("Fat"), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText("Calories"), { target: { value: "2350" } });
    expect(screen.getByText("2350")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Add New Day" }));
    expect(screen.getByRole("tab", { name: "Day 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Protein")).toHaveValue(0);
    expect(screen.getByLabelText("Calories")).toHaveValue(0);

    fireEvent.change(screen.getByLabelText("Protein"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy / Duplicate Day" }));
    expect(screen.getByRole("tab", { name: "Day 2 copy" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Protein")).toHaveValue(120);
    fireEvent.click(screen.getByRole("button", { name: "Back to meal plans" }));

    fireEvent.click(screen.getByRole("button", { name: "Create New Nutritional Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Macro Only Meal Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Each Meal" }));
    expect(screen.getByLabelText("Meal title for meal 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Protein for Meal 1"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Carbs for Meal 1"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Fat for Meal 1"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Calories for Meal 1"), { target: { value: "620" } });
    expect(screen.getByLabelText("Total Protein (g): 45")).toBeInTheDocument();
    expect(screen.getByLabelText("Total Calories (kcal): 620")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    expect(screen.getByLabelText("Meal title for meal 2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Protein for Meal 2"), { target: { value: "35" } });
    fireEvent.change(screen.getByLabelText("Calories for Meal 2"), { target: { value: "430" } });
    expect(screen.getByLabelText("Total Protein (g): 80")).toBeInTheDocument();
    expect(screen.getByLabelText("Total Calories (kcal): 1050")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Add New Day" }));
    expect(screen.getByRole("tab", { name: "Day 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Total Protein (g): 0")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Protein for Meal 1"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy / Duplicate Day" }));
    expect(screen.getByRole("tab", { name: "Day 2 copy" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Protein for Meal 1")).toHaveValue(25);
  });

  it("adds a persisted recipe to an existing meal plan", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/meal-plan-templates")) {
        if (url === "/api/v1/meal-plan-templates/meal_template_draft" && init?.method === "PATCH") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  ...apiMealPlanTemplates[0],
                  template: JSON.parse(String(init.body)).template,
                  updatedAt: "2026-05-20T00:00:00.000Z"
                }
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: apiMealPlanTemplates
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/meal-plan-assignments" && init?.method === "POST") {
        throw new Error("Meal templates should not assign directly to clients.");
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

    fireEvent.click(await screen.findByRole("tab", { name: "Recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for High-Protein Breakfast Bowl" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Use recipe in existing meal plan" }));
    expect(screen.getByRole("dialog", { name: "Add Meal Template to Meal Plan" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Client")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Select Hypertrophy Phase II" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Meal Plan" }));

    expect(await screen.findByText("High-Protein Breakfast Bowl added to Hypertrophy Phase II.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates/meal_template_draft",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("High-Protein Breakfast Bowl")
      })
    );
    expect(screen.getByRole("tabpanel", { name: "Meal Plans" })).toHaveTextContent("Hypertrophy Phase II");
  });

  it("shows an empty meal plan library when the persistence API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));

    render(createElement(MealPlansPage));

    expect(await screen.findByText("No active meal plans have been assigned yet.")).toBeInTheDocument();
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();
  });

  it("handles non-array meal plan API payloads as empty persisted state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ data: { unexpected: true } }), { status: 200 }))
    );

    render(createElement(MealPlansPage));

    expect(await screen.findByText("No active meal plans have been assigned yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Recipes" }));

    expect(screen.getByText("No recipes exist yet. Create a recipe to start the library.")).toBeInTheDocument();
  });

  it("shows API errors when adding a recipe to an existing meal plan fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates/meal_template_api" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Meal plan could not be updated." } }), {
            status: 500
          })
        );
      }

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
                  startsOn: "2026-05-18",
                  endsOn: null,
                  updatedAt: "2026-05-18T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
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

    fireEvent.click(await screen.findByRole("tab", { name: "Recipes" }));
    fireEvent.click(screen.getByRole("button", { name: "Card view" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Recipe" }));
    fireEvent.click(screen.getByRole("radio", { name: "Select Persisted Hypertrophy Fuel" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Meal Plan" }));

    expect(await screen.findByText("Meal plan could not be updated.")).toBeInTheDocument();
  });
});

describe("meal plan view model helpers", () => {
  it("does not synthesize fixture templates and maps API templates into reusable cards", () => {
    expect(getMealTemplateCards("fixtures", [])).toEqual([]);

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

  it("does not synthesize fixture assignments and maps API assignments into active nutrition rows", () => {
    expect(getMealAssignmentRows("fixtures", [])).toEqual([]);

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

  it("filters meal plans and templates by visible library terms", () => {
    const assignments = getMealAssignmentRows("api", [
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
    ]);
    const templates = getMealTemplateCards("api", [
      {
        id: "meal_template_api",
        name: "High-Protein Breakfast Bowl",
        phase: "Breakfast",
        targetCalories: 560,
        proteinGrams: 48,
        carbsGrams: 52,
        fatGrams: 18,
        status: "published",
        template: { days: [] },
        updatedAt: "2026-05-18T00:00:00.000Z"
      }
    ]);

    expect(filterMealAssignments(assignments, "hypertrophy")).toHaveLength(1);
    expect(filterMealAssignments(assignments, "protein 215")).toHaveLength(1);
    expect(filterMealAssignments(assignments, "breakfast")).toEqual([]);
    expect(filterMealTemplates(templates, "breakfast")).toHaveLength(1);
    expect(filterMealTemplates(templates, "protein 48")).toHaveLength(1);
    expect(filterMealTemplates(templates, "hypertrophy")).toEqual([]);
  });

  it("maps API foods across source and micronutrient metadata branches", () => {
    expect(
      mapApiFoodToBuilderFood({
        id: "aus_food",
        name: "AUS oats",
        category: "Carbs",
        servingSize: "100 g",
        calories: 389,
        proteinGrams: 13,
        carbsGrams: 66,
        fatGrams: 7,
        fiberGrams: null,
        metadata: { source: "AUS-NZ", nutrients: { iron: "4.7", invalid: "not-number" } }
      })
    ).toMatchObject({
      source: "AUS/NZ",
      fibre: 0,
      micronutrients: { iron: 4.7 }
    });

    expect(
      mapApiFoodToBuilderFood({
        id: "efsa_food",
        name: "EU yoghurt",
        category: "Protein",
        servingSize: "150 g",
        calories: 120,
        proteinGrams: 15,
        carbsGrams: 8,
        fatGrams: 2,
        fiberGrams: 1,
        metadata: { sourceId: "efsa_foodex2" }
      }).source
    ).toBe("EFSA");

    expect(
      mapApiFoodToBuilderFood({
        id: "usda_food",
        name: "Chicken",
        category: "Protein",
        servingSize: "100 g",
        calories: 165,
        proteinGrams: 31,
        carbsGrams: 0,
        fatGrams: 3.6,
        fiberGrams: 0,
        metadata: "not-record"
      })
    ).toMatchObject({ source: "USDA", micronutrients: undefined });

    expect(
      mapApiFoodToBuilderFood({
        id: "usda_food_with_nutrients",
        name: "USDA spinach",
        category: "Vegetables",
        servingSize: "100 g",
        calories: 23,
        proteinGrams: 2.9,
        carbsGrams: 3.6,
        fatGrams: 0.4,
        fiberGrams: 2.2,
        metadata: {
          sourceId: "usda_fdc",
          nutrientsPer100g: [
            { name: "Calcium, Ca", unit: "MG", value: 99, sourceNutrientId: "301" },
            { name: "Potassium, K", unit: "MG", value: 558, sourceNutrientId: "306" },
            { name: "Vitamin C, total ascorbic acid", unit: "MG", value: 28.1, sourceNutrientId: "401" },
            { name: "Thiamin", unit: "MG", value: 0.078, sourceNutrientId: "404" },
            { name: "Energy", unit: "KCAL", value: 23, sourceNutrientId: "208" },
            { name: "Invalid", unit: "MG", value: "bad", sourceNutrientId: "bad" }
          ]
        }
      })
    ).toMatchObject({
      source: "USDA",
      micronutrients: {
        calcium: 99,
        potassium: 558,
        vitaminC: 28.1,
        vitaminB1: 0.078
      }
    });
  });

  it("builds foods and totals across serving conversion branches", () => {
    const gramsFood = createBuilderFood(
      {
        id: "rice",
        name: "Rice",
        serving: "100 g",
        source: "AUS/NZ",
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fats: 0.3,
        fibre: 1.3,
        micronutrients: { magnesium: 12 },
        category: "Carbs"
      },
      50,
      "g"
    );
    const ounceFood = createBuilderFood(
      {
        id: "almonds",
        name: "Almonds",
        serving: "1 oz",
        source: "USDA",
        calories: 164,
        protein: 6,
        carbs: 6,
        fats: 14,
        fibre: 3.5,
        micronutrients: { calcium: 76 },
        category: "Fats"
      },
      28.3495,
      "g"
    );
    const cupFood = createBuilderFood(
      {
        id: "milk",
        name: "Milk",
        serving: "250 ml",
        source: "EFSA",
        calories: 150,
        protein: 8,
        carbs: 12,
        fats: 8,
        fibre: 0,
        micronutrients: { calcium: 300 },
        category: "Dairy"
      },
      1,
      "cups"
    );
    const servingFood = createBuilderFood(
      {
        id: "custom",
        name: "Custom food",
        serving: "one portion",
        source: "USDA",
        calories: 100,
        protein: 10,
        carbs: 5,
        fats: 2,
        fibre: 1,
        micronutrients: {},
        category: "Custom"
      },
      -1
    );
    const meal = { id: "meal", name: "Meal", notes: "notes", foods: [gramsFood, ounceFood, cupFood, servingFood] };
    const day = { id: "day", name: "Day", meals: [meal] };

    expect(gramsFood).toMatchObject({ calories: 65, quantity: 0.5, micronutrients: { magnesium: 6 } });
    expect(ounceFood.quantity).toBeCloseTo(1);
    expect(cupFood.quantity).toBe(1);
    expect(servingFood.quantity).toBe(1);
    expect(calculateMealTotals(meal).calories).toBeCloseTo(479);
    expect(calculateDayTotals(day).fibre).toBeCloseTo(5.15);
    expect(calculatePlanTotals([day, { id: "empty", name: "Empty", meals: [] }]).calories).toBeCloseTo(479);
    expect(calculateNutrientTotals(day)).toMatchObject({
      protein: expect.any(Number),
      carbs: expect.any(Number),
      netCarbs: expect.any(Number),
      fibre: expect.any(Number),
      fat: expect.any(Number),
      calcium: 376
    });
    expect(calculateDayTotals()).toEqual({ calories: 0, protein: 0, carbs: 0, fats: 0, fibre: 0 });
    expect(calculateNutrientTotals()).toMatchObject({ protein: 0, carbs: 0, netCarbs: 0, fibre: 0, fat: 0 });
  });

  it("calculates TDEE targets with recommended body weight and growth phase formulas", () => {
    expect(
      calculateTdeeTargets({
        formulaId: "mifflin_bw",
        sex: "female",
        age: 32,
        heightCm: 165,
        weightKg: 70,
        activityLevel: "active",
        goal: "maintenance",
        deficitPercent: 15,
        growthMode: "kcal",
        growthApproach: "conservative",
        growthPercent: 10,
        macroMode: "percent",
        macroSplitPercent: { protein: 30, carbs: 40, fats: 30 },
        macroSplitGramsPerKg: { protein: 2, carbs: 4, fats: 1 }
      })
    ).toMatchObject({
      rmr: 1412,
      tdee: 2189,
      calories: 2189,
      calculatedCalories: 2189,
      proteinGrams: 164,
      carbsGrams: 219,
      fatGrams: 73
    });

    expect(
      calculateTdeeTargets({
        formulaId: "mifflin_bw",
        sex: "female",
        age: 32,
        heightCm: 165,
        weightKg: 70,
        activityLevel: "active",
        goal: "growth",
        deficitPercent: 15,
        growthMode: "kcal",
        growthApproach: "moderate",
        growthPercent: 10,
        macroMode: "percent",
        macroSplitPercent: { protein: 25, carbs: 45, fats: 30 },
        macroSplitGramsPerKg: { protein: 2, carbs: 4, fats: 1 }
      })
    ).toMatchObject({
      calories: 2557,
      calculatedCalories: 2564,
      growthRange: [250, 500],
      proteinGrams: 160,
      carbsGrams: 288,
      fatGrams: 85
    });

    expect(
      calculateTdeeTargets({
        formulaId: "mifflin_bw",
        sex: "female",
        age: 32,
        heightCm: 165,
        weightKg: 70,
        activityLevel: "active",
        goal: "growth",
        deficitPercent: 15,
        growthMode: "percent",
        growthApproach: "moderate",
        growthPercent: 8,
        macroMode: "g_per_kg",
        macroSplitPercent: { protein: 30, carbs: 40, fats: 30 },
        macroSplitGramsPerKg: { protein: 2.2, carbs: 3.5, fats: 0.8 }
      })
    ).toMatchObject({
      calories: 2100,
      calculatedCalories: 2364,
      growthPercent: 8,
      proteinGrams: 154,
      carbsGrams: 245,
      fatGrams: 56
    });
  });

  it("builds full and macro meal plan payloads with fallback branches", () => {
    const templateFood = createBuilderFoodFromTemplateFood(
      {
        foodName: "Template oats",
        servingSize: "40 g",
        calories: 150,
        proteinGrams: 5,
        carbsGrams: 27,
        fatGrams: 3,
        fiberGrams: 4,
        micronutrients: { iron: 2 }
      },
      0
    );
    const templateDays = createBuilderDaysFromTemplate({
      id: "template",
      name: "Template",
      phase: null,
      targetCalories: 1800,
      proteinGrams: 130,
      carbsGrams: 180,
      fatGrams: 50,
      status: "draft",
      updatedAt: "2026-06-01T00:00:00.000Z",
      template: {
        days: [
          {
            name: "",
            meals: [
              {
                meal: "",
                notes: undefined,
                foods: [
                  {
                    foodName: "Chicken",
                    servingSize: "100 g",
                    calories: 165,
                    proteinGrams: 31,
                    carbsGrams: 0,
                    fatGrams: 3.6
                  }
                ]
              }
            ]
          }
        ]
      }
    });
    const fallbackDays = createBuilderDaysFromTemplate(null);
    const fullPayload = getFullMealPlanTemplatePayload([
      {
        ...createBuilderDay(1),
        name: " ",
        meals: [{ id: "m1", name: " ", notes: "coach notes", foods: [templateFood] }]
      }
    ]);
    const emptyFullPayload = getFullMealPlanTemplatePayload([]);

    expect(templateDays[0]).toMatchObject({ name: "Day 1", meals: [expect.objectContaining({ name: "Meal 1" })] });
    expect(fallbackDays[0]).toMatchObject({ name: "Day 1" });
    expect(fullPayload.days?.[0]?.meals[0]).toMatchObject({ meal: "Meal", notes: "coach notes" });
    expect(emptyFullPayload.days?.[0]?.meals[0].meal).toBe("Main Meal");

    const dayTotals = createMacroBuilderDay(1, { protein: "150", carbs: "220", fats: "70", calories: "2100", meals: [] });
    const mealTotals = createMacroBuilderDay(2, {
      meals: [
        createMacroBuilderMeal(1, { title: "", protein: "30", carbs: "45", fats: "10", calories: "390" }),
        createMacroBuilderMeal(2, { title: "Dinner", protein: "bad", carbs: "20", fats: "5", calories: "200" })
      ]
    });

    expect(calculateMacroDayTotals(dayTotals, false)).toEqual({ calories: 2100, protein: 150, carbs: 220, fats: 70 });
    expect(calculateMacroDayTotals(mealTotals, true)).toEqual({ calories: 590, protein: 30, carbs: 65, fats: 15 });
    expect(calculateMacroPlanSummary([dayTotals, mealTotals], true)).toEqual({ calories: 590, protein: 30, carbs: 65, fats: 15 });
    expect(getMacroMealPlanTemplatePayload([mealTotals], true).days?.[0]?.meals[0].meal).toBe("Meal 1");
    expect(getMacroMealPlanTemplatePayload([], false).days?.[0]?.meals[0].foods[0]).toMatchObject({
      foodName: "Daily macro target",
      servingSize: "Macro target"
    });
  });

  it("imports meal templates and appends them to existing plans with fallback meals", () => {
    const templateTotals = calculateTemplateTotals({
      days: [
        {
          name: "Day 1",
          meals: [
            {
              meal: "Breakfast",
              foods: [
                { foodName: "Oats", servingSize: "60 g", calories: 220, proteinGrams: 8, carbsGrams: 38, fatGrams: 4 },
                { foodName: "Whey", servingSize: "30 g", calories: 120, proteinGrams: 24, carbsGrams: 2, fatGrams: 1 }
              ]
            }
          ]
        }
      ]
    });
    const templateCard = {
      id: "template-card",
      name: "Breakfast Template",
      description: "Meal template",
      calories: 340,
      protein: 32,
      carbs: 40,
      fats: 5,
      badge: "published",
      apiTemplate: null,
      template: {
        days: [
          {
            name: "Template day",
            meals: [
              {
                meal: "",
                notes: "import notes",
                foods: [{ foodName: "Eggs", servingSize: "2 eggs", calories: 140, proteinGrams: 12, carbsGrams: 1, fatGrams: 10 }]
              }
            ]
          }
        ]
      }
    };
    const fallbackTemplateCard = {
      ...templateCard,
      id: "fallback-card",
      template: null,
      apiTemplate: {
        id: "fallback-template",
        name: "Breakfast Template",
        phase: null,
        targetCalories: 340,
        proteinGrams: 32,
        carbsGrams: 40,
        fatGrams: 5,
        status: "draft" as const,
        updatedAt: "2026-06-01T00:00:00.000Z",
        template: { days: [] }
      }
    };
    const planTemplate = {
      id: "plan",
      name: "Client Plan",
      phase: null,
      targetCalories: 2400,
      proteinGrams: 170,
      carbsGrams: 250,
      fatGrams: 70,
      status: "archived" as const,
      updatedAt: "2026-06-01T00:00:00.000Z",
      template: { days: [] }
    };

    expect(templateTotals).toEqual({ calories: 340, protein: 32, carbs: 40, fats: 5, fibre: 0 });
    expect(createBuilderMealsFromMealTemplate(templateCard)[0]).toMatchObject({ name: "Breakfast Template", notes: "import notes" });
    expect(createBuilderMealsFromMealTemplate(fallbackTemplateCard)[0]).toMatchObject({
      name: "Breakfast Template",
      foods: [expect.objectContaining({ serving: "Template meal" })]
    });
    expect(appendMealTemplateToPlanTemplate(planTemplate, templateCard)).toMatchObject({
      name: "Client Plan",
      phase: "Full meal plan",
      status: "draft",
      template: { days: [expect.objectContaining({ meals: [expect.objectContaining({ meal: "Breakfast Template" })] })] }
    });
    expect(appendMealTemplateToPlanTemplate(planTemplate, fallbackTemplateCard).template.days?.[0]?.meals[0]).toMatchObject({
      meal: "Breakfast Template",
      foods: [expect.objectContaining({ servingSize: "Meal template" })]
    });
  });

  it("converts and displays builder food quantities across measurement branches", () => {
    expect(parseServingAmount("100 grams, boneless")).toEqual({ amount: 100, unit: "g" });
    expect(parseServingAmount("250 millilitres")).toEqual({ amount: 250, unit: "ml" });
    expect(parseServingAmount("2 ounces")).toEqual({ amount: 2, unit: "oz" });
    expect(parseServingAmount("single serve")).toBeNull();

    expect(normaliseServingUnit("grams")).toBe("g");
    expect(normaliseServingUnit("milliliter")).toBe("ml");
    expect(normaliseServingUnit("ounces")).toBe("oz");
    expect(normaliseServingUnit("cups")).toBe("cups");
    expect(normaliseServingUnit("unknown")).toBe("serving");

    expect(convertMeasurementToServingUnit(2, "oz", "g")).toBeCloseTo(56.699);
    expect(convertMeasurementToServingUnit(56.699, "g", "oz")).toBeCloseTo(2);
    expect(convertMeasurementToServingUnit(1, "cups", "ml")).toBe(250);
    expect(convertMeasurementToServingUnit(2, "tbsp", "ml")).toBe(30);
    expect(convertMeasurementToServingUnit(3, "tsp", "ml")).toBe(15);
    expect(convertMeasurementToServingUnit(4, "serving", "serving")).toBe(4);
    expect(convertMeasurementToServingUnit(1, "cups", "g")).toBeNull();

    expect(getFoodQuantityMultiplier({ serving: "100 g" }, 50, "g")).toBe(0.5);
    expect(getFoodQuantityMultiplier({ serving: "100 g" }, 1, "oz")).toBeCloseTo(0.283495);
    expect(getFoodQuantityMultiplier({ serving: "1 oz" }, 28.3495, "g")).toBeCloseTo(1);
    expect(getFoodQuantityMultiplier({ serving: "250 ml" }, 1, "cups")).toBe(1);
    expect(getFoodQuantityMultiplier({ serving: "250 ml" }, 2, "tbsp")).toBe(0.12);
    expect(getFoodQuantityMultiplier({ serving: "250 ml" }, 5, "tsp")).toBe(0.1);
    expect(getFoodQuantityMultiplier({ serving: "serving" }, 3, "serving")).toBe(3);
    expect(getFoodQuantityMultiplier({ serving: "100 g" }, 2, "cups")).toBe(2);

    expect(getFoodQuantityDisplay({ serving: "100 g", quantity: 0.5, measurementUnit: "g" } as never)).toEqual({
      amount: 50,
      unit: "g"
    });
    expect(getFoodQuantityDisplay({ serving: "100 g", quantity: 1, measurementUnit: "oz" } as never)).toEqual({
      amount: expect.closeTo(3.5274),
      unit: "oz"
    });
    expect(getFoodQuantityDisplay({ serving: "1 oz", quantity: 2, measurementUnit: "g" } as never)).toEqual({
      amount: expect.closeTo(56.699),
      unit: "g"
    });
    expect(getFoodQuantityDisplay({ serving: "250 ml", quantity: 1, measurementUnit: "cups" } as never)).toEqual({
      amount: 1,
      unit: "cups"
    });
    expect(getFoodQuantityDisplay({ serving: "250 ml", quantity: 1, measurementUnit: "tbsp" } as never)).toEqual({
      amount: expect.closeTo(16.6667),
      unit: "tbsp"
    });
    expect(getFoodQuantityDisplay({ serving: "250 ml", quantity: 1, measurementUnit: "tsp" } as never)).toEqual({
      amount: 50,
      unit: "tsp"
    });
    expect(getFoodQuantityDisplay({ serving: "single serve", quantity: 1 } as never)).toEqual({
      amount: 1,
      unit: "serving"
    });
    expect(getFoodQuantityDisplay({ serving: "single serve", quantity: 2 } as never)).toEqual({
      amount: 2,
      unit: "servings"
    });

    expect(parseMealBuilderNumberInput("42.5")).toBe(42.5);
    expect(parseMealBuilderNumberInput("not a number")).toBe(0);
    expect(formatMealBuilderServingSize({ servingSize: " 120 ", servingDescription: "g" } as never)).toBe("120 g");
    expect(formatMealBuilderServingSize({ servingSize: " ", servingDescription: "serving" } as never)).toBe("serving");
  });
});

describe("food database view model helpers", () => {
  it("normalizes food source, verification, macro, nutrient, and pagination branches", () => {
    const legacyFood = {
      id: "legacy-food",
      name: "Legacy Chicken",
      category: "Protein",
      source: "AUS/NZ",
      serving: "100 g",
      calories: 165,
      protein: 31,
      carbs: 0,
      fats: 3.6,
      fibre: 0,
      micronutrients: { vitaminA: 12, customNutrientGrams: 1.25, bad: Number.NaN }
    } as const;
    const privateFood = {
      id: "private-food",
      scope: "private",
      name: "Coach Food",
      category: "Custom",
      servingSize: "1 Grams",
      calories: 100,
      proteinGrams: 10,
      carbsGrams: 20,
      fatGrams: 5,
      fiberGrams: null,
      metadata: {
        source: "AUS-NZ",
        sourceId: "fsanz_ausnut",
        sourceVersion: "ignored",
        servingDescription: "ignored",
        nutrientsPer100g: [
          { name: "calcium", unit: "mg", value: 120, sourceNutrientId: "ca" },
          { name: "Imported Zinc", unit: "mg", value: 2 },
          { name: "Bad", unit: "mg", value: "2" }
        ]
      }
    } as const;
    const efsaFood = {
      ...privateFood,
      id: "efsa-food",
      scope: "global",
      metadata: { source: "EU", sourceId: "efsa_foodex2", vitaminD: 10, sugarGrams: 4 }
    } as const;
    const usdaFood = { ...privateFood, id: "usda-food", metadata: { sourceId: "usda_fdc", magnesium: 22 } } as const;

    expect(getFoodServing(legacyFood)).toBe("100 g");
    expect(getFoodServing(privateFood)).toBe("1 Grams");
    expect(parseNumberInput("12.5")).toBe(12.5);
    expect(parseNumberInput("bad")).toBe(0);
    expect(formatServingSize({ servingSize: " 250 ", servingDescription: "Ml" } as never)).toBe("250 Ml");
    expect(formatServingSize({ servingSize: " ", servingDescription: "Grams" } as never)).toBe("Grams");
    expect(getFoodSource(legacyFood)).toBe("AUS/NZ");
    expect(getFoodSource(privateFood)).toBe("AUS/NZ");
    expect(getFoodSource(efsaFood)).toBe("EFSA");
    expect(getFoodSource(usdaFood)).toBe("USDA");
    expect(getFoodSource({ ...privateFood, metadata: { source: "unknown" } })).toBe("USDA");
    expect(isVerifiedFood(legacyFood)).toBe(true);
    expect(isVerifiedFood(privateFood)).toBe(false);
    expect(isVerifiedFood(efsaFood)).toBe(true);
    expect(isDeletableFood(legacyFood)).toBe(false);
    expect(isDeletableFood(privateFood)).toBe(true);
    expect(getSourceDescription("AUS/NZ")).toBe("Australia & New Zealand");
    expect(getSourceDescription("UNKNOWN" as never)).toBe("Verified food library");

    expect(getFoodMacro(legacyFood, "protein")).toBe(31);
    expect(getFoodMacro(legacyFood, "carbs")).toBe(0);
    expect(getFoodMacro(legacyFood, "fats")).toBe(3.6);
    expect(getFoodMacro(privateFood, "protein")).toBe(10);
    expect(getFoodMacro(privateFood, "carbs")).toBe(20);
    expect(getFoodMacro(privateFood, "fats")).toBe(5);
    expect(getFoodFibre(legacyFood)).toBe(0);
    expect(getFoodFibre(privateFood)).toBe(0);
    expect(getFoodMacroRows(privateFood).map((row) => row.label)).toEqual(["Calories", "Protein", "Carbs", "Fats", "Fibre"]);
    expect(isApiFood(privateFood)).toBe(true);
    expect(isApiFood(legacyFood)).toBe(false);

    expect(getDetailedNutrientRows(legacyFood).map((row) => row.label)).toEqual(["Custom Nutrient", "Vitamin A"]);
    expect(getMetadataNutrientRows(null)).toEqual([]);
    expect(getMetadataNutrientRows(privateFood.metadata).map((row) => row.label)).toEqual(["Calcium", "Imported Zinc"]);
    expect(getMetadataNutrientRows(efsaFood.metadata)).toEqual([
      { key: "sugarGrams", label: "Sugars", value: "4 g" },
      { key: "vitaminD", label: "Vitamin D", value: "10 IU" }
    ]);
    expect(isImportedNutrient(null)).toBe(false);
    expect(isImportedNutrient({ name: "Calcium", unit: "mg", value: 10 })).toBe(true);
    expect(isImportedNutrient({ name: "Calcium", unit: "mg", value: "10" })).toBe(false);

    expect(getPaginationPages(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationPages(10, 20)).toEqual([1, 9, 10, 11, 20]);
    expect(getPaginationPages(1, 20)).toEqual([1, 2, 20]);
    expect(inferNutrientUnit("sugarGrams")).toBe("g");
    expect(inferNutrientUnit("transFat")).toBe("g");
    expect(inferNutrientUnit("calcium")).toBe("mg");
    expect(toTitleLabel("customNutrientGrams")).toBe("Custom Nutrient");
    expect(formatNutrientValue(10)).toBe("10");
    expect(formatNutrientValue(10.25)).toBe("10.3");
    expect(getFoodImageSrc("Chicken Breast")).toContain("data:image/svg+xml");
    expect(getFoodImageSrc("Unknown Food")).toContain("data:image/svg+xml");
  });
});

describe("FoodDatabasePage", () => {
  it("renders the Figma food database search and source controls", async () => {
    mockFoodLibrary();

    render(createElement(FoodDatabasePage));

    expect(await screen.findByRole("heading", { level: 1, name: "Food Database" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search foods/i })).toHaveAttribute(
      "placeholder",
      "Search thousands of ingredients..."
    );
    expect(screen.getByLabelText("Sort foods")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Entry" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create New Food" })).not.toBeInTheDocument();
    expect(screen.getByText("Source:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "USDA" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "AUS/NZ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "EFSA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recent Ingredients" })).not.toBeInTheDocument();
    expect(screen.getAllByText("FoodData Central").length).toBeGreaterThan(0);
    expect(await screen.findByRole("list", { name: "Food list" })).toHaveTextContent("Chicken Breast");
    expect(screen.queryByRole("button", { name: "All Ingredients" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proteins" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carbs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Unlock Global Food Database" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync Now" })).not.toBeInTheDocument();
  });

  it("loads API-backed foods when persistence is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "food_api_1",
              scope: "global",
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
    expect(screen.getByLabelText("Verified Complete Coach food")).toBeInTheDocument();
    expect(screen.getByText("100g cooked")).toBeInTheDocument();
    expect(screen.getByText("28g")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Breast")).not.toBeInTheDocument();
  });

  it("toggles between card and list food database views", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "food_api_1",
              scope: "global",
              name: "API Turkey Mince",
              category: "Proteins",
              servingSize: "100g cooked",
              calories: 180,
              proteinGrams: 28,
              carbsGrams: 0,
              fatGrams: 8,
              metadata: {
                sourceId: "usda_fdc"
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("API Turkey Mince")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    const list = screen.getByRole("list", { name: "Food list" });
    expect(within(list).getByText("API Turkey Mince")).toBeInTheDocument();
    expect(within(list).getByText("Proteins")).toBeInTheDocument();
    expect(within(list).getByText("100g cooked")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Card view" }));

    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Food grid" })).toBeInTheDocument();
  });

  it("restores the saved food database view preference", async () => {
    const storedValues = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storedValues.clear(),
        getItem: (key: string) => storedValues.get(key) ?? null,
        removeItem: (key: string) => storedValues.delete(key),
        setItem: (key: string, value: string) => storedValues.set(key, value)
      }
    });
    window.localStorage.setItem("complete-coach:food-database-view", "cards");
    mockFoodLibrary();

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("Chicken Breast")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("region", { name: "Food grid" })).toBeInTheDocument();
  });

  it("opens a nutrient breakdown modal from a food card", async () => {
    mockFoodLibrary();

    render(createElement(FoodDatabasePage));

    fireEvent.click(await screen.findByRole("button", { name: "Card view" }));
    const chickenCard = (await screen.findByRole("heading", { name: "Chicken Breast" })).closest("button");
    expect(chickenCard).not.toBeNull();
    fireEvent.click(chickenCard!);

    const dialog = screen.getByRole("dialog", { name: "Chicken Breast nutrient breakdown" });
    expect(within(dialog).getByRole("heading", { name: "Chicken Breast" })).toBeInTheDocument();
    expect(within(dialog).getByText(/100g/)).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Calories 165 kcal/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Protein 31 g/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /B3 \(Niacin\) 13.7 mg/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Sodium 74 mg/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close food details" }));

    expect(screen.queryByRole("dialog", { name: "Chicken Breast nutrient breakdown" })).not.toBeInTheDocument();
  });

  it("opens a nutrient breakdown modal from the food list view", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "food_api_1",
              scope: "global",
              name: "API Turkey Mince",
              category: "Proteins",
              servingSize: "100g cooked",
              calories: 180,
              proteinGrams: 28,
              carbsGrams: 0,
              fatGrams: 8,
              fiberGrams: 0,
              metadata: {
                sourceId: "usda_fdc"
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("API Turkey Mince")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    const turkeyRow = screen.getByRole("heading", { name: "API Turkey Mince" }).closest("button");
    expect(turkeyRow).not.toBeNull();
    fireEvent.click(turkeyRow!);

    const dialog = screen.getByRole("dialog", { name: "API Turkey Mince nutrient breakdown" });
    expect(within(dialog).getByRole("heading", { name: "API Turkey Mince" })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Calories 180 kcal/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Fibre 0 g/i })).toBeInTheDocument();
    expect(within(dialog).getByText("No detailed micronutrient data is available for this food yet.")).toBeInTheDocument();
  });

  it("paginates API-backed foods twelve at a time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: Array.from({ length: 13 }, (_, index) => ({
            id: `food_api_${index + 1}`,
            scope: "global",
            name: `USDA Food ${String(index + 1).padStart(2, "0")}`,
            category: "Imported Foods",
            servingSize: "100g",
            calories: 100 + index,
            proteinGrams: 10,
            carbsGrams: 20,
            fatGrams: 5,
            metadata: {
              sourceId: "usda_fdc"
            }
          }))
        }),
        { status: 200 }
      )
    );

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("USDA Food 01")).toBeInTheDocument();
    expect(screen.getByText("Showing 12 of 13 results")).toBeInTheDocument();
    expect(screen.queryByText("USDA Food 13")).not.toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/v1/foods?limit=5000");

    fireEvent.click(screen.getByRole("button", { name: "Next food page" }));

    expect(screen.getByRole("status", { name: "Food database page" })).toHaveTextContent("Page 2");
    expect(screen.getByText("Showing 1 of 13 results")).toBeInTheDocument();
    expect(screen.getByText("USDA Food 13")).toBeInTheDocument();
    expect(screen.queryByText("USDA Food 01")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next food page" })).toBeDisabled();
  });

  it("shows imported nutrient-per-100g data inside the food details modal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "food_ausnut_1",
              scope: "global",
              name: "AUSNUT Apple Raw",
              category: "Fruit",
              servingSize: "100g",
              calories: 52,
              proteinGrams: 0.3,
              carbsGrams: 12,
              fatGrams: 0.1,
              fiberGrams: 2.4,
              metadata: {
                sourceId: "fsanz_ausnut",
                nutrientsPer100g: [
                  { name: "Vitamin C", unit: "mg", value: 12.5 },
                  { name: "Calcium", unit: "mg", value: 80 },
                  { name: "Folate", unit: "µg", value: 9 }
                ]
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FoodDatabasePage));

    await screen.findByText("No persisted foods match the current filters.");
    fireEvent.click(screen.getByRole("button", { name: "AUS/NZ" }));
    fireEvent.click(await screen.findByRole("button", { name: "View nutrient breakdown for AUSNUT Apple Raw" }));

    const dialog = screen.getByRole("dialog", { name: "AUSNUT Apple Raw nutrient breakdown" });
    expect(within(dialog).getByRole("row", { name: /Vitamin C 12.5 mg/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Calcium 80 mg/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Folate 9 µg/i })).toBeInTheDocument();
  });

  it("filters imported AUS/NZ foods into the AUS/NZ source tab", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "food_ausnut_1",
              scope: "global",
              name: "AUSNUT Apple Raw",
              category: "Fruit",
              servingSize: "100g",
              calories: 52,
              proteinGrams: 0.3,
              carbsGrams: 12,
              fatGrams: 0.1,
              metadata: {
                sourceId: "fsanz_ausnut",
                sourceVersion: "2023"
              }
            },
            {
              id: "food_usda_1",
              scope: "global",
              name: "USDA Turkey Mince",
              category: "Proteins",
              servingSize: "100g",
              calories: 180,
              proteinGrams: 28,
              carbsGrams: 0,
              fatGrams: 8,
              metadata: {
                sourceId: "usda_fdc"
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("USDA Turkey Mince")).toBeInTheDocument();
    expect(screen.queryByText("AUSNUT Apple Raw")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AUS/NZ" }));

    expect(screen.getByText("AUSNUT Apple Raw")).toBeInTheDocument();
    expect(screen.queryByText("USDA Turkey Mince")).not.toBeInTheDocument();
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
              name: "Coach Blueberries",
              category: "Custom",
              servingSize: "150 Grams",
              calories: 85,
              proteinGrams: 1,
              carbsGrams: 21,
              fatGrams: 0
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(FoodDatabasePage));

    await screen.findByText("No persisted foods match the current filters.");
    fireEvent.click(screen.getByRole("button", { name: "New Entry" }));
    const dialog = screen.getByRole("dialog", { name: "Add Own Food item for your nutrition plan" });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter food name"), { target: { value: "Coach Blueberries" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter total calories"), { target: { value: "85" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter total protein"), { target: { value: "1" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter total carbs"), { target: { value: "21" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter total fat"), { target: { value: "0" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter total fiber"), { target: { value: "4" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter serving size"), { target: { value: "150" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Food saved.")).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes("Saved"))).toBe(true);
    expect(screen.getByText("Coach Blueberries")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/foods",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Coach Blueberries")
      })
    );
  });

  it("deletes only organization foods from the food database", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/foods?limit=5000") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "food_global",
                  scope: "global",
                  name: "Global Basmati Rice",
                  category: "Carbs",
                  servingSize: "100g",
                  calories: 121,
                  proteinGrams: 3,
                  carbsGrams: 25,
                  fatGrams: 0.4,
                  metadata: { sourceId: "usda_fdc" }
                },
                {
                  id: "food_private",
                  scope: "private",
                  name: "Coach Blueberries",
                  category: "Custom",
                  servingSize: "150 Grams",
                  calories: 85,
                  proteinGrams: 1,
                  carbsGrams: 21,
                  fatGrams: 0,
                  metadata: { source: "USDA" }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/foods/food_private" && init?.method === "DELETE") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "food_private", deleted: true } }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    });

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("Coach Blueberries")).toBeInTheDocument();
    expect(screen.getByText("Global Basmati Rice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Global Basmati Rice" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Coach Blueberries" }));

    await waitFor(() => expect(screen.queryByText("Coach Blueberries")).not.toBeInTheDocument());
    expect(screen.getByText("Global Basmati Rice")).toBeInTheDocument();
    expect(await screen.findByText("Food deleted.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/foods/food_private", { method: "DELETE" });
  });

  it("opens the custom food modal from the add new food card", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(FoodDatabasePage));

    await screen.findByText("No persisted foods match the current filters.");
    fireEvent.click(screen.getByRole("button", { name: "New Entry" }));

    const dialog = screen.getByRole("dialog", { name: "Add Own Food item for your nutrition plan" });
    expect(within(dialog).getByPlaceholderText("Enter food name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Serving Description:")).toHaveValue("Grams");
    expect(within(dialog).getByRole("option", { name: "Ounces" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Qty" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Cups" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Oz" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Tbsp" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Tsp" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Ml" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Vitamins" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Minerals" })).toBeInTheDocument();
  });

  it("shows an empty persisted food library when the persistence API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(createElement(FoodDatabasePage));

    expect(await screen.findByText("No persisted foods match the current filters.")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Breast")).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "New Entry" }));
    const dialog = screen.getByRole("dialog", { name: "Add Own Food item for your nutrition plan" });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter food name"), { target: { value: "Invalid Macro Food" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Macro values are invalid.")).toBeInTheDocument();
  });

  it("searches persisted foods by name", async () => {
    mockFoodLibrary();
    render(createElement(FoodDatabasePage));

    fireEvent.click(screen.getByRole("button", { name: "AUS/NZ" }));
    fireEvent.change(screen.getByRole("searchbox", { name: /search foods/i }), {
      target: { value: "rice" }
    });

    expect(await screen.findByText("Basmati Rice")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Breast")).not.toBeInTheDocument();
  });

  it("filters persisted foods by source", async () => {
    mockFoodLibrary();

    render(createElement(FoodDatabasePage));

    await screen.findByText("Chicken Breast");
    fireEvent.click(screen.getByRole("button", { name: "AUS/NZ" }));

    const list = screen.getByRole("list", { name: "Food list" });
    expect(await within(list).findByText("Basmati Rice")).toBeInTheDocument();
    expect(within(list).queryByText("Chicken Breast")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "USDA" }));

    expect(within(list).getByText("Chicken Breast")).toBeInTheDocument();
    expect(within(list).queryByText("Basmati Rice")).not.toBeInTheDocument();
  });

});
