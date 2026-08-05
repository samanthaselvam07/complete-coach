import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CheckInDetailPage } from "@/components/check-ins/check-in-detail-page";

const apiCheckIns = [
  {
    id: "week-24",
    clientId: "1",
    name: "Marcus Rodriguez",
    submittedAt: "2026-04-18T08:24:00.000Z",
    dueAt: "2026-04-18T08:12:00.000Z",
    status: "pending-review",
    summary: "Hit new squat PR at 120kg. Slept 7+ hours every night except Friday.",
    coachNotes: "Cravings for sugar mid-afternoon. Struggling with meal prep on weekends.",
    answers: {
      "body-weight": 82.5,
      energy: 8,
      photos: ["https://cdn.test/front.jpg", "https://cdn.test/side.jpg"],
      notes: "Meal prep was stronger this week."
    },
    submission: {
      formVersion: {
        schema: {
          fields: [
            { id: "body-weight", type: "number", label: "Body weight" },
            { id: "energy", type: "scale", label: "Energy" },
            { id: "notes", type: "long-text", label: "Coach notes" },
            { id: "photos", type: "photo", label: "Progress photos" }
          ]
        }
      }
    }
  },
  {
    id: "week-23",
    clientId: "1",
    name: "Marcus Rodriguez",
    submittedAt: "2026-04-11T08:24:00.000Z",
    dueAt: "2026-04-11T08:12:00.000Z",
    status: "completed",
    summary: "Still managed to get 3 workouts in despite busy week.",
    coachNotes: "Work stress affecting sleep and nutrition.",
    answers: {
      "week-summary": "Still managed to get 3 workouts in despite busy week.",
      "stress-note": "Work stress affecting sleep and nutrition."
    },
    submission: {
      formVersion: {
        schema: {
          fields: [
            { id: "week-summary", type: "long-text", label: "Week summary" },
            { id: "stress-note", type: "long-text", label: "Stress note" }
          ]
        }
      }
    }
  }
];

function mockCheckInsApi() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: apiCheckIns }), { status: 200 })
  );
}

describe("CheckInDetailPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the full check-in detail surface", async () => {
    mockCheckInsApi();
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24" }));

    expect(await screen.findByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.queryByText("Check-In Recording")).not.toBeInTheDocument();
    expect(screen.getByText("Body weight")).toBeInTheDocument();
    expect(screen.getByText("82.5")).toBeInTheDocument();
    expect(screen.getByText("Energy")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Meal prep was stronger this week.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Submitted photos" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Progress photos 1" })).toHaveAttribute("src", "https://cdn.test/front.jpg");
    expect(screen.getByRole("img", { name: "Progress photos 2" })).toHaveAttribute("src", "https://cdn.test/side.jpg");
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Current check-in" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toHaveValue("week-23");
    expect(screen.getByText("Meal prep was stronger this week.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Compare With Previous Checkin" })).not.toBeInTheDocument();
  });

  it("marks a submitted check-in complete", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/check-ins?clientId=1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: apiCheckIns }), { status: 200 }));
      }

      if (url === "/api/v1/check-ins/week-24/complete" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: { ...apiCheckIns[0], status: "completed", checkInStatus: "completed" }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: apiCheckIns[0] }), { status: 200 }));
    });

    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24" }));

    fireEvent.click(await screen.findByRole("button", { name: "Complete" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/check-ins/week-24/complete", expect.objectContaining({ method: "POST" }));
    });
    expect(await screen.findByText("Completed")).toBeInTheDocument();
  });

  it("renders the previous/current comparison surface", async () => {
    mockCheckInsApi();
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24", compare: "week-23" }));

    expect(await screen.findByRole("heading", { name: "Previous Check in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByText("Still managed to get 3 workouts in despite busy week.")).toBeInTheDocument();
    expect(screen.getByText("Meal prep was stronger this week.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toHaveValue("week-23");
    expect(screen.getByRole("link", { name: "Close" })).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24"
    );
  });

  it("places the current check-in on the right when there is no previous check-in to compare", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [apiCheckIns[0]] }), { status: 200 })
    );

    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24", compare: "previous" }));

    expect(await screen.findByText("No check in to compare")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { name: "Current Checkin" });
    expect(headings.at(-1)).toBeInTheDocument();
  });

  it("keeps detail actions inside the client profile when embedded", async () => {
    mockCheckInsApi();
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24", embedded: true }));

    expect(await screen.findByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("check-ins")).toHaveAttribute("name", "tab");
    expect(screen.getByDisplayValue("week-24")).toHaveAttribute("name", "checkInId");
    expect(screen.getByRole("link", { name: "Go Back" })).toHaveAttribute("href", "/clients/1?tab=check-ins");
  });
});
