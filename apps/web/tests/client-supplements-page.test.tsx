import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientSupplementsPage } from "@/components/client-app/client-supplements-page";

describe("ClientSupplementsPage", () => {
  afterEach(() => {
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
    expect(within(eveningSection).getByText("Take with dinner.")).toBeInTheDocument();
    expect(within(eveningSection).getByRole("link", { name: "Buy supplement" })).toHaveAttribute(
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
});
