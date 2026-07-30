"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";

interface ClientMeResponse {
  data?: {
    client: {
      id: string;
      name: string;
    };
    mealPlanAssignments: MealPlanAssignment[];
  };
  error?: {
    message?: string;
  };
}

interface MealPlanAssignment {
  id: string;
  name: string;
  status: string;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  snapshot: unknown;
}

interface NutritionPlan {
  id: string;
  name: string;
  status: string;
  targets: NutritionTotals;
  days: NutritionDay[];
}

interface NutritionDay {
  name: string;
  meals: NutritionMeal[];
}

interface NutritionMeal {
  key: string;
  meal: string;
  foods: NutritionFood[];
  recipe?: NutritionRecipe;
}

interface NutritionFood {
  foodName: string;
  servingSize: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

interface NutritionRecipe {
  instructionSteps: string[];
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

type LoadState = "loading" | "ready" | "error";
type MealDetailTab = "ingredients" | "recipe";

const zeroTotals: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0
};

export function ClientNutritionPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loggedMealKeysByDay, setLoggedMealKeysByDay] = useState<Record<string, string[]>>({});
  const [expandedMealKey, setExpandedMealKey] = useState<string | null>(null);
  const [mealDetailTab, setMealDetailTab] = useState<MealDetailTab>("ingredients");

  useEffect(() => {
    let mounted = true;

    async function loadClientNutrition() {
      try {
        const response = await fetch("/api/v1/client/me");
        const payload = (await response.json().catch(() => null)) as ClientMeResponse | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "Your nutrition plan could not be loaded.");
        }

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        setPlans(payload.data.mealPlanAssignments.map(normalizeMealPlanAssignment));
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Your nutrition plan could not be loaded.");
        setLoadState("error");
      }
    }

    void loadClientNutrition();

    return () => {
      mounted = false;
    };
  }, []);

  const activePlan = useMemo(() => plans.find((plan) => plan.status === "active") ?? plans[0] ?? null, [plans]);
  const activeDay = activePlan?.days[Math.min(activeDayIndex, Math.max(activePlan.days.length - 1, 0))] ?? null;
  const activeDayKey = activePlan && activeDay ? `${activePlan.id}:${activeDay.name}` : "";
  const loggedMealKeys = loggedMealKeysByDay[activeDayKey] ?? [];
  const loggedTotals = calculateLoggedDayTotals(activeDay, loggedMealKeys);

  useEffect(() => {
    if (activePlan && activeDayIndex > activePlan.days.length - 1) {
      setActiveDayIndex(0);
    }
  }, [activeDayIndex, activePlan]);

  useEffect(() => {
    setExpandedMealKey(null);
    setMealDetailTab("ingredients");
  }, [activeDayKey]);

  function toggleMealLogged(mealKey: string) {
    setLoggedMealKeysByDay((current) => {
      const currentKeys = current[activeDayKey] ?? [];
      const nextKeys = currentKeys.includes(mealKey)
        ? currentKeys.filter((key) => key !== mealKey)
        : [...currentKeys, mealKey];

      return {
        ...current,
        [activeDayKey]: nextKeys
      };
    });
  }

  function openMeal(mealKey: string) {
    setExpandedMealKey((currentMealKey) => currentMealKey === mealKey ? null : mealKey);
    setMealDetailTab("ingredients");
  }

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9f8] px-6">
        <div role="status" aria-label="Loading nutrition" className="text-sm font-bold text-[#1b1c1c]">
          Loading nutrition
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

  return (
    <main className="min-h-screen bg-[#fbf9f8] px-4 py-5 text-[#1b1c1c] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <ClientNutritionTabs />
        <header className="space-y-1 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">Nutrition</p>
          <h1 className="text-3xl font-black tracking-normal">{activePlan?.name ?? "Nutrition plan"}</h1>
          <p className="text-sm font-semibold text-[#6f6a66]">{clientName}</p>
        </header>

        {activePlan && activeDay ? (
          <>
            <nav aria-label="Nutrition days" className="-mx-4 overflow-x-auto px-4">
              <div className="flex min-w-max gap-2">
                {activePlan.days.map((day, index) => (
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
                    {day.name}
                  </button>
                ))}
              </div>
            </nav>

            <NutritionProgress targets={activePlan.targets} totals={loggedTotals} />

            <section aria-label={`${activeDay.name} meals`} className="space-y-3">
              {activeDay.meals.map((meal) => {
                const logged = loggedMealKeys.includes(meal.key);
                const expanded = expandedMealKey === meal.key;

                return (
                  <div key={meal.key} className="space-y-3">
                    <MealCard
                      meal={meal}
                      logged={logged}
                      onOpen={() => openMeal(meal.key)}
                      onLog={() => toggleMealLogged(meal.key)}
                    />
                    {expanded ? (
                      <MealDetailsCard
                        meal={meal}
                        activeTab={mealDetailTab}
                        onTabChange={setMealDetailTab}
                      />
                    ) : null}
                  </div>
                );
              })}
            </section>
          </>
        ) : (
          <EmptyNutritionMessage message="No active meal plan has been assigned yet." />
        )}
      </div>
    </main>
  );
}

function ClientNutritionTabs() {
  return (
    <nav aria-label="Client app tabs" className="grid grid-cols-2 gap-2 rounded-full bg-white p-1 shadow-[0_10px_30px_rgba(27,28,28,0.06)]">
      <Link href="/workout" className="rounded-full px-4 py-3 text-center text-sm font-black text-[#6f6a66]">
        Workout
      </Link>
      <Link href="/nutrition" aria-current="page" className="rounded-full bg-[#3620b8] px-4 py-3 text-center text-sm font-black text-white">
        Nutrition
      </Link>
    </nav>
  );
}

function NutritionProgress({ targets, totals }: { targets: NutritionTotals; totals: NutritionTotals }) {
  const caloriesRemaining = Math.max(targets.calories - totals.calories, 0);

  return (
    <section className="space-y-3" aria-label="Daily nutrition totals">
      <div aria-label="Calories remaining" className="rounded-[1.35rem] bg-[#3620b8] px-4 py-3 text-white shadow-[0_14px_36px_rgba(54,32,184,0.18)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-white/70">Calories remaining</p>
            <p className="mt-1 text-3xl font-black leading-none">{formatNumber(caloriesRemaining)}</p>
          </div>
          <p className="pb-1 text-sm font-black text-white/80">{formatNumber(totals.calories)} / {formatNumber(targets.calories)} kcal</p>
        </div>
        <ProgressBar current={totals.calories} target={targets.calories} className="mt-3 bg-white/20" />
      </div>

      <div role="region" aria-label="Nutrition progress" className="grid grid-cols-2 gap-3">
        <MacroProgressCard label="Protein" current={totals.protein} target={targets.protein} unit="g" />
        <MacroProgressCard label="Carbs" current={totals.carbs} target={targets.carbs} unit="g" />
        <MacroProgressCard label="Fat" current={totals.fat} target={targets.fat} unit="g" />
        <MacroProgressCard label="Fibre" current={totals.fibre} target={targets.fibre} unit="g" />
      </div>
    </section>
  );
}

function MacroProgressCard({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  return (
    <div aria-label={`${label} progress`} className="rounded-[1.1rem] bg-white p-3 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
      <p className="text-xs font-extrabold uppercase tracking-wide text-[#6f6a66]">{label}</p>
      <p className="mt-1 text-base font-black text-[#1b1c1c]">
        {formatNumber(current)} / {formatNumber(target)}{unit}
      </p>
      <ProgressBar current={current} target={target} className="mt-2 bg-[#ede9e5]" />
    </div>
  );
}

function ProgressBar({ current, target, className }: { current: number; target: number; className?: string }) {
  const percentage = target > 0 ? Math.min(Math.max((current / target) * 100, 0), 100) : 0;

  return (
    <div className={cn("h-2 overflow-hidden rounded-full", className)}>
      <div className="h-full rounded-full bg-[#8fe36c]" style={{ width: `${percentage}%` }} />
    </div>
  );
}

function MealCard({ meal, logged, onOpen, onLog }: { meal: NutritionMeal; logged: boolean; onOpen: () => void; onLog: () => void }) {
  const totals = calculateMealTotals(meal);

  return (
    <article className="rounded-[1.65rem] bg-white p-4 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpen} aria-label={`Open ${meal.meal}`} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-base font-black text-[#1b1c1c]">{meal.meal}</span>
          <span className="mt-1 block text-sm font-bold text-[#6f6a66]">
            {formatNumber(totals.calories)} kcal • {meal.foods.length} ingredients
          </span>
        </button>
        <button
          type="button"
          onClick={onLog}
          aria-label={`${logged ? "Remove" : "Log"} ${meal.meal}`}
          className={cn(
            "inline-flex h-10 flex-none items-center gap-2 rounded-full px-3 text-sm font-black transition",
            logged ? "bg-emerald-500 text-white" : "bg-[#f5f3f3] text-[#3620b8]"
          )}
        >
          {logged ? <Check aria-hidden="true" className="size-4" /> : null}
          {logged ? "Logged" : "Log"}
        </button>
        <ChevronRight aria-hidden="true" className="size-5 flex-none text-[#c8c3bf]" />
      </div>
    </article>
  );
}

function MealDetailsCard({
  meal,
  activeTab,
  onTabChange
}: {
  meal: NutritionMeal;
  activeTab: MealDetailTab;
  onTabChange: (tab: MealDetailTab) => void;
}) {
  const hasRecipe = Boolean(meal.recipe?.instructionSteps.length);
  const visibleTab = hasRecipe ? activeTab : "ingredients";

  return (
    <section role="region" aria-label={`${meal.meal} details`} className="rounded-[1.65rem] bg-white p-4 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div role="tablist" aria-label={`${meal.meal} sections`} className="grid grid-cols-2 gap-2 rounded-full bg-[#f5f3f3] p-1">
        <button
          type="button"
          role="tab"
          aria-selected={visibleTab === "ingredients"}
          onClick={() => onTabChange("ingredients")}
          className={cn(
            "rounded-full px-3 py-2 text-sm font-black",
            visibleTab === "ingredients" ? "bg-white text-[#1b1c1c] shadow-sm" : "text-[#6f6a66]"
          )}
        >
          Ingredients
        </button>
        {hasRecipe ? (
          <button
            type="button"
            role="tab"
            aria-selected={visibleTab === "recipe"}
            onClick={() => onTabChange("recipe")}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-black",
              visibleTab === "recipe" ? "bg-white text-[#1b1c1c] shadow-sm" : "text-[#6f6a66]"
            )}
          >
            Recipe
          </button>
        ) : null}
      </div>

      {visibleTab === "ingredients" ? (
        <div role="tabpanel" aria-label="Ingredients" className="mt-4 space-y-3">
          {meal.foods.map((food, index) => (
            <div key={`${food.foodName}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-[#f5f3f3] px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#1b1c1c]">{food.foodName}</p>
                <p className="mt-1 text-xs font-bold text-[#6f6a66]">{food.servingSize}</p>
              </div>
              <p className="text-sm font-black text-[#1b1c1c]">{formatNumber(food.calories)} kcal</p>
            </div>
          ))}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Recipe" className="mt-4 space-y-3">
          {meal.recipe?.instructionSteps.map((step, index) => (
            <div key={`${step}-${index}`} className="rounded-2xl bg-[#f5f3f3] px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-[#6f6a66]">Step {index + 1}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#1b1c1c]">{step}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyNutritionMessage({ message }: { message: string }) {
  return (
    <div className="rounded-[1.65rem] bg-white px-5 py-8 text-center text-sm font-bold text-[#6f6a66] shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      {message}
    </div>
  );
}

function normalizeMealPlanAssignment(assignment: MealPlanAssignment): NutritionPlan {
  const snapshot = isRecord(assignment.snapshot) ? assignment.snapshot : {};
  const snapshotTemplate = isRecord(snapshot.template) ? snapshot.template : {};
  const targets = {
    calories: getNumber(snapshot.targetCalories) ?? assignment.targetCalories ?? 0,
    protein: getNumber(snapshot.proteinGrams) ?? assignment.proteinGrams ?? 0,
    carbs: getNumber(snapshot.carbsGrams) ?? assignment.carbsGrams ?? 0,
    fat: getNumber(snapshot.fatGrams) ?? assignment.fatGrams ?? 0,
    fibre: getNumber(snapshot.fibreGrams) ?? getNumber(snapshot.fiberGrams) ?? 0
  };
  const days = Array.isArray(snapshotTemplate.days) ? snapshotTemplate.days : [];

  return {
    id: assignment.id,
    name: getString(snapshot.templateName) ?? assignment.name ?? "Nutrition plan",
    status: assignment.status,
    targets,
    days: days.flatMap((day, dayIndex) => normalizeNutritionDay(day, dayIndex))
  };
}

function normalizeNutritionDay(day: unknown, dayIndex: number): NutritionDay[] {
  if (!isRecord(day)) {
    return [];
  }

  const meals = Array.isArray(day.meals) ? day.meals : [];
  const name = getString(day.name) ?? `Day ${dayIndex + 1}`;

  return [{
    name,
    meals: meals.flatMap((meal, mealIndex) => normalizeNutritionMeal(meal, name, mealIndex))
  }];
}

function normalizeNutritionMeal(meal: unknown, dayName: string, mealIndex: number): NutritionMeal[] {
  if (!isRecord(meal)) {
    return [];
  }

  const mealName = getString(meal.meal) ?? getString(meal.name) ?? `Meal ${mealIndex + 1}`;
  const foods = Array.isArray(meal.foods) ? meal.foods.flatMap(normalizeNutritionFood) : [];
  const recipe = normalizeRecipe(meal.recipe);

  return [{
    key: `${dayName}:${mealName}:${mealIndex}`,
    meal: mealName,
    foods,
    recipe
  }];
}

function normalizeNutritionFood(food: unknown): NutritionFood[] {
  if (!isRecord(food)) {
    return [];
  }

  const foodName = getString(food.foodName) ?? getString(food.name);

  if (!foodName) {
    return [];
  }

  return [{
    foodName,
    servingSize: getString(food.servingSize) ?? "",
    calories: getNumber(food.calories) ?? 0,
    proteinGrams: getNumber(food.proteinGrams) ?? 0,
    carbsGrams: getNumber(food.carbsGrams) ?? 0,
    fatGrams: getNumber(food.fatGrams) ?? 0,
    fiberGrams: getNumber(food.fiberGrams) ?? getNumber(food.fibreGrams) ?? 0
  }];
}

function normalizeRecipe(recipe: unknown): NutritionRecipe | undefined {
  if (!isRecord(recipe)) {
    return undefined;
  }

  const instructionSteps = Array.isArray(recipe.instructionSteps)
    ? recipe.instructionSteps.filter((step): step is string => typeof step === "string" && step.trim().length > 0)
    : getString(recipe.instructions)?.split(/\n+/u).filter((step) => step.trim().length > 0) ?? [];

  return instructionSteps.length > 0 ? { instructionSteps } : undefined;
}

function calculateLoggedDayTotals(day: NutritionDay | null, loggedMealKeys: string[]) {
  if (!day) {
    return zeroTotals;
  }

  return day.meals
    .filter((meal) => loggedMealKeys.includes(meal.key))
    .reduce((totals, meal) => addTotals(totals, calculateMealTotals(meal)), zeroTotals);
}

function calculateMealTotals(meal: NutritionMeal): NutritionTotals {
  return meal.foods.reduce(
    (totals, food) => addTotals(totals, {
      calories: food.calories,
      protein: food.proteinGrams,
      carbs: food.carbsGrams,
      fat: food.fatGrams,
      fibre: food.fiberGrams
    }),
    zeroTotals
  );
}

function addTotals(left: NutritionTotals, right: NutritionTotals): NutritionTotals {
  return {
    calories: left.calories + right.calories,
    protein: left.protein + right.protein,
    carbs: left.carbs + right.carbs,
    fat: left.fat + right.fat,
    fibre: left.fibre + right.fibre
  };
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number.parseFloat(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}
