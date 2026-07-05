import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddResourceRoute from "@/app/education/add/page";
import EducationRoute from "@/app/education/page";
import MessagesRoute from "@/app/messages/page";
import OrganizationSettingsRoute from "@/app/organization-settings/page";
import PackagesRoute from "@/app/packages/page";
import SocialMediaRoute from "@/app/social-media/page";
import SupplementDatabaseRoute from "@/app/supplementation/database/page";
import SupplementProtocolBuilderRoute from "@/app/supplementation/plans/create/page";
import SupplementPlansRoute from "@/app/supplementation/plans/page";
import SupplementationRoute from "@/app/supplementation/page";
import TeamManagementRoute from "@/app/team-management/page";
import { MessagesPage } from "@/components/messages/messages-page";
import { AuditLogPage } from "@/components/audit/audit-log-page";
import { AddResourcePage } from "@/components/education/add-resource-page";
import { EducationPage } from "@/components/education/education-page";
import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";
import { SupplementDatabasePage } from "@/components/supplementation/supplement-database-page";
import { SupplementProtocolBuilderPage } from "@/components/supplementation/supplement-protocol-builder-page";
import { SupplementPlansPage } from "@/components/supplementation/supplement-plans-page";
import { SupplementationPage } from "@/components/supplementation/supplementation-page";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage?.clear();
});

function installTestLocalStorage() {
  const storage = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value)
    }
  });
}

const routeSmokeCases = [
  ["education", EducationRoute, "Elevate Your Athletes."],
  ["education add", AddResourceRoute, "Upload New Resource"],
  ["supplementation", SupplementationRoute, "Supplementation Hub"],
  ["supplement plans", SupplementPlansRoute, "Supplementation Hub"],
  ["supplement protocol builder", SupplementProtocolBuilderRoute, "Create Supplement Protocol"],
  ["supplement database", SupplementDatabaseRoute, "Supplementation Library"],
  ["messages", MessagesRoute, "Messages"],
  ["organization settings", OrganizationSettingsRoute, "Organisation Settings"],
  ["packages", PackagesRoute, "Package Ecosystem"],
  ["team management", TeamManagementRoute, "Team Management"],
  ["social media", SocialMediaRoute, "Social Planner"]
] as const;

describe("Ticket 009 route smoke", () => {
  it.each(routeSmokeCases)("renders the %s route", (_name, RouteComponent, heading) => {
    render(createElement(RouteComponent));

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });
});

describe("SupplementationPage", () => {
  it("renders the persisted supplementation hub surface without local protocol rows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(SupplementationPage));

    expect(screen.getByRole("heading", { level: 1, name: "Supplementation Hub" })).toBeInTheDocument();
    expect(screen.getByText("Manage client protocols and track compliance")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create Protocol/i })).toHaveAttribute("href", "/supplementation/plans/create");
    expect(screen.queryByText("Protocol Compliance")).not.toBeInTheDocument();
    expect(screen.queryByText("94.2%")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Plans")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Supplement Protocols" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Protocol Templates" })).toBeInTheDocument();
    expect(await screen.findByText("No supplement protocols have been assigned yet.")).toBeInTheDocument();
    expect(screen.queryByText(/protocols stored/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("Vitamin D3 + K2")).not.toBeInTheDocument();
  });
});

describe("OrganizationSettingsPage", () => {
  it("separates operating system billing from coaching package management", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/v1/team-members") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  {
                    id: "membership_marcus",
                    userId: "user_marcus",
                    name: "Marcus Chen",
                    email: "marcus@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 0,
                    capacityLimit: 40,
                    capacityPercent: 0
                  }
                ],
                invitations: []
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(OrganizationSettingsPage));

    expect(screen.getByRole("heading", { level: 1, name: "Organisation Settings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Subscription & Billing" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Complete Coach Operating System")).toBeInTheDocument();
    expect(screen.getByText(/This is your organisation subscription/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage coaching packages" })).toHaveAttribute("href", "/packages");

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));
    expect(screen.getByRole("heading", { level: 3, name: "Add sender domain" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create DNS records" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Automations" }));
    expect(screen.getByRole("table", { name: "Automation triggers" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Team Management" }));
    expect(screen.getByRole("link", { name: "Open team management" })).toHaveAttribute("href", "/team-management");

    fireEvent.click(screen.getByRole("tab", { name: "Role Permissions" }));
    expect(screen.getByRole("table", { name: "Role permissions matrix" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Team member feature permissions" })).toBeInTheDocument();
    expect(screen.getAllByText("payments:manage")).toHaveLength(2);
    expect(screen.getAllByText("api_keys:manage")).toHaveLength(2);
    expect(await screen.findByLabelText("Toggle payments:manage for Marcus Chen")).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByLabelText("Toggle payments:manage for Marcus Chen"));

    expect(screen.getByLabelText("Toggle payments:manage for Marcus Chen")).toHaveAttribute("aria-checked", "true");
  });

  it("keeps audit logs inside organization settings instead of the main navigation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "audit_settings_1",
              action: "client.training_plan.updated",
              actor: { id: "user_1", name: "Demo Coach" },
              targetType: "client",
              targetId: "client_1",
              metadata: { plan: "Hypertrophy II" },
              ipAddress: "127.0.0.1",
              createdAt: "2026-06-07T10:00:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(OrganizationSettingsPage));

    fireEvent.click(screen.getByRole("tab", { name: "Audit Log" }));

    expect(screen.getByRole("tab", { name: "Audit Log" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("table", { name: "Audit events" })).toBeInTheDocument();
    expect(screen.getByText("client.training_plan.updated")).toBeInTheDocument();
  });

  it("manages team member account status and profiles inside organization settings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/team-members" && !init?.method) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                members: [
                  {
                    id: "membership_alex",
                    userId: "user_alex",
                    name: "Alex Coach",
                    email: "alex@example.com",
                    image: null,
                    role: "coach",
                    status: "active",
                    activeClientCount: 12,
                    capacityLimit: 40,
                    capacityPercent: 30
                  }
                ],
                invitations: []
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/team-members/membership_alex" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { role?: string; status?: string };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "membership_alex",
                userId: "user_alex",
                name: "Alex Coach",
                email: "alex@example.com",
                image: null,
                role: body.role ?? "coach",
                status: body.status ?? "suspended",
                activeClientCount: 12,
                capacityLimit: 40,
                capacityPercent: 30
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(OrganizationSettingsPage));

    fireEvent.click(screen.getByRole("tab", { name: "Team Management" }));

    const memberRow = (await screen.findByText("Alex Coach")).closest("tr");
    expect(memberRow).not.toBeNull();
    expect(screen.getByRole("table", { name: "Organisation team members" })).toBeInTheDocument();
    expect(within(memberRow as HTMLTableRowElement).getByText("12/40 clients")).toBeInTheDocument();

    fireEvent.click(within(memberRow as HTMLTableRowElement).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/team-members/membership_alex",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "suspended" })
        })
      )
    );
    expect(await screen.findByText("Deactivated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/team-members/membership_alex",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ role: "admin" })
        })
      )
    );
  });

  it("creates sender DNS records inside organization settings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/organizations/current/email-domains" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/organizations/current/email-domains" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "sender_domain_1",
                domain: "mail.example.com",
                provider: "resend",
                status: "not_started",
                fromEmail: "coach@mail.example.com",
                fromLocalPart: "coach",
                senderName: "Example Coaching",
                dnsRecords: [
                  {
                    record: "SPF",
                    name: "send",
                    type: "TXT",
                    value: "\"v=spf1 include:amazonses.com ~all\"",
                    ttl: "Auto",
                    status: "not_started"
                  }
                ],
                verifiedAt: null
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(OrganizationSettingsPage));

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));
    fireEvent.change(screen.getByPlaceholderText("mail.yourdomain.com"), {
      target: { value: "mail.example.com" }
    });
    fireEvent.change(screen.getByLabelText("Sender email username"), {
      target: { value: "coach" }
    });
    fireEvent.change(screen.getByPlaceholderText("Your Coaching Team"), {
      target: { value: "Example Coaching" }
    });
    await waitFor(() => expect(screen.getByPlaceholderText("mail.yourdomain.com")).toHaveValue("mail.example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Create DNS records" }));

    expect(await screen.findByText("mail.example.com")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "DNS records for mail.example.com" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/current/email-domains",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("MessagesPage", () => {
  it("selects persisted conversations and sends a message through the API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/conversations?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "conversation_sarah",
                  clientName: "Sarah Johnson",
                  title: null,
                  latestMessage: {
                    id: "message_sarah_latest",
                    senderType: "client",
                    body: "Thanks for the update.",
                    createdAt: "2026-05-18T09:15:00.000Z"
                  },
                  updatedAt: "2026-05-18T09:15:00.000Z"
                },
                {
                  id: "conversation_marcus",
                  clientName: "Marcus Chen",
                  title: null,
                  latestMessage: {
                    id: "message_marcus_latest",
                    senderType: "client",
                    body: "Can we reschedule tomorrow's session?",
                    createdAt: "2026-05-18T10:15:00.000Z"
                  },
                  updatedAt: "2026-05-18T10:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/conversations/conversation_sarah/messages?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "message_sarah_1",
                  senderType: "client",
                  body: "Thanks for the update.",
                  createdAt: "2026-05-18T09:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/conversations/conversation_marcus/messages?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "message_marcus_1",
                  senderType: "client",
                  body: "Can we reschedule tomorrow's session?",
                  createdAt: "2026-05-18T10:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/conversations/conversation_marcus/messages" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "message_created",
                senderType: "user",
                body: "Tomorrow at 3 PM works.",
                createdAt: "2026-05-18T10:20:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MessagesPage));

    expect(await screen.findByRole("heading", { level: 2, name: "Sarah Johnson" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open conversation with Marcus Chen/i }));

    const thread = await screen.findByRole("log", { name: "Conversation with Marcus Chen" });
    expect(await within(thread).findByText("Can we reschedule tomorrow's session?")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /type a message/i }), {
      target: { value: "Tomorrow at 3 PM works." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await within(thread).findByText("Tomorrow at 3 PM works.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: /type a message/i })).toHaveValue(""));
  });

  it("filters persisted conversations by search query", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).startsWith("/api/v1/conversations?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "conversation_sarah",
                  clientName: "Sarah Johnson",
                  title: null,
                  latestMessage: null,
                  updatedAt: "2026-05-18T09:15:00.000Z"
                },
                {
                  id: "conversation_emma",
                  clientName: "Emma Rodriguez",
                  title: null,
                  latestMessage: null,
                  updatedAt: "2026-05-18T09:20:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MessagesPage));

    expect(await screen.findByRole("button", { name: /Open conversation with Emma Rodriguez/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search conversations/i }), {
      target: { value: "emma" }
    });

    expect(screen.getByRole("button", { name: /Open conversation with Emma Rodriguez/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open conversation with Sarah Johnson/i })).not.toBeInTheDocument();
  });

  it("loads persisted conversations and messages when APIs are available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/conversations?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "conversation_api",
                  clientName: "Persisted Messaging Client",
                  title: "Persisted Messaging Client",
                  latestMessage: {
                    id: "message_latest",
                    senderType: "client",
                    body: "API-backed latest message",
                    createdAt: "2026-05-18T09:15:00.000Z"
                  },
                  updatedAt: "2026-05-18T09:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/conversations/conversation_api/messages?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "message_api_1",
                  senderType: "client",
                  body: "Persisted check-in question",
                  createdAt: "2026-05-18T09:10:00.000Z"
                },
                {
                  id: "message_api_2",
                  senderType: "user",
                  body: "Persisted coach response",
                  createdAt: "2026-05-18T09:12:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MessagesPage));

    expect(await screen.findByRole("button", { name: /Open conversation with Persisted Messaging Client/i })).toBeInTheDocument();
    const thread = await screen.findByRole("log", { name: "Conversation with Persisted Messaging Client" });

    expect(await within(thread).findByText("Persisted check-in question")).toBeInTheDocument();
    expect(await within(thread).findByText("Persisted coach response")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open conversation with Sarah Johnson/i })).not.toBeInTheDocument();
  });

  it("sends messages through the persistence API when available", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/conversations?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "conversation_api",
                  clientName: "Persisted Messaging Client",
                  title: null,
                  latestMessage: null,
                  updatedAt: "2026-05-18T09:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/conversations/conversation_api/messages?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/conversations/conversation_api/messages" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "message_created",
                senderType: "user",
                body: "Persisted outbound message",
                createdAt: "2026-05-18T09:20:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MessagesPage));

    const thread = await screen.findByRole("log", { name: "Conversation with Persisted Messaging Client" });
    fireEvent.change(screen.getByRole("textbox", { name: /type a message/i }), {
      target: { value: "Persisted outbound message" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await within(thread).findByText("Persisted outbound message")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/conversations/conversation_api/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Persisted outbound message" })
      })
    );
    await waitFor(() => expect(screen.getByRole("textbox", { name: /type a message/i })).toHaveValue(""));
  });

  it("shows a clean empty state when conversations cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable."));

    render(createElement(MessagesPage));

    expect(await screen.findByText("No conversations loaded from Neon yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open conversation with/i })).not.toBeInTheDocument();
  });

  it("handles fallback conversation labels, invalid dates, blank sends, and failed sends", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/conversations?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "conversation_title",
                  clientName: null,
                  title: "Fallback Title",
                  latestMessage: null,
                  updatedAt: "not-a-date"
                },
                {
                  id: "conversation_default",
                  clientName: null,
                  title: null,
                  latestMessage: {
                    id: "message_latest",
                    senderType: "client",
                    body: "Latest fallback message",
                    createdAt: "also-not-a-date"
                  },
                  updatedAt: "2026-05-18T09:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/conversations/conversation_title/messages?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 503 }));
      }

      if (url === "/api/v1/conversations/conversation_title/messages" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MessagesPage));

    expect(await screen.findByRole("button", { name: /Open conversation with Fallback Title/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open conversation with Client conversation/i })).toBeInTheDocument();
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
    expect(screen.getByText("also-not-a-date")).toBeInTheDocument();
    expect(screen.getByText("No messages yet")).toBeInTheDocument();

    const textbox = screen.getByRole("textbox", { name: /type a message/i });
    fireEvent.change(textbox, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/conversations/conversation_title/messages",
      expect.objectContaining({ method: "POST" })
    );

    fireEvent.change(textbox, { target: { value: "Please review this." } });
    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: true });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: false });
    expect(await screen.findByRole("alert")).toHaveTextContent("Message could not be sent");
  });
});

describe("AuditLogPage", () => {
  it("loads audit events, paginates older records, and renders fallback fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/audit-logs?limit=50") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "audit_1",
                  action: "client.updated",
                  actor: { id: "user_1", name: "Owner Coach" },
                  targetType: "client",
                  targetId: "client_1",
                  metadata: { field: "status" },
                  ipAddress: null,
                  createdAt: "2026-05-18T09:15:00.000Z"
                }
              ]
            }),
            { status: 200, headers: { "x-next-cursor": "audit_older" } }
          )
        );
      }

      if (url === "/api/v1/audit-logs?limit=50&cursor=audit_older") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "audit_2",
                  action: "organization.created",
                  actor: null,
                  targetType: null,
                  targetId: null,
                  metadata: null,
                  ipAddress: null,
                  createdAt: "2026-05-17T09:15:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(AuditLogPage));

    expect(screen.getByRole("status", { name: "Preparing audit log." })).toHaveTextContent("Preparing audit log");
    expect(await screen.findByText("Owner Coach")).toBeInTheDocument();
    expect(screen.getByText("client / client_1")).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify({ field: "status" }))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load older events" }));

    expect(await screen.findByText("System/API")).toBeInTheDocument();
    expect(screen.getByText("organization")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/audit-logs?limit=50&cursor=audit_older");
  });

  it("shows audit log empty and error states without shell chrome when embedded", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));

    const { unmount } = render(createElement(AuditLogPage, { embedded: true }));

    expect(await screen.findByText("No audit events found.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Audit Log" })).not.toBeInTheDocument();
    unmount();

    render(createElement(AuditLogPage, { embedded: true }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Audit events could not be loaded.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("SupplementDatabasePage", () => {
  it("opens the new protocol panel and creates a persisted supplement", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/supplements" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "supplement_api",
                name: "Vitamin D3",
                category: "Morning",
                recommendedTiming: "Once morning",
                dosage: "5000 IU",
                bioavailabilityNotes: "Pair with dietary fat.",
                clinicalDescription: null
              }
            }),
            { status: 201 }
          )
        );
      }

      if (String(input) === "/api/v1/supplements/supplement_api/coach-details" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                coachDosageInstructions: "5000 IU",
                coachNotes: "",
                affiliateLink: ""
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/supplements/supplement_api/coach-details") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                coachDosageInstructions: "5000 IU",
                coachNotes: "",
                affiliateLink: ""
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementDatabasePage));

    fireEvent.click(screen.getByRole("button", { name: "New Entry" }));

    expect(screen.getByRole("dialog", { name: "New Protocol" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Supplement Name"), {
      target: { value: "Vitamin D3" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Morning" }));
    fireEvent.change(screen.getByLabelText("Coach dosage instructions"), {
      target: { value: "5000 IU" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Protocol" }));

    expect(await screen.findByText("Vitamin D3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View details for Vitamin D3" }));
    expect(
      await within(screen.getByRole("dialog", { name: "Vitamin D3 details" })).findByText("5000 IU")
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "New Protocol" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/supplements",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/supplements/supplement_api/coach-details",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("searches persisted supplements by category and name", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "supplement_magnesium",
              name: "Magnesium Glycinate",
              category: "Evening",
              scope: "global",
              recommendedTiming: "Night",
              dosage: null,
              bioavailabilityNotes: null,
              clinicalDescription: "Persisted magnesium entry."
            },
            {
              id: "supplement_creatine",
              name: "Creatine Monohydrate",
              category: "Performance",
              scope: "global",
              recommendedTiming: "Daily",
              dosage: null,
              bioavailabilityNotes: null,
              clinicalDescription: "Persisted creatine entry."
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(SupplementDatabasePage));

    expect(await screen.findByText("Magnesium Glycinate")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search supplements/i }), {
      target: { value: "evening" }
    });

    expect(screen.getByText("Magnesium Glycinate")).toBeInTheDocument();
    expect(screen.queryByText("Creatine Monohydrate")).not.toBeInTheDocument();
  });

  it("loads persisted supplement library items and reports create failures", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/supplements?limit=1000") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "supplement_loaded",
                  name: "Persisted Magnesium",
                  category: "Recovery",
                  scope: "global",
                  recommendedTiming: null,
                  dosage: null,
                  bioavailabilityNotes: null,
                  clinicalDescription: "Persisted supplement description."
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/supplements" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: { code: "validation_failed" } }), { status: 422 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementDatabasePage));

    expect(await screen.findByText("Persisted Magnesium")).toBeInTheDocument();
    expect(screen.queryByText("Library Source")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Entries")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Verified Complete Coach supplement")).toBeInTheDocument();
    expect(screen.queryByText("As needed")).not.toBeInTheDocument();
    expect(screen.queryByText("Variable")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Entry" }));
    fireEvent.change(screen.getByLabelText("Supplement Name"), {
      target: { value: "Failed Supplement" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Protocol" }));

    expect(await screen.findByRole("status", { name: "Supplement save status" })).toHaveTextContent("Could not create this supplement.");
  });

  it("paginates, sorts, toggles list view, and opens supplement details", async () => {
    const apiSupplements = Array.from({ length: 13 }, (_, index) => ({
      id: `supplement_${index}`,
      name: index === 0 ? "Zinc Complex" : `Alpha Supplement ${String(index).padStart(2, "0")}`,
      category: index === 0 ? "Immune" : "Performance",
      scope: index === 0 ? "global" : "private",
      recommendedTiming: "Morning",
      dosage: `${index + 1}g`,
      bioavailabilityNotes: "Take with food.",
      clinicalDescription:
        index === 0
          ? "Supports immune function. Use with client-specific context."
          : "Brief clinical description for coach review."
    }));

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/supplements?limit=1000") {
        return Promise.resolve(new Response(JSON.stringify({ data: apiSupplements }), { status: 200 }));
      }

      if (String(input) === "/api/v1/supplements/supplement_0/coach-details" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                coachDosageInstructions: "Use the dosage agreed in your client protocol.",
                coachNotes: "Use the brand stocked through our supplement partner.",
                affiliateLink: "https://example.com/zinc"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/supplements/supplement_0/coach-details") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                coachDosageInstructions: "",
                coachNotes: "",
                affiliateLink: ""
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementDatabasePage));

    expect(await screen.findByText("Alpha Supplement 01")).toBeInTheDocument();
    expect(screen.queryByText("Zinc Complex")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Supplement database page" })).toHaveTextContent("Page 1 of 2");

    fireEvent.click(screen.getByRole("button", { name: "Next supplement page" }));
    expect(screen.getByText("Zinc Complex")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sort supplements"), { target: { value: "za" } });
    expect(screen.getByText("Zinc Complex")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list", { name: "Supplement list" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View details for Zinc Complex" }));
    const dialog = screen.getByRole("dialog", { name: "Zinc Complex details" });
    expect(within(dialog).queryByText("Category")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Timing")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Bioavailability")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Immune")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Morning")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("1g")).not.toBeInTheDocument();
    expect(await within(dialog).findByText("No coach dosage instructions added.")).toBeInTheDocument();
    expect(within(dialog).getByText("No coach notes added.")).toBeInTheDocument();
    expect(within(dialog).getByText("No affiliate or product link added.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Take with food.")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Supports immune function. Use with client-specific context.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Edit coach supplement details" }));
    fireEvent.change(within(dialog).getByLabelText("Coach dosage instructions"), {
      target: { value: "Use the dosage agreed in your client protocol." }
    });
    fireEvent.change(within(dialog).getByLabelText("Coach notes"), {
      target: { value: "Use the brand stocked through our supplement partner." }
    });
    fireEvent.change(within(dialog).getByLabelText("Affiliate or product link"), {
      target: { value: "https://example.com/zinc" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save coach details" }));

    await screen.findByText("Use the dosage agreed in your client protocol.");
    expect(screen.getByText("Use the brand stocked through our supplement partner.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com/zinc" })).toHaveAttribute(
      "href",
      "https://example.com/zinc"
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/supplements/supplement_0/coach-details",
      expect.objectContaining({ method: "PATCH" })
    );
  });
});

describe("SupplementProtocolBuilderPage", () => {
  it("adds supplements from the database and saves a configured protocol", async () => {
    let savedPayload: unknown = null;

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/supplements")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "supplement_creatine",
                  name: "Creatine Monohydrate",
                  category: "Performance",
                  recommendedTiming: "Morning",
                  dosage: "5g",
                  clinicalDescription: "Creatine monohydrate has strong evidence for strength and power output.",
                  bioavailabilityNotes: "Best tolerated with food for this client group.",
                  scope: "global",
                  tags: []
                },
                {
                  id: "supplement_beta_alanine",
                  name: "Beta Alanine",
                  category: "Performance",
                  recommendedTiming: "Afternoon",
                  dosage: "3.2g",
                  clinicalDescription: "Monitor tingles and split dosage if needed.",
                  scope: "global",
                  tags: []
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/supplement-plan-templates" && init?.method === "POST") {
        savedPayload = JSON.parse(String(init.body));

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_creatine",
                ...(savedPayload as Record<string, unknown>)
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementProtocolBuilderPage));

    expect(screen.getByRole("heading", { name: "Create Supplement Protocol" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Protocol name"), { target: { value: "Creatine Loading Protocol" } });
    fireEvent.change(screen.getByLabelText("Protocol description"), { target: { value: "Performance supplement plan." } });
    fireEvent.change(screen.getByLabelText("Search supplement database"), { target: { value: "creatine" } });
    expect(await screen.findByText("Creatine Monohydrate")).toBeInTheDocument();

    const addCreatineButton = screen.getByRole("button", { name: "Add Creatine Monohydrate" });
    expect(addCreatineButton).not.toHaveTextContent("Creatine Monohydrate");
    fireEvent.click(addCreatineButton);
    const dragData = createTestDataTransfer();
    const betaAlanineCard = screen.getByText("Beta Alanine").closest("[draggable='true']");
    expect(betaAlanineCard).not.toBeNull();
    fireEvent.dragStart(betaAlanineCard as Element, { dataTransfer: dragData });
    fireEvent.drop(screen.getByLabelText("Protocol Builder drop zone"), { dataTransfer: dragData });
    expect(screen.getAllByText("Beta Alanine")).toHaveLength(2);
    expect(screen.queryByText("Performance")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Dosage for Creatine Monohydrate")).toHaveValue("");
    expect(screen.getByLabelText("Dosage for Beta Alanine")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "View clinical notes for Creatine Monohydrate" }));
    expect(screen.getByText(/Database dosage: 5g/i)).toBeInTheDocument();
    expect(screen.getByText(/strong evidence for strength and power output/i)).toBeInTheDocument();
    expect(screen.getByText(/Best tolerated with food/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Timing preset for Creatine Monohydrate"), { target: { value: "Morning" } });
    fireEvent.change(screen.getByLabelText("Specific time for Creatine Monohydrate"), { target: { value: "07:30" } });
    fireEvent.change(screen.getByLabelText("Dosage for Creatine Monohydrate"), { target: { value: "5g" } });
    fireEvent.change(screen.getByLabelText("Dosage for Beta Alanine"), { target: { value: "3.2g" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link for Creatine Monohydrate" }));
    fireEvent.change(screen.getByLabelText("Supplement link for Creatine Monohydrate"), {
      target: { value: "https://example.com/creatine" }
    });
    const instructionsField = screen.getByLabelText("Instructions for Creatine Monohydrate");
    expect(instructionsField.tagName.toLowerCase()).toBe("textarea");
    fireEvent.change(instructionsField, {
      target: { value: "Take with breakfast and 500ml water. Keep this note visible without horizontal scrolling." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Protocol" }));

    await waitFor(() => expect(screen.getByText("Creatine Loading Protocol saved.")).toBeInTheDocument());
    expect(savedPayload).toEqual({
      name: "Creatine Loading Protocol",
      description: "Performance supplement plan.",
      status: "published",
      template: {
        phases: [
          {
            name: "Daily Supplement Protocol",
            supplements: [
              {
                supplementId: "supplement_creatine",
                supplementName: "Creatine Monohydrate",
                dosage: "5g",
                timing: "Morning at 07:30",
                notes: "Take with breakfast and 500ml water. Keep this note visible without horizontal scrolling.\nSupplement link: https://example.com/creatine"
              },
              {
                supplementId: "supplement_beta_alanine",
                supplementName: "Beta Alanine",
                dosage: "3.2g",
                timing: "Afternoon",
                notes: ""
              }
            ]
          }
        ]
      }
    });
  });
});

function createTestDataTransfer() {
  const data = new Map<string, string>();

  return {
    effectAllowed: "all",
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => {
      data.set(type, value);
    }
  };
}

describe("SupplementPlansPage", () => {
  it("switches between persisted active protocols and protocol templates", async () => {
    installTestLocalStorage();

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/v1/supplement-plan-assignments?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "assignment_api",
                  name: "Vitamin D3 + K2",
                  clientId: "client_alex",
                  templateId: "template_api",
                  clientName: "Alex Rivera",
                  status: "active",
                  startsOn: "2026-06-04",
                  createdAt: "2026-06-01T00:00:00.000Z",
                  compliance: 91,
                  snapshot: {
                    templateId: "template_api",
                    template: {
                      phases: [
                        {
                          supplements: [{ supplementName: "Vitamin D" }, { supplementName: "Vitamin K" }]
                        }
                      ]
                    }
                  }
                },
                {
                  id: "assignment_api_two",
                  name: "Vitamin D3 + K2",
                  clientId: "client_james",
                  templateId: "template_api",
                  clientName: "James Chen",
                  status: "active",
                  startsOn: "2026-06-05",
                  createdAt: "2026-06-01T00:00:00.000Z",
                  compliance: 88,
                  snapshot: {
                    templateId: "template_api",
                    template: {
                      phases: [
                        {
                          supplements: [{ supplementName: "Vitamin D" }, { supplementName: "Vitamin K" }]
                        }
                      ]
                    }
                  }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Creatine Monohydrate",
                  description: "Performance support protocol.",
                  status: "published",
                  template: { phases: [{ supplements: [{ supplementName: "Creatine" }] }] }
                },
                {
                  id: "template_sleep",
                  name: "Magnesium Sleep",
                  description: "Evening relaxation protocol.",
                  status: "published",
                  template: { phases: [{ supplements: [{ supplementName: "Magnesium Glycinate" }] }] }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementPlansPage));

    expect(screen.queryByText("Protocol Compliance")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Plans")).not.toBeInTheDocument();
    expect(screen.queryByText("Library")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Supplement Protocols" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Protocol Templates" })).toBeInTheDocument();
    expect(screen.queryByText(/protocols stored/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reusable templates/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Supplement Plan",
      "Status",
      "Assigned Clients",
      "Plan Created",
      "Assigned",
      "Compliance",
      "Actions"
    ]);
    expect(await screen.findAllByText("Vitamin D3 + K2")).toHaveLength(2);
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("James Chen")).not.toBeInTheDocument();
    expect(screen.getAllByText("2 active clients")).toHaveLength(2);
    expect(screen.getAllByText("Jun 1, 2026")).toHaveLength(2);
    expect(screen.getByText("Jun 4, 2026")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search supplement protocols"), { target: { value: "magnesium" } });
    expect(screen.queryByText("Vitamin D3 + K2")).not.toBeInTheDocument();
    expect(screen.getByText("No supplement protocols match your search.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search supplement protocols"), { target: { value: "" } });
    fireEvent.click(screen.getAllByRole("button", { name: "More actions for Vitamin D3 + K2" })[0]);
    const protocolMenu = screen.getAllByRole("menu", { name: "Supplement protocol actions for Vitamin D3 + K2" })[0];
    expect(within(protocolMenu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(protocolMenu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(protocolMenu).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(protocolMenu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close supplement protocol actions" }));
    expect(screen.queryByRole("menu", { name: "Supplement protocol actions for Vitamin D3 + K2" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Protocol Templates" }));

    expect(await screen.findByText("Creatine Monohydrate")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Protocol template list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Creatine Monohydrate" })).toHaveClass("text-sm");
    expect(screen.getByText("Performance support protocol.")).toHaveClass("whitespace-normal", "break-words");
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View Details/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search protocol templates"), { target: { value: "magnesium" } });
    expect(screen.queryByText("Creatine Monohydrate")).not.toBeInTheDocument();
    expect(screen.getByText("Magnesium Sleep")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Card view" }));
    expect(screen.getByRole("region", { name: "Protocol template cards" })).toBeInTheDocument();
    expect(window.localStorage.getItem("complete-coach:protocol-template-library-view")).toBe("cards");
    fireEvent.change(screen.getByLabelText("Search protocol templates"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Creatine Monohydrate" }));
    const templateMenu = screen.getByRole("menu", { name: "Supplement template actions for Creatine Monohydrate" });
    expect(within(templateMenu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(templateMenu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(templateMenu).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(templateMenu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close protocol template actions" }));
    expect(screen.queryByRole("menu", { name: "Supplement template actions for Creatine Monohydrate" })).not.toBeInTheDocument();
  });

  it("edits, assigns, duplicates, and deletes supplement protocol templates through the persistence API", async () => {
    let nextTemplateId = 2;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/supplement-plan-assignments?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_created_1",
                  name: "Sleep Support Stack",
                  description: "Evening recovery protocol.",
                  status: "published",
                  template: { phases: [{ supplements: [{ supplementName: "Supplement 1" }] }] }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/supplement-plan-templates" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { name: string; description: string; status: string; template: { phases: Array<{ supplements: unknown[] }> } };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: `template_created_${nextTemplateId++}`,
                name: body.name,
                description: body.description,
                status: body.status,
                template: body.template
              }
            }),
            { status: 201 }
          )
        );
      }

      if (url === "/api/v1/supplement-plan-templates/template_created_1" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { name: string; description: string; status: string; template: { phases: Array<{ supplements: unknown[] }> } };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_created_1",
                name: body.name,
                description: body.description,
                status: body.status,
                template: body.template
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/supplement-plan-templates/template_created_") && init?.method === "DELETE") {
        const id = url.split("/").at(-1) ?? "template_created_1";
        return Promise.resolve(new Response(JSON.stringify({ data: { id, deleted: true } }), { status: 200 }));
      }

      if (url === "/api/v1/clients?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: "client_alex", name: "Alex Rivera", packageName: "Performance" },
                { id: "client_james", name: "James Chen", packageName: "Hypertrophy" }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/supplement-plan-assignments" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { clientId: string; templateId: string; name: string };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "assignment_created",
                name: body.name,
                clientId: body.clientId,
                templateId: body.templateId,
                clientName: "Alex Rivera",
                status: "active",
                startsOn: "2026-06-04",
                createdAt: "2026-06-04T00:00:00.000Z",
                snapshot: { templateId: body.templateId, template: { phases: [{ supplements: [{ supplementName: "Supplement 1" }] }] } }
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementPlansPage));

    expect(await screen.findByText("No supplement protocols have been assigned yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Protocol" })).toHaveAttribute("href", "/supplementation/plans/create");
    fireEvent.click(screen.getByRole("tab", { name: "Protocol Templates" }));
    expect(await screen.findByText("Sleep Support Stack")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Sleep Support Stack" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit Protocol Template" });
    fireEvent.change(within(editDialog).getByLabelText("Template name"), { target: { value: "Sleep Support Stack Updated" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: "Save Template" }));
    expect(await screen.findByText("Sleep Support Stack Updated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Sleep Support Stack Updated" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(await screen.findByText("Sleep Support Stack Updated (copy)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Sleep Support Stack Updated (copy)" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Assign to" }));
    const assignDialog = await screen.findByRole("dialog", { name: "Assign Protocol Template" });
    fireEvent.change(within(assignDialog).getByPlaceholderText("Search clients..."), { target: { value: "alex" } });
    fireEvent.click(within(assignDialog).getByLabelText("Select Alex Rivera"));
    await waitFor(() => expect(within(assignDialog).getByRole("button", { name: "Confirm Assignment" })).not.toBeDisabled());
    fireEvent.click(within(assignDialog).getByRole("button", { name: "Confirm Assignment" }));
    expect(await screen.findByText("Sleep Support Stack Updated (copy) assigned.")).toBeInTheDocument();
    expect(screen.queryByText(/Alex Rivera/)).not.toBeInTheDocument();
    expect(screen.getByText("1 active client")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Protocol Templates" }));
    const templatesPanel = screen.getByRole("tabpanel", { name: "Protocol Templates" });
    fireEvent.click(within(templatesPanel).getByRole("button", { name: "More actions for Sleep Support Stack Updated (copy)" }));
    fireEvent.click(within(templatesPanel).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(within(templatesPanel).queryByRole("heading", { name: "Sleep Support Stack Updated (copy)" })).not.toBeInTheDocument());
    expect(within(templatesPanel).getByRole("heading", { name: "Sleep Support Stack Updated" })).toBeInTheDocument();
  });

  it("loads persisted active protocols and templates", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/supplement-plan-assignments?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "assignment_api",
                  name: "Hydration Support",
                  clientId: "client_1",
                  templateId: "template_api",
                  clientName: "Persisted Client",
                  status: "active",
                  startsOn: "2026-06-02",
                  createdAt: "2026-06-01T00:00:00.000Z",
                  snapshot: {
                    templateId: "template_api",
                    template: {
                      phases: [
                        {
                          supplements: [{ supplementName: "Electrolytes" }]
                        }
                      ]
                    }
                  }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Persisted Template",
                  description: "API protocol template.",
                  status: "published",
                  template: { phases: [{ supplements: [{ supplementName: "Creatine" }] }] }
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementPlansPage));

    expect(await screen.findByText("Hydration Support")).toBeInTheDocument();
    expect(screen.queryByText("Persisted Client")).not.toBeInTheDocument();
    expect(screen.getByText("1 active client")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Protocol Templates" }));

    expect(await screen.findByText("Persisted Template")).toBeInTheDocument();
  });

  it("handles persisted supplement plans with nullable snapshots and draft templates", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/v1/supplement-plan-assignments?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "assignment_paused",
                  name: "Paused Support",
                  clientId: "client_1",
                  templateId: null,
                  clientName: null,
                  status: "paused",
                  startsOn: "2026-06-02",
                  createdAt: "2026-06-01T00:00:00.000Z",
                  snapshot: null
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/supplement-plan-templates?limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_draft",
                  name: "Draft Template",
                  description: null,
                  status: "draft",
                  template: null
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(SupplementPlansPage));

    expect(await screen.findByText("Paused Support")).toBeInTheDocument();
    expect(screen.queryByText("Unassigned client")).not.toBeInTheDocument();
    expect(screen.getByText("1 active client")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Not logged")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Protocol Templates" }));

    expect(await screen.findByText("Draft Template")).toBeInTheDocument();
    expect(screen.getByText("Coach-created supplement protocol.")).toBeInTheDocument();
  });
});

describe("Education persistence pages", () => {
  it("renders the education library shell without local resource fixtures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    render(createElement(EducationPage));

    expect(await screen.findByRole("heading", { level: 1, name: "Elevate Your Athletes." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create New Resource/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Content" })).toBeInTheDocument();
    expect(screen.getByText("No education resources were returned from the database.")).toBeInTheDocument();
    expect(screen.queryByText("Advanced Hypertrophy Mechanisms & Periodization")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Watch Video" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign to Client" })).not.toBeInTheDocument();
  });

  it("loads education resources from the persistence API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "education_api",
              title: "Persisted Recovery PDF",
              category: "Recovery",
              resourceType: "pdf"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(EducationPage));

    expect(await screen.findByText("Persisted Recovery PDF")).toBeInTheDocument();
    expect(screen.getByText("Synced library")).toBeInTheDocument();
  });

  it("shows an empty persisted education library when the resource API is empty", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    render(createElement(EducationPage));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/education-resources?limit=100"));
    expect(screen.getByText("No education resources were returned from the database.")).toBeInTheDocument();
    expect(screen.queryByText("Preview library")).not.toBeInTheDocument();
    expect(screen.queryByText("Nutrition Guide")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nutrition Kit" }));
    expect(screen.getByText("No education resources were returned from the database.")).toBeInTheDocument();
  });

  it("uploads a file and creates an education resource", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/education-resources/upload-url") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                objectId: "organizations/org_1/education/resources/pdf/00000000-0000-4000-8000-000000000000.pdf",
                uploadUrl: "https://uploads.example.test/resource.pdf",
                requiredHeaders: { "Content-Type": "application/pdf" },
                resourceType: "pdf"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url === "https://uploads.example.test/resource.pdf" && init?.method === "PUT") {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      if (url === "/api/v1/education-resources" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "resource_created" } }), { status: 201 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(AddResourcePage));

    fireEvent.change(screen.getByLabelText("Resource Title"), {
      target: { value: "Recovery Basics" }
    });
    fireEvent.change(screen.getByLabelText("Browse Files"), {
      target: { files: [new File(["pdf"], "recovery.pdf", { type: "application/pdf" })] }
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish as Resource" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Resource published.");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/education-resources",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("organizations/org_1/education/resources/pdf")
      })
    );
  });

  it("creates direct URL education resources without requesting upload storage", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/education-resources" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "resource_link" } }), { status: 201 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(AddResourcePage));

    fireEvent.change(screen.getByLabelText("Resource Title"), {
      target: { value: "Recovery Article" }
    });
    fireEvent.change(screen.getByLabelText("Resource Type"), {
      target: { value: "link" }
    });
    fireEvent.change(screen.getByLabelText("Resource URL"), {
      target: { value: "https://example.test/recovery" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish as Resource" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Resource published.");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/education-resources/upload-url",
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/education-resources",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("https://example.test/recovery")
      })
    );
  });

  it("reports missing education resource inputs and failed uploads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/education-resources/upload-url") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                objectId: "organizations/org_1/education/resources/pdf/00000000-0000-4000-8000-000000000000.pdf",
                uploadUrl: "https://uploads.example.test/fail.pdf",
                requiredHeaders: { "Content-Type": "application/pdf" },
                resourceType: "pdf"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "https://uploads.example.test/fail.pdf" && init?.method === "PUT") {
        return Promise.resolve(new Response(null, { status: 500 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(AddResourcePage));

    fireEvent.click(screen.getByRole("button", { name: "Publish as Resource" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Enter a resource title before publishing.");

    fireEvent.change(screen.getByLabelText("Resource Title"), {
      target: { value: "Recovery Basics" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish as Resource" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Attach a file or add a URL before publishing.");

    fireEvent.change(screen.getByLabelText("Browse Files"), {
      target: { files: [new File(["pdf"], "recovery.pdf", { type: "application/pdf" })] }
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish as Resource" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Could not publish this resource.");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/education-resources",
      expect.objectContaining({ method: "POST" })
    );
  });
});
