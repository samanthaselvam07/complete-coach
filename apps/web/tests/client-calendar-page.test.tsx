import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientCalendarPage } from "@/components/client-app/client-calendar-page";

describe("ClientCalendarPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the coach-linked client calendar page with month view, agenda, and milestones", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One" }
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
                endDate: "2026-08-01",
                status: "active",
                items: [
                  {
                    id: "event_1",
                    phaseId: "phase_1",
                    clientId: "client_1",
                    title: "Lower Body A",
                    type: "event",
                    date: "2026-07-30",
                    notes: "Intensity: High"
                  },
                  {
                    id: "event_2",
                    phaseId: "phase_1",
                    clientId: "client_1",
                    title: "Weekly Coaching Sync",
                    type: "event",
                    date: "2026-07-31",
                    notes: "Coach call"
                  }
                ]
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }));

    render(<ClientCalendarPage today="2026-07-30" />);

    expect(await screen.findByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hypertrophy Phase" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "July 2026 calendar" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Thursday 30 July, has event" })).toBeInTheDocument();
    expect(screen.getAllByText("Lower Body A")).toHaveLength(2);
    expect(screen.getByText("Weekly Coaching Sync")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByRole("grid", { name: "August 2026 calendar" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Calendar month view")).getByText("August 2026")).toBeInTheDocument();
  });
});
