import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckInManagementPage } from "@/components/check-ins/check-in-management-page";

describe("CheckInManagementPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders pending check-ins with timing status", () => {
    render(createElement(CheckInManagementPage));

    expect(screen.getByRole("heading", { level: 1, name: "Check In Review Center" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Check-in list" })).toHaveTextContent("Sarah Williams");
    expect(screen.getAllByText("On Time").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Late").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /view full check-in for Sarah Williams/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view full check-in for Sarah Williams/i })).toHaveAttribute(
      "href",
      "/clients/1/check-ins/4"
    );
  });

  it("switches to completed check-ins", () => {
    render(createElement(CheckInManagementPage));

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));

    const list = screen.getByRole("region", { name: "Check-in list" });
    expect(within(list).getByText("Jordan Smith")).toBeInTheDocument();
    expect(within(list).queryByText("Sarah Williams")).not.toBeInTheDocument();
  });

  it("sorts check-ins by name", () => {
    render(createElement(CheckInManagementPage));

    fireEvent.click(screen.getByRole("button", { name: /sort check-ins/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "By Name" }));

    const rows = screen.getAllByTestId("check-in-row");
    expect(within(rows[0]).getByText("David Thompson")).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByText("Sarah Williams")).toBeInTheDocument();
  });

  it("loads API-backed check-ins when available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "checkin_api_1",
              clientId: "client_1",
              formSubmissionId: "submission_1",
              name: "API Client",
              initials: "AC",
              status: "pending",
              checkInStatus: "pending-review",
              dueAt: "2026-05-14T00:00:00.000Z",
              submittedAt: "2026-05-14T06:00:00.000Z",
              assignedDay: "2026-05-14T00:00:00.000Z",
              lastCheckIn: "Today"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("API Client")).toBeInTheDocument();
    expect(screen.queryByText("Sarah Williams")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Modal")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view full check-in for API Client/i })).toHaveAttribute(
      "href",
      "/clients/client_1/check-ins/checkin_api_1"
    );
  });

  it("keeps fixture check-ins when the API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: {} }), { status: 503 }));

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("Sarah Williams")).toBeInTheDocument();
    expect(screen.getByText(/showing local sample check-ins/i)).toBeInTheDocument();
  });

});
