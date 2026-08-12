"use client";

import { Check, ChevronRight, Droplets, Utensils } from "lucide-react";
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
      timezone?: string | null;
    };
    profile?: {
      waterTargetLitres?: number | null;
    } | null;
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

interface HydrationResponse {
  data?: {
    date: string;
    hydrationMl: number;
  };
}

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
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loggedMealKeysByDay, setLoggedMealKeysByDay] = useState<Record<string, string[]>>({});
  const [expandedMealKey, setExpandedMealKey] = useState<string | null>(null);
  const [mealDetailTab, setMealDetailTab] = useState<MealDetailTab>("ingredients");
  const [hydrationMl, setHydrationMl] = useState(0);
  const [hydrationTargetMl, setHydrationTargetMl] = useState(2500);
  const [hydrationDate, setHydrationDate] = useState(getTodayDateValue());

  useEffect(() => {
    let mounted = true;

    async function loadClientNutrition({ force = false }: { force?: boolean } = {}) {
      try {
        const payload = await getClientMe<ClientMeResponse>({ force });

        if (!payload?.data) {
          throw new Error(payload?.error?.message ?? "Your nutrition plan could not be loaded.");
        }

        const nextHydrationDate = getTodayDateValue(payload.data.client.timezone ?? undefined);
        const targetLitres = payload.data.profile?.waterTargetLitres;
        const hydrationResponse = await fetch(`/api/v1/client/hydration?date=${nextHydrationDate}`);
        const hydrationPayload = (await hydrationResponse.json().catch(() => null)) as HydrationResponse | null;

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        setHydrationDate(nextHydrationDate);
        setHydrationTargetMl(targetLitres ? Math.round(targetLitres * 1000) : 2500);
        setHydrationMl(hydrationResponse.ok && typeof hydrationPayload?.data?.hydrationMl === "number" ? hydrationPayload.data.hydrationMl : 0);
        const nextPlans = payload.data.mealPlanAssignments.map(normalizeMealPlanAssignment);
        const defaultPlanId = nextPlans.find((plan) => plan.status === "active")?.id ?? nextPlans[0]?.id ?? "";

        setPlans(nextPlans);
        setSelectedPlanId((currentPlanId) => nextPlans.some((plan) => plan.id === currentPlanId) ? currentPlanId : defaultPlanId);
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

    const refreshClientNutrition = () => {
      if (document.visibilityState === "visible") {
        void loadClientNutrition({ force: true });
      }
    };

    window.addEventListener("focus", refreshClientNutrition);
    document.addEventListener("visibilitychange", refreshClientNutrition);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshClientNutrition);
      document.removeEventListener("visibilitychange", refreshClientNutrition);
    };
  }, []);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans.find((plan) => plan.status === "active") ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );
  const activeDay = activePlan?.days[Math.min(activeDayIndex, Math.max(activePlan.days.length - 1, 0))] ?? null;
  const activeDayKey = activePlan && activeDay ? `${activePlan.id}:${activeDay.name}` : "";
  const loggedMealKeys = loggedMealKeysByDay[activeDayKey] ?? [];
  const loggedTotals = calculateLoggedDayTotals(activeDay, loggedMealKeys);

  useEffect(() => {
    if (activePlan && activeDayIndex > activePlan.days.length - 1) {
      queueMicrotask(() => setActiveDayIndex(0));
    }
  }, [activeDayIndex, activePlan]);

  useEffect(() => {
    queueMicrotask(() => {
      setExpandedMealKey(null);
      setMealDetailTab("ingredients");
    });
  }, [activeDayKey]);

  function selectMealPlan(planId: string) {
    setSelectedPlanId(planId);
    setActiveDayIndex(0);
    setExpandedMealKey(null);
    setMealDetailTab("ingredients");
  }

  function toggleMealLogged(mealKey: string) {
    setLoggedMealKeysByDay((current) => {
      const currentKeys = current[activeDayKey] ?? [];
      const nextKeys = currentKeys.includes(mealKey)
        ? currentKeys.filter((key) => key !== mealKey)
        : [...currentKeys, mealKey];
      const nextStatus = nextKeys.length > 0 ? "completed" : "missed";

      void saveClientActivityLog({
        domain: "nutrition",
        status: nextStatus,
        notes: nextKeys.length > 0
          ? `${nextKeys.length} meal${nextKeys.length === 1 ? "" : "s"} logged for ${activeDay?.name ?? "today"}.`
          : `No meals logged for ${activeDay?.name ?? "today"}.`
      }).catch(() => undefined);

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

  async function addHydration(amountMl: number) {
    const previousHydrationMl = hydrationMl;
    const optimisticHydrationMl = Math.min(hydrationMl + amountMl, 20_000);

    setHydrationMl(optimisticHydrationMl);

    try {
      const response = await fetch("/api/v1/client/hydration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: hydrationDate, amountMl })
      });
      const payload = (await response.json().catch(() => null)) as HydrationResponse | null;

      if (!response.ok || typeof payload?.data?.hydrationMl !== "number") {
        throw new Error("Hydration could not be saved.");
      }

      setHydrationMl(payload.data.hydrationMl);
    } catch {
      setHydrationMl(previousHydrationMl);
    }
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
    <ClientMobileShell title="MCP" avatarLabel={clientName || "CC"}>
      <div className="flex flex-col gap-8">
        <ClientSectionHeading eyebrow="Fueling performance" title="Daily Fuel Plan">
          <h2 className="sr-only">{activePlan?.name ?? "Nutrition plan"}</h2>
          <p className="text-sm font-semibold leading-6 text-[#777584]">{activePlan?.name ?? "Nutrition plan"} • {clientName}</p>
        </ClientSectionHeading>

        {activePlan && activeDay ? (
          <>
            <MealPlanSwitcher plans={plans} selectedPlanId={activePlan.id} onSelectPlan={selectMealPlan} />

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
                        ? "bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-white shadow-[0_10px_30px_rgba(54,32,184,0.18)]"
                        : "bg-white text-[#777584] shadow-[0_10px_24px_rgba(27,28,28,0.04)]"
                    )}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </nav>

            <NutritionProgress targets={activePlan.targets} totals={loggedTotals} />
            <HydrationProgress hydrationMl={hydrationMl} targetMl={hydrationTargetMl} onAddHydration={(amountMl) => void addHydration(amountMl)} />

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
    </ClientMobileShell>
  );
}

function MealPlanSwitcher({
  plans,
  selectedPlanId,
  onSelectPlan
}: {
  plans: NutritionPlan[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
}) {
  return (
    <section aria-label="Meal plan switcher" className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <label htmlFor="client-meal-plan-select" className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">
        Meal plan
      </label>
      <div className="mt-3">
        <select
          id="client-meal-plan-select"
          value={selectedPlanId}
          onChange={(event) => onSelectPlan(event.target.value)}
          className="h-14 w-full rounded-[1.25rem] border-0 bg-[#f5f3f3] px-4 text-base font-black text-[#1b1c1c] outline-none ring-2 ring-transparent transition focus:ring-[#3620b8]"
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}{plan.status === "active" ? " (active)" : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#777584]">
        Switch between meal plans your coach has built for you.
      </p>
    </section>
  );
}

function NutritionProgress({ targets, totals }: { targets: NutritionTotals; totals: NutritionTotals }) {
  const caloriesRemaining = Math.max(targets.calories - totals.calories, 0);

  return (
    <section className="space-y-3" aria-label="Daily nutrition totals">
      <div aria-label="Calories remaining" className="relative overflow-hidden rounded-[1.65rem] bg-white p-7 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
        <Utensils aria-hidden="true" className="absolute right-6 top-6 size-20 text-[#e9e8e7]" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#777584]">Calories remaining</p>
            <p className="mt-3 text-6xl font-black leading-none tracking-normal text-[#3620b8]">{formatNumber(caloriesRemaining)}</p>
          </div>
          <p className="relative z-10 pb-1 text-sm font-black text-[#777584]">{formatNumber(totals.calories)} / {formatNumber(targets.calories)} kcal</p>
        </div>
        <ProgressBar current={totals.calories} target={targets.calories} className="mt-5 bg-[#e9e8e7]" />
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

function HydrationProgress({
  hydrationMl,
  targetMl,
  onAddHydration
}: {
  hydrationMl: number;
  targetMl: number;
  onAddHydration: (amountMl: number) => void;
}) {
  return (
    <section aria-label="Hydration progress" className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="flex items-center gap-4">
        <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#e9f7ff] text-[#0284c7]">
          <Droplets aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#777584]">Hydration</p>
          <p className="mt-1 text-lg font-black text-[#1b1c1c]">
            {formatNumber(hydrationMl)}ml / {formatNumber(targetMl)}ml
          </p>
        </div>
      </div>
      <ProgressBar current={hydrationMl} target={targetMl} className="mt-4 bg-[#e9e8e7]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[250, 500].map((amountMl) => (
          <button
            key={amountMl}
            type="button"
            onClick={() => onAddHydration(amountMl)}
            className="h-12 rounded-[1.1rem] bg-[#f5f3f3] text-sm font-black text-[#3620b8] transition active:scale-95"
          >
            +{amountMl}ml
          </button>
        ))}
      </div>
    </section>
  );
}

function MacroProgressCard({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  return (
    <div aria-label={`${label} progress`} className="rounded-[1.35rem] bg-[#f5f3f3] p-4 shadow-[0_10px_30px_rgba(27,28,28,0.035)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#777584]">{label}</p>
      <p className="mt-2 text-base font-black text-[#1b1c1c]">
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
      <div className="h-full rounded-full bg-[#3620b8]" style={{ width: `${percentage}%` }} />
    </div>
  );
}

function MealCard({ meal, logged, onOpen, onLog }: { meal: NutritionMeal; logged: boolean; onOpen: () => void; onLog: () => void }) {
  const totals = calculateMealTotals(meal);

  return (
    <article className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onOpen} aria-label={`Open ${meal.meal}`} className="min-w-0 flex-1 text-left">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#f87600]">Planned meal</span>
          <span className="mt-2 block truncate text-lg font-black text-[#1b1c1c]">{meal.meal}</span>
          <span className="mt-1 block text-sm font-bold text-[#777584]">
            {formatNumber(totals.calories)} kcal • {formatNumber(totals.protein)}g protein • {meal.foods.length} ingredients
          </span>
        </button>
        <button
          type="button"
          onClick={onLog}
          aria-label={`${logged ? "Remove" : "Log"} ${meal.meal}`}
          className={cn(
            "inline-flex h-10 flex-none items-center gap-2 rounded-full px-3 text-sm font-black transition",
            logged ? "bg-[#f87600] text-white" : "bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-white shadow-[0_10px_24px_rgba(54,32,184,0.18)]"
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
    <section role="region" aria-label={`${meal.meal} details`} className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div role="tablist" aria-label={`${meal.meal} sections`} className="grid grid-cols-2 gap-2 rounded-full bg-[#f5f3f3] p-1">
        <button
          type="button"
          role="tab"
          aria-selected={visibleTab === "ingredients"}
          onClick={() => onTabChange("ingredients")}
          className={cn(
            "rounded-full px-3 py-2 text-sm font-black",
            visibleTab === "ingredients" ? "bg-white text-[#1b1c1c] shadow-sm" : "text-[#777584]"
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
              visibleTab === "recipe" ? "bg-white text-[#1b1c1c] shadow-sm" : "text-[#777584]"
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
                <p className="mt-1 text-xs font-bold text-[#777584]">{food.servingSize}</p>
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

function getTodayDateValue(timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}
