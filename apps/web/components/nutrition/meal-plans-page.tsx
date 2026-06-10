"use client";

import { Calendar, ClipboardCopy, Edit, Info, MoreVertical, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClientSummary } from "@/fixtures/clients";
import { mealAssignments, mealTemplates } from "@/fixtures/nutrition";
import { SavedToast } from "@/components/ui/saved-toast";
import { cn } from "@/lib/utils";

type MealPlanTab = "Meal Plans" | "Meal Templates";
type NutritionPlanBuilderMode = "full" | "macro-day" | "macro-meal";
export type MealPlanSource = "api" | "fixtures";

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
  const [source, setSource] = useState<MealPlanSource>("fixtures");
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ApiMealPlanTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [builderMode, setBuilderMode] = useState<NutritionPlanBuilderMode | null>(null);
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

  const templateCards = useMemo(() => getMealTemplateCards(source, templates), [source, templates]);
  const assignmentRows = useMemo(
    () => [...createdPlans, ...getMealAssignmentRows(source, assignments)],
    [assignments, createdPlans, source]
  );

  function openPlanTypeDialog() {
    setStatusMessage(null);
    setErrorMessage(null);
    setShowPlanTypeDialog(true);
  }

  function saveNutritionPlan(plan: MealAssignmentRow) {
    setCreatedPlans((currentPlans) => [plan, ...currentPlans]);
    setBuilderMode(null);
    setShowPlanTypeDialog(false);
    setShowMacroChoiceDialog(false);
    setActiveTab("Meal Plans");
    setStatusMessage("Nutrition plan added to Meal Plans.");
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
      <NutritionPlanBuilder
        mode={builderMode}
        onBack={() => {
          setBuilderMode(null);
          setActiveTab("Meal Plans");
        }}
        onSave={saveNutritionPlan}
      />
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
        <ActiveAssignmentsPanel assignments={assignmentRows} />
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

      {showPlanTypeDialog ? (
        <CreateNutritionPlanDialog
          onClose={() => setShowPlanTypeDialog(false)}
          onFullPlan={() => {
            setShowPlanTypeDialog(false);
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
            setBuilderMode("macro-day");
          }}
          onEachMeal={() => {
            setShowMacroChoiceDialog(false);
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
  onBack,
  onSave
}: {
  mode: NutritionPlanBuilderMode;
  onBack: () => void;
  onSave: (plan: MealAssignmentRow) => void;
}) {
  const [title, setTitle] = useState(mode === "full" ? "New Nutrition Plan" : "Macro Only Nutrition Plan");
  const [dayName, setDayName] = useState("Day 1");
  const [protein, setProtein] = useState("0");
  const [carbs, setCarbs] = useState("0");
  const [fats, setFats] = useState("0");
  const [calories, setCalories] = useState("0");
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
        <button type="button" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
          Actions
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
          {isFullPlan ? (
            <button type="button" className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600" onClick={savePlan}>
              Save Nutrition Plan
            </button>
          ) : null}
          <button type="button" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700" onClick={savePlan}>
            {isFullPlan ? "Save Nutrition Plan & Close" : "Save Nutrition Plan"}
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
  calories
}: {
  title: string;
  setTitle: (value: string) => void;
  protein: string;
  carbs: string;
  fats: string;
  calories: string;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
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
          <MacroPill value={`${calories} Kcal`} />
          <MacroPill value={`${protein} g Protein`} />
          <MacroPill value={`${carbs} g Carbs`} />
          <MacroPill value={`${fats} g Fat`} />
          <span className="rounded-xl bg-slate-100 px-4 py-3 text-slate-400">i</span>
        </div>
      </div>

      <div className="border-l border-dashed border-slate-200 pl-6">
        <div className="mb-6 inline-flex border-b-2 border-blue-500 pb-3 text-sm font-bold text-blue-500">
          Day 1
        </div>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-blue-500">Main Meal</h3>
            <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500">
              ...
            </button>
          </div>
          <button type="button" className="text-sm font-bold uppercase text-slate-400">
            + Add Food
          </button>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea className="min-h-16 rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Enter meal notes" />
            <span className="text-xs text-slate-400">Please enter meal notes</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" aria-label="Add another meal" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-500">
          + Add another meal
        </button>
        <button type="button" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-500">
          + Add meal from template
        </button>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea className="min-h-52 rounded-xl border border-slate-200 px-4 py-3 text-sm" />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Nutrition Plan Tags:</span>
        <input className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Enter nutrition plan tags" />
        <span className="text-xs text-slate-400">Please enter nutrition plan tags. Max length for a tag is 80 chars.</span>
      </label>
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
        <button type="button" aria-label="Add another meal" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-500">
          + Add another meal
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

function ActiveAssignmentsPanel({ assignments }: { assignments: MealAssignmentRow[] }) {
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
              <button aria-label={`Edit ${assignment.planName}`} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50">
                <Edit className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`More actions for ${assignment.planName}`}
                aria-expanded={openActionMenuId === assignment.id}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                onClick={() => setOpenActionMenuId((currentId) => (currentId === assignment.id ? null : assignment.id))}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </button>
              {menuOpen ? <MealPlanActionMenu planName={assignment.planName} /> : null}
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

function MealPlanActionMenu({ planName }: { planName: string }) {
  const actions = [
    { label: "Edit", icon: Edit },
    { label: "Delete", icon: Trash2 },
    { label: "Assign to", icon: UserPlus },
    { label: "Copy", icon: ClipboardCopy }
  ];

  return (
    <div
      role="menu"
      aria-label={`Meal plan actions for ${planName}`}
      className="absolute right-0 top-10 z-[60] w-44 rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
    >
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Icon className="size-4 text-slate-500" aria-hidden="true" />
            {action.label}
          </button>
        );
      })}
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
