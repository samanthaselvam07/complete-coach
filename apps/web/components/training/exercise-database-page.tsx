"use client";

import Link from "next/link";
import { Check, ExternalLink, Grid2X2, List, Play, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import type { Exercise } from "@/lib/training/training-models";
import { cn } from "@/lib/utils";

interface ApiExercise {
  id: string;
  name: string;
  category: string;
  scope: "global" | "private";
  equipment: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  videoObjectKey: string | null;
  videoUrl: string | null;
  imageObjectKey?: string | null;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultRestSeconds?: number | null;
  defaultRpe?: number | null;
  defaultRir?: string | null;
  executionCues?: string[];
}

interface ExerciseVideoPreview {
  mediaType: "video";
  source: "uploaded" | "external";
  url: string;
  expiresAt: string | null;
}

export function ExerciseDatabasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [videoExerciseName, setVideoExerciseName] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<ExerciseVideoPreview | null>(null);
  const [videoPreviewError, setVideoPreviewError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ApiExercise | Exercise | null>(null);

  useEffect(() => {
    let active = true;

    async function loadExercises() {
      try {
        const response = await fetch("/api/v1/exercises?limit=100");

        if (!response.ok) {
          throw new Error("Exercise API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiExercise[] };

        if (active) {
          setApiExercises(payload.data ?? []);
        }
      } catch {
        if (active) {
          setApiExercises([]);
        }
      } finally {
        if (active) {
          setLoadingExercises(false);
        }
      }
    }

    void loadExercises();

    return () => {
      active = false;
    };
  }, []);

  const sourceExercises: Array<ApiExercise | Exercise> = apiExercises;
  const filteredExercises = sourceExercises
    .filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getExerciseMeta(exercise).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((firstExercise, secondExercise) =>
      sortOrder === "az"
        ? firstExercise.name.localeCompare(secondExercise.name)
        : secondExercise.name.localeCompare(firstExercise.name)
    );

  const openVideoPreview = async (exercise: ApiExercise | Exercise) => {
    setVideoExerciseName(exercise.name);
    setVideoPreview(null);
    setVideoPreviewError(null);

    try {
      const response = await fetch(`/api/v1/exercises/${exercise.id}/media-url`);
      const payload = (await response.json()) as { data?: ExerciseVideoPreview };

      if (!response.ok || !payload.data) {
        throw new Error("Exercise video is unavailable.");
      }

      setVideoPreview(payload.data);
    } catch {
      setVideoPreviewError("Video preview is unavailable right now.");
    }
  };

  const closeVideoPreview = () => {
    setVideoExerciseName(null);
    setVideoPreview(null);
    setVideoPreviewError(null);
  };

  return (
    <div className="p-6 md:p-8">
      {loadingExercises ? (
        <CompleteCoachLoadingScreen
          title="Preparing exercise database"
          label="Preparing exercise database."
        />
      ) : null}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Exercise database</h1>
      </div>

      <section className="mb-8 grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
        <label className="relative">
          <span className="sr-only">Search exercises</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search exercises..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          Sort exercises
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "az" | "za")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
          </select>
        </label>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Exercise view">
          <button
            type="button"
            aria-label="Card view"
            aria-pressed={viewMode === "cards"}
            className={cn(
              "rounded-lg p-2 text-slate-500 transition hover:text-indigo-700",
              viewMode === "cards" ? "bg-indigo-50 text-indigo-700" : ""
            )}
            onClick={() => setViewMode("cards")}
          >
            <Grid2X2 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            className={cn(
              "rounded-lg p-2 text-slate-500 transition hover:text-indigo-700",
              viewMode === "list" ? "bg-indigo-50 text-indigo-700" : ""
            )}
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" aria-hidden="true" />
          </button>
        </div>

        <Link
          href="/training/exercises/add"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Entry
        </Link>
      </section>

      {viewMode === "cards" ? (
        <section aria-label="Exercise cards" className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filteredExercises.map((exercise) => (
            <article key={exercise.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg">
              <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 to-indigo-950">
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-white backdrop-blur-sm">
                  <Play className="size-3" aria-hidden="true" />
                  <span className="text-xs">{getExerciseVideoCount(exercise)}</span>
                </div>
              </div>
              <div className="p-4">
                <h2 className="mb-2 font-semibold text-gray-900">{exercise.name}</h2>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{exercise.category}</span>
                  <ExerciseSourceBadge exercise={exercise} />
                </div>
                <p className="text-xs text-gray-500">{getExerciseMeta(exercise)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                    onClick={() => setSelectedExercise(exercise)}
                  >
                    View details
                  </button>
                  {getExerciseVideoCount(exercise) > 0 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                      onClick={() => void openVideoPreview(exercise)}
                    >
                      <Play className="size-3" aria-hidden="true" />
                      View video
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section aria-label="Exercise list" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {filteredExercises.map((exercise) => (
            <article key={exercise.id} className="grid gap-3 border-b border-gray-100 p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div>
                <h2 className="font-semibold text-gray-900">{exercise.name}</h2>
                <p className="mt-1 text-xs text-gray-500">{getExerciseMeta(exercise)}</p>
              </div>
              <span className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{exercise.category}</span>
              <ExerciseSourceBadge exercise={exercise} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  onClick={() => setSelectedExercise(exercise)}
                >
                  View details
                </button>
                {getExerciseVideoCount(exercise) > 0 ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                    onClick={() => void openVideoPreview(exercise)}
                  >
                    <Play className="size-3" aria-hidden="true" />
                    View video
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}

      {!loadingExercises && filteredExercises.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No exercises loaded from the database yet.
        </div>
      ) : null}

      {videoExerciseName ? (
        <ExerciseVideoDialog
          exerciseName={videoExerciseName}
          videoPreview={videoPreview}
          errorMessage={videoPreviewError}
          onClose={closeVideoPreview}
        />
      ) : null}

      {selectedExercise ? (
        <ExerciseDetailDialog
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onOpenVideo={(exercise) => void openVideoPreview(exercise)}
        />
      ) : null}

    </div>
  );
}

function getExerciseVideoCount(exercise: ApiExercise | Exercise) {
  return "videos" in exercise ? exercise.videos : exercise.videoObjectKey || exercise.videoUrl ? 1 : 0;
}

function isVerifiedExercise(exercise: ApiExercise | Exercise) {
  return "scope" in exercise ? exercise.scope === "global" : true;
}

function getExerciseMeta(exercise: ApiExercise | Exercise) {
  if ("variations" in exercise) {
    return `${exercise.variations} variations available`;
  }

  return exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.join(", ") : "No muscles tagged";
}

function ExerciseSourceBadge({ exercise }: { exercise: ApiExercise | Exercise }) {
  const verified = isVerifiedExercise(exercise);

  if (verified) {
    return (
      <span
        aria-label="Verified Complete Coach exercise"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
      >
        <Check className="size-3.5" aria-hidden="true" />
        Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
      Coach added
    </span>
  );
}

function ExerciseDetailDialog({
  exercise,
  onClose,
  onOpenVideo
}: {
  exercise: ApiExercise | Exercise;
  onClose: () => void;
  onOpenVideo: (exercise: ApiExercise | Exercise) => void;
}) {
  const primaryMuscles = getStringList(exercise, "primaryMuscles");
  const secondaryMuscles = getStringList(exercise, "secondaryMuscles");
  const executionCues = getStringList(exercise, "executionCues");
  const videoCount = getExerciseVideoCount(exercise);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-detail-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">
                {exercise.category}
              </span>
              <ExerciseSourceBadge exercise={exercise} />
            </div>
            <h2 id="exercise-detail-title" className="text-xl font-bold text-slate-950">
              {exercise.name} details
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close exercise details"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <ExerciseDetailItem label="Equipment" value={getNullableText(exercise, "equipment")} />
            <ExerciseDetailItem label="Difficulty" value={getNullableText(exercise, "difficulty")} />
            <ExerciseDetailItem label="Primary muscles" value={formatStringList(primaryMuscles)} />
            <ExerciseDetailItem label="Secondary muscles" value={formatStringList(secondaryMuscles)} />
            <ExerciseDetailItem label="Default sets" value={getNullableText(exercise, "defaultSets")} />
            <ExerciseDetailItem label="Default reps" value={getNullableText(exercise, "defaultReps")} />
            <ExerciseDetailItem label="Default rest" value={formatRestSeconds(getNullableNumber(exercise, "defaultRestSeconds"))} />
            <ExerciseDetailItem label="Default RPE" value={getNullableText(exercise, "defaultRpe")} />
            <ExerciseDetailItem label="Default RIR" value={getNullableText(exercise, "defaultRir")} />
            <ExerciseDetailItem label="Video" value={videoCount > 0 ? `${videoCount} available` : "Not uploaded"} />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-950">Coaching notes</h3>
            {executionCues.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {executionCues.map((cue) => (
                  <li key={cue} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No coaching notes have been added yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          {videoCount > 0 ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              onClick={() => onOpenVideo(exercise)}
            >
              <Play className="size-4" aria-hidden="true" />
              View video
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

function ExerciseDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function getStringList(exercise: ApiExercise | Exercise, key: "primaryMuscles" | "secondaryMuscles" | "executionCues") {
  const value = getExerciseValue(exercise, key);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getNullableText(
  exercise: ApiExercise | Exercise,
  key: "equipment" | "difficulty" | "defaultSets" | "defaultReps" | "defaultRpe" | "defaultRir"
) {
  const value = getExerciseValue(exercise, key);
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }
  return String(value);
}

function getNullableNumber(exercise: ApiExercise | Exercise, key: "defaultRestSeconds") {
  const value = getExerciseValue(exercise, key);
  return typeof value === "number" ? value : null;
}

function getExerciseValue(exercise: ApiExercise | Exercise, key: string) {
  return (exercise as unknown as Record<string, unknown>)[key];
}

function formatStringList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Not specified";
}

function formatRestSeconds(seconds: number | null) {
  if (!seconds) {
    return "Not specified";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function ExerciseVideoDialog({
  exerciseName,
  videoPreview,
  errorMessage,
  onClose
}: {
  exerciseName: string;
  videoPreview: ExerciseVideoPreview | null;
  errorMessage: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-video-title"
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="exercise-video-title" className="text-lg font-bold text-slate-950">
            {exerciseName} video
          </h2>
          <button
            type="button"
            aria-label="Close exercise video"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-slate-950">
          {videoPreview?.source === "uploaded" ? (
            <video controls className="aspect-video w-full bg-slate-950" src={videoPreview.url}>
              <track kind="captions" />
            </video>
          ) : videoPreview?.source === "external" ? (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <Play className="size-10 text-white/70" aria-hidden="true" />
              <a
                href={videoPreview.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
              >
                Open video link
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center p-6 text-center text-sm font-semibold text-white/75">
              {errorMessage ?? "Loading video..."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
