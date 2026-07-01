import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddExercisePage } from "@/components/training/add-exercise-page";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.push })
}));

afterEach(() => {
  vi.restoreAllMocks();
  navigationMocks.push.mockReset();
});

describe("AddExercisePage defaults", () => {
  it("renders compact rest, RPE and RIR target controls", () => {
    render(createElement(AddExercisePage));

    expect(screen.getByTestId("exercise-default-metrics")).toHaveClass("gap-2");
    expect(screen.getByTestId("rest-timer-control")).toHaveClass("px-2");
    expect(screen.getByTestId("rpe-target-control")).toHaveClass("px-2");
    expect(screen.getByTestId("rir-target-control")).toHaveClass("px-2");
    expect(screen.getByLabelText("Rest timer")).toHaveClass("h-9");
    expect(screen.getByLabelText("RPE target")).toHaveClass("h-9");
    expect(screen.getByLabelText("RIR target")).toHaveClass("h-9");
  });

  it("saves a free-form rep target with rest, RPE, RIR and external video link defaults", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "exercise_created",
            name: "Tempo Squat",
            category: "Compound",
            scope: "private",
            primaryMuscles: ["Chest", "Shoulders"],
            defaultReps: "AMRAP technical failure",
            defaultRestSeconds: 150,
            defaultRpe: 8.5,
            defaultRir: "1-2",
            videoUrl: "https://www.youtube.com/watch?v=tempo-squat"
          }
        }),
        { status: 201 }
      )
    );

    render(createElement(AddExercisePage));

    fireEvent.change(screen.getByLabelText("Exercise Name"), {
      target: { value: "Tempo Squat" }
    });
    fireEvent.change(screen.getByLabelText("Rep target"), {
      target: { value: "AMRAP technical failure" }
    });
    fireEvent.change(screen.getByLabelText("Rest timer"), {
      target: { value: "150" }
    });
    fireEvent.change(screen.getByLabelText("RPE target"), {
      target: { value: "8.5" }
    });
    fireEvent.change(screen.getByLabelText("RIR target"), {
      target: { value: "1-2" }
    });
    fireEvent.change(screen.getByLabelText("YouTube or external video link"), {
      target: { value: "https://www.youtube.com/watch?v=tempo-squat" }
    });
    selectExercisePageAnatomicalFilters(["Rectus Femoris", "Vastus Lateralis"]);
    fireEvent.click(screen.getAllByRole("button", { name: "Save Exercise" })[0]);

    await waitFor(() => expect(navigationMocks.push).toHaveBeenCalledWith("/training/exercises"));

    const createCall = fetchMock.mock.calls.find(([input, init]) => input === "/api/v1/exercises" && init?.method === "POST");
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      name: "Tempo Squat",
      defaultReps: "AMRAP technical failure",
      defaultRestSeconds: 150,
      defaultRpe: 8.5,
      defaultRir: "1-2",
      videoUrl: "https://www.youtube.com/watch?v=tempo-squat",
      primaryMuscles: ["Rectus Femoris", "Vastus Lateralis"]
    });
  });
});

function selectExercisePageAnatomicalFilters(targetMuscles: string[]) {
  fireEvent.click(screen.getByRole("button", { name: "Anatomical Filter" }));

  targetMuscles.forEach((muscle) => {
    const checkbox = screen.getByRole("checkbox", { name: muscle }) as HTMLInputElement;

    if (!checkbox.checked) {
      fireEvent.click(checkbox);
    }
  });

  const defaultMuscle = "Pectoralis Major";

  if (!targetMuscles.includes(defaultMuscle)) {
    const defaultCheckbox = screen.getByRole("checkbox", { name: defaultMuscle }) as HTMLInputElement;

    if (defaultCheckbox.checked) {
      fireEvent.click(defaultCheckbox);
    }
  }
}
