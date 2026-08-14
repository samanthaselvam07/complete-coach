import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FounderOnboardingPage } from "@/components/onboarding/founder-onboarding-page";

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  router: {
    replace: vi.fn()
  }
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks.router
}));

describe("founder onboarding page", () => {
  beforeEach(() => {
    navigationMocks.replace.mockReset();
    navigationMocks.router.replace = navigationMocks.replace;
    vi.restoreAllMocks();
  });

  it("walks first-login coaches through the required founder onboarding flow", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_, init) => {
      if (init && "method" in init && init.method === "POST") {
        return Promise.resolve(new Response(
          JSON.stringify({
            data: {
              firstName: "Sammi",
              required: true,
              completed: true,
              focus: "Fat loss",
              rosterSize: "6 to 15",
              platform: "Other",
              otherPlatform: "Custom spreadsheet"
            }
          }),
          { status: 200 }
        ));
      }

      return Promise.resolve(new Response(
        JSON.stringify({
          data: {
            firstName: "Sammi",
            required: true,
            completed: false,
            focus: null,
            rosterSize: null,
            platform: null,
            otherPlatform: null
          }
        }),
        { status: 200 }
      ));
    });

    render(<FounderOnboardingPage />);

    expect(await screen.findByRole("heading", { name: "Welcome to Complete Coach, Sammi." })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /let's go/i }));
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();

    const continueProfile = screen.getByRole("button", { name: /^continue/i });
    expect(continueProfile).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Coaching focus"), { target: { value: "Fat loss" } });
    fireEvent.change(screen.getByLabelText("Current client roster"), { target: { value: "6 to 15" } });
    expect(continueProfile).toBeEnabled();

    fireEvent.click(continueProfile);
    expect(screen.getByRole("heading", { name: "Where are your clients right now?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.change(screen.getByLabelText("Other platform"), { target: { value: "Custom spreadsheet" } });
    fireEvent.click(screen.getByRole("button", { name: /^continue/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/v1/onboarding/founder",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            focus: "Fat loss",
            rosterSize: "6 to 15",
            platform: "Other",
            otherPlatform: "Custom spreadsheet"
          })
        })
      );
    });

    expect(await screen.findByRole("heading", { name: "You're all set, Sammi." })).toBeInTheDocument();
    expect(screen.getByText("In the meantime, feel free to have a look around.")).toBeInTheDocument();

    const list = screen.getByRole("list");
    expect(within(list).getByText("walk through dashboard")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /go to my dashboard/i }));
    expect(navigationMocks.replace).toHaveBeenCalledWith("/");
  });

  it("sends coaches with completed onboarding back to the dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            firstName: "Sammi",
            required: true,
            completed: true,
            focus: "Fat loss",
            rosterSize: "6 to 15",
            platform: "Kahunas",
            otherPlatform: null
          }
        }),
        { status: 200 }
      )
    );

    render(<FounderOnboardingPage />);

    await waitFor(() => expect(navigationMocks.replace).toHaveBeenCalledWith("/"));
  });
});
