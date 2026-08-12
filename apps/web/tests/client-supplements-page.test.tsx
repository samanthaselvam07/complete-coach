import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearClientMeCache } from "@/components/client-app/client-me-cache";
import { buildClientLogNotes } from "@/components/client-app/client-daily-log-state";
import { ClientSupplementsPage } from "@/components/client-app/client-supplements-page";

describe("ClientSupplementsPage", () => {
  afterEach(() => {
    clearClientMeCache();
    vi.unstubAllGlobals();
  });

  it("renders the assigned supplement stack from the client profile assignment and tracks daily adherence", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One" },
              supplementPlanAssignments: [
                {
                  id: "supplement_assignment_1",
                  name: "Sleep Support",
                  status: "active",
                  startsOn: "2026-07-01",
                  endsOn: null,
                  snapshot: {
                    templateName: "Sleep Support",
                    template: {
                      phases: [
                        {
                          name: "Morning",
                          supplements: [
                            {
                              supplementName: "Foundation Multi",
                              dosage: "2 capsules",
                              timing: "With food",
                              notes: "Take with breakfast."
                            }
                          ]
                        },
                        {
                          name: "Evening",
                          supplements: [
                            {
                              supplementName: "Magnesium Glycinate",
                              dosage: "300mg",
                              timing: "Before bed",
                              notes: "Take with dinner.\nSupplement link: https://completecoach.fit/magnesium"
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    }));

    render(<ClientSupplementsPage />);

    expect(await screen.findByRole("heading", { name: "Supplement Stack" })).toBeInTheDocument();
    expect(screen.getByText("Sleep Support • Client One")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Supplement adherence" })).toHaveTextContent("0%");
    expect(screen.getByRole("region", { name: "Morning supplements" })).toHaveTextContent("Foundation Multi");

    const eveningSection = screen.getByRole("region", { name: "Evening supplements" });
    expect(eveningSection).toHaveTextContent("Magnesium Glycinate");
    expect(screen.queryByText("Take with dinner.")).not.toBeInTheDocument();

    fireEvent.click(within(eveningSection).getByRole("button", { name: "View details for Magnesium Glycinate" }));

    const dialog = screen.getByRole("dialog", { name: "Magnesium Glycinate" });
    expect(within(dialog).getByText("Coach notes")).toBeInTheDocument();
    expect(within(dialog).getByText("Take with dinner.")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Purchase supplement" })).toHaveAttribute(
      "href",
      "https://completecoach.fit/magnesium"
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark complete Foundation Multi" }));

    expect(screen.getByRole("region", { name: "Supplement adherence" })).toHaveTextContent("50%");
    expect(screen.getByText("1 of 2 supplements completed today.")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/client/logs",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"domain\":\"supplementation\"")
        })
      );
    });
  });

  it("does not show a supplement plan when the signed-in client has no active assignment", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One" },
              supplementPlanAssignments: [
                {
                  id: "supplement_assignment_2",
                  name: "Paused Sleep Support",
                  status: "paused",
                  startsOn: "2026-07-01",
                  endsOn: null,
                  snapshot: {
                    templateName: "Paused Sleep Support",
                    template: {
                      phases: [
                        {
                          name: "Evening",
                          supplements: [
                            {
                              supplementName: "Magnesium Glycinate",
                              dosage: "300mg",
                              timing: "Before bed",
                              notes: "Paused note"
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    }));

    render(<ClientSupplementsPage />);

    expect(await screen.findByText("No supplement protocol has been assigned yet.")).toBeInTheDocument();
    expect(screen.queryByText("Paused Sleep Support • Client One")).not.toBeInTheDocument();
    expect(screen.queryByText("Magnesium Glycinate")).not.toBeInTheDocument();
  });

  it("restores supplements completed earlier in the same day from the client activity log", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One", timezone: "Australia/Melbourne" },
              supplementPlanAssignments: [
                {
                  id: "supplement_assignment_1",
                  name: "Sleep Support",
                  status: "active",
                  startsOn: "2026-07-01",
                  endsOn: null,
                  snapshot: {
                    template: {
                      phases: [
                        {
                          name: "Morning",
                          supplements: [
                            {
                              supplementName: "Foundation Multi",
                              dosage: "2 capsules",
                              timing: "With food"
                            }
                          ]
                        },
                        {
                          name: "Evening",
                          supplements: [
                            {
                              supplementName: "Magnesium Glycinate",
                              dosage: "300mg",
                              timing: "Before bed"
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.startsWith("/api/v1/client/logs?dateFrom=") && !init) {
        return new Response(
          JSON.stringify({
            data: {
              logs: [
                {
                  id: "log_supplements_today",
                  domain: "supplementation",
                  logDate: "2026-08-12",
                  status: "completed",
                  notes: buildClientLogNotes("1 supplement completed today.", {
                    supplementation: {
                      completedKeys: ["Morning:Foundation Multi:0"]
                    }
                  }),
                  createdAt: "2026-08-12T00:00:00.000Z",
                  updatedAt: "2026-08-12T00:00:00.000Z"
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/logs" && init?.method === "POST") {
        return new Response(JSON.stringify({ data: { log: { id: "log_supplements_today" } } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientSupplementsPage />);

    expect(await screen.findByRole("heading", { name: "Supplement Stack" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Supplement adherence" })).toHaveTextContent("50%");
    expect(screen.getByText("1 of 2 supplements completed today.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark incomplete Foundation Multi" }));

    expect(screen.getByRole("region", { name: "Supplement adherence" })).toHaveTextContent("0%");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/logs",
        expect.objectContaining({ method: "POST" })
      );
    });
    const logPostCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/v1/client/logs" && init?.method === "POST"
    );
    const logPostBody = JSON.parse(String(logPostCall?.[1]?.body)) as { notes: string; status: string };
    expect(logPostBody.status).toBe("missed");
    expect(logPostBody.notes).toContain('"completedKeys":[]');
  });
});
