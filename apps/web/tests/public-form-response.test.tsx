import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicFormResponse } from "@/components/forms/public-form-response";

describe("PublicFormResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a public form by share slug and submits visitor answers", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_application",
              name: "Coaching Application",
              description: "Apply for coaching.",
              schema: {
                title: "Coaching Application",
                description: "Tell us about your goals.",
                fields: [
                  { id: "full-name", type: "short-text", label: "Full name", required: true },
                  { id: "email", type: "email", label: "Email address", required: true },
                  { id: "goal", type: "long-text", label: "Primary goal", required: false }
                ]
              },
              ui: { successMessage: "Application received." }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: "submitted" } }), { status: 201 }));

    render(createElement(PublicFormResponse, { shareSlug: "application-share" }));

    expect(await screen.findByRole("heading", { name: "Coaching Application" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "Alex Applicant" } });
    fireEvent.change(screen.getByLabelText("Email address *"), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Primary goal"), { target: { value: "Build muscle" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit form" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/v1/forms/respond/application-share",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            answers: {
              "full-name": "Alex Applicant",
              email: "alex@example.com",
              goal: "Build muscle"
            }
          })
        })
      )
    );
    expect(await screen.findByRole("heading", { name: "Form submitted" })).toBeInTheDocument();
    expect(screen.getByText("Application received.")).toBeInTheDocument();
  });
});
