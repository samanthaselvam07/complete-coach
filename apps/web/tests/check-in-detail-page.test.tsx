import { render, screen } from "@testing-library/react";
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
    status: "completed",
    summary: "Hit new squat PR at 120kg. Slept 7+ hours every night except Friday.",
    coachNotes: "Cravings for sugar mid-afternoon. Struggling with meal prep on weekends."
  },
  {
    id: "week-23",
    clientId: "1",
    name: "Marcus Rodriguez",
    submittedAt: "2026-04-11T08:24:00.000Z",
    dueAt: "2026-04-11T08:12:00.000Z",
    status: "completed",
    summary: "Still managed to get 3 workouts in despite busy week.",
    coachNotes: "Work stress affecting sleep and nutrition."
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
    expect(screen.getByText("Check-In Recording")).toBeInTheDocument();
    expect(screen.getByText("Key Measurements")).toBeInTheDocument();
    expect(screen.getByText("Well-being")).toBeInTheDocument();
    expect(screen.getByText("Wins")).toBeInTheDocument();
    expect(screen.getByText("Struggles")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Current check-in" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toHaveValue("week-23");
    expect(screen.getByText("Hit new squat PR at 120kg. Slept 7+ hours every night except Friday.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Compare With Previous Checkin" })).not.toBeInTheDocument();
  });

  it("renders the previous/current comparison surface", async () => {
    mockCheckInsApi();
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24", compare: "week-23" }));

    expect(await screen.findByRole("heading", { name: "Previous Check in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByText("Still managed to get 3 workouts in despite busy week.")).toBeInTheDocument();
    expect(screen.getByText("Hit new squat PR at 120kg. Slept 7+ hours every night except Friday.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare against" })).toHaveValue("week-23");
    expect(screen.getByRole("link", { name: "Close" })).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24"
    );
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
