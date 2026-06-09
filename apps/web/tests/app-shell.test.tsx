import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/app-shell/dashboard-shell";
import { MessageMenu } from "@/components/app-shell/message-menu";
import { NewClientButton } from "@/components/app-shell/new-client-button";
import { NotificationMenu } from "@/components/app-shell/notification-menu";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { TopSearch } from "@/components/app-shell/top-search";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/",
  push: vi.fn(),
  replace: vi.fn()
}));

const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    push: navigationMocks.push,
    replace: navigationMocks.replace
  })
}));

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  useSession: () => useSessionMock()
}));

describe("app shell navigation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    navigationMocks.pathname = "/";
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("renders primary and nested navigation links", () => {
    render(createElement(SidebarNav, { currentPath: "/training/exercises" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });
    const brandLink = screen.getByRole("link", { name: "Complete Coach dashboard" });

    expect(within(brandLink).getByAltText("Complete Coach icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/brand/favicon.svg")
    );
    expect(screen.getByText("Business OS for Fitness Professionals")).toBeInTheDocument();
    expect(screen.queryByText("Elite Performance")).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^dashboard$/i })).toHaveAttribute("href", "/");
    expect(within(nav).queryByRole("link", { name: /^audit log$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^scheduling$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^education$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^coach profile$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^settings$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^training$/i })).not.toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /^training$/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(
      within(nav).queryByRole("link", { name: /^training programs$/i })
    ).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: /expand training menu/i }));

    expect(within(nav).getByRole("link", { name: /^training programs$/i })).toHaveAttribute(
      "href",
      "/training/programs"
    );
    expect(within(nav).getByRole("link", { name: /^exercise database$/i })).toHaveAttribute(
      "href",
      "/training/exercises"
    );

    fireEvent.click(within(nav).getByRole("button", { name: /expand clients menu/i }));

    expect(within(nav).getByRole("link", { name: /^check-ins$/i })).toHaveAttribute(
      "href",
      "/clients/check-ins"
    );
    expect(within(nav).getByRole("link", { name: /^messages$/i })).toHaveAttribute(
      "href",
      "/messages"
    );
    expect(within(nav).queryAllByRole("link", { name: /^messages$/i })).toHaveLength(1);

    fireEvent.click(within(nav).getByRole("button", { name: /expand social media menu/i }));

    expect(within(nav).getByRole("link", { name: /^social hub$/i })).toHaveAttribute(
      "href",
      "/social-media"
    );
    expect(within(nav).queryByRole("link", { name: /^create post$/i })).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: /expand packages menu/i }));

    expect(within(nav).getByRole("link", { name: /^package library$/i })).toHaveAttribute(
      "href",
      "/packages"
    );
    expect(within(nav).queryByRole("link", { name: /^create package$/i })).not.toBeInTheDocument();
  });

  it("marks the active route for nested navigation", () => {
    render(createElement(SidebarNav, { currentPath: "/clients/check-ins" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });
    const clientsLink = within(nav).getByRole("button", { name: /^clients$/i });

    expect(clientsLink).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: /^check-ins$/i })).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: /expand clients menu/i }));

    expect(within(nav).getByRole("link", { name: /^check-ins$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(nav).getByRole("link", { name: /^dashboard$/i })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("collapses and expands nested menu groups", () => {
    render(createElement(SidebarNav, { currentPath: "/" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });
    const trainingToggle = within(nav).getByRole("button", {
      name: /expand training menu/i
    });

    expect(trainingToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      within(nav).queryByRole("link", { name: /^training programs$/i })
    ).not.toBeInTheDocument();

    fireEvent.click(trainingToggle);

    expect(trainingToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: /^training programs$/i })).toBeInTheDocument();

    fireEvent.click(trainingToggle);

    expect(trainingToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      within(nav).queryByRole("link", { name: /^training programs$/i })
    ).not.toBeInTheDocument();
  });

  it("expands a nested group title without navigating away", () => {
    render(createElement(SidebarNav, { currentPath: "/" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(nav).getByRole("button", { name: /expand training menu/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    fireEvent.click(within(nav).getByRole("button", { name: /^training$/i }));

    expect(within(nav).getByRole("button", { name: /collapse training menu/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(within(nav).getByRole("link", { name: /^training programs$/i })).toBeInTheDocument();
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });

  it("keeps a group expanded on its summary route", () => {
    render(createElement(SidebarNav, { currentPath: "/training" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(nav).getByRole("button", { name: /^training$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(nav).getByRole("button", { name: /collapse training menu/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(within(nav).getByRole("link", { name: /^training programs$/i })).toBeInTheDocument();
  });

  it("keeps nested menu groups collapsed by default on active nested routes", () => {
    render(createElement(SidebarNav, { currentPath: "/nutrition/meal-plans" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(nav).queryByRole("link", { name: /^nutrition$/i })).not.toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /^nutrition$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(nav).getByRole("button", { name: /expand nutrition menu/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(within(nav).queryByRole("link", { name: /^meal plans$/i })).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: /expand nutrition menu/i }));

    expect(within(nav).getByRole("link", { name: /^meal plans$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("opens supplementation from the group title and waits for a child route selection", () => {
    render(createElement(SidebarNav, { currentPath: "/messages" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(nav).queryByRole("link", { name: /^supplementation$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^supplement plans$/i })).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: /^supplementation$/i }));

    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(within(nav).getByRole("link", { name: /^supplement plans$/i })).toHaveAttribute(
      "href",
      "/supplementation/plans"
    );
    expect(within(nav).getByRole("link", { name: /^supplement database$/i })).toHaveAttribute(
      "href",
      "/supplementation/database"
    );
  });

  it("keeps the sidebar focused on navigation without the new client action", () => {
    render(createElement(SidebarNav, { currentPath: "/" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(nav).getByRole("link", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Client" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ New Client" })).not.toBeInTheDocument();
  });

  it("moves coach profile and individual settings into the bottom coach module", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { id: "user_1", name: "Demo Coach", email: "coach@example.com" },
        activeOrganization: { name: "Complete Coach Demo", role: "owner" }
      },
      status: "authenticated"
    });

    render(createElement(SidebarNav, { currentPath: "/" }));
    const nav = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(nav).queryByRole("link", { name: /^coach profile$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /^settings$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Coach module links")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open coach module for demo coach/i }));

    const coachModule = screen.getByLabelText("Coach module links");
    expect(within(coachModule).getByRole("link", { name: "Coach Profile" })).toHaveAttribute(
      "href",
      "/coach-profile"
    );
    expect(within(coachModule).getByRole("link", { name: "Individual Coach Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });

  it("creates a new client from the top navigation quick action", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "client_sidebar_1",
            name: "Sidebar Client",
            packageName: "Starter Coaching",
            compliance: 0,
            checkInDay: "Friday",
            latestCheckIn: "Not recorded",
            status: "new",
            startDate: "May 14, 2026",
            initials: "SC",
            avatarColor: "bg-slate-900"
          }
        }),
        { status: 201 }
      )
    );

    render(createElement(NewClientButton));

    fireEvent.click(screen.getByRole("button", { name: "New Client" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Sidebar" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Client" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sidebar@example.com" } });
    fireEvent.change(screen.getByLabelText("Package"), { target: { value: "Starter Coaching" } });
    fireEvent.change(screen.getByLabelText("Check-in day"), { target: { value: "Friday" } });
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/clients",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("sidebar@example.com")
      })
    );
    await waitFor(() => expect(navigationMocks.push).toHaveBeenCalledWith("/clients/client_sidebar_1"));
  });
});

describe("dashboard shell auth boundary", () => {
  beforeEach(() => {
    navigationMocks.pathname = "/";
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("renders public routes without app navigation for signed-out users", () => {
    navigationMocks.pathname = "/sign-in";

    render(createElement(DashboardShell, null, createElement("h1", null, "Welcome back")));

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /primary navigation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: /search tasks/i })).not.toBeInTheDocument();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("redirects signed-out users away from protected routes without app navigation", () => {
    navigationMocks.pathname = "/";

    render(createElement(DashboardShell, null, createElement("h1", null, "Dashboard")));

    expect(screen.getByText(/loading secure workspace/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /primary navigation/i })).not.toBeInTheDocument();
    expect(navigationMocks.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("renders full app navigation for authenticated users", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { id: "user_1", name: "Demo Coach", email: "coach@example.com" },
        activeOrganization: { name: "Complete Coach Demo", role: "owner" }
      },
      status: "authenticated"
    });

    render(createElement(DashboardShell, null, createElement("h1", null, "Dashboard")));

    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search tasks/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schedule Event / Call" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Client" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /messages/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open account menu for demo coach/i }));
    expect(screen.getByText("Complete Coach Demo · owner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("keeps the left navigation fixed while main page content scrolls", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { id: "user_1", name: "Demo Coach", email: "coach@example.com" },
        activeOrganization: { name: "Complete Coach Demo", role: "owner" }
      },
      status: "authenticated"
    });

    render(createElement(DashboardShell, null, createElement("h1", null, "Dashboard")));

    const nav = screen.getByRole("navigation", { name: /primary navigation/i });
    const sidebar = nav.closest("aside");
    const main = screen.getByRole("main");

    expect(sidebar).toHaveClass("sticky", "top-0", "h-screen");
    expect(main).toHaveClass("min-h-0", "overflow-y-auto");
  });
});

describe("topbar controls", () => {
  it("renders a globally searchable input", () => {
    render(createElement(TopSearch));

    expect(
      screen.getByRole("searchbox", { name: /search tasks, clients, or pipeline/i })
    ).toBeInTheDocument();
  });
});

describe("notifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows unread count and can mark all notifications as read", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));
    render(createElement(NotificationMenu));

    const trigger = screen.getByRole("button", { name: /notifications/i });
    expect(trigger).toHaveTextContent("3");

    fireEvent.click(trigger);
    const menu = screen.getByRole("region", { name: /notifications/i });

    expect(within(menu).getByText("New Check-In Submitted")).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: /mark all as read/i }));

    expect(screen.getByRole("button", { name: /notifications/i })).toHaveTextContent("0");
  });

  it("closes the notification popup when clicking outside it", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));
    render(createElement(NotificationMenu));

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByRole("region", { name: /notifications/i })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("region", { name: /notifications/i })).not.toBeInTheDocument();
  });

  it("loads persisted notifications and marks them read through the API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/notifications?limit=20") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "notification_api_1",
                  type: "message",
                  title: "Persisted Message",
                  message: "Sarah replied to your check-in note",
                  unread: true,
                  createdAt: new Date().toISOString()
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/notifications/read" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ data: { updatedCount: 1 } }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(NotificationMenu));

    await waitFor(() => expect(screen.getByRole("button", { name: /notifications/i })).toHaveTextContent("1"));
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    const menu = screen.getByRole("region", { name: /notifications/i });
    expect(within(menu).getByText("Persisted Message")).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: /mark all as read/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications/read", { method: "POST" })
    );
    expect(screen.getByRole("button", { name: /notifications/i })).toHaveTextContent("0");
  });

  it("formats persisted notification timestamps across minute, hour, and day ranges", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-05-18T12:00:00.000Z").getTime());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "notification_minute",
              type: "check-in",
              title: "Minute Notification",
              message: "Recent update",
              unread: true,
              createdAt: "2026-05-18T11:58:00.000Z"
            },
            {
              id: "notification_hour",
              type: "form",
              title: "Hour Notification",
              message: "Earlier update",
              unread: false,
              createdAt: "2026-05-18T10:00:00.000Z"
            },
            {
              id: "notification_day",
              type: "task",
              title: "Day Notification",
              message: "Older update",
              unread: false,
              createdAt: "2026-05-16T12:00:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(NotificationMenu));

    await waitFor(() => expect(screen.getByRole("button", { name: /notifications/i })).toHaveTextContent("1"));
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    const menu = screen.getByRole("region", { name: /notifications/i });
    expect(within(menu).getByText("2 minutes ago")).toBeInTheDocument();
    expect(within(menu).getByText("2 hours ago")).toBeInTheDocument();
    expect(within(menu).getByText("2 days ago")).toBeInTheDocument();
  });
});

describe("messages menu", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens recent messages inline from the top bar", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(MessageMenu));

    const trigger = screen.getByRole("button", { name: /messages/i });
    fireEvent.click(trigger);

    const menu = screen.getByRole("region", { name: "Messages" });
    expect(within(menu).getByText("Sarah Johnson")).toBeInTheDocument();
    expect(within(menu).getByText("Thanks for the updated meal plan!")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Open full inbox" })).toHaveAttribute("href", "/messages");
  });

  it("closes the messages popup when clicking outside it", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));
    render(createElement(MessageMenu));

    fireEvent.click(screen.getByRole("button", { name: /messages/i }));
    expect(screen.getByRole("region", { name: "Messages" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("region", { name: "Messages" })).not.toBeInTheDocument();
  });

  it("loads persisted conversations in the inline messages window", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/conversations?limit=20") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "conversation_api",
                  clientName: "Persisted Client",
                  title: null,
                  latestMessage: {
                    id: "message_api",
                    senderType: "client",
                    body: "Can you review my check-in?",
                    createdAt: "2026-06-07T08:00:00.000Z"
                  },
                  updatedAt: "2026-06-07T08:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(MessageMenu));

    await waitFor(() => expect(screen.getByRole("button", { name: /messages/i })).toHaveTextContent("1"));
    fireEvent.click(screen.getByRole("button", { name: /messages/i }));

    const menu = screen.getByRole("region", { name: "Messages" });
    expect(within(menu).getByText("Persisted Client")).toBeInTheDocument();
    expect(within(menu).getByText("Can you review my check-in?")).toBeInTheDocument();
  });
});
