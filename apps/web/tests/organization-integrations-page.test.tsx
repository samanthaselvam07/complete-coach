import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";

const navigationMocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  navigateToExternalUrl: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationMocks.searchParams
}));

vi.mock("@/lib/browser-navigation", () => ({
  navigateToExternalUrl: navigationMocks.navigateToExternalUrl
}));

afterEach(() => {
  vi.restoreAllMocks();
  navigationMocks.searchParams = new URLSearchParams();
  navigationMocks.navigateToExternalUrl.mockReset();
});

describe("OrganizationSettingsPage integrations panel", () => {
  it("temporarily hides sender domain DNS settings", () => {
    render(<OrganizationSettingsPage />);

    expect(screen.queryByRole("tab", { name: "Email DNS" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create DNS records" })).not.toBeInTheDocument();
  });

  it("does not load sender domain setup while DNS is temporarily hidden", () => {
    render(<OrganizationSettingsPage />);

    expect(screen.queryByText("No sender domains configured yet.")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("mail.yourdomain.com")).not.toBeInTheDocument();
  });

  it("renders billing while temporarily hiding team and member permission tabs", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    expect(screen.getByText("Complete Coach Operating System")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Core plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Design Partners plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Pro plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Scale plan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage billing" })).toHaveAttribute(
      "href",
      "https://billing.stripe.com/p/login/cNi7sLdM8fNX0V6gMJ0ZW00"
    );
    expect(screen.queryByRole("link", { name: "Manage coaching packages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Team Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Role Permissions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open team management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Role permissions matrix" })).not.toBeInTheDocument();
  });

  it("links to the Stripe billing portal from the subscription and billing tab", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/platform-billing/status") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                organizationId: "org_1",
                plan: { id: "core", name: "Core", coachSeatLimit: 1, clientLimit: 20 },
                status: "active",
                access: {
                  state: "active",
                  canUsePlatform: true,
                  reason: "subscription_active",
                  message: "Platform access is active."
                },
                currentPeriodEnd: "2026-08-13T00:00:00.000Z",
                usage: { coachSeats: 1, clients: 24 }
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    expect(await screen.findByRole("link", { name: "Manage billing" })).toHaveAttribute(
      "href",
      "https://billing.stripe.com/p/login/cNi7sLdM8fNX0V6gMJ0ZW00"
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/platform-billing/portal", expect.anything());
    expect(navigationMocks.navigateToExternalUrl).not.toHaveBeenCalled();
  });

  it("opens hosted payment links for Design Partners, Core, Pro, and Scale from the subscription and billing tab", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/platform-billing/status") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                organizationId: "org_1",
                plan: { id: "core", name: "Core", coachSeatLimit: 1, clientLimit: 20 },
                status: "not_started",
                access: {
                  state: "blocked",
                  canUsePlatform: false,
                  reason: "subscription_required",
                  message: "Choose a Complete Coach plan to activate platform access."
                },
                currentPeriodEnd: null,
                usage: { coachSeats: 1, clients: 12 }
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    let view = render(<OrganizationSettingsPage />);

    expect(await screen.findByText("Choose a Complete Coach plan to activate platform access.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Core plan" }));

    expect(navigationMocks.navigateToExternalUrl).toHaveBeenCalledWith(
      "https://buy.stripe.com/cNi00jgYkbxHeLW2VT0ZW02?client_reference_id=org_1"
    );
    expect(screen.queryByText("Choose a Complete Coach plan to activate platform access.")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/platform-billing/checkout", expect.anything());

    view.unmount();
    navigationMocks.navigateToExternalUrl.mockReset();
    fetchMock.mockClear();

    view = render(<OrganizationSettingsPage />);

    expect(await screen.findByText("Choose a Complete Coach plan to activate platform access.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Start Design Partners plan" }));

    expect(navigationMocks.navigateToExternalUrl).toHaveBeenCalledWith(
      "https://buy.stripe.com/6oU4gzgYk1X71ZagMJ0ZW04?client_reference_id=org_1"
    );

    view.unmount();
    navigationMocks.navigateToExternalUrl.mockReset();
    fetchMock.mockClear();

    view = render(<OrganizationSettingsPage />);

    expect(await screen.findByText("Choose a Complete Coach plan to activate platform access.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Start Pro plan" }));

    expect(navigationMocks.navigateToExternalUrl).toHaveBeenCalledWith(
      "https://buy.stripe.com/cNi7sLdM8fNX0V6gMJ0ZW00?client_reference_id=org_1"
    );

    view.unmount();
    navigationMocks.navigateToExternalUrl.mockReset();
    fetchMock.mockClear();

    render(<OrganizationSettingsPage />);

    expect(await screen.findByText("Choose a Complete Coach plan to activate platform access.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Start Scale plan" }));

    expect(navigationMocks.navigateToExternalUrl).toHaveBeenCalledWith(
      "https://buy.stripe.com/aFafZh6jG6dnbzK9kh0ZW03?client_reference_id=org_1"
    );
  });

  it("refreshes platform billing plan, status, coach seats, and clients dynamically", async () => {
    const billingResponses = [
      {
        organizationId: "org_1",
        plan: { id: "core", name: "Core", coachSeatLimit: 1, clientLimit: 20 },
        status: "active",
        access: {
          state: "active",
          canUsePlatform: true,
          reason: "subscription_active",
          message: "Platform access is active."
        },
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        usage: { coachSeats: 1, clients: 24 }
      },
      {
        organizationId: "org_1",
        plan: { id: "pro", name: "Pro", coachSeatLimit: 3, clientLimit: 80 },
        status: "past_due",
        access: {
          state: "blocked",
          canUsePlatform: false,
          reason: "payment_attention_required",
          message: "Platform access is paused because the subscription payment is overdue."
        },
        currentPeriodEnd: "2026-09-13T00:00:00.000Z",
        usage: { coachSeats: 2, clients: 42 }
      },
      {
        organizationId: "org_1",
        plan: { id: "scale", name: "Scale", coachSeatLimit: 5, clientLimit: null },
        status: "active",
        access: {
          state: "active",
          canUsePlatform: true,
          reason: "subscription_active",
          message: "Platform access is active."
        },
        currentPeriodEnd: "2026-10-13T00:00:00.000Z",
        usage: { coachSeats: 4, clients: 55 }
      }
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/v1/platform-billing/status") {
        const data = billingResponses.shift() ?? billingResponses[0];

        return Promise.resolve(new Response(JSON.stringify({ data }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    expect(await screen.findByText("Core")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("24/20")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh billing status" }));

    expect(await screen.findByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Past due")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("42/80")).toBeInTheDocument();
    expect(screen.getByText("Platform access is paused because the subscription payment is overdue.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/platform-billing/status");

    window.dispatchEvent(new Event("complete-coach:platform-billing-usage-changed"));

    expect(await screen.findByText("Scale")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("55/Unlimited")).toBeInTheDocument();
  });

  it("shows connected social channels and OAuth links", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/stripe/connect/status") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { connected: false, status: "not-connected" } }), { status: 200 })
        );
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

  it("keeps organisation calendar connections out of organisation settings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/stripe/connect/status") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { connected: true, status: "active" } }), { status: 200 })
        );
      }

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/stripe/connect/status") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { connected: true, status: "active" } }), { status: 200 })
        );
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

  it("edits email automation triggers from organisation settings", () => {
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
    expect(screen.getByText("Email notification")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "push" })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Welcome to Complete Coach!")).toBeInTheDocument();
    expect(screen.getByText("[FIRST_NAME]")).toBeInTheDocument();
    expect(screen.getByText("[LAST_NAME]")).toBeInTheDocument();
    expect(screen.getByLabelText("Email automation message")).toHaveValue(
      "[FIRST_NAME]!\n\nWelcome to your coaching program. I need 10 minutes of your time to make sure you are clear on the next steps.\n\nThings you will need for success:\n\n- Bodyweight scales\n- Measuring tape\n- Wearable activity tracker\n- Food scale\n- Meal prep containers\n- Gym membership"
    );
    expect(screen.getByLabelText("When do you want to send this message?")).toHaveValue(1);
    expect(screen.getByLabelText("Interval")).toHaveValue("Minutes");
    expect(screen.getByRole("button", { name: "Save Automation" })).toBeInTheDocument();
  });

  it("links Stripe Connect onboarding through the server redirect route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/stripe/connect/status") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { connected: false, status: "not-connected" } }), { status: 200 })
        );
      }

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));
    expect(screen.getByRole("link", { name: "Connect Stripe account" })).toHaveAttribute(
      "href",
      "/api/v1/stripe/connect/onboarding/start?returnUrl=/organization-settings&refreshUrl=/organization-settings"
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/stripe/connect/account-link", expect.anything());
  });

  it("disables Stripe Connect onboarding when a connected account already exists", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/stripe/connect/status") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { connected: true, status: "pending-review" } }), { status: 200 })
        );
      }

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("Pending review")).toBeInTheDocument();
    expect(screen.getByText("Enable charges and payouts in Stripe to finish activating this account.")).toBeInTheDocument();
    expect(screen.queryByText("Connected - pending review")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect Stripe account" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stripe account connected" })).toBeDisabled();
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
                dashboardUrl: "https://dashboard.stripe.com"
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

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/stripe/connect/dashboard-link", { method: "POST" });
      expect(openMock).toHaveBeenCalledWith("https://dashboard.stripe.com", "_blank", "noopener,noreferrer");
    });
  });

  it("shows Stripe onboarding redirect errors returned in the URL", async () => {
    navigationMocks.searchParams = new URLSearchParams({ stripe_error: "Invalid API Key provided." });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(screen.getByText("Invalid API Key provided.")).toBeInTheDocument();
  });

  it("shows integration loading errors without blocking the settings page", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Integrations" }));

    expect(await screen.findByText("Social channels could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect Stripe account" })).toBeInTheDocument();
  });
});
