"use client";

import Link from "next/link";
import { Check, Grid2X2, List, Play, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

import type { Exercise } from "@/fixtures/training";
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
  primaryMuscles: string[];
}

export function ExerciseDatabasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

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
  const filteredExercises = sourceExercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getExerciseMeta(exercise).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Exercise database</h1>
          </div>
          <Link
            href="/training/exercises/add"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Exercise
          </Link>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <label htmlFor="exercise-search" className="sr-only">
            Search exercises
          </label>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            id="exercise-search"
            type="search"
            value={searchQuery}
            placeholder="Search exercises..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            aria-label="Card view"
            aria-pressed={viewMode === "card"}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              viewMode === "card" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
            onClick={() => setViewMode("card")}
          >
            <Grid2X2 className="size-4" aria-hidden="true" />
            Cards
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              viewMode === "list" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" aria-hidden="true" />
            List
          </button>
        </div>
      </div>

      {viewMode === "card" ? (
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
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section aria-label="Exercise list" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {filteredExercises.map((exercise) => (
            <article key={exercise.id} className="grid gap-3 border-b border-gray-100 p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <h2 className="font-semibold text-gray-900">{exercise.name}</h2>
                <p className="mt-1 text-xs text-gray-500">{getExerciseMeta(exercise)}</p>
              </div>
              <span className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{exercise.category}</span>
              <ExerciseSourceBadge exercise={exercise} />
            </article>
          ))}
        </section>
      )}

      {!loadingExercises && filteredExercises.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No exercises loaded from the database yet.
        </div>
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

  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
      {verified ? (
        <Check
          aria-label="Verified Complete Coach exercise"
          className="size-3 text-emerald-600"
        />
      ) : null}
      {"scope" in exercise ? (exercise.scope === "global" ? "Global" : "Private") : "Global"}
    </span>
  );
}
