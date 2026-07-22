import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  it("manages sender domain DNS records and verification states", async () => {
    const writeText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText
      }
    });

    const pendingDomain = {
      id: "domain_pending",
      domain: "mail.completecoach.fit",
      provider: "resend",
      status: "pending",
      fromEmail: "hello@mail.completecoach.fit",
      fromLocalPart: "hello",
      senderName: "Complete Coach",
      verifiedAt: null,
      dnsRecords: [
        {
          record: "MX",
          type: "MX",
          name: "mail.completecoach.fit",
          value: "feedback-smtp.us-east-1.amazonses.com",
          ttl: "Auto",
          priority: 10,
          status: "pending"
        },
        {
          record: "DKIM",
          type: "TXT",
          name: "resend._domainkey.mail.completecoach.fit",
          value: "k=rsa; p=test",
          ttl: "Auto",
          status: "pending"
        }
      ]
    };
    const verifiedDomain = {
      ...pendingDomain,
      id: "domain_verified",
      domain: "coach.completecoach.fit",
      status: "verified",
      fromEmail: "team@coach.completecoach.fit",
      verifiedAt: "2026-06-30T01:00:00.000Z",
      dnsRecords: [
        {
          record: "SPF",
          type: "TXT",
          name: "coach.completecoach.fit",
          value: "v=spf1 include:amazonses.com ~all",
          ttl: "Auto",
          status: "verified"
        }
      ]
    };

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/organizations/current/email-domains" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [pendingDomain, verifiedDomain] }), { status: 200 }));
      }

      if (url === "/api/v1/organizations/current/email-domains" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...pendingDomain,
                id: "domain_new",
                domain: "updates.completecoach.fit",
                fromEmail: "support@updates.completecoach.fit",
                fromLocalPart: "support",
                senderName: "Coach Support"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/organizations/current/email-domains/domain_pending/verify" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...pendingDomain,
                status: "verified",
                verifiedAt: "2026-06-30T02:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));

    expect(await screen.findByText("Sender domains loaded.")).toBeInTheDocument();
    expect(screen.getAllByText("mail.completecoach.fit").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("coach.completecoach.fit").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("verified")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "DNS records for mail.completecoach.fit" })).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Copy DNS value for DKIM" }));
    expect(writeText).toHaveBeenCalledWith("k=rsa; p=test");

    fireEvent.click(screen.getAllByRole("button", { name: "Verify DNS records" })[0]);
    expect(await screen.findByText("Sender domain verified.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/organizations/current/email-domains/domain_pending/verify", {
      method: "POST"
    });

    fireEvent.change(screen.getByPlaceholderText("mail.yourdomain.com"), {
      target: { value: "updates.completecoach.fit" }
    });
    fireEvent.change(screen.getByLabelText("Sender email username"), {
      target: { value: "support" }
    });
    fireEvent.change(screen.getByPlaceholderText("Your Coaching Team"), {
      target: { value: "Coach Support" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create DNS records" }));

    expect(await screen.findByText("DNS records created. Add them with your domain host, then verify.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/current/email-domains",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          domain: "updates.completecoach.fit",
          fromLocalPart: "support",
          senderName: "Coach Support"
        })
      })
    );
    expect(screen.getByText("updates.completecoach.fit")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("mail.yourdomain.com")).toHaveValue("");
    expect(screen.getByLabelText("Sender email username")).toHaveValue("hello");
  });

  it("shows sender domain error states without hiding setup guidance", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/organizations/current/email-domains" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ error: { message: "Unavailable" } }), { status: 500 }));
      }

      if (url === "/api/v1/organizations/current/email-domains" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Domain is already connected." } }), { status: 409 })
        );
      }

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));

    expect(
      await screen.findByText("Sender domains could not be loaded. Check Resend and database configuration.")
    ).toBeInTheDocument();
    expect(screen.getByText("No sender domains configured yet.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("mail.yourdomain.com"), {
      target: { value: "mail.completecoach.fit" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create DNS records" }));

    expect(await screen.findByText("Domain is already connected.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/current/email-domains",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("renders billing, team management, and member permission tabs with persisted team data", async () => {
    const members = [
      {
        id: "membership_owner",
        userId: "user_owner",
        name: "Owner Coach",
        email: "owner@example.com",
        image: null,
        role: "owner",
        status: "active",
        activeClientCount: 8,
        capacityLimit: 20,
        capacityPercent: 40
      },
      {
        id: "membership_coach",
        userId: "user_coach",
        name: "Alex Coach",
        email: "alex@example.com",
        image: null,
        role: "coach",
        status: "active",
        activeClientCount: 12,
        capacityLimit: 24,
        capacityPercent: 50
      },
      {
        id: "membership_assistant",
        userId: "user_assistant",
        name: null,
        email: null,
        image: null,
        role: "assistant",
        status: "suspended",
        activeClientCount: 0,
        capacityLimit: 0,
        capacityPercent: 0
      }
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/team-members" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: { members } }), { status: 200 }));
      }

      if (url === "/api/v1/team-members/membership_coach" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...members[1],
                status: "suspended"
              }
            }),
            { status: 200 }
          )
        );
      }

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

    fireEvent.click(screen.getByRole("tab", { name: "Team Management" }));

    expect(await screen.findByText("Owner Coach")).toBeInTheDocument();
    expect(screen.getByText("Unnamed member")).toBeInTheDocument();
    expect(screen.getByText("No email on file")).toBeInTheDocument();
    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open team management" })).toHaveAttribute("href", "/team-management");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit profile" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Owner Coach" });
    expect(within(dialog).getByLabelText("Role")).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    const alexRow = screen.getByRole("row", { name: /Alex Coach/i });
    fireEvent.click(within(alexRow).getByRole("button", { name: "Deactivate" }));
    expect(await screen.findByText("Alex Coach updated.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/team-members/membership_coach",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "suspended" }) })
    );

    fireEvent.click(screen.getByRole("tab", { name: "Role Permissions" }));

    expect(await screen.findByRole("table", { name: "Role permissions matrix" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Team member feature permissions" })).toBeInTheDocument();
    const firstPermissionSwitch = screen.getAllByRole("switch")[0];
    const initialState = firstPermissionSwitch.getAttribute("aria-checked");
    fireEvent.click(firstPermissionSwitch);
    await waitFor(() => expect(firstPermissionSwitch).not.toHaveAttribute("aria-checked", initialState ?? ""));
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
                plan: { id: "core", name: "Core", coachSeatLimit: 1, clientLimit: 40 },
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
                plan: { id: "core", name: "Core", coachSeatLimit: 1, clientLimit: 40 },
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
        plan: { id: "core", name: "Core", coachSeatLimit: 1, clientLimit: 40 },
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
        plan: { id: "pro", name: "Pro", coachSeatLimit: 3, clientLimit: 60 },
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
        plan: { id: "scale", name: "Scale", coachSeatLimit: 10, clientLimit: 200 },
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
    expect(screen.getByText("24/40")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh billing status" }));

    expect(await screen.findByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Past due")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("42/60")).toBeInTheDocument();
    expect(screen.getByText("Platform access is paused because the subscription payment is overdue.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/platform-billing/status");

    window.dispatchEvent(new Event("complete-coach:platform-billing-usage-changed"));

    expect(await screen.findByText("Scale")).toBeInTheDocument();
    expect(screen.getByText("4/10")).toBeInTheDocument();
    expect(screen.getByText("55/200")).toBeInTheDocument();
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
