import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientHomePage } from "@/components/client-app/client-home-page";

describe("ClientHomePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows workout, nutrition, and coach-linked calendar modules in the dashboard grid", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One", checkInDay: "Monday", timezone: "Australia/Melbourne" },
              profile: { waterTargetLitres: 3.2 },
              trainingAssignments: [
                {
                  id: "training_assignment_1",
                  name: "Strength Block",
                  status: "active",
                  snapshot: { days: [{ name: "Lower" }, { name: "Upper" }] }
                }
              ],
              mealPlanAssignments: [
                {
                  id: "meal_assignment_1",
                  name: "Performance Nutrition",
                  status: "active",
                  targetCalories: 2300
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/roadmap") {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "phase_1",
                name: "Hypertrophy Phase",
                startDate: "2026-07-01",
                endDate: "2099-08-01",
                status: "active",
                items: [
                  {
                    id: "item_1",
                    phaseId: "phase_1",
                    clientId: "client_1",
                    title: "Weekly coaching sync",
                    type: "event",
                    date: "2099-07-31",
                    notes: "Review progress."
                  }
                ]
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.startsWith("/api/v1/client/hydration?date=")) {
        return new Response(JSON.stringify({ data: { date: "2026-07-30", hydrationMl: 1250 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }));

    render(<ClientHomePage today="2026-07-30" />);

    expect(await screen.findByRole("heading", { name: "Hello, Client" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log daily check in/i })).toHaveAttribute("href", "/check-in/daily");
    expect(screen.getByText("Monday • 4 days until check-in")).toBeInTheDocument();

    const dashboardGrid = screen.getByRole("region", { name: "Dashboard modules" });
    expect(dashboardGrid).toHaveClass("grid-cols-3");
    expect(within(dashboardGrid).getByText("Workout")).toBeInTheDocument();
    expect(within(dashboardGrid).getByText("Nutrition")).toBeInTheDocument();
    expect(within(dashboardGrid).getByRole("link", { name: "Open calendar" })).toHaveAttribute("href", "/calendar");
    expect(within(dashboardGrid).getByText("Hypertrophy Phase")).toBeInTheDocument();
    expect(within(dashboardGrid).getByText(/Weekly coaching sync/)).toBeInTheDocument();
    expect(within(dashboardGrid).queryByLabelText("Client calendar week")).not.toBeInTheDocument();

    expect(screen.getByRole("region", { name: "Hydration tracker" })).toHaveTextContent("1.3L / 3.2L");
  });
});
