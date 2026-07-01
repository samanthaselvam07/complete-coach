import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCustomExerciseNotes,
  createBlankTrainingDay,
  createBlankTrainingProgramDraft,
  createTrainingProgramDraftForDayTemplate,
  createTrainingProgramDraftFromTemplate,
  duplicateTrainingDay,
  getBuilderExerciseMeta,
  getCustomExerciseApiPayload,
  getEmbeddableExerciseVideoUrl,
  getProgramSectionLabel,
  getTrainingProgramTemplatePayload,
  parseOptionalNumber,
  parsePositiveInteger
} from "@/components/training/training-program-builder";
import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("training program builder view model helpers", () => {
  it("builds drafts, template payloads, video embeds, notes, and exercise metadata", () => {
    const blankDraft = createBlankTrainingProgramDraft();
    const blankDay = createBlankTrainingDay(3);
    const duplicatedDay = duplicateTrainingDay(
      {
        id: "day-source",
        name: "Lower Body",
        exercises: [
          {
            id: "exercise-source",
            section: "workout",
            exerciseName: "Back Squat",
            sets: "4",
            reps: "6-8",
            rpe: "8",
            rir: "2",
            restSeconds: "180"
          }
        ]
      },
      2,
      "Lower Body Copy"
    );
    const singleDayDraft = createTrainingProgramDraftForDayTemplate(
      { ...blankDraft, title: "Hypertrophy", days: [duplicatedDay], activeDayId: duplicatedDay.id },
      duplicatedDay
    );

    expect(blankDraft).toMatchObject({ sourceTemplateId: null, title: "", durationWeeks: "8", activeDayId: "day-1" });
    expect(blankDay).toEqual({ id: "day-3", name: "Day 3", exercises: [] });
    expect(duplicatedDay).toMatchObject({ name: "Lower Body Copy", exercises: [expect.objectContaining({ exerciseName: "Back Squat" })] });
    expect(duplicatedDay.id).not.toBe("day-source");
    expect(duplicatedDay.exercises[0]?.id).not.toBe("exercise-source");
    expect(singleDayDraft).toMatchObject({
      sourceTemplateId: null,
      title: "Hypertrophy - Lower Body Copy",
      durationWeeks: "1",
      days: [duplicatedDay]
    });
    expect(parsePositiveInteger("5", 3)).toBe(5);
    expect(parsePositiveInteger("0", 3)).toBe(3);
    expect(parsePositiveInteger("bad", 3)).toBe(3);
    expect(parseOptionalNumber("8.5")).toBe(8.5);
    expect(parseOptionalNumber("bad")).toBeNull();

    const template = {
      id: "template-1",
      name: "Hypertrophy",
      description: null,
      goal: null,
      template: {
        instructions: undefined,
        days: [
          {
            name: "",
            exercises: [
              {
                exerciseId: "back-squat",
                exerciseName: "Back Squat",
                sets: 4,
                reps: "6-8",
                restSeconds: undefined,
                section: undefined,
                videoObjectKey: "global/training/exercises/video/back-squat.mp4"
              }
            ]
          }
        ]
      }
    };
    const copiedDraft = createTrainingProgramDraftFromTemplate(template);
    const editableDraft = createTrainingProgramDraftFromTemplate({ ...template, template: { days: [] } }, { copy: false });
    const payload = getTrainingProgramTemplatePayload(
      {
        ...blankDraft,
        title: " ",
        tags: " ",
        durationWeeks: "bad",
        overview: " ",
        instructions: "  keep bracing  ",
        days: [
          {
            id: "day-1",
            name: " ",
            exercises: [
              {
                id: "exercise-1",
                section: "workout",
                exerciseName: " ",
                sets: "0",
                reps: " ",
                rpe: " 8 ",
                rir: " 2 ",
                restSeconds: "",
                customVideoUrl: "https://youtu.be/abc123",
                customVideoFileName: "demo.mp4",
                exerciseVideoObjectKey: "global/training/exercises/video/manual-exercise.mp4"
              }
            ]
          }
        ]
      },
      7
    );

    expect(copiedDraft).toMatchObject({
      sourceTemplateId: null,
      title: "Hypertrophy Copy",
      tags: "",
      durationWeeks: "1",
      overview: "",
      instructions: "",
      days: [expect.objectContaining({ name: "Day 1" })]
    });
    expect(copiedDraft.days[0]?.exercises[0]).toMatchObject({
      exerciseId: "back-squat",
      section: "workout",
      restSeconds: "",
      exerciseVideoObjectKey: "global/training/exercises/video/back-squat.mp4"
    });
    expect(editableDraft).toMatchObject({ sourceTemplateId: "template-1", title: "Hypertrophy", durationWeeks: "1" });
    expect(payload).toMatchObject({
      name: "Strength Template 7",
      description: "Coach-created template from the program library.",
      goal: "custom",
      durationWeeks: 1,
      status: "draft",
      template: {
        instructions: "keep bracing",
        days: [
          {
            name: "Day 1",
            exercises: [
              expect.objectContaining({
                exerciseId: "manual-entry",
                exerciseName: "Manual Exercise",
                sets: 3,
                reps: "8-10",
                restSeconds: 120,
                videoObjectKey: "global/training/exercises/video/manual-exercise.mp4",
                notes: "Video link: https://youtu.be/abc123\nUploaded video: demo.mp4"
              })
            ]
          }
        ]
      }
    });

    expect(getEmbeddableExerciseVideoUrl()).toBeNull();
    expect(getEmbeddableExerciseVideoUrl("not a url")).toBeNull();
    expect(getEmbeddableExerciseVideoUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
    expect(getEmbeddableExerciseVideoUrl("https://m.youtube.com/watch")).toBeNull();
    expect(getEmbeddableExerciseVideoUrl("https://youtu.be/shortid")).toBe("https://www.youtube.com/embed/shortid");
    expect(getEmbeddableExerciseVideoUrl("https://vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345");
    expect(getEmbeddableExerciseVideoUrl("https://example.com/video")).toBeNull();
    expect(
      buildCustomExerciseNotes({
        id: "exercise-1",
        section: "workout",
        exerciseName: "Manual Exercise",
        sets: "3",
        reps: "8-10",
        rpe: "",
        rir: "",
        restSeconds: "120",
        customVideoUrl: "",
        customVideoFileName: ""
      })
    ).toBe("");
    expect(getProgramSectionLabel("warmUp")).toBe("Warm up");
    expect(getProgramSectionLabel("workout")).toBe("Workout");
    expect(getProgramSectionLabel("coolDown")).toBe("Cool Down");
    expect(getBuilderExerciseMeta({ id: "legacy", name: "Legacy", category: "Legs", variations: 4 } as never)).toBe("Legs - 4 variations");
    expect(
      getBuilderExerciseMeta({
        id: "api",
        name: "Api Exercise",
        category: "Back",
        scope: "global",
        equipment: "Cable",
        difficulty: "intermediate",
        videoObjectKey: null,
        primaryMuscles: ["Lats", "Biceps"]
      })
    ).toBe("Back - Cable - Lats, Biceps");
    expect(
      getBuilderExerciseMeta({
        id: "api-empty",
        name: "Api Exercise",
        category: "Mobility",
        scope: "global",
        equipment: null,
        difficulty: "beginner",
        videoObjectKey: null,
        primaryMuscles: []
      })
    ).toBe("Mobility - No muscles tagged");
  });

  it("builds organization exercise payloads with defaults and optional media fields", () => {
    expect(
      getCustomExerciseApiPayload({
        exerciseName: "Tempo Goblet Squat",
        bodyPart: "Quads",
        sets: "",
        reps: " ",
        restSeconds: "0",
        rpe: "",
        rir: " ",
        videoUrl: "",
        videoObjectKey: "",
        videoFileName: ""
      })
    ).toEqual({
      name: "Tempo Goblet Squat",
      category: "Quads",
      primaryMuscles: ["Quads"],
      difficulty: "intermediate",
      defaultSets: 3,
      defaultReps: "8-10",
      defaultRestSeconds: 120
    });

    expect(
      getCustomExerciseApiPayload({
        exerciseName: "Cable Pulldown",
        bodyPart: "Back",
        sets: "4",
        reps: "10-12",
        restSeconds: "75",
        rpe: "8.5",
        rir: "2",
        videoUrl: "https://example.com/pulldown",
        videoObjectKey: "organizations/org_1/training/exercises/video/pulldown.mp4",
        videoFileName: "pulldown.mp4"
      })
    ).toEqual({
      name: "Cable Pulldown",
      category: "Back",
      primaryMuscles: ["Back"],
      difficulty: "intermediate",
      defaultSets: 4,
      defaultReps: "10-12",
      defaultRestSeconds: 75,
      defaultRpe: 8.5,
      defaultRir: "2",
      videoUrl: "https://example.com/pulldown",
      videoObjectKey: "organizations/org_1/training/exercises/video/pulldown.mp4",
      executionCues: ["Uploaded video file: pulldown.mp4"]
    });
  });
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
  it("supports day-level duplicate, delete, and save day as template actions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/training-program-templates?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/training-program-assignments?limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template-lower-body",
                name: "Lower Body",
                description: "Coach-created template from the program library.",
                goal: "custom",
                durationWeeks: 1,
                status: "published",
                template: JSON.parse(String(init.body)).template,
                updatedAt: "2026-07-01T00:00:00.000Z"
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

    expect(screen.getByRole("button", { name: "Delete day" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Add training day" }));
    fireEvent.change(screen.getByLabelText(/Day Name/i), { target: { value: "Lower Body" } });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate day" }));

    expect(screen.getByDisplayValue("Lower Body Copy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));

    expect(screen.getByDisplayValue("Lower Body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete day" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save day as template" }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([input, init]) => input === "/api/v1/training-program-templates" && init?.method === "POST"
      );

      expect(createCall).toBeTruthy();
      const body = JSON.parse(String(createCall?.[1]?.body)) as { name: string; durationWeeks: number; template: { days: Array<{ name: string }> } };
      expect(body.name).toBe("Lower Body");
      expect(body.durationWeeks).toBe(1);
      expect(body.template.days).toEqual([{ name: "Lower Body", exercises: [] }]);
    });

    expect(await screen.findByText("Lower Body saved as a template.")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Program builder canvas" })).toBeInTheDocument();
  });

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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/exercises?limit=100&search=squat"));
    expect(screen.getByText("High-Bar Back Squat")).toBeInTheDocument();
    expect(screen.queryByText("Incline DB Press")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Drag High-Bar Back Squat into Workout" })).toHaveAttribute("draggable", "true");
    fireEvent.click(screen.getByRole("button", { name: "Add High-Bar Back Squat to Workout" }));

    expect(screen.getByDisplayValue("High-Bar Back Squat")).toBeInTheDocument();
  });

  it("adds imported exercise videos to program rows and opens signed playback", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).startsWith("/api/v1/exercises?")) {
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
                  videoObjectKey: "global/training/exercises/video/high-bar-back-squat.mp4",
                  videoUrl: null,
                  primaryMuscles: ["Quads", "Glutes"],
                  defaultSets: 4,
                  defaultReps: "6-8",
                  defaultRestSeconds: 180
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/exercises/api-high-bar-squat/media-url") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                mediaType: "video",
                source: "uploaded",
                url: "https://r2.example/high-bar-back-squat.mp4?X-Amz-Signature=test",
                expiresAt: "2026-07-01T00:10:00.000Z"
              }
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
    await screen.findByText("High-Bar Back Squat");

    fireEvent.click(screen.getByRole("button", { name: "Add High-Bar Back Squat to Workout" }));

    const exerciseRow = screen.getByRole("group", { name: "High-Bar Back Squat exercise row" });
    expect(within(exerciseRow).getByLabelText("Sets")).toHaveValue("4");
    expect(within(exerciseRow).getByLabelText("Reps")).toHaveValue("6-8");
    expect(within(exerciseRow).getByLabelText("Rest time")).toHaveValue("180");
    expect(within(exerciseRow).getByRole("button", { name: "View High-Bar Back Squat exercise video" })).toBeInTheDocument();

    fireEvent.click(within(exerciseRow).getByRole("button", { name: "View High-Bar Back Squat exercise video" }));

    const videoDialog = await screen.findByRole("dialog", { name: "High-Bar Back Squat exercise video" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/exercises/api-high-bar-squat/media-url"));
    expect(within(videoDialog).getByTitle("High-Bar Back Squat video")).toHaveAttribute(
      "src",
      "https://r2.example/high-bar-back-squat.mp4?X-Amz-Signature=test"
    );
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

  it("still adds a custom exercise to the builder when the exercise database write fails", async () => {
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

    const exerciseRow = await screen.findByRole("group", { name: "Split Squat exercise row" });
    expect(within(exerciseRow).getByDisplayValue("Split Squat")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Add custom exercise" })).not.toBeInTheDocument();
  });
});
