import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearClientMeCache } from "@/components/client-app/client-me-cache";
import { ClientOnboardingGate } from "@/components/client-app/client-onboarding-gate";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("ClientOnboardingGate", () => {
  afterEach(() => {
    clearClientMeCache();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows the connected Stripe payment paywall before client account access", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/v1/client/onboarding/status") {
        return Response.json({
          data: {
            payment: {
              required: true,
              packageId: "package_1",
              packageName: "Pro Coaching",
              status: "incomplete"
            },
            questionnaire: null
          }
        });
      }

      return Response.json({ error: { message: "Not found" } }, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <ClientOnboardingGate>
        <div>Client account unlocked</div>
      </ClientOnboardingGate>
    );

    expect(await screen.findByRole("heading", { name: "Complete your payment" })).toBeInTheDocument();
    expect(screen.getByText("Pro Coaching")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete payment" })).toBeInTheDocument();
    expect(screen.queryByText("Client account unlocked")).not.toBeInTheDocument();
  });

  it("shows the assigned onboarding Q&A after payment and unlocks the account after submission", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/onboarding/status") {
        return Response.json({
          data: {
            payment: {
              required: false,
              packageId: "package_1",
              packageName: "Pro Coaching",
              status: "active"
            },
            questionnaire: {
              id: "assignment_intake_1",
              formName: "Initial Q&A",
              formVersion: {
                schema: {
                  title: "Initial Q&A",
                  description: "Tell your coach what matters most.",
                  fields: [
                    { id: "goal", type: "long-text", label: "Primary goal", required: true },
                    { id: "starting_weight", type: "number", label: "Starting weight" }
                  ]
                }
              }
            }
          }
        });
      }

      if (url === "/api/v1/client/onboarding/questionnaire" && init?.method === "POST") {
        return Response.json({ data: { id: "submission_1" } }, { status: 201 });
      }

      return Response.json({ error: { message: "Not found" } }, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <ClientOnboardingGate>
        <div>Client account unlocked</div>
      </ClientOnboardingGate>
    );

    expect(await screen.findByRole("heading", { name: "Initial Q&A" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/primary goal/i), { target: { value: "Build strength" } });
    fireEvent.change(screen.getByLabelText(/starting weight/i), { target: { value: "74.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit onboarding Q&A" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/onboarding/questionnaire",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            answers: {
              goal: "Build strength",
              starting_weight: 74.5
            }
          })
        })
      );
    });
    expect(await screen.findByText("Client account unlocked")).toBeInTheDocument();
  });
});
