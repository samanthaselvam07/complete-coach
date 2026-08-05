"use client";

import Link from "next/link";
import { Check, ChevronLeft, Droplets, Footprints, LineChart, NotebookPen, Pencil, RefreshCw, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { CheckInDetailPage } from "@/components/check-ins/check-in-detail-page";
import { CheckInHistoryPanel, DailyCheckInsPanel } from "@/components/clients/client-check-in-panels";
import {
  assignSelectedClientForms,
  assignSelectedClientPlans,
  type ClientProfileResponse,
  fetchAssignedClientFormIds,
  fetchAssignedClientPlanIds,
  fetchClientFormOptions,
  fetchPublishedClientFormsByType,
  scheduleAssignedPackagePaymentChange,
  toDateInputValue,
  updateClientProfile
} from "@/components/clients/client-form-actions";
import {
  ClientFormDialog,
  type ClientFormOption,
  clientSummaryToForm,
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState
} from "@/components/clients/client-form-dialog";
import { ClientCalendarPanel, ClientProfileDashboard, ClientRoadmapPeriodisationPanel, ProgressAnalyticsCard } from "@/components/clients/client-profile-dashboard";
import {
  type ApiMealPlanTemplate,
  type MealTemplateCard,
  type MealAssignmentRow,
  type MealPlanTemplateSaveInput,
  NutritionPlanBuilder
} from "@/components/nutrition/meal-plans-page";
import { SupplementProtocolBuilderPage } from "@/components/supplementation/supplement-protocol-builder-page";
import {
  createTrainingProgramDraftFromTemplate,
  getProgramSectionLabel,
  getTrainingProgramTemplatePayload,
  TrainingProgramBuilder,
  type TrainingProgramDraft,
  type TrainingProgramSection,
  type TrainingProgramTemplateDraftSource
} from "@/components/training/training-program-builder";
import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import type { ClientProfile, ClientSummary } from "@/lib/clients/client-models";
import type { ClientNoteSummary } from "@/lib/clients/client-notes";
import { cn } from "@/lib/utils";

type ProfileTab =
  | "Dashboard"
  | "Initial Q&A"
  | "Photos"
  | "Daily Check-Ins"
  | "Check-Ins"
  | "Training"
  | "Nutrition"
  | "Supplementation"
  | "Roadmap"
  | "Calendar"
  | "Logs";

interface ClientProfilePageProps {
  clientId: string;
  highlightedCheckInCompare?: string;
  highlightedCheckInId?: string;
  initialTab?: ProfileTab;
}

interface ApiClientProfile {
  bio?: string | null;
  goals?: string[];
  dateOfBirth?: string | null;
  waterTargetLitres?: number | string | null;
  stepTarget?: number | null;
  trainingLogTargetDays?: number | null;
}

interface ApiMetric {
  measuredAt: string;
  metricValue: number;
  unit: string | null;
}

interface ApiWeightSummary {
  startingWeight: ApiMetric | null;
  currentWeight: ApiMetric | null;
}

interface ApiFormSubmission {
  id: string;
  formName: string;
  formType: string | null;
  answers: unknown;
  submittedAt: string;
}

interface ApiRoadmapPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "completed";
}

interface ClientProfilePhoto {
  id: string;
  url: string;
  label: string;
  submittedAt: string;
  formName: string;
}

interface ApiTrainingAssignment {
  id: string;
  templateId?: string | null;
  name?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  startsOn?: string;
  endsOn?: string | null;
  snapshot?: {
    templateId?: string;
    templateName?: string;
    goal?: string | null;
    durationWeeks?: number;
    template?: {
      days?: Array<{
        name: string;
        exercises?: Array<{
          exerciseId?: string;
          exerciseName: string;
          sets: number;
          reps: string;
          restSeconds?: number;
          rpe?: string;
          rir?: string;
          section?: TrainingProgramSection;
          videoObjectKey?: string;
          imageObjectKey?: string;
          notes?: string;
          primaryMuscles?: string[];
        }>;
      }>;
      instructions?: string;
    };
  };
}

interface ApiMealPlanAssignment {
  id: string;
  templateId?: string | null;
  name?: string;
  phase: string | null;
  status: "active" | "paused" | "completed" | "cancelled";
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  startsOn?: string;
  endsOn?: string | null;
  snapshot?: {
    templateId?: string;
    templateName?: string;
    phase?: string | null;
    targetCalories?: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
    template?: {
      days?: Array<{
        name: string;
        meals?: Array<{
          meal: string;
          foods?: Array<{
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
  };
}

interface ApiSupplementPlanAssignment {
  id: string;
  templateId?: string | null;
  name?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  startsOn?: string;
  endsOn?: string | null;
  snapshot?: {
    templateId?: string;
    templateName?: string;
    description?: string | null;
    template?: {
      phases?: Array<{
        name: string;
        supplements?: Array<{
          supplementId?: string;
          supplementName: string;
          dosage: string;
          timing: string;
          notes?: string;
        }>;
      }>;
    };
  };
}

interface ClientTrainingProgram {
  id: string;
  templateId: string | null;
  name: string;
  status: ApiTrainingAssignment["status"];
  startsOn: string;
  endsOn: string | null;
  durationWeeks: number;
  sessions: ClientProfile["trainingSchedule"];
  template: TrainingProgramTemplateDraftSource["template"];
  draftSource: TrainingProgramTemplateDraftSource;
}

interface ClientNutritionPlan {
  id: string;
  templateId: string | null;
  name: string;
  phase: string;
  status: ApiMealPlanAssignment["status"];
  startsOn: string;
  endsOn: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  days: Array<{
    name: string;
    meals: Array<{
      meal: string;
      foods: Array<{
        foodName: string;
        servingSize: string;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      }>;
    }>;
  }>;
  meals: Array<{
    day: string;
    meal: string;
    foods: string;
    calories: number;
  }>;
  apiTemplate: ApiMealPlanTemplate | null;
}

interface ClientSupplementProtocol {
  id: string;
  templateId: string | null;
  name: string;
  status: ApiSupplementPlanAssignment["status"];
  startsOn: string;
  endsOn: string | null;
  phases: Array<{
    name: string;
    supplements: Array<{
      supplementId?: string;
      supplementName: string;
      dosage: string;
      timing: string;
      notes?: string;
    }>;
  }>;
}

type ClientLogDomain = "training" | "nutrition" | "supplementation";
type ClientLogStatus = "completed" | "missed";

interface ClientActivityLog {
  id: string;
  domain: ClientLogDomain;
  logDate: string;
  status: ClientLogStatus;
  notes: string | null;
}

interface ClientActivityLogDomainSummary {
  domain: ClientLogDomain;
  completedLogs: number;
  possibleLogs: number;
  complianceScore: number;
}

interface ClientActivityLogSummary {
  dateFrom: string;
  dateTo: string;
  days: number;
  completedLogs: number;
  possibleLogs: number;
  complianceScore: number;
  byDomain: ClientActivityLogDomainSummary[];
}

interface ClientWorkoutSession {
  id: string;
  assignmentName: string;
  dayName: string;
  completedAt: string;
  durationSeconds: number;
  exercises: Array<{
    exerciseName: string;
    prescribedSets?: string | null;
    prescribedReps?: string | null;
    prescribedRestSeconds?: number | null;
    sets: Array<{
      setNumber: number;
      reps?: string;
      weightKg?: number | null;
      completed: boolean;
    }>;
  }>;
  personalBests: Array<{
    exerciseName: string;
    setNumber: number;
    weightKg: number;
    previousBestKg: number;
  }>;
}

interface ClientProfileView extends ClientProfile {
  initialQuestionnaireSubmission: ApiFormSubmission | null;
  photos: ClientProfilePhoto[];
  trainingPrograms: ClientTrainingProgram[];
  trainingSource: "api";
  nutritionPlans: ClientNutritionPlan[];
  nutritionSource: "api";
  supplementProtocols: ClientSupplementProtocol[];
}

const tabs: ProfileTab[] = ["Dashboard", "Initial Q&A", "Photos", "Daily Check-Ins", "Check-Ins", "Training", "Nutrition", "Supplementation", "Roadmap", "Calendar", "Logs"];
const logDomains: Array<{ id: ClientLogDomain; label: string }> = [
  { id: "training", label: "Training" },
  { id: "nutrition", label: "Nutrition" },
  { id: "supplementation", label: "Supplementation" }
];
const todayDate = () => new Date().toISOString().slice(0, 10);

export function ClientProfilePage({
  clientId,
  highlightedCheckInCompare,
  highlightedCheckInId,
  initialTab = "Dashboard"
}: ClientProfilePageProps) {
  const [client, setClient] = useState<ClientProfileView | null>(null);
  const [recentNotes, setRecentNotes] = useState<ClientNoteSummary[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [editingClient, setEditingClient] = useState<ClientProfileView | null>(null);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [packageOptions, setPackageOptions] = useState<ClientFormOption[]>([]);
  const [initialQuestionnaireOptions, setInitialQuestionnaireOptions] = useState<ClientFormOption[]>([]);
  const [dailyHabitFormOptions, setDailyHabitFormOptions] = useState<ClientFormOption[]>([]);
  const [checkInFormOptions, setCheckInFormOptions] = useState<ClientFormOption[]>([]);
  const [trainingPlanOptions, setTrainingPlanOptions] = useState<ClientFormOption[]>([]);
  const [nutritionPlanOptions, setNutritionPlanOptions] = useState<ClientFormOption[]>([]);
  const [supplementationPlanOptions, setSupplementationPlanOptions] = useState<ClientFormOption[]>([]);
  const updateClientComplianceScore = useCallback((compliance: number) => {
    setClient((currentClient) => (currentClient ? { ...currentClient, compliance } : currentClient));
  }, []);

  const loadPersistedClientView = useCallback(
    async (summaryOverride?: ClientSummary) => loadClientProfileView(clientId, summaryOverride),
    [clientId]
  );

  useEffect(() => {
    let active = true;

    async function loadClient() {
      try {
        const nextView = await loadPersistedClientView();

        if (active) {
          setClient(nextView.client);
          setRecentNotes(nextView.notes);
        }
      } catch {
        if (active) {
          setClient(null);
          setRecentNotes([]);
        }
      } finally {
        if (active) {
          setLoadingClient(false);
        }
      }
    }

    void loadClient();

    return () => {
      active = false;
    };
  }, [loadPersistedClientView]);

  const openEditClient = async (clientToEdit: ClientProfileView) => {
    setEditingClient(clientToEdit);
    setClientForm(clientSummaryToForm(clientToEdit));
    setClientFormError(null);
    await Promise.all([loadClientFormOptions(), loadClientFormProfile(clientToEdit.id)]);
    setClientFormOpen(true);
  };

  const closeClientForm = () => {
    setClientFormOpen(false);
    setEditingClient(null);
    setClientForm(emptyClientForm);
    setClientFormError(null);
  };

  const saveClient = async () => {
    if (!editingClient) {
      return;
    }

    setSavingClient(true);
    setClientFormError(null);

    try {
      const response = await fetch(`/api/v1/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createClientMutationBody(clientForm, editingClient.status, true, true))
      });

      if (!response.ok) {
        throw new Error("Client could not be saved.");
      }

      await updateClientProfile(editingClient.id, clientForm);
      await assignSelectedClientForms(editingClient.id, clientForm);
      const assignedPlanChanges = await assignSelectedClientPlans(editingClient.id, clientForm);
      await scheduleAssignedPackagePaymentChange(clientForm);
      await logAssignedPlanChanges(editingClient.id, assignedPlanChanges);

      const payload = (await response.json()) as { data?: ClientSummary };

      if (payload.data) {
        const nextView = await loadPersistedClientView(payload.data);
        setClient(nextView.client);
        setRecentNotes(nextView.notes);
      }

      closeClientForm();
    } catch {
      setClientFormError("Client could not be saved. Check the details and try again.");
    } finally {
      setSavingClient(false);
    }
  };

  const loadClientFormProfile = async (profileClientId: string) => {
    try {
      const [response, assignedPlanIds, assignedFormIds] = await Promise.all([
        fetch(`/api/v1/clients/${profileClientId}/profile`),
        fetchAssignedClientPlanIds(profileClientId),
        fetchAssignedClientFormIds(profileClientId)
      ]);

      setClientForm((currentForm) => ({
        ...currentForm,
        initialQuestionnaire: assignedFormIds.initialQuestionnaire,
        dailyHabitForm: assignedFormIds.dailyHabitForm,
        checkInForm: assignedFormIds.checkInForm,
        trainingPlanIds: assignedPlanIds.trainingPlanIds,
        nutritionPlanIds: assignedPlanIds.nutritionPlanIds,
        supplementationPlanIds: assignedPlanIds.supplementationPlanIds
      }));

      if (response.ok) {
        const payload = (await response.json()) as { data?: ClientProfileResponse | null };
        const dateOfBirth = toDateInputValue(payload.data?.dateOfBirth);

        if (dateOfBirth) {
          setClientForm((currentForm) => ({ ...currentForm, dateOfBirth }));
        }
      }
    } catch {
      // Profile details are optional for profile editing.
    }
  };

  const loadClientFormOptions = async () => {
    const [
      packages,
      publishedFormGroups,
      trainingPlans,
      nutritionPlans,
      supplementationPlans
    ] = await Promise.all([
      fetchClientFormOptions("/api/v1/packages?status=active&limit=100"),
      fetchPublishedClientFormsByType(),
      fetchClientFormOptions("/api/v1/training-program-templates?limit=100"),
      fetchClientFormOptions("/api/v1/meal-plan-templates?limit=100"),
      fetchClientFormOptions("/api/v1/supplement-plan-templates?limit=100")
    ]);

    setPackageOptions(packages);
    setInitialQuestionnaireOptions(publishedFormGroups.initialQuestionnaireOptions);
    setDailyHabitFormOptions(publishedFormGroups.dailyHabitFormOptions);
    setCheckInFormOptions(publishedFormGroups.checkInFormOptions);
    setTrainingPlanOptions(trainingPlans);
    setNutritionPlanOptions(nutritionPlans);
    setSupplementationPlanOptions(supplementationPlans);
  };

  if (!client && loadingClient) {
    return (
      <CompleteCoachLoadingScreen
        title="Preparing client profile"
        label="Preparing client profile."
      />
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <Link href="/clients" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to clients
        </Link>
        <section className="rounded-2xl border border-gray-200 bg-white p-10">
          <h1 className="mb-2 text-3xl font-bold">Client Not Found</h1>
          <p className="text-gray-600">This client was not found in the Neon database.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/clients" className="font-medium text-slate-500 hover:text-indigo-600">
          Clients
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-slate-900">{client.name}</span>
      </nav>

      <ClientProfileHeader
        client={client}
        onNoteCreated={(note) => setRecentNotes((currentNotes) => [note, ...currentNotes].slice(0, 3))}
        onEditClient={() => openEditClient(client)}
        onProfileTargetSaved={(target) => setClient((currentClient) => (currentClient ? { ...currentClient, ...target } : currentClient))}
      />

      <div className="mb-6 w-full rounded-xl border border-gray-200 bg-white p-1">
        <div role="tablist" aria-label="Client profile sections" className="grid grid-cols-2 gap-1 md:grid-cols-4 lg:grid-cols-11">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`client-tab-${tab}`}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                activeTab === tab ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <ClientProfileTabPanel
        client={client}
        recentNotes={recentNotes}
        activeTab={activeTab}
        highlightedCheckInCompare={highlightedCheckInCompare}
        highlightedCheckInId={highlightedCheckInId}
        onComplianceScoreChange={updateClientComplianceScore}
      />

      {clientFormOpen ? (
        <ClientFormDialog
          editingClient={editingClient}
          form={clientForm}
          error={clientFormError}
          saving={savingClient}
          packageOptions={packageOptions}
          initialQuestionnaireOptions={initialQuestionnaireOptions}
          dailyHabitFormOptions={dailyHabitFormOptions}
          checkInFormOptions={checkInFormOptions}
          trainingPlanOptions={trainingPlanOptions}
          nutritionPlanOptions={nutritionPlanOptions}
          supplementationPlanOptions={supplementationPlanOptions}
          onChange={(field, value) => setClientForm((currentForm) => ({ ...currentForm, [field]: value }))}
          onClose={closeClientForm}
          onSubmit={() => void saveClient()}
        />
      ) : null}
    </div>
  );
}

async function loadPersistedProfile(clientId: string) {
  const response = await fetch(`/api/v1/clients/${clientId}/profile`);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: ApiClientProfile | null };

  return payload.data ?? null;
}

async function loadPersistedTraining(clientId: string) {
  const response = await fetch(`/api/v1/clients/${clientId}/training-programs`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ApiTrainingAssignment[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedMealPlans(clientId: string) {
  const response = await fetch(`/api/v1/clients/${clientId}/meal-plans`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ApiMealPlanAssignment[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedSupplementPlans(clientId: string) {
  const response = await fetch(`/api/v1/supplement-plan-assignments?clientId=${clientId}&limit=100`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ApiSupplementPlanAssignment[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedNotes(clientId: string, limit: number) {
  const response = await fetch(`/api/v1/clients/${clientId}/notes?limit=${limit}`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ClientNoteSummary[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedWorkoutNotes(clientId: string, assignmentName: string, dayName: string) {
  const params = new URLSearchParams({
    limit: "10",
    search: buildWorkoutNotePrefix(assignmentName, dayName)
  });
  const response = await fetch(`/api/v1/clients/${clientId}/notes?${params.toString()}`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ClientNoteSummary[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedWorkoutSessions(clientId: string, assignmentName: string, dayName: string) {
  const params = new URLSearchParams({
    assignmentName,
    dayName,
    limit: "12"
  });
  const response = await fetch(`/api/v1/clients/${clientId}/workout-sessions?${params.toString()}`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ClientWorkoutSession[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedWeightSummary(clientId: string): Promise<ApiWeightSummary | null> {
  const response = await fetch(`/api/v1/clients/${clientId}/metrics?summary=weight`);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: ApiWeightSummary | null };

  return payload.data ?? null;
}

async function loadPersistedFormSubmissions(clientId: string): Promise<ApiFormSubmission[]> {
  const response = await fetch(`/api/v1/form-submissions?clientId=${clientId}&limit=100`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ApiFormSubmission[] };

  return Array.isArray(payload.data) ? payload.data : [];
}

async function loadPersistedRoadmap(clientId: string): Promise<ApiRoadmapPhase[]> {
  try {
    const response = await fetch(`/api/v1/clients/${clientId}/roadmap`);

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data?: ApiRoadmapPhase[] };

    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

async function loadClientProfileView(clientId: string, summaryOverride?: ClientSummary) {
  const summary = summaryOverride ?? (await loadPersistedClientSummary(clientId));
  const [profile, trainingAssignments, mealPlanAssignments, notes, weightSummary, formSubmissions, roadmapPhases] = await Promise.all([
    loadPersistedProfile(clientId),
    loadPersistedTraining(clientId),
    loadPersistedMealPlans(clientId),
    loadPersistedNotes(clientId, 3),
    loadPersistedWeightSummary(clientId),
    loadPersistedFormSubmissions(clientId).catch(() => []),
    loadPersistedRoadmap(clientId)
  ]);
  const supplementAssignments = await loadPersistedSupplementPlans(clientId).catch(() => []);

  return {
    client: createProfileFromSummary(summary, profile, trainingAssignments, mealPlanAssignments, supplementAssignments, weightSummary, formSubmissions, roadmapPhases),
    notes
  };
}

async function loadPersistedClientSummary(clientId: string): Promise<ClientSummary> {
  const response = await fetch(`/api/v1/clients/${clientId}`);

  if (!response.ok) {
    throw new Error("Client API unavailable.");
  }

  const payload = (await response.json()) as { data?: ClientSummary };

  if (!payload.data) {
    throw new Error("Client profile could not be loaded.");
  }

  return payload.data;
}

function createProfileFromSummary(
  summary: ClientSummary,
  profile?: ApiClientProfile | null,
  trainingAssignments: ApiTrainingAssignment[] = [],
  mealPlanAssignments: ApiMealPlanAssignment[] = [],
  supplementAssignments: ApiSupplementPlanAssignment[] = [],
  weightSummary?: ApiWeightSummary | null,
  formSubmissions: ApiFormSubmission[] = [],
  roadmapPhases: ApiRoadmapPhase[] = []
): ClientProfileView {
  const trainingPrograms = createTrainingProgramsFromAssignments(trainingAssignments);
  const nutritionPlans = createNutritionPlansFromAssignments(mealPlanAssignments);
  const supplementProtocols = createSupplementProtocolsFromAssignments(supplementAssignments);
  const activeNutritionPlan = nutritionPlans[0];
  const initialQuestionnaireSubmission = findInitialQuestionnaireSubmission(formSubmissions);
  const profileGoal = profile?.goals?.[0] ?? "Unassigned";
  const activeRoadmapPhase = getActiveRoadmapPhaseName(roadmapPhases, summary.timezone || "UTC") ?? profileGoal;

  return {
    ...summary,
    age: getAge(profile?.dateOfBirth),
    dateOfBirth: profile?.dateOfBirth ?? null,
    waterTargetLitres: normalizeNullableNumber(profile?.waterTargetLitres),
    stepTarget: profile?.stepTarget ?? null,
    trainingLogTargetDays: profile?.trainingLogTargetDays ?? null,
    weeksWithCoach: getWeeksWithCoach(summary.startDate),
    protocol: profileGoal,
    activeRoadmapPhase,
    bio: profile?.bio ?? "Profile details are ready for persistence-backed coaching notes.",
    initialQuestionnaireSubmission,
    photos: collectProfilePhotos(formSubmissions),
    metrics: [
      {
        label: "Starting Weight",
        value: formatWeightMetricValue(weightSummary?.startingWeight),
        detail: formatWeightMetricDetail(weightSummary?.startingWeight, "initial Q&A"),
        tone: "text-indigo-600"
      },
      {
        label: "Current Weight",
        value: formatWeightMetricValue(weightSummary?.currentWeight),
        detail: formatWeightMetricDetail(weightSummary?.currentWeight, "latest daily habit entry"),
        tone: "text-orange-600"
      },
      {
        label: "Compliance",
        value: `${summary.compliance}%`,
        detail: "from persisted roster data",
        tone: "text-indigo-600"
      },
      {
        label: "Latest Check-In",
        value: summary.latestCheckIn,
        detail: "most recent persisted check-in",
        tone: "text-orange-600"
      },
      {
        label: "Status",
        value: summary.status,
        detail: "current client status",
        tone: "text-green-600"
      },
      {
        label: "Check-In Day",
        value: summary.checkInDay,
        detail: "scheduled cadence",
        tone: "text-blue-600"
      }
    ],
    trainingSchedule: trainingPrograms.flatMap((program) => program.sessions),
    trainingPrograms,
    trainingSource: "api",
    nutritionPlan: activeNutritionPlan
      ? {
          name: activeNutritionPlan.name,
          phase: activeNutritionPlan.phase,
          calories: activeNutritionPlan.calories,
          protein: activeNutritionPlan.protein,
          carbs: activeNutritionPlan.carbs,
          fats: activeNutritionPlan.fats
        }
      : {
          name: "Unassigned Nutrition Plan",
          phase: "Planning",
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0
        },
    nutritionPlans,
    nutritionSource: "api",
    supplementProtocols,
    supplements: supplementProtocols.flatMap((protocol) =>
      protocol.phases.flatMap((phase) => phase.supplements.map((supplement) => supplement.supplementName))
    )
  };
}

function normalizeNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getActiveRoadmapPhaseName(phases: ApiRoadmapPhase[], timezone: string) {
  const today = getDateValueInTimeZone(new Date(), timezone);
  const activePhase = phases.find((phase) => phase.startDate <= today && phase.endDate >= today);

  return activePhase?.name ?? null;
}

function getDateValueInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? String(date.getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(date.getMonth() + 1).padStart(2, "0");
  const day = parts.find((part) => part.type === "day")?.value ?? String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatWeightMetricValue(metric?: ApiMetric | null) {
  if (!metric) {
    return "0";
  }

  return Number.isInteger(metric.metricValue) ? String(metric.metricValue) : metric.metricValue.toFixed(1);
}

function formatWeightMetricDetail(metric: ApiMetric | null | undefined, fallback: string) {
  if (!metric) {
    return fallback;
  }

  return `${fallback} - ${formatTrainingDate(metric.measuredAt)}`;
}

function findInitialQuestionnaireSubmission(submissions: ApiFormSubmission[]) {
  return submissions.find((submission) => isInitialQuestionnaireType(submission.formType)) ?? null;
}

function isInitialQuestionnaireType(formType: string | null) {
  return formType === "intake" || formType === "application" || formType === "contact";
}

function collectProfilePhotos(submissions: ApiFormSubmission[]): ClientProfilePhoto[] {
  return submissions.flatMap((submission) =>
    collectPhotoUrls(submission.answers).map((url, index) => ({
      id: `${submission.id}:${index}`,
      url,
      label: `${submission.formName}${index > 0 ? ` #${index + 1}` : ""}`,
      submittedAt: submission.submittedAt,
      formName: submission.formName
    }))
  );
}

function collectPhotoUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return isPhotoUrl(value) ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectPhotoUrls);
  }

  if (!isRecord(value)) {
    return [];
  }

  const directUrl = [value.url, value.src, value.photoUrl, value.fileUrl, value.previewUrl]
    .find((candidate): candidate is string => typeof candidate === "string" && isPhotoUrl(candidate));

  return [
    ...(directUrl ? [directUrl] : []),
    ...Object.entries(value)
      .filter(([key]) => key !== "url" && key !== "src" && key !== "photoUrl" && key !== "fileUrl" && key !== "previewUrl")
      .flatMap(([, nestedValue]) => collectPhotoUrls(nestedValue))
  ];
}

function isPhotoUrl(value: string) {
  return /^https?:\/\//u.test(value) && /\.(?:avif|gif|heic|heif|jpe?g|png|webp)(?:[?#].*)?$/iu.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatSubmissionAnswers(answers: unknown) {
  if (!isRecord(answers)) {
    return [];
  }

  return Object.entries(answers).map(([key, value]) => ({
    label: formatAnswerLabel(key),
    value: formatAnswerValue(value)
  }));
}

function formatAnswerLabel(key: string) {
  return key
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not answered";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatAnswerValue).join(", ");
  }

  if (isRecord(value)) {
    const directLabel = [value.label, value.name, value.fileName, value.url, value.photoUrl, value.fileUrl]
      .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);

    if (directLabel) {
      return directLabel;
    }

    return Object.entries(value)
      .map(([nestedKey, nestedValue]) => `${formatAnswerLabel(nestedKey)}: ${formatAnswerValue(nestedValue)}`)
      .join("\n");
  }

  return String(value);
}

export function createTrainingProgramsFromAssignments(
  assignments: ApiTrainingAssignment[]
): ClientTrainingProgram[] {
  return assignments.map((assignment) => {
    const snapshot = assignment.snapshot ?? {};
    const template = {
      instructions: snapshot.template?.instructions,
      days:
        snapshot.template?.days?.map((day) => ({
          name: day.name,
          exercises: day.exercises ?? []
        })) ?? []
    };
    const name = assignment.name || snapshot.templateName || "Assigned training program";
    const durationWeeks = snapshot.durationWeeks ?? 1;
    const templateId = assignment.templateId ?? snapshot.templateId ?? null;
    const draftSource: TrainingProgramTemplateDraftSource = {
      id: templateId,
      name,
      description: `${durationWeeks} week assigned program`,
      goal: snapshot.goal ?? null,
      durationWeeks,
      template
    };

    return {
      id: assignment.id,
      templateId,
      name,
      status: assignment.status,
      startsOn: assignment.startsOn ?? todayDate(),
      endsOn: assignment.endsOn ?? null,
      durationWeeks,
      template,
      draftSource,
      sessions:
        template.days?.map((day) => {
        const exercises = day.exercises ?? [];

        return {
          day: day.name,
          name,
          focus: exercises.length > 0 ? exercises.map((exercise) => exercise.exerciseName).join(", ") : "Assigned workout",
          duration: `${exercises.length} exercises`
        };
        }) ?? []
    };
  });
}

export function createNutritionPlansFromAssignments(
  assignments: ApiMealPlanAssignment[]
): ClientNutritionPlan[] {
  return assignments.map((assignment) => {
    const snapshot = assignment.snapshot ?? {};
    const name = assignment.name || snapshot.templateName || "Assigned meal plan";
    const phase = assignment.phase || snapshot.phase || "Nutrition";
    const templateId = assignment.templateId ?? snapshot.templateId ?? null;
    const templateDays =
      snapshot.template?.days?.map((day) => ({
        name: day.name,
        meals: (day.meals ?? []).map((meal) => ({
          meal: meal.meal,
          foods: meal.foods ?? []
        }))
      })) ?? [];
    const apiTemplate: ApiMealPlanTemplate | null = templateId
      ? {
          id: templateId,
          name,
          phase,
          targetCalories: snapshot.targetCalories ?? assignment.targetCalories,
          proteinGrams: snapshot.proteinGrams ?? assignment.proteinGrams,
          carbsGrams: snapshot.carbsGrams ?? assignment.carbsGrams,
          fatGrams: snapshot.fatGrams ?? assignment.fatGrams,
          status: "published",
          template: { days: templateDays },
          updatedAt: assignment.startsOn ?? todayDate()
        }
      : null;

    return {
      id: assignment.id,
      templateId,
      name,
      phase,
      status: assignment.status,
      startsOn: assignment.startsOn ?? todayDate(),
      endsOn: assignment.endsOn ?? null,
      calories: snapshot.targetCalories ?? assignment.targetCalories,
      protein: snapshot.proteinGrams ?? assignment.proteinGrams,
      carbs: snapshot.carbsGrams ?? assignment.carbsGrams,
      fats: snapshot.fatGrams ?? assignment.fatGrams,
      days: templateDays.map((day) => ({
        name: day.name,
        meals: day.meals ?? []
      })),
      meals:
        templateDays.flatMap((day) =>
          (day.meals ?? []).map((meal) => ({
            day: day.name,
            meal: meal.meal,
            foods:
              meal.foods && meal.foods.length > 0
                ? meal.foods.map((food) => `${food.foodName} (${food.servingSize})`).join(", ")
                : "No foods recorded",
            calories: meal.foods?.reduce((total, food) => total + food.calories, 0) ?? 0
          }))
        ) ?? [],
      apiTemplate
    };
  });
}

function createSupplementProtocolsFromAssignments(assignments: ApiSupplementPlanAssignment[]): ClientSupplementProtocol[] {
  return assignments.map((assignment) => {
    const snapshot = assignment.snapshot ?? {};
    const phases =
      snapshot.template?.phases?.map((phase) => ({
        name: phase.name,
        supplements: phase.supplements ?? []
      })) ?? [];

    return {
      id: assignment.id,
      templateId: assignment.templateId ?? snapshot.templateId ?? null,
      name: assignment.name || snapshot.templateName || "Assigned supplement protocol",
      status: assignment.status,
      startsOn: assignment.startsOn ?? todayDate(),
      endsOn: assignment.endsOn ?? null,
      phases
    };
  });
}

function getAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return 0;
  }

  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();
  const birthdayPassed =
    monthDelta > 0 || (monthDelta === 0 && today.getUTCDate() >= birthDate.getUTCDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age;
}

function getBirthYear(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return "Not set";
  }

  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return "Not set";
  }

  return String(birthDate.getUTCFullYear());
}

function getWeeksWithCoach(startDate?: string | null) {
  if (!startDate) {
    return 0;
  }

  const parsedStartDate = new Date(startDate);

  if (Number.isNaN(parsedStartDate.getTime())) {
    return 0;
  }

  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsedWeeks = Math.floor((Date.now() - parsedStartDate.getTime()) / millisecondsPerWeek);

  return Math.max(0, elapsedWeeks);
}

function formatStartDateDetail(startDate?: string | null) {
  if (!startDate) {
    return "Start date not set";
  }

  return `Since ${formatTrainingDate(startDate)}`;
}

function ClientProfileHeader({
  client,
  onNoteCreated,
  onEditClient,
  onProfileTargetSaved
}: {
  client: ClientProfile;
  onNoteCreated: (note: ClientNoteSummary) => void;
  onEditClient: () => void;
  onProfileTargetSaved: (target: Pick<ClientProfile, "waterTargetLitres"> | Pick<ClientProfile, "stepTarget">) => void;
}) {
  const startingWeight = findMetric(client, "Starting Weight")?.value ?? "0";
  const startingWeightDetail = findMetric(client, "Starting Weight")?.detail ?? "initial Q&A";
  const currentWeight = findMetric(client, "Current Weight")?.value ?? "0";
  const currentWeightDetail = findMetric(client, "Current Weight")?.detail ?? "latest daily habit entry";
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [targetDialog, setTargetDialog] = useState<"water" | "steps" | null>(null);
  const [waterTargetLitres, setWaterTargetLitres] = useState(client.waterTargetLitres ?? null);
  const [stepTarget, setStepTarget] = useState(client.stepTarget ?? null);

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col justify-between gap-6 lg:flex-row">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#1f2937,#84cc16)]">
            <div className="flex h-full items-end justify-end p-4 text-3xl font-black text-white/90">{client.initials}</div>
          </div>
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                Active Phase: {client.activeRoadmapPhase}
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                Assigned Check-In: Every {client.checkInDay}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">{client.name}</h1>
            <span className="sr-only">{client.activeRoadmapPhase}</span>
            <p className="mt-2 text-sm font-semibold text-slate-600">{client.packageName}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{client.bio}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            aria-label="Open progress analytics"
            title="Open progress analytics"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-indigo-300 bg-white text-indigo-700 transition hover:bg-indigo-50"
            onClick={() => setProgressDialogOpen(true)}
          >
            <LineChart className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Add client note"
            title="Add client note"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={() => setNoteDialogOpen(true)}
          >
            <NotebookPen className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Set water target"
            title={waterTargetLitres ? `Water target: ${waterTargetLitres}L` : "Set water target"}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-700 transition hover:bg-sky-50"
            onClick={() => setTargetDialog("water")}
          >
            <Droplets className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Set step target"
            title={stepTarget ? `Step target: ${stepTarget.toLocaleString()} steps` : "Set step target"}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-50"
            onClick={() => setTargetDialog("steps")}
          >
            <Footprints className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Edit client"
            title="Edit client"
            className="inline-flex size-11 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
            onClick={onEditClient}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <ProfileMetric accent="border-indigo-500" label="Starting Weight" value={startingWeight} suffix="kg" detail={startingWeightDetail} />
        <ProfileMetric accent="border-orange-500" label="Current Weight" value={currentWeight} suffix="kg" detail={currentWeightDetail} />
        <ProfileMetric accent="border-blue-500" label="Time With Coach" value={`${client.weeksWithCoach}`} suffix="wks" detail={formatStartDateDetail(client.startDate)} />
        <ProfileMetric accent="border-pink-500" label="Age" value={`${client.age}`} suffix="yrs" detail={`Born ${getBirthYear(client.dateOfBirth)}`} />
        <ProfileMetric accent="border-green-500" label="Compliance" value={`${client.compliance}`} suffix="%" detail="Current logs" />
      </div>

      {noteDialogOpen ? (
        <ClientNoteDialog
          client={client}
          onClose={() => setNoteDialogOpen(false)}
          onSaved={(note) => {
            onNoteCreated(note);
            setNoteDialogOpen(false);
          }}
        />
      ) : null}

      {progressDialogOpen ? (
        <ClientProgressDialog client={client} onClose={() => setProgressDialogOpen(false)} />
      ) : null}

      {targetDialog ? (
        <ClientTargetDialog
          client={client}
          targetType={targetDialog}
          initialValue={targetDialog === "water" ? waterTargetLitres : stepTarget}
          onClose={() => setTargetDialog(null)}
          onSaved={(value) => {
            if (targetDialog === "water") {
              setWaterTargetLitres(value);
              onProfileTargetSaved({ waterTargetLitres: value });
            } else {
              setStepTarget(value);
              onProfileTargetSaved({ stepTarget: value });
            }

            setTargetDialog(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ClientProgressDialog({ client, onClose }: { client: ClientProfile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="client-progress-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="client-progress-title" className="text-2xl font-black text-slate-950">
              Progress Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-600">{client.name}</p>
          </div>
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>
        <ProgressAnalyticsCard client={client} />
      </div>
    </div>
  );
}

function ClientTargetDialog({
  client,
  targetType,
  initialValue,
  onClose,
  onSaved
}: {
  client: ClientProfile;
  targetType: "water" | "steps";
  initialValue: number | null;
  onClose: () => void;
  onSaved: (value: number | null) => void;
}) {
  const [value, setValue] = useState(initialValue === null ? "" : String(initialValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWater = targetType === "water";
  const title = isWater ? "Set Water Target" : "Set Step Target";
  const label = isWater ? "Water target in litres" : "Step target";
  const parsedValue = value.trim() ? Number(value) : null;

  async function saveTarget() {
    setSaving(true);
    setError(null);

    try {
      if (
        parsedValue !== null &&
        (!Number.isFinite(parsedValue) || parsedValue < 0 || (!isWater && !Number.isInteger(parsedValue)))
      ) {
        throw new Error("Invalid target.");
      }

      const response = await fetch(`/api/v1/clients/${client.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isWater ? { waterTargetLitres: parsedValue } : { stepTarget: parsedValue })
      });

      if (!response.ok) {
        throw new Error("Target could not be saved.");
      }

      await logClientAccountActivity(client.id, {
        type: "client-profile-target-updated",
        title: isWater ? "Water target updated" : "Step target updated",
        metadata: {
          target: targetType,
          value: parsedValue
        }
      });

      onSaved(parsedValue);
    } catch {
      setError("Target could not be saved. Check the value and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="client-target-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="client-target-title" className="text-2xl font-black text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{client.name}</p>
          </div>
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
          <input
            type="number"
            min="0"
            step={isWater ? "0.1" : "1"}
            value={value}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setValue(event.target.value)}
          />
        </label>

        {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={saving}
            onClick={() => void saveTarget()}
          >
            {saving ? "Saving..." : "Save target"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientNoteDialog({
  client,
  onClose,
  onSaved
}: {
  client: ClientProfile;
  onClose: () => void;
  onSaved: (note: ClientNoteSummary) => void;
}) {
  const [noteDate, setNoteDate] = useState(todayDate());
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveNote() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteDate, body })
      });

      if (!response.ok) {
        throw new Error("Note could not be saved.");
      }

      const payload = (await response.json()) as { data?: ClientNoteSummary };

      if (payload.data) {
        onSaved(payload.data);
      }
    } catch {
      setError("Note could not be saved. Check the date and note details, then try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="client-note-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="client-note-title" className="text-2xl font-black text-slate-950">
              Add Note
            </h2>
            <p className="mt-1 text-sm text-slate-600">{client.name}</p>
          </div>
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Note date</span>
            <input
              type="date"
              value={noteDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setNoteDate(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Note</span>
            <textarea
              value={body}
              rows={8}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add a coaching note..."
              onChange={(event) => setBody(event.target.value)}
            />
          </label>

          {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={saving || !noteDate || !body.trim()}
            onClick={() => void saveNote()}
          >
            {saving ? "Saving..." : "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function findMetric(client: ClientProfile, label: string) {
  return client.metrics.find((metric) => metric.label.toLowerCase().includes(label.toLowerCase()));
}

function ProfileMetric({
  accent,
  label,
  value,
  suffix,
  detail
}: {
  accent: string;
  label: string;
  value: string;
  suffix?: string;
  detail: string;
}) {
  return (
    <div className={cn("border-l-4 pl-4", accent)}>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-black text-slate-950">
        {value}
        {suffix ? <span className="ml-1 text-xs font-bold text-slate-600">{suffix}</span> : null}
      </div>
      <div className="mt-1 text-xs font-medium text-green-600">{detail}</div>
    </div>
  );
}

function ClientProfileTabPanel({
  client,
  recentNotes,
  activeTab,
  highlightedCheckInCompare,
  highlightedCheckInId,
  onComplianceScoreChange
}: {
  client: ClientProfileView;
  recentNotes: ClientNoteSummary[];
  activeTab: ProfileTab;
  highlightedCheckInCompare?: string;
  highlightedCheckInId?: string;
  onComplianceScoreChange: (compliance: number) => void;
}) {
  if (activeTab === "Dashboard") {
    return (
      <section id="client-tab-Dashboard" role="tabpanel" aria-label="Dashboard">
        <DashboardPanel client={client} recentNotes={recentNotes} />
      </section>
    );
  }

  if (activeTab === "Calendar") {
    return (
      <section id="client-tab-Calendar" role="tabpanel" aria-label="Calendar">
        <ClientCalendarPanel client={client} />
      </section>
    );
  }

  if (activeTab === "Roadmap") {
    return (
      <section id="client-tab-Roadmap" role="tabpanel" aria-label="Roadmap">
        <ClientRoadmapPeriodisationPanel client={client} />
      </section>
    );
  }

  return (
    <section
      id={`client-tab-${activeTab}`}
      role="tabpanel"
      aria-label={activeTab}
      className={cn(
        activeTab === "Check-Ins" && highlightedCheckInId
          ? "bg-transparent"
          : "rounded-xl border border-gray-200 bg-white p-6"
      )}
    >
      {activeTab === "Daily Check-Ins" ? <DailyCheckInsPanel /> : null}
      {activeTab === "Initial Q&A" ? <InitialQuestionnairePanel client={client} /> : null}
      {activeTab === "Photos" ? <PhotosPanel client={client} /> : null}
      {activeTab === "Training" ? <TrainingPanel client={client} /> : null}
      {activeTab === "Nutrition" ? <NutritionPanel client={client} /> : null}
      {activeTab === "Supplementation" ? <SupplementationPanel client={client} /> : null}
      {activeTab === "Logs" ? <LogsPanel client={client} onComplianceScoreChange={onComplianceScoreChange} /> : null}
      {activeTab === "Check-Ins" && highlightedCheckInId ? (
        <CheckInDetailPage clientId={client.id} checkInId={highlightedCheckInId} compare={highlightedCheckInCompare} embedded />
      ) : null}
      {activeTab === "Check-Ins" && !highlightedCheckInId ? <CheckInHistoryPanel clientId={client.id} /> : null}
    </section>
  );
}

function DashboardPanel({ client, recentNotes }: { client: ClientProfile; recentNotes: ClientNoteSummary[] }) {
  return <ClientProfileDashboard client={client} recentNotes={recentNotes} />;
}

function InitialQuestionnairePanel({ client }: { client: ClientProfileView }) {
  const submission = client.initialQuestionnaireSubmission;
  const answers = submission ? formatSubmissionAnswers(submission.answers) : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Initial Q&A</h2>
          <p className="mt-1 text-sm text-slate-600">
            {submission ? `${submission.formName} - submitted ${formatTrainingDate(submission.submittedAt)}` : "No submitted initial questionnaire is available yet."}
          </p>
        </div>
      </div>

      {answers.length > 0 ? (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {answers.map((answer) => (
            <div key={answer.label} className="grid gap-2 p-4 md:grid-cols-[minmax(180px,0.35fr)_1fr]">
              <dt className="text-sm font-black text-slate-800">{answer.label}</dt>
              <dd className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{answer.value}</dd>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          Assign and collect an initial Q&A form to display the completed intake here.
        </p>
      )}
    </div>
  );
}

function PhotosPanel({ client }: { client: ClientProfileView }) {
  const [leftPhotoId, setLeftPhotoId] = useState(client.photos[0]?.id ?? "");
  const [rightPhotoId, setRightPhotoId] = useState(client.photos[1]?.id ?? client.photos[0]?.id ?? "");
  const leftPhoto = client.photos.find((photo) => photo.id === leftPhotoId) ?? null;
  const rightPhoto = client.photos.find((photo) => photo.id === rightPhotoId) ?? null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-950">Photos</h2>
        <p className="mt-1 text-sm text-slate-600">Compare progress photos submitted through client forms.</p>
      </div>

      {client.photos.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <PhotoCompareColumn label="Left photo" photos={client.photos} selectedPhotoId={leftPhotoId} photo={leftPhoto} onChange={setLeftPhotoId} />
          <PhotoCompareColumn label="Right photo" photos={client.photos} selectedPhotoId={rightPhotoId} photo={rightPhoto} onChange={setRightPhotoId} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          Progress photos submitted through check-ins or intake forms will appear here.
        </p>
      )}
    </div>
  );
}

function PhotoCompareColumn({
  label,
  photos,
  selectedPhotoId,
  photo,
  onChange
}: {
  label: string;
  photos: ClientProfilePhoto[];
  selectedPhotoId: string;
  photo: ClientProfilePhoto | null;
  onChange: (photoId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
        <select value={selectedPhotoId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => onChange(event.target.value)}>
          {photos.map((option) => (
            <option key={option.id} value={option.id}>
              {formatTrainingDate(option.submittedAt)} - {option.label}
            </option>
          ))}
        </select>
      </label>

      {photo ? (
        <figure className="mt-4">
          <img src={photo.url} alt={`${photo.label} submitted ${formatTrainingDate(photo.submittedAt)}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
          <figcaption className="mt-2 text-xs font-semibold text-slate-500">
            {photo.formName} - {formatTrainingDate(photo.submittedAt)}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}

function LogsPanel({
  client,
  onComplianceScoreChange
}: {
  client: ClientProfileView;
  onComplianceScoreChange: (compliance: number) => void;
}) {
  const [logs, setLogs] = useState<ClientActivityLog[]>([]);
  const [summary, setSummary] = useState<ClientActivityLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [trainingTargetDays, setTrainingTargetDays] = useState(client.trainingLogTargetDays ?? 7);
  const [savingTrainingTarget, setSavingTrainingTarget] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const refreshLogs = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/clients/${client.id}/logs?days=7`);

        if (!response.ok) {
          throw new Error("Logs could not be loaded.");
        }

        const payload = (await response.json()) as { data?: { logs: ClientActivityLog[]; summary: ClientActivityLogSummary } };

        if (isActive() && payload.data) {
          setLogs(payload.data.logs);
          setSummary(payload.data.summary);
          setNoteDrafts(createLogNoteDrafts(payload.data.logs));
          onComplianceScoreChange(payload.data.summary.complianceScore);
        }
      } catch {
        if (isActive()) {
          setError("Client logs could not be loaded.");
        }
      } finally {
        if (isActive()) {
          setLoading(false);
        }
      }
    },
    [client.id, onComplianceScoreChange]
  );

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(() => refreshLogs(() => active));

    return () => {
      active = false;
    };
  }, [refreshLogs]);

  const dates = summary ? getDateRangeLabels(summary.dateFrom, summary.dateTo) : getDateRangeLabelsFromToday(7);

  const saveLog = async (domain: ClientLogDomain, logDate: string, status: ClientLogStatus) => {
    const key = getLogKey(domain, logDate);
    setSavingKey(key);
    setError(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          logDate,
          status,
          notes: noteDrafts[key]?.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Log could not be saved.");
      }

      const payload = (await response.json()) as { data?: { log: ClientActivityLog; summary: ClientActivityLogSummary } };

      if (payload.data) {
        setLogs((currentLogs) => upsertActivityLog(currentLogs, payload.data!.log));
        setSummary(payload.data.summary);
        onComplianceScoreChange(payload.data.summary.complianceScore);
      }
    } catch {
      setError("Client log could not be saved.");
    } finally {
      setSavingKey(null);
    }
  };

  const saveTrainingTarget = async () => {
    setSavingTrainingTarget(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingLogTargetDays: trainingTargetDays })
      });

      if (!response.ok) {
        throw new Error("Training target could not be saved.");
      }

      await refreshLogs();
    } catch {
      setError("Training days per week could not be saved.");
    } finally {
      setSavingTrainingTarget(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase text-slate-500">7-day compliance</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{summary?.complianceScore ?? client.compliance}%</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {summary ? `${summary.completedLogs}/${summary.possibleLogs} logs completed` : "Loading logs"}
          </p>
        </div>
        {logDomains.map((domain) => {
          const domainSummary = summary?.byDomain.find((item) => item.domain === domain.id);

          return (
            <div key={domain.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase text-slate-500">{domain.label}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{domainSummary?.complianceScore ?? 0}%</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {domainSummary ? `${domainSummary.completedLogs}/${domainSummary.possibleLogs} completed` : "0/7 completed"}
              </p>
            </div>
          );
        })}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label htmlFor="training-target-days" className="text-xs font-black uppercase text-slate-500">Training target</label>
          <div className="mt-3 flex items-center gap-2">
            <select
              id="training-target-days"
              value={trainingTargetDays}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900"
              onChange={(event) => setTrainingTargetDays(Number(event.target.value))}
            >
              {Array.from({ length: 8 }, (_, days) => (
                <option key={days} value={days}>{days} days</option>
              ))}
            </select>
            <button
              type="button"
              className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white disabled:bg-slate-300"
              disabled={savingTrainingTarget}
              onClick={() => void saveTrainingTarget()}
            >
              Save
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Used for weekly training compliance.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full border-collapse text-sm" aria-label="Client completed logs">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="w-44 px-4 py-3">Area</th>
              {dates.map((date) => (
                <th key={date.value} className="px-3 py-3 text-center">
                  <span className="block text-slate-950">{date.day}</span>
                  <span>{date.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logDomains.map((domain) => (
              <tr key={domain.id} className="border-t border-slate-100">
                <th className="px-4 py-4 text-left font-black text-slate-950">{domain.label}</th>
                {dates.map((date) => {
                  const key = getLogKey(domain.id, date.value);
                  const log = logs.find((item) => item.domain === domain.id && item.logDate === date.value);
                  const status = log?.status;

                  return (
                    <td key={key} className="px-3 py-4 align-top">
                      <div className="mx-auto flex max-w-28 flex-col gap-2">
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            aria-label={`Mark ${domain.label} completed on ${date.value}`}
                            title="Completed"
                            className={cn(
                              "inline-flex h-9 items-center justify-center rounded-lg border text-sm font-black transition disabled:opacity-60",
                              status === "completed"
                                ? "border-green-600 bg-green-600 text-white"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-green-50 hover:text-green-700"
                            )}
                            disabled={savingKey === key || loading}
                            onClick={() => void saveLog(domain.id, date.value, "completed")}
                          >
                            <Check className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Mark ${domain.label} missed on ${date.value}`}
                            title="Missed"
                            className={cn(
                              "inline-flex h-9 items-center justify-center rounded-lg border text-sm font-black transition disabled:opacity-60",
                              status === "missed"
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                            )}
                            disabled={savingKey === key || loading}
                            onClick={() => void saveLog(domain.id, date.value, "missed")}
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                        <input
                          value={noteDrafts[key] ?? ""}
                          onChange={(event) => setNoteDrafts((currentDrafts) => ({ ...currentDrafts, [key]: event.target.value }))}
                          onBlur={() => {
                            if (status) {
                              void saveLog(domain.id, date.value, status);
                            }
                          }}
                          className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Note"
                          aria-label={`${domain.label} note for ${date.value}`}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrainingPanel({ client }: { client: ClientProfileView }) {
  const defaultProgram = getCurrentAssignment(client.trainingPrograms);
  const [selectedProgramId, setSelectedProgramId] = useState(defaultProgram?.id ?? "");
  const program = client.trainingPrograms.find((assignment) => assignment.id === selectedProgramId) ?? defaultProgram;
  const [activeDayName, setActiveDayName] = useState(program?.template.days?.[0]?.name ?? "");
  const [programDraft, setProgramDraft] = useState<TrainingProgramDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState<ClientNoteSummary[]>([]);
  const [loadingWorkoutNotes, setLoadingWorkoutNotes] = useState(false);
  const [workoutSessions, setWorkoutSessions] = useState<ClientWorkoutSession[]>([]);
  const [loadingWorkoutSessions, setLoadingWorkoutSessions] = useState(false);
  const activeDay = program?.template.days?.find((day) => day.name === activeDayName) ?? program?.template.days?.[0] ?? null;
  const trainingSections = getTrainingExerciseSections(activeDay?.exercises ?? []);
  const volumeChips = getTrainingVolumeChips(activeDay?.exercises ?? []);
  const programSwitchOptions = client.trainingPrograms.map((assignment) => ({
    id: assignment.id,
    label: assignment.name,
    meta: `${assignment.durationWeeks} weeks - ${assignment.status}`
  }));

  const handleProgramSwitch = (programId: string) => {
    const nextProgram = client.trainingPrograms.find((assignment) => assignment.id === programId);
    setSelectedProgramId(programId);
    setActiveDayName(nextProgram?.template.days?.[0]?.name ?? "");
  };

  useEffect(() => {
    let active = true;

    async function loadWorkoutNotes() {
      if (!program || !activeDay) {
        setWorkoutNotes([]);
        setLoadingWorkoutNotes(false);
        return;
      }

      setLoadingWorkoutNotes(true);
      const notes = await loadPersistedWorkoutNotes(client.id, program.name, activeDay.name).catch(() => []);

      if (active) {
        setWorkoutNotes(notes);
        setLoadingWorkoutNotes(false);
      }
    }

    void loadWorkoutNotes();

    return () => {
      active = false;
    };
  }, [activeDay, client.id, program]);

  useEffect(() => {
    let active = true;

    async function loadWorkoutSessions() {
      if (!program || !activeDay) {
        setWorkoutSessions([]);
        setLoadingWorkoutSessions(false);
        return;
      }

      setLoadingWorkoutSessions(true);
      const sessions = await loadPersistedWorkoutSessions(client.id, program.name, activeDay.name).catch(() => []);

      if (active) {
        setWorkoutSessions(sessions);
        setLoadingWorkoutSessions(false);
      }
    }

    void loadWorkoutSessions();

    return () => {
      active = false;
    };
  }, [activeDay, client.id, program]);

  if (programDraft) {
    return (
      <TrainingProgramBuilder
        draft={programDraft}
        saving={saving}
        onDraftChange={setProgramDraft}
        onCancel={() => setProgramDraft(null)}
        onSave={() => void saveTrainingProgramDraft(client.id, programDraft, setSaving, setStatusMessage, () => setProgramDraft(null))}
        onSaveAsTemplate={() => saveTrainingProgramDraft(client.id, programDraft, setSaving, setStatusMessage, () => setProgramDraft(null))}
        onSaveDayAsTemplate={() => Promise.resolve()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {statusMessage ? <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{statusMessage}</p> : null}
      {program ? (
        <>
          <PlanViewerHeader
            title={program.name}
            subtitle={`${program.durationWeeks} week program - ${program.status}`}
            overview={program.draftSource.template.instructions || program.draftSource.description || ""}
            editLabel="Edit training program"
            onEdit={() => setProgramDraft(createTrainingProgramDraftFromTemplate(program.draftSource, { copy: false }))}
            disabled={!program.templateId}
            switchLabel="Switch training program"
            switchOptions={programSwitchOptions}
            selectedSwitchId={program.id}
            onSwitch={handleProgramSwitch}
          />
          <DaySelector
            label="Training days"
            days={program.template.days?.map((day) => day.name) ?? []}
            activeDay={activeDay?.name ?? ""}
            onChange={setActiveDayName}
          />
          {volumeChips.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-black text-slate-950">Total Volume Sets</h3>
              <div className="flex flex-wrap gap-2">
                {volumeChips.map((chip) => (
                  <span key={chip.label} className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-bold text-green-500">
                    {chip.label} {formatTrainingNumber(chip.sets)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <table className="w-full border-separate border-spacing-y-2 text-sm" aria-label={`${program.name} exercises`}>
            <tbody>
              {trainingSections.map((section) => (
                <TrainingExerciseSection key={section.section} section={section.section} exercises={section.exercises} />
              ))}
            </tbody>
          </table>
          <WorkoutNotesPanel
            notes={workoutNotes}
            loading={loadingWorkoutNotes}
            assignmentName={program.name}
            dayName={activeDay?.name ?? ""}
          />
          <CompletedWorkoutSessionsPanel
            sessions={workoutSessions}
            loading={loadingWorkoutSessions}
            assignmentName={program.name}
            dayName={activeDay?.name ?? ""}
          />
        </>
      ) : (
        <p className="text-sm text-gray-500">No persisted training program has been assigned yet.</p>
      )}
    </div>
  );
}

function WorkoutNotesPanel({
  notes,
  loading,
  assignmentName,
  dayName
}: {
  notes: ClientNoteSummary[];
  loading: boolean;
  assignmentName: string;
  dayName: string;
}) {
  const prefix = buildWorkoutNotePrefix(assignmentName, dayName);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={`${assignmentName} ${dayName} workout notes`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Workout Notes</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{dayName}</p>
        </div>
        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black uppercase text-indigo-600">
          {notes.length} logged
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading workout notes...</p> : null}
        {!loading && notes.length === 0 ? (
          <p className="text-sm text-slate-500">No logged notes for this workout yet.</p>
        ) : null}
        {notes.map((note) => {
          const display = parseWorkoutNoteBody(note.body, prefix);

          return (
            <article key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase text-slate-500">
                  {formatTrainingDate(note.noteDate)} by {note.authorName}
                </p>
                {display.context ? (
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">{display.context}</span>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{display.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CompletedWorkoutSessionsPanel({
  sessions,
  loading,
  assignmentName,
  dayName
}: {
  sessions: ClientWorkoutSession[];
  loading: boolean;
  assignmentName: string;
  dayName: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={`${assignmentName} ${dayName} completed workout sessions`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Completed Workouts</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{dayName}</p>
        </div>
        <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-black uppercase text-green-600">
          {sessions.length} logged
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {loading ? <p className="text-sm text-slate-500">Loading completed workouts...</p> : null}
        {!loading && sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No completed workouts logged for this day yet.</p>
        ) : null}
        {sessions.map((session) => (
          <article key={session.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-950">{formatTrainingDate(session.completedAt)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatWorkoutDuration(session.durationSeconds)}</p>
              </div>
              {session.personalBests.length > 0 ? (
                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-indigo-600">{session.personalBests.length} PBs</span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {session.exercises.map((exercise) => {
                const bestSet = getBestLoggedSet(exercise.sets);

                return (
                  <div key={`${session.id}-${exercise.exerciseName}`} className="rounded-lg bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-950">{exercise.exerciseName}</p>
                      {bestSet ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          Best {formatLoggedSet(bestSet)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exercise.sets.map((set) => (
                        <span key={`${exercise.exerciseName}-${set.setNumber}`} className="rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                          Set {set.setNumber}: {formatLoggedSet(set)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatWorkoutDuration(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function formatLoggedSet(set: ClientWorkoutSession["exercises"][number]["sets"][number]) {
  const weight = typeof set.weightKg === "number" ? `${Number.isInteger(set.weightKg) ? set.weightKg.toFixed(0) : set.weightKg.toFixed(1)}kg` : "no weight";
  const reps = set.reps?.trim() ? `${set.reps} reps` : "no reps";

  return `${weight} x ${reps}`;
}

function getBestLoggedSet(sets: ClientWorkoutSession["exercises"][number]["sets"]) {
  return sets.reduce<ClientWorkoutSession["exercises"][number]["sets"][number] | null>((best, set) => {
    if (typeof set.weightKg !== "number") {
      return best;
    }

    if (!best || typeof best.weightKg !== "number" || set.weightKg > best.weightKg) {
      return set;
    }

    return best;
  }, null);
}

function buildWorkoutNotePrefix(assignmentName: string, dayName: string) {
  return `Workout note: ${assignmentName} / ${dayName}`;
}

function parseWorkoutNoteBody(body: string, prefix: string) {
  if (!body.startsWith(prefix)) {
    return { context: "", body };
  }

  const [rawContext = "", ...contentParts] = body.slice(prefix.length).split("\n\n");
  const context = rawContext.replace(/^ \/\s*/, "").trim();
  const content = contentParts.join("\n\n").trim();

  return {
    context,
    body: content || body
  };
}

function NutritionPanel({ client }: { client: ClientProfileView }) {
  const defaultPlan = getCurrentAssignment(client.nutritionPlans);
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlan?.id ?? "");
  const activePlan = client.nutritionPlans.find((assignment) => assignment.id === selectedPlanId) ?? defaultPlan;
  const [activeDayName, setActiveDayName] = useState(activePlan?.days[0]?.name ?? "");
  const [editingPlan, setEditingPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const activeDay = activePlan?.days.find((day) => day.name === activeDayName) ?? activePlan?.days[0] ?? null;
  const dayTotals = calculateNutritionDayTotals(activeDay);
  const planSwitchOptions = client.nutritionPlans.map((assignment) => ({
    id: assignment.id,
    label: assignment.name,
    meta: `${assignment.phase} - ${assignment.status}`
  }));

  const handlePlanSwitch = (planId: string) => {
    const nextPlan = client.nutritionPlans.find((assignment) => assignment.id === planId);
    setSelectedPlanId(planId);
    setActiveDayName(nextPlan?.days[0]?.name ?? "");
  };

  if (editingPlan && activePlan) {
    return (
      <NutritionPlanBuilder
        mode="full"
        initialPlan={createMealAssignmentRow(activePlan)}
        initialTemplate={activePlan.apiTemplate}
        saving={saving}
        availableTemplates={[]}
        onBack={() => setEditingPlan(false)}
        onSave={(input, options) => saveNutritionPlanInput(client.id, activePlan, input, options, setSaving, setStatusMessage, () => setEditingPlan(false))}
        onCreateMealTemplate={(template) => void createMealTemplateFromClientProfile(template, setSaving, setStatusMessage)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {statusMessage ? <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{statusMessage}</p> : null}
      {activePlan ? (
        <>
          <PlanViewerHeader
            title={activePlan.name}
            subtitle={`${activePlan.phase} - ${activePlan.status}`}
            editLabel="Edit nutrition plan"
            onEdit={() => setEditingPlan(true)}
            disabled={!activePlan.templateId}
            switchLabel="Switch nutrition plan"
            switchOptions={planSwitchOptions}
            selectedSwitchId={activePlan.id}
            onSwitch={handlePlanSwitch}
          >
            <NutritionOverview activePlan={activePlan} dayTotals={dayTotals} />
          </PlanViewerHeader>
          <DaySelector
            label="Nutrition days"
            days={activePlan.days.map((day) => day.name)}
            activeDay={activeDay?.name ?? ""}
            onChange={setActiveDayName}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs font-black uppercase text-slate-950">Day Total</span>
            <MacroTargetPill current={dayTotals.calories} target={activePlan.calories} label="Kcal" />
            <MacroTargetPill current={dayTotals.protein} target={activePlan.protein} label="g Protein" />
            <MacroTargetPill current={dayTotals.carbs} target={activePlan.carbs} label="g Carbs" />
            <MacroTargetPill current={dayTotals.fats} target={activePlan.fats} label="g Fat" />
          </div>
          <table className="w-full border-collapse text-sm" aria-label={`${activePlan.name} meals`}>
            <tbody>
              {activeDay?.meals.map((meal, index) => (
                <NutritionMealSection key={`${meal.meal}-${index}`} meal={meal} />
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="text-sm text-gray-500">No persisted meal schedule has been assigned yet.</p>
      )}
    </div>
  );
}

function PlanViewerHeader({
  title,
  subtitle,
  overview,
  editLabel,
  onEdit,
  disabled,
  switchLabel,
  switchOptions = [],
  selectedSwitchId,
  onSwitch,
  children
}: {
  title: string;
  subtitle: string;
  overview?: string;
  editLabel: string;
  onEdit: () => void;
  disabled?: boolean;
  switchLabel?: string;
  switchOptions?: Array<{ id: string; label: string; meta: string }>;
  selectedSwitchId?: string;
  onSwitch?: (id: string) => void;
  children?: ReactNode;
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const canSwitch = switchOptions.length > 1 && onSwitch;

  return (
    <div className="flex flex-col justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm md:flex-row md:items-start">
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-indigo-700">{subtitle}</p>
        {overview ? (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-black text-slate-950">Program Overview</h3>
            <p className="max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-700">{overview}</p>
          </div>
        ) : null}
        {children}
      </div>
      <div className="flex items-center justify-end gap-2">
        {canSwitch ? (
          <div className="relative">
            <IconActionButton label={switchLabel ?? "Switch assigned plan"} onClick={() => setSwitcherOpen((open) => !open)}>
              <RefreshCw className="size-4" aria-hidden="true" />
            </IconActionButton>
            {switcherOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl" role="menu" aria-label={switchLabel ?? "Assigned plans"}>
                {switchOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={option.id === selectedSwitchId}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition",
                      option.id === selectedSwitchId ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => {
                      onSwitch(option.id);
                      setSwitcherOpen(false);
                    }}
                  >
                    <span className="font-black">{option.label}</span>
                    <span className="text-xs font-semibold text-slate-500">{option.meta}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <IconActionButton label={editLabel} onClick={onEdit} disabled={disabled}>
          <Pencil className="size-4" aria-hidden="true" />
        </IconActionButton>
      </div>
    </div>
  );
}

function IconActionButton({
  label,
  children,
  onClick,
  disabled
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50",
        "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function TrainingExerciseSection({
  section,
  exercises
}: {
  section: TrainingProgramSection;
  exercises: NonNullable<ClientTrainingProgram["template"]["days"]>[number]["exercises"];
}) {
  if (exercises.length === 0) {
    return null;
  }

  return (
    <>
      <tr>
        <th colSpan={5} className="px-0 pb-2 pt-5 text-left text-sm font-black text-slate-950">
          {getProgramSectionLabel(section)}
        </th>
      </tr>
      {exercises.map((exercise, index) => (
        <tr key={`${section}-${exercise.exerciseName}-${index}`}>
          <td className="w-10 rounded-l-xl border-y border-l border-slate-200 bg-white px-4 py-4 text-slate-300">
            <span className="block h-4 w-5 border-y-2 border-slate-200" aria-hidden="true" />
          </td>
          <td className="w-10 border-y border-slate-200 bg-white px-2 py-4 text-sm font-black text-slate-950">
            {String.fromCharCode(65 + index)}
          </td>
          <td className="border-y border-slate-200 bg-white px-4 py-4">
            <p className="font-black text-slate-950">{exercise.exerciseName}</p>
          </td>
          <td className="border-y border-slate-200 bg-white px-4 py-4 text-slate-700">
            <div className="grid gap-1 md:grid-cols-3">
              {exercise.sets ? <span>Sets: {exercise.sets}</span> : null}
              {exercise.reps ? <span>Reps: {exercise.reps}</span> : null}
              {exercise.restSeconds ? <span>REST: {formatRestSeconds(exercise.restSeconds)}</span> : null}
            </div>
          </td>
          <td className="rounded-r-xl border-y border-r border-slate-200 bg-white px-4 py-4 text-slate-700">
            {exercise.notes ? <span><strong>Notes:</strong> {exercise.notes}</span> : null}
          </td>
        </tr>
      ))}
    </>
  );
}

function NutritionMealSection({ meal }: { meal: ClientNutritionPlan["days"][number]["meals"][number] }) {
  const totals = calculateNutritionMealTotals(meal);

  return (
    <>
      <tr>
        <th colSpan={6} className="border-b border-slate-200 px-3 pb-3 pt-8 text-left text-sm font-semibold text-indigo-600">
          {meal.meal}
        </th>
      </tr>
      {meal.foods.map((food, index) => (
        <tr key={`${meal.meal}-${food.foodName}-${index}`} className="border-b border-slate-100">
          <td className="px-3 py-6 font-semibold text-slate-950">{food.foodName}</td>
          <td className="px-3 py-6 text-slate-700">
            <span className="rounded-md bg-slate-100 px-4 py-2 text-slate-600">{food.servingSize}</span>
          </td>
          <td className="px-3 py-6 text-right font-semibold text-slate-700">{formatTrainingNumber(food.calories)}Kcal</td>
          <td className="px-3 py-6 text-right font-semibold text-slate-700">{formatTrainingNumber(food.proteinGrams)}g Protein</td>
          <td className="px-3 py-6 text-right font-semibold text-slate-700">{formatTrainingNumber(food.carbsGrams)}g Carbs</td>
          <td className="px-3 py-6 text-right font-semibold text-slate-700">{formatTrainingNumber(food.fatGrams)}g Fat</td>
        </tr>
      ))}
      <tr>
        <td colSpan={6} className="px-3 py-5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs font-black uppercase text-slate-950">Meal Total</span>
            <MacroPill value={`${formatTrainingNumber(totals.calories)} Kcal`} />
            <MacroPill value={`${formatTrainingNumber(totals.protein)} g Protein`} />
            <MacroPill value={`${formatTrainingNumber(totals.carbs)} g Carbs`} />
            <MacroPill value={`${formatTrainingNumber(totals.fats)} g Fat`} />
          </div>
        </td>
      </tr>
    </>
  );
}

function NutritionOverview({
  activePlan,
  dayTotals
}: {
  activePlan: ClientNutritionPlan;
  dayTotals: { calories: number; protein: number; carbs: number; fats: number };
}) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Nutrition plan nutrient breakdown">
      <NutrientOverviewTile label="Calories" current={dayTotals.calories} target={activePlan.calories} unit="Kcal" tone="slate" />
      <NutrientOverviewTile label="Protein" current={dayTotals.protein} target={activePlan.protein} unit="g" tone="indigo" />
      <NutrientOverviewTile label="Carbs" current={dayTotals.carbs} target={activePlan.carbs} unit="g" tone="orange" />
      <NutrientOverviewTile label="Fat" current={dayTotals.fats} target={activePlan.fats} unit="g" tone="slate" />
    </div>
  );
}

function NutrientOverviewTile({
  label,
  current,
  target,
  unit,
  tone
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  tone: "slate" | "indigo" | "orange";
}) {
  return (
    <div className={cn("rounded-lg border bg-white p-3", getNutrientToneClasses(tone).tile)}>
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-black text-slate-950">
        {formatTrainingNumber(current)} / {formatTrainingNumber(target)}
        <span className="ml-1 text-xs font-bold text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function MacroPill({ value }: { value: string }) {
  return <span className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black text-white">{value}</span>;
}

function MacroTargetPill({
  current,
  target,
  label
}: {
  current: number;
  target: number;
  label: string;
}) {
  return (
    <span
      className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black text-white"
      aria-label={`${formatTrainingNumber(current)} / ${formatTrainingNumber(target)} ${label}`}
    >
      <span aria-hidden="true">{formatTrainingNumber(current)}</span>
      <span className="mx-1 text-white/70">/</span>
      <span>{formatTrainingNumber(target)}</span>
      <span className="ml-1 text-white/80">{label}</span>
    </span>
  );
}

function getNutrientToneClasses(tone: "slate" | "indigo" | "orange") {
  const tones = {
    slate: {
      tile: "border-slate-200",
      pill: "bg-slate-800 text-white"
    },
    indigo: {
      tile: "border-indigo-100",
      pill: "bg-indigo-600 text-white"
    },
    orange: {
      tile: "border-orange-100",
      pill: "bg-orange-500 text-white"
    }
  };

  return tones[tone];
}

function getTrainingExerciseSections(exercises: NonNullable<ClientTrainingProgram["template"]["days"]>[number]["exercises"]) {
  const sections: TrainingProgramSection[] = ["warmUp", "workout", "coolDown"];

  return sections
    .map((section) => ({
      section,
      exercises: exercises.filter((exercise) => (exercise.section ?? "workout") === section)
    }))
    .filter((section) => section.exercises.length > 0);
}

function getTrainingVolumeChips(exercises: NonNullable<ClientTrainingProgram["template"]["days"]>[number]["exercises"]) {
  const totals = new Map<string, number>();

  exercises.forEach((exercise) => {
    const sets = Number(exercise.sets);

    if (!Number.isFinite(sets)) {
      return;
    }

    (exercise.primaryMuscles ?? []).forEach((muscle) => {
      totals.set(muscle, (totals.get(muscle) ?? 0) + sets);
    });
  });

  return Array.from(totals, ([label, sets]) => ({ label, sets }));
}

function calculateNutritionDayTotals(day?: ClientNutritionPlan["days"][number] | null) {
  return (day?.meals ?? []).reduce(
    (totals, meal) => addNutritionTotals(totals, calculateNutritionMealTotals(meal)),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

function calculateNutritionMealTotals(meal: ClientNutritionPlan["days"][number]["meals"][number]) {
  return meal.foods.reduce(
    (totals, food) =>
      addNutritionTotals(totals, {
        calories: food.calories,
        protein: food.proteinGrams,
        carbs: food.carbsGrams,
        fats: food.fatGrams
      }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

function addNutritionTotals(
  totals: { calories: number; protein: number; carbs: number; fats: number },
  next: { calories: number; protein: number; carbs: number; fats: number }
) {
  return {
    calories: totals.calories + next.calories,
    protein: totals.protein + next.protein,
    carbs: totals.carbs + next.carbs,
    fats: totals.fats + next.fats
  };
}

function formatTrainingNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRestSeconds(value: number | string) {
  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes} min ${remainingSeconds} sec`;
}

function DaySelector({
  label,
  days,
  activeDay,
  onChange
}: {
  label: string;
  days: string[];
  activeDay: string;
  onChange: (day: string) => void;
}) {
  if (days.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-lg bg-indigo-50">
      <div className="sr-only">{label}</div>
      <div className="flex min-h-11 flex-wrap items-end gap-1 px-1">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-semibold transition",
              activeDay === day ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-indigo-700"
            )}
            onClick={() => onChange(day)}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}

function getCurrentAssignment<T extends { status: string; startsOn: string }>(assignments: T[]) {
  return assignments.find((assignment) => assignment.status === "active") ?? assignments[0] ?? null;
}

async function saveTrainingProgramDraft(
  clientId: string,
  draft: TrainingProgramDraft,
  setSaving: (saving: boolean) => void,
  setStatusMessage: (message: string | null) => void,
  onSaved: () => void
) {
  if (!draft.sourceTemplateId) {
    setStatusMessage("Training program cannot be edited because it is not linked to a saved program template.");
    return;
  }

  setSaving(true);
  setStatusMessage(null);

  try {
    const response = await fetch(`/api/v1/training-program-templates/${draft.sourceTemplateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getTrainingProgramTemplatePayload(draft, 1, { status: "published" }))
    });
    const payload = await response.json();

    if (!response.ok || !payload.data) {
      throw new Error(payload.error?.message ?? "Training program could not be saved.");
    }

    setStatusMessage("Training program saved.");
    await logClientAccountActivity(clientId, {
      type: "training-plan-updated",
      title: "Training plan updated",
      metadata: { templateId: draft.sourceTemplateId, programName: draft.title }
    });
    onSaved();
  } catch (error) {
    setStatusMessage(error instanceof Error ? error.message : "Training program could not be saved.");
  } finally {
    setSaving(false);
  }
}

async function saveNutritionPlanInput(
  clientId: string,
  plan: ClientNutritionPlan,
  input: MealPlanTemplateSaveInput,
  options: { close: boolean },
  setSaving: (saving: boolean) => void,
  setStatusMessage: (message: string | null) => void,
  onSaved: () => void
) {
  if (!plan.templateId) {
    setStatusMessage("Nutrition plan cannot be edited because it is not linked to a saved meal plan template.");
    return;
  }

  setSaving(true);
  setStatusMessage(null);

  try {
    const response = await fetch(`/api/v1/meal-plan-templates/${plan.templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = await response.json();

    if (!response.ok || !payload.data) {
      throw new Error(payload.error?.message ?? "Nutrition plan could not be saved.");
    }

    setStatusMessage("Nutrition plan saved.");
    await logClientAccountActivity(clientId, {
      type: "nutrition-plan-updated",
      title: "Nutrition plan updated",
      metadata: { templateId: plan.templateId, planName: plan.name }
    });

    if (options.close) {
      onSaved();
    }
  } catch (error) {
    setStatusMessage(error instanceof Error ? error.message : "Nutrition plan could not be saved.");
  } finally {
    setSaving(false);
  }
}

async function createMealTemplateFromClientProfile(
  template: MealTemplateCard,
  setSaving: (saving: boolean) => void,
  setStatusMessage: (message: string | null) => void
) {
  setSaving(true);
  setStatusMessage(null);

  try {
    const response = await fetch("/api/v1/meal-plan-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        phase: "Meal template",
        targetCalories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        status: "draft",
        template: template.template ?? { days: [] }
      })
    });

    if (!response.ok) {
      throw new Error("Meal template could not be saved.");
    }

    setStatusMessage(`${template.name} saved to Meal Templates.`);
  } catch (error) {
    setStatusMessage(error instanceof Error ? error.message : "Meal template could not be saved.");
  } finally {
    setSaving(false);
  }
}

function createMealAssignmentRow(plan: ClientNutritionPlan): MealAssignmentRow {
  return {
    id: plan.id,
    templateId: plan.templateId,
    planName: plan.name,
    activeClientCount: 1,
    calories: plan.calories,
    protein: plan.protein,
    carbs: plan.carbs,
    fats: plan.fats,
    lastEdited: plan.startsOn,
    status: plan.status,
    apiTemplate: plan.apiTemplate
  };
}

function SupplementationPanel({ client }: { client: ClientProfileView }) {
  const protocol = getCurrentAssignment(client.supplementProtocols);
  const [activePhaseName, setActivePhaseName] = useState(protocol?.phases[0]?.name ?? "");
  const [editingProtocol, setEditingProtocol] = useState(false);
  const activePhase = protocol?.phases.find((phase) => phase.name === activePhaseName) ?? protocol?.phases[0] ?? null;

  if (editingProtocol && protocol?.templateId) {
    return (
      <SupplementProtocolBuilderPage
        templateId={protocol.templateId}
        embedded
        onBack={() => setEditingProtocol(false)}
        onSaved={() => {
          void logClientAccountActivity(client.id, {
            type: "supplement-plan-updated",
            title: "Supplement plan updated",
            metadata: { templateId: protocol.templateId, protocolName: protocol.name }
          });
          setEditingProtocol(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {protocol ? (
        <>
          <PlanViewerHeader
            title={protocol.name}
            subtitle={`Supplement protocol - ${protocol.status}`}
            editLabel="Edit supplement protocol"
            onEdit={() => setEditingProtocol(true)}
            disabled={!protocol.templateId}
          />
          <DaySelector
            label="Protocol phases"
            days={protocol.phases.map((phase) => phase.name)}
            activeDay={activePhase?.name ?? ""}
            onChange={setActivePhaseName}
          />
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-sm" aria-label={`${protocol.name} supplements`}>
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Supplement</th>
                  <th className="px-4 py-3">Dosage</th>
                  <th className="px-4 py-3">Timing</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Buy Link</th>
                </tr>
              </thead>
              <tbody>
                {activePhase?.supplements.map((supplement, index) => {
                  const { instructions, productUrl } = parseSupplementDisplayNotes(supplement.notes ?? "");

                  return (
                    <tr key={`${supplement.supplementName}-${index}`} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold text-gray-900">{supplement.supplementName}</td>
                      <td className="px-4 py-3 text-gray-600">{supplement.dosage}</td>
                      <td className="px-4 py-3 text-gray-600">{supplement.timing}</td>
                      <td className="px-4 py-3 text-gray-600">{instructions || "No notes"}</td>
                      <td className="px-4 py-3">
                        {productUrl ? (
                          <a href={productUrl} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 underline-offset-4 hover:underline">
                            Buy supplement
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No persisted supplement protocol has been assigned yet.</p>
      )}
    </div>
  );
}

function parseSupplementDisplayNotes(notes: string) {
  const linkPrefix = "Supplement link:";
  const lines = notes.split("\n");
  const productUrlLine = lines.find((line) => line.trim().startsWith(linkPrefix));

  return {
    instructions: lines.filter((line) => !line.trim().startsWith(linkPrefix)).join("\n").trim(),
    productUrl: productUrlLine?.replace(linkPrefix, "").trim() ?? ""
  };
}

function createLogNoteDrafts(logs: ClientActivityLog[]) {
  return logs.reduce<Record<string, string>>((drafts, log) => {
    drafts[getLogKey(log.domain, log.logDate)] = log.notes ?? "";
    return drafts;
  }, {});
}

function upsertActivityLog(logs: ClientActivityLog[], nextLog: ClientActivityLog) {
  const nextKey = getLogKey(nextLog.domain, nextLog.logDate);
  const replaced = logs.map((log) => (getLogKey(log.domain, log.logDate) === nextKey ? nextLog : log));

  if (replaced.some((log) => getLogKey(log.domain, log.logDate) === nextKey)) {
    return replaced;
  }

  return [...logs, nextLog];
}

function getLogKey(domain: ClientLogDomain, logDate: string) {
  return `${domain}:${logDate}`;
}

function getDateRangeLabelsFromToday(days: number) {
  const dateTo = new Date(`${todayDate()}T00:00:00.000Z`);
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - (days - 1));

  return getDateRangeLabels(dateFrom.toISOString().slice(0, 10), dateTo.toISOString().slice(0, 10));
}

function getDateRangeLabels(dateFrom: string, dateTo: string) {
  const labels: Array<{ value: string; day: string; label: string }> = [];
  const cursor = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    const value = cursor.toISOString().slice(0, 10);
    labels.push({
      value,
      day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(cursor),
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(cursor)
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return labels;
}

async function logAssignedPlanChanges(
  clientId: string,
  changes: { trainingPlanIds: string[]; nutritionPlanIds: string[]; supplementationPlanIds: string[] }
) {
  const activityRequests = [
    ...changes.trainingPlanIds.map((templateId) =>
      logClientAccountActivity(clientId, {
        type: "training-plan-updated",
        title: "Training plan assigned",
        metadata: { templateId }
      })
    ),
    ...changes.nutritionPlanIds.map((templateId) =>
      logClientAccountActivity(clientId, {
        type: "nutrition-plan-updated",
        title: "Nutrition plan assigned",
        metadata: { templateId }
      })
    ),
    ...changes.supplementationPlanIds.map((templateId) =>
      logClientAccountActivity(clientId, {
        type: "supplement-plan-updated",
        title: "Supplement plan assigned",
        metadata: { templateId }
      })
    )
  ];

  await Promise.all(activityRequests);
}

async function logClientAccountActivity(
  clientId: string,
  input: {
    type:
      | "training-plan-updated"
      | "nutrition-plan-updated"
      | "supplement-plan-updated"
      | "client-profile-target-updated";
    title: string;
    metadata?: Record<string, unknown>;
  }
) {
  const response = await fetch(`/api/v1/clients/${clientId}/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Client account activity could not be saved.");
  }
}
