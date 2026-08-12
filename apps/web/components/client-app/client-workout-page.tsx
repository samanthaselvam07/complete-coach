"use client";

import { Check, ChevronLeft, ChevronRight, Flag, NotebookPen, Play, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { saveClientActivityLog } from "./client-activity-log-actions";
import { getClientMe } from "./client-me-cache";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

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
  restSeconds?: number;
  section?: string;
  previousBestKg?: number;
}

type LoadState = "loading" | "ready" | "error";

interface WorkoutSetRow {
  id: string;
  setNumber: number;
  reps: string;
  weightKg: string;
  rpe: string;
  completed: boolean;
}

interface PersonalBestSummary {
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  previousBestKg: number;
}

interface WorkoutSessionExerciseLog {
  exerciseId?: string | null;
  exerciseName: string;
  prescribedSets?: string | null;
  prescribedReps?: string | null;
  prescribedRpe?: string | null;
  prescribedRir?: string | null;
  prescribedRestSeconds?: number | null;
  sets: Array<{
    setNumber: number;
    reps?: string;
    weightKg?: number | null;
    rpe?: number | null;
    completed: boolean;
  }>;
}

interface ExerciseMedia {
  imageUrl?: string;
  videoUrl?: string;
}

interface WorkoutSessionSummary {
  exercises?: WorkoutSessionExerciseLog[];
}

type PreviousSetWeightsByExercise = Record<string, Record<number, number>>;
type PreviousBestWeightsByExercise = Record<string, number>;

export function ClientWorkoutPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [exerciseMedia, setExerciseMedia] = useState<Record<string, ExerciseMedia>>({});
  const [activeWorkoutExerciseIndex, setActiveWorkoutExerciseIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadClientTraining({ force = false }: { force?: boolean } = {}) {
      try {
        const payload = await getClientMe<ClientMeResponse>({ force });

        if (!payload?.data) {
          throw new Error(payload?.error?.message ?? "Your workout could not be loaded.");
        }

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        const nextAssignments = payload.data.trainingAssignments;
        const defaultAssignmentId = nextAssignments.find((assignment) => assignment.status === "active")?.id ?? nextAssignments[0]?.id ?? "";

        setAssignments(nextAssignments);
        setSelectedAssignmentId((currentAssignmentId) =>
          nextAssignments.some((assignment) => assignment.id === currentAssignmentId) ? currentAssignmentId : defaultAssignmentId
        );
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

    const refreshClientTraining = () => {
      if (document.visibilityState === "visible") {
        void loadClientTraining({ force: true });
      }
    };

    window.addEventListener("focus", refreshClientTraining);
    document.addEventListener("visibilitychange", refreshClientTraining);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshClientTraining);
      document.removeEventListener("visibilitychange", refreshClientTraining);
    };
  }, []);

  const activeAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments.find((assignment) => assignment.status === "active") ?? assignments[0] ?? null,
    [assignments, selectedAssignmentId]
  );
  const trainingDays = useMemo(() => getTrainingDays(activeAssignment?.snapshot), [activeAssignment]);
  const activeDay = trainingDays[Math.min(activeDayIndex, Math.max(trainingDays.length - 1, 0))] ?? null;

  function selectTrainingProgram(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setActiveDayIndex(0);
    setActiveWorkoutExerciseIndex(null);
  }

  useEffect(() => {
    if (activeDayIndex > trainingDays.length - 1) {
      queueMicrotask(() => setActiveDayIndex(0));
    }
  }, [activeDayIndex, trainingDays.length]);

  useEffect(() => {
    queueMicrotask(() => setActiveWorkoutExerciseIndex(null));
  }, [activeDayIndex, activeAssignment?.id]);

  useEffect(() => {
    if (!activeDay) {
      return;
    }

    let mounted = true;
    const exerciseIds = activeDay.exercises
      .map((exercise) => exercise.exerciseId)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId && !exerciseMedia[exerciseId]?.imageUrl && !exerciseMedia[exerciseId]?.videoUrl));

    async function loadExerciseMedia() {
      const mediaEntries = await Promise.all(
        exerciseIds.map(async (exerciseId) => {
          const [imageUrl, videoUrl] = await Promise.all([
            loadExerciseMediaUrl(exerciseId, "image"),
            loadExerciseMediaUrl(exerciseId, "video")
          ]);

          const media: ExerciseMedia = {
            ...(imageUrl ? { imageUrl } : {}),
            ...(videoUrl ? { videoUrl } : {})
          };

          return imageUrl || videoUrl ? [exerciseId, media] as const : null;
        })
      );

      if (!mounted) {
        return;
      }

      const nextMedia = Object.fromEntries(mediaEntries.filter((entry): entry is readonly [string, ExerciseMedia] => entry !== null));

      if (Object.keys(nextMedia).length > 0) {
        setExerciseMedia((currentMedia) => ({ ...currentMedia, ...nextMedia }));
      }
    }

    if (exerciseIds.length > 0) {
      void loadExerciseMedia();
    }

    return () => {
      mounted = false;
    };
  }, [activeDay, exerciseMedia]);

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
        assignmentId={activeAssignment?.id ?? null}
        assignmentName={activeAssignment?.name ?? "Training plan"}
        exerciseMedia={exerciseMedia}
        initialExerciseIndex={activeWorkoutExerciseIndex}
        onBack={() => setActiveWorkoutExerciseIndex(null)}
      />
    );
  }

  return (
    <ClientMobileShell title="MCP" avatarLabel={clientName || "CC"}>
      <div className="flex flex-col gap-8">
        <ClientSectionHeading eyebrow="Your kinetic plan" title={activeAssignment?.name ?? "Training plan"}>
          <p className="text-sm font-semibold leading-6 text-[#777584]">{clientName}</p>
        </ClientSectionHeading>

        {assignments.length > 0 ? (
          <TrainingProgramSwitcher
            assignments={assignments}
            selectedAssignmentId={activeAssignment?.id ?? ""}
            onSelectAssignment={selectTrainingProgram}
          />
        ) : null}

        {trainingDays.length > 0 ? (
          <nav aria-label="Training days" className="-mx-6 overflow-x-auto px-6">
            <div className="flex min-w-max gap-3">
              {trainingDays.map((day, index) => (
                <button
                  key={`${day.name}-${index}`}
                  type="button"
                  aria-label={day.name || `Day ${index + 1}`}
                  onClick={() => setActiveDayIndex(index)}
                  className={cn(
                    "flex h-32 w-28 flex-none flex-col items-center justify-center gap-2 rounded-[1.25rem] px-3 text-center transition active:scale-95",
                    index === activeDayIndex
                      ? "bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-white shadow-[0_18px_38px_rgba(54,32,184,0.24)]"
                      : "bg-white text-[#1b1c1c] shadow-[0_12px_30px_rgba(27,28,28,0.05)]"
                  )}
                >
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.18em]", index === activeDayIndex ? "text-white/75" : "text-[#777584]")}>
                    Day {index + 1}
                  </span>
                  <span className="text-sm font-black leading-5">{day.name || `Day ${index + 1}`}</span>
                  {index === activeDayIndex ? <span className="size-1 rounded-full bg-white" /> : null}
                </button>
              ))}
            </div>
          </nav>
        ) : null}

        {activeDay ? (
          <section aria-label={`${activeDay.name} exercises`} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#1b1c1c]">
                Exercises <span className="font-semibold text-[#777584]">({activeDay.exercises.length})</span>
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#777584]">Today</p>
            </div>
            {activeDay.exercises.length > 0 ? (
              activeDay.exercises.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.id ?? `${exercise.exerciseName}-${index}`}
                  exercise={exercise}
                  media={exercise.exerciseId ? exerciseMedia[exercise.exerciseId] : undefined}
                />
              ))
            ) : (
              <EmptyWorkoutMessage message="No exercises have been added to this training day yet." />
            )}
          </section>
        ) : (
          <EmptyWorkoutMessage message="No training days have been assigned yet." />
        )}

        {activeDay?.exercises.length ? (
          <section className="sticky bottom-6 z-30">
            <button
              type="button"
              onClick={() => setActiveWorkoutExerciseIndex(0)}
              className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[#3620b8] text-lg font-black text-white shadow-[0_20px_50px_rgba(54,32,184,0.30)] transition active:scale-[0.98]"
            >
              <Play aria-hidden="true" className="size-5" />
              Start workout
            </button>
          </section>
        ) : null}
      </div>
    </ClientMobileShell>
  );
}

function TrainingProgramSwitcher({
  assignments,
  selectedAssignmentId,
  onSelectAssignment
}: {
  assignments: TrainingAssignment[];
  selectedAssignmentId: string;
  onSelectAssignment: (assignmentId: string) => void;
}) {
  return (
    <section aria-label="Training program switcher" className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <label htmlFor="client-training-program-select" className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">
        Training program
      </label>
      <div className="mt-3">
        <select
          id="client-training-program-select"
          value={selectedAssignmentId}
          onChange={(event) => onSelectAssignment(event.target.value)}
          className="h-14 w-full rounded-[1.25rem] border-0 bg-[#f5f3f3] px-4 text-base font-black text-[#1b1c1c] outline-none ring-2 ring-transparent transition focus:ring-[#3620b8]"
        >
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.name}{assignment.status === "active" ? " (active)" : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#777584]">
        Switch between training programs your coach has assigned to you.
      </p>
    </section>
  );
}

async function loadExerciseMediaUrl(exerciseId: string, mediaType: "image" | "video") {
  try {
    const response = await fetch(`/api/v1/exercises/${encodeURIComponent(exerciseId)}/media-url?type=${mediaType}`);

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as { data?: { url?: string } };

    return payload.data?.url;
  } catch {
    return undefined;
  }
}

function ExerciseCard({ exercise, media }: { exercise: TrainingExercise; media?: ExerciseMedia }) {
  return (
    <article
      className="flex min-h-[6.5rem] w-full items-center gap-4 rounded-[1.65rem] bg-white p-4 text-left shadow-[0_18px_45px_rgba(27,28,28,0.06)]"
    >
      <ExerciseThumbnail exerciseName={exercise.exerciseName} media={media} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black text-[#1b1c1c]">{exercise.exerciseName}</span>
        <span className="mt-1 block truncate text-sm font-bold text-[#777584]">{formatExercisePrescription(exercise)}</span>
      </span>
    </article>
  );
}

function ActiveWorkoutLogger({
  day,
  assignmentId,
  assignmentName,
  exerciseMedia,
  initialExerciseIndex,
  onBack
}: {
  day: TrainingDay;
  assignmentId: string | null;
  assignmentName: string;
  exerciseMedia: Record<string, ExerciseMedia>;
  initialExerciseIndex: number;
  onBack: () => void;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(initialExerciseIndex);
  const activeExercise = day.exercises[exerciseIndex] ?? day.exercises[0];
  const nextExercise = day.exercises[exerciseIndex + 1] ?? null;
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [setRows, setSetRows] = useState<WorkoutSetRow[]>(() => createSetRows(activeExercise));
  const [setRowsByExerciseIndex, setSetRowsByExerciseIndex] = useState<Record<number, WorkoutSetRow[]>>({});
  const [touchStartXBySetId, setTouchStartXBySetId] = useState<Record<string, number>>({});
  const [finishSummaryOpen, setFinishSummaryOpen] = useState(false);
  const [submittingWorkout, setSubmittingWorkout] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState<ClientNoteSummary[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [notesError, setNotesError] = useState("");
  const savedRowsForExercise = setRowsByExerciseIndex[exerciseIndex];
  const [previousWorkoutSessions, setPreviousWorkoutSessions] = useState<WorkoutSessionSummary[]>([]);
  const [previousWorkoutSessionsLoaded, setPreviousWorkoutSessionsLoaded] = useState(false);
  const previousSetWeightsByExercise = useMemo(
    () => buildPreviousSetWeightsByExercise(previousWorkoutSessions),
    [previousWorkoutSessions]
  );
  const previousBestWeightsByExercise = useMemo(
    () => buildPreviousBestWeightsByExercise(previousWorkoutSessions, day.exercises),
    [day.exercises, previousWorkoutSessions]
  );

  useEffect(() => {
    queueMicrotask(() => setDurationSeconds(0));
  }, [day.id, day.name, initialExerciseIndex]);

  useEffect(() => {
    const durationInterval = window.setInterval(() => {
      setDurationSeconds((currentDuration) => currentDuration + 1);
    }, 1_000);

    return () => window.clearInterval(durationInterval);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSetRows(savedRowsForExercise ?? createSetRows(activeExercise));
      setRestSeconds(null);
    });
  }, [activeExercise, exerciseIndex, savedRowsForExercise]);

  useEffect(() => {
    let mounted = true;

    async function loadPreviousWorkoutSessions() {
      setPreviousWorkoutSessionsLoaded(false);

      try {
        const params = new URLSearchParams({
          assignmentName,
          dayName: day.name,
          limit: "20"
        });
        const response = await fetch(`/api/v1/client/workout-sessions?${params.toString()}`);
        const payload = (await response.json().catch(() => null)) as { data?: WorkoutSessionSummary[] } | null;

        if (!mounted) {
          return;
        }

        setPreviousWorkoutSessions(response.ok && Array.isArray(payload?.data) ? payload.data : []);
      } catch {
        if (mounted) {
          setPreviousWorkoutSessions([]);
        }
      } finally {
        if (mounted) {
          setPreviousWorkoutSessionsLoaded(true);
        }
      }
    }

    void loadPreviousWorkoutSessions();

    return () => {
      mounted = false;
    };
  }, [assignmentName, day.name]);

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
    setRestSeconds(getExerciseRestSeconds(activeExercise));
  }

  function addSet() {
    updateCurrentSetRows((currentRows) => [
      ...currentRows,
      {
        id: `${activeExercise.id ?? activeExercise.exerciseName}-set-${currentRows.length + 1}-${Date.now()}`,
        setNumber: currentRows.length + 1,
        reps: "",
        weightKg: "",
        rpe: "",
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

  function updateSetReps(setId: string, reps: string) {
    updateCurrentSetRows((currentRows) =>
      currentRows.map((row) => (row.id === setId ? { ...row, reps } : row))
    );
  }

  function updateSetRpe(setId: string, rpe: string) {
    updateCurrentSetRows((currentRows) =>
      currentRows.map((row) => (row.id === setId ? { ...row, rpe } : row))
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
  }, previousBestWeightsByExercise);
  const completedSetCount = getCompletedSetCount(day.exercises, {
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

  async function submitWorkout() {
    const rowsByExerciseIndex = {
      ...setRowsByExerciseIndex,
      [exerciseIndex]: setRows
    };
    const exerciseLogs = createWorkoutExerciseLogs(day.exercises, rowsByExerciseIndex);

    setSubmittingWorkout(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/v1/client/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          assignmentName,
          dayId: day.id ?? null,
          dayName: day.name,
          startedAt,
          durationSeconds,
          exercises: exerciseLogs,
          personalBests
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Workout could not be saved.");
      }

      if (completedSetCount > 0) {
        await saveClientActivityLog({
          domain: "training",
          status: "completed",
          notes: `${assignmentName} / ${day.name}: ${completedSetCount} completed set${completedSetCount === 1 ? "" : "s"}.`
        });
      }

      setFinishSummaryOpen(false);
      onBack();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Workout could not be saved.");
    } finally {
      setSubmittingWorkout(false);
    }
  }

  return (
    <ClientMobileShell title={assignmentName} kicker="Session active" avatarLabel={assignmentName} hideBottomNav>
      <div className="flex flex-col gap-6 pb-28">
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

        <section className="rounded-[1.65rem] bg-white p-8 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#777584]">Workout duration</p>
              <p className="mt-5 text-6xl font-black leading-none tracking-normal text-[#1b1c1c]">
                {formatTimer(durationSeconds)}
              </p>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f87600]">
              Exercise {Math.min(exerciseIndex + 1, day.exercises.length)}/{day.exercises.length}
            </p>
          </div>
        </section>

        {restSeconds !== null ? (
          <section role="timer" aria-label="Rest timer" className="flex items-center justify-between rounded-[1.65rem] bg-white/70 px-6 py-5 shadow-[0_10px_30px_rgba(27,28,28,0.05)] backdrop-blur-2xl">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#777584]">Rest timer</p>
              <p className="mt-2 text-3xl font-black text-[#3620b8]">{formatTimer(restSeconds)}</p>
              <p className="mt-1 text-xs font-bold text-[#777584]">Coach set {formatRestSeconds(getExerciseRestSeconds(activeExercise))}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRestSeconds(getExerciseRestSeconds(activeExercise))} className="inline-flex size-12 items-center justify-center rounded-full bg-[#e9e8e7] text-[#1b1c1c]" aria-label="Restart rest timer">
                <RotateCcw aria-hidden="true" className="size-5" />
              </button>
              <button type="button" onClick={() => setRestSeconds(null)} className="inline-flex size-12 items-center justify-center rounded-full bg-[#3620b8] text-white shadow-[0_12px_26px_rgba(54,32,184,0.22)]" aria-label="Dismiss rest timer">
                <Check aria-hidden="true" className="size-5" />
              </button>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[1.65rem] bg-white shadow-[0_18px_45px_rgba(27,28,28,0.06)]" aria-label={`${activeExercise.exerciseName} sets`}>
          <div className="relative min-h-56 overflow-hidden bg-[#1b1c1c]">
            <ExerciseHeroImage
              exerciseName={activeExercise.exerciseName}
              media={activeExercise.exerciseId ? exerciseMedia[activeExercise.exerciseId] : undefined}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
              <span className="inline-flex rounded-full bg-[#f87600] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {activeExercise.section ?? "Target"}
              </span>
              <h1 className="mt-3 text-3xl font-black leading-tight tracking-normal text-white">{activeExercise.exerciseName}</h1>
              <p className="mt-1 text-sm font-bold text-white/75">{formatExercisePrescription(activeExercise)}</p>
            </div>
          </div>

          <div className="space-y-4 p-5">
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
            <SetLoggerRow
              key={setRow.id}
              setRow={setRow}
              activeExercise={activeExercise}
              previousWeightKg={getPreviousSetWeight(activeExercise, setRow.setNumber, previousSetWeightsByExercise)}
              previousWorkoutSessionsLoaded={previousWorkoutSessionsLoaded}
              touchStartXBySetId={touchStartXBySetId}
              onCompleteSet={completeSet}
              onDeleteSet={deleteSet}
              onPointerStart={(setId, clientX) => {
                setTouchStartXBySetId((currentStarts) => ({
                  ...currentStarts,
                  [setId]: clientX
                }));
              }}
              onUpdateReps={updateSetReps}
              onUpdateRpe={updateSetRpe}
              onUpdateWeight={updateSetWeight}
            />
          ))}
          </div>
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

        <section className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#fbf9f8] via-[#fbf9f8] to-transparent px-6 pb-6 pt-10">
          <div className="mx-auto grid max-w-xl grid-cols-[4.5rem_1fr] gap-4">
          <button
            type="button"
            onClick={openWorkoutNotes}
            className="inline-flex h-16 items-center justify-center gap-2 rounded-[1.5rem] bg-white text-sm font-black text-[#1b1c1c] shadow-[0_16px_34px_rgba(27,28,28,0.10)]"
          >
            <NotebookPen aria-hidden="true" className="size-4" />
            <span className="sr-only">Notes</span>
          </button>
          <button
            type="button"
            onClick={openFinishSummary}
            className="inline-flex h-16 items-center justify-center gap-3 rounded-[1.5rem] bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-lg font-black text-white shadow-[0_20px_50px_rgba(54,32,184,0.30)] transition active:scale-[0.98]"
          >
            Finish session
            <Flag aria-hidden="true" className="size-5" />
          </button>
          </div>
        </section>

        {finishSummaryOpen ? (
          <WorkoutSummaryDialog
            personalBests={personalBests}
            errorMessage={submitError}
            submitting={submittingWorkout}
            onClose={() => setFinishSummaryOpen(false)}
            onSubmit={() => void submitWorkout()}
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
    </ClientMobileShell>
  );
}

function SetLoggerRow({
  setRow,
  activeExercise,
  previousWeightKg,
  previousWorkoutSessionsLoaded,
  touchStartXBySetId,
  onCompleteSet,
  onDeleteSet,
  onPointerStart,
  onUpdateReps,
  onUpdateRpe,
  onUpdateWeight
}: {
  setRow: WorkoutSetRow;
  activeExercise: TrainingExercise;
  previousWeightKg: number | null;
  previousWorkoutSessionsLoaded: boolean;
  touchStartXBySetId: Record<string, number>;
  onCompleteSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onPointerStart: (setId: string, clientX: number) => void;
  onUpdateReps: (setId: string, reps: string) => void;
  onUpdateRpe: (setId: string, rpe: string) => void;
  onUpdateWeight: (setId: string, weightKg: string) => void;
}) {
  return (
    <div
      role="row"
      aria-label={`Set ${setRow.setNumber}`}
      className="grid touch-pan-y grid-cols-[2.25rem_minmax(0,1fr)_6rem_auto] items-center gap-3 rounded-[1.25rem] bg-white p-3 shadow-[0_12px_32px_rgba(27,28,28,0.05)]"
      onPointerDown={(event) => {
        onPointerStart(setRow.id, event.clientX);
      }}
      onPointerUp={(event) => {
        const startX = touchStartXBySetId[setRow.id];
        if (typeof startX === "number" && startX - event.clientX > 48) {
          onDeleteSet(setRow.id);
        }
      }}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-[#f5f3f3] text-sm font-black">
        {setRow.setNumber}
      </span>
      <label className="min-w-0">
        <span className="sr-only">Set {setRow.setNumber} reps</span>
        <input
          value={setRow.reps}
          onChange={(event) => onUpdateReps(setRow.id, event.target.value)}
          aria-label={`Set ${setRow.setNumber} reps`}
          placeholder="reps"
          className="h-10 w-full rounded-full bg-[#f5f3f3] px-3 text-center text-sm font-black text-[#1b1c1c] outline-none focus:ring-2 focus:ring-[#3620b8]/20"
        />
      </label>
      <label className="w-24">
        <span className="sr-only">Set {setRow.setNumber} weight</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={setRow.weightKg}
          onChange={(event) => onUpdateWeight(setRow.id, event.target.value)}
          aria-label={`Set ${setRow.setNumber} weight`}
          placeholder={previousWeightKg !== null ? `${formatWeight(previousWeightKg)}` : previousWorkoutSessionsLoaded ? "kg" : "last"}
          className="h-10 w-full rounded-full bg-[#f5f3f3] px-3 text-center text-sm font-black text-[#1b1c1c] outline-none placeholder:text-[#b8b3ae] focus:ring-2 focus:ring-[#3620b8]/20"
        />
      </label>
      {activeExercise.rpe ? (
        <label className="col-span-2 col-start-2 min-w-0">
          <span className="sr-only">Set {setRow.setNumber} RPE</span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max="10"
            step="0.5"
            value={setRow.rpe}
            onChange={(event) => onUpdateRpe(setRow.id, event.target.value)}
            aria-label={`Set ${setRow.setNumber} RPE`}
            placeholder={`RPE target ${activeExercise.rpe}`}
            className="h-10 w-full rounded-full bg-[#f5f3f3] px-3 text-center text-sm font-black text-[#1b1c1c] outline-none focus:ring-2 focus:ring-[#3620b8]/20"
          />
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => onCompleteSet(setRow.id)}
        className={cn(
          "inline-flex size-10 flex-none items-center justify-center rounded-full transition",
          setRow.completed ? "bg-emerald-500 text-white" : "bg-[#f5f3f3] text-[#6f6a66]"
        )}
        aria-label={`Complete set ${setRow.setNumber}`}
      >
        <Check aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

function WorkoutSummaryDialog({
  personalBests,
  errorMessage,
  submitting,
  onClose,
  onSubmit
}: {
  personalBests: PersonalBestSummary[];
  errorMessage: string;
  submitting: boolean;
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

        {errorMessage ? (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="mt-5 h-12 w-full rounded-full bg-[#3620b8] text-sm font-black text-white shadow-[0_10px_30px_rgba(54,32,184,0.18)] disabled:opacity-60"
        >
          {submitting ? "Saving workout..." : "Submit workout"}
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

function ExerciseThumbnail({ exerciseName, media }: { exerciseName: string; media?: ExerciseMedia }) {
  if (media?.videoUrl) {
    return (
      <span className="block h-20 w-24 flex-none overflow-hidden rounded-xl bg-[#1b1c1c]">
        <video
          src={media.videoUrl}
          poster={media.imageUrl}
          muted
          playsInline
          preload="metadata"
          aria-label={`${exerciseName} exercise video`}
          className="size-full object-cover"
        />
      </span>
    );
  }

  if (media?.imageUrl) {
    return (
      <span className="block h-20 w-24 flex-none overflow-hidden rounded-xl bg-[#1b1c1c]">
        <img src={media.imageUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span className="flex h-20 w-24 flex-none items-center justify-center rounded-xl bg-[#1b1c1c] text-lg font-black text-white">
      {getExerciseInitials(exerciseName)}
    </span>
  );
}

function ExerciseHeroImage({ exerciseName, media }: { exerciseName: string; media?: ExerciseMedia }) {
  if (media?.videoUrl) {
    return (
      <video
        src={media.videoUrl}
        poster={media.imageUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={`${exerciseName} exercise video`}
        className="absolute inset-0 size-full object-cover"
      />
    );
  }

  if (media?.imageUrl) {
    return <img src={media.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(248,118,0,0.28),transparent_34%),linear-gradient(135deg,#1b1c1c,#3620b8)]">
      <span className="text-6xl font-black text-white/20">{getExerciseInitials(exerciseName)}</span>
    </div>
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
  if (!snapshot || typeof snapshot !== "object") {
    return [];
  }

  const snapshotRecord = snapshot as { days?: unknown; template?: unknown };
  const templateRecord = snapshotRecord.template && typeof snapshotRecord.template === "object"
    ? snapshotRecord.template as { days?: unknown }
    : null;
  const days = Array.isArray(snapshotRecord.days) ? snapshotRecord.days : templateRecord?.days;

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
    restSeconds: getNumber(record.restSeconds),
    section: getString(record.section),
    previousBestKg:
      getNumber(record.previousBestKg) ??
      getNumber(record.personalBestKg) ??
      getNumber(record.bestWeightKg) ??
      getNumber(record.maxWeightKg)
  }];
}

function getExerciseRestSeconds(exercise: TrainingExercise | undefined) {
  return exercise?.restSeconds ?? 60;
}

function formatRestSeconds(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
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
    reps: "",
    weightKg: "",
    rpe: "",
    completed: false
  }));
}

function getPreviousSetWeight(
  exercise: TrainingExercise,
  setNumber: number,
  previousSetWeightsByExercise: PreviousSetWeightsByExercise
) {
  const previousSetWeights = previousSetWeightsByExercise[getExerciseHistoryKey(exercise)];

  return previousSetWeights?.[setNumber] ?? null;
}

function buildPreviousSetWeightsByExercise(sessions: WorkoutSessionSummary[]): PreviousSetWeightsByExercise {
  const latestSession = sessions[0];

  if (!latestSession || !Array.isArray(latestSession.exercises)) {
    return {};
  }

  return latestSession.exercises.reduce<PreviousSetWeightsByExercise>((weightsByExercise, exerciseLog) => {
    const exerciseKey = getExerciseLogHistoryKey(exerciseLog);

    if (!exerciseKey || !Array.isArray(exerciseLog.sets)) {
      return weightsByExercise;
    }

    const setWeights = exerciseLog.sets.reduce<Record<number, number>>((weightsBySet, setLog) => {
      if (!setLog.completed || typeof setLog.weightKg !== "number" || !Number.isFinite(setLog.weightKg)) {
        return weightsBySet;
      }

      return {
        ...weightsBySet,
        [setLog.setNumber]: setLog.weightKg
      };
    }, {});

    return Object.keys(setWeights).length > 0
      ? { ...weightsByExercise, [exerciseKey]: setWeights }
      : weightsByExercise;
  }, {});
}

function buildPreviousBestWeightsByExercise(
  sessions: WorkoutSessionSummary[],
  exercises: TrainingExercise[]
): PreviousBestWeightsByExercise {
  const bestWeights = exercises.reduce<PreviousBestWeightsByExercise>((weightsByExercise, exercise) => {
    return typeof exercise.previousBestKg === "number"
      ? { ...weightsByExercise, [getExerciseHistoryKey(exercise)]: exercise.previousBestKg }
      : weightsByExercise;
  }, {});

  for (const session of sessions) {
    if (!Array.isArray(session.exercises)) {
      continue;
    }

    for (const exerciseLog of session.exercises) {
      const exerciseKey = getExerciseLogHistoryKey(exerciseLog);

      if (!exerciseKey || !Array.isArray(exerciseLog.sets)) {
        continue;
      }

      for (const setLog of exerciseLog.sets) {
        if (!setLog.completed || typeof setLog.weightKg !== "number" || !Number.isFinite(setLog.weightKg)) {
          continue;
        }

        const currentBest = bestWeights[exerciseKey] ?? 0;

        if (setLog.weightKg > currentBest) {
          bestWeights[exerciseKey] = setLog.weightKg;
        }
      }
    }
  }

  return bestWeights;
}

function getExerciseHistoryKey(exercise: TrainingExercise) {
  return exercise.exerciseId ? `id:${exercise.exerciseId}` : `name:${normalizeExerciseName(exercise.exerciseName)}`;
}

function getExerciseLogHistoryKey(exerciseLog: WorkoutSessionExerciseLog) {
  return exerciseLog.exerciseId ? `id:${exerciseLog.exerciseId}` : `name:${normalizeExerciseName(exerciseLog.exerciseName)}`;
}

function normalizeExerciseName(exerciseName: string) {
  return exerciseName.trim().toLowerCase();
}

function getPersonalBests(
  exercises: TrainingExercise[],
  rowsByExerciseIndex: Record<number, WorkoutSetRow[]>,
  previousBestWeightsByExercise: PreviousBestWeightsByExercise = {}
): PersonalBestSummary[] {
  return exercises.flatMap((exercise, exerciseIndex) => {
    const previousBestKg = previousBestWeightsByExercise[getExerciseHistoryKey(exercise)] ?? exercise.previousBestKg;

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

function createWorkoutExerciseLogs(exercises: TrainingExercise[], rowsByExerciseIndex: Record<number, WorkoutSetRow[]>): WorkoutSessionExerciseLog[] {
  return exercises.map((exercise, exerciseIndex) => ({
    exerciseId: exercise.exerciseId ?? null,
    exerciseName: exercise.exerciseName,
    prescribedSets: exercise.sets ? String(exercise.sets) : null,
    prescribedReps: exercise.reps ?? null,
    prescribedRpe: exercise.rpe ?? null,
    prescribedRir: exercise.rir ?? null,
    prescribedRestSeconds: exercise.restSeconds ?? null,
    sets: (rowsByExerciseIndex[exerciseIndex] ?? createSetRows(exercise)).map((row) => ({
      setNumber: row.setNumber,
      reps: row.reps,
      weightKg: parseOptionalWeight(row.weightKg),
      rpe: parseOptionalRpe(row.rpe),
      completed: row.completed
    }))
  }));
}

function getCompletedSetCount(exercises: TrainingExercise[], rowsByExerciseIndex: Record<number, WorkoutSetRow[]>) {
  return exercises.reduce((total, _exercise, exerciseIndex) => {
    const rows = rowsByExerciseIndex[exerciseIndex] ?? [];

    return total + rows.filter((row) => row.completed).length;
  }, 0);
}

function parseWeight(value: string) {
  const weight = Number.parseFloat(value);

  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function parseOptionalWeight(value: string) {
  if (!value.trim()) {
    return null;
  }

  const weight = Number.parseFloat(value);

  return Number.isFinite(weight) && weight >= 0 ? weight : null;
}

function parseOptionalRpe(value: string) {
  if (!value.trim()) {
    return null;
  }

  const rpe = Number.parseFloat(value);

  return Number.isFinite(rpe) && rpe >= 1 && rpe <= 10 ? rpe : null;
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
