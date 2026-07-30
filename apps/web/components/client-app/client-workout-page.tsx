"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, NotebookPen, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";

interface ClientMeResponse {
  data?: {
    client: {
      id: string;
      name: string;
    };
    trainingAssignments: TrainingAssignment[];
  };
  error?: {
    message?: string;
  };
}

interface TrainingAssignment {
  id: string;
  name: string;
  status: string;
  snapshot: unknown;
}

interface ClientNoteSummary {
  id: string;
  noteDate: string;
  body: string;
  authorName: string;
}

interface TrainingDay {
  id?: string;
  name: string;
  exercises: TrainingExercise[];
}

interface TrainingExercise {
  id?: string;
  exerciseId?: string;
  exerciseName: string;
  sets?: string | number;
  reps?: string;
  rpe?: string;
  rir?: string;
  section?: string;
  previousBestKg?: number;
}

type LoadState = "loading" | "ready" | "error";

interface WorkoutSetRow {
  id: string;
  setNumber: number;
  reps: string;
  weightKg: string;
  completed: boolean;
}

interface PersonalBestSummary {
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  previousBestKg: number;
}

export function ClientWorkoutPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [exerciseImages, setExerciseImages] = useState<Record<string, string>>({});
  const [activeWorkoutExerciseIndex, setActiveWorkoutExerciseIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadClientTraining() {
      try {
        const response = await fetch("/api/v1/client/me");
        const payload = (await response.json().catch(() => null)) as ClientMeResponse | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "Your workout could not be loaded.");
        }

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        setAssignments(payload.data.trainingAssignments);
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Your workout could not be loaded.");
        setLoadState("error");
      }
    }

    void loadClientTraining();

    return () => {
      mounted = false;
    };
  }, []);

  const activeAssignment = useMemo(
    () => assignments.find((assignment) => assignment.status === "active") ?? assignments[0] ?? null,
    [assignments]
  );
  const trainingDays = useMemo(() => getTrainingDays(activeAssignment?.snapshot), [activeAssignment]);
  const activeDay = trainingDays[Math.min(activeDayIndex, Math.max(trainingDays.length - 1, 0))] ?? null;

  useEffect(() => {
    if (activeDayIndex > trainingDays.length - 1) {
      setActiveDayIndex(0);
    }
  }, [activeDayIndex, trainingDays.length]);

  useEffect(() => {
    setActiveWorkoutExerciseIndex(null);
  }, [activeDayIndex, activeAssignment?.id]);

  useEffect(() => {
    if (!activeDay) {
      return;
    }

    let mounted = true;
    const exerciseIds = activeDay.exercises
      .map((exercise) => exercise.exerciseId)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId && !exerciseImages[exerciseId]));

    async function loadImages() {
      const imageEntries = await Promise.all(
        exerciseIds.map(async (exerciseId) => {
          try {
            const response = await fetch(`/api/v1/exercises/${encodeURIComponent(exerciseId)}/media-url?type=image`);

            if (!response.ok) {
              return null;
            }

            const payload = (await response.json()) as { data?: { url?: string } };
            return payload.data?.url ? [exerciseId, payload.data.url] as const : null;
          } catch {
            return null;
          }
        })
      );

      if (!mounted) {
        return;
      }

      const nextImages = Object.fromEntries(imageEntries.filter((entry): entry is readonly [string, string] => entry !== null));

      if (Object.keys(nextImages).length > 0) {
        setExerciseImages((currentImages) => ({ ...currentImages, ...nextImages }));
      }
    }

    if (exerciseIds.length > 0) {
      void loadImages();
    }

    return () => {
      mounted = false;
    };
  }, [activeDay, exerciseImages]);

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9f8] px-6">
        <div role="status" aria-label="Loading workout" className="text-sm font-bold text-[#1b1c1c]">
          Loading workout
        </div>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9f8] px-6">
        <p role="alert" className="max-w-sm text-center text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      </main>
    );
  }

  if (activeDay && activeWorkoutExerciseIndex !== null) {
    return (
      <ActiveWorkoutLogger
        day={activeDay}
        assignmentName={activeAssignment?.name ?? "Training plan"}
        exerciseImages={exerciseImages}
        initialExerciseIndex={activeWorkoutExerciseIndex}
        onBack={() => setActiveWorkoutExerciseIndex(null)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf9f8] px-4 py-5 text-[#1b1c1c] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <ClientWorkoutTabs />
        <header className="space-y-1 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">Workout</p>
          <h1 className="text-3xl font-black tracking-normal">{activeAssignment?.name ?? "Training plan"}</h1>
          <p className="text-sm font-semibold text-[#6f6a66]">{clientName}</p>
        </header>

        {trainingDays.length > 0 ? (
          <nav aria-label="Training days" className="-mx-4 overflow-x-auto px-4">
            <div className="flex min-w-max gap-2">
              {trainingDays.map((day, index) => (
                <button
                  key={`${day.name}-${index}`}
                  type="button"
                  onClick={() => setActiveDayIndex(index)}
                  className={cn(
                    "h-11 rounded-full px-5 text-sm font-black transition",
                    index === activeDayIndex
                      ? "bg-[#3620b8] text-white shadow-[0_10px_30px_rgba(54,32,184,0.18)]"
                      : "bg-white text-[#6f6a66]"
                  )}
                >
                  {day.name || `Day ${index + 1}`}
                </button>
              ))}
            </div>
          </nav>
        ) : null}

        {activeDay ? (
          <section aria-label={`${activeDay.name} exercises`} className="space-y-3">
            {activeDay.exercises.length > 0 ? (
              activeDay.exercises.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.id ?? `${exercise.exerciseName}-${index}`}
                  exercise={exercise}
                  imageUrl={exercise.exerciseId ? exerciseImages[exercise.exerciseId] : undefined}
                  onClick={() => setActiveWorkoutExerciseIndex(index)}
                />
              ))
            ) : (
              <EmptyWorkoutMessage message="No exercises have been added to this training day yet." />
            )}
          </section>
        ) : (
          <EmptyWorkoutMessage message="No training days have been assigned yet." />
        )}
      </div>
    </main>
  );
}

function ClientWorkoutTabs() {
  return (
    <nav aria-label="Client app tabs" className="grid grid-cols-2 gap-2 rounded-full bg-white p-1 shadow-[0_10px_30px_rgba(27,28,28,0.06)]">
      <Link href="/workout" aria-current="page" className="rounded-full bg-[#3620b8] px-4 py-3 text-center text-sm font-black text-white">
        Workout
      </Link>
      <Link href="/nutrition" className="rounded-full px-4 py-3 text-center text-sm font-black text-[#6f6a66]">
        Nutrition
      </Link>
    </nav>
  );
}

function ExerciseCard({ exercise, imageUrl, onClick }: { exercise: TrainingExercise; imageUrl?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[6.5rem] w-full items-center gap-4 rounded-[1.65rem] bg-white p-4 text-left shadow-[0_18px_45px_rgba(27,28,28,0.06)] transition active:scale-[0.99]"
    >
      <ExerciseThumbnail exerciseName={exercise.exerciseName} imageUrl={imageUrl} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black text-[#1b1c1c]">{exercise.exerciseName}</span>
        <span className="mt-1 block truncate text-sm font-bold text-[#6f6a66]">{formatExercisePrescription(exercise)}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 flex-none text-[#c8c3bf]" />
    </button>
  );
}

function ActiveWorkoutLogger({
  day,
  assignmentName,
  exerciseImages,
  initialExerciseIndex,
  onBack
}: {
  day: TrainingDay;
  assignmentName: string;
  exerciseImages: Record<string, string>;
  initialExerciseIndex: number;
  onBack: () => void;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(initialExerciseIndex);
  const activeExercise = day.exercises[exerciseIndex] ?? day.exercises[0];
  const nextExercise = day.exercises[exerciseIndex + 1] ?? null;
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [setRows, setSetRows] = useState<WorkoutSetRow[]>(() => createSetRows(activeExercise));
  const [setRowsByExerciseIndex, setSetRowsByExerciseIndex] = useState<Record<number, WorkoutSetRow[]>>({});
  const [touchStartXBySetId, setTouchStartXBySetId] = useState<Record<string, number>>({});
  const [finishSummaryOpen, setFinishSummaryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState<ClientNoteSummary[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    setDurationSeconds(0);
  }, [day.id, day.name, initialExerciseIndex]);

  useEffect(() => {
    const durationInterval = window.setInterval(() => {
      setDurationSeconds((currentDuration) => currentDuration + 1);
    }, 1_000);

    return () => window.clearInterval(durationInterval);
  }, []);

  useEffect(() => {
    setSetRows(setRowsByExerciseIndex[exerciseIndex] ?? createSetRows(activeExercise));
    setRestSeconds(null);
  }, [activeExercise, exerciseIndex]);

  useEffect(() => {
    if (restSeconds === null || restSeconds <= 0) {
      return;
    }

    const restInterval = window.setInterval(() => {
      setRestSeconds((currentRestSeconds) => {
        if (currentRestSeconds === null || currentRestSeconds <= 1) {
          return null;
        }

        return currentRestSeconds - 1;
      });
    }, 1_000);

    return () => window.clearInterval(restInterval);
  }, [restSeconds]);

  if (!activeExercise) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9f8] px-6">
        <EmptyWorkoutMessage message="No exercises have been added to this training day yet." />
      </main>
    );
  }

  function completeSet(setId: string) {
    updateCurrentSetRows((currentRows) =>
      currentRows.map((row) => (row.id === setId ? { ...row, completed: true } : row))
    );
    setRestSeconds(60);
  }

  function addSet() {
    updateCurrentSetRows((currentRows) => [
      ...currentRows,
      {
        id: `${activeExercise.id ?? activeExercise.exerciseName}-set-${currentRows.length + 1}-${Date.now()}`,
        setNumber: currentRows.length + 1,
        reps: activeExercise.reps ?? "",
        weightKg: "",
        completed: false
      }
    ]);
  }

  function deleteSet(setId: string) {
    updateCurrentSetRows((currentRows) =>
      currentRows
        .filter((row) => row.id !== setId)
        .map((row, index) => ({ ...row, setNumber: index + 1 }))
    );
  }

  function updateSetWeight(setId: string, weightKg: string) {
    updateCurrentSetRows((currentRows) =>
      currentRows.map((row) => (row.id === setId ? { ...row, weightKg } : row))
    );
  }

  function updateCurrentSetRows(updater: (currentRows: WorkoutSetRow[]) => WorkoutSetRow[]) {
    setSetRows((currentRows) => {
      const nextRows = updater(currentRows);
      setSetRowsByExerciseIndex((currentRowsByExercise) => ({
        ...currentRowsByExercise,
        [exerciseIndex]: nextRows
      }));

      return nextRows;
    });
  }

  function showNextExercise() {
    if (nextExercise) {
      setExerciseIndex((currentIndex) => currentIndex + 1);
    }
  }

  async function loadWorkoutNotes() {
    setNotesLoading(true);
    setNotesError("");

    try {
      const params = new URLSearchParams({
        assignmentName,
        dayName: day.name,
        limit: "50"
      });
      const response = await fetch(`/api/v1/client/workout-notes?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as { data?: ClientNoteSummary[]; error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Workout notes could not be loaded.");
      }

      setWorkoutNotes(payload?.data ?? []);
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Workout notes could not be loaded.");
    } finally {
      setNotesLoading(false);
    }
  }

  function openWorkoutNotes() {
    setNotesOpen(true);
    void loadWorkoutNotes();
  }

  function openFinishSummary() {
    setSetRowsByExerciseIndex((currentRowsByExercise) => ({
      ...currentRowsByExercise,
      [exerciseIndex]: setRows
    }));
    setFinishSummaryOpen(true);
  }

  const personalBests = getPersonalBests(day.exercises, {
    ...setRowsByExerciseIndex,
    [exerciseIndex]: setRows
  });

  async function saveWorkoutNote() {
    if (!noteBody.trim()) {
      return;
    }

    setNotesSaving(true);
    setNotesError("");

    try {
      const response = await fetch("/api/v1/client/workout-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentName,
          dayName: day.name,
          exerciseName: activeExercise.exerciseName,
          body: noteBody
        })
      });
      const payload = (await response.json().catch(() => null)) as { data?: ClientNoteSummary; error?: { message?: string } } | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "Workout note could not be saved.");
      }

      setWorkoutNotes((currentNotes) => [payload.data as ClientNoteSummary, ...currentNotes]);
      setNoteBody("");
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Workout note could not be saved.");
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf9f8] px-4 py-5 text-[#1b1c1c] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#1b1c1c] shadow-[0_10px_30px_rgba(27,28,28,0.06)]"
            aria-label="Back to workout"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="text-right">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">Workout duration</p>
            <p className="text-xl font-black" aria-label="Workout duration">
              {formatTimer(durationSeconds)}
            </p>
          </div>
        </header>

        <section className="rounded-[1.65rem] bg-white p-4 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
          <div className="flex items-center gap-4">
            <ExerciseThumbnail
              exerciseName={activeExercise.exerciseName}
              imageUrl={activeExercise.exerciseId ? exerciseImages[activeExercise.exerciseId] : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">
                Exercise {Math.min(exerciseIndex + 1, day.exercises.length)}/{day.exercises.length}
              </p>
              <h1 className="truncate text-2xl font-black tracking-normal">{activeExercise.exerciseName}</h1>
              <p className="mt-1 text-sm font-bold text-[#6f6a66]">{formatExercisePrescription(activeExercise)}</p>
            </div>
          </div>
        </section>

        {restSeconds !== null ? (
          <section role="timer" aria-label="Rest timer" className="rounded-[1.65rem] bg-[#3620b8] px-5 py-4 text-white shadow-[0_18px_45px_rgba(54,32,184,0.18)]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-white/70">Rest timer</p>
            <p className="mt-1 text-3xl font-black">{formatTimer(restSeconds)}</p>
          </section>
        ) : null}

        <section className="space-y-3" aria-label={`${activeExercise.exerciseName} sets`}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-wide text-[#6f6a66]">Sets</h2>
            <button
              type="button"
              onClick={addSet}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#3620b8] shadow-[0_10px_30px_rgba(27,28,28,0.06)]"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add set
            </button>
          </div>

          {setRows.map((setRow) => (
            <div
              key={setRow.id}
              role="row"
              aria-label={`Set ${setRow.setNumber}`}
              className="flex touch-pan-y items-center gap-3 rounded-[1.25rem] bg-white p-3 shadow-[0_12px_32px_rgba(27,28,28,0.05)]"
              onPointerDown={(event) => {
                setTouchStartXBySetId((currentStarts) => ({
                  ...currentStarts,
                  [setRow.id]: event.clientX
                }));
              }}
              onPointerUp={(event) => {
                const startX = touchStartXBySetId[setRow.id];
                if (typeof startX === "number" && startX - event.clientX > 48) {
                  deleteSet(setRow.id);
                }
              }}
            >
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-[#f5f3f3] text-sm font-black">
                {setRow.setNumber}
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-[#6f6a66]">
                {setRow.reps ? `${setRow.reps} reps` : "Reps set by coach"}
              </span>
              <label className="w-24 flex-none">
                <span className="sr-only">Set {setRow.setNumber} weight</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={setRow.weightKg}
                  onChange={(event) => updateSetWeight(setRow.id, event.target.value)}
                  aria-label={`Set ${setRow.setNumber} weight`}
                  placeholder="kg"
                  className="h-10 w-full rounded-full bg-[#f5f3f3] px-3 text-center text-sm font-black text-[#1b1c1c] outline-none focus:ring-2 focus:ring-[#3620b8]/20"
                />
              </label>
              <button
                type="button"
                onClick={() => completeSet(setRow.id)}
                className={cn(
                  "inline-flex size-10 flex-none items-center justify-center rounded-full transition",
                  setRow.completed ? "bg-emerald-500 text-white" : "bg-[#f5f3f3] text-[#6f6a66]"
                )}
                aria-label={`Complete set ${setRow.setNumber}`}
              >
                <Check aria-hidden="true" className="size-5" />
              </button>
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={showNextExercise}
          disabled={!nextExercise}
          className="flex min-h-[5.5rem] w-full items-center gap-4 rounded-[1.65rem] bg-[#1b1c1c] p-4 text-left text-white shadow-[0_18px_45px_rgba(27,28,28,0.12)] transition disabled:bg-[#ddd8d3] disabled:text-[#6f6a66]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold uppercase tracking-wide opacity-70">Up next</span>
            <span className="mt-1 block truncate text-lg font-black">
              {nextExercise ? nextExercise.exerciseName : "No more exercises"}
            </span>
            <span className="mt-1 block truncate text-sm font-bold opacity-70">
              {nextExercise ? formatExercisePrescription(nextExercise) : "Training day complete"}
            </span>
          </span>
          {nextExercise ? <ChevronRight aria-hidden="true" className="size-5 flex-none opacity-70" /> : null}
        </button>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={openWorkoutNotes}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-[#3620b8] shadow-[0_10px_30px_rgba(27,28,28,0.06)]"
          >
            <NotebookPen aria-hidden="true" className="size-4" />
            Notes
          </button>
          <button
            type="button"
            onClick={openFinishSummary}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#3620b8] text-sm font-black text-white shadow-[0_10px_30px_rgba(54,32,184,0.18)]"
          >
            Finish session
          </button>
        </section>

        {finishSummaryOpen ? (
          <WorkoutSummaryDialog
            personalBests={personalBests}
            onClose={() => setFinishSummaryOpen(false)}
            onSubmit={onBack}
          />
        ) : null}

        {notesOpen ? (
          <WorkoutNotesDialog
            notes={workoutNotes}
            noteBody={noteBody}
            errorMessage={notesError}
            loading={notesLoading}
            saving={notesSaving}
            onBodyChange={setNoteBody}
            onClose={() => setNotesOpen(false)}
            onSave={() => void saveWorkoutNote()}
          />
        ) : null}
      </div>
    </main>
  );
}

function WorkoutSummaryDialog({
  personalBests,
  onClose,
  onSubmit
}: {
  personalBests: PersonalBestSummary[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 px-4 pb-4 backdrop-blur-sm sm:items-center sm:justify-center">
      <div role="dialog" aria-modal="true" aria-labelledby="workout-summary-title" className="w-full max-w-xl rounded-[1.65rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">Session complete</p>
            <h2 id="workout-summary-title" className="text-2xl font-black text-[#1b1c1c]">
              Workout Summary
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f5f3f3] px-4 py-2 text-sm font-black text-[#1b1c1c]">
            Close
          </button>
        </div>

        <section className="mt-5 rounded-2xl bg-[#f5f3f3] p-4" aria-label="Personal bests hit this session">
          <h3 className="text-base font-black text-[#1b1c1c]">Personal Bests</h3>
          {personalBests.length > 0 ? (
            <div className="mt-3 space-y-3">
              {personalBests.map((best) => (
                <article key={`${best.exerciseName}-${best.setNumber}`} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#1b1c1c]">{best.exerciseName}</p>
                      <p className="mt-1 text-xs font-bold text-[#6f6a66]">Set {best.setNumber} • Previous {formatWeight(best.previousBestKg)}</p>
                    </div>
                    <p className="text-2xl font-black text-[#3620b8]">{formatWeight(best.weightKg)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-[#6f6a66]">No personal bests detected this session.</p>
          )}
        </section>

        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 h-12 w-full rounded-full bg-[#3620b8] text-sm font-black text-white shadow-[0_10px_30px_rgba(54,32,184,0.18)]"
        >
          Submit workout
        </button>
      </div>
    </div>
  );
}

function WorkoutNotesDialog({
  notes,
  noteBody,
  errorMessage,
  loading,
  saving,
  onBodyChange,
  onClose,
  onSave
}: {
  notes: ClientNoteSummary[];
  noteBody: string;
  errorMessage: string;
  loading: boolean;
  saving: boolean;
  onBodyChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 px-4 pb-4 backdrop-blur-sm sm:items-center sm:justify-center">
      <div role="dialog" aria-modal="true" aria-labelledby="workout-notes-title" className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[1.65rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">Workout notes</p>
            <h2 id="workout-notes-title" className="text-2xl font-black text-[#1b1c1c]">
              Logged notes
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f5f3f3] px-4 py-2 text-sm font-black text-[#1b1c1c]">
            Close
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-black text-[#1b1c1c]">Add note</span>
          <textarea
            value={noteBody}
            onChange={(event) => onBodyChange(event.target.value)}
            className="mt-2 min-h-28 w-full resize-none rounded-2xl bg-[#f5f3f3] px-4 py-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:ring-2 focus:ring-[#3620b8]/20"
            placeholder="Log anything useful from this workout..."
          />
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || !noteBody.trim()}
          className="mt-3 h-11 w-full rounded-full bg-[#3620b8] text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? "Saving note..." : "Save workout note"}
        </button>

        {errorMessage ? (
          <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          {loading ? <p className="text-sm font-bold text-[#6f6a66]">Loading notes...</p> : null}
          {!loading && notes.length === 0 ? (
            <p className="rounded-2xl bg-[#f5f3f3] px-4 py-5 text-center text-sm font-bold text-[#6f6a66]">
              No workout notes logged yet.
            </p>
          ) : null}
          {notes.map((note) => (
            <article key={note.id} className="rounded-2xl bg-[#f5f3f3] px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-[#6f6a66]">{formatDisplayDate(note.noteDate)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#1b1c1c]">{note.body}</p>
              <p className="mt-2 text-xs font-bold text-[#6f6a66]">Logged by {note.authorName}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExerciseThumbnail({ exerciseName, imageUrl }: { exerciseName: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <span className="block size-16 flex-none overflow-hidden rounded-xl bg-[#1b1c1c]">
        <img src={imageUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span className="flex size-16 flex-none items-center justify-center rounded-xl bg-[#1b1c1c] text-lg font-black text-white">
      {getExerciseInitials(exerciseName)}
    </span>
  );
}

function EmptyWorkoutMessage({ message }: { message: string }) {
  return (
    <div className="rounded-[1.65rem] bg-white px-5 py-8 text-center text-sm font-bold text-[#6f6a66] shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      {message}
    </div>
  );
}

function getTrainingDays(snapshot: unknown): TrainingDay[] {
  if (!snapshot || typeof snapshot !== "object" || !("days" in snapshot)) {
    return [];
  }

  const days = (snapshot as { days?: unknown }).days;

  if (!Array.isArray(days)) {
    return [];
  }

  return days.flatMap((day, index) => {
    if (!day || typeof day !== "object") {
      return [];
    }

    const record = day as { id?: unknown; name?: unknown; exercises?: unknown };
    const exercises = Array.isArray(record.exercises) ? record.exercises.flatMap(normalizeExercise) : [];

    return {
      id: typeof record.id === "string" ? record.id : undefined,
      name: typeof record.name === "string" && record.name.trim() ? record.name : `Day ${index + 1}`,
      exercises
    };
  });
}

function normalizeExercise(exercise: unknown): TrainingExercise[] {
  if (!exercise || typeof exercise !== "object") {
    return [];
  }

  const record = exercise as Record<string, unknown>;
  const exerciseName = getString(record.exerciseName) ?? getString(record.name);

  if (!exerciseName) {
    return [];
  }

  return [{
    id: getString(record.id),
    exerciseId: getString(record.exerciseId),
    exerciseName,
    sets: getStringOrNumber(record.sets),
    reps: getStringOrNumber(record.reps),
    rpe: getStringOrNumber(record.rpe),
    rir: getStringOrNumber(record.rir),
    section: getString(record.section),
    previousBestKg:
      getNumber(record.previousBestKg) ??
      getNumber(record.personalBestKg) ??
      getNumber(record.bestWeightKg) ??
      getNumber(record.maxWeightKg)
  }];
}

function formatExercisePrescription(exercise: TrainingExercise) {
  const sets = exercise.sets ? String(exercise.sets) : null;
  const reps = exercise.reps ? String(exercise.reps) : null;
  const effort = exercise.rpe ? `RPE ${exercise.rpe}` : exercise.rir ? `RIR ${exercise.rir}` : null;
  const prescription = sets && reps ? `${sets} × ${reps}` : sets ? `${sets} sets` : reps;

  return [prescription, effort].filter(Boolean).join(" • ") || "Details set by your coach";
}

function createSetRows(exercise: TrainingExercise | undefined): WorkoutSetRow[] {
  if (!exercise) {
    return [];
  }

  const setCount = Number.parseInt(String(exercise.sets ?? "1"), 10);
  const totalSets = Number.isFinite(setCount) && setCount > 0 ? setCount : 1;

  return Array.from({ length: totalSets }, (_, index) => ({
    id: `${exercise.id ?? exercise.exerciseName}-set-${index + 1}`,
    setNumber: index + 1,
    reps: exercise.reps ?? "",
    weightKg: "",
    completed: false
  }));
}

function getPersonalBests(exercises: TrainingExercise[], rowsByExerciseIndex: Record<number, WorkoutSetRow[]>): PersonalBestSummary[] {
  return exercises.flatMap((exercise, exerciseIndex) => {
    const previousBestKg = exercise.previousBestKg;

    if (typeof previousBestKg !== "number") {
      return [];
    }

    const rows = rowsByExerciseIndex[exerciseIndex] ?? [];
    const bestCompletedSet = rows.reduce<WorkoutSetRow | null>((bestRow, row) => {
      if (!row.completed) {
        return bestRow;
      }

      const weightKg = parseWeight(row.weightKg);

      if (weightKg === null || weightKg <= previousBestKg) {
        return bestRow;
      }

      if (!bestRow) {
        return row;
      }

      const bestWeightKg = parseWeight(bestRow.weightKg);

      return bestWeightKg === null || weightKg > bestWeightKg ? row : bestRow;
    }, null);

    if (!bestCompletedSet) {
      return [];
    }

    const weightKg = parseWeight(bestCompletedSet.weightKg);

    if (weightKg === null) {
      return [];
    }

    return [{
      exerciseName: exercise.exerciseName,
      setNumber: bestCompletedSet.setNumber,
      weightKg,
      previousBestKg
    }];
  });
}

function parseWeight(value: string) {
  const weight = Number.parseFloat(value);

  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function formatWeight(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}kg`;
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringOrNumber(value: unknown) {
  const stringValue = getString(value);

  if (stringValue) {
    return stringValue;
  }

  const numberValue = getNumber(value);

  return numberValue === undefined ? undefined : String(numberValue);
}

function getExerciseInitials(exerciseName: string) {
  return exerciseName
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
