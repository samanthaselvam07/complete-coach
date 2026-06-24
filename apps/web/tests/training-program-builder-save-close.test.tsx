import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Training program builder save and close", () => {
  it("saves edits back to the original persisted custom program", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates/template_existing" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_existing",
                name: "Edited Hypertrophy Build",
                description: "Updated progression.",
                goal: "custom-program",
                durationWeeks: 10,
                status: "draft",
                template: {
                  days: [
                    {
                      name: "Lower Day",
                      exercises: [
                        {
                          exerciseId: "manual-entry",
                          exerciseName: "Back Squat",
                          sets: 5,
                          reps: "5-7",
                          restSeconds: 180,
                          section: "workout"
                        }
                      ]
                    }
                  ],
                  instructions: "Push load only if speed stays high."
                },
                updatedAt: "2026-06-17T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      if (url.startsWith("/api/v1/training-program-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_existing",
                  name: "Original Hypertrophy Build",
                  description: "Original progression.",
                  goal: "custom-program",
                  durationWeeks: 8,
                  status: "draft",
                  template: {
                    days: [
                      {
                        name: "Lower Day",
                        exercises: [
                          {
                            exerciseId: "manual-entry",
                            exerciseName: "Back Squat",
                            sets: 4,
                            reps: "6-8",
                            restSeconds: 150,
                            section: "workout"
                          }
                        ]
                      }
                    ],
                    instructions: "Progress steadily."
                  },
                  updatedAt: "2026-06-16T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("button", { name: "Edit Original Hypertrophy Build" }));
    fireEvent.change(screen.getByLabelText(/Program Title/i), { target: { value: "Edited Hypertrophy Build" } });
    fireEvent.change(screen.getByLabelText(/Program Duration/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "5-7" } });
    fireEvent.change(screen.getByLabelText(/Workout Instructions/i), {
      target: { value: "Push load only if speed stays high." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save & Close" }));

    expect(await screen.findByText("Edited Hypertrophy Build saved.")).toBeInTheDocument();
    expect(screen.getByText("Edited Hypertrophy Build")).toBeInTheDocument();
    expect(screen.queryByText("Original Hypertrophy Build")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-templates/template_existing",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("Edited Hypertrophy Build")
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({ method: "POST" })
    );
  });

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
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add custom exercise" }));
    const customExerciseDialog = screen.getByRole("dialog", { name: "Add custom exercise" });
    fireEvent.change(within(customExerciseDialog).getByLabelText("Exercise name"), { target: { value: "Single Leg Squat" } });
    fireEvent.change(within(customExerciseDialog).getByLabelText("YouTube or external video link"), {
      target: { value: "https://youtu.be/single-leg-squat" }
    });
    fireEvent.change(within(customExerciseDialog).getByLabelText("Upload exercise video"), {
      target: { files: [new File(["demo"], "single-leg-squat.mp4", { type: "video/mp4" })] }
    });
    fireEvent.click(within(customExerciseDialog).getByRole("button", { name: "Add exercise" }));
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Video link: https://youtu.be/single-leg-squat")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/training-program-templates",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Uploaded video: single-leg-squat.mp4")
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
