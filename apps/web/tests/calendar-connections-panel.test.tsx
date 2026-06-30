import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CalendarConnectionsPanel } from "@/components/settings/calendar-connections-panel";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPanel() {
  render(
    createElement(CalendarConnectionsPanel, {
      scope: "coach",
      redirectTo: "/coach/settings",
      title: "Calendar Connections",
      description: "Connect personal calendars."
    })
  );
}

describe("CalendarConnectionsPanel", () => {
  it("renders active, pending, and empty provider states from the API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "google_connection",
              provider: "google",
              scope: "coach",
              accountName: "coach@example.com",
              calendarName: "Coaching",
              status: "active"
            },
            {
              id: "apple_connection",
              provider: "apple",
              scope: "coach",
              accountName: "iCloud setup pending",
              calendarName: null,
              status: "pending"
            }
          ]
        }),
        { status: 200 }
      )
    );

    renderPanel();

    expect(await screen.findByText("Calendar connections loaded.")).toBeInTheDocument();
    expect(screen.getByText("iCloud setup pending")).toBeInTheDocument();
    expect(screen.getByText("coach@example.com")).toBeInTheDocument();
    expect(screen.getByText("Apple Calendar").closest("article")).toHaveTextContent("Pending");
    expect(screen.getByText("Google Calendar").closest("article")).toHaveTextContent("Connected");
    expect(screen.getByText("Outlook Calendar").closest("article")).toHaveTextContent("Not connected");
    expect(screen.getByRole("link", { name: /connect google calendar/i })).toHaveAttribute(
      "href",
      "/api/v1/calendar/connections/oauth/start?provider=google&scope=coach&redirectTo=/coach/settings"
    );
  });

  it("creates Apple Calendar setup records and replaces existing Apple state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/calendar/connections?scope=coach" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (String(input) === "/api/v1/calendar/connections/apple" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "apple_connection",
                provider: "apple",
                scope: "coach",
                accountName: "Apple CalDAV setup",
                calendarName: null,
                status: "pending"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    renderPanel();

    expect(await screen.findByText("No calendars connected yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set up Apple Calendar" }));

    expect(await screen.findByText("Apple Calendar setup is ready. Add app-specific CalDAV credentials in production secrets.")).toBeInTheDocument();
    expect(screen.getByText("Apple CalDAV setup")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/calendar/connections/apple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ scope: "coach" })
      })
    );
  });

  it("shows load and setup failures without hiding provider actions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/calendar/connections?scope=coach" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));
      }

      if (String(input) === "/api/v1/calendar/connections/apple" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: { message: "Apple setup failed." } }), { status: 500 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    renderPanel();

    expect(await screen.findByText("Calendar connections could not be loaded.")).toBeInTheDocument();
    const appleCard = screen.getByText("Apple Calendar").closest("article");
    expect(appleCard).not.toBeNull();
    expect(within(appleCard as HTMLElement).getByText("No calendar connected.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set up Apple Calendar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/calendar/connections/apple", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText("Apple setup failed.")).toBeInTheDocument();
  });
});
