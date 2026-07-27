import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createBlankTrainingProgramDraft,
  TrainingProgramBuilder,
  type TrainingProgramDraft
} from "@/components/training/training-program-builder";

function renderBuilder(draft: TrainingProgramDraft) {
  return render(
    <TrainingProgramBuilder
      draft={draft}
      saving={false}
      onDraftChange={vi.fn()}
      onCancel={vi.fn()}
      onSave={vi.fn()}
      onSaveAsTemplate={vi.fn()}
      onSaveDayAsTemplate={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

describe("training program weekly volume chart", () => {
  it("shows an empty weekly volume chart for a brand-new blank program", () => {
    renderBuilder(createBlankTrainingProgramDraft());

    const chart = screen.getByRole("region", { name: "Weekly muscle volume chart" });

    expect(within(chart).getByText("0 total weekly sets")).toBeInTheDocument();
    expect(within(chart).getByText("Add exercises with set counts and muscle tags to build the weekly volume chart.")).toBeInTheDocument();
  });

  it("totals muscle group set volume across every training day in the week", () => {
    renderBuilder({
      sourceTemplateId: null,
      title: "Weekly Hypertrophy",
      tags: "",
      durationWeeks: "8",
      overview: "",
      instructions: "Progress load weekly.",
      activeDayId: "day-1",
      days: [
        {
          id: "day-1",
          name: "Lower 1",
          exercises: [
            {
              id: "squat",
              section: "workout",
              exerciseName: "Back Squat",
              sets: "4",
              reps: "6-8",
              rpe: "",
              rir: "",
              restSeconds: "180",
              primaryMuscles: ["Quads", "Glutes"]
            }
          ]
        },
        {
          id: "day-2",
          name: "Lower 2",
          exercises: [
            {
              id: "rdl",
              section: "workout",
              exerciseName: "Romanian Deadlift",
              sets: "3",
              reps: "8-10",
              rpe: "",
              rir: "",
              restSeconds: "150",
              primaryMuscles: ["Hamstrings", "Glutes"]
            }
          ]
        }
      ]
    });

    const chart = screen.getByRole("region", { name: "Weekly muscle volume chart" });

    expect(within(chart).getByText("14 total weekly sets")).toBeInTheDocument();
    expect(within(chart).getByText("Glutes")).toBeInTheDocument();
    expect(within(chart).getByText("7 sets")).toBeInTheDocument();
    expect(within(chart).getByText("Quads")).toBeInTheDocument();
    expect(within(chart).getByText("4 sets")).toBeInTheDocument();
    expect(within(chart).getByText("Hamstrings")).toBeInTheDocument();
    expect(within(chart).getByText("3 sets")).toBeInTheDocument();
  });
});
