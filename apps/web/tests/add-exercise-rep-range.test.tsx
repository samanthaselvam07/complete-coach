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

describe("AddExercisePage rep range", () => {
  it("saves the configured lower and upper rep range into the exercise defaults", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "exercise_created",
            name: "Tempo Squat",
            category: "Compound",
            scope: "private",
            primaryMuscles: ["Chest", "Shoulders"],
            defaultReps: "6-10"
          }
        }),
        { status: 201 }
      )
    );

    render(createElement(AddExercisePage));

    fireEvent.change(screen.getByLabelText("Exercise Name"), {
      target: { value: "Tempo Squat" }
    });
    fireEvent.change(screen.getByLabelText("Lower range"), {
      target: { value: "6" }
    });
    fireEvent.change(screen.getByLabelText("Upper range"), {
      target: { value: "10" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save Exercise" })[0]);

    await waitFor(() => expect(navigationMocks.push).toHaveBeenCalledWith("/training/exercises"));

    const createCall = fetchMock.mock.calls.find(([input, init]) => input === "/api/v1/exercises" && init?.method === "POST");
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      name: "Tempo Squat",
      defaultReps: "6-10"
    });
  });
});
