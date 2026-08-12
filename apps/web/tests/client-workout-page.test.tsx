import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearClientMeCache } from "@/components/client-app/client-me-cache";
import { ClientWorkoutPage } from "@/components/client-app/client-workout-page";

describe("ClientWorkoutPage", () => {
  afterEach(() => {
    clearClientMeCache();
    vi.unstubAllGlobals();
  });

  it("renders coach-assigned training days as tabs and switches to the selected day", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/v1/client/me") {
        return new Response(
          JSON.stringify({
            data: {
              client: { id: "client_1", name: "Client One" },
              trainingAssignments: [
                {
                  id: "assignment_1",
                  name: "Strength Block",
                  status: "active",
                  snapshot: {
                    template: {
                      days: [
                        {
                          name: "Lower A",
                          exercises: [
                            {
                              id: "exercise_row_1",
                              exerciseId: "exercise_leg_extension",
                              exerciseName: "Seated Leg Extension",
                              sets: 3,
                              reps: "15-20",
                              rpe: 9
                            }
                          ]
                        },
                        {
                          name: "Upper A",
                          exercises: [
                            {
                              id: "exercise_row_2",
                              exerciseId: "exercise_press",
                              exerciseName: "Incline DB Press",
                              sets: 4,
                              reps: "8-10",
                              rir: 2
                            }
                          ]
                        }
                      ]
                    }
                  }
                },
                {
                  id: "assignment_2",
                  name: "Conditioning Block",
                  status: "paused",
                  snapshot: {
                    template: {
                      days: [
                        {
                          name: "Engine Day",
                          exercises: [
                            {
                              id: "exercise_row_3",
                              exerciseId: "exercise_sled",
                              exerciseName: "Sled Push",
                              sets: 5,
                              reps: "20m",
                              rpe: 8
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === "/api/v1/exercises/exercise_leg_extension/media-url?type=image") {
        return new Response(JSON.stringify({ data: { url: "https://example.com/leg-extension.jpg" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url === "/api/v1/exercises/exercise_leg_extension/media-url?type=video") {
        return new Response(JSON.stringify({ data: { url: "https://example.com/leg-extension.mp4" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: { message: "Not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ClientWorkoutPage />);

    expect(await screen.findByRole("heading", { name: "Strength Block" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Training program" })).toHaveValue("assignment_1");
    expect(screen.getByRole("option", { name: "Strength Block (active)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Conditioning Block" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lower A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upper A" })).toBeInTheDocument();
    expect(screen.getByText("Seated Leg Extension")).toBeInTheDocument();
    expect(screen.getByText("3 × 15-20 • RPE 9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start workout" })).toBeInTheDocument();
    expect(screen.queryByText("Incline DB Press")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/exercises/exercise_leg_extension/media-url?type=image");
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/exercises/exercise_leg_extension/media-url?type=video");
    });
    expect(screen.getByLabelText("Seated Leg Extension exercise video")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Seated Leg Extension"));
    expect(screen.queryByRole("button", { name: "Finish session" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Upper A" }));

    expect(screen.getByText("Incline DB Press")).toBeInTheDocument();
    expect(screen.getByText("4 × 8-10 • RIR 2")).toBeInTheDocument();
    expect(screen.queryByText("Seated Leg Extension")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Training program" }), { target: { value: "assignment_2" } });

    expect(screen.getByRole("heading", { name: "Conditioning Block" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Engine Day" })).toBeInTheDocument();
    expect(screen.getByText("Sled Push")).toBeInTheDocument();
    expect(screen.getByText("5 × 20m • RPE 8")).toBeInTheDocument();
    expect(screen.queryByText("Incline DB Press")).not.toBeInTheDocument();
  });

  it("logs a workout from zero, shows rest only after ticking a set, deletes swiped sets, and advances up next", async () => {
    const fetchMock = stubWorkoutFetch([
      {
        name: "Lower A",
        exercises: [
          {
            id: "exercise_row_1",
            exerciseId: "exercise_leg_extension",
            exerciseName: "Seated Leg Extension",
            sets: 2,
            reps: "15-20",
            rpe: 9,
            restSeconds: 120
          },
          {
            id: "exercise_row_2",
            exerciseId: "exercise_curl",
            exerciseName: "Seated Hamstring Curl",
            sets: 3,
            reps: "10-12",
            rir: 2
          },
          {
            id: "exercise_row_3",
            exerciseId: "exercise_press",
            exerciseName: "Leg Press",
            sets: 4,
            reps: "8-10",
            rpe: 8
          }
        ]
      }
    ]);

    render(<ClientWorkoutPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Start workout" }));

    expect(screen.getByLabelText("Workout duration")).toHaveTextContent("00:00");
    expect(screen.queryByRole("timer", { name: "Rest timer" })).not.toBeInTheDocument();
    expect(screen.getByText("Exercise 1/3")).toBeInTheDocument();
    expect(screen.getByText("Seated Hamstring Curl")).toBeInTheDocument();
    expect(screen.getByLabelText("Set 1 reps")).toHaveValue("");
    expect(screen.getByLabelText("Set 1 RPE")).toHaveValue(null);
    expect(screen.getByLabelText("Set 1 RPE")).toHaveAttribute("placeholder", "RPE target 9");

    fireEvent.click(screen.getByRole("button", { name: "Complete set 1" }));

    expect(screen.getByRole("timer", { name: "Rest timer" })).toHaveTextContent("02:00");
    expect(screen.getByRole("timer", { name: "Rest timer" })).toHaveTextContent("Coach set 2m");

    fireEvent.click(screen.getByRole("button", { name: "Add set" }));
    expect(screen.getByRole("row", { name: "Set 3" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("row", { name: "Set 3" }), { clientX: 240 });
    fireEvent.pointerUp(screen.getByRole("row", { name: "Set 3" }), { clientX: 120 });

    expect(screen.queryByRole("row", { name: "Set 3" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Up next/i }));

    expect(screen.getByText("Exercise 2/3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seated Hamstring Curl" })).toBeInTheDocument();
    expect(screen.getByText("Leg Press")).toBeInTheDocument();
    expect(screen.queryByLabelText("Set 1 RPE")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Up next/i }));

    expect(screen.getByText("Exercise 3/3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Leg Press" })).toBeInTheDocument();
    expect(screen.getByText("No more exercises")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/client/me");
  });

  it("opens logged workout notes next to finish session and saves a new note", async () => {
    const fetchMock = stubWorkoutFetch([
      {
        name: "Lower A",
        exercises: [
          {
            id: "exercise_row_1",
            exerciseId: "exercise_leg_extension",
            exerciseName: "Seated Leg Extension",
            sets: 2,
            reps: "15-20",
            rpe: 9
          }
        ]
      }
    ]);

    render(<ClientWorkoutPage />);

    expect(await screen.findByText("Seated Leg Extension")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start workout" }));

    expect(screen.getByRole("button", { name: "Finish session" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));

    expect(await screen.findByRole("dialog", { name: "Logged notes" })).toBeInTheDocument();
    expect(screen.getByText(/Previous workout note/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Log anything useful from this workout..."), {
      target: { value: "Knee felt stable today." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save workout note" }));

    expect(await screen.findByText(/Knee felt stable today/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/client/workout-notes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          assignmentName: "Strength Block",
          dayName: "Lower A",
          exerciseName: "Seated Leg Extension",
          body: "Knee felt stable today."
        })
      })
    );
  });

  it("shows personal bests on finish and returns home after submit", async () => {
    const fetchMock = stubWorkoutFetch([
      {
        name: "Lower A",
        exercises: [
          {
            id: "exercise_row_1",
            exerciseId: "exercise_leg_extension",
            exerciseName: "Seated Leg Extension",
            sets: 1,
            reps: "15-20",
            rpe: 9,
            previousBestKg: 40
          }
        ]
      }
    ]);

    render(<ClientWorkoutPage />);

    expect(await screen.findByText("Seated Leg Extension")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start workout" }));
    expect(screen.getByLabelText("Set 1 reps")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Set 1 reps"), { target: { value: "17" } });
    fireEvent.change(screen.getByLabelText("Set 1 weight"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Set 1 RPE"), { target: { value: "9.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete set 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish session" }));

    const summaryDialog = await screen.findByRole("dialog", { name: "Workout Summary" });

    expect(summaryDialog).toBeInTheDocument();
    expect(within(summaryDialog).getByText("Personal Bests")).toBeInTheDocument();
    expect(within(summaryDialog).getByText("Seated Leg Extension")).toBeInTheDocument();
    expect(within(summaryDialog).getByText("45kg")).toBeInTheDocument();
    expect(within(summaryDialog).getByText(/Previous 40kg/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit workout" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/workout-sessions",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"exerciseName\":\"Seated Leg Extension\"")
        })
      );
    });
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url, init]) => url === "/api/v1/client/workout-sessions" && init?.method === "POST")?.[1]?.body))).toMatchObject({
      assignmentId: "assignment_1",
      assignmentName: "Strength Block",
      dayName: "Lower A",
      exercises: [
        {
          exerciseName: "Seated Leg Extension",
          sets: [
            {
              setNumber: 1,
              reps: "17",
              weightKg: 45,
              rpe: 9.5,
              completed: true
            }
          ]
        }
      ],
      personalBests: [
        {
          exerciseName: "Seated Leg Extension",
          setNumber: 1,
          weightKg: 45,
          previousBestKg: 40
        }
      ]
    });
    expect(await screen.findByRole("heading", { name: "Strength Block" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Workout Summary" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/client/logs",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"domain\":\"training\"")
        })
      );
    });
  });

  it("shows previous session weights as placeholders and detects personal bests from workout history", async () => {
    const fetchMock = stubWorkoutFetch(
      [
        {
          name: "Lower A",
          exercises: [
            {
              id: "exercise_row_1",
              exerciseId: "exercise_leg_extension",
              exerciseName: "Seated Leg Extension",
              sets: 2,
              reps: "15-20",
              rpe: 9
            }
          ]
        }
      ],
      [
        {
          id: "session_previous",
          assignmentId: "assignment_1",
          assignmentName: "Strength Block",
          dayName: "Lower A",
          exercises: [
            {
              exerciseId: "exercise_leg_extension",
              exerciseName: "Seated Leg Extension",
              sets: [
                { setNumber: 1, reps: "15", weightKg: 42, rpe: 9, completed: true },
                { setNumber: 2, reps: "13", weightKg: 45, rpe: 9.5, completed: true }
              ]
            }
          ],
          personalBests: []
        }
      ]
    );

    render(<ClientWorkoutPage />);

    expect(await screen.findByText("Seated Leg Extension")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start workout" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/client/workout-sessions?assignmentName=Strength+Block&dayName=Lower+A&limit=20");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Set 1 weight")).toHaveAttribute("placeholder", "42kg");
      expect(screen.getByLabelText("Set 2 weight")).toHaveAttribute("placeholder", "45kg");
    });

    fireEvent.change(screen.getByLabelText("Set 1 reps"), { target: { value: "16" } });
    fireEvent.change(screen.getByLabelText("Set 1 weight"), { target: { value: "46" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete set 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish session" }));

    const summaryDialog = await screen.findByRole("dialog", { name: "Workout Summary" });

    expect(within(summaryDialog).getByText("Seated Leg Extension")).toBeInTheDocument();
    expect(within(summaryDialog).getByText("46kg")).toBeInTheDocument();
    expect(within(summaryDialog).getByText(/Previous 45kg/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit workout" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client/workout-sessions",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"previousBestKg\":45")
        })
      );
    });
  });
});

function stubWorkoutFetch(
  days: Array<{ name: string; exercises: Array<Record<string, unknown>> }>,
  workoutSessions: Array<Record<string, unknown>> = []
) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/v1/client/me") {
      return new Response(
        JSON.stringify({
          data: {
            client: { id: "client_1", name: "Client One" },
            trainingAssignments: [
              {
                id: "assignment_1",
                name: "Strength Block",
                status: "active",
                snapshot: { days }
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url === "/api/v1/client/workout-notes?assignmentName=Strength+Block&dayName=Lower+A&limit=50") {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "note_1",
              clientId: "client_1",
              noteDate: "2026-07-29",
              body: "Workout note: Strength Block / Lower A\n\nPrevious workout note.",
              authorName: "Client One",
              createdAt: "2026-07-29T00:00:00.000Z"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url === "/api/v1/client/workout-notes" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { body: string; assignmentName: string; dayName: string; exerciseName: string };

      return new Response(
        JSON.stringify({
          data: {
            id: "note_2",
            clientId: "client_1",
            noteDate: "2026-07-29",
            body: `Workout note: ${body.assignmentName} / ${body.dayName} / ${body.exerciseName}\n\n${body.body}`,
            authorName: "Client One",
            createdAt: "2026-07-29T00:00:00.000Z"
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url === "/api/v1/client/workout-sessions?assignmentName=Strength+Block&dayName=Lower+A&limit=20" && !init) {
      return new Response(JSON.stringify({ data: workoutSessions }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url === "/api/v1/client/workout-sessions" && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          data: {
            session: { id: "session_1" },
            summary: { complianceScore: 80 }
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url === "/api/v1/client/logs" && init?.method === "POST") {
      return new Response(JSON.stringify({ data: { log: { id: "log_1" }, summary: { complianceScore: 100 } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: { message: "Not found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}
