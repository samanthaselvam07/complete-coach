import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Training program builder save and close", () => {
  it("persists the program and returns to the custom programs tab", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "training_program_saved",
                name: "Preview Hypertrophy Build",
                description: "Coach-created custom program from the program library.",
                goal: "custom-program",
                durationWeeks: 8,
                status: "draft",
                template: { days: [{ name: "Day 1", exercises: [] }], instructions: "" },
                updatedAt: "2026-06-17T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.change(screen.getByLabelText(/Program Title/i), { target: { value: "Preview Hypertrophy Build" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & Close" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Program Library" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Create a Program" })).not.toBeInTheDocument();
    expect(await screen.findByText("Preview Hypertrophy Build")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Custom programs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Preview Hypertrophy Build added to Custom programs.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Preview Hypertrophy Build")
      })
    );
  });

  it("returns to the program templates tab when saving as a template", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_saved",
                name: "Template Save Build",
                description: "Coach-created template from the program library.",
                goal: "custom",
                durationWeeks: 8,
                status: "draft",
                template: { days: [] },
                updatedAt: "2026-05-14T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.change(screen.getByLabelText(/Program Title/i), { target: { value: "Template Save Build" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Template" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Program Library" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Program templates" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Program templates" })).toHaveTextContent("Template Save Build");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Template Save Build")
      })
    );
  });
});
