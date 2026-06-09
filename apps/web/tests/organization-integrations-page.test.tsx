import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OrganizationSettingsPage integrations panel", () => {
  it("shows connected social channels and OAuth links", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).startsWith("/api/v1/calendar/connections")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(
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
    });

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

  it("sets up organisation calendar connections for Apple, Google, and Outlook", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/calendar/connections?scope=organization") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "calendar_1",
                  provider: "google",
                  scope: "organization",
                  accountName: "ops@completecoach.fit",
                  calendarName: "Complete Coach HQ",
                  status: "active"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/calendar/connections/apple" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "calendar_apple",
                provider: "apple",
                scope: "organization",
                accountName: "Apple Calendar setup",
                calendarName: "Apple Calendar",
                status: "pending"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("ops@completecoach.fit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect Google Calendar" })).toHaveAttribute(
      "href",
      "/api/v1/calendar/connections/oauth/start?provider=google&scope=organization&redirectTo=/organization-settings"
    );
    expect(screen.getByRole("link", { name: "Connect Outlook Calendar" })).toHaveAttribute(
      "href",
      "/api/v1/calendar/connections/oauth/start?provider=outlook&scope=organization&redirectTo=/organization-settings"
    );

    fireEvent.click(screen.getByRole("button", { name: "Set up Apple Calendar" }));

    expect(await screen.findByText("Apple Calendar setup")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/calendar/connections/apple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ scope: "organization" })
      })
    );
  });

  it("creates a Stripe Connect onboarding link from organization settings", async () => {
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/stripe/connect/account-link",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows integration loading errors without blocking the settings page", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("Social channels could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Stripe account" })).toBeInTheDocument();
  });
});
