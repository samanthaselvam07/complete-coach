import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Training program builder exercise panel", () => {
  it("opens a side exercise database in the program builder and adds searched exercises", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/v1/exercises")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "api-high-bar-squat",
                  name: "High-Bar Back Squat",
                  category: "Quads",
                  scope: "global",
                  equipment: "Barbell",
                  difficulty: "intermediate",
                  videoObjectKey: null,
                  primaryMuscles: ["Quads", "Glutes"]
                },
                {
                  id: "api-incline-press",
                  name: "Incline DB Press",
                  category: "Chest",
                  scope: "global",
                  equipment: "Dumbbells",
                  difficulty: "intermediate",
                  videoObjectKey: null,
                  primaryMuscles: ["Chest"]
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

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));

    expect(await screen.findByRole("complementary", { name: "Exercise database panel" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Exercise Database" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Program builder canvas" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/exercises?limit=100");

    fireEvent.change(screen.getByLabelText("Search exercise database"), { target: { value: "squat" } });
    expect(screen.getByText("High-Bar Back Squat")).toBeInTheDocument();
    expect(screen.queryByText("Incline DB Press")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Drag High-Bar Back Squat into Workout" })).toHaveAttribute("draggable", "true");
    fireEvent.click(screen.getByRole("button", { name: "Add High-Bar Back Squat to Workout" }));

    expect(screen.getByDisplayValue("High-Bar Back Squat")).toBeInTheDocument();
  });

  it("supports compact movable rows and row deletion in the builder", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(TrainingProgramsPage));

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add custom exercise" }));
    fireEvent.change(screen.getAllByLabelText("Exercise name")[0], { target: { value: "Back Squat" } });
    fireEvent.click(screen.getByRole("button", { name: "Add custom exercise" }));
    fireEvent.change(screen.getAllByLabelText("Exercise name")[1], { target: { value: "Romanian Deadlift" } });

    const squatRow = screen.getByRole("group", { name: "Back Squat exercise row" });
    const deadliftRow = screen.getByRole("group", { name: "Romanian Deadlift exercise row" });

    expect(within(squatRow).getByLabelText("Rest time")).toBeInTheDocument();
    expect(within(squatRow).getByRole("button", { name: "Delete Back Squat" })).toBeInTheDocument();
    expect(within(deadliftRow).getByRole("button", { name: "Move Romanian Deadlift exercise" })).toHaveAttribute("draggable", "true");

    const dragData = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "move",
      dropEffect: "move",
      setData: (type: string, value: string) => dragData.set(type, value),
      getData: (type: string) => dragData.get(type) ?? ""
    };

    fireEvent.dragStart(within(deadliftRow).getByRole("button", { name: "Move Romanian Deadlift exercise" }), { dataTransfer });
    fireEvent.dragOver(squatRow, { dataTransfer });
    fireEvent.drop(squatRow, { dataTransfer });

    const exerciseNamesAfterMove = screen.getAllByLabelText("Exercise name").map((input) => (input as HTMLInputElement).value);
    expect(exerciseNamesAfterMove.slice(0, 2)).toEqual(["Romanian Deadlift", "Back Squat"]);

    fireEvent.click(within(screen.getByRole("group", { name: "Back Squat exercise row" })).getByRole("button", { name: "Delete Back Squat" }));

    expect(screen.queryByDisplayValue("Back Squat")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Romanian Deadlift")).toBeInTheDocument();
  });
});
