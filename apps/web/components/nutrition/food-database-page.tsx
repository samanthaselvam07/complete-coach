"use client";

import { ChevronLeft, ChevronRight, Database, Download, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { SavedToast } from "@/components/ui/saved-toast";
import { foods, type Food } from "@/fixtures/nutrition";
import { cn } from "@/lib/utils";

interface ApiFood {
  id: string;
  scope: "global" | "private";
  name: string;
  category: string;
  servingSize: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  metadata?: {
    source?: string;
  } | null;
}

type FoodSource = "api" | "fixtures";
type FoodDatabaseSource = Food["source"];

const databaseSources = [
  { id: "USDA", label: "USDA", detail: "FoodData Central" },
  { id: "AUS/NZ", label: "AUS/NZ", detail: "Australia & New Zealand" },
  { id: "EFSA", label: "EFSA", detail: "European Food Safety Authority" }
] as const;

export function FoodDatabasePage() {
  const [selectedSource, setSelectedSource] = useState<FoodDatabaseSource>("USDA");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiFoods, setApiFoods] = useState<ApiFood[]>([]);
  const [foodSource, setFoodSource] = useState<FoodSource>("fixtures");
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [savingFood, setSavingFood] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFoods() {
      try {
        const response = await fetch("/api/v1/foods?limit=100");

        if (!response.ok) {
          throw new Error("Food API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiFood[] };

        if (!cancelled) {
          setApiFoods(Array.isArray(payload.data) ? payload.data : []);
          setFoodSource("api");
        }
      } catch {
        if (!cancelled) {
          setApiFoods([]);
          setFoodSource("fixtures");
        }
      } finally {
        if (!cancelled) {
          setLoadingFoods(false);
        }
      }
    }

    void loadFoods();

    return () => {
      cancelled = true;
    };
  }, []);

  const sourceFoods: Array<ApiFood | Food> = foodSource === "api" ? apiFoods : foods;
  const filteredFoods = sourceFoods
    .filter((food) => getFoodSource(food) === selectedSource)
    .filter(
      (food) =>
        food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        food.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

  async function createFood() {
    setSavingFood(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Coach Food ${apiFoods.length + 1}`,
          category: "Custom",
          servingSize: "100g",
          calories: 250,
          proteinGrams: 20,
          carbsGrams: 25,
          fatGrams: 8,
          fiberGrams: 4,
          metadata: { source: "coach-created" }
        })
      });
      const payload = (await response.json()) as { data?: ApiFood; error?: { message?: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Food could not be saved.");
      }

      setApiFoods((currentFoods) => [payload.data as ApiFood, ...currentFoods]);
      setFoodSource("api");
      setSelectedSource(getFoodSource(payload.data as ApiFood));
      setStatusMessage("Food saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Food could not be saved.");
    } finally {
      setSavingFood(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mb-8">
        <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950">Food Database</h1>
            <p className="text-slate-600">Curate your custom ingredients or import from verified global libraries.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-indigo-600 bg-white px-5 py-3 font-semibold text-indigo-600 transition-colors hover:bg-indigo-50">
              <Download className="size-4" aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              disabled={savingFood}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              onClick={createFood}
            >
              <Plus className="size-4" aria-hidden="true" />
              {savingFood ? "Saving..." : "Create New Food"}
            </button>
          </div>
        </div>
      </div>

      {loadingFoods ? <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Loading persisted food library...</p> : null}
      {foodSource === "fixtures" && !loadingFoods ? (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Food persistence API unavailable. Showing fixture food library.
        </p>
      ) : null}
      {statusMessage ? <SavedToast message={statusMessage} /> : null}
      {errorMessage ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

      <div className="relative mb-6">
        <label htmlFor="food-search" className="sr-only">
          Search foods
        </label>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          id="food-search"
          type="search"
          value={searchQuery}
          placeholder="Search thousands of ingredients..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">Source:</span>
          {databaseSources.map((source) => (
            <button
              key={source.id}
              type="button"
              aria-pressed={selectedSource === source.id}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
                selectedSource === source.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
              )}
              onClick={() => setSelectedSource(source.id)}
            >
              {source.label}
              <span aria-hidden="true" className="text-[10px] font-medium text-indigo-500">
                {source.detail}
              </span>
            </button>
          ))}
        </div>
        <span className="text-xs font-medium text-slate-400">{getSourceDescription(selectedSource)}</span>
      </div>

      <section className="mb-8 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 p-6 shadow-sm">
        <div className="flex-1 text-white">
          <h2 className="mb-2 text-xl font-bold">Unlock Global Food Database</h2>
          <p className="mb-4 text-sm text-indigo-100">
            Access 50,000+ verified ingredients with complete macro breakdowns and international serving sizes
          </p>
          <button className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50">
            Sync Now
          </button>
        </div>
        <div className="hidden size-24 items-center justify-center rounded-full bg-white/15 md:flex">
          <Database className="size-12 text-white" aria-hidden="true" />
        </div>
      </section>

      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Ingredients</h2>
          <span className="text-sm text-gray-500">Showing {filteredFoods.length} results</span>
        </div>

        <section aria-label="Food grid" className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filteredFoods.map((food) => (
            <article key={food.id} className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-lg">
              <div className="relative mb-5">
                <img
                  src={getFoodImageSrc(food.name)}
                  alt={food.name}
                  className="mx-auto size-20 rounded-full object-cover"
                />
                <button
                  aria-label={`Add ${food.name}`}
                  className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white opacity-0 transition-colors hover:border-indigo-300 hover:bg-indigo-50 group-hover:opacity-100"
                >
                  <Plus className="size-4 text-indigo-600" aria-hidden="true" />
                </button>
              </div>
              <div className="mb-4 text-center">
                <h3 className="mb-1 font-semibold text-gray-900">{food.name}</h3>
                <p className="text-xs text-gray-500">{getFoodServing(food)}</p>
              </div>
              <div className="space-y-2">
                <FoodMacro label="Calories" value={`${food.calories}`} tone="text-gray-900" />
                <FoodMacro label="Protein" value={`${getFoodMacro(food, "protein")}g`} tone="text-blue-600" />
                <FoodMacro label="Carbs" value={`${getFoodMacro(food, "carbs")}g`} tone="text-green-600" />
                <FoodMacro label="Fats" value={`${getFoodMacro(food, "fats")}g`} tone="text-orange-600" />
              </div>
            </article>
          ))}

          <article className="flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 transition-all hover:border-indigo-400 hover:bg-indigo-50">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white">
              <Plus className="size-6 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-gray-700">Add New Ingredient</h3>
          </article>
          {foodSource === "api" && !loadingFoods && filteredFoods.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
              No persisted foods match the current filters.
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous food page"
          disabled={currentPage === 1}
          className="flex size-8 items-center justify-center rounded border border-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-50"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        {[1, 2, 3, 12].map((page) => (
          <button
            key={page}
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded border text-sm font-medium",
              currentPage === page
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-200 transition-colors hover:bg-gray-50"
            )}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next food page"
          className="flex size-8 items-center justify-center rounded border border-gray-200 transition-colors hover:bg-gray-50"
          onClick={() => setCurrentPage((page) => page + 1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p role="status" aria-label="Food database page" className="sr-only">
        Page {currentPage}
      </p>
    </div>
  );
}

function getFoodServing(food: ApiFood | Food) {
  return "serving" in food ? food.serving : food.servingSize;
}

function getFoodSource(food: ApiFood | Food): FoodDatabaseSource {
  if ("source" in food) {
    return food.source;
  }

  const source = food.metadata?.source?.toUpperCase();

  if (source === "AUS/NZ" || source === "AUS-NZ" || source === "AUSTRALIA_NEW_ZEALAND") {
    return "AUS/NZ";
  }

  if (source === "EFSA" || source === "EU") {
    return "EFSA";
  }

  return "USDA";
}

function getSourceDescription(source: FoodDatabaseSource) {
  return databaseSources.find((databaseSource) => databaseSource.id === source)?.detail ?? "Verified food library";
}

function getFoodMacro(food: ApiFood | Food, macro: "protein" | "carbs" | "fats") {
  if ("protein" in food) {
    return macro === "protein" ? food.protein : macro === "carbs" ? food.carbs : food.fats;
  }

  return macro === "protein" ? food.proteinGrams : macro === "carbs" ? food.carbsGrams : food.fatGrams;
}

function getFoodImageSrc(name: string) {
  const palettes: Record<string, { bg: string; fg: string }> = {
    "Chicken Breast": { bg: "#f3d4d4", fg: "#9f1239" },
    "Basmati Rice": { bg: "#eee5d1", fg: "#92400e" },
    "Raw Avocado": { bg: "#f4b6cf", fg: "#15803d" },
    "Boiled Oats": { bg: "#1f2937", fg: "#f8fafc" },
    "Whey Isolate": { bg: "#f3f4f6", fg: "#111827" }
  };
  const palette = palettes[name] ?? { bg: "#eef2ff", fg: "#4f46e5" };
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${palette.bg}"/><text x="48" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${palette.fg}">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function FoodMacro({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={cn("font-semibold", tone)}>{value}</span>
    </div>
  );
}
