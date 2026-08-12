import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientsPage } from "@/components/clients/clients-page";

const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock()
}));

const apiClients = [
  {
    id: "1",
    name: "Marcus Rodriguez",
    packageName: "Elite Performance",
    compliance: 96,
    checkInDay: "Monday",
    latestCheckIn: "Apr 14, 2026",
    status: "active",
    assignedCoachName: "Sam Coach",
    startDate: "Jan 15, 2026",
    initials: "MR",
    avatarColor: "bg-indigo-600"
  },
  {
    id: "2",
    name: "Emma Thompson",
    packageName: "Standard Package",
    compliance: 88,
    checkInDay: "Tuesday",
    latestCheckIn: "Apr 15, 2026",
    status: "active",
    assignedCoachName: "Sam Coach",
    startDate: "Feb 3, 2026",
    initials: "ET",
    avatarColor: "bg-blue-600"
  },
  {
    id: "3",
    name: "Sarah Martinez",
    packageName: "Standard Package",
    compliance: 84,
    checkInDay: "Thursday",
    latestCheckIn: "Apr 17, 2026",
    status: "new",
    assignedCoachName: "Alex Admin",
    startDate: "Apr 14, 2026",
    initials: "SM",
    avatarColor: "bg-emerald-600"
  },
  {
    id: "4",
    name: "Ashley Davis",
    packageName: "Starter Package",
    compliance: 82,
    checkInDay: "Monday",
    latestCheckIn: "Apr 18, 2026",
    status: "new",
    assignedCoachName: null,
    startDate: "Apr 20, 2026",
    initials: "AD",
    avatarColor: "bg-purple-600"
  }
];

function mockClientsApi(clients = apiClients) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (url === "/api/v1/clients") {
      return Promise.resolve(new Response(JSON.stringify({ data: clients }), { status: 200 }));
    }

    if (url === "/api/v1/packages?status=active&limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "package_elite", name: "Elite Performance" }] }), { status: 200 }));
    }

    if (url === "/api/v1/training-program-templates?limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "training_template_1", name: "Strength Foundation" }] }), { status: 200 }));
    }

    if (url === "/api/v1/meal-plan-templates?limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "meal_template_1", name: "Hypertrophy Fuel" }] }), { status: 200 }));
    }

    if (url === "/api/v1/supplement-plan-templates?limit=100") {
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "supplement_template_1", name: "Sleep Support" }] }), { status: 200 }));
    }

    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });
}

describe("ClientsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useSessionMock.mockReset();
  });

  beforeEach(() => {
    useSessionMock.mockReturnValue({
      data: {
        activeOrganization: {
          role: "owner"
        }
      },
      status: "authenticated"
    });
  });

  it("renders roster stats and API-backed clients", async () => {
    mockClientsApi();
    render(createElement(ClientsPage));

    expect(screen.getByRole("heading", { level: 1, name: "Client Roster" })).toBeInTheDocument();
    expect(screen.getByText("Total Clients")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Marcus Rodriguez" })).toHaveAttribute(
      "href",
      "/clients/1"
    );
    expect(screen.getByRole("link", { name: /view Marcus Rodriguez profile/i })).toHaveAttribute(
      "href",
      "/clients/1"
    );
    expect(screen.getByRole("link", { name: /view Emma Thompson profile/i })).toBeInTheDocument();
  });

  it("renders the Figma client roster controls and table surface", () => {
    mockClientsApi([]);
    render(createElement(ClientsPage));

    expect(screen.getByText("New Clients This Week")).toBeInTheDocument();
    expect(screen.getByText("Check-ins Due")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search clients/i })).toHaveAttribute(
      "placeholder",
      "Search clients..."
    );
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archived" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivated" })).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import clients csv/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export or import clients/i })).not.toBeInTheDocument();
  });

  it("shows assigned coach and live status for owner and admin sessions", async () => {
    mockClientsApi();
    render(createElement(ClientsPage));

    const rows = await screen.findAllByTestId("client-row");

    expect(screen.getByText("Coach")).toBeInTheDocument();
    expect(screen.getAllByText("Sam Coach")[0]).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText("Client status Active")).toBeInTheDocument();
  });

  it("hides the assigned coach column for team members", async () => {
    useSessionMock.mockReturnValue({
      data: {
        activeOrganization: {
          role: "coach"
        }
      },
      status: "authenticated"
    });
    mockClientsApi();
    render(createElement(ClientsPage));

    await screen.findByRole("link", { name: /view Marcus Rodriguez profile/i });

    expect(screen.queryByText("Coach")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam Coach")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Client status Active")).toHaveLength(2);
  });

  it("searches clients by name", async () => {
    mockClientsApi();
    render(createElement(ClientsPage));

    await screen.findByRole("link", { name: /view Emma Thompson profile/i });

    fireEvent.change(screen.getByRole("searchbox", { name: /search clients/i }), {
      target: { value: "Emma" }
    });

    expect(screen.getByRole("link", { name: /view Emma Thompson profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view Marcus Rodriguez profile/i })).not.toBeInTheDocument();
  });

  it("filters by status and check-in day", async () => {
    mockClientsApi();
    render(createElement(ClientsPage));

    await screen.findByRole("link", { name: /view Sarah Martinez profile/i });

    fireEvent.click(screen.getByRole("button", { name: "New" }));

    expect(screen.getByRole("link", { name: /view Sarah Martinez profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view Emma Thompson profile/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open client filters/i }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Monday" }));

    expect(screen.getByRole("link", { name: /view Ashley Davis profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view Sarah Martinez profile/i })).not.toBeInTheDocument();
  });

  it("sorts the visible roster A to Z", async () => {
    mockClientsApi();
    render(createElement(ClientsPage));

    await screen.findByRole("link", { name: /view Marcus Rodriguez profile/i });

    fireEvent.click(screen.getByRole("button", { name: /open client filters/i }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Sort A-Z" }));

    const rows = screen.getAllByTestId("client-row");

    expect(within(rows[0]).getByText("Ashley Davis")).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByText("Sarah Martinez")).toBeInTheDocument();
  });

  it("loads API-backed clients when the persistence API is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "client_api_1",
              name: "API Client",
              packageName: "Persisted Package",
              compliance: 91,
              checkInDay: "Wednesday",
              latestCheckIn: "May 1, 2026",
              status: "active",
              assignedCoachName: "Sam Coach",
              startDate: "Apr 1, 2026",
              initials: "AC",
              avatarColor: "bg-slate-900"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(ClientsPage));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /view API Client profile/i })).toHaveAttribute(
        "href",
        "/clients/client_api_1"
      );
    });
  });

  it("routes roster client creation to the new client intake", () => {
    mockClientsApi([]);

    render(createElement(ClientsPage));

    expect(screen.getByRole("link", { name: "Add client" })).toHaveAttribute("href", "/clients/new");
  });

  it("edits and archives an API-backed client", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/clients") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "client_api_1",
                  name: "API Client",
                  packageName: "Persisted Package",
                  compliance: 91,
                  checkInDay: "Wednesday",
                  latestCheckIn: "May 1, 2026",
                  status: "active",
                  assignedCoachName: "Sam Coach",
                  primaryCoachUserId: "coach_1",
                  startDate: "Apr 1, 2026",
                  initials: "AC",
                  avatarColor: "bg-slate-900"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/packages?status=active&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "package_premium", name: "Premium Package", currency: "aud" }] }), { status: 200 }));
      }

      if (url === "/api/v1/forms?type=intake&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "form_intake", name: "Initial Intake" }] }), { status: 200 }));
      }

      if (url === "/api/v1/forms?type=habit-tracker&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "form_habits", name: "Daily Habits" }] }), { status: 200 }));
      }

      if (url === "/api/v1/forms?type=check-in&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "form_checkin", name: "Weekly Check-in" }] }), { status: 200 }));
      }

      if (url === "/api/v1/training-program-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "training_template_1", name: "Strength Foundation" }] }), { status: 200 }));
      }

      if (url === "/api/v1/meal-plan-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "meal_template_1", name: "Hypertrophy Fuel" }] }), { status: 200 }));
      }

      if (url === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "supplement_template_1", name: "Sleep Support" }] }), { status: 200 }));
      }

      if (url === "/api/v1/team-members") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  { userId: "coach_1", name: "Sam Coach", email: "sam@example.com", role: "coach", status: "active" },
                  { userId: "coach_2", name: "Alex Admin", email: "alex@example.com", role: "admin", status: "active" }
                ]
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/clients/client_api_1/profile" && init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify({ data: { dateOfBirth: "1992-06-14" } }), { status: 200 }));
      }

      if (url === "/api/v1/clients/client_api_1/profile") {
        return Promise.resolve(new Response(JSON.stringify({ data: { dateOfBirth: "1990-01-01T00:00:00.000Z" } }), { status: 200 }));
      }

      if (url === "/api/v1/clients/client_api_1" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "client_api_1",
                name: "Updated Client",
                packageName: "Premium Package",
                compliance: 91,
                checkInDay: "Thursday",
                latestCheckIn: "May 1, 2026",
                status: "active",
                assignedCoachName: "Alex Admin",
                primaryCoachUserId: "coach_2",
                startDate: "Apr 1, 2026",
                initials: "UC",
                avatarColor: "bg-slate-900"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (
        url === "/api/v1/training-program-assignments" ||
        url === "/api/v1/meal-plan-assignments" ||
        url === "/api/v1/supplement-plan-assignments"
      ) {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "assignment_created" } }), { status: 201 }));
      }

      if (url === "/api/v1/packages/package_premium" && init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "package_premium" } }), { status: 200 }));
      }

      if (url === "/api/v1/clients/client_api_1/archive") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "client_api_1",
                name: "Updated Client",
                packageName: "Premium Package",
                compliance: 91,
                checkInDay: "Thursday",
                latestCheckIn: "May 1, 2026",
                status: "archived",
                assignedCoachName: "Sam Coach",
                startDate: "Apr 1, 2026",
                initials: "UC",
                avatarColor: "bg-slate-900"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/clients/client_api_1" && init?.method === "DELETE") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "client_api_1", deleted: true } }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientsPage));

    expect(await screen.findByRole("link", { name: /view API Client profile/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit API Client/i }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Client" } });
    expect(await screen.findByLabelText("Date of birth")).toHaveValue("1990-01-01");
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1992-06-14" } });
    fireEvent.change(screen.getByLabelText("Payment plan/package"), { target: { value: "package_premium" } });
    expect(screen.getByLabelText("Assigned coach")).toHaveValue("coach_1");
    fireEvent.change(screen.getByLabelText("Assigned coach"), { target: { value: "coach_2" } });
    expect(screen.getByRole("button", { name: "No, set up offline payment" })).toHaveClass("bg-orange-500");
    fireEvent.click(screen.getByRole("button", { name: "Thursday" }));
    fireEvent.change(screen.getByLabelText("Initial Q/A"), { target: { value: "form_intake" } });
    fireEvent.change(screen.getByLabelText("Daily habit form"), { target: { value: "form_habits" } });
    fireEvent.change(screen.getByLabelText("Check in form"), { target: { value: "form_checkin" } });
    fireEvent.change(screen.getByLabelText("Scheduled payment price"), { target: { value: "799" } });
    expect(screen.getByLabelText("Scheduled payment currency")).toHaveValue("aud");
    fireEvent.change(screen.getByLabelText("Payment change starts on"), { target: { value: "2026-09-01" } });

    searchAndSelectPlan("Training plans", "Strength", "Strength Foundation");
    searchAndSelectPlan("Nutrition plans", "Fuel", "Hypertrophy Fuel");
    searchAndSelectPlan("Supplementation plans", "Sleep", "Sleep Support");
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    expect(await screen.findByRole("link", { name: /view Updated Client profile/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/client_api_1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("\"primaryCoachUserId\":\"coach_2\"")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/client_api_1/profile",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("\"dateOfBirth\":\"1992-06-14\"")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients/client_api_1/profile",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("\"checkInDays\":[\"Wednesday\",\"Thursday\"]")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-assignments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("training_template_1")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/meal-plan-assignments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("meal_template_1")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/supplement-plan-assignments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("supplement_template_1")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/packages/package_premium",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          scheduledPriceAmount: 79900,
          scheduledPriceCurrency: "aud",
          scheduledPriceStartsAt: "2026-09-01T00:00:00.000Z"
        })
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /archive Updated Client/i }));
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));

    expect(await screen.findByRole("link", { name: /view Updated Client profile/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/clients/client_api_1/archive",
      expect.objectContaining({ method: "POST" })
    );

    fireEvent.click(screen.getByRole("button", { name: /delete Updated Client/i }));

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /view Updated Client profile/i })).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/clients/client_api_1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("preselects assigned client plans in the roster edit dialog and does not duplicate them on save", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/clients") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "client_api_1",
                  name: "API Client",
                  packageName: "Persisted Package",
                  compliance: 91,
                  checkInDay: "Wednesday",
                  latestCheckIn: "May 1, 2026",
                  status: "active",
                  assignedCoachName: "Sam Coach",
                  startDate: "Apr 1, 2026",
                  initials: "AC",
                  avatarColor: "bg-slate-900"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/training-program-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "training_template_1", name: "Strength Foundation" }] }), { status: 200 }));
      }

      if (url === "/api/v1/meal-plan-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "meal_template_1", name: "Hypertrophy Fuel" }] }), { status: 200 }));
      }

      if (url === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "supplement_template_1", name: "Sleep Support" }] }), { status: 200 }));
      }

      if (url === "/api/v1/training-program-assignments?clientId=client_api_1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ templateId: "training_template_1", status: "active" }] }), { status: 200 }));
      }

      if (url === "/api/v1/meal-plan-assignments?clientId=client_api_1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ templateId: "meal_template_1", status: "paused" }] }), { status: 200 }));
      }

      if (url === "/api/v1/supplement-plan-assignments?clientId=client_api_1&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ templateId: "supplement_template_1", status: "active" }] }), { status: 200 }));
      }

      if (url === "/api/v1/clients/client_api_1/profile") {
        return Promise.resolve(new Response(JSON.stringify({ data: { dateOfBirth: "1990-01-01T00:00:00.000Z" } }), { status: 200 }));
      }

      if (url === "/api/v1/clients/client_api_1" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "client_api_1",
                name: "API Client",
                packageName: "Persisted Package",
                compliance: 91,
                checkInDay: "Wednesday",
                latestCheckIn: "May 1, 2026",
                status: "active",
                assignedCoachName: "Sam Coach",
                startDate: "Apr 1, 2026",
                initials: "AC",
                avatarColor: "bg-slate-900"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(ClientsPage));

    expect(await screen.findByRole("link", { name: /view API Client profile/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /edit API Client/i }));

    expect(await screen.findByRole("button", { name: /Strength Foundation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hypertrophy Fuel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sleep Support/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/clients/client_api_1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/training-program-assignments",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/meal-plan-assignments",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/supplement-plan-assignments",
      expect.objectContaining({ method: "POST" })
    );
  });
});

function searchAndSelectPlan(label: string, query: string, optionName: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: query } });
  fireEvent.click(screen.getByLabelText(optionName));
}
