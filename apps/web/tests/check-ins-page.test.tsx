import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  });

  it("keeps fixture check-ins when the API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: {} }), { status: 503 }));

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("Sarah Williams")).toBeInTheDocument();
    expect(screen.getByText(/showing local sample check-ins/i)).toBeInTheDocument();
  });

  it("opens persisted check-in detail with answers and metrics", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "checkin_api_1",
              name: "API Client",
              status: "pending",
              checkInStatus: "pending-review",
              submittedAt: "2026-05-14T06:00:00.000Z",
              answers: {
                "body-weight": 82.5,
                notes: "Feeling good."
              },
              metrics: [
                {
                  id: "metric_1",
                  metricKey: "body_weight",
                  metricValue: 82.5,
                  unit: "kg",
                  measuredAt: "2026-05-14T06:00:00.000Z"
                }
              ]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: []
          }),
          { status: 200 }
        )
      );

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("API Client")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view full check-in for API Client/i }));

    expect(await screen.findByRole("dialog", { name: /check-in detail for API Client/i })).toBeInTheDocument();
    expect(screen.getByText("body-weight")).toBeInTheDocument();
    expect(screen.getByText("82.5 kg")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/check-ins/checkin_api_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/ai/recommendations?targetType=check_in&targetId=checkin_api_1&limit=25"
    );
  });

  it("reviews and completes an API-backed check-in", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "checkin_api_1",
              name: "API Client",
              status: "pending",
              checkInStatus: "pending-review",
              submittedAt: "2026-05-14T06:00:00.000Z",
              answers: {},
              metrics: []
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "checkin_api_1",
              name: "API Client",
              status: "pending",
              checkInStatus: "reviewed",
              submittedAt: "2026-05-14T06:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "checkin_api_1",
              name: "API Client",
              status: "completed",
              checkInStatus: "completed",
              submittedAt: "2026-05-14T06:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      );

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("API Client")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view full check-in for API Client/i }));
    fireEvent.change(await screen.findByLabelText("Review summary"), { target: { value: "Strong progress" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));

    expect(await screen.findByText("Check-in reviewed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

    expect(await screen.findByText("Check-in completed.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/check-ins/checkin_api_1/review",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Strong progress")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/check-ins/checkin_api_1/complete",
      expect.objectContaining({ method: "POST" })
    );

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));

    await waitFor(() => {
      expect(within(screen.getByRole("region", { name: "Check-in list" })).getByText("API Client")).toBeInTheDocument();
    });
  });

  it("generates, displays, and approves AI-assisted recommendations", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "checkin_api_1",
              name: "API Client",
              status: "pending",
              checkInStatus: "pending-review",
              submittedAt: "2026-05-14T06:00:00.000Z",
              answers: {},
              metrics: []
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              outputs: [
                {
                  id: "ai_output_1",
                  type: "check-in-summary",
                  status: "pending-approval",
                  severity: "high",
                  title: "CHFI weekly check-in summary",
                  contentMarkdown: "## 1. Weight / Waist\nStrong progress.",
                  requiresApproval: true
                }
              ]
            }
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "ai_output_1",
              type: "check-in-summary",
              status: "approved",
              severity: "high",
              title: "CHFI weekly check-in summary",
              contentMarkdown: "## 1. Weight / Waist\nStrong progress.",
              requiresApproval: true
            }
          }),
          { status: 200 }
        )
      );

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("API Client")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view full check-in for API Client/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Generate AI review" }));

    expect(await screen.findByText("CHFI weekly check-in summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Review summary")).toHaveValue("## 1. Weight / Waist\nStrong progress.");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText("AI recommendation approved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/check-ins/checkin_api_1/ai-review",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/ai/recommendations/ai_output_1/approve",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("creates a coach methodology profile and uses it for AI review generation", async () => {
    const methodologyProfile = {
      id: "methodology_1",
      name: "Habit-first physique coaching",
      methodology: "Habit-first",
      tone: "calm, direct, no shame",
      principles: ["Lead with pattern recognition"],
      checkInSections: ["Wins", "Risks", "Next minimum effective change"],
      redFlagRules: [],
      adjustmentRules: ["Do not reduce calories until adherence is reviewed"],
      forbiddenRecommendations: [],
      isDefault: true,
      isActive: true,
      createdAt: "2026-06-06T08:00:00.000Z",
      updatedAt: "2026-06-06T08:00:00.000Z"
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "checkin_api_1",
              name: "API Client",
              status: "pending",
              checkInStatus: "pending-review",
              submittedAt: "2026-05-14T06:00:00.000Z",
              answers: {},
              metrics: []
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: methodologyProfile }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              outputs: [
                {
                  id: "ai_output_1",
                  type: "check-in-summary",
                  status: "pending-approval",
                  severity: "medium",
                  title: "Habit-first check-in summary",
                  contentMarkdown: "Coaching lens: Habit-first physique coaching",
                  requiresApproval: true
                }
              ]
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(CheckInManagementPage));

    expect(await screen.findByText("API Client")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view full check-in for API Client/i }));
    fireEvent.change(await screen.findByLabelText("Methodology profile name"), {
      target: { value: "Habit-first physique coaching" }
    });
    fireEvent.change(screen.getByLabelText("Coaching methodology"), { target: { value: "Habit-first" } });
    fireEvent.change(screen.getByLabelText("AI tone"), { target: { value: "calm, direct, no shame" } });
    fireEvent.click(screen.getByRole("button", { name: "Save methodology profile" }));

    expect(await screen.findByText("AI methodology profile saved.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate AI review" }));

    expect(await screen.findByText("Habit-first check-in summary")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/ai/methodology-profiles",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Habit-first physique coaching")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/check-ins/checkin_api_1/ai-review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ methodologyProfileId: "methodology_1" })
      })
    );
  });

  it("validates required methodology profile fields before saving", async () => {
    render(createElement(CheckInManagementPage));

    fireEvent.click(screen.getByRole("button", { name: /view full check-in for Sarah Williams/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save methodology profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Methodology profile name and coaching methodology are required."
    );
  });
});
