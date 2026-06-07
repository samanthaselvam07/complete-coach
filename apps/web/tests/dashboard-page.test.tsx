import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("DashboardPage", () => {
  it("renders fixture-backed dashboard cards and client activity", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(DashboardPage));

    expect(screen.getByRole("heading", { level: 1, name: "Coach Operations Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
    expect(screen.getByText("$24,850")).toBeInTheDocument();
    expect(screen.getByText("Client Capacity")).toBeInTheDocument();
    const capacityCard = screen.getByRole("link", { name: /client capacity/i });
    expect(capacityCard).toHaveAttribute("href", "/clients");
    expect(within(capacityCard).getByText("Team Capacity")).toBeInTheDocument();
    expect(within(capacityCard).getByText("57")).toBeInTheDocument();
    const checkInsCard = screen.getByRole("link", { name: /view client check-ins/i });
    expect(checkInsCard).toHaveAttribute("href", "/clients/check-ins");
    expect(within(checkInsCard).queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CRM Pipeline" })).toBeInTheDocument();
    expect(screen.getByText("Coach Team")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "New Client/Onboarding" })).toBeInTheDocument();
  });

  it("updates the displayed revenue period from the selector", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(DashboardPage));

    fireEvent.click(screen.getByRole("button", { name: /change revenue period/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Weekly" }));

    expect(screen.getByText("Weekly Revenue")).toBeInTheDocument();
    expect(screen.getByText("$6,212")).toBeInTheDocument();
    expect(screen.queryByText("Monthly Revenue")).not.toBeInTheDocument();
  });

  it("loads dashboard financial reporting from the Stripe reporting API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/dashboard/financial-reporting?period=monthly") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                period: "monthly",
                label: "Monthly Revenue",
                amount: 319000,
                currency: "usd",
                change: "Stripe live",
                bars: [30, 35, 40, 48, 52, 61, 72]
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    expect(await screen.findByText("$3,190")).toBeInTheDocument();
    expect(screen.getByText("Stripe live")).toBeInTheDocument();
  });

  it("uses custom calendar dates when requesting a Stripe revenue report", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (
        url ===
        "/api/v1/dashboard/financial-reporting?period=custom&startDate=2026-06-01&endDate=2026-06-15"
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                period: "custom",
                label: "Custom Revenue",
                amount: 128500,
                currency: "usd",
                change: "Stripe custom range",
                bars: [35, 50, 65, 80]
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    fireEvent.click(screen.getByRole("button", { name: /change revenue period/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Custom revenue start date"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("Custom revenue end date"), { target: { value: "2026-06-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply custom dates" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/dashboard/financial-reporting?period=custom&startDate=2026-06-01&endDate=2026-06-15"
      )
    );
    expect(await screen.findByText("$1,285")).toBeInTheDocument();
    expect(screen.getByText("Stripe custom range")).toBeInTheDocument();
  });

  it("removes local work tasks from the board when completed", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(DashboardPage));

    const clientWork = screen.getByRole("region", { name: "Client Work" });
    const reviewTask = within(clientWork).getByRole("button", {
      name: /mark review jordan's progress check-in complete/i
    });

    fireEvent.click(reviewTask);

    expect(within(clientWork).queryByText("Review Jordan's progress check-in")).not.toBeInTheDocument();
    expect(
      within(clientWork).queryByRole("button", {
        name: /mark review jordan's progress check-in incomplete/i
      })
    ).not.toBeInTheDocument();
  });

  it("adds a local task through the task creation panel", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(DashboardPage));

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    fireEvent.change(screen.getByLabelText("Task Description"), {
      target: { value: "Prepare onboarding packet" }
    });
    fireEvent.change(screen.getByLabelText("Due Date"), {
      target: { value: "2026-06-12" }
    });
    fireEvent.click(screen.getByRole("radio", { name: "Current Client Care" }));
    fireEvent.click(screen.getByRole("radio", { name: "High" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    const clientWork = screen.getByRole("region", { name: "Client Work" });
    const createdTask = within(clientWork).getByRole("button", {
      name: /mark prepare onboarding packet complete/i
    });

    expect(within(clientWork).getByText("Prepare onboarding packet")).toBeInTheDocument();
    expect(within(createdTask).getByText("Due Jun 12")).toBeInTheDocument();
    expect(within(createdTask).getByText("High")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Create New Task" })).not.toBeInTheDocument();
  });

  it("loads persisted dashboard tasks and live summary counts when APIs are available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "task_api_1",
                  title: "Persisted client review",
                  category: "current-client-care",
                  priority: "high",
                  status: "open",
                  dueAt: "2026-06-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/clients?status=active&limit=100") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "client_1" }, { id: "client_2" }, { id: "client_3" }] }), {
            status: 200
          })
        );
      }

      if (url === "/api/v1/check-ins?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: "checkin_1", checkInStatus: "pending-review", status: "pending" },
                { id: "checkin_2", checkInStatus: "reviewed", status: "pending" },
                { id: "checkin_3", checkInStatus: "completed", status: "completed" }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    expect(await screen.findByText("Persisted client review")).toBeInTheDocument();
    expect(screen.getByText("Due Jun 14")).toBeInTheDocument();
    expect(screen.getByText("76% LOAD")).toBeInTheDocument();
    expect(screen.getByText("Room for 18 more premium athletes across 3 coaches")).toBeInTheDocument();
    const checkInsCard = screen.getByRole("link", { name: /view client check-ins/i });
    expect(checkInsCard).toHaveAttribute("href", "/clients/check-ins");
    expect(within(checkInsCard).getByText("2")).toBeInTheDocument();
    expect(within(checkInsCard).getAllByText("Check Ins")).toHaveLength(2);
    expect(within(checkInsCard).queryByText("Pending")).not.toBeInTheDocument();
  });

  it("shows how many active clients are scheduled to check in today", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-07T13:30:00.000Z"));

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/dashboard/metadata") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { timezone: "Pacific/Auckland" } }), { status: 200 })
        );
      }

      if (url === "/api/v1/clients?status=active&limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: "client_1", name: "Maya Monday", checkInDay: "Monday", status: "active" },
                { id: "client_2", name: "Marcus Monday", checkInDay: "Monday", status: "active" },
                { id: "client_3", name: "Tara Tuesday", checkInDay: "Tuesday", status: "active" }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    const todaysCheckInsCard = await screen.findByRole("link", { name: /today's expected check-ins/i });

    expect(todaysCheckInsCard).toHaveAttribute("href", "/clients/check-ins");
    expect(within(todaysCheckInsCard).getByText("Monday Check-Ins")).toBeInTheDocument();
    expect(within(todaysCheckInsCard).getByText("2")).toBeInTheDocument();
    expect(within(todaysCheckInsCard).getByText("Maya Monday, Marcus Monday")).toBeInTheDocument();
    expect(within(todaysCheckInsCard).queryByText("Tara Tuesday")).not.toBeInTheDocument();
  });

  it("links client capacity to the client roster and reflects individual coach capacity", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/team-members") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  {
                    id: "membership_alex",
                    userId: "coach_alex",
                    name: "Alex Coach",
                    email: "alex@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 18,
                    capacityLimit: 40,
                    capacityPercent: 45
                  },
                  {
                    id: "membership_maya",
                    userId: "coach_maya",
                    name: "Maya Nutrition",
                    email: "maya@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 32,
                    capacityLimit: 40,
                    capacityPercent: 80
                  },
                  {
                    id: "membership_assistant",
                    userId: "assistant_1",
                    name: "Ops Assistant",
                    email: "ops@example.com",
                    image: null,
                    role: "assistant",
                    status: "active",
                    activeClientCount: 0,
                    capacityLimit: 0,
                    capacityPercent: 0
                  }
                ],
                invitations: []
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    const capacityCard = await screen.findByRole("link", { name: /client capacity/i });

    expect(capacityCard).toHaveAttribute("href", "/clients");
    expect(within(capacityCard).getByText("Team Capacity")).toBeInTheDocument();
    expect(within(capacityCard).getByText("50")).toBeInTheDocument();
    expect(within(capacityCard).getByText("/80")).toBeInTheDocument();
    expect(within(capacityCard).getByText("Maya Nutrition")).toBeInTheDocument();
    expect(within(capacityCard).getByText("32/40")).toBeInTheDocument();
    expect(within(capacityCard).queryByText("Ops Assistant")).not.toBeInTheDocument();
  });

  it("stacks coach team under CRM and limits coach quick access to three members", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/team-members") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  {
                    id: "membership_alex",
                    userId: "coach_alex",
                    name: "Alex Coach",
                    email: "alex@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 18,
                    capacityLimit: 40,
                    capacityPercent: 45
                  },
                  {
                    id: "membership_maya",
                    userId: "coach_maya",
                    name: "Maya Nutrition",
                    email: "maya@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 32,
                    capacityLimit: 40,
                    capacityPercent: 80
                  },
                  {
                    id: "membership_jules",
                    userId: "coach_jules",
                    name: "Jules Strength",
                    email: "jules@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 21,
                    capacityLimit: 40,
                    capacityPercent: 53
                  },
                  {
                    id: "membership_lee",
                    userId: "coach_lee",
                    name: "Lee Fourth",
                    email: "lee@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 10,
                    capacityLimit: 40,
                    capacityPercent: 25
                  }
                ],
                invitations: []
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    const crmModule = await screen.findByRole("region", { name: "CRM Pipeline" });
    const coachTeam = await screen.findByRole("region", { name: "Coach Team" });

    expect(
      crmModule.compareDocumentPosition(coachTeam) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(within(coachTeam).getByText("Maya Nutrition")).toBeInTheDocument();
    expect(within(coachTeam).getByText("Jules Strength")).toBeInTheDocument();
    expect(within(coachTeam).getByText("Alex Coach")).toBeInTheDocument();
    expect(within(coachTeam).queryByText("Lee Fourth")).not.toBeInTheDocument();
    expect(within(coachTeam).getByRole("link", { name: "View all coaches" })).toHaveAttribute(
      "href",
      "/team-management"
    );
    expect(within(coachTeam).getByRole("link", { name: "Open profile for Maya Nutrition" })).toHaveAttribute(
      "href",
      "/coach-profile?member=membership_maya"
    );
    expect(within(coachTeam).getByRole("link", { name: "Open settings for Maya Nutrition" })).toHaveAttribute(
      "href",
      "/team-management?member=membership_maya"
    );
  });

  it("renders the dashboard subtitle from the coach timezone and active dashboard task count", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-07T13:30:00.000Z"));

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/dashboard/metadata") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { timezone: "Pacific/Auckland" } }), { status: 200 })
        );
      }

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "task_open_1",
                  title: "Review onboarding form",
                  category: "new-client-onboarding",
                  priority: "high",
                  status: "open",
                  dueAt: "2026-06-08T00:00:00.000Z"
                },
                {
                  id: "task_open_2",
                  title: "Reply to client check-in",
                  category: "current-client-care",
                  priority: "medium",
                  status: "open",
                  dueAt: "2026-06-08T00:00:00.000Z"
                },
                {
                  id: "task_completed",
                  title: "Completed task",
                  category: "business-operations",
                  priority: "low",
                  status: "completed",
                  dueAt: "2026-06-08T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    expect(
      await screen.findByText("Monday, June 8th - 2 pipeline actions require attention.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Monday, October 24th/i)).not.toBeInTheDocument();
  });

  it("replaces client activity with a live CRM stage summary", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/dashboard/crm-summary") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                newLeadsLastFiveDays: 6,
                totalLeadsAndCustomers: 18,
                stageBreakdown: [
                  { stage: "initial-contact", label: "Initial Contact", count: 5 },
                  { stage: "consultation", label: "Consultation Scheduled", count: 4 },
                  { stage: "proposal", label: "Proposal Sent", count: 3 },
                  { stage: "negotiation", label: "In Negotiation", count: 2 },
                  { stage: "closed-won", label: "Closed - Won", count: 4 }
                ],
                updatedAt: "2026-06-07T07:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    const crmModule = await screen.findByRole("region", { name: "CRM Pipeline" });
    expect(within(crmModule).getByText("6")).toBeInTheDocument();
    expect(within(crmModule).getByText("new leads in the last 5 days")).toBeInTheDocument();
    expect(within(crmModule).getByText("Closed - Won")).toBeInTheDocument();
    expect(within(crmModule).getByText("18 total")).toBeInTheDocument();
    expect(within(crmModule).getByRole("link", { name: "Open CRM" })).toHaveAttribute("href", "/clients/crm");
    expect(screen.queryByText("Payment Secured")).not.toBeInTheDocument();
  });

  it("creates dashboard tasks through the task API when persistence is available", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/tasks" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "task_created",
                title: "Persisted dashboard task",
                category: "current-client-care",
                priority: "high",
                status: "open",
                dueAt: "2026-06-20T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/tasks?limit=100"));

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    fireEvent.change(screen.getByLabelText("Task Description"), {
      target: { value: "Persisted dashboard task" }
    });
    fireEvent.change(screen.getByLabelText("Due Date"), {
      target: { value: "2026-06-20" }
    });
    fireEvent.click(screen.getByRole("radio", { name: "Current Client Care" }));
    fireEvent.click(screen.getByRole("radio", { name: "High" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/tasks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Persisted dashboard task",
            category: "current-client-care",
            priority: "high",
            dueAt: "2026-06-20T00:00:00.000Z"
          })
        })
      )
    );
    expect(await screen.findByText("Persisted dashboard task")).toBeInTheDocument();
    expect(screen.getByText("Due Jun 20")).toBeInTheDocument();
  });

  it("orders all dashboard tasks by due date and then priority", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "task_low_early",
                  title: "Low priority early task",
                  category: "current-client-care",
                  priority: "low",
                  status: "open",
                  dueAt: "2026-06-10T00:00:00.000Z"
                },
                {
                  id: "task_high_early",
                  title: "High priority early task",
                  category: "current-client-care",
                  priority: "high",
                  status: "open",
                  dueAt: "2026-06-10T00:00:00.000Z"
                },
                {
                  id: "task_high_later",
                  title: "High priority later task",
                  category: "current-client-care",
                  priority: "high",
                  status: "open",
                  dueAt: "2026-06-12T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    await screen.findByText("High priority early task");

    const clientWork = screen.getByRole("region", { name: "Client Work" });
    const taskButtons = within(clientWork).getAllByRole("button");

    expect(taskButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining("High priority early task"),
      expect.stringContaining("Low priority early task"),
      expect.stringContaining("High priority later task")
    ]);
  });

  it("creates new client onboarding tasks from the side panel", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/tasks" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "task_onboarding",
                title: "Send onboarding questionnaire",
                category: "new-client-onboarding",
                priority: "medium",
                status: "open",
                dueAt: "2026-06-18T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/tasks?limit=100"));

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    fireEvent.change(screen.getByLabelText("Task Description"), {
      target: { value: "Send onboarding questionnaire" }
    });
    fireEvent.change(screen.getByLabelText("Due Date"), {
      target: { value: "2026-06-18" }
    });
    fireEvent.click(screen.getByRole("radio", { name: "New client/ Onboarding" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/tasks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Send onboarding questionnaire",
            category: "new-client-onboarding",
            priority: "medium",
            dueAt: "2026-06-18T00:00:00.000Z"
          })
        })
      )
    );
    const onboardingModule = screen.getByRole("region", { name: "New Client/Onboarding" });
    expect(within(onboardingModule).getByText("Send onboarding questionnaire")).toBeInTheDocument();
    expect(within(onboardingModule).getByText("Due Jun 18")).toBeInTheDocument();
  });

  it("completes persisted dashboard tasks through the task API and removes them from view", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/tasks?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "task_api_1",
                  title: "Persisted client review",
                  category: "current-client-care",
                  priority: "high",
                  status: "open",
                  dueAt: "2026-06-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/tasks/task_api_1/complete" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "task_api_1",
                title: "Persisted client review",
                category: "current-client-care",
                priority: "high",
                status: "completed",
                dueAt: "2026-06-14T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    const reviewTask = await screen.findByRole("button", {
      name: /mark persisted client review complete/i
    });
    fireEvent.click(reviewTask);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/tasks/task_api_1/complete", { method: "POST" }));
    expect(screen.queryByText("Persisted client review")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /mark persisted client review incomplete/i
      })
    ).not.toBeInTheDocument();
  });
});
