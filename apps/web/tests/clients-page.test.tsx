import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientsPage } from "@/components/clients/clients-page";

describe("ClientsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders roster stats and fixture-backed clients", () => {
    render(createElement(ClientsPage));

    expect(screen.getByRole("heading", { level: 1, name: "Client Roster" })).toBeInTheDocument();
    expect(screen.getByText("Total Clients")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Marcus Rodriguez" })).toHaveAttribute(
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
    expect(screen.getByText("Compliance Score")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export or import clients/i })).toBeInTheDocument();
  });

  it("searches clients by name", () => {
    render(createElement(ClientsPage));

    fireEvent.change(screen.getByRole("searchbox", { name: /search clients/i }), {
      target: { value: "Emma" }
    });

    expect(screen.getByRole("link", { name: /view Emma Thompson profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view Marcus Rodriguez profile/i })).not.toBeInTheDocument();
  });

  it("filters by status and check-in day", () => {
    render(createElement(ClientsPage));

    fireEvent.click(screen.getByRole("button", { name: "New" }));

    expect(screen.getByRole("link", { name: /view Sarah Martinez profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view Emma Thompson profile/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open client filters/i }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Monday" }));

    expect(screen.getByRole("link", { name: /view Ashley Davis profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view Sarah Martinez profile/i })).not.toBeInTheDocument();
  });

  it("sorts the visible roster A to Z", () => {
    render(createElement(ClientsPage));

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

  it("creates a client through the persistence API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "client_created_1",
              name: "Created Client",
              packageName: "Starter Coaching",
              compliance: 0,
              checkInDay: "Friday",
              latestCheckIn: "Not recorded",
              status: "new",
              startDate: "May 14, 2026",
              initials: "CC",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(ClientsPage));

    fireEvent.click(screen.getByRole("button", { name: "Add client" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Created" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Client" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "created@example.com" } });
    fireEvent.change(screen.getByLabelText("Package"), { target: { value: "Starter Coaching" } });
    fireEvent.change(screen.getByLabelText("Check-in day"), { target: { value: "Friday" } });
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    expect(await screen.findByRole("link", { name: /view Created Client profile/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/clients",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("created@example.com")
      })
    );
  });

  it("edits and archives an API-backed client", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
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
                startDate: "Apr 1, 2026",
                initials: "AC",
                avatarColor: "bg-slate-900"
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
              id: "client_api_1",
              name: "Updated Client",
              packageName: "Premium Package",
              compliance: 91,
              checkInDay: "Thursday",
              latestCheckIn: "May 1, 2026",
              status: "active",
              startDate: "Apr 1, 2026",
              initials: "UC",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
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
              startDate: "Apr 1, 2026",
              initials: "UC",
              avatarColor: "bg-slate-900"
            }
          }),
          { status: 200 }
        )
      );

    render(createElement(ClientsPage));

    expect(await screen.findByRole("link", { name: /view API Client profile/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit API Client/i }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Client" } });
    fireEvent.change(screen.getByLabelText("Package"), { target: { value: "Premium Package" } });
    fireEvent.change(screen.getByLabelText("Check-in day"), { target: { value: "Thursday" } });
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    expect(await screen.findByRole("link", { name: /view Updated Client profile/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /archive Updated Client/i }));
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));

    expect(await screen.findByRole("link", { name: /view Updated Client profile/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/clients/client_api_1/archive",
      expect.objectContaining({ method: "POST" })
    );
  });
});
