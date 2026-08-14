import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientAccountProfilePage } from "@/components/client-app/client-account-profile-page";

const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args)
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile"
}));

class TestFileReader {
  result: string | ArrayBuffer | null = null;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  readAsDataURL() {
    this.result = "data:image/png;base64,cHJvZmlsZQ==";
    this.onload?.();
  }
}

describe("ClientAccountProfilePage", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    vi.stubGlobal("FileReader", TestFileReader);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads account details, saves edits with a profile photo, and links to privacy", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/profile" && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            data: {
              user: {
                id: "user_client",
                name: "Client Updated",
                email: "updated@example.com",
                photoUrl: "data:image/png;base64,cHJvZmlsZQ=="
              },
              client: {
                id: "client_1",
                firstName: "Client",
                lastName: "Updated",
                email: "updated@example.com",
                phone: "0499999999",
                timezone: "Australia/Melbourne",
                status: "active"
              },
              privacyPolicyUrl: "/privacy-policy"
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/profile") {
        return new Response(
          JSON.stringify({
            data: {
              user: {
                id: "user_client",
                name: "Client One",
                email: "client@example.com",
                photoUrl: null
              },
              client: {
                id: "client_1",
                firstName: "Client",
                lastName: "One",
                email: "client@example.com",
                phone: "0400000000",
                timezone: "Australia/Melbourne",
                status: "active"
              },
              privacyPolicyUrl: "/privacy-policy"
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientAccountProfilePage />);

    expect(await screen.findByDisplayValue("Client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View privacy policy" })).toHaveAttribute("href", "/privacy-policy");

    fireEvent.change(screen.getByLabelText("Profile picture"), {
      target: { files: [new File(["profile"], "profile.png", { type: "image/png" })] }
    });
    expect(await screen.findByRole("img", { name: "Profile picture preview" })).toHaveAttribute(
      "src",
      "data:image/png;base64,cHJvZmlsZQ=="
    );

    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "updated@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0499999999" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Profile saved."));
    const saveCall = fetchMock.mock.calls.find(([url, init]) => url === "/api/v1/client/profile" && init?.method === "PATCH");
    expect(saveCall).toBeDefined();
    expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({
      firstName: "Client",
      lastName: "Updated",
      email: "updated@example.com",
      phone: "0499999999",
      password: "new-password",
      photoDataUrl: "data:image/png;base64,cHJvZmlsZQ=="
    });
  });

  it("logs out and requires typed confirmation before deleting the account", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/profile" && init?.method === "DELETE") {
        return new Response(JSON.stringify({ data: { deleted: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url === "/api/v1/client/profile") {
        return new Response(
          JSON.stringify({
            data: {
              user: { id: "user_client", name: "Client One", email: "client@example.com", photoUrl: null },
              client: {
                id: "client_1",
                firstName: "Client",
                lastName: "One",
                email: "client@example.com",
                phone: "",
                timezone: "Australia/Melbourne",
                status: "active"
              },
              privacyPolicyUrl: "/privacy-policy"
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientAccountProfilePage />);

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/sign-in" });

    expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm account deletion"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/client/profile", expect.objectContaining({ method: "DELETE" })));
    const deleteCall = fetchMock.mock.calls.find(([url, init]) => url === "/api/v1/client/profile" && init?.method === "DELETE");
    expect(JSON.parse(String(deleteCall?.[1]?.body))).toEqual({ confirmation: "DELETE" });
    expect(signOutMock).toHaveBeenLastCalledWith({ redirectTo: "/sign-in" });
  });
});
