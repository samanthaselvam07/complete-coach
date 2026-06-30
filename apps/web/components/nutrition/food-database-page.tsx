"use client";

import { Check, ChevronLeft, ChevronRight, Grid2X2, List as ListIcon, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { SavedToast } from "@/components/ui/saved-toast";
import type { Food } from "@/lib/nutrition/nutrition-models";
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
  fiberGrams?: number | null;
  metadata?: {
    source?: string;
    sourceId?: string;
    [key: string]: unknown;
  } | null;
}

type FoodDatabaseSource = Food["source"];
type FoodDatabaseView = "cards" | "list";
type FoodDatabaseSort = "az" | "za";
type NewFoodFormState = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  polyols: string;
  saturated: string;
  polyunsaturated: string;
  monounsaturated: string;
  salt: string;
  servingDescription: string;
  servingSize: string;
};

const databaseSources = [
  { id: "USDA", label: "USDA", detail: "FoodData Central" },
  { id: "AUS/NZ", label: "AUS/NZ", detail: "Australia & New Zealand" },
  { id: "EFSA", label: "EFSA", detail: "European Food Safety Authority" }
] as const;

const servingDescriptionOptions = ["Grams", "Ounces", "Qty", "Cups", "Oz", "Tbsp", "Tsp", "Ml"];
const FOOD_LIBRARY_FETCH_LIMIT = 5_000;
const FOODS_PER_PAGE = 12;

const initialNewFoodForm: NewFoodFormState = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  sugar: "",
  polyols: "",
  saturated: "",
  polyunsaturated: "",
  monounsaturated: "",
  salt: "",
  servingDescription: "Grams",
  servingSize: ""
};

const vitaminFields = [
  "B1 (Thiamine)",
  "B2 (Riboflavin)",
  "B3 (Niacin)",
  "B5 (Pantothenic Acid)",
  "B6 (Pyridoxine)",
  "B12 (Cobalamin)",
  "Folate",
  "Vitamin A",
  "Vitamin C",
  "Vitamin D",
  "Vitamin E",
  "Vitamin K"
];

const mineralFields = ["Calcium", "Copper", "Iron", "Magnesium", "Manganese", "Phosphorus", "Potassium", "Selenium", "Sodium", "Zinc"];

export function FoodDatabasePage() {
  const [selectedSource, setSelectedSource] = useState<FoodDatabaseSource>("USDA");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiFoods, setApiFoods] = useState<ApiFood[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [viewMode, setViewMode] = useState<FoodDatabaseView>("cards");
  const [sortOrder, setSortOrder] = useState<FoodDatabaseSort>("az");
  const [savingFood, setSavingFood] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newFoodModalOpen, setNewFoodModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<ApiFood | Food | null>(null);
  const [newFoodForm, setNewFoodForm] = useState<NewFoodFormState>(initialNewFoodForm);

  useEffect(() => {
    let cancelled = false;

    async function loadFoods() {
      try {
        const response = await fetch(`/api/v1/foods?limit=${FOOD_LIBRARY_FETCH_LIMIT}`);

        if (!response.ok) {
          throw new Error("Food API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiFood[] };

        if (!cancelled) {
          setApiFoods(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) {
          setApiFoods([]);
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

  const sourceFoods: Array<ApiFood | Food> = apiFoods;
  const filteredFoods = sourceFoods
    .filter((food) => getFoodSource(food) === selectedSource)
    .filter(
      (food) =>
        food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        food.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((firstFood, secondFood) =>
      sortOrder === "az" ? firstFood.name.localeCompare(secondFood.name) : secondFood.name.localeCompare(firstFood.name)
    );
  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / FOODS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const visibleFoods = filteredFoods.slice((effectivePage - 1) * FOODS_PER_PAGE, effectivePage * FOODS_PER_PAGE);
  const paginationPages = getPaginationPages(effectivePage, totalPages);

  async function createFood() {
    setSavingFood(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const calories = parseNumberInput(newFoodForm.calories);
    const protein = parseNumberInput(newFoodForm.protein);
    const carbs = parseNumberInput(newFoodForm.carbs);
    const fat = parseNumberInput(newFoodForm.fat);
    const fiber = parseNumberInput(newFoodForm.fiber);

    try {
      const response = await fetch("/api/v1/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFoodForm.name.trim() || `Coach Food ${apiFoods.length + 1}`,
          category: "Custom",
          servingSize: formatServingSize(newFoodForm),
          calories,
          proteinGrams: protein,
          carbsGrams: carbs,
          fatGrams: fat,
          fiberGrams: fiber,
          metadata: {
            source: selectedSource,
            sugarGrams: parseNumberInput(newFoodForm.sugar),
            polyolsGrams: parseNumberInput(newFoodForm.polyols),
            saturatedGrams: parseNumberInput(newFoodForm.saturated),
            polyunsaturatedGrams: parseNumberInput(newFoodForm.polyunsaturated),
            monounsaturatedGrams: parseNumberInput(newFoodForm.monounsaturated),
            saltGrams: parseNumberInput(newFoodForm.salt),
            servingDescription: newFoodForm.servingDescription
          }
        })
      });
      const payload = (await response.json()) as { data?: ApiFood; error?: { message?: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Food could not be saved.");
      }

      setApiFoods((currentFoods) => [payload.data as ApiFood, ...currentFoods]);
      setSelectedSource(getFoodSource(payload.data as ApiFood));
      setCurrentPage(1);
      setNewFoodModalOpen(false);
      setNewFoodForm(initialNewFoodForm);
      setStatusMessage("Food saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Food could not be saved.");
    } finally {
      setSavingFood(false);
    }
  }

  async function deleteFood(food: ApiFood | Food) {
    if (!isDeletableFood(food)) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/foods/${food.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Food could not be deleted.");
      }

      setApiFoods((currentFoods) => currentFoods.filter((currentFood) => currentFood.id !== food.id));
      setSelectedFood((currentFood) => (currentFood?.id === food.id ? null : currentFood));
      setStatusMessage("Food deleted.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Food could not be deleted.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950">Food Database</h1>
        <p className="text-slate-600">Curate your custom ingredients or import from verified global libraries.</p>
      </div>

      {loadingFoods ? <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Loading persisted food library...</p> : null}
      {statusMessage ? <SavedToast message={statusMessage} /> : null}
      {errorMessage ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
        <label className="relative">
          <span className="sr-only">Search foods</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search thousands of ingredients..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          Sort foods
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as FoodDatabaseSort);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
          </select>
        </label>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Food database view">
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
            <ListIcon className="size-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          disabled={savingFood}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          onClick={() => setNewFoodModalOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          New Entry
        </button>
      </section>

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
              onClick={() => {
                setSelectedSource(source.id);
                setCurrentPage(1);
              }}
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

      <div className="mb-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold">Recent Ingredients</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {visibleFoods.length} of {filteredFoods.length} results
            </span>
          </div>
        </div>

        {filteredFoods.length > 0 ? (
          viewMode === "cards" ? (
            <section aria-label="Food grid" className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {visibleFoods.map((food) => (
                <FoodCard key={food.id} food={food} onDelete={deleteFood} onOpen={() => setSelectedFood(food)} />
              ))}
              <AddFoodCard onClick={() => setNewFoodModalOpen(true)} />
            </section>
          ) : (
            <>
              <FoodList foods={visibleFoods} onDelete={deleteFood} onOpen={setSelectedFood} />
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setNewFoodModalOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add New Food
              </button>
            </>
          )
        ) : (
          <section aria-label="Food grid" className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <AddFoodCard onClick={() => setNewFoodModalOpen(true)} />
            {!loadingFoods ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
                No persisted foods match the current filters.
              </p>
            ) : null}
          </section>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous food page"
          disabled={currentPage === 1}
          className="flex size-8 items-center justify-center rounded border border-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-50"
          onClick={() => setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        {paginationPages.map((page) => (
          <button
            key={page}
            type="button"
            aria-label={`Food page ${page}`}
            aria-current={effectivePage === page ? "page" : undefined}
            className={cn(
              "flex size-8 items-center justify-center rounded border text-sm font-medium",
              effectivePage === page
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
          disabled={effectivePage === totalPages}
          className="flex size-8 items-center justify-center rounded border border-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-50"
          onClick={() => setCurrentPage((page) => Math.min(totalPages, Math.min(page, totalPages) + 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p role="status" aria-label="Food database page" className="sr-only">
        Page {effectivePage}
      </p>
      {newFoodModalOpen ? (
        <NewFoodModal
          form={newFoodForm}
          saving={savingFood}
          onChange={(key, value) => setNewFoodForm((currentForm) => ({ ...currentForm, [key]: value }))}
          onClose={() => setNewFoodModalOpen(false)}
          onSubmit={createFood}
        />
      ) : null}
      {selectedFood ? <FoodNutrientDetailsDialog food={selectedFood} onClose={() => setSelectedFood(null)} /> : null}
    </div>
  );
}

function FoodCard({ food, onDelete, onOpen }: { food: ApiFood | Food; onDelete: (food: ApiFood | Food) => void; onOpen: () => void }) {
  return (
    <article className="relative rounded-xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg">
      {isDeletableFood(food) ? <DeleteFoodButton className="absolute right-3 top-3 z-10" food={food} onDelete={onDelete} /> : null}
      <button
        type="button"
        aria-label={`View nutrient breakdown for ${food.name}`}
        className="group h-full w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        onClick={onOpen}
      >
        <div className="relative mb-5">
          {isVerifiedFood(food) ? (
            <span
              aria-label="Verified Complete Coach food"
              className="absolute right-0 top-0 inline-flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              title="Verified Complete Coach food"
            >
              <Check className="size-4" aria-hidden="true" />
            </span>
          ) : null}
          <img src={getFoodImageSrc(food.name)} alt={food.name} className="mx-auto size-20 rounded-full object-cover" />
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
      </button>
    </article>
  );
}

function FoodList({
  foods: foodItems,
  onDelete,
  onOpen
}: {
  foods: Array<ApiFood | Food>;
  onDelete: (food: ApiFood | Food) => void;
  onOpen: (food: ApiFood | Food) => void;
}) {
  return (
    <div role="list" aria-label="Food list" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {foodItems.map((food) => (
        <div key={food.id} role="listitem" className="border-b border-gray-100 last:border-b-0">
          <div className="grid gap-4 px-4 py-4 hover:bg-indigo-50/50 lg:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.7fr)_minmax(18rem,1fr)_auto] lg:items-center">
            <button
              type="button"
              aria-label={`View nutrient breakdown for ${food.name}`}
              className="flex min-w-0 items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => onOpen(food)}
            >
              <img src={getFoodImageSrc(food.name)} alt="" className="size-12 shrink-0 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-950">{food.name}</h3>
                  {isVerifiedFood(food) ? (
                    <span
                      aria-label="Verified Complete Coach food"
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                      title="Verified Complete Coach food"
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-slate-500">{food.category}</p>
              </div>
            </button>

            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{getFoodServing(food)}</span>
              <span className="ml-2 text-xs text-slate-400">{getFoodSource(food)}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <ListMacro label="Cal" value={`${food.calories}`} tone="text-slate-900" />
              <ListMacro label="Protein" value={`${getFoodMacro(food, "protein")}g`} tone="text-blue-600" />
              <ListMacro label="Carbs" value={`${getFoodMacro(food, "carbs")}g`} tone="text-green-600" />
              <ListMacro label="Fats" value={`${getFoodMacro(food, "fats")}g`} tone="text-orange-600" />
            </div>
            <div className="flex justify-end">{isDeletableFood(food) ? <DeleteFoodButton food={food} onDelete={onDelete} /> : null}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeleteFoodButton({
  className,
  food,
  onDelete
}: {
  className?: string;
  food: ApiFood | Food;
  onDelete: (food: ApiFood | Food) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Delete ${food.name}`}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300",
        className
      )}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(food);
      }}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}

function AddFoodCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50"
      onClick={onClick}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white">
        <Plus className="size-6 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="font-semibold text-gray-700">Add New Food</h3>
    </button>
  );
}

function FoodNutrientDetailsDialog({ food, onClose }: { food: ApiFood | Food; onClose: () => void }) {
  const macroRows = getFoodMacroRows(food);
  const nutrientRows = getDetailedNutrientRows(food);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${food.name} nutrient breakdown`}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Nutrient breakdown</p>
            <h2 id="food-details-title" className="mt-1 truncate text-2xl font-black text-slate-950">
              {food.name}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {getFoodServing(food)} · {food.category} · {getFoodSource(food)}
            </p>
          </div>
          <button type="button" aria-label="Close food details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {macroRows.map((row) => (
              <div key={row.label} role="row" aria-label={`${row.label} ${row.value}`} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{row.label}</p>
                <p className={cn("mt-1 text-lg font-black", row.tone)}>{row.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-6">
            <h3 className="text-base font-black text-slate-950">Nutrient breakdown</h3>
            {nutrientRows.length > 0 ? (
              <div role="table" aria-label={`${food.name} nutrient breakdown`} className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <div role="row" className="grid grid-cols-[1fr_8rem] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                  <span role="columnheader">Nutrient</span>
                  <span role="columnheader" className="text-right">
                    Amount
                  </span>
                </div>
                {nutrientRows.map((row) => (
                  <div key={row.key} role="row" aria-label={`${row.label} ${row.value}`} className="grid grid-cols-[1fr_8rem] gap-3 border-t border-slate-100 px-4 py-3 text-sm">
                    <span role="cell" className="font-medium text-slate-800">
                      {row.label}
                    </span>
                    <span role="cell" className="text-right font-semibold text-slate-700">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No detailed micronutrient data is available for this food yet.
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function NewFoodModal({
  form,
  saving,
  onChange,
  onClose,
  onSubmit
}: {
  form: NewFoodFormState;
  saving: boolean;
  onChange: (key: keyof NewFoodFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="new-food-title" className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="new-food-title" className="text-xl font-bold text-slate-800">
            Add Own Food item for your nutrition plan
          </h2>
          <button type="button" aria-label="Close add food" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form
          className="max-h-[calc(92vh-8rem)] overflow-y-auto px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FoodInput className="md:col-span-2" label="Name:" placeholder="Enter food name" value={form.name} onChange={(value) => onChange("name", value)} />
            <FoodInput label="Calories (kcal):" placeholder="Enter total calories" value={form.calories} onChange={(value) => onChange("calories", value)} />
            <FoodInput label="Protein (g):" placeholder="Enter total protein" value={form.protein} onChange={(value) => onChange("protein", value)} />
            <FoodInput label="Carbs (g):" placeholder="Enter total carbs" value={form.carbs} onChange={(value) => onChange("carbs", value)} />
            <FoodInput label="Fat (g):" placeholder="Enter total fat" value={form.fat} onChange={(value) => onChange("fat", value)} />
            <FoodInput label="Fiber (g):" placeholder="Enter total fiber" value={form.fiber} onChange={(value) => onChange("fiber", value)} />
            <FoodInput label="Sugar (g):" placeholder="Enter total sugar" value={form.sugar} onChange={(value) => onChange("sugar", value)} />
            <FoodInput label="Polyols (g):" placeholder="Enter total polyols" value={form.polyols} onChange={(value) => onChange("polyols", value)} />
            <FoodInput label="Saturated (g):" placeholder="Enter total saturated" value={form.saturated} onChange={(value) => onChange("saturated", value)} />
            <FoodInput label="Polyunsaturated (g):" placeholder="Enter total polyunsaturated" value={form.polyunsaturated} onChange={(value) => onChange("polyunsaturated", value)} />
            <FoodInput label="Monounsaturated (g):" placeholder="Enter total monounsaturated" value={form.monounsaturated} onChange={(value) => onChange("monounsaturated", value)} />
            <FoodInput label="Salt (g):" placeholder="Enter total salt" value={form.salt} onChange={(value) => onChange("salt", value)} />

            <label className="block">
              <span className="mb-2 block font-medium text-slate-900">Serving Description:</span>
              <select
                value={form.servingDescription}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                onChange={(event) => onChange("servingDescription", event.target.value)}
              >
                {servingDescriptionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <FoodInput label="Serving Size (g):" placeholder="Enter serving size" value={form.servingSize} onChange={(value) => onChange("servingSize", value)} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <MicronutrientSection title="Vitamins" fields={vitaminFields} />
            <MicronutrientSection title="Minerals" fields={mineralFields} />
          </div>
        </form>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button type="button" className="rounded-xl bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            onClick={onSubmit}
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FoodInput({
  label,
  placeholder,
  value,
  className,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block font-medium text-slate-900">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MicronutrientSection({ title, fields }: { title: string; fields: string[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-slate-50">
      <h3 className="rounded-t-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800">{title}</h3>
      <div className="divide-y divide-white">
        {fields.map((field) => (
          <div key={field} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-sm">
            <span className="text-slate-700">{field}</span>
            <input
              aria-label={`${field} amount`}
              placeholder="-"
              className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function getFoodServing(food: ApiFood | Food) {
  return "serving" in food ? food.serving : food.servingSize;
}

export function parseNumberInput(value: string) {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatServingSize(form: NewFoodFormState) {
  const servingSize = form.servingSize.trim();

  if (!servingSize) {
    return form.servingDescription;
  }

  return `${servingSize} ${form.servingDescription}`;
}

export function getFoodSource(food: ApiFood | Food): FoodDatabaseSource {
  if (!isApiFood(food)) {
    return food.source;
  }

  const source = food.metadata?.source?.toUpperCase();
  const sourceId = food.metadata?.sourceId?.toLowerCase();

  if (
    source === "AUS/NZ" ||
    source === "AUS-NZ" ||
    source === "AUSTRALIA_NEW_ZEALAND" ||
    sourceId === "fsanz_afcd" ||
    sourceId === "fsanz_ausnut" ||
    sourceId === "fsanz_branded"
  ) {
    return "AUS/NZ";
  }

  if (source === "EFSA" || source === "EU" || sourceId === "efsa_foodex2") {
    return "EFSA";
  }

  if (sourceId === "usda_fdc") {
    return "USDA";
  }

  return "USDA";
}

export function isVerifiedFood(food: ApiFood | Food) {
  return "scope" in food ? food.scope === "global" : true;
}

export function isDeletableFood(food: ApiFood | Food) {
  return "scope" in food && food.scope === "private";
}

export function getSourceDescription(source: FoodDatabaseSource) {
  return databaseSources.find((databaseSource) => databaseSource.id === source)?.detail ?? "Verified food library";
}

export function getFoodMacro(food: ApiFood | Food, macro: "protein" | "carbs" | "fats") {
  if ("protein" in food) {
    return macro === "protein" ? food.protein : macro === "carbs" ? food.carbs : food.fats;
  }

  return macro === "protein" ? food.proteinGrams : macro === "carbs" ? food.carbsGrams : food.fatGrams;
}

export function getFoodFibre(food: ApiFood | Food) {
  if ("fibre" in food) {
    return food.fibre;
  }

  return food.fiberGrams ?? 0;
}

export function getFoodMacroRows(food: ApiFood | Food) {
  return [
    { label: "Calories", value: `${formatNutrientValue(food.calories)} kcal`, tone: "text-slate-950" },
    { label: "Protein", value: `${formatNutrientValue(getFoodMacro(food, "protein"))} g`, tone: "text-blue-600" },
    { label: "Carbs", value: `${formatNutrientValue(getFoodMacro(food, "carbs"))} g`, tone: "text-green-600" },
    { label: "Fats", value: `${formatNutrientValue(getFoodMacro(food, "fats"))} g`, tone: "text-orange-600" },
    { label: "Fibre", value: `${formatNutrientValue(getFoodFibre(food))} g`, tone: "text-emerald-600" }
  ];
}

export function getDetailedNutrientRows(food: ApiFood | Food) {
  if (isApiFood(food)) {
    return getMetadataNutrientRows(food.metadata);
  }

  return Object.entries(food.micronutrients ?? {})
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([key, value]) => ({
      key,
      label: nutrientLabels[key] ?? toTitleLabel(key),
      value: `${formatNutrientValue(value as number)} ${nutrientUnits[key] ?? inferNutrientUnit(key)}`
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

export function isApiFood(food: ApiFood | Food): food is ApiFood {
  return "servingSize" in food;
}

export function getMetadataNutrientRows(metadata: ApiFood["metadata"]) {
  if (!metadata) {
    return [];
  }

  if (Array.isArray(metadata.nutrientsPer100g)) {
    return metadata.nutrientsPer100g
      .filter(isImportedNutrient)
      .map((nutrient, index) => ({
        key: nutrient.sourceNutrientId ?? `${nutrient.name}-${index}`,
        label: nutrientLabels[nutrient.name] ?? nutrient.name,
        value: `${formatNutrientValue(nutrient.value)} ${nutrient.unit}`
      }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }

  return Object.entries(metadata)
    .filter(([key, value]) => !metadataDisplayBlocklist.has(key) && typeof value === "number")
    .map(([key, value]) => ({
      key,
      label: nutrientLabels[key] ?? toTitleLabel(key),
      value: `${formatNutrientValue(value as number)} ${nutrientUnits[key] ?? inferNutrientUnit(key)}`
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

export function isImportedNutrient(value: unknown): value is { name: string; unit: string; value: number; sourceNutrientId?: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { name?: unknown; unit?: unknown; value?: unknown };

  return typeof candidate.name === "string" && typeof candidate.unit === "string" && typeof candidate.value === "number";
}

export function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((first, second) => first - second);
}

const metadataDisplayBlocklist = new Set(["source", "sourceId", "sourceVersion", "servingDescription", "nutrientsPer100g"]);

const nutrientLabels: Record<string, string> = {
  vitaminB1: "B1 (Thiamine)",
  vitaminB2: "B2 (Riboflavin)",
  vitaminB3: "B3 (Niacin)",
  vitaminB5: "B5 (Pantothenic Acid)",
  vitaminB6: "B6 (Pyridoxine)",
  vitaminB12: "B12 (Cobalamin)",
  folate: "Folate",
  vitaminA: "Vitamin A",
  vitaminC: "Vitamin C",
  vitaminD: "Vitamin D",
  vitaminE: "Vitamin E",
  vitaminK: "Vitamin K",
  calcium: "Calcium",
  copper: "Copper",
  iron: "Iron",
  magnesium: "Magnesium",
  manganese: "Manganese",
  phosphorus: "Phosphorus",
  potassium: "Potassium",
  selenium: "Selenium",
  sodium: "Sodium",
  zinc: "Zinc",
  cystine: "Cystine",
  histidine: "Histidine",
  isoleucine: "Isoleucine",
  leucine: "Leucine",
  lysine: "Lysine",
  methionine: "Methionine",
  phenylalanine: "Phenylalanine",
  threonine: "Threonine",
  tryptophan: "Tryptophan",
  tyrosine: "Tyrosine",
  valine: "Valine",
  monounsaturated: "Monounsaturated",
  polyunsaturated: "Polyunsaturated",
  omega3: "Omega-3",
  ala: "ALA",
  dha: "DHA",
  epa: "EPA",
  omega6: "Omega-6",
  aa: "AA",
  la: "LA",
  saturated: "Saturated Fat",
  transFats: "Trans Fats",
  cholesterol: "Cholesterol",
  starch: "Starch",
  sugars: "Sugars",
  addedSugars: "Added Sugars",
  sugarGrams: "Sugars",
  polyolsGrams: "Polyols",
  saturatedGrams: "Saturated Fat",
  polyunsaturatedGrams: "Polyunsaturated",
  monounsaturatedGrams: "Monounsaturated",
  saltGrams: "Salt"
};

const nutrientUnits: Record<string, string> = {
  vitaminA: "µg",
  vitaminD: "IU",
  vitaminK: "µg",
  folate: "µg",
  vitaminB12: "µg",
  selenium: "µg",
  calcium: "mg",
  copper: "mg",
  iron: "mg",
  magnesium: "mg",
  manganese: "mg",
  phosphorus: "mg",
  potassium: "mg",
  sodium: "mg",
  zinc: "mg",
  cholesterol: "mg"
};

export function inferNutrientUnit(key: string) {
  return key.endsWith("Grams") || key.toLowerCase().includes("fat") || key.toLowerCase().includes("sugar") ? "g" : "mg";
}

export function toTitleLabel(value: string) {
  return value
    .replace(/Grams$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatNutrientValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function getFoodImageSrc(name: string) {
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

function ListMacro({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className={cn("font-semibold", tone)}>{value}</span>
    </div>
  );
}
