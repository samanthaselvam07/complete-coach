import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientDailyCheckInFormPage } from "@/components/client-app/client-daily-check-in-form-page";

const mocks = vi.hoisted(() => ({
  push: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/check-in/daily",
  useRouter: () => ({ push: mocks.push })
}));

describe("ClientDailyCheckInFormPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads the assigned coach-linked daily check-in form and submits answers", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/daily-check-in" && !init) {
        return new Response(
          JSON.stringify({
            data: {
              id: "assignment_daily_1",
              formName: "Daily Basics",
              dueAt: null,
              formVersion: {
                schema: {
                  title: "Daily Basics",
                  description: "Today’s metrics.",
                  fields: [
                    { id: "body_weight", type: "number", label: "Bodyweight", required: true },
                    { id: "energy", type: "rating-10", label: "Energy" },
                    { id: "notes", type: "long-text", label: "Notes" }
                  ]
                }
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/daily-check-in" && init?.method === "POST") {
        return new Response(JSON.stringify({ data: { id: "submission_1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ClientDailyCheckInFormPage />);

    expect(await screen.findByRole("heading", { name: "Daily Basics" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/bodyweight/i), { target: { value: "74.5" } });
    fireEvent.click(screen.getByRole("button", { name: "8" }));
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: "Good recovery today." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit daily check-in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/daily-check-in",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            answers: {
              body_weight: 74.5,
              energy: "8",
              notes: "Good recovery today."
            }
          })
        })
      );
    });
    expect(await screen.findByRole("button", { name: "Submitted" })).toBeInTheDocument();
  });
});
