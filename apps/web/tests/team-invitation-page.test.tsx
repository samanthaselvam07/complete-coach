import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AcceptTeamInvitationPage } from "@/components/team/accept-team-invitation-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AcceptTeamInvitationPage", () => {
  it("accepts a valid invitation token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { status: "active" } }), { status: 200 })
    );
    const token = "invitation-token-that-is-long-enough-123";

    render(<AcceptTeamInvitationPage token={token} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));

    expect(await screen.findByRole("heading", { name: "Invitation accepted" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/team-invitations/accept",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token })
      })
    );
  });

  it("disables acceptance for incomplete links", () => {
    render(<AcceptTeamInvitationPage token={null} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/incomplete/i);
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeDisabled();
  });
});
