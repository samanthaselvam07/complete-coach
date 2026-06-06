import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { CoachProfilePage } from "@/components/coach/coach-profile-page";
import { NewClientIntakePage } from "@/components/clients/new-client-intake-page";
import { CreatePackagePage } from "@/components/packages/create-package-page";
import { SchedulingPage } from "@/components/scheduling/scheduling-page";
import { SettingsPage } from "@/components/settings/settings-page";
import { CreatePostPage } from "@/components/social/create-post-page";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe("Figma update pages", () => {
  it("creates a client from the new intake page", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "client_created_1" }), { status: 201 }),
    );

    render(<NewClientIntakePage />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ava" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Stone" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ava@example.com" } });
    fireEvent.change(screen.getByLabelText("Package"), { target: { value: "Elite Physique" } });
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/clients",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    expect(await screen.findByText("Client created.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open client profile" })).toHaveAttribute(
      "href",
      "/clients/client_created_1",
    );
  });

  it("validates the new client intake form before submitting", () => {
    render(<NewClientIntakePage />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    expect(screen.getByText("Enter the client's first and last name.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a package from the dedicated package builder page", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "package_created_1" }), { status: 201 }),
    );

    render(<CreatePackagePage />);

    fireEvent.change(screen.getByLabelText("Package name"), { target: { value: "Elite Physique" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "599" } });
    fireEvent.change(screen.getByLabelText("Features"), {
      target: { value: "Weekly check-ins\nTraining reviews" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create package" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/packages",
        expect.objectContaining({
          body: JSON.stringify({
            name: "Elite Physique",
            description: undefined,
            priceAmount: 59900,
            currency: "usd",
            billingInterval: "monthly",
            features: ["Weekly check-ins", "Training reviews"],
            color: "indigo",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
    });

    expect(await screen.findByText("Package created.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to packages" })).toHaveAttribute("href", "/packages");
  });

  it("validates package builder input before submitting", () => {
    render(<CreatePackagePage />);

    fireEvent.change(screen.getByLabelText("Package name"), { target: { value: "Elite Physique" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "not a price" } });
    fireEvent.click(screen.getByRole("button", { name: "Create package" }));

    expect(screen.getByText("Enter a package name and a valid price.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("schedules a social post from the create post page", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            connections: [
              { id: "connection_1", provider: "x", accountName: "Coach X", status: "connected" },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "post_1" }), { status: 201 }));

    render(<CreatePostPage />);

    expect(await screen.findByLabelText("Coach X")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "New transformation story" } });
    fireEvent.change(screen.getByLabelText("Schedule date"), { target: { value: "2026-06-09T10:30" } });
    fireEvent.click(screen.getByLabelText("Coach X"));
    fireEvent.click(screen.getByRole("button", { name: "Schedule post" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/v1/social/posts",
        expect.objectContaining({
          body: JSON.stringify({
            caption: "New transformation story",
            scheduledFor: "2026-06-09T10:30:00.000Z",
            targetConnectionIds: ["connection_1"],
            media: [],
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
    });

    expect(await screen.findByText("Post scheduled.")).toBeInTheDocument();
  });

  it("handles social post connection loading failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    render(<CreatePostPage />);

    expect(await screen.findByText("Social connections could not be loaded.")).toBeInTheDocument();
    expect(screen.getByText("Connect a social account before scheduling posts.")).toBeInTheDocument();
  });

  it("validates social post requirements before submitting", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "connection_2", provider: "instagram", accountName: "Coach IG", status: "connected" }],
        }),
        { status: 200 },
      ),
    );

    render(<CreatePostPage />);

    expect(await screen.findByLabelText("Coach IG")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schedule post" }));

    expect(screen.getByText("Add a caption, schedule date, and at least one account.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders the new shell pages from the Figma update", () => {
    const { rerender } = render(<CoachProfilePage />);
    expect(screen.getByRole("heading", { name: "Coach Profile" })).toBeInTheDocument();

    rerender(<SchedulingPage />);
    expect(screen.getByRole("heading", { name: "Scheduling" })).toBeInTheDocument();
    expect(screen.getByText("Weekly check-in rhythm")).toBeInTheDocument();

    rerender(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Business timezone")).toBeInTheDocument();
  });
});
