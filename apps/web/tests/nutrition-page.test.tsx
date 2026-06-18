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
    expect(screen.getByText("0 Kcal")).toBeInTheDocument();
    expect(screen.getByText("0 g Protein")).toBeInTheDocument();
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
    expect(screen.getByRole("row", { name: /Chicken Breast 200 g 330 kcal 62g protein/i })).toBeInTheDocument();
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

  it("deletes persisted draft meal plans through the template API so reloads do not restore them", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates/meal_template_draft" && init?.method === "DELETE") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "meal_template_draft", deleted: true } }), { status: 200 }));
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

  it("opens meal template details and saves edits to the selected template", async () => {
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

    fireEvent.click(await screen.findByRole("tab", { name: "Meal Templates" }));
    fireEvent.click(await screen.findByRole("button", { name: "View Persisted Breakfast Template" }));

    expect(screen.getByRole("dialog", { name: "Persisted Breakfast Template" })).toBeInTheDocument();
    expect(screen.getByText("Prep oats with cinnamon.")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Chicken Breast\s*200 g\s*330 kcal\s*62g\s*C 0g · F 7.2g/i })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Basmati Rice\s*100 g\s*121 kcal\s*3g\s*C 25g · F 0.4g/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Template" }));
    fireEvent.change(screen.getByLabelText("Meal template name"), { target: { value: "Edited Breakfast Template" } });
    fireEvent.change(screen.getByLabelText("Notes for Breakfast"), { target: { value: "Use pre-workout on heavy leg days." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));

    expect(await screen.findByText("Edited Breakfast Template saved to Meal Templates.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates/meal_template_api",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("Use pre-workout on heavy leg days.")
      })
    );
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
    expect(screen.queryByRole("heading", { level: 2, name: "Contest Prep Meal Plan" })).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Meal Plans" })).toHaveTextContent("Contest Prep Meal Plan");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Contest Prep Meal Plan")
      })
    );
  });

  it("builds full meal plans with editable day tabs, meal actions, food search, and meal template import", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/meal-plan-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Meal template persistence unavailable." } }), {
            status: 503
          })
        );
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Create meal template" }));
    expect(await screen.findByText("Breakfast saved locally. It will need to be saved again when the API is available.")).toBeInTheDocument();

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
    expect(within(foodDrawer).getAllByLabelText("Verified database food")[0]).toBeInTheDocument();
    expect(within(foodDrawer).queryByText("Verified")).not.toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "+ Quick add food" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add day" })).toBeEnabled();
    expect(within(foodDrawer).getByRole("searchbox", { name: "Search food database" })).toHaveAttribute(
      "placeholder",
      "Search foods..."
    );
    expect(within(foodDrawer).getByRole("button", { name: "AUS/NZ" })).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "EFSA" })).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("button", { name: "USDA" })).toBeInTheDocument();
    expect(within(foodDrawer).getByText("Showing recent AUS/NZ foods")).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("list", { name: "Selectable foods" })).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("checkbox", { name: "Select Basmati Rice" })).toBeInTheDocument();
    expect(within(foodDrawer).queryByRole("checkbox", { name: "Select Chicken Breast" })).not.toBeInTheDocument();
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "USDA" }));
    expect(within(foodDrawer).getByText("Showing recent USDA foods")).toBeInTheDocument();
    expect(within(foodDrawer).getByRole("checkbox", { name: "Select Chicken Breast" })).toBeInTheDocument();
    expect(within(foodDrawer).queryByRole("checkbox", { name: "Select Basmati Rice" })).not.toBeInTheDocument();
    fireEvent.click(within(foodDrawer).getByRole("checkbox", { name: "Select Chicken Breast" }));
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "AUS/NZ" }));
    fireEvent.click(within(foodDrawer).getByRole("checkbox", { name: "Select Basmati Rice" }));
    const selectedFoodsRegion = within(foodDrawer).getByRole("region", { name: "Selected foods" });
    expect(selectedFoodsRegion).toHaveClass("lg:min-w-[26rem]");
    expect(within(selectedFoodsRegion).getByRole("list", { name: "Selected food quantity list" })).toHaveClass("overflow-y-auto");
    fireEvent.click(within(foodDrawer).getByRole("button", { name: "EFSA" }));
    fireEvent.click(within(foodDrawer).getByRole("checkbox", { name: "Select Raw Avocado" }));
    expect(within(selectedFoodsRegion).getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(within(foodDrawer).getByRole("checkbox", { name: "Select Raw Avocado" }));
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
    expect(screen.getByRole("row", { name: /B3 \(Niacin\) 1.6 mg 11%/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Minerals nutrient breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Sodium 1 mg 0%/i })).toBeInTheDocument();
    expect(screen.queryByText("Dynamic totals")).not.toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Protein nutrient breakdown" }).compareDocumentPosition(screen.getByRole("table", { name: "Carbohydrates nutrient breakdown" }))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    fireEvent.click(screen.getAllByRole("button", { name: "Meal actions" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Create meal template" }));
    expect(await screen.findByText("Main Meal saved locally. It will need to be saved again when the API is available.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add meal from template" }));
    fireEvent.click(screen.getByRole("button", { name: "Import Main Meal" }));
    expect(screen.queryByRole("row", { name: /Main Meal 1 serving/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Chicken Breast/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("row", { name: /Basmati Rice/i })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Add meal from template" }));
    const templateDialog = screen.getByRole("dialog", { name: "Import meal from template" });
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
    fireEvent.click(screen.getByRole("tab", { name: "Meal Templates" }));
    expect(screen.getByRole("tabpanel", { name: "Meal Templates" })).toHaveTextContent("Breakfast");
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
    expect(screen.getByRole("button", { name: "USDA" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "AUS/NZ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EFSA" })).toBeInTheDocument();
    expect(screen.getAllByText("FoodData Central").length).toBeGreaterThan(0);
    expect(screen.getByAltText("Chicken Breast")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Food grid" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Food list" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    const list = screen.getByRole("list", { name: "Food list" });
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    expect(within(list).getByText("API Turkey Mince")).toBeInTheDocument();
    expect(within(list).getByText("Proteins")).toBeInTheDocument();
    expect(within(list).getByText("100g cooked")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Card view" }));

    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Food grid" })).toBeInTheDocument();
  });

  it("opens a nutrient breakdown modal from a food card", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(createElement(FoodDatabasePage));

    await screen.findByText("Food persistence API unavailable. Showing fixture food library.");
    const chickenCard = screen.getByRole("heading", { name: "Chicken Breast" }).closest("button");
    expect(chickenCard).not.toBeNull();
    fireEvent.click(chickenCard!);

    const dialog = screen.getByRole("dialog", { name: "Chicken Breast nutrient breakdown" });
    expect(within(dialog).getByRole("heading", { name: "Chicken Breast" })).toBeInTheDocument();
    expect(within(dialog).getByText(/100g, Boneless/)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Create New Food" }));
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

  it("opens the custom food modal from the add new food card", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(createElement(FoodDatabasePage));

    await screen.findByText("Food persistence API unavailable. Showing fixture food library.");
    expect(screen.queryByRole("button", { name: "Add Chicken Breast" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add New Food" }));

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
    const dialog = screen.getByRole("dialog", { name: "Add Own Food item for your nutrition plan" });
    fireEvent.change(within(dialog).getByPlaceholderText("Enter food name"), { target: { value: "Invalid Macro Food" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Macro values are invalid.")).toBeInTheDocument();
  });

  it("searches foods by name", () => {
    render(createElement(FoodDatabasePage));

    fireEvent.click(screen.getByRole("button", { name: "AUS/NZ" }));
    fireEvent.change(screen.getByRole("searchbox", { name: /search foods/i }), {
      target: { value: "rice" }
    });

    expect(screen.getByText("Basmati Rice")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Breast")).not.toBeInTheDocument();
  });

  it("filters foods by source", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(createElement(FoodDatabasePage));

    await screen.findByText("Food persistence API unavailable. Showing fixture food library.");
    fireEvent.click(screen.getByRole("button", { name: "AUS/NZ" }));

    const grid = screen.getByRole("region", { name: "Food grid" });
    expect(within(grid).getByText("Basmati Rice")).toBeInTheDocument();
    expect(within(grid).getByText("Whey Isolate")).toBeInTheDocument();
    expect(within(grid).queryByText("Chicken Breast")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "EFSA" }));

    expect(within(grid).getByText("Raw Avocado")).toBeInTheDocument();
    expect(within(grid).queryByText("Basmati Rice")).not.toBeInTheDocument();
  });

});
