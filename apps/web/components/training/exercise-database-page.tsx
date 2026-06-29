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
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
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

  return (
    <div className="p-6 md:p-8">
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
