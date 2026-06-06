import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SocialMediaPage } from "@/components/social/social-media-page";

describe("SocialMediaPage", () => {
  it("falls back to fixture social content when APIs are unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(<SocialMediaPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Social Media Hub" })).toBeInTheDocument();
    expect(await screen.findByText(/read-only fallback/i)).toBeInTheDocument();
    expect(screen.getByText("Platform Overview")).toBeInTheDocument();
  });

  it("loads persisted social connections and scheduled posts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "connection_1",
                  provider: "x",
                  accountName: "Coach X",
                  status: "active",
                  scopes: ["tweet.write"],
                  connectedAt: "2026-06-06T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/social/posts?limit=20") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "post_1",
                  caption: "API scheduled post",
                  scheduledFor: "2026-06-08T09:00:00.000Z",
                  status: "scheduled",
                  media: [],
                  targets: [
                    {
                      id: "target_1",
                      provider: "x",
                      accountName: "Coach X",
                      status: "scheduled"
                    }
                  ]
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<SocialMediaPage />);

    expect(await screen.findByText("Coach X")).toBeInTheDocument();
    expect(await screen.findByText("API scheduled post")).toBeInTheDocument();
    expect(screen.queryByText(/read-only fallback/i)).not.toBeInTheDocument();
  });

  it("creates scheduled social posts through the persistence API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/social/connections") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "connection_1",
                  provider: "x",
                  accountName: "Coach X",
                  status: "active",
                  scopes: ["tweet.write"],
                  connectedAt: "2026-06-06T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/social/posts?limit=20") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/social/posts" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "post_created",
                caption: "Persisted social launch",
                scheduledFor: "2026-06-08T09:00:00.000Z",
                status: "scheduled",
                media: [],
                targets: [
                  {
                    id: "target_1",
                    provider: "x",
                    accountName: "Coach X",
                    status: "scheduled"
                  }
                ]
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<SocialMediaPage />);

    fireEvent.click(await screen.findByRole("button", { name: /new post/i }));
    fireEvent.change(screen.getByLabelText(/caption/i), {
      target: { value: "Persisted social launch" }
    });
    fireEvent.change(screen.getByLabelText(/schedule date/i), {
      target: { value: "2026-06-08T09:00" }
    });
    fireEvent.click(screen.getByLabelText(/Coach X/i));
    fireEvent.click(screen.getByRole("button", { name: /schedule post/i }));

    expect(await screen.findByText("Persisted social launch")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/social/posts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            caption: "Persisted social launch",
            scheduledFor: "2026-06-08T09:00:00.000Z",
            targetConnectionIds: ["connection_1"],
            media: []
          })
        })
      )
    );
  });
});
