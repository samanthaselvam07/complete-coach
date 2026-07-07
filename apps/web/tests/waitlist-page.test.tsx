import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WaitlistPage } from "@/components/waitlist/waitlist-page";

describe("WaitlistPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the single-page waitlist brief content", () => {
    render(createElement(WaitlistPage));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your coaching platform should work as hard as you do."
    );
    expect(screen.getByText("Most coaching software is a database. Complete Coach is a business tool.")).toBeInTheDocument();
    expect(screen.getByText("An operating system for your coaching business.")).toBeInTheDocument();
    expect(screen.getByText("Built by a coach, for coaches.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("rejects invalid email before submission", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(createElement(WaitlistPage));

    fireEvent.change(screen.getAllByLabelText("Email address")[0], { target: { value: "bad-email" } });
    fireEvent.click(screen.getAllByRole("button", { name: /join the waitlist/i })[0]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });

  it("submits the email and shows the inline thank-you message", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ data: { status: "joined" } }), { status: 202 }));

    render(createElement(WaitlistPage));

    fireEvent.change(screen.getAllByLabelText("Email address")[0], { target: { value: "Coach@Example.com" } });
    fireEvent.click(screen.getAllByRole("button", { name: /join the waitlist/i })[0]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/waitlist",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "coach@example.com", source: "waitlist-page" })
        })
      )
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "You're on the list. We'll be in touch when early access opens."
    );
    expect(screen.getAllByLabelText("Email address")).toHaveLength(1);
  });

  it("shows an inline error when the waitlist endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "failed" } }), { status: 500 }));
    render(createElement(WaitlistPage));

    fireEvent.change(screen.getAllByLabelText("Email address")[0], { target: { value: "coach@example.com" } });
    fireEvent.click(screen.getAllByRole("button", { name: /join the waitlist/i })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong, please try again");
  });
});
