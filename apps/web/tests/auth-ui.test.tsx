import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/app-shell/user-menu";
import { SignInForm } from "@/components/auth/sign-in-form";

const signInMock = vi.fn();
const signOutMock = vi.fn();
const useSessionMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  useSession: () => useSessionMock()
}));

describe("auth UI", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signOutMock.mockReset();
    useSessionMock.mockReset();
  });

  it("shows a sign-in link when no session is present", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    render(createElement(UserMenu));

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/sign-in");
  });

  it("shows a consolidated account menu for signed-in users and can sign out", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { name: "Demo Coach", email: "coach@example.com" },
        activeOrganization: { name: "Complete Coach Demo", role: "owner" }
      },
      status: "authenticated"
    });

    render(createElement(UserMenu));

    expect(screen.queryByRole("button", { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open account menu for demo coach/i }));

    const menu = screen.getByRole("menu", { name: /account menu/i });

    expect(screen.getByText("Demo Coach")).toBeInTheDocument();
    expect(screen.getByText("Complete Coach Demo · owner")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /team management/i })).toHaveAttribute(
      "href",
      "/team-management"
    );
    expect(screen.getByRole("menuitem", { name: /subscription and billing/i })).toHaveAttribute(
      "href",
      "/organization-settings"
    );

    fireEvent.click(within(menu).getByRole("menuitem", { name: /sign out/i }));

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
  });

  it("submits credentials through Auth.js without exposing passwords in the URL", () => {
    render(createElement(SignInForm));

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "coach@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "correct-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "coach@example.com",
      password: "correct-password",
      redirectTo: "/"
    });
  });
});
