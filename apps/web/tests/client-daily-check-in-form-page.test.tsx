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
      if (url === "/api/v1/client/daily-check-in?kind=daily" && !init) {
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

      if (url === "/api/v1/client/daily-check-in?kind=daily" && init?.method === "POST") {
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
        "/api/v1/client/daily-check-in?kind=daily",
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

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/");
    });
  });

  it("loads and submits the assigned weekly check-in form", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/daily-check-in?kind=weekly" && !init) {
        return new Response(
          JSON.stringify({
            data: {
              id: "assignment_weekly_1",
              formName: "Weekly Review",
              dueAt: null,
              formVersion: {
                schema: {
                  title: "Weekly Review",
                  description: "Weekly check-in.",
                  fields: [{ id: "wins", type: "long-text", label: "Wins", required: true }]
                }
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/daily-check-in?kind=weekly" && init?.method === "POST") {
        return new Response(JSON.stringify({ data: { id: "submission_weekly_1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ClientDailyCheckInFormPage kind="weekly" />);

    expect(await screen.findByRole("heading", { name: "Weekly Review" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/wins/i), { target: { value: "Training consistency improved." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit weekly check-in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/daily-check-in?kind=weekly",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            answers: {
              wins: "Training consistency improved."
            }
          })
        })
      );
    });

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/");
    });
  });

  it("uploads photo fields before submitting a check-in", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/client/daily-check-in?kind=weekly" && !init) {
        return new Response(
          JSON.stringify({
            data: {
              id: "assignment_weekly_1",
              formName: "Weekly Review",
              dueAt: null,
              formVersion: {
                schema: {
                  title: "Weekly Review",
                  fields: [{ id: "progress_photo", type: "photo", label: "Progress photo", required: true }]
                }
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/check-in-photo-upload" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: {
              objectKey: "organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.jpg",
              photoUrl: "r2://organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.jpg"
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/client/daily-check-in?kind=weekly" && init?.method === "POST") {
        return new Response(JSON.stringify({ data: { id: "submission_weekly_1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ClientDailyCheckInFormPage kind="weekly" />);

    expect(await screen.findByRole("heading", { name: "Weekly Review" })).toBeInTheDocument();

    const photoFile = new File(["photo"], "front-progress.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/progress photo/i), { target: { files: [photoFile] } });

    expect(await screen.findByText("front-progress.jpg uploaded.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/client/check-in-photo-upload",
      expect.objectContaining({
        method: "POST",
        body: photoFile,
        headers: {
          "Content-Type": "image/jpeg",
          "x-filename": encodeURIComponent("front-progress.jpg")
        }
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit weekly check-in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/daily-check-in?kind=weekly",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            answers: {
              progress_photo: {
                byteSize: photoFile.size,
                contentType: "image/jpeg",
                fileName: "front-progress.jpg",
                objectKey: "organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.jpg",
                photoUrl: "r2://organizations/org_1/clients/client_1/check-ins/photos/11111111-1111-4111-8111-111111111111.jpg"
              }
            }
          })
        })
      );
    });
  });
});
