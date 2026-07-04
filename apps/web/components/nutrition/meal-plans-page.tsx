"use client";

import { Calendar, CheckCircle2, ClipboardCopy, Edit, Info, MoreVertical, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClientSummary } from "@/lib/clients/client-models";
import type { Food } from "@/lib/nutrition/nutrition-models";
import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import { SavedToast } from "@/components/ui/saved-toast";
import { cn } from "@/lib/utils";

type MealPlanTab = "Meal Plans" | "Meal Templates";
type NutritionPlanBuilderMode = "full" | "macro-day" | "macro-meal";
export type MealPlanSource = "api" | "fixtures";
type MealPlanLibraryView = "cards" | "list";

type FoodDatabaseSource = "AUS/NZ" | "EFSA" | "USDA";
type FoodMeasurementUnit = "g" | "ml" | "oz" | "cups" | "tbsp" | "tsp" | "serving";
const VERIFIED_FOOD_SOURCES = new Set(["USDA", "AUS/NZ", "EFSA"]);
const FOOD_SELECTOR_RECENT_LIMIT = 8;
const servingDescriptionOptions = ["Grams", "Ounces", "Qty", "Cups", "Oz", "Tbsp", "Tsp", "Ml"];

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

interface BuilderMeal {
  id: string;
  name: string;
  notes: string;
  foods: BuilderFood[];
}

interface BuilderFood {
  id: string;
  foodId?: string;
  name: string;
  serving: string;
  measurementUnit?: FoodMeasurementUnit;
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

interface MacroBuilderMeal {
  id: string;
  title: string;
  protein: string;
  carbs: string;
  fats: string;
  calories: string;
}

interface MacroBuilderDay {
  id: string;
  name: string;
  protein: string;
  carbs: string;
  fats: string;
  calories: string;
  meals: MacroBuilderMeal[];
}

interface ApiFoodLibraryItem {
  id: string;
  name: string;
  category: string;
  servingSize: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number | null;
  metadata?: unknown;
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
        notes?: string;
        foods: Array<{
          foodId?: string;
          foodName: string;
          servingSize: string;
          calories: number;
          proteinGrams: number;
          carbsGrams: number;
          fatGrams: number;
          fiberGrams?: number;
          quantity?: number;
          measurementUnit?: FoodMeasurementUnit;
          micronutrients?: Record<string, number>;
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

type ApiMealPlanTemplateDay = NonNullable<ApiMealPlanTemplate["template"]["days"]>[number];
type ApiMealPlanTemplateMeal = ApiMealPlanTemplateDay["meals"][number];
type ApiMealPlanTemplateFood = ApiMealPlanTemplateMeal["foods"][number];

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
  template: ApiMealPlanTemplate["template"] | null;
}

export interface MealAssignmentRow {
  id: string;
  templateId: string | null;
  planName: string;
  activeClientCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  lastEdited: string;
  status: string;
  apiTemplate: ApiMealPlanTemplate | null;
}

interface MealPlanTemplateSaveInput {
  name: string;
  phase: string;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  status: "draft" | "published";
  template: ApiMealPlanTemplate["template"];
}

export function MealPlansPage() {
  const [activeTab, setActiveTab] = useState<MealPlanTab>("Meal Plans");
  const [templates, setTemplates] = useState<ApiMealPlanTemplate[]>([]);
  const [assignments, setAssignments] = useState<ApiMealPlanAssignment[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [createdPlans, setCreatedPlans] = useState<MealAssignmentRow[]>([]);
  const [createdTemplates, setCreatedTemplates] = useState<MealTemplateCard[]>([]);
  const [hiddenMealPlanIds, setHiddenMealPlanIds] = useState<string[]>([]);
  const [mealPlanOverrides] = useState<Record<string, Partial<MealAssignmentRow>>>({});
  const [source, setSource] = useState<MealPlanSource>("api");
  const [loading, setLoading] = useState(true);
  const [mealTemplateView, setMealTemplateView] = useState<MealPlanLibraryView>("cards");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [templatePlanTarget, setTemplatePlanTarget] = useState<MealTemplateCard | null>(null);
  const [builderMode, setBuilderMode] = useState<NutritionPlanBuilderMode | null>(null);
  const [editingPlan, setEditingPlan] = useState<MealAssignmentRow | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<MealAssignmentRow | null>(null);
  const [selectedMealTemplate, setSelectedMealTemplate] = useState<MealTemplateCard | null>(null);
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
          setSource("api");
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
      [...createdPlans, ...getMealAssignmentRows(source, assignments, templates)]
        .filter((assignment) => !hiddenMealPlanIds.includes(assignment.id))
        .map((assignment) => ({ ...assignment, ...(mealPlanOverrides[assignment.id] ?? {}) })),
    [assignments, createdPlans, hiddenMealPlanIds, mealPlanOverrides, source, templates]
  );
  const filteredAssignmentRows = useMemo(
    () => filterMealAssignments(assignmentRows, librarySearchQuery),
    [assignmentRows, librarySearchQuery]
  );
  const filteredTemplateCards = useMemo(
    () => filterMealTemplates(templateCards, librarySearchQuery),
    [templateCards, librarySearchQuery]
  );

  function openPlanTypeDialog() {
    setStatusMessage(null);
    setErrorMessage(null);
    setShowPlanTypeDialog(true);
  }

  async function saveNutritionPlan(input: MealPlanTemplateSaveInput, options: { close: boolean }) {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const existingTemplateId = editingPlan?.apiTemplate?.id ?? null;

    try {
      const response = await fetch(existingTemplateId ? `/api/v1/meal-plan-templates/${existingTemplateId}` : "/api/v1/meal-plan-templates", {
        method: existingTemplateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = await response.json();

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Nutrition plan could not be saved.");
      }

      setTemplates((currentTemplates) =>
        existingTemplateId
          ? currentTemplates.map((template) => (template.id === existingTemplateId ? payload.data : template))
          : [payload.data, ...currentTemplates]
      );
      setSource("api");
      setShowPlanTypeDialog(false);
      setShowMacroChoiceDialog(false);
      setActiveTab("Meal Plans");
      setStatusMessage("Nutrition plan saved.");

      if (options.close) {
        setBuilderMode(null);
        setEditingPlan(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nutrition plan could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function createMealTemplate(template: MealTemplateCard) {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/meal-plan-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getMealTemplateSaveInput(template))
      });
      const payload = await response.json();

      if (!response.ok || !payload.data || Array.isArray(payload.data)) {
        throw new Error(payload.error?.message ?? "Meal template could not be saved.");
      }

      setTemplates((currentTemplates) => [payload.data, ...currentTemplates]);
      setSource("api");
      setActiveTab("Meal Templates");
      setStatusMessage(`${template.name} saved to Meal Templates.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Meal template could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function editMealPlan(assignment: MealAssignmentRow) {
    setEditingPlan(assignment);
    setBuilderMode("full");
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function deleteMealPlan(assignment: MealAssignmentRow) {
    if (assignment.apiTemplate?.id) {
      setSaving(true);
      setStatusMessage(null);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/v1/meal-plan-templates/${assignment.apiTemplate.id}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error?.message ?? "Meal plan could not be deleted.");
        }

        setTemplates((currentTemplates) => currentTemplates.filter((template) => template.id !== assignment.apiTemplate?.id));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Meal plan could not be deleted.");
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    setCreatedPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== assignment.id));
    setHiddenMealPlanIds((currentIds) => [...currentIds, assignment.id]);
    setAssignmentTarget((currentTarget) => (currentTarget?.id === assignment.id ? null : currentTarget));
    setStatusMessage(`${assignment.planName} deleted from Meal Plans.`);
  }

  async function saveMealTemplate(template: MealTemplateCard, input: MealPlanTemplateSaveInput) {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(template.apiTemplate?.id ? `/api/v1/meal-plan-templates/${template.apiTemplate.id}` : "/api/v1/meal-plan-templates", {
        method: template.apiTemplate?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = await response.json();

      if (!response.ok || !payload.data || Array.isArray(payload.data)) {
        throw new Error(payload.error?.message ?? "Meal template could not be saved.");
      }

      setTemplates((currentTemplates) =>
        template.apiTemplate?.id
          ? currentTemplates.map((currentTemplate) => (currentTemplate.id === template.apiTemplate?.id ? payload.data : currentTemplate))
          : [payload.data, ...currentTemplates]
      );
      setCreatedTemplates((currentTemplates) => currentTemplates.filter((currentTemplate) => currentTemplate.id !== template.id));
      setSelectedMealTemplate(null);
      setSource("api");
      setActiveTab("Meal Templates");
      setStatusMessage(`${input.name} saved to Meal Templates.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Meal template could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMealTemplate(template: MealTemplateCard) {
    if (!template.apiTemplate?.id) {
      setCreatedTemplates((currentTemplates) => currentTemplates.filter((currentTemplate) => currentTemplate.id !== template.id));
      setSelectedMealTemplate(null);
      setStatusMessage(`${template.name} deleted from Meal Templates.`);
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/meal-plan-templates/${template.apiTemplate.id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error?.message ?? "Meal template could not be deleted.");
      }

      setTemplates((currentTemplates) => currentTemplates.filter((currentTemplate) => currentTemplate.id !== template.apiTemplate?.id));
      setSelectedMealTemplate(null);
      setStatusMessage(`${template.name} deleted from Meal Templates.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Meal template could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  function copyMealPlan(assignment: MealAssignmentRow) {
    setErrorMessage(`${assignment.planName} could not be copied until database-backed copy is available.`);
  }

  function assignMealPlanToClient(assignment: MealAssignmentRow, client: ClientSummary) {
    void assignment;
    void client;
    setAssignmentTarget(null);
    setErrorMessage("Meal plan assignments must be saved through the persisted assignment API.");
  }

  async function addMealTemplateToPlan(template: MealTemplateCard, targetPlan: MealAssignmentRow) {
    if (!targetPlan.apiTemplate?.id) {
      setErrorMessage("Select a persisted meal plan before adding this meal template.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const updatedTemplate = appendMealTemplateToPlanTemplate(targetPlan.apiTemplate, template);
      const response = await fetch(`/api/v1/meal-plan-templates/${targetPlan.apiTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTemplate)
      });

      const payload = await response.json();

      if (!response.ok || !payload.data || Array.isArray(payload.data)) {
        throw new Error(payload.error?.message ?? "Meal plan could not be updated.");
      }

      setTemplates((currentTemplates) =>
        currentTemplates.map((currentTemplate) => (currentTemplate.id === targetPlan.apiTemplate?.id ? payload.data : currentTemplate))
      );
      setTemplatePlanTarget(null);
      setActiveTab("Meal Plans");
      setStatusMessage(`${template.name} added to ${targetPlan.planName}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Meal plan could not be updated.");
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
          initialTemplate={editingPlan?.apiTemplate ?? null}
          saving={saving}
          availableTemplates={templateCards}
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
      {loading ? (
        <CompleteCoachLoadingScreen
          title="Preparing meal plans"
          label="Preparing meal plan library."
        />
      ) : null}
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
              onClick={() => {
                setActiveTab(tab);
                setLibrarySearchQuery("");
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <label className="relative mb-6 block">
        <span className="sr-only">Search {activeTab.toLowerCase()}</span>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={librarySearchQuery}
          placeholder={activeTab === "Meal Plans" ? "Search meal plans..." : "Search meal templates..."}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          onChange={(event) => setLibrarySearchQuery(event.target.value)}
        />
      </label>

      {activeTab === "Meal Plans" ? (
        <ActiveAssignmentsPanel
          assignments={filteredAssignmentRows}
          onEdit={editMealPlan}
          onDelete={deleteMealPlan}
          onCopy={copyMealPlan}
          onAssign={setAssignmentTarget}
        />
      ) : (
        <MasterTemplatesPanel
          templates={filteredTemplateCards}
          canAssign={source === "api"}
          view={mealTemplateView}
          onViewChange={setMealTemplateView}
          onOpenTemplate={setSelectedMealTemplate}
          onUseTemplate={(template) => {
            setTemplatePlanTarget(template);
            setErrorMessage(null);
          }}
          onDeleteTemplate={deleteMealTemplate}
        />
      )}

      {templatePlanTarget ? (
        <TemplatePlanTargetDialog
          template={templatePlanTarget}
          mealPlans={assignmentRows}
          saving={saving}
          onClose={() => setTemplatePlanTarget(null)}
          onSubmit={(targetPlan) => addMealTemplateToPlan(templatePlanTarget, targetPlan)}
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

      {selectedMealTemplate ? (
        <MealTemplateDetailsDialog
          template={selectedMealTemplate}
          saving={saving}
          onClose={() => setSelectedMealTemplate(null)}
          onSave={(input) => saveMealTemplate(selectedMealTemplate, input)}
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
            className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-left transition-colors hover:border-orange-300 hover:bg-orange-100"
            onClick={onFullPlan}
          >
            <span className="text-lg font-black text-slate-950">Full Meal Plan</span>
            <span className="mt-2 block text-sm text-slate-600">Build days, meals, foods, notes, tags, and full nutrition targets.</span>
          </button>
          <button
            type="button"
            aria-label="Macro Only Meal Plan"
            className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-100"
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
            <Info className="mt-3 size-7 text-indigo-600" aria-hidden="true" />
          </div>
          <button type="button" aria-label="Close macro plan type" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="rounded-xl bg-orange-500 px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-orange-600" onClick={onDailyTotals}>
            Total For Day
          </button>
          <button type="button" className="rounded-xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700" onClick={onEachMeal}>
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
  initialTemplate,
  saving,
  availableTemplates,
  onBack,
  onSave,
  onCreateMealTemplate
}: {
  mode: NutritionPlanBuilderMode;
  initialPlan?: MealAssignmentRow | null;
  initialTemplate?: ApiMealPlanTemplate | null;
  saving: boolean;
  availableTemplates: MealTemplateCard[];
  onBack: () => void;
  onSave: (input: MealPlanTemplateSaveInput, options: { close: boolean }) => Promise<void>;
  onCreateMealTemplate: (template: MealTemplateCard) => void;
}) {
  const [title, setTitle] = useState(initialPlan?.planName ?? (mode === "full" ? "New Nutrition Plan" : "Macro Only Nutrition Plan"));
  const [macroDays, setMacroDays] = useState<MacroBuilderDay[]>(() => [
    createMacroBuilderDay(1, {
      protein: String(initialPlan?.protein ?? 0),
      carbs: String(initialPlan?.carbs ?? 0),
      fats: String(initialPlan?.fats ?? 0),
      calories: String(initialPlan?.calories ?? 0)
    })
  ]);
  const [activeMacroDayId, setActiveMacroDayId] = useState("macro-day-1");
  const [fullProtein, setFullProtein] = useState(String(initialPlan?.protein ?? 0));
  const [fullCarbs, setFullCarbs] = useState(String(initialPlan?.carbs ?? 0));
  const [fullFats, setFullFats] = useState(String(initialPlan?.fats ?? 0));
  const [fullCalories, setFullCalories] = useState(String(initialPlan?.calories ?? 0));
  const [fullPlanDays, setFullPlanDays] = useState<BuilderDay[]>([]);
  const isFullPlan = mode === "full";
  const isMealMacroPlan = mode === "macro-meal";
  const macroPlanTotals = calculateMacroPlanSummary(macroDays, isMealMacroPlan);

  const savePlan = (close: boolean) => {
    const planName = title.trim() || (isFullPlan ? "New Nutrition Plan" : "Macro Only Nutrition Plan");
    const fullPlanTotals = calculatePlanTotals(fullPlanDays);
    const fallbackCalories = isFullPlan ? fullPlanTotals.calories : macroPlanTotals.calories;
    const fallbackProtein = isFullPlan ? fullPlanTotals.protein : macroPlanTotals.protein;
    const fallbackCarbs = isFullPlan ? fullPlanTotals.carbs : macroPlanTotals.carbs;
    const fallbackFats = isFullPlan ? fullPlanTotals.fats : macroPlanTotals.fats;

    void onSave(
      {
        name: planName,
        phase: isFullPlan ? "Full meal plan" : "Macro only meal plan",
        targetCalories: Math.round(fallbackCalories),
        proteinGrams: fallbackProtein,
        carbsGrams: fallbackCarbs,
        fatGrams: fallbackFats,
        status: "draft",
        template: isFullPlan
          ? getFullMealPlanTemplatePayload(fullPlanDays)
          : getMacroMealPlanTemplatePayload(macroDays, isMealMacroPlan)
      },
      { close }
    );
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
            protein={fullProtein}
            carbs={fullCarbs}
            fats={fullFats}
            calories={fullCalories}
            setProtein={setFullProtein}
            setCarbs={setFullCarbs}
            setFats={setFullFats}
            setCalories={setFullCalories}
            initialTemplate={initialTemplate}
            availableTemplates={availableTemplates}
            onDaysChange={setFullPlanDays}
            onCreateMealTemplate={onCreateMealTemplate}
          />
        ) : (
          <MacroOnlyPlanFields
            title={title}
            setTitle={setTitle}
            days={macroDays}
            activeDayId={activeMacroDayId}
            onActiveDayChange={setActiveMacroDayId}
            onDaysChange={setMacroDays}
            showMealFields={isMealMacroPlan}
          />
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            disabled={saving}
            onClick={() => savePlan(false)}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
            onClick={() => savePlan(true)}
          >
            {saving ? "Saving..." : "Save & Close"}
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
  initialTemplate,
  availableTemplates,
  onDaysChange,
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
  initialTemplate?: ApiMealPlanTemplate | null;
  availableTemplates: MealTemplateCard[];
  onDaysChange: (days: BuilderDay[]) => void;
  onCreateMealTemplate: (template: MealTemplateCard) => void;
}) {
  const [days, setDays] = useState<BuilderDay[]>(() => createBuilderDaysFromTemplate(initialTemplate));
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activeFoodTarget, setActiveFoodTarget] = useState<{ dayId: string; mealId: string } | null>(null);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [openMealMenu, setOpenMealMenu] = useState<{ dayId: string; mealId: string } | null>(null);
  const [copyMealTarget, setCopyMealTarget] = useState<{ dayId: string; mealId: string } | null>(null);
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
  const [foodSource, setFoodSource] = useState<FoodDatabaseSource>("AUS/NZ");
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [apiFoods, setApiFoods] = useState<Food[]>([]);
  const [foodCache, setFoodCache] = useState<Record<string, Food>>({});
  const [quickAddFoodOpen, setQuickAddFoodOpen] = useState(false);
  const [quickAddFoodForm, setQuickAddFoodForm] = useState<NewFoodFormState>(initialNewFoodForm);
  const [quickAddFoodSaving, setQuickAddFoodSaving] = useState(false);
  const [quickAddFoodError, setQuickAddFoodError] = useState<string | null>(null);
  const [showMealTemplateDialog, setShowMealTemplateDialog] = useState(false);
  const activeDay = days.find((day) => day.id === activeDayId) ?? days.at(-1);
  const dayTotals = calculateDayTotals(activeDay);
  const nutrientTotals = calculateNutrientTotals(activeDay);
  const activeDayIndex = Math.max(days.findIndex((day) => day.id === activeDay?.id), 0);
  const foodOptions = useMemo(() => mergeFoodOptions(Object.values(foodCache), []), [foodCache]);

  useEffect(() => {
    onDaysChange(days);
  }, [days, onDaysChange]);

  useEffect(() => {
    if (!activeFoodTarget) {
      return;
    }

    let cancelled = false;
    const search = foodSearchQuery.trim();
    const params = new URLSearchParams({
      limit: search ? "50" : String(FOOD_SELECTOR_RECENT_LIMIT),
      source: foodSource,
      sort: "recent"
    });

    if (search) {
      params.set("search", search);
    }

    async function loadFoodOptions() {
      try {
        const response = await fetch(`/api/v1/foods?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Food API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiFoodLibraryItem[] };
        const mappedFoods = Array.isArray(payload.data) ? payload.data.map(mapApiFoodToBuilderFood).filter((food) => food.source === foodSource) : [];

        if (!cancelled) {
          setApiFoods(mappedFoods);
          setFoodCache((currentCache) => ({
            ...currentCache,
            ...Object.fromEntries(mappedFoods.map((food) => [food.id, food]))
          }));
        }
      } catch {
        if (!cancelled) {
          setApiFoods([]);
        }
      }
    }

    void loadFoodOptions();

    return () => {
      cancelled = true;
    };
  }, [activeFoodTarget, foodSearchQuery, foodSource]);

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

  const updateMealNotes = (dayId: string, mealId: string, notes: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, notes } : meal))
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
    const template = getFullMealPlanTemplatePayload([
      {
        id: `template_day_${Date.now()}`,
        name: "Template Day",
        meals: [meal]
      }
    ]);

    onCreateMealTemplate({
      id: `local-meal-template-${Date.now()}`,
      name: meal.name.trim() || "Untitled Meal Template",
      description: "Created from nutrition builder",
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fats: totals.fats,
      badge: "Custom",
      apiTemplate: null,
      template
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

    const templateMeals = createBuilderMealsFromMealTemplate(template);

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeDay.id
          ? {
              ...day,
              meals: [...day.meals, ...templateMeals]
            }
          : day
      )
    );
    setShowMealTemplateDialog(false);
  };

  const addFoodsToMeal = (selections: Array<{ foodId: string; quantity: number; unit: FoodMeasurementUnit }>) => {
    if (!activeFoodTarget || selections.length === 0) {
      return;
    }

    const selectedFoods = selections
      .map((selection) => {
        const food = foodOptions.find((item) => item.id === selection.foodId);

        return food ? createBuilderFood(food, selection.quantity, selection.unit) : null;
      })
      .filter((food): food is BuilderFood => Boolean(food));

    if (selectedFoods.length === 0) {
      return;
    }

    const addedTotals = selectedFoods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.calories,
        protein: totals.protein + food.protein,
        carbs: totals.carbs + food.carbs,
        fats: totals.fats + food.fats
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeFoodTarget.dayId
          ? {
              ...day,
              meals: day.meals.map((meal) =>
                meal.id === activeFoodTarget.mealId ? { ...meal, foods: [...meal.foods, ...selectedFoods] } : meal
              )
            }
          : day
      )
    );
    setCalories(String((Number(calories) || 0) + addedTotals.calories));
    setProtein(String((Number(protein) || 0) + addedTotals.protein));
    setCarbs(String((Number(carbs) || 0) + addedTotals.carbs));
    setFats(String((Number(fats) || 0) + addedTotals.fats));
    setActiveFoodTarget(null);
  };

  const updateQuickAddFoodForm = (key: keyof NewFoodFormState, value: string) => {
    setQuickAddFoodForm((currentForm) => ({ ...currentForm, [key]: value }));
  };

  const createQuickAddFood = async () => {
    setQuickAddFoodSaving(true);
    setQuickAddFoodError(null);

    try {
      const response = await fetch("/api/v1/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickAddFoodForm.name.trim() || "Coach Food",
          category: "Custom",
          servingSize: formatMealBuilderServingSize(quickAddFoodForm),
          calories: parseMealBuilderNumberInput(quickAddFoodForm.calories),
          proteinGrams: parseMealBuilderNumberInput(quickAddFoodForm.protein),
          carbsGrams: parseMealBuilderNumberInput(quickAddFoodForm.carbs),
          fatGrams: parseMealBuilderNumberInput(quickAddFoodForm.fat),
          fiberGrams: parseMealBuilderNumberInput(quickAddFoodForm.fiber),
          metadata: {
            source: foodSource,
            sugarGrams: parseMealBuilderNumberInput(quickAddFoodForm.sugar),
            polyolsGrams: parseMealBuilderNumberInput(quickAddFoodForm.polyols),
            saturatedGrams: parseMealBuilderNumberInput(quickAddFoodForm.saturated),
            polyunsaturatedGrams: parseMealBuilderNumberInput(quickAddFoodForm.polyunsaturated),
            monounsaturatedGrams: parseMealBuilderNumberInput(quickAddFoodForm.monounsaturated),
            saltGrams: parseMealBuilderNumberInput(quickAddFoodForm.salt),
            servingDescription: quickAddFoodForm.servingDescription
          }
        })
      });
      const payload = (await response.json()) as { data?: ApiFoodLibraryItem; error?: { message?: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Food could not be saved.");
      }

      const createdFood = mapApiFoodToBuilderFood(payload.data);

      setApiFoods((currentFoods) => [createdFood, ...currentFoods.filter((food) => food.id !== createdFood.id)]);
      setFoodCache((currentCache) => ({ ...currentCache, [createdFood.id]: createdFood }));
      setFoodSource(createdFood.source);
      setFoodSearchQuery("");
      setQuickAddFoodForm(initialNewFoodForm);
      setQuickAddFoodOpen(false);
      setQuickAddFoodError(null);
    } catch (error) {
      setQuickAddFoodError(error instanceof Error ? error.message : "Food could not be saved.");
    } finally {
      setQuickAddFoodSaving(false);
    }
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

  const deleteFoodFromMeal = (dayId: string, mealId: string, foodId: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: day.meals.map((meal) =>
                meal.id === mealId
                  ? {
                      ...meal,
                      foods: meal.foods.filter((food) => food.id !== foodId)
                    }
                  : meal
              )
            }
          : day
      )
    );
  };

  const filteredFoods = apiFoods;

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
        <div className="grid items-start gap-6">
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
                      <div role="row" className="grid grid-cols-[1.2fr_0.8fr_repeat(5,0.75fr)_2.5rem] gap-2 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        <span role="columnheader">Food</span>
                        <span role="columnheader">Quantity</span>
                        <span role="columnheader">Calories</span>
                        <span role="columnheader">Protein</span>
                        <span role="columnheader">Carbs</span>
                        <span role="columnheader">Fat</span>
                        <span role="columnheader">Fibre</span>
                        <span role="columnheader" className="sr-only">
                          Actions
                        </span>
                      </div>
                      {meal.foods.map((food) => {
                        const quantityDisplay = getFoodQuantityDisplay(food);

                        return (
                          <div
                            key={food.id}
                            role="row"
                            aria-label={`${food.name} ${formatMacroValue(quantityDisplay.amount)} ${quantityDisplay.unit} ${formatMacroValue(food.calories)} kcal ${formatMacroValue(food.protein)}g protein ${formatMacroValue(food.carbs)}g carbs ${formatMacroValue(food.fats)}g fat ${formatMacroValue(food.fibre)}g fibre`}
                            className="grid grid-cols-[1.2fr_0.8fr_repeat(5,0.75fr)_2.5rem] gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700"
                          >
                            <span role="cell">
                              <span className="block font-bold text-slate-900">{food.name}</span>
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
                            <span role="cell" className="flex justify-end">
                              <button
                                type="button"
                                aria-label={`Delete ${food.name}`}
                                className="inline-flex size-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"
                                onClick={() => deleteFoodFromMeal(activeDay.id, meal.id, food.id)}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <label className="mt-4 grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Notes</span>
                    <textarea
                      aria-label={`Notes for ${meal.name}`}
                      value={meal.notes}
                      className="min-h-16 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Enter meal notes"
                      onChange={(event) => updateMealNotes(activeDay.id, meal.id, event.target.value)}
                    />
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

      {activeFoodTarget ? (
        <FoodDatabaseDrawer
          source={foodSource}
          searchQuery={foodSearchQuery}
          foods={foodOptions}
          filteredFoods={filteredFoods}
          onSourceChange={setFoodSource}
          onSearchChange={setFoodSearchQuery}
          onQuickAdd={() => {
            setQuickAddFoodError(null);
            setQuickAddFoodOpen(true);
          }}
          onAddFoods={addFoodsToMeal}
          onClose={() => setActiveFoodTarget(null)}
        />
      ) : null}

      {quickAddFoodOpen ? (
        <QuickAddFoodModal
          form={quickAddFoodForm}
          saving={quickAddFoodSaving}
          error={quickAddFoodError}
          onChange={updateQuickAddFoodForm}
          onClose={() => setQuickAddFoodOpen(false)}
          onSubmit={createQuickAddFood}
        />
      ) : null}
    </div>
  );
}

export function createBuilderDay(dayNumber: number): BuilderDay {
  return {
    id: `day_${dayNumber}_${Date.now()}`,
    name: `Day ${dayNumber}`,
    meals: [createBuilderMeal(1, "Main Meal")]
  };
}

export function createMacroBuilderDay(dayNumber: number, overrides: Partial<Omit<MacroBuilderDay, "id">> = {}): MacroBuilderDay {
  return {
    id: `macro-day-${dayNumber}`,
    name: `Day ${dayNumber}`,
    protein: "0",
    carbs: "0",
    fats: "0",
    calories: "0",
    meals: [createMacroBuilderMeal(1)],
    ...overrides
  };
}

export function createMacroBuilderMeal(mealNumber: number, overrides: Partial<Omit<MacroBuilderMeal, "id">> = {}): MacroBuilderMeal {
  return {
    id: `macro-meal-${mealNumber}-${Date.now()}`,
    title: `Meal ${mealNumber}`,
    protein: "0",
    carbs: "0",
    fats: "0",
    calories: "0",
    ...overrides
  };
}

function cloneMacroBuilderDay(day: MacroBuilderDay, name: string): MacroBuilderDay {
  return {
    ...day,
    id: `macro-day-${Date.now()}`,
    name,
    meals: day.meals.map((meal, index) => ({
      ...meal,
      id: `macro-meal-copy-${index + 1}-${Date.now()}`
    }))
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
    notes: "",
    foods: []
  };
}

export function createBuilderDaysFromTemplate(template?: ApiMealPlanTemplate | null): BuilderDay[] {
  const templateDays = template?.template.days;

  if (!templateDays || templateDays.length === 0) {
    return [createBuilderDay(1)];
  }

  return templateDays.map((day, dayIndex) => ({
    id: `day_template_${dayIndex + 1}_${Date.now()}`,
    name: day.name || `Day ${dayIndex + 1}`,
    meals: day.meals.map((meal, mealIndex) => ({
      id: `meal_template_${dayIndex + 1}_${mealIndex + 1}_${Date.now()}`,
      name: meal.meal || `Meal ${mealIndex + 1}`,
      notes: meal.notes ?? "",
      foods: meal.foods.map((food, foodIndex) => createBuilderFoodFromTemplateFood(food, foodIndex))
    }))
  }));
}

export function createBuilderFoodFromTemplateFood(food: ApiMealPlanTemplateFood, index: number): BuilderFood {
  const parsedServing = parseServingAmount(food.servingSize);
  const measurementUnit = food.measurementUnit ?? parsedServing?.unit ?? "serving";

  return {
    id: `${food.foodId ?? food.foodName.toLowerCase().replace(/\W+/g, "-")}_${index}_${Date.now()}`,
    foodId: food.foodId,
    name: food.foodName,
    serving: food.servingSize,
    measurementUnit,
    calories: food.calories,
    protein: food.proteinGrams,
    carbs: food.carbsGrams,
    fats: food.fatGrams,
    fibre: food.fiberGrams ?? 0,
    quantity: food.quantity ?? getFoodQuantityMultiplier({ serving: food.servingSize }, parsedServing?.amount ?? 1, measurementUnit),
    micronutrients: food.micronutrients ?? {}
  };
}

export function createBuilderMealsFromMealTemplate(template: MealTemplateCard): BuilderMeal[] {
  const firstTemplateDay = template.template?.days?.[0] ?? template.apiTemplate?.template.days?.[0];
  const templateMeals = firstTemplateDay?.meals ?? [];

  if (templateMeals.length > 0) {
    return templateMeals.map((meal, mealIndex) => ({
      id: `imported_meal_${template.id}_${mealIndex + 1}_${Date.now()}`,
      name: meal.meal || template.name,
      notes: meal.notes ?? "",
      foods: meal.foods.map((food, foodIndex) => createBuilderFoodFromTemplateFood(food, foodIndex))
    }));
  }

  return [
    {
      id: `meal_${Date.now()}_1`,
      name: template.name,
      notes: "",
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
  ];
}

function cloneBuilderMeal(meal: BuilderMeal, mealNumber: number): BuilderMeal {
  return {
    id: `meal_copy_${mealNumber}_${Date.now()}`,
    name: meal.name,
    notes: meal.notes,
    foods: meal.foods.map((food) => ({
      ...food,
      id: `${food.id}_copy_${Date.now()}`
    }))
  };
}

export function createBuilderFood(food: Food, amount: number, unit?: FoodMeasurementUnit): BuilderFood {
  const parsedServing = parseServingAmount(food.serving);
  const defaultUnit = parsedServing?.unit ?? "serving";
  const selectedUnit = unit ?? defaultUnit;
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : parsedServing?.amount ?? 1;
  const safeQuantity = getFoodQuantityMultiplier(food, safeAmount, selectedUnit);
  const scaledMicronutrients = Object.fromEntries(
    Object.entries(food.micronutrients ?? {}).map(([key, value]) => [key, value * safeQuantity])
  );

  return {
    id: `${food.id}_${Date.now()}`,
    foodId: food.id,
    name: food.name,
    serving: food.serving,
    measurementUnit: selectedUnit,
    calories: food.calories * safeQuantity,
    protein: food.protein * safeQuantity,
    carbs: food.carbs * safeQuantity,
    fats: food.fats * safeQuantity,
    fibre: food.fibre * safeQuantity,
    quantity: safeQuantity,
    micronutrients: scaledMicronutrients
  };
}

export function mapApiFoodToBuilderFood(food: ApiFoodLibraryItem): Food {
  return {
    id: food.id,
    name: food.name,
    serving: food.servingSize,
    source: getApiFoodSource(food),
    calories: food.calories,
    protein: food.proteinGrams,
    carbs: food.carbsGrams,
    fats: food.fatGrams,
    fibre: food.fiberGrams ?? 0,
    micronutrients: getApiFoodMicronutrients(food.metadata),
    category: food.category
  };
}

function mergeFoodOptions(primaryFoods: Food[], fallbackFoods: Food[]) {
  const merged = new Map<string, Food>();

  [...primaryFoods, ...fallbackFoods].forEach((food) => {
    if (!merged.has(food.id)) {
      merged.set(food.id, food);
    }
  });

  return Array.from(merged.values());
}

function getApiFoodSource(food: ApiFoodLibraryItem): FoodDatabaseSource {
  const metadata = isRecord(food.metadata) ? food.metadata : {};
  const source = String(metadata.source ?? "").toUpperCase();
  const sourceId = String(metadata.sourceId ?? "").toLowerCase();

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

  return "USDA";
}

function getApiFoodMicronutrients(metadata: unknown) {
  if (!isRecord(metadata) || !isRecord(metadata.nutrients)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata.nutrients)
      .map(([key, value]) => [key, Number(value)])
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rescaleBuilderFood(food: BuilderFood, nextAmount: number): BuilderFood {
  const parsedServing = parseServingAmount(food.serving);
  const unit = food.measurementUnit ?? parsedServing?.unit ?? "serving";
  const safeAmount = Number.isFinite(nextAmount) && nextAmount > 0 ? nextAmount : getFoodQuantityDisplay(food).amount;
  const nextQuantity = getFoodQuantityMultiplier(food, safeAmount, unit);
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

export function parseServingAmount(serving: string) {
  const match = serving.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|mL|millilitre|millilitres|milliliter|milliliters|oz|ounce|ounces)\b/i);

  if (!match) {
    return null;
  }

  return {
    amount: Number(match[1]),
    unit: normaliseServingUnit(match[2])
  };
}

export function normaliseServingUnit(unit: string): FoodMeasurementUnit {
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

  if (["g", "ml", "oz", "cups", "tbsp", "tsp", "serving"].includes(lowerUnit)) {
    return lowerUnit as FoodMeasurementUnit;
  }

  return "serving";
}

export function getFoodQuantityMultiplier(food: Pick<Food, "serving">, amount: number, unit: FoodMeasurementUnit) {
  const parsedServing = parseServingAmount(food.serving);

  if (!parsedServing) {
    return amount;
  }

  const convertedAmount = convertMeasurementToServingUnit(amount, unit, parsedServing.unit);

  return convertedAmount === null ? amount : convertedAmount / parsedServing.amount;
}

export function parseMealBuilderNumberInput(value: string) {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMealBuilderServingSize(form: NewFoodFormState) {
  const servingSize = form.servingSize.trim();

  if (!servingSize) {
    return form.servingDescription;
  }

  return `${servingSize} ${form.servingDescription}`;
}

export function convertMeasurementToServingUnit(amount: number, unit: FoodMeasurementUnit, servingUnit: FoodMeasurementUnit) {
  if (unit === servingUnit) {
    return amount;
  }

  if (servingUnit === "g" && unit === "oz") {
    return amount * 28.3495;
  }

  if (servingUnit === "oz" && unit === "g") {
    return amount / 28.3495;
  }

  if (servingUnit === "ml") {
    if (unit === "cups") {
      return amount * 250;
    }

    if (unit === "tbsp") {
      return amount * 15;
    }

    if (unit === "tsp") {
      return amount * 5;
    }
  }

  return null;
}

export function getFoodQuantityDisplay(food: BuilderFood) {
  const parsedServing = parseServingAmount(food.serving);
  const unit = food.measurementUnit ?? parsedServing?.unit;

  if (!parsedServing || !unit) {
    return {
      amount: food.quantity,
      unit: food.quantity === 1 ? "serving" : "servings"
    };
  }

  const servingAmount = parsedServing.amount * food.quantity;

  if (unit === parsedServing.unit) {
    return {
      amount: servingAmount,
      unit
    };
  }

  if (parsedServing.unit === "g" && unit === "oz") {
    return {
      amount: servingAmount / 28.3495,
      unit
    };
  }

  if (parsedServing.unit === "oz" && unit === "g") {
    return {
      amount: servingAmount * 28.3495,
      unit
    };
  }

  if (parsedServing.unit === "ml") {
    if (unit === "cups") {
      return {
        amount: servingAmount / 250,
        unit
      };
    }

    if (unit === "tbsp") {
      return {
        amount: servingAmount / 15,
        unit
      };
    }

    if (unit === "tsp") {
      return {
        amount: servingAmount / 5,
        unit
      };
    }
  }

  return {
    amount: food.quantity,
    unit
  };
}

function formatQuantityInputValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function calculateMealTotals(meal: BuilderMeal) {
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

export function calculateDayTotals(day?: BuilderDay) {
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

export function calculatePlanTotals(days: BuilderDay[]) {
  return days.reduce(
    (totals, day) => {
      const dayTotals = calculateDayTotals(day);

      return {
        calories: totals.calories + dayTotals.calories,
        protein: totals.protein + dayTotals.protein,
        carbs: totals.carbs + dayTotals.carbs,
        fats: totals.fats + dayTotals.fats,
        fibre: totals.fibre + dayTotals.fibre
      };
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0, fibre: 0 }
  );
}

export function calculateMacroDayTotals(day: MacroBuilderDay, eachMeal: boolean) {
  if (!eachMeal) {
    return {
      calories: Number(day.calories) || 0,
      protein: Number(day.protein) || 0,
      carbs: Number(day.carbs) || 0,
      fats: Number(day.fats) || 0
    };
  }

  return day.meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + (Number(meal.calories) || 0),
      protein: totals.protein + (Number(meal.protein) || 0),
      carbs: totals.carbs + (Number(meal.carbs) || 0),
      fats: totals.fats + (Number(meal.fats) || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

export function calculateMacroPlanSummary(days: MacroBuilderDay[], eachMeal = false) {
  return days.reduce(
    (totals, day) => {
      const dayTotals = calculateMacroDayTotals(day, eachMeal);

      return {
        calories: totals.calories + dayTotals.calories,
        protein: totals.protein + dayTotals.protein,
        carbs: totals.carbs + dayTotals.carbs,
        fats: totals.fats + dayTotals.fats
      };
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

export function calculateTemplateTotals(template: ApiMealPlanTemplate["template"]) {
  return (template.days ?? []).reduce(
    (totals, day) => {
      day.meals.forEach((meal) => {
        meal.foods.forEach((food) => {
          totals.calories += food.calories;
          totals.protein += food.proteinGrams;
          totals.carbs += food.carbsGrams;
          totals.fats += food.fatGrams;
        });
      });

      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

export function getFullMealPlanTemplatePayload(days: BuilderDay[]): ApiMealPlanTemplate["template"] {
  const templateDays = days.length > 0 ? days : [createBuilderDay(1)];

  return {
    days: templateDays.map((day, dayIndex) => ({
      name: day.name.trim() || `Day ${dayIndex + 1}`,
      meals: (day.meals.length > 0 ? day.meals : [createBuilderMeal(1)]).map((meal) => ({
        meal: meal.name.trim() || "Meal",
        notes: meal.notes,
        foods: meal.foods.map((food) => ({
          foodId: food.foodId,
          foodName: food.name,
          servingSize: getFoodServingLabel(food),
          calories: Math.round(food.calories),
          proteinGrams: food.protein,
          carbsGrams: food.carbs,
          fatGrams: food.fats,
          fiberGrams: food.fibre,
          quantity: food.quantity,
          measurementUnit: food.measurementUnit,
          micronutrients: food.micronutrients
        }))
      }))
    }))
  };
}

export function getMacroMealPlanTemplatePayload(days: MacroBuilderDay[], eachMeal: boolean): ApiMealPlanTemplate["template"] {
  const templateDays = days.length > 0 ? days : [createMacroBuilderDay(1)];

  return {
    days: templateDays.map((day, dayIndex) => {
      return {
        name: day.name.trim() || `Day ${dayIndex + 1}`,
        meals: eachMeal
          ? (day.meals.length > 0 ? day.meals : [createMacroBuilderMeal(1)]).map((meal, mealIndex) => {
              const mealName = meal.title.trim() || `Meal ${mealIndex + 1}`;

              return {
                meal: mealName,
                foods: [
                  {
                    foodName: `${mealName} macro target`,
                    servingSize: "Macro target",
                    calories: Number(meal.calories) || 0,
                    proteinGrams: Number(meal.protein) || 0,
                    carbsGrams: Number(meal.carbs) || 0,
                    fatGrams: Number(meal.fats) || 0,
                    fiberGrams: 0
                  }
                ]
              };
            })
          : [
              {
                meal: "Daily Macro Targets",
                foods: [
                  {
                    foodName: "Daily macro target",
                    servingSize: "Macro target",
                    calories: Number(day.calories) || 0,
                    proteinGrams: Number(day.protein) || 0,
                    carbsGrams: Number(day.carbs) || 0,
                    fatGrams: Number(day.fats) || 0,
                    fiberGrams: 0
                  }
                ]
              }
            ]
      };
    })
  };
}

function getMealTemplateSaveInput(template: MealTemplateCard): MealPlanTemplateSaveInput {
  return {
    name: template.name.trim() || "Untitled Meal Template",
    phase: template.description.trim() || "Meal template",
    targetCalories: Math.round(template.calories),
    proteinGrams: template.protein,
    carbsGrams: template.carbs,
    fatGrams: template.fats,
    status: "published",
    template:
      template.template ??
      template.apiTemplate?.template ?? {
        days: [
          {
            name: "Template Day",
            meals: [
              {
                meal: template.name.trim() || "Meal",
                foods: []
              }
            ]
          }
        ]
      }
  };
}

export function appendMealTemplateToPlanTemplate(planTemplate: ApiMealPlanTemplate, mealTemplate: MealTemplateCard): MealPlanTemplateSaveInput {
  const mealTemplatePayload = mealTemplate.template ?? mealTemplate.apiTemplate?.template ?? getMealTemplateSaveInput(mealTemplate).template;
  const mealsToAdd = (mealTemplatePayload.days ?? [])
    .flatMap((day) => day.meals)
    .map((meal) => ({
      meal: meal.meal.trim() || mealTemplate.name,
      notes: meal.notes,
      foods: meal.foods.map((food) => ({ ...food }))
    }));
  const fallbackMeal = {
    meal: mealTemplate.name,
    foods: [
      {
        foodName: mealTemplate.name,
        servingSize: "Meal template",
        calories: mealTemplate.calories,
        proteinGrams: mealTemplate.protein,
        carbsGrams: mealTemplate.carbs,
        fatGrams: mealTemplate.fats,
        fiberGrams: 0
      }
    ]
  };
  const currentDays =
    planTemplate.template.days && planTemplate.template.days.length > 0
      ? planTemplate.template.days.map((day) => ({
          name: day.name,
          meals: day.meals.map((meal) => ({
            meal: meal.meal,
            notes: meal.notes,
            foods: meal.foods.map((food) => ({ ...food }))
          }))
        }))
      : [{ name: "Day 1", meals: [] }];
  const [firstDay, ...remainingDays] = currentDays;

  return {
    name: planTemplate.name,
    phase: planTemplate.phase ?? "Full meal plan",
    targetCalories: planTemplate.targetCalories,
    proteinGrams: planTemplate.proteinGrams,
    carbsGrams: planTemplate.carbsGrams,
    fatGrams: planTemplate.fatGrams,
    status: planTemplate.status === "published" ? "published" : "draft",
    template: {
      days: [
        {
          ...firstDay,
          meals: [...firstDay.meals, ...(mealsToAdd.length > 0 ? mealsToAdd : [fallbackMeal])]
        },
        ...remainingDays
      ]
    }
  };
}

function getFoodServingLabel(food: BuilderFood) {
  const quantityDisplay = getFoodQuantityDisplay(food);
  return `${formatMacroValue(quantityDisplay.amount)} ${quantityDisplay.unit}`;
}

export function calculateNutrientTotals(day?: BuilderDay) {
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

// Default targets use Eat for Health adult female NRV/SDT values until client-specific nutrient profiles are available.
const NUTRIENT_SECTIONS: NutrientSectionDefinition[] = [
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
    title: "Carbohydrates",
    rows: [
      { key: "carbs", label: "Carbs", unit: "g", target: 275 },
      { key: "netCarbs", label: "Net Carbs", unit: "g", target: 275, indent: true },
      { key: "fibre", label: "Dietary Fibre", unit: "g", target: 28, indent: true },
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
    title: "Vitamins",
    rows: [
      { key: "vitaminB1", label: "B1 (Thiamine)", unit: "mg", target: 1.1 },
      { key: "vitaminB2", label: "B2 (Riboflavin)", unit: "mg", target: 1.1 },
      { key: "vitaminB3", label: "B3 (Niacin)", unit: "mg", target: 14 },
      { key: "vitaminB5", label: "B5 (Pantothenic Acid)", unit: "mg", target: 5 },
      { key: "vitaminB6", label: "B6 (Pyridoxine)", unit: "mg", target: 1.3 },
      { key: "vitaminB12", label: "B12 (Cobalamin)", unit: "µg", target: 2.4 },
      { key: "folate", label: "Folate", unit: "µg", target: 400 },
      { key: "vitaminA", label: "Vitamin A", unit: "µg", target: 1220 },
      { key: "vitaminC", label: "Vitamin C", unit: "mg", target: 190 },
      { key: "vitaminD", label: "Vitamin D", unit: "IU", target: 200 },
      { key: "vitaminE", label: "Vitamin E", unit: "mg", target: 14 },
      { key: "vitaminK", label: "Vitamin K", unit: "µg", target: 60 }
    ]
  },
  {
    title: "Minerals",
    rows: [
      { key: "calcium", label: "Calcium", unit: "mg", target: 1000 },
      { key: "copper", label: "Copper", unit: "mg", target: 0.9 },
      { key: "iron", label: "Iron", unit: "mg", target: 18 },
      { key: "magnesium", label: "Magnesium", unit: "mg", target: 320 },
      { key: "manganese", label: "Manganese", unit: "mg", target: 5 },
      { key: "phosphorus", label: "Phosphorus", unit: "mg", target: 1000 },
      { key: "potassium", label: "Potassium", unit: "mg", target: 2800 },
      { key: "selenium", label: "Selenium", unit: "µg", target: 60 },
      { key: "sodium", label: "Sodium", unit: "mg", target: 2000 },
      { key: "zinc", label: "Zinc", unit: "mg", target: 8 }
    ]
  }
];

function MicronutrientBreakdown({ totals, dayName }: { totals: Record<string, number>; dayName: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Food analysis</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Nutrient breakdown</h3>
          <p className="mt-1 text-sm text-slate-500">
            Live vitamin, mineral, carbohydrate, lipid, and protein detail for {dayName}.
          </p>
        </div>
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
  foods: foodOptions,
  filteredFoods,
  onSourceChange,
  onSearchChange,
  onQuickAdd,
  onAddFoods,
  onClose
}: {
  source: FoodDatabaseSource;
  searchQuery: string;
  foods: Food[];
  filteredFoods: Food[];
  onSourceChange: (source: FoodDatabaseSource) => void;
  onSearchChange: (query: string) => void;
  onQuickAdd: () => void;
  onAddFoods: (selections: Array<{ foodId: string; quantity: number; unit: FoodMeasurementUnit }>) => void;
  onClose: () => void;
}) {
  const sources: FoodDatabaseSource[] = ["AUS/NZ", "EFSA", "USDA"];
  const measurementUnits: FoodMeasurementUnit[] = ["g", "ml", "oz", "cups", "tbsp", "tsp", "serving"];
  const [selectedFoods, setSelectedFoods] = useState<Record<string, { quantity: string; unit: FoodMeasurementUnit }>>({});
  const selectedFoodEntries = foodOptions.filter((food) => selectedFoods[food.id]);

  function isVerifiedDatabaseFood(food: Food) {
    return VERIFIED_FOOD_SOURCES.has(String(food.source));
  }

  function getDefaultSelection(food: Food) {
    const parsedServing = parseServingAmount(food.serving);

    return {
      quantity: String(parsedServing?.amount ?? 1),
      unit: (parsedServing?.unit as FoodMeasurementUnit | undefined) ?? "serving"
    };
  }

  function toggleFood(food: Food) {
    setSelectedFoods((currentSelections) => {
      if (currentSelections[food.id]) {
        const remainingSelections = { ...currentSelections };
        delete remainingSelections[food.id];

        return remainingSelections;
      }

      return {
        ...currentSelections,
        [food.id]: getDefaultSelection(food)
      };
    });
  }

  function updateSelection(foodId: string, updates: Partial<{ quantity: string; unit: FoodMeasurementUnit }>) {
    setSelectedFoods((currentSelections) => ({
      ...currentSelections,
      [foodId]: {
        ...(currentSelections[foodId] ?? { quantity: "1", unit: "serving" }),
        ...updates
      }
    }));
  }

  function addSelectedFoods() {
    onAddFoods(
      Object.entries(selectedFoods).map(([foodId, selection]) => {
        const parsedQuantity = Number(selection.quantity);

        return {
          foodId,
          quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
          unit: selection.unit
        };
      })
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-database-drawer-title"
        className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Food database</p>
            <h3 id="food-database-drawer-title" className="mt-1 text-2xl font-black text-slate-950">
              Add food from database
            </h3>
            <p className="mt-2 text-sm text-slate-500">Recent foods show first. Search to pull from the full verified library.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
              onClick={onQuickAdd}
            >
              + Quick add food
            </button>
            <button type="button" aria-label="Close food search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,28rem)]">
          <div className="flex min-h-0 flex-col p-6">
            <label className="grid gap-2">
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
              <p className="mt-3 text-sm font-medium text-slate-600">
                {searchQuery.trim() ? `Showing ${source} search results` : `Showing recent ${source} foods`}
              </p>
            </div>

            <div role="list" aria-label="Selectable foods" className="mt-6 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200">
              {filteredFoods.map((food) => {
                const selected = Boolean(selectedFoods[food.id]);
                const verified = isVerifiedDatabaseFood(food);

                return (
                  <label
                    key={food.id}
                    role="listitem"
                    className={cn(
                      "grid cursor-pointer grid-cols-[auto_minmax(0,1.4fr)_8rem_11rem] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-indigo-50",
                      selected ? "bg-indigo-50" : "bg-white"
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${food.name}`}
                      checked={selected}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={() => toggleFood(food)}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-bold text-slate-900">{food.name}</span>
                        <span
                          aria-label={verified ? "Verified database food" : "Coach-added food"}
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                            verified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {verified ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{food.category}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{food.serving}</span>
                    <span className="text-xs font-bold text-slate-600">
                      {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fats}g
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <section aria-label="Selected foods" className="flex min-h-0 flex-col border-t border-slate-200 bg-slate-50 p-6 lg:min-w-[26rem] lg:border-l lg:border-t-0">
            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Selected foods</h4>
            {selectedFoodEntries.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Select one or more foods to set quantities before adding them to the meal.
              </p>
            ) : (
              <div role="list" aria-label="Selected food quantity list" className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
                {selectedFoodEntries.map((food) => {
                  const selection = selectedFoods[food.id] ?? getDefaultSelection(food);
                  const parsedQuantity = Number(selection.quantity);
                  const safeQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
                  const multiplier = getFoodQuantityMultiplier(food, safeQuantity, selection.unit);

                  return (
                    <div key={food.id} role="listitem" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="font-bold text-slate-950">{food.name}</p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                        <label className="grid min-w-0 gap-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Quantity</span>
                          <input
                            type="number"
                            min="0.25"
                            step="0.25"
                            aria-label={`Quantity for ${food.name}`}
                            value={selection.quantity}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(event) => updateSelection(food.id, { quantity: event.target.value })}
                          />
                        </label>
                        <label className="grid min-w-0 gap-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Measure</span>
                          <select
                            aria-label={`Measurement for ${food.name}`}
                            value={selection.unit}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(event) => updateSelection(food.id, { unit: event.target.value as FoodMeasurementUnit })}
                          >
                            {measurementUnits.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                        {formatMacroValue(food.calories * multiplier)} kcal · P {formatMacroValue(food.protein * multiplier)}g · C{" "}
                        {formatMacroValue(food.carbs * multiplier)}g · F {formatMacroValue(food.fats * multiplier)}g · Fibre{" "}
                        {formatMacroValue(food.fibre * multiplier)}g
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="-mx-6 mt-6 border-t border-slate-200 bg-slate-50 p-6">
              <button
                type="button"
                disabled={selectedFoodEntries.length === 0}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={addSelectedFoods}
              >
                Add selected foods
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function QuickAddFoodModal({
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit
}: {
  form: NewFoodFormState;
  saving: boolean;
  error: string | null;
  onChange: (key: keyof NewFoodFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="quick-add-food-title" className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Organization food database</p>
            <h2 id="quick-add-food-title" className="text-xl font-bold text-slate-800">
              Add Own Food item for your nutrition plan
            </h2>
          </div>
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
          {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
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
  days,
  activeDayId,
  onActiveDayChange,
  onDaysChange,
  showMealFields
}: {
  title: string;
  setTitle: (value: string) => void;
  days: MacroBuilderDay[];
  activeDayId: string;
  onActiveDayChange: (dayId: string) => void;
  onDaysChange: (days: MacroBuilderDay[]) => void;
  showMealFields: boolean;
}) {
  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0] ?? createMacroBuilderDay(1);
  const activeDayTotals = calculateMacroDayTotals(activeDay, showMealFields);

  const updateActiveDay = (updates: Partial<Omit<MacroBuilderDay, "id">>) => {
    onDaysChange(days.map((day) => (day.id === activeDay.id ? { ...day, ...updates } : day)));
  };

  const updateMacroMeal = (mealId: string, updates: Partial<Omit<MacroBuilderMeal, "id">>) => {
    updateActiveDay({
      meals: activeDay.meals.map((meal) => (meal.id === mealId ? { ...meal, ...updates } : meal))
    });
  };

  const addDay = () => {
    const nextDay = createMacroBuilderDay(days.length + 1);
    onDaysChange([...days, nextDay]);
    onActiveDayChange(nextDay.id);
  };

  const addMeal = () => {
    updateActiveDay({
      meals: [...activeDay.meals, createMacroBuilderMeal(activeDay.meals.length + 1)]
    });
  };

  const duplicateActiveDay = () => {
    const duplicatedDay = cloneMacroBuilderDay(activeDay, `${activeDay.name.trim() || "Day"} copy`);
    onDaysChange([...days, duplicatedDay]);
    onActiveDayChange(duplicatedDay.id);
  };

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
        <div role="tablist" aria-label="Macro plan days" className="flex flex-wrap items-center gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={activeDay.id === day.id}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-bold transition-colors",
                activeDay.id === day.id
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              )}
              onClick={() => onActiveDayChange(day.id)}
            >
              {day.name.trim() || "Untitled day"}
            </button>
          ))}
        </div>
        <button type="button" className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100" onClick={addDay}>
          + Add New Day
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.32fr] lg:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Day Name</span>
          <input
            value={activeDay.name}
            onChange={(event) => updateActiveDay({ name: event.target.value })}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <button type="button" className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100" onClick={duplicateActiveDay}>
          Copy / Duplicate Day
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MacroTotalCard label="Total Protein (g)" value={String(activeDayTotals.protein)} />
        <MacroTotalCard label="Total Carbs (g)" value={String(activeDayTotals.carbs)} />
        <MacroTotalCard label="Total Fat (g)" value={String(activeDayTotals.fats)} />
        <MacroTotalCard label="Total Calories (kcal)" value={String(activeDayTotals.calories)} />
      </div>

      {showMealFields ? (
        <div className="space-y-4">
          {activeDay.meals.map((meal, mealIndex) => (
            <section key={meal.id} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm" aria-label={`${meal.title} macro targets`}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Meal Title</span>
                <input
                  aria-label={`Meal title for meal ${mealIndex + 1}`}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={meal.title}
                  onChange={(event) => updateMacroMeal(meal.id, { title: event.target.value })}
                />
                <span className="text-xs text-slate-400">Please enter meal title. Ex: Breakfast, Lunch etc...</span>
              </label>
              <div className="mt-5 grid gap-5 md:grid-cols-4">
                <MacroInput
                  label="Protein"
                  ariaLabel={`Protein for Meal ${mealIndex + 1}`}
                  value={meal.protein}
                  onChange={(value) => updateMacroMeal(meal.id, { protein: value })}
                  unit="g"
                  helper="Please enter protein."
                />
                <MacroInput
                  label="Carbs"
                  ariaLabel={`Carbs for Meal ${mealIndex + 1}`}
                  value={meal.carbs}
                  onChange={(value) => updateMacroMeal(meal.id, { carbs: value })}
                  unit="g"
                  helper="Please enter carbohydrate."
                />
                <MacroInput
                  label="Fat"
                  ariaLabel={`Fat for Meal ${mealIndex + 1}`}
                  value={meal.fats}
                  onChange={(value) => updateMacroMeal(meal.id, { fats: value })}
                  unit="g"
                  helper="Please enter fat."
                />
                <MacroInput
                  label="Calories"
                  ariaLabel={`Calories for Meal ${mealIndex + 1}`}
                  value={meal.calories}
                  onChange={(value) => updateMacroMeal(meal.id, { calories: value })}
                  unit="Kcal"
                  helper="Please enter calories."
                />
              </div>
            </section>
          ))}
          <button type="button" aria-label="Add meal" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700" onClick={addMeal}>
            + Add meal
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-4">
          <MacroInput label="Protein" value={activeDay.protein} onChange={(value) => updateActiveDay({ protein: value })} unit="g" helper="Please enter protein." />
          <MacroInput label="Carbs" value={activeDay.carbs} onChange={(value) => updateActiveDay({ carbs: value })} unit="g" helper="Please enter carbohydrate." />
          <MacroInput label="Fat" value={activeDay.fats} onChange={(value) => updateActiveDay({ fats: value })} unit="g" helper="Please enter fat." />
          <MacroInput label="Calories" value={activeDay.calories} onChange={(value) => updateActiveDay({ calories: value })} unit="Kcal" helper="Please enter calories." />
        </div>
      )}

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
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-6 text-center shadow-sm" aria-label={`${label}: ${value}`}>
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-600">{label}</p>
    </div>
  );
}

function MacroInput({
  label,
  ariaLabel,
  value,
  onChange,
  unit,
  helper
}: {
  label: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  helper: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        <input
          aria-label={ariaLabel ?? label}
          type="number"
          min="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
        />
        <span className="border-l border-slate-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">{unit}</span>
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
    <section role="tabpanel" aria-label="Meal Plans" className="relative overflow-visible">
      {openActionMenuId ? (
        <button
          type="button"
          aria-label="Close meal plan actions"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setOpenActionMenuId(null)}
        />
      ) : null}
      <div className="overflow-visible rounded-xl border border-gray-200 bg-white">
        <table role="table" aria-label="Meal plan list" className="w-full border-collapse">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-6 py-4 text-left">Meal Plan Name</th>
              <th className="px-6 py-4 text-left">Assigned To</th>
              <th className="px-6 py-4 text-left">Calories / Macros</th>
              <th className="px-6 py-4 text-left">Last Edited</th>
              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => {
              const menuOpen = openActionMenuId === assignment.id;

              return (
                <tr key={assignment.id} className={cn("relative border-b border-gray-100 last:border-0 hover:bg-gray-50", menuOpen ? "z-40" : "z-0")}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{assignment.planName}</div>
                    <div className="text-xs text-gray-500">{assignment.status}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {assignment.activeClientCount} active {assignment.activeClientCount === 1 ? "client" : "clients"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{assignment.calories} cal</span>
                    <span className="ml-3 font-medium text-indigo-600">P {assignment.protein}g</span>
                    <span className="ml-2 font-medium text-green-600">C {assignment.carbs}g</span>
                    <span className="ml-2 font-medium text-orange-600">F {assignment.fats}g</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{assignment.lastEdited}</td>
                  <td className="relative px-6 py-4">
                    <MealPlanInlineActions
                      assignment={assignment}
                      menuOpen={menuOpen}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAssign={onAssign}
                      onCopy={onCopy}
                      onMenuToggle={() => setOpenActionMenuId((currentId) => (currentId === assignment.id ? null : assignment.id))}
                      onMenuClose={() => setOpenActionMenuId(null)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-600">No active meal plans have been assigned yet.</p>
      ) : null}
    </section>
  );
}

function MealPlanInlineActions({
  assignment,
  menuOpen,
  onEdit,
  onDelete,
  onAssign,
  onCopy,
  onMenuToggle,
  onMenuClose
}: {
  assignment: MealAssignmentRow;
  menuOpen: boolean;
  onEdit: (assignment: MealAssignmentRow) => void;
  onDelete: (assignment: MealAssignmentRow) => void;
  onAssign: (assignment: MealAssignmentRow) => void;
  onCopy: (assignment: MealAssignmentRow) => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
}) {
  return (
    <div className="relative flex items-center gap-2">
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
        aria-expanded={menuOpen}
        aria-controls={`meal-plan-actions-${assignment.id}`}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        onClick={onMenuToggle}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      {menuOpen ? (
        <MealPlanActionMenu
          id={`meal-plan-actions-${assignment.id}`}
          planName={assignment.planName}
          onEdit={() => {
            onMenuClose();
            onEdit(assignment);
          }}
          onDelete={() => {
            onMenuClose();
            onDelete(assignment);
          }}
          onAssign={() => {
            onMenuClose();
            onAssign(assignment);
          }}
          onCopy={() => {
            onMenuClose();
            onCopy(assignment);
          }}
        />
      ) : null}
    </div>
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
  view,
  onViewChange,
  onOpenTemplate,
  onUseTemplate,
  onDeleteTemplate
}: {
  templates: MealTemplateCard[];
  canAssign: boolean;
  view: MealPlanLibraryView;
  onViewChange: (view: MealPlanLibraryView) => void;
  onOpenTemplate: (template: MealTemplateCard) => void;
  onUseTemplate: (template: MealTemplateCard) => void;
  onDeleteTemplate: (template: MealTemplateCard) => void;
}) {
  return (
    <section role="tabpanel" aria-label="Meal Templates">
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Meal template view options">
          {(["cards", "list"] as MealPlanLibraryView[]).map((viewOption) => (
            <button
              key={viewOption}
              type="button"
              aria-pressed={view === viewOption}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
                view === viewOption ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
              )}
              onClick={() => onViewChange(viewOption)}
            >
              {viewOption === "cards" ? "Card view" : "List view"}
            </button>
          ))}
        </div>
      </div>

      {view === "cards" ? (
        <div role="region" aria-label="Meal template cards" className="grid gap-6 md:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              role="button"
              tabIndex={0}
              aria-label={`View ${template.name}`}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-all hover:border-indigo-300 hover:shadow-lg"
              onClick={() => onOpenTemplate(template)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenTemplate(template);
                }
              }}
            >
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
                  onClick={(event) => {
                    event.stopPropagation();
                    onUseTemplate(template);
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Use Template
                </button>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteTemplate(template);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete Template
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table role="table" aria-label="Meal template list" className="w-full border-collapse">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-6 py-4 text-left">Template</th>
                <th className="px-6 py-4 text-left">Calories / Macros</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button type="button" className="text-left font-medium text-gray-900 hover:text-indigo-700" onClick={() => onOpenTemplate(template)}>
                      {template.name}
                    </button>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{template.calories} cal</span>
                    <span className="ml-3 font-medium text-indigo-600">P {template.protein}g</span>
                    <span className="ml-2 font-medium text-green-600">C {template.carbs}g</span>
                    <span className="ml-2 font-medium text-orange-600">F {template.fats}g</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300"
                        disabled={!canAssign}
                        onClick={() => onUseTemplate(template)}
                      >
                        Use Template
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        onClick={() => onDeleteTemplate(template)}
                      >
                        Delete Template
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          No meal plan templates exist yet. Create a new template to start the library.
        </p>
      ) : null}
    </section>
  );
}

function TemplatePlanTargetDialog({
  template,
  mealPlans,
  saving,
  onClose,
  onSubmit
}: {
  template: MealTemplateCard;
  mealPlans: MealAssignmentRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (targetPlan: MealAssignmentRow) => void;
}) {
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const persistedMealPlans = mealPlans.filter((plan) => Boolean(plan.apiTemplate?.id));
  const filteredMealPlans = persistedMealPlans.filter((plan) =>
    plan.planName.toLowerCase().includes(planSearchQuery.trim().toLowerCase())
  );
  const selectedPlan = persistedMealPlans.find((plan) => plan.id === selectedPlanId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-meal-template-title"
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedPlan) {
            onSubmit(selectedPlan);
          }
        }}
      >
        <h2 id="add-meal-template-title" className="text-2xl font-bold text-gray-900">
          Add Meal Template to Meal Plan
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Add <span className="font-medium text-gray-900">{template.name}</span> into an existing meal plan.
        </p>

        <label htmlFor="meal-plan-template-target-search" className="mt-6 block text-sm font-medium text-gray-700">
          Search meal plans
        </label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            id="meal-plan-template-target-search"
            type="search"
            value={planSearchQuery}
            placeholder="Search existing meal plans..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setPlanSearchQuery(event.target.value)}
          />
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {filteredMealPlans.map((plan) => (
            <label
              key={plan.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50"
            >
              <span>
                <span className="block font-semibold text-gray-900">{plan.planName}</span>
                <span className="block text-xs text-gray-500">
                  {plan.calories} cal · P {plan.protein}g · C {plan.carbs}g · F {plan.fats}g
                </span>
              </span>
              <input
                type="radio"
                name="meal-template-target-plan"
                aria-label={`Select ${plan.planName}`}
                checked={selectedPlanId === plan.id}
                onChange={() => setSelectedPlanId(plan.id)}
              />
            </label>
          ))}
          {filteredMealPlans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
              No existing persisted meal plans match that search.
            </p>
          ) : null}
        </div>

        {persistedMealPlans.length === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Create and save a meal plan before adding individual meal templates into it.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || !selectedPlan}
          >
            Add to Meal Plan
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

function MealTemplateDetailsDialog({
  template,
  saving,
  onClose,
  onSave
}: {
  template: MealTemplateCard;
  saving: boolean;
  onClose: () => void;
  onSave: (input: MealPlanTemplateSaveInput) => void;
}) {
  const templatePayload = template.template ?? getMealTemplateSaveInput(template).template;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [days, setDays] = useState<NonNullable<ApiMealPlanTemplate["template"]["days"]>>(() => templatePayload.days ?? []);
  const totals = calculateTemplateTotals({ days });

  function updateMealNotes(dayIndex: number, mealIndex: number, notes: string) {
    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              meals: day.meals.map((meal, currentMealIndex) => (currentMealIndex === mealIndex ? { ...meal, notes } : meal))
            }
          : day
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-template-details-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Meal Template</p>
            {editing ? (
              <>
                <h2 id="meal-template-details-title" className="sr-only">
                  Edit {template.name}
                </h2>
                <input
                  aria-label="Meal template name"
                  value={name}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-2xl font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(event) => setName(event.target.value)}
                />
              </>
            ) : (
              <h2 id="meal-template-details-title" className="mt-1 text-2xl font-black text-slate-950">
                {template.name}
              </h2>
            )}
            <p className="mt-2 text-sm text-slate-500">
              {formatMacroValue(totals.calories)} kcal · P {formatMacroValue(totals.protein)}g · C {formatMacroValue(totals.carbs)}g · F{" "}
              {formatMacroValue(totals.fats)}g
            </p>
          </div>
          <button type="button" aria-label="Close meal template details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {days.map((day, dayIndex) => (
            <div key={`${day.name}-${dayIndex}`} className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">{day.name}</h3>
              <div className="mt-4 space-y-4">
                {day.meals.map((meal, mealIndex) => (
                  <article key={`${meal.meal}-${mealIndex}`} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="font-bold text-slate-900">{meal.meal}</h4>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{meal.foods.length} ingredients</span>
                    </div>
                    {editing ? (
                      <label className="mt-3 grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Notes</span>
                        <textarea
                          aria-label={`Notes for ${meal.meal}`}
                          value={meal.notes ?? ""}
                          className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          onChange={(event) => updateMealNotes(dayIndex, mealIndex, event.target.value)}
                        />
                      </label>
                    ) : meal.notes ? (
                      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">{meal.notes}</p>
                    ) : null}
                    <div role="table" aria-label={`${meal.meal} template ingredients`} className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div role="row" className="grid grid-cols-5 gap-2 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        <span role="columnheader">Ingredient</span>
                        <span role="columnheader">Serving</span>
                        <span role="columnheader">Calories</span>
                        <span role="columnheader">Protein</span>
                        <span role="columnheader">Macros</span>
                      </div>
                      {meal.foods.map((food) => (
                        <div key={`${food.foodId ?? food.foodName}-${food.servingSize}`} role="row" className="grid grid-cols-5 gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700">
                          <span role="cell" className="font-semibold text-slate-900">
                            {food.foodName}
                          </span>
                          <span role="cell">{food.servingSize}</span>
                          <span role="cell">{formatMacroValue(food.calories)} kcal</span>
                          <span role="cell">{formatMacroValue(food.proteinGrams)}g</span>
                          <span role="cell">
                            C {formatMacroValue(food.carbsGrams)}g · F {formatMacroValue(food.fatGrams)}g
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {editing ? (
            <>
              <button type="button" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700" onClick={() => setEditing(false)}>
                Cancel Edit
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                onClick={() =>
                  onSave({
                    name: name.trim() || template.name,
                    phase: "Meal template",
                    targetCalories: Math.round(totals.calories),
                    proteinGrams: totals.protein,
                    carbsGrams: totals.carbs,
                    fatGrams: totals.fats,
                    status: "published",
                    template: { days }
                  })
                }
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </>
          ) : (
            <button type="button" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white" onClick={() => setEditing(true)}>
              Edit Template
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function getMealTemplateCards(source: MealPlanSource, templates: ApiMealPlanTemplate[]): MealTemplateCard[] {
  if (source === "fixtures") {
    return [];
  }

  return templates.filter((template) => template.status !== "draft").map((template) => ({
    id: template.id,
    name: template.name,
    description: template.phase ? `${template.phase} protocol` : "Nutrition protocol",
    calories: template.targetCalories,
    protein: template.proteinGrams,
    carbs: template.carbsGrams,
    fats: template.fatGrams,
    badge: template.status,
    apiTemplate: template,
    template: template.template
  }));
}

export function getMealAssignmentRows(
  source: MealPlanSource,
  assignments: ApiMealPlanAssignment[],
  templates: ApiMealPlanTemplate[] = []
): MealAssignmentRow[] {
  if (source === "fixtures") {
    return [];
  }

  const assignmentGroups = new Map<string, ApiMealPlanAssignment[]>();
  const templatesById = new Map(templates.map((template) => [template.id, template]));

  assignments.forEach((assignment) => {
    const assignmentKey = assignment.templateId ?? assignment.id;
    assignmentGroups.set(assignmentKey, [...(assignmentGroups.get(assignmentKey) ?? []), assignment]);
  });

  const assignedRows = Array.from(assignmentGroups.entries()).map(([assignmentKey, group]) => {
    const sortedGroup = [...group].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
    const assignment = sortedGroup.find((entry) => entry.status === "active") ?? sortedGroup[0];

    return {
      id: assignmentKey,
      templateId: assignment.templateId,
      planName: assignment.name,
      activeClientCount: group.filter((entry) => entry.status === "active").length,
      calories: assignment.snapshot.targetCalories ?? assignment.targetCalories,
      protein: assignment.snapshot.proteinGrams ?? assignment.proteinGrams,
      carbs: assignment.snapshot.carbsGrams ?? assignment.carbsGrams,
      fats: assignment.snapshot.fatGrams ?? assignment.fatGrams,
      lastEdited: formatDisplayDate(assignment.updatedAt),
      status: assignment.status,
      apiTemplate: assignment.templateId ? templatesById.get(assignment.templateId) ?? null : null
    };
  });

  const assignedTemplateIds = new Set(assignments.map((assignment) => assignment.templateId).filter(Boolean));
  const draftPlanRows = templates
    .filter((template) => template.status === "draft" && !assignedTemplateIds.has(template.id))
    .map((template) => ({
      id: template.id,
      templateId: template.id,
      planName: template.name,
      activeClientCount: 0,
      calories: template.targetCalories,
      protein: template.proteinGrams,
      carbs: template.carbsGrams,
      fats: template.fatGrams,
      lastEdited: formatDisplayDate(template.updatedAt),
      status: "draft",
      apiTemplate: template
    }));

  return [...draftPlanRows, ...assignedRows];
}

export function filterMealAssignments(assignments: MealAssignmentRow[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return assignments;
  }

  return assignments.filter((assignment) =>
    [
      assignment.planName,
      assignment.status,
      `${assignment.activeClientCount} clients`,
      `${assignment.calories} cal`,
      `protein ${assignment.protein}`,
      `carbs ${assignment.carbs}`,
      `fat ${assignment.fats}`
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function filterMealTemplates(templates: MealTemplateCard[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return templates;
  }

  return templates.filter((template) =>
    [
      template.name,
      template.description,
      template.badge,
      `${template.calories} cal`,
      `protein ${template.protein}`,
      `carbs ${template.carbs}`,
      `fat ${template.fats}`
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
