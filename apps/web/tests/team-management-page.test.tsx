import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeamManagementPage } from "@/components/team/team-management-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TeamManagementPage", () => {
  it("loads persisted members and creates an invitation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/team-members" && !init?.method) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  {
                    id: "membership_1",
                    userId: "user_1",
                    name: "Owner Coach",
                    email: "owner@example.com",
                    image: null,
                    role: "owner",
                    status: "active"
                  }
                ],
                invitations: []
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/team-members/invitations" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                invitation: {
                  id: "invitation_1",
                  email: "new@example.com",
                  role: "coach",
                  status: "pending",
                  expiresAt: "2026-06-13T00:00:00.000Z"
                },
                token: "one-time-token"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<TeamManagementPage />);

    expect(await screen.findByText("Owner Coach")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Team Management" })).toBeInTheDocument();
    expect(screen.getByText("Orchestrate your coaching roster and client distribution.")).toBeInTheDocument();
    expect(screen.getByText("Team Weekly Revenue")).toBeInTheDocument();
    expect(screen.getByText("Active Roster")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Team Member" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create invitation" }));

    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/team-members/invitations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "coach" })
      })
    );
  });

  it("shows an empty persisted roster when the team API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));
    render(<TeamManagementPage />);

    await waitFor(() => expect(screen.queryByText(/read-only fallback mode/i)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add Team Member" })).toBeDisabled();
    expect(screen.getByText("No team members were returned from the database.")).toBeInTheDocument();
  });

  it("updates roles and removes persisted members", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/team-members" && !init?.method) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  {
                    id: "membership_2",
                    userId: "user_2",
                    name: "Alex Coach",
                    email: "alex@example.com",
                    image: null,
                    role: "coach",
                    status: "active"
                  }
                ],
                invitations: []
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/team-members/membership_2" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "membership_2",
                userId: "user_2",
                name: "Alex Coach",
                email: "alex@example.com",
                image: null,
                role: "admin",
                status: "active"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/team-members/membership_2" && init?.method === "DELETE") {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<TeamManagementPage />);

    const roleSelect = await screen.findByRole("combobox", { name: "Role for Alex Coach" });
    fireEvent.change(roleSelect, { target: { value: "admin" } });
    expect(await screen.findByText("Alex Coach updated.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("alex@example.com")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/team-members/membership_2",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
