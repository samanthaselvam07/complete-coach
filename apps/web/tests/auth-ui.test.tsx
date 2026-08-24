import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SignInPage from "@/app/sign-in/page";
import SignUpPage from "@/app/sign-up/page";
import { UserMenu } from "@/components/app-shell/user-menu";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";

const signInMock = vi.fn();
const signOutMock = vi.fn();
const useSessionMock = vi.fn();
const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  replace: vi.fn()
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  useSession: () => useSessionMock()
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => navigationMocks.redirect(...args),
  useRouter: () => ({
    replace: navigationMocks.replace
  })
}));

describe("auth UI", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signOutMock.mockReset();
    useSessionMock.mockReset();
    navigationMocks.redirect.mockReset();
    navigationMocks.replace.mockReset();
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
    expect(screen.getByRole("menuitem", { name: /organisation settings/i })).toHaveAttribute(
      "href",
      "/organization-settings"
    );
    expect(screen.queryByRole("menuitem", { name: /team management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /subscription and billing/i })).not.toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("menuitem", { name: /sign out/i }));

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
  });

  it("submits credentials through Auth.js without exposing passwords in the URL", async () => {
    signInMock.mockResolvedValue({});

    render(createElement(SignInForm, { callbackUrl: "/admin" }));

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "coach@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "correct-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("credentials", {
        email: "coach@example.com",
        password: "correct-password",
        redirect: false
      });
    });
    expect(navigationMocks.replace).toHaveBeenCalledWith("/admin");
  });

  it("shows a visible error when credential sign-in fails", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    render(createElement(SignInForm));

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "coach@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not sign you in/i);
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("keeps plain auth pages linked between sign in and sign up", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up");

    render(createElement(SignUpPage));

    expect(screen.getByRole("heading", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("creates a coach account then signs into the clean organization workspace", async () => {
    signInMock.mockResolvedValue({});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: { id: "user_new", email: "coach@example.com", name: "Demo Coach" },
            organization: { id: "org_new", name: "Demo Coaching", slug: "demo-coaching" }
          }
        }),
        { status: 201 }
      )
    );

    render(createElement(SignUpForm));

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Demo Coach" }
    });
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "coach@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "correct-password" }
    });
    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: "Demo Coaching" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await screen.findByText(/workspace created/i);

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Demo Coach",
        email: "coach@example.com",
        password: "correct-password",
        organizationName: "Demo Coaching",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      })
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "coach@example.com",
      password: "correct-password",
      redirect: false
    });
    expect(navigationMocks.replace).toHaveBeenCalledWith("/");

    fetchMock.mockRestore();
  });
});
