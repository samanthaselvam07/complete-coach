import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/components/dashboard/dashboard-page";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Dashboard weekly calendar strip", () => {
  it("shows open scheduled work for the current coach-local week and updates when tasks are added", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/dashboard/metadata") {
        return Promise.resolve(new Response(JSON.stringify({ data: { timezone: "Australia/Melbourne" } }), { status: 200 }));
      }

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "call_task",
                  title: "Call with Sarah J.",
                  category: "current-client-care",
                  priority: "high",
                  status: "open",
                  dueAt: "2026-06-10T00:00:00.000Z"
                },
                {
                  id: "completed_task",
                  title: "Completed billing review",
                  category: "business-operations",
                  priority: "medium",
                  status: "completed",
                  dueAt: "2026-06-11T00:00:00.000Z"
                },
                {
                  id: "next_week_task",
                  title: "Next week strategy session",
                  category: "business-operations",
                  priority: "low",
                  status: "open",
                  dueAt: "2026-06-16T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/tasks" && typeof input === "string") {
        return Promise.resolve(new Response(JSON.stringify({ error: { message: "Unavailable" } }), { status: 503 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    const calendar = await screen.findByRole("region", { name: "Weekly schedule calendar" });
    expect(within(calendar).getByText("This Week")).toBeInTheDocument();
    expect(within(calendar).getByText("Call with Sarah J.")).toBeInTheDocument();
    expect(within(calendar).queryByText("Completed billing review")).not.toBeInTheDocument();
    expect(within(calendar).queryByText("Next week strategy session")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    fireEvent.change(screen.getByLabelText("Task Description"), { target: { value: "Schedule onboarding call" } });
    fireEvent.change(screen.getByLabelText("Due Date"), { target: { value: "2026-06-12" } });
    fireEvent.click(screen.getByRole("radio", { name: "New client/ Onboarding" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    expect(await screen.findAllByText("Schedule onboarding call")).toHaveLength(2);
  });
});
