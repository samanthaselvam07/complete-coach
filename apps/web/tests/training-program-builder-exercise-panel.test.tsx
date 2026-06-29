import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

async function addCustomExercise(
  name: string,
  options: { bodyPart?: string; sets?: string; reps?: string; restSeconds?: string; rpe?: string; rir?: string; videoUrl?: string; file?: File } = {}
) {
  fireEvent.click(screen.getByRole("button", { name: "Add custom exercise" }));

  const dialog = screen.getByRole("dialog", { name: "Add custom exercise" });
  fireEvent.change(within(dialog).getByLabelText("Exercise name"), { target: { value: name } });
  fireEvent.change(within(dialog).getByLabelText("Body part worked"), { target: { value: options.bodyPart ?? "Quads" } });
  fireEvent.change(within(dialog).getByLabelText("Sets"), { target: { value: options.sets ?? "4" } });
  fireEvent.change(within(dialog).getByLabelText("Reps"), { target: { value: options.reps ?? "6-8" } });
  fireEvent.change(within(dialog).getByLabelText("Rest time"), { target: { value: options.restSeconds ?? "150" } });
  fireEvent.change(within(dialog).getByLabelText("RPE"), { target: { value: options.rpe ?? "8" } });
  fireEvent.change(within(dialog).getByLabelText("RIR"), { target: { value: options.rir ?? "2" } });

  if (options.videoUrl) {
    fireEvent.change(within(dialog).getByLabelText("YouTube or external video link"), { target: { value: options.videoUrl } });
  }

  if (options.file) {
    fireEvent.change(within(dialog).getByLabelText("Upload exercise video"), { target: { files: [options.file] } });
  }

  fireEvent.click(within(dialog).getByRole("button", { name: "Add exercise" }));
  return screen.findByRole("group", { name: `${name} exercise row` });
}

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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/exercises" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          name: string;
          category: string;
          defaultSets?: number;
          defaultReps?: string;
          defaultRestSeconds?: number;
          defaultRpe?: number;
          executionCues?: string[];
        };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: `exercise_${body.name.toLowerCase().replace(/\W+/g, "_")}`,
                name: body.name,
                category: body.category,
                scope: "private",
                equipment: null,
                difficulty: "intermediate",
                videoObjectKey: null,
                primaryMuscles: [body.category],
                defaultSets: 4,
                defaultReps: "6-8",
                defaultRestSeconds: 150,
                defaultRpe: 8,
                executionCues: ["Default RIR: 2"]
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
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    await screen.findByRole("button", { name: "Add custom exercise" });
    await addCustomExercise("Back Squat");
    await addCustomExercise("Romanian Deadlift", { bodyPart: "Hamstrings" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exercises",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"primaryMuscles\":[\"Quads\"]")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exercises",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"defaultRir\":\"2\"")
      })
    );

    const squatRow = screen.getByRole("group", { name: "Back Squat exercise row" });
    const deadliftRow = screen.getByRole("group", { name: "Romanian Deadlift exercise row" });

    expect(within(squatRow).getByLabelText("Rest time")).toBeInTheDocument();
    expect(within(squatRow).getByLabelText("Sets")).toHaveValue("4");
    expect(within(squatRow).getByLabelText("Reps")).toHaveValue("6-8");
    expect(within(squatRow).getByLabelText("RPE")).toHaveValue("8");
    expect(within(squatRow).getByLabelText("RIR")).toHaveValue("2");
    expect(within(squatRow).getByLabelText("Rest time")).toHaveValue("150");
    expect(squatRow).toHaveAttribute("draggable", "true");
    expect(within(squatRow).getByText("No video")).toBeInTheDocument();
    expect(within(squatRow).getByRole("button", { name: "Delete Back Squat" })).toBeInTheDocument();
    expect(within(deadliftRow).getByRole("button", { name: "Move Romanian Deadlift exercise" })).toBeInTheDocument();
    expect(deadliftRow).toHaveAttribute("draggable", "true");

    const dragData = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "move",
      dropEffect: "move",
      setData: (type: string, value: string) => dragData.set(type, value),
      getData: (type: string) => dragData.get(type) ?? ""
    };

    fireEvent.dragStart(deadliftRow, { dataTransfer });
    fireEvent.dragOver(squatRow, { dataTransfer });
    fireEvent.drop(squatRow, { dataTransfer });

    const exerciseNamesAfterMove = screen.getAllByLabelText("Exercise name").map((input) => (input as HTMLInputElement).value);
    expect(exerciseNamesAfterMove.slice(0, 2)).toEqual(["Romanian Deadlift", "Back Squat"]);

    fireEvent.click(within(screen.getByRole("group", { name: "Back Squat exercise row" })).getByRole("button", { name: "Delete Back Squat" }));

    expect(screen.queryByDisplayValue("Back Squat")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Romanian Deadlift")).toBeInTheDocument();
  });

  it("opens a custom exercise dialog with video link and upload options", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/exercises/media-upload-url" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                objectKey: "organizations/org_1/training/exercises/video/00000000-0000-4000-8000-000000000000.mp4",
                uploadUrl: "https://r2.example/custom-exercise-upload",
                requiredHeaders: { "Content-Type": "video/mp4" }
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "https://r2.example/custom-exercise-upload" && init?.method === "PUT") {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      if (String(input) === "/api/v1/exercises" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          name: string;
          category: string;
          defaultSets?: number;
          defaultReps?: string;
          defaultRestSeconds?: number;
          defaultRpe?: number;
          videoObjectKey?: string;
          executionCues?: string[];
        };

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "exercise_single_leg_squat",
                name: body.name,
                category: body.category,
                scope: "private",
                equipment: null,
                difficulty: "intermediate",
                videoObjectKey: body.videoObjectKey ?? null,
                primaryMuscles: [body.category],
                defaultSets: body.defaultSets,
                defaultReps: body.defaultReps,
                defaultRestSeconds: body.defaultRestSeconds,
                defaultRpe: body.defaultRpe,
                executionCues: body.executionCues
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
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    await screen.findByRole("button", { name: "Add custom exercise" });

    const videoFile = new File(["demo"], "single-leg-squat.mp4", { type: "video/mp4" });
    await addCustomExercise("Single Leg Squat", {
      bodyPart: "Glutes",
      sets: "3",
      reps: "10-12",
      restSeconds: "90",
      rpe: "7",
      rir: "3",
      videoUrl: "https://www.youtube.com/watch?v=demo",
      file: videoFile
    });

    const exerciseRow = screen.getByRole("group", { name: "Single Leg Squat exercise row" });

    expect(within(exerciseRow).getByDisplayValue("Single Leg Squat")).toBeInTheDocument();
    expect(within(exerciseRow).getByLabelText("Sets")).toHaveValue("3");
    expect(within(exerciseRow).getByLabelText("Reps")).toHaveValue("10-12");
    expect(within(exerciseRow).getByLabelText("Rest time")).toHaveValue("90");
    expect(within(exerciseRow).getByRole("button", { name: "View Single Leg Squat exercise video" })).toBeInTheDocument();
    expect(within(exerciseRow).queryByTitle("Single Leg Squat video")).not.toBeInTheDocument();

    fireEvent.click(within(exerciseRow).getByRole("button", { name: "View Single Leg Squat exercise video" }));

    const videoDialog = await screen.findByRole("dialog", { name: "Single Leg Squat exercise video" });
    expect(within(videoDialog).getByRole("link", { name: "Open source" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=demo");
    expect(within(videoDialog).getByTitle("Single Leg Squat video")).toHaveAttribute("src", "https://www.youtube.com/embed/demo");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/exercises/media-upload-url",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("single-leg-squat.mp4")
      })
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://r2.example/custom-exercise-upload",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: videoFile
      })
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/exercises",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("organizations/org_1/training/exercises/video/00000000-0000-4000-8000-000000000000.mp4")
      })
    );
  });

  it("still creates a custom exercise when video upload storage is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/exercises/media-upload-url" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Object storage is not configured." } }), {
            status: 503
          })
        );
      }

      if (String(input) === "/api/v1/exercises" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          name: string;
          category: string;
          defaultSets?: number;
          defaultReps?: string;
          defaultRestSeconds?: number;
          defaultRpe?: number;
          videoObjectKey?: string;
          executionCues?: string[];
        };

        expect(body.videoObjectKey).toBeUndefined();
        expect(body.executionCues).toBeUndefined();

        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "exercise_storage_fallback_split_squat",
                name: body.name,
                category: body.category,
                scope: "private",
                equipment: null,
                difficulty: "intermediate",
                videoObjectKey: null,
                primaryMuscles: [body.category],
                defaultSets: body.defaultSets,
                defaultReps: body.defaultReps,
                defaultRestSeconds: body.defaultRestSeconds,
                defaultRpe: body.defaultRpe,
                executionCues: body.executionCues
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
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    await screen.findByRole("button", { name: "Add custom exercise" });

    const videoFile = new File(["demo"], "fallback-video.mp4", { type: "video/mp4" });
    await addCustomExercise("Storage Fallback Split Squat", { file: videoFile });

    const exerciseRow = screen.getByRole("group", { name: "Storage Fallback Split Squat exercise row" });
    expect(within(exerciseRow).getByDisplayValue("Storage Fallback Split Squat")).toBeInTheDocument();
    expect(within(exerciseRow).queryByText("fallback-video.mp4")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Add custom exercise" })).not.toBeInTheDocument();
  });

  it("keeps the dialog open and shows an error when a custom exercise cannot be persisted", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/exercises" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.click(screen.getByRole("button", { name: "Add workout exercise" }));
    await screen.findByRole("button", { name: "Add custom exercise" });

    fireEvent.click(screen.getByRole("button", { name: "Add custom exercise" }));
    const dialog = screen.getByRole("dialog", { name: "Add custom exercise" });
    fireEvent.change(within(dialog).getByLabelText("Exercise name"), { target: { value: "Split Squat" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add exercise" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Custom exercise could not be saved to the exercise database.");
    await waitFor(() => expect(screen.queryByRole("group", { name: "Split Squat exercise row" })).not.toBeInTheDocument());
  });
});
