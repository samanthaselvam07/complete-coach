import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";

const navigationMocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams()
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationMocks.searchParams
}));

afterEach(() => {
  vi.restoreAllMocks();
  navigationMocks.searchParams = new URLSearchParams();
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
    expect(screen.getByRole("button", { name: "Billing portal coming soon" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Manage coaching packages" })).toHaveAttribute("href", "/packages");

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

  it("links Stripe Connect onboarding through the server redirect route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

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
