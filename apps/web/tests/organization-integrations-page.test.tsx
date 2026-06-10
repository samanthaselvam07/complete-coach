import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OrganizationSettingsPage integrations panel", () => {
  it("shows connected social channels and OAuth links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "connection_1",
              provider: "instagram",
              accountName: "Complete Coach IG",
              status: "active"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("Social channels loaded.")).toBeInTheDocument();
    expect(screen.getByText("Complete Coach IG")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reconnect Instagram" })).toHaveAttribute(
      "href",
      "/api/v1/social/connections/oauth/start?provider=instagram&redirectTo=/organization-settings"
    );
    expect(screen.getByRole("link", { name: "Connect Facebook" })).toHaveAttribute(
      "href",
      "/api/v1/social/connections/oauth/start?provider=facebook&redirectTo=/organization-settings"
    );
  });

  it("keeps organisation calendar connections out of organisation settings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("No social channels connected yet.")).toBeInTheDocument();
    expect(screen.queryByText("Organisation Calendar Connections")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect Google Calendar" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => String(input).startsWith("/api/v1/calendar/connections"))).toBe(false);
  });

  it("edits email and push automation triggers from organisation settings", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Automations" }));

    expect(screen.getByRole("table", { name: "Automation triggers" })).toBeInTheDocument();
    expect(screen.getByText("New client created")).toBeInTheDocument();
    expect(screen.getByText("Client completes a check-in")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle New client created automation")).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Actions for New client created" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.getByRole("heading", { level: 3, name: "New client created" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("NEW CLIENT CREATED")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "email" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "push" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Welcome to Complete Coach!")).toBeInTheDocument();
    expect(screen.getByText("[FIRST_NAME]")).toBeInTheDocument();
    expect(screen.getByText("[LAST_NAME]")).toBeInTheDocument();
    expect(screen.getByLabelText("Email automation message")).toHaveValue(
      "[FIRST_NAME]!\n\nWelcome to your coaching program. I need 10 minutes of your time to make sure you are clear on the next steps.\n\nThings you will need for success:\n\n- Bodyweight scales\n- Measuring tape\n- Wearable activity tracker\n- Food scale\n- Meal prep containers\n- Gym membership"
    );
    expect(screen.getByLabelText("When do you want to send this message?")).toHaveValue(1);
    expect(screen.getByLabelText("Interval")).toHaveValue("Minutes");

    fireEvent.click(screen.getByRole("tab", { name: "push" }));

    expect(screen.getByLabelText("Push automation message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Automation" })).toBeInTheDocument();
  });

  it("creates a Stripe Connect onboarding link from organization settings", async () => {
    const onboardingWindow = { close: vi.fn(), location: { href: "about:blank" } };
    const openMock = vi.spyOn(window, "open").mockReturnValue(onboardingWindow as unknown as Window);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/stripe/connect/account-link" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                accountId: "acct_1",
                status: "onboarding-required",
                onboardingUrl: "https://connect.stripe.com/setup/test",
                expiresAt: "2026-06-09T10:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));
    fireEvent.click(screen.getByRole("button", { name: "Connect Stripe account" }));

    expect(await screen.findByRole("link", { name: "Continue Stripe onboarding" })).toHaveAttribute(
      "href",
      "https://connect.stripe.com/setup/test"
    );
    expect(screen.getByText("onboarding-required")).toBeInTheDocument();
    expect(openMock).toHaveBeenCalledWith("about:blank", "_blank", "noopener,noreferrer");
    expect(onboardingWindow.location.href).toBe("https://connect.stripe.com/setup/test");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/stripe/connect/account-link",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("creates an on-demand Stripe dashboard link from organization settings", async () => {
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/stripe/connect/dashboard-link" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                accountId: "acct_1",
                status: "active",
                dashboardUrl: "https://stripe.com/express/test-login"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Stripe dashboard" }));

    expect(await screen.findByText("active")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/stripe/connect/dashboard-link", { method: "POST" });
    expect(openMock).toHaveBeenCalledWith("https://stripe.com/express/test-login", "_blank", "noopener,noreferrer");
  });

  it("shows integration loading errors without blocking the settings page", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("Social channels could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Stripe account" })).toBeInTheDocument();
  });
});
