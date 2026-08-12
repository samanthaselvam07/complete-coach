import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearClientMeCache } from "@/components/client-app/client-me-cache";
import { ClientNutritionPage } from "@/components/client-app/client-nutrition-page";

describe("ClientNutritionPage", () => {
  afterEach(() => {
    clearClientMeCache();
    vi.unstubAllGlobals();
  });

  it("starts each nutrition day at zero, logs linked meals into compact sliders, and expands meal recipes inline", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One", timezone: "Australia/Melbourne" },
              profile: { waterTargetLitres: 3.2 },
              mealPlanAssignments: [
                {
                  id: "meal_assignment_1",
                  name: "Performance Nutrition",
                  status: "active",
                  targetCalories: 2100,
                  proteinGrams: 150,
                  carbsGrams: 220,
                  fatGrams: 65,
                  snapshot: {
                    targetCalories: 2100,
                    proteinGrams: 150,
                    carbsGrams: 220,
                    fatGrams: 65,
                    fibreGrams: 30,
                    template: {
                      days: [
                        {
                          name: "Training Day",
                          meals: [
                            {
                              meal: "Breakfast Bowl",
                              notes: "Chef notes should not show.",
                              foods: [
                                {
                                  foodName: "Greek yoghurt",
                                  servingSize: "250g",
                                  calories: 220,
                                  proteinGrams: 28,
                                  carbsGrams: 18,
                                  fatGrams: 4,
                                  fiberGrams: 1
                                },
                                {
                                  foodName: "Blueberries",
                                  servingSize: "100g",
                                  calories: 57,
                                  proteinGrams: 1,
                                  carbsGrams: 14,
                                  fatGrams: 0,
                                  fiberGrams: 3
                                }
                              ],
                              recipe: {
                                instructionSteps: ["Layer yoghurt and berries.", "Chill for 10 minutes."]
                              }
                            },
                            {
                              meal: "Chicken Rice Bowl",
                              foods: [
                                {
                                  foodName: "Chicken breast",
                                  servingSize: "150g",
                                  calories: 300,
                                  proteinGrams: 45,
                                  carbsGrams: 0,
                                  fatGrams: 8,
                                  fiberGrams: 0
                                }
                              ]
                            }
                          ]
                        }
                      ]
                  }
                }
              },
              {
                id: "meal_assignment_2",
                name: "Rest Day Nutrition",
                status: "draft",
                targetCalories: 1800,
                proteinGrams: 140,
                carbsGrams: 150,
                fatGrams: 70,
                snapshot: {
                  targetCalories: 1800,
                  proteinGrams: 140,
                  carbsGrams: 150,
                  fatGrams: 70,
                  fibreGrams: 28,
                  template: {
                    days: [
                      {
                        name: "Rest Day",
                        meals: [
                          {
                            meal: "Salmon Salad",
                            foods: [
                              {
                                foodName: "Salmon",
                                servingSize: "120g",
                                calories: 260,
                                proteinGrams: 30,
                                carbsGrams: 0,
                                fatGrams: 15,
                                fiberGrams: 0
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
          }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.startsWith("/api/v1/client/hydration?date=")) {
        return new Response(JSON.stringify({ data: { date: "2026-07-30", hydrationMl: 500 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url === "/api/v1/client/hydration" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { amountMl: number };

        return new Response(JSON.stringify({ data: { date: "2026-07-30", hydrationMl: body.amountMl === 250 ? 750 : 1250 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientNutritionPage />);

    expect(await screen.findByRole("heading", { name: "Performance Nutrition" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Meal plan" })).toHaveValue("meal_assignment_1");
    expect(screen.getByRole("option", { name: "Performance Nutrition (active)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rest Day Nutrition" })).toBeInTheDocument();
    expect(screen.getByLabelText("Calories remaining")).toHaveTextContent("2100");
    expect(screen.getByText("0 / 2100 kcal")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nutrition progress" })).toHaveClass("grid-cols-2");
    expect(screen.getByLabelText("Protein progress")).toHaveTextContent("0 / 150g");
    expect(screen.getByLabelText("Carbs progress")).toHaveTextContent("0 / 220g");
    expect(screen.getByLabelText("Fat progress")).toHaveTextContent("0 / 65g");
    expect(screen.getByLabelText("Fibre progress")).toHaveTextContent("0 / 30g");
    expect(screen.getByRole("region", { name: "Hydration progress" })).toHaveTextContent("500ml / 3200ml");
    expect(screen.getByRole("button", { name: "+250ml" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+500ml" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /swap meal/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Chef notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Chef notes should not show.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log Breakfast Bowl" }));

    expect(screen.getByLabelText("Calories remaining")).toHaveTextContent("1823");
    expect(screen.getByText("277 / 2100 kcal")).toBeInTheDocument();
    expect(screen.getByLabelText("Protein progress")).toHaveTextContent("29 / 150g");
    expect(screen.getByLabelText("Carbs progress")).toHaveTextContent("32 / 220g");
    expect(screen.getByLabelText("Fat progress")).toHaveTextContent("4 / 65g");
    expect(screen.getByLabelText("Fibre progress")).toHaveTextContent("4 / 30g");
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/client/logs",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"domain\":\"nutrition\"")
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "+250ml" }));
    fireEvent.click(screen.getByRole("button", { name: "+500ml" }));

    expect(screen.getByRole("region", { name: "Hydration progress" })).toHaveTextContent("1250ml / 3200ml");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/client/hydration",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"amountMl\":250")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/client/hydration",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"amountMl\":500")
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Breakfast Bowl" }));

    const mealDetails = await screen.findByRole("region", { name: "Breakfast Bowl details" });
    expect(within(mealDetails).getByRole("tab", { name: "Ingredients" })).toBeInTheDocument();
    expect(within(mealDetails).getByRole("tab", { name: "Recipe" })).toBeInTheDocument();
    expect(within(mealDetails).getByText("Greek yoghurt")).toBeInTheDocument();

    fireEvent.click(within(mealDetails).getByRole("tab", { name: "Recipe" }));

    expect(within(mealDetails).getByText("Layer yoghurt and berries.")).toBeInTheDocument();
    expect(within(mealDetails).getByText("Chill for 10 minutes.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Meal plan" }), { target: { value: "meal_assignment_2" } });

    expect(screen.getByRole("heading", { name: "Rest Day Nutrition" })).toBeInTheDocument();
    expect(screen.getByLabelText("Calories remaining")).toHaveTextContent("1800");
    expect(screen.getByText("0 / 1800 kcal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rest Day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Salmon Salad" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Breakfast Bowl details" })).not.toBeInTheDocument();
  });
});
