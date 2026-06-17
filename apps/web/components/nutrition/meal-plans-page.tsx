"use client";

import { Calendar, ClipboardCopy, Edit, Info, MoreVertical, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClientSummary } from "@/fixtures/clients";
import { foods, mealAssignments, mealTemplates, type Food } from "@/fixtures/nutrition";
import { SavedToast } from "@/components/ui/saved-toast";
import { cn } from "@/lib/utils";

type MealPlanTab = "Meal Plans" | "Meal Templates";
type NutritionPlanBuilderMode = "full" | "macro-day" | "macro-meal";
export type MealPlanSource = "api" | "fixtures";

type FoodDatabaseSource = "AUS / NZ" | "EFSA" | "USDA";

interface BuilderMeal {
  id: string;
  name: string;
  foods: BuilderFood[];
}

interface BuilderFood {
  id: string;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  quantity: number;
  micronutrients: Record<string, number>;
}

interface BuilderDay {
  id: string;
  name: string;
  meals: BuilderMeal[];
}

export interface ApiMealPlanTemplate {
  id: string;
  name: string;
  phase: string | null;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  status: "draft" | "published" | "archived";
  template: {
    days?: Array<{
      name: string;
      meals: Array<{
        meal: string;
        foods: Array<{
          foodId?: string;
          foodName: string;
          servingSize: string;
          calories: number;
          proteinGrams: number;
          carbsGrams: number;
          fatGrams: number;
        }>;
      }>;
    }>;
  };
  updatedAt: string;
}

export interface ApiMealPlanAssignment {
  id: string;
  clientId: string;
  clientName: string | null;
  templateId: string | null;
  name: string;
  phase: string | null;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  status: "active" | "paused" | "completed" | "cancelled";
  snapshot: {
    targetCalories?: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
  };
  startsOn: string;
  endsOn: string | null;
  updatedAt: string;
}

export interface MealTemplateCard {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  badge: string;
  apiTemplate: ApiMealPlanTemplate | null;
}

export interface MealAssignmentRow {
  id: string;
  planName: string;
  activeClientCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  lastEdited: string;
  status: string;
}

export function MealPlansPage() {
  const [activeTab, setActiveTab] = useState<MealPlanTab>("Meal Plans");
  const [templates, setTemplates] = useState<ApiMealPlanTemplate[]>([]);
  const [assignments, setAssignments] = useState<ApiMealPlanAssignment[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [createdPlans, setCreatedPlans] = useState<MealAssignmentRow[]>([]);
  const [createdTemplates, setCreatedTemplates] = useState<MealTemplateCard[]>([]);
  const [hiddenMealPlanIds, setHiddenMealPlanIds] = useState<string[]>([]);
  const [mealPlanOverrides, setMealPlanOverrides] = useState<Record<string, Partial<MealAssignmentRow>>>({});
  const [source, setSource] = useState<MealPlanSource>("fixtures");
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ApiMealPlanTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [builderMode, setBuilderMode] = useState<NutritionPlanBuilderMode | null>(null);
  const [editingPlan, setEditingPlan] = useState<MealAssignmentRow | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<MealAssignmentRow | null>(null);
  const [showPlanTypeDialog, setShowPlanTypeDialog] = useState(false);
  const [showMacroChoiceDialog, setShowMacroChoiceDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMealPlanLibrary() {
      try {
        const [templatesResponse, assignmentsResponse, clientsResponse] = await Promise.all([
          fetch("/api/v1/meal-plan-templates?limit=100"),
          fetch("/api/v1/meal-plan-assignments?limit=100"),
          fetch("/api/v1/clients?status=active&limit=100")
        ]);

        if (!templatesResponse.ok || !assignmentsResponse.ok || !clientsResponse.ok) {
          throw new Error("Meal plan API unavailable.");
        }

        const [templatesPayload, assignmentsPayload, clientsPayload] = await Promise.all([
          templatesResponse.json(),
          assignmentsResponse.json(),
          clientsResponse.json()
        ]);

        if (!cancelled) {
          setTemplates(Array.isArray(templatesPayload.data) ? templatesPayload.data : []);
          setAssignments(Array.isArray(assignmentsPayload.data) ? assignmentsPayload.data : []);
          setClients(Array.isArray(clientsPayload.data) ? clientsPayload.data : []);
          setSource("api");
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setAssignments([]);
          setClients([]);
          setSource("fixtures");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMealPlanLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  const templateCards = useMemo(() => [...createdTemplates, ...getMealTemplateCards(source, templates)], [createdTemplates, source, templates]);
  const assignmentRows = useMemo(
    () =>
      [...createdPlans, ...getMealAssignmentRows(source, assignments)]
        .filter((assignment) => !hiddenMealPlanIds.includes(assignment.id))
        .map((assignment) => ({ ...assignment, ...(mealPlanOverrides[assignment.id] ?? {}) })),
    [assignments, createdPlans, hiddenMealPlanIds, mealPlanOverrides, source]
  );

  function openPlanTypeDialog() {
    setStatusMessage(null);
    setErrorMessage(null);
    setShowPlanTypeDialog(true);
  }

  function saveNutritionPlan(plan: MealAssignmentRow) {
    setCreatedPlans((currentPlans) => [plan, ...currentPlans]);
    setEditingPlan(null);
    setShowPlanTypeDialog(false);
    setShowMacroChoiceDialog(false);
    setActiveTab("Meal Plans");
    setStatusMessage("Nutrition plan saved.");
  }

  function createMealTemplate(template: MealTemplateCard) {
    setCreatedTemplates((currentTemplates) => [template, ...currentTemplates]);
    setStatusMessage(`${template.name} saved to Meal Templates.`);
  }

  function editMealPlan(assignment: MealAssignmentRow) {
    setEditingPlan(assignment);
    setBuilderMode("full");
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function deleteMealPlan(assignment: MealAssignmentRow) {
    setCreatedPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== assignment.id));
    setHiddenMealPlanIds((currentIds) => [...currentIds, assignment.id]);
    setAssignmentTarget((currentTarget) => (currentTarget?.id === assignment.id ? null : currentTarget));
    setStatusMessage(`${assignment.planName} deleted from Meal Plans.`);
  }

  function copyMealPlan(assignment: MealAssignmentRow) {
    const copiedPlan: MealAssignmentRow = {
      ...assignment,
      id: `local-meal-plan-copy-${Date.now()}`,
      planName: `${assignment.planName} (copy)`,
      activeClientCount: 0,
      lastEdited: "Just now",
      status: "draft"
    };

    setCreatedPlans((currentPlans) => [copiedPlan, ...currentPlans]);
    setActiveTab("Meal Plans");
    setStatusMessage(`${copiedPlan.planName} added to Meal Plans.`);
  }

  function assignMealPlanToClient(assignment: MealAssignmentRow, client: ClientSummary) {
    setMealPlanOverrides((currentOverrides) => ({
      ...currentOverrides,
      [assignment.id]: {
        activeClientCount: assignment.activeClientCount + 1,
        status: "active",
        lastEdited: "Just now"
      }
    }));
    setAssignmentTarget(null);
    setActiveTab("Meal Plans");
    setStatusMessage(`${assignment.planName} assigned to ${client.name}.`);
  }

  async function assignTemplate() {
    if (!selectedTemplate || !selectedClientId) {
      setErrorMessage("Select a client before assigning the meal plan.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const startsOn = new Date().toISOString().slice(0, 10);
      const response = await fetch("/api/v1/meal-plan-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          templateId: selectedTemplate.id,
          name: selectedTemplate.name,
          startsOn
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Meal plan could not be assigned.");
      }

      setAssignments((currentAssignments) => [payload.data, ...currentAssignments]);
      setSelectedTemplate(null);
      setSelectedClientId("");
      setActiveTab("Meal Plans");
      setStatusMessage("Meal plan assigned to client.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Meal plan could not be assigned.");
    } finally {
      setSaving(false);
    }
  }

  if (builderMode) {
    return (
      <>
        {statusMessage ? <SavedToast message={statusMessage} /> : null}
        {errorMessage ? <p className="fixed right-6 top-6 z-[80] rounded-lg bg-red-50 p-3 text-sm text-red-700 shadow-xl">{errorMessage}</p> : null}
        <NutritionPlanBuilder
          mode={builderMode}
          initialPlan={editingPlan}
          availableTemplates={templateCards.length > 0 ? templateCards : getMealTemplateCards("fixtures", [])}
          onBack={() => {
            setBuilderMode(null);
            setEditingPlan(null);
            setActiveTab("Meal Plans");
          }}
          onSave={saveNutritionPlan}
          onCreateMealTemplate={createMealTemplate}
        />
      </>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Meal Plan Library</h1>
            <p className="text-gray-600">Manage client nutrition protocols</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              disabled={saving}
              onClick={openPlanTypeDialog}
            >
              <Plus className="size-4" aria-hidden="true" />
              Create New Nutritional Plan
            </button>
          </div>
        </div>
      </div>

      {loading ? <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Loading persisted meal plan library...</p> : null}
      {source === "fixtures" && !loading ? (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Meal plan persistence API unavailable. Showing fixture meal plan library.
        </p>
      ) : null}
      {statusMessage ? <SavedToast message={statusMessage} /> : null}
      {errorMessage ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div role="tablist" aria-label="Meal plan sections" className="flex items-center gap-8 border-b border-gray-200">
          {(["Meal Plans", "Meal Templates"] as MealPlanTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={cn(
                "border-b-2 pb-3 text-sm font-medium transition-colors",
                activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-600 hover:text-gray-900"
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "Meal Plans" ? (
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All Plans</button>
        ) : null}
      </div>

      {activeTab === "Meal Plans" ? (
        <ActiveAssignmentsPanel
          assignments={assignmentRows}
          onEdit={editMealPlan}
          onDelete={deleteMealPlan}
          onCopy={copyMealPlan}
          onAssign={setAssignmentTarget}
        />
      ) : (
        <MasterTemplatesPanel
          templates={templateCards}
          canAssign={source === "api"}
          onUseTemplate={(template) => {
            if (template.apiTemplate) {
              setSelectedTemplate(template.apiTemplate);
              setErrorMessage(null);
            }
          }}
        />
      )}

      {selectedTemplate ? (
        <TemplateAssignmentDialog
          clients={clients}
          templateName={selectedTemplate.name}
          selectedClientId={selectedClientId}
          saving={saving}
          onClientChange={setSelectedClientId}
          onClose={() => {
            setSelectedTemplate(null);
            setSelectedClientId("");
          }}
          onSubmit={assignTemplate}
        />
      ) : null}

      {assignmentTarget ? (
        <MealPlanAssignmentDialog
          target={assignmentTarget}
          clients={clients}
          onClose={() => setAssignmentTarget(null)}
          onAssign={(client) => assignMealPlanToClient(assignmentTarget, client)}
        />
      ) : null}

      {showPlanTypeDialog ? (
        <CreateNutritionPlanDialog
          onClose={() => setShowPlanTypeDialog(false)}
          onFullPlan={() => {
            setShowPlanTypeDialog(false);
            setEditingPlan(null);
            setBuilderMode("full");
          }}
          onMacroOnly={() => {
            setShowPlanTypeDialog(false);
            setShowMacroChoiceDialog(true);
          }}
        />
      ) : null}

      {showMacroChoiceDialog ? (
        <MacroPlanChoiceDialog
          onClose={() => setShowMacroChoiceDialog(false)}
          onDailyTotals={() => {
            setShowMacroChoiceDialog(false);
            setEditingPlan(null);
            setBuilderMode("macro-day");
          }}
          onEachMeal={() => {
            setShowMacroChoiceDialog(false);
            setEditingPlan(null);
            setBuilderMode("macro-meal");
          }}
        />
      ) : null}
    </div>
  );
}

function CreateNutritionPlanDialog({
  onClose,
  onFullPlan,
  onMacroOnly
}: {
  onClose: () => void;
  onFullPlan: () => void;
  onMacroOnly: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create new nutritional plan"
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Nutrition builder</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Create new nutritional plan</h2>
            <p className="mt-2 text-sm text-slate-500">Choose whether you want to build a full food-based plan or set macro targets only.</p>
          </div>
          <button type="button" aria-label="Close create nutritional plan" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            aria-label="Full Meal Plan"
            className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-100"
            onClick={onFullPlan}
          >
            <span className="text-lg font-black text-slate-950">Full Meal Plan</span>
            <span className="mt-2 block text-sm text-slate-600">Build days, meals, foods, notes, tags, and full nutrition targets.</span>
          </button>
          <button
            type="button"
            aria-label="Macro Only Meal Plan"
            className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-100"
            onClick={onMacroOnly}
          >
            <span className="text-lg font-black text-slate-950">Macro Only Meal Plan</span>
            <span className="mt-2 block text-sm text-slate-600">Set macro targets for the day or per meal without assigning foods.</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MacroPlanChoiceDialog({
  onClose,
  onDailyTotals,
  onEachMeal
}: {
  onClose: () => void;
  onDailyTotals: () => void;
  onEachMeal: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose macro plan type"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Do you want to create macros for each meal or daily totals?</h2>
            <Info className="mt-3 size-7 text-blue-500" aria-hidden="true" />
          </div>
          <button type="button" aria-label="Close macro plan type" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="rounded-xl bg-blue-50 px-5 py-4 text-sm font-bold text-blue-600 hover:bg-blue-100" onClick={onDailyTotals}>
            Total For Day
          </button>
          <button type="button" className="rounded-xl bg-blue-500 px-5 py-4 text-sm font-bold text-white hover:bg-blue-600" onClick={onEachMeal}>
            Each Meal
          </button>
        </div>
      </div>
    </div>
  );
}

function NutritionPlanBuilder({
  mode,
  initialPlan,
  availableTemplates,
  onBack,
  onSave,
  onCreateMealTemplate
}: {
  mode: NutritionPlanBuilderMode;
  initialPlan?: MealAssignmentRow | null;
  availableTemplates: MealTemplateCard[];
  onBack: () => void;
  onSave: (plan: MealAssignmentRow) => void;
  onCreateMealTemplate: (template: MealTemplateCard) => void;
}) {
  const [title, setTitle] = useState(initialPlan?.planName ?? (mode === "full" ? "New Nutrition Plan" : "Macro Only Nutrition Plan"));
  const [dayName, setDayName] = useState("Day 1");
  const [protein, setProtein] = useState(String(initialPlan?.protein ?? 0));
  const [carbs, setCarbs] = useState(String(initialPlan?.carbs ?? 0));
  const [fats, setFats] = useState(String(initialPlan?.fats ?? 0));
  const [calories, setCalories] = useState(String(initialPlan?.calories ?? 0));
  const isFullPlan = mode === "full";
  const isMealMacroPlan = mode === "macro-meal";

  const savePlan = () => {
    const planName = title.trim() || (isFullPlan ? "New Nutrition Plan" : "Macro Only Nutrition Plan");
    onSave({
      id: `local_meal_plan_${Date.now()}`,
      planName,
      activeClientCount: 0,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      lastEdited: "Just now",
      status: "draft"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button type="button" className="text-sm font-bold text-indigo-600 hover:text-indigo-700" onClick={onBack}>
          Back to meal plans
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isFullPlan ? (
          <FullMealPlanFields
            title={title}
            setTitle={setTitle}
            protein={protein}
            carbs={carbs}
            fats={fats}
            calories={calories}
            setProtein={setProtein}
            setCarbs={setCarbs}
            setFats={setFats}
            setCalories={setCalories}
            availableTemplates={availableTemplates}
            onCreateMealTemplate={onCreateMealTemplate}
          />
        ) : (
          <MacroOnlyPlanFields
            title={title}
            setTitle={setTitle}
            dayName={dayName}
            setDayName={setDayName}
            protein={protein}
            setProtein={setProtein}
            carbs={carbs}
            setCarbs={setCarbs}
            fats={fats}
            setFats={setFats}
            calories={calories}
            setCalories={setCalories}
            showMealFields={isMealMacroPlan}
          />
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700" onClick={savePlan}>
            Save
          </button>
        </div>
      </section>
    </div>
  );
}

function FullMealPlanFields({
  title,
  setTitle,
  protein,
  carbs,
  fats,
  calories,
  setProtein,
  setCarbs,
  setFats,
  setCalories,
  availableTemplates,
  onCreateMealTemplate
}: {
  title: string;
  setTitle: (value: string) => void;
  protein: string;
  carbs: string;
  fats: string;
  calories: string;
  setProtein: (value: string) => void;
  setCarbs: (value: string) => void;
  setFats: (value: string) => void;
  setCalories: (value: string) => void;
  availableTemplates: MealTemplateCard[];
  onCreateMealTemplate: (template: MealTemplateCard) => void;
}) {
  const [days, setDays] = useState<BuilderDay[]>(() => [createBuilderDay(1)]);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activeFoodTarget, setActiveFoodTarget] = useState<{ dayId: string; mealId: string } | null>(null);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [openMealMenu, setOpenMealMenu] = useState<{ dayId: string; mealId: string } | null>(null);
  const [copyMealTarget, setCopyMealTarget] = useState<{ dayId: string; mealId: string } | null>(null);
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
  const [foodSource, setFoodSource] = useState<FoodDatabaseSource>("AUS / NZ");
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [showMealTemplateDialog, setShowMealTemplateDialog] = useState(false);
  const activeDay = days.find((day) => day.id === activeDayId) ?? days.at(-1);
  const dayTotals = calculateDayTotals(activeDay);
  const nutrientTotals = calculateNutrientTotals(activeDay);
  const activeDayIndex = Math.max(days.findIndex((day) => day.id === activeDay?.id), 0);

  const updateMealName = (dayId: string, mealId: string, name: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, name } : meal))
            }
          : day
      )
    );
  };

  const updateDayName = (dayId: string, name: string) => {
    setDays((currentDays) => currentDays.map((day) => (day.id === dayId ? { ...day, name } : day)));
  };

  const addMealToDay = (dayId = activeDay?.id) => {
    if (!dayId) {
      return;
    }

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: [...day.meals, createBuilderMeal(day.meals.length + 1)]
            }
          : day
      )
    );
  };

  const addDay = () => {
    const nextDay = createBuilderDay(days.length + 1);
    setDays((currentDays) => [...currentDays, nextDay]);
    setActiveDayId(nextDay.id);
    setDayMenuOpen(false);
  };

  const duplicateActiveDay = () => {
    if (!activeDay) {
      return;
    }

    const duplicatedDay = cloneBuilderDay(activeDay, `${activeDay.name} copy`);
    setDays((currentDays) => [...currentDays, duplicatedDay]);
    setActiveDayId(duplicatedDay.id);
    setDayMenuOpen(false);
  };

  const deleteActiveDay = () => {
    if (!activeDay || days.length <= 1) {
      setDayMenuOpen(false);
      return;
    }

    const activeIndex = days.findIndex((day) => day.id === activeDay.id);
    const nextActiveDay = days[activeIndex - 1] ?? days[activeIndex + 1] ?? days[0];
    setDays((currentDays) => currentDays.filter((day) => day.id !== activeDay.id));
    setActiveDayId(nextActiveDay.id);
    setDayMenuOpen(false);
  };

  const deleteMeal = (dayId: string, mealId: string) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.id === dayId ? { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) } : day))
    );
    setOpenMealMenu(null);
  };

  const createTemplateFromMeal = (meal: BuilderMeal) => {
    const totals = calculateMealTotals(meal);

    onCreateMealTemplate({
      id: `local-meal-template-${Date.now()}`,
      name: meal.name.trim() || "Untitled Meal Template",
      description: "Created from nutrition builder",
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fats: totals.fats,
      badge: "Custom",
      apiTemplate: null
    });
    setOpenMealMenu(null);
  };

  const copyMealToDay = (targetDayId: string) => {
    const sourceDay = days.find((day) => day.id === copyMealTarget?.dayId);
    const sourceMeal = sourceDay?.meals.find((meal) => meal.id === copyMealTarget?.mealId);

    if (!sourceMeal) {
      return;
    }

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === targetDayId
          ? {
              ...day,
              meals: [...day.meals, cloneBuilderMeal(sourceMeal, day.meals.length + 1)]
            }
          : day
      )
    );
    setActiveDayId(targetDayId);
    setCopyMealTarget(null);
    setOpenMealMenu(null);
  };

  const reorderMeal = (targetMealId: string) => {
    if (!activeDay || !draggedMealId || draggedMealId === targetMealId) {
      setDraggedMealId(null);
      return;
    }

    setDays((currentDays) =>
      currentDays.map((day) => {
        if (day.id !== activeDay.id) {
          return day;
        }

        const currentMeals = [...day.meals];
        const fromIndex = currentMeals.findIndex((meal) => meal.id === draggedMealId);
        const toIndex = currentMeals.findIndex((meal) => meal.id === targetMealId);

        if (fromIndex === -1 || toIndex === -1) {
          return day;
        }

        const [movedMeal] = currentMeals.splice(fromIndex, 1);
        currentMeals.splice(toIndex, 0, movedMeal);

        return { ...day, meals: currentMeals };
      })
    );
    setDraggedMealId(null);
  };

  const importTemplateIntoActiveDay = (template: MealTemplateCard) => {
    if (!activeDay) {
      return;
    }

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeDay.id
          ? {
              ...day,
              meals: [
                ...day.meals,
                {
                  id: `meal_${Date.now()}_${day.meals.length + 1}`,
                  name: template.name,
                  foods: [
                    {
                      id: `template_food_${template.id}_${Date.now()}`,
                      name: template.name,
                      serving: "Template meal",
                      calories: template.calories,
                      protein: template.protein,
                      carbs: template.carbs,
                      fats: template.fats,
                      fibre: 0,
                      quantity: 1,
                      micronutrients: {}
                    }
                  ]
                }
              ]
            }
          : day
      )
    );
    setShowMealTemplateDialog(false);
  };

  const addFoodToMeal = (foodId: string, quantity: number) => {
    const food = foods.find((item) => item.id === foodId);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    if (!food || !activeFoodTarget) {
      return;
    }

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeFoodTarget.dayId
          ? {
              ...day,
              meals: day.meals.map((meal) =>
                meal.id === activeFoodTarget.mealId ? { ...meal, foods: [...meal.foods, createBuilderFood(food, safeQuantity)] } : meal
              )
            }
          : day
      )
    );
    setCalories(String((Number(calories) || 0) + food.calories * safeQuantity));
    setProtein(String((Number(protein) || 0) + food.protein * safeQuantity));
    setCarbs(String((Number(carbs) || 0) + food.carbs * safeQuantity));
    setFats(String((Number(fats) || 0) + food.fats * safeQuantity));
    setActiveFoodTarget(null);
  };

  const updateFoodQuantity = (dayId: string, mealId: string, foodId: string, nextAmount: number) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: day.meals.map((meal) =>
                meal.id === mealId
                  ? {
                      ...meal,
                      foods: meal.foods.map((food) => (food.id === foodId ? rescaleBuilderFood(food, nextAmount) : food))
                    }
                  : meal
              )
            }
          : day
      )
    );
  };

  const filteredFoods = foods.filter((food) => food.name.toLowerCase().includes(foodSearchQuery.trim().toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-100">Complete Coach nutrition builder</p>
        <p className="mt-2 max-w-2xl text-sm text-indigo-50">
          Build day-by-day meal plans, pull foods from verified databases, and import proven meal templates without leaving the plan.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <h2 className="sr-only">{title}</h2>
          <label className="sr-only" htmlFor="full-nutrition-title">
            Nutrition plan title
          </label>
          <input
            id="full-nutrition-title"
            aria-label="Nutrition plan title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border-0 bg-white text-2xl font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <span className="text-xs font-black uppercase text-slate-700">DAY TOTAL</span>
          <MacroPill value={`${formatMacroValue(dayTotals.calories)} Kcal`} />
          <MacroPill value={`${formatMacroValue(dayTotals.protein)} g Protein`} />
          <MacroPill value={`${formatMacroValue(dayTotals.carbs)} g Carbs`} />
          <MacroPill value={`${formatMacroValue(dayTotals.fats)} g Fat`} />
          <MacroPill value={`${formatMacroValue(dayTotals.fibre)} g Fibre`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            aria-label="Day actions"
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200"
            onClick={() => setDayMenuOpen((isOpen) => !isOpen)}
          >
            ...
          </button>
          {dayMenuOpen ? (
            <div role="menu" className="absolute left-0 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                onClick={duplicateActiveDay}
              >
                Duplicate day
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={days.length <= 1}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                onClick={deleteActiveDay}
              >
                Delete day
              </button>
            </div>
          ) : null}
        </div>
        <div role="tablist" aria-label="Nutrition plan days" className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={day.id === activeDay?.id}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-bold",
                day.id === activeDay?.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              )}
              onClick={() => setActiveDayId(day.id)}
            >
              {day.name}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Add day" className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-100" onClick={addDay}>
          + Add day
        </button>
      </div>

      {activeDay ? (
        <div className="space-y-6">
          <section className="border-l border-dashed border-indigo-200 pl-6">
            <label className="mb-6 inline-flex border-b-2 border-indigo-500 pb-3">
              <span className="sr-only">Day name</span>
              <input
                aria-label={`Day name for Day ${activeDayIndex + 1}`}
                value={activeDay.name}
                className="w-48 border-0 bg-transparent text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-200"
                onChange={(event) => updateDayName(activeDay.id, event.target.value)}
              />
            </label>
            <div className="space-y-5">
              {activeDay.meals.map((meal, mealIndex) => (
                <article
                  key={meal.id}
                  aria-label={`Meal card ${meal.name}`}
                  draggable
                  onDragStart={() => setDraggedMealId(meal.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorderMeal(meal.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="grid flex-1 gap-2">
                      <span className="sr-only">Meal name</span>
                      <input
                        aria-label={`Meal name for ${activeDay.name} meal ${mealIndex + 1}`}
                        value={meal.name}
                        onChange={(event) => updateMealName(activeDay.id, meal.id, event.target.value)}
                        className="w-full rounded-lg border border-transparent bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Meal actions"
                        className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200"
                        onClick={() =>
                          setOpenMealMenu((currentMenu) =>
                            currentMenu?.mealId === meal.id ? null : { dayId: activeDay.id, mealId: meal.id }
                          )
                        }
                      >
                        ...
                      </button>
                      {openMealMenu?.mealId === meal.id ? (
                        <div role="menu" className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={() => createTemplateFromMeal(meal)}
                          >
                            Create meal template
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={() => setCopyMealTarget({ dayId: activeDay.id, mealId: meal.id })}
                          >
                            Copy to another day
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => deleteMeal(activeDay.id, meal.id)}
                          >
                            Delete meal
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Add food"
                    className="mt-4 text-sm font-bold uppercase text-indigo-500"
                    onClick={() => {
                      setActiveDayId(activeDay.id);
                      setActiveFoodTarget({ dayId: activeDay.id, mealId: meal.id });
                    }}
                  >
                    + Add food
                  </button>
                  {meal.foods.length > 0 ? (
                    <div role="table" aria-label={`${meal.name} foods`} className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                      <div role="row" className="grid grid-cols-7 gap-2 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        <span role="columnheader">Food</span>
                        <span role="columnheader">Quantity</span>
                        <span role="columnheader">Calories</span>
                        <span role="columnheader">Protein</span>
                        <span role="columnheader">Carbs</span>
                        <span role="columnheader">Fat</span>
                        <span role="columnheader">Fibre</span>
                      </div>
                      {meal.foods.map((food) => {
                        const quantityDisplay = getFoodQuantityDisplay(food);

                        return (
                          <div
                            key={food.id}
                            role="row"
                            aria-label={`${food.name} ${formatMacroValue(quantityDisplay.amount)} ${quantityDisplay.unit} ${formatMacroValue(food.calories)} kcal ${formatMacroValue(food.protein)}g protein ${formatMacroValue(food.carbs)}g carbs ${formatMacroValue(food.fats)}g fat ${formatMacroValue(food.fibre)}g fibre`}
                            className="grid grid-cols-7 gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700"
                          >
                            <span role="cell">
                              <span className="block font-bold text-slate-900">{food.name}</span>
                              <span className="block text-xs text-slate-500">{food.serving}</span>
                            </span>
                            <span role="cell" className="flex items-center gap-2">
                              <input
                                aria-label={`Quantity for ${food.name}`}
                                type="number"
                                min="0"
                                step="any"
                                value={formatQuantityInputValue(quantityDisplay.amount)}
                                className="w-16 rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-center text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                onChange={(event) => updateFoodQuantity(activeDay.id, meal.id, food.id, Number(event.target.value))}
                              />
                              <span className="text-sm font-bold text-slate-700">{quantityDisplay.unit}</span>
                            </span>
                            <span role="cell">{formatMacroValue(food.calories)} kcal</span>
                            <span role="cell">{formatMacroValue(food.protein)}g protein</span>
                            <span role="cell">{formatMacroValue(food.carbs)}g carbs</span>
                            <span role="cell">{formatMacroValue(food.fats)}g fat</span>
                            <span role="cell">{formatMacroValue(food.fibre)}g fibre</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <label className="mt-4 grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Notes</span>
                    <textarea className="min-h-16 rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Enter meal notes" />
                    <span className="text-xs text-slate-400">Please enter meal notes</span>
                  </label>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                aria-label="Add meal"
                className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-600"
                onClick={() => {
                  setActiveDayId(activeDay.id);
                  addMealToDay(activeDay.id);
                }}
              >
                + Add meal
              </button>
              <button
                type="button"
                aria-label="Add meal from template"
                className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-600"
                onClick={() => {
                  setActiveDayId(activeDay.id);
                  setShowMealTemplateDialog(true);
                }}
              >
                + Add meal from template
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea className="min-h-52 rounded-xl border border-slate-200 px-4 py-3 text-sm" />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Nutrition Plan Tags:</span>
        <input className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Enter nutrition plan tags" />
        <span className="text-xs text-slate-400">Please enter nutrition plan tags. Max length for a tag is 80 chars.</span>
      </label>

      <MicronutrientBreakdown totals={nutrientTotals} dayName={activeDay?.name ?? "Current day"} />

      {activeFoodTarget ? (
        <FoodDatabaseDrawer
          source={foodSource}
          searchQuery={foodSearchQuery}
          filteredFoods={filteredFoods}
          onSourceChange={setFoodSource}
          onSearchChange={setFoodSearchQuery}
          onAddFood={addFoodToMeal}
          onClose={() => setActiveFoodTarget(null)}
        />
      ) : null}

      {showMealTemplateDialog ? (
        <MealTemplateImportDialog templates={availableTemplates} onImport={importTemplateIntoActiveDay} onClose={() => setShowMealTemplateDialog(false)} />
      ) : null}

      {copyMealTarget ? (
        <CopyMealDialog
          days={days}
          sourceDayId={copyMealTarget.dayId}
          onCopy={copyMealToDay}
          onClose={() => {
            setCopyMealTarget(null);
            setOpenMealMenu(null);
          }}
        />
      ) : null}
    </div>
  );
}

function createBuilderDay(dayNumber: number): BuilderDay {
  return {
    id: `day_${dayNumber}_${Date.now()}`,
    name: `Day ${dayNumber}`,
    meals: [createBuilderMeal(1, "Main Meal")]
  };
}

function cloneBuilderDay(day: BuilderDay, name: string): BuilderDay {
  return {
    id: `day_copy_${Date.now()}`,
    name,
    meals: day.meals.map((meal, index) => cloneBuilderMeal(meal, index + 1))
  };
}

function createBuilderMeal(mealNumber: number, name = `Meal ${mealNumber}`): BuilderMeal {
  return {
    id: `meal_${mealNumber}_${Date.now()}`,
    name,
    foods: []
  };
}

function cloneBuilderMeal(meal: BuilderMeal, mealNumber: number): BuilderMeal {
  return {
    id: `meal_copy_${mealNumber}_${Date.now()}`,
    name: meal.name,
    foods: meal.foods.map((food) => ({
      ...food,
      id: `${food.id}_copy_${Date.now()}`
    }))
  };
}

function createBuilderFood(food: Food, quantity: number): BuilderFood {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const scaledMicronutrients = Object.fromEntries(
    Object.entries(food.micronutrients ?? {}).map(([key, value]) => [key, value * safeQuantity])
  );

  return {
    id: `${food.id}_${Date.now()}`,
    name: food.name,
    serving: food.serving,
    calories: food.calories * safeQuantity,
    protein: food.protein * safeQuantity,
    carbs: food.carbs * safeQuantity,
    fats: food.fats * safeQuantity,
    fibre: food.fibre * safeQuantity,
    quantity: safeQuantity,
    micronutrients: scaledMicronutrients
  };
}

function rescaleBuilderFood(food: BuilderFood, nextAmount: number): BuilderFood {
  const parsedServing = parseServingAmount(food.serving);
  const baseAmount = parsedServing?.amount ?? 1;
  const safeAmount = Number.isFinite(nextAmount) && nextAmount > 0 ? nextAmount : getFoodQuantityDisplay(food).amount;
  const nextQuantity = parsedServing ? safeAmount / baseAmount : safeAmount;
  const currentQuantity = food.quantity > 0 ? food.quantity : 1;
  const ratio = nextQuantity / currentQuantity;

  return {
    ...food,
    calories: food.calories * ratio,
    protein: food.protein * ratio,
    carbs: food.carbs * ratio,
    fats: food.fats * ratio,
    fibre: food.fibre * ratio,
    quantity: nextQuantity,
    micronutrients: Object.fromEntries(Object.entries(food.micronutrients).map(([key, value]) => [key, value * ratio]))
  };
}

function parseServingAmount(serving: string) {
  const match = serving.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|mL|millilitre|millilitres|milliliter|milliliters|oz|ounce|ounces)\b/i);

  if (!match) {
    return null;
  }

  return {
    amount: Number(match[1]),
    unit: normaliseServingUnit(match[2])
  };
}

function normaliseServingUnit(unit: string) {
  const lowerUnit = unit.toLowerCase();

  if (lowerUnit === "gram" || lowerUnit === "grams") {
    return "g";
  }

  if (["ml", "millilitre", "millilitres", "milliliter", "milliliters"].includes(lowerUnit)) {
    return "ml";
  }

  if (lowerUnit === "ounce" || lowerUnit === "ounces") {
    return "oz";
  }

  return lowerUnit;
}

function getFoodQuantityDisplay(food: BuilderFood) {
  const parsedServing = parseServingAmount(food.serving);

  if (!parsedServing) {
    return {
      amount: food.quantity,
      unit: food.quantity === 1 ? "serving" : "servings"
    };
  }

  return {
    amount: parsedServing.amount * food.quantity,
    unit: parsedServing.unit
  };
}

function formatQuantityInputValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function calculateMealTotals(meal: BuilderMeal) {
  return meal.foods.reduce(
    (totals, food) => ({
      calories: totals.calories + food.calories,
      protein: totals.protein + food.protein,
      carbs: totals.carbs + food.carbs,
      fats: totals.fats + food.fats
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

function calculateDayTotals(day?: BuilderDay) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fibre: 0
  };

  day?.meals.forEach((meal) => {
    meal.foods.forEach((food) => {
      totals.calories += food.calories;
      totals.protein += food.protein;
      totals.carbs += food.carbs;
      totals.fats += food.fats;
      totals.fibre += food.fibre;
    });
  });

  return totals;
}

function calculateNutrientTotals(day?: BuilderDay) {
  const macroTotals = calculateDayTotals(day);
  const totals: Record<string, number> = {
    protein: macroTotals.protein,
    carbs: macroTotals.carbs,
    netCarbs: Math.max(macroTotals.carbs - macroTotals.fibre, 0),
    fibre: macroTotals.fibre,
    fat: macroTotals.fats
  };

  day?.meals.forEach((meal) => {
    meal.foods.forEach((food) => {
      Object.entries(food.micronutrients).forEach(([key, value]) => {
        totals[key] = (totals[key] ?? 0) + value;
      });
    });
  });

  return totals;
}

function formatMacroValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

interface NutrientRowDefinition {
  key: string;
  label: string;
  unit: string;
  target?: number;
  unavailableLabel?: "N/T" | "n/a";
  indent?: boolean;
}

interface NutrientSectionDefinition {
  title: string;
  rows: NutrientRowDefinition[];
}

const NUTRIENT_SECTIONS: NutrientSectionDefinition[] = [
  {
    title: "Vitamins",
    rows: [
      { key: "vitaminB1", label: "B1 (Thiamine)", unit: "mg", target: 1.2 },
      { key: "vitaminB2", label: "B2 (Riboflavin)", unit: "mg", target: 1.3 },
      { key: "vitaminB3", label: "B3 (Niacin)", unit: "mg", target: 16 },
      { key: "vitaminB5", label: "B5 (Pantothenic Acid)", unit: "mg", target: 5 },
      { key: "vitaminB6", label: "B6 (Pyridoxine)", unit: "mg", target: 1.7 },
      { key: "vitaminB12", label: "B12 (Cobalamin)", unit: "µg", target: 2.4 },
      { key: "folate", label: "Folate", unit: "µg", target: 400 },
      { key: "vitaminA", label: "Vitamin A", unit: "µg", target: 900 },
      { key: "vitaminC", label: "Vitamin C", unit: "mg", target: 90 },
      { key: "vitaminD", label: "Vitamin D", unit: "IU", target: 600 },
      { key: "vitaminE", label: "Vitamin E", unit: "mg", target: 15 },
      { key: "vitaminK", label: "Vitamin K", unit: "µg", target: 120 }
    ]
  },
  {
    title: "Carbohydrates",
    rows: [
      { key: "carbs", label: "Carbs", unit: "g", target: 275 },
      { key: "netCarbs", label: "Net Carbs", unit: "g", target: 275, indent: true },
      { key: "fibre", label: "Fiber", unit: "g", target: 30, indent: true },
      { key: "insolubleFiber", label: "Insoluble Fiber", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "solubleFiber", label: "Soluble Fiber", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "starch", label: "Starch", unit: "g", unavailableLabel: "N/T" },
      { key: "sugars", label: "Sugars", unit: "g", unavailableLabel: "N/T" },
      { key: "addedSugars", label: "Added Sugars", unit: "g", unavailableLabel: "N/T" }
    ]
  },
  {
    title: "Lipids",
    rows: [
      { key: "fat", label: "Fat", unit: "g", target: 78 },
      { key: "monounsaturated", label: "Monounsaturated", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "polyunsaturated", label: "Polyunsaturated", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "omega3", label: "Omega-3", unit: "g", target: 1.6, indent: true },
      { key: "ala", label: "ALA", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "dha", label: "DHA", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "epa", label: "EPA", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "omega6", label: "Omega-6", unit: "g", target: 17, indent: true },
      { key: "aa", label: "AA", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "la", label: "LA", unit: "g", unavailableLabel: "N/T", indent: true },
      { key: "saturated", label: "Saturated", unit: "g", unavailableLabel: "n/a" },
      { key: "transFats", label: "Trans-Fats", unit: "g", unavailableLabel: "n/a" },
      { key: "cholesterol", label: "Cholesterol", unit: "mg", unavailableLabel: "N/T" }
    ]
  },
  {
    title: "Protein",
    rows: [
      { key: "protein", label: "Protein", unit: "g", target: 50 },
      { key: "cystine", label: "Cystine", unit: "g", target: 0.3, indent: true },
      { key: "histidine", label: "Histidine", unit: "g", target: 0.7, indent: true },
      { key: "isoleucine", label: "Isoleucine", unit: "g", target: 1.4, indent: true },
      { key: "leucine", label: "Leucine", unit: "g", target: 2.7, indent: true },
      { key: "lysine", label: "Lysine", unit: "g", target: 2.1, indent: true },
      { key: "methionine", label: "Methionine", unit: "g", target: 0.7, indent: true },
      { key: "phenylalanine", label: "Phenylalanine", unit: "g", target: 1.8, indent: true },
      { key: "threonine", label: "Threonine", unit: "g", target: 1.1, indent: true },
      { key: "tryptophan", label: "Tryptophan", unit: "g", target: 0.28, indent: true },
      { key: "tyrosine", label: "Tyrosine", unit: "g", target: 1.8, indent: true },
      { key: "valine", label: "Valine", unit: "g", target: 1.8, indent: true }
    ]
  },
  {
    title: "Minerals",
    rows: [
      { key: "calcium", label: "Calcium", unit: "mg", target: 1300 },
      { key: "copper", label: "Copper", unit: "mg", target: 0.9 },
      { key: "iron", label: "Iron", unit: "mg", target: 18 },
      { key: "magnesium", label: "Magnesium", unit: "mg", target: 420 },
      { key: "manganese", label: "Manganese", unit: "mg", target: 2.3 },
      { key: "phosphorus", label: "Phosphorus", unit: "mg", target: 1250 },
      { key: "potassium", label: "Potassium", unit: "mg", target: 4700 },
      { key: "selenium", label: "Selenium", unit: "µg", target: 55 },
      { key: "sodium", label: "Sodium", unit: "mg", target: 2300 },
      { key: "zinc", label: "Zinc", unit: "mg", target: 11 }
    ]
  }
];

function MicronutrientBreakdown({ totals, dayName }: { totals: Record<string, number>; dayName: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Food analysis</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Micronutrient breakdown</h3>
          <p className="mt-1 text-sm text-slate-500">
            Live vitamin, mineral, carbohydrate, lipid, and protein detail for {dayName}.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-indigo-600">Dynamic totals</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {NUTRIENT_SECTIONS.map((section) => (
          <NutrientTable key={section.title} section={section} totals={totals} />
        ))}
      </div>
    </section>
  );
}

function NutrientTable({ section, totals }: { section: NutrientSectionDefinition; totals: Record<string, number> }) {
  return (
    <div role="table" aria-label={`${section.title} nutrient breakdown`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="bg-slate-100 px-4 py-3 text-sm font-black text-slate-800" role="rowgroup">
        <div role="row">
          <span role="columnheader">{section.title}</span>
        </div>
      </div>
      <div role="rowgroup">
        {section.rows.map((row) => {
          const rawValue = totals[row.key] ?? 0;
          const value = Number.isFinite(rawValue) ? rawValue : 0;
          const percent = row.target ? Math.min(Math.round((value / row.target) * 100), 999) : null;
          const percentLabel = percent === null ? (row.unavailableLabel ?? "N/T") : `${percent}%`;
          const progressWidth = percent === null ? 0 : Math.min(percent, 100);
          const displayValue = value > 0 ? formatMacroValue(value) : "-";

          return (
            <div
              key={row.key}
              role="row"
              aria-label={`${row.label} ${displayValue} ${row.unit} ${percentLabel}`}
              className="grid grid-cols-[1fr_4.25rem_4rem_3rem] items-center gap-3 px-4 py-2.5 text-sm odd:bg-white even:bg-slate-50"
            >
              <span role="cell" className={cn("text-slate-800", row.indent ? "pl-4" : "")}>
                {row.label}
              </span>
              <span role="cell" className="text-right font-medium text-slate-700">
                {displayValue} {row.unit}
              </span>
              <span role="cell" aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-indigo-50">
                <span className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${progressWidth}%` }} />
              </span>
              <span role="cell" className="text-right font-medium text-slate-700">
                {percentLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FoodDatabaseDrawer({
  source,
  searchQuery,
  filteredFoods,
  onSourceChange,
  onSearchChange,
  onAddFood,
  onClose
}: {
  source: FoodDatabaseSource;
  searchQuery: string;
  filteredFoods: typeof foods;
  onSourceChange: (source: FoodDatabaseSource) => void;
  onSearchChange: (query: string) => void;
  onAddFood: (foodId: string, quantity: number) => void;
  onClose: () => void;
}) {
  const sources: FoodDatabaseSource[] = ["AUS / NZ", "EFSA", "USDA"];
  const [selectedFoodId, setSelectedFoodId] = useState(filteredFoods[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const selectedFood = filteredFoods.find((food) => food.id === selectedFoodId) ?? filteredFoods[0] ?? null;
  const quantityValue = Number(quantity);
  const safeQuantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1;

  return (
    <aside
      role="dialog"
      aria-labelledby="food-database-drawer-title"
      className="fixed left-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl"
    >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Food database</p>
            <h3 id="food-database-drawer-title" className="mt-1 text-2xl font-black text-slate-950">
              Add food from database
            </h3>
            <p className="mt-2 text-sm text-slate-500">Search verified foods and choose the source library you want to pull from.</p>
          </div>
          <button type="button" aria-label="Close food search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <label className="mt-6 grid gap-2">
          <span className="text-sm font-bold text-slate-700">Search food database</span>
          <input
            type="search"
            role="searchbox"
            aria-label="Search food database"
            value={searchQuery}
            placeholder="Search foods..."
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Database source</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold",
                  source === item ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-600"
                )}
                onClick={() => onSourceChange(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Showing {source} foods</p>
        </div>

        <div className="mt-6 space-y-3">
          {filteredFoods.map((food) => (
            <button
              key={food.id}
              type="button"
              aria-label={`Select ${food.name}`}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50",
                selectedFood?.id === food.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
              )}
              onClick={() => setSelectedFoodId(food.id)}
            >
              <span className="block font-bold text-slate-900">{food.name}</span>
              <span className="mt-1 block text-xs text-slate-500">{food.serving}</span>
              <span className="mt-2 block text-xs font-bold text-slate-600">
                {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fats}g · Fibre {food.fibre}g
              </span>
            </button>
          ))}
        </div>

        {selectedFood ? (
          <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-200 bg-white p-6 shadow-[0_-12px_24px_rgba(15,23,42,0.08)]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Food quantity</span>
              <input
                type="number"
                min="0.25"
                step="0.25"
                aria-label="Food quantity"
                value={quantity}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
              {formatMacroValue(selectedFood.calories * safeQuantity)} kcal · P {formatMacroValue(selectedFood.protein * safeQuantity)}g · C{" "}
              {formatMacroValue(selectedFood.carbs * safeQuantity)}g · F {formatMacroValue(selectedFood.fats * safeQuantity)}g · Fibre{" "}
              {formatMacroValue(selectedFood.fibre * safeQuantity)}g
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              onClick={() => onAddFood(selectedFood.id, safeQuantity)}
            >
              Add selected food
            </button>
          </div>
        ) : null}
    </aside>
  );
}

function MealTemplateImportDialog({
  templates,
  onImport,
  onClose
}: {
  templates: MealTemplateCard[];
  onImport: (template: MealTemplateCard) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-meal-template-title"
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Meal templates</p>
            <h3 id="import-meal-template-title" className="mt-1 text-2xl font-black text-slate-950">
              Import meal from template
            </h3>
            <p className="mt-2 text-sm text-slate-500">Select a saved meal template to add it into the current nutrition plan day.</p>
          </div>
          <button type="button" aria-label="Close meal template import" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-bold text-slate-950">{template.name}</h4>
                  <p className="text-sm text-slate-500">{template.description}</p>
                  <p className="mt-2 text-xs font-bold text-slate-600">
                    {template.calories} kcal · P {template.protein}g · C {template.carbs}g · F {template.fats}g
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                  onClick={() => onImport(template)}
                >
                  Import {template.name}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CopyMealDialog({
  days,
  sourceDayId,
  onCopy,
  onClose
}: {
  days: BuilderDay[];
  sourceDayId: string;
  onCopy: (targetDayId: string) => void;
  onClose: () => void;
}) {
  const targetDays = days.filter((day) => day.id !== sourceDayId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-meal-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Copy meal</p>
            <h3 id="copy-meal-title" className="mt-1 text-2xl font-black text-slate-950">
              Copy meal to another day
            </h3>
            <p className="mt-2 text-sm text-slate-500">Choose the day where this complete meal should be duplicated.</p>
          </div>
          <button type="button" aria-label="Close copy meal" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {targetDays.map((day) => (
            <button
              key={day.id}
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={() => onCopy(day.id)}
            >
              Copy to {day.name}
            </button>
          ))}
          {targetDays.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600">
              Add another day before copying this meal.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MacroOnlyPlanFields({
  title,
  setTitle,
  dayName,
  setDayName,
  protein,
  setProtein,
  carbs,
  setCarbs,
  fats,
  setFats,
  calories,
  setCalories,
  showMealFields
}: {
  title: string;
  setTitle: (value: string) => void;
  dayName: string;
  setDayName: (value: string) => void;
  protein: string;
  setProtein: (value: string) => void;
  carbs: string;
  setCarbs: (value: string) => void;
  fats: string;
  setFats: (value: string) => void;
  calories: string;
  setCalories: (value: string) => void;
  showMealFields: boolean;
}) {
  return (
    <div className="space-y-8">
      <h2 className="sr-only">{title}</h2>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          aria-label="Nutrition plan title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          placeholder="Enter nutrition plan title"
        />
        <span className="text-xs text-slate-400">Please enter nutrition plan title.</span>
      </label>

      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex border-b-2 border-blue-500 pb-3 text-sm font-bold text-blue-500">Day 1</div>
        <button type="button" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-500">
          + Add New Day
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.32fr] lg:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Day Name</span>
          <input value={dayName} onChange={(event) => setDayName(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        </label>
        <button type="button" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-500">
          Copy / Duplicate Day
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MacroTotalCard label="Total Protein (g)" value={protein} />
        <MacroTotalCard label="Total Carbs (g)" value={carbs} />
        <MacroTotalCard label="Total Fat (g)" value={fats} />
        <MacroTotalCard label="Total Calories (kcal)" value={calories} />
      </div>

      {showMealFields ? (
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Meal Title</span>
          <input aria-label="Meal Title" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" defaultValue="Meal" />
          <span className="text-xs text-slate-400">Please enter meal title. Ex: Breakfast, Lunch etc...</span>
        </label>
      ) : null}

      <div className="grid gap-5 md:grid-cols-4">
        <MacroInput label="Protein" value={protein} onChange={setProtein} unit="g" helper="Please enter protein." />
        <MacroInput label="Carbs" value={carbs} onChange={setCarbs} unit="g" helper="Please enter carbohydrate." />
        <MacroInput label="Fat" value={fats} onChange={setFats} unit="g" helper="Please enter fat." />
        <MacroInput label="Calories" value={calories} onChange={setCalories} unit="Kcal" helper="Please enter calories." />
      </div>

      {showMealFields ? (
        <button type="button" aria-label="Add meal" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-500">
          + Add meal
        </button>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea className="min-h-52 rounded-xl border border-slate-200 px-4 py-3 text-sm" />
      </label>
    </div>
  );
}

function MacroPill({ value }: { value: string }) {
  return <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">{value}</span>;
}

function MacroTotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none bg-slate-100 px-5 py-6 text-center">
      <p className="text-lg font-black text-slate-800">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-700">{label}</p>
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange,
  unit,
  helper
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  helper: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200">
        <input
          aria-label={label}
          type="number"
          min="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
        />
        <span className="border-l border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{unit}</span>
      </div>
      <span className="text-xs text-slate-400">{helper}</span>
    </label>
  );
}

function ActiveAssignmentsPanel({
  assignments,
  onEdit,
  onDelete,
  onCopy,
  onAssign
}: {
  assignments: MealAssignmentRow[];
  onEdit: (assignment: MealAssignmentRow) => void;
  onDelete: (assignment: MealAssignmentRow) => void;
  onCopy: (assignment: MealAssignmentRow) => void;
  onAssign: (assignment: MealAssignmentRow) => void;
}) {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  return (
    <section role="tabpanel" aria-label="Meal Plans" className="relative overflow-visible rounded-xl border border-gray-200 bg-white">
      {openActionMenuId ? (
        <button
          type="button"
          aria-label="Close meal plan actions"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setOpenActionMenuId(null)}
        />
      ) : null}
      <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
        <div className="col-span-4">Meal Plan Name</div>
        <div className="col-span-2">Assigned To</div>
        <div className="col-span-3">Calories / Macros</div>
        <div className="col-span-2">Last Edited</div>
        <div className="col-span-1">Actions</div>
      </div>
      {assignments.map((assignment) => {
        const menuOpen = openActionMenuId === assignment.id;

        return (
          <article
            key={assignment.id}
            className={cn(
              "relative grid grid-cols-12 items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0 hover:bg-gray-50",
              menuOpen ? "z-40" : "z-0"
            )}
          >
            <div className="col-span-4">
              <div className="font-medium text-gray-900">{assignment.planName}</div>
              <div className="text-xs text-gray-500">{assignment.status}</div>
            </div>
            <div className="col-span-2 text-sm font-medium text-gray-700">
              {assignment.activeClientCount} active {assignment.activeClientCount === 1 ? "client" : "clients"}
            </div>
            <div className="col-span-3 text-sm text-gray-700">
              <span className="font-medium text-gray-900">{assignment.calories} cal</span>
              <span className="ml-3 font-medium text-blue-600">P {assignment.protein}g</span>
              <span className="ml-2 font-medium text-green-600">C {assignment.carbs}g</span>
              <span className="ml-2 font-medium text-orange-600">F {assignment.fats}g</span>
            </div>
            <div className="col-span-2 text-sm text-gray-600">{assignment.lastEdited}</div>
            <div className="relative col-span-1 flex items-center gap-2">
              <button
                type="button"
                aria-label={`Edit ${assignment.planName}`}
                className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
                onClick={() => onEdit(assignment)}
              >
                <Edit className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`More actions for ${assignment.planName}`}
                aria-expanded={openActionMenuId === assignment.id}
                aria-controls={`meal-plan-actions-${assignment.id}`}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                onClick={() => setOpenActionMenuId((currentId) => (currentId === assignment.id ? null : assignment.id))}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <MealPlanActionMenu
                  id={`meal-plan-actions-${assignment.id}`}
                  planName={assignment.planName}
                  onEdit={() => {
                    setOpenActionMenuId(null);
                    onEdit(assignment);
                  }}
                  onDelete={() => {
                    setOpenActionMenuId(null);
                    onDelete(assignment);
                  }}
                  onAssign={() => {
                    setOpenActionMenuId(null);
                    onAssign(assignment);
                  }}
                  onCopy={() => {
                    setOpenActionMenuId(null);
                    onCopy(assignment);
                  }}
                />
              ) : null}
            </div>
          </article>
        );
      })}
      {assignments.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-gray-600">No active meal plans have been assigned yet.</p>
      ) : null}
    </section>
  );
}

function MealPlanActionMenu({
  id,
  planName,
  onEdit,
  onDelete,
  onAssign,
  onCopy
}: {
  id: string;
  planName: string;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onCopy: () => void;
}) {
  const actions = [
    { label: "Edit", icon: Edit, onSelect: onEdit },
    { label: "Delete", icon: Trash2, onSelect: onDelete },
    { label: "Assign to", icon: UserPlus, onSelect: onAssign },
    { label: "Copy", icon: ClipboardCopy, onSelect: onCopy }
  ];

  return (
    <div
      id={id}
      role="menu"
      aria-label={`Meal plan actions for ${planName}`}
      className="absolute right-0 top-10 z-[60] w-44 rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
    >
      {actions.map(({ label, icon: Icon, onSelect }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onSelect}
        >
          <Icon className="size-4 text-slate-500" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function MealPlanAssignmentDialog({
  target,
  clients,
  onClose,
  onAssign
}: {
  target: MealAssignmentRow;
  clients: ClientSummary[];
  onClose: () => void;
  onAssign: (client: ClientSummary) => void;
}) {
  const fallbackClients = clients.length > 0 ? clients : [];
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const filteredClients = fallbackClients.filter((client) =>
    client.name.toLowerCase().includes(clientSearchQuery.trim().toLowerCase())
  );
  const selectedClient = fallbackClients.find((client) => client.id === selectedClientId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-meal-plan-title"
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="assign-meal-plan-title" className="text-2xl font-bold text-gray-900">
              Assign Meal Plan
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Search the client roster and assign <span className="font-semibold text-gray-900">{target.planName}</span>.
            </p>
          </div>
          <button type="button" aria-label="Close assign meal plan" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6">
          <label htmlFor="meal-plan-client-search" className="mb-2 block text-sm font-semibold text-gray-700">
            Search clients
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              id="meal-plan-client-search"
              type="search"
              value={clientSearchQuery}
              placeholder="Search client roster..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setClientSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {filteredClients.map((client) => (
            <label
              key={client.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50"
            >
              <span>
                <span className="block font-semibold text-gray-900">{client.name}</span>
                <span className="block text-xs text-gray-500">{client.packageName}</span>
              </span>
              <input
                type="radio"
                name="meal-plan-client"
                aria-label={`Select ${client.name}`}
                checked={selectedClientId === client.id}
                onChange={() => setSelectedClientId(client.id)}
              />
            </label>
          ))}
          {filteredClients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
              No clients match that search.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!selectedClient}
            onClick={() => {
              if (selectedClient) {
                onAssign(selectedClient);
              }
            }}
          >
            Assign Meal Plan
          </button>
        </div>
      </section>
    </div>
  );
}

function MasterTemplatesPanel({
  templates,
  canAssign,
  onUseTemplate
}: {
  templates: MealTemplateCard[];
  canAssign: boolean;
  onUseTemplate: (template: MealTemplateCard) => void;
}) {
  return (
    <section role="tabpanel" aria-label="Meal Templates">
      <div className="grid gap-6 md:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg">
            <div className="relative h-48 bg-gradient-to-br from-green-700 to-emerald-500">
              <div className="absolute right-3 top-3 rounded bg-white/20 px-2 py-1 text-xs font-medium uppercase text-white backdrop-blur-sm">
                {template.badge}
              </div>
            </div>
            <div className="p-5">
              <h2 className="mb-1 font-bold text-gray-900">{template.name}</h2>
              <p className="mb-4 text-sm text-gray-500">{template.description}</p>
              <div className="mb-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="size-4 text-gray-400" aria-hidden="true" />
                  {template.calories} cal
                </div>
              </div>
              <div className="mb-4 flex items-center gap-4 text-xs">
                <Macro label="PRO" value={`${template.protein}g`} tone="text-blue-600" />
                <Macro label="CARB" value={`${template.carbs}g`} tone="text-green-600" />
                <Macro label="FAT" value={`${template.fats}g`} tone="text-orange-600" />
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300"
                disabled={!canAssign}
                onClick={() => onUseTemplate(template)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Use Template
              </button>
            </div>
          </article>
        ))}
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
            No meal plan templates exist yet. Create a new template to start the library.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TemplateAssignmentDialog({
  clients,
  templateName,
  selectedClientId,
  saving,
  onClientChange,
  onClose,
  onSubmit
}: {
  clients: ClientSummary[];
  templateName: string;
  selectedClientId: string;
  saving: boolean;
  onClientChange: (clientId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-meal-template-title"
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <h2 id="assign-meal-template-title" className="text-2xl font-bold text-gray-900">
          Assign Meal Template
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Assign <span className="font-medium text-gray-900">{templateName}</span> to an active client.
        </p>

        <label htmlFor="meal-assignment-client" className="mt-6 block text-sm font-medium text-gray-700">
          Client
        </label>
        <select
          id="meal-assignment-client"
          required
          value={selectedClientId}
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(event) => onClientChange(event.target.value)}
        >
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        {clients.length === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            No active clients are available for meal plan assignment.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || clients.length === 0}
          >
            Assign Meal Plan
          </button>
        </div>
      </form>
    </div>
  );
}

function Macro({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <span className={cn("font-medium", tone)}>{value}</span>
      <span className="ml-1 text-gray-500">{label}</span>
    </div>
  );
}

export function getMealTemplateCards(source: MealPlanSource, templates: ApiMealPlanTemplate[]): MealTemplateCard[] {
  if (source === "fixtures") {
    return mealTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      calories: template.calories,
      protein: template.protein,
      carbs: template.carbs,
      fats: template.fats,
      badge: "Fixture",
      apiTemplate: null
    }));
  }

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.phase ? `${template.phase} protocol` : "Nutrition protocol",
    calories: template.targetCalories,
    protein: template.proteinGrams,
    carbs: template.carbsGrams,
    fats: template.fatGrams,
    badge: template.status,
    apiTemplate: template
  }));
}

export function getMealAssignmentRows(source: MealPlanSource, assignments: ApiMealPlanAssignment[]): MealAssignmentRow[] {
  if (source === "fixtures") {
    return mealAssignments.map((assignment) => ({
      id: assignment.id,
      planName: assignment.planName,
      activeClientCount: 1,
      calories: assignment.calories,
      protein: assignment.protein,
      carbs: assignment.carbs,
      fats: assignment.fats,
      lastEdited: assignment.started,
      status: "active"
    }));
  }

  const assignmentGroups = new Map<string, ApiMealPlanAssignment[]>();

  assignments.forEach((assignment) => {
    const assignmentKey = assignment.templateId ?? assignment.id;
    assignmentGroups.set(assignmentKey, [...(assignmentGroups.get(assignmentKey) ?? []), assignment]);
  });

  return Array.from(assignmentGroups.entries()).map(([assignmentKey, group]) => {
    const sortedGroup = [...group].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
    const assignment = sortedGroup.find((entry) => entry.status === "active") ?? sortedGroup[0];

    return {
      id: assignmentKey,
      planName: assignment.name,
      activeClientCount: group.filter((entry) => entry.status === "active").length,
      calories: assignment.snapshot.targetCalories ?? assignment.targetCalories,
      protein: assignment.snapshot.proteinGrams ?? assignment.proteinGrams,
      carbs: assignment.snapshot.carbsGrams ?? assignment.carbsGrams,
      fats: assignment.snapshot.fatGrams ?? assignment.fatGrams,
      lastEdited: formatDisplayDate(assignment.updatedAt),
      status: assignment.status
    };
  });
}

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
