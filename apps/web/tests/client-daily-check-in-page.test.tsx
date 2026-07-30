import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientDailyCheckInPage } from "@/components/client-app/client-daily-check-in-page";

describe("ClientDailyCheckInPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the client's current phase progress by week", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One" },
              trainingAssignments: [
                {
                  id: "training_assignment_1",
                  name: "Metabolic Priming",
                  status: "active",
                  startsOn: "2026-07-01",
                  endsOn: null,
                  snapshot: {
                    durationWeeks: 8
                  }
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/check-ins?limit=100") {
        return new Response(
          JSON.stringify({
            data: [
              createCheckIn("checkin_1", "2026-07-29T09:00:00.000Z", "Energy was strong and food was on plan.", "https://cdn.completecoach.fit/front-2026-07-29.jpg"),
              createCheckIn("checkin_2", "2026-07-22T09:00:00.000Z", "Training felt better this week.", "https://cdn.completecoach.fit/front-2026-07-22.jpg"),
              createCheckIn("checkin_3", "2026-07-15T09:00:00.000Z", "Sleep improved.", "https://cdn.completecoach.fit/front-2026-07-15.jpg"),
              createCheckIn("checkin_4", "2026-07-08T09:00:00.000Z", "First week submitted.", "https://cdn.completecoach.fit/front-2026-07-08.jpg")
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/clients/client_1/metrics?limit=200") {
        return new Response(
          JSON.stringify({
            data: [
              { id: "metric_1", measuredAt: "2026-07-16T00:00:00.000Z", metricKey: "body_weight", metricValue: 75.2, unit: "kg" },
              { id: "metric_2", measuredAt: "2026-07-29T00:00:00.000Z", metricKey: "body_weight", metricValue: 74.6, unit: "kg" },
              { id: "metric_3", measuredAt: "2026-07-29T00:00:00.000Z", metricKey: "waist", metricValue: 78.4, unit: "cm" }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    }));

    render(<ClientDailyCheckInPage today="2026-07-30" />);

    expect(await screen.findByRole("heading", { name: "Check In" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Metabolic Priming" })).toBeInTheDocument();
    expect(screen.getByText("Week 5 of 8")).toBeInTheDocument();
    expect(screen.getByText("63% complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start daily check-in" })).toBeInTheDocument();

    const checkIns = screen.getByRole("heading", { name: "Submitted history" }).closest("section");
    expect(checkIns).not.toBeNull();
    expect(within(checkIns as HTMLElement).getByText("Energy was strong and food was on plan.")).toBeInTheDocument();
    expect(within(checkIns as HTMLElement).queryByText("First week submitted.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View all" }));

    expect(screen.getByText("First week submitted.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bodyweight" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bodyweight chart" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Waist" }));

    expect(screen.getByRole("heading", { name: "Waist circumference" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Waist circumference chart" })).toBeInTheDocument();
    expect(screen.getByLabelText("Left photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Right photo")).toBeInTheDocument();
  });
});

function createCheckIn(id: string, submittedAt: string, summary: string, photoUrl: string) {
  return {
    id,
    status: "completed",
    submittedAt,
    summary,
    coachNotes: null,
    answers: {
      progressPhotos: [{ url: photoUrl }]
    },
    metrics: []
  };
}
