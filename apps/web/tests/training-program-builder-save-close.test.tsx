import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Training program builder save and close", () => {
  it("returns to the program library with a local program when persistence is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Training template API unavailable." } }), { status: 503 })
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
    expect(screen.getByText("Program saved locally because the persistence API is unavailable.")).toBeInTheDocument();
  });
});
