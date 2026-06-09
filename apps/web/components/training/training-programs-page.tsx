"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClientSummary } from "@/fixtures/clients";
import { assignedPrograms, programTemplates } from "@/fixtures/training";
import { cn } from "@/lib/utils";

import {
  CreateProgramDialog,
  createBlankTrainingProgramDraft,
  createTrainingProgramDraftFromTemplate,
  getTrainingProgramTemplatePayload,
  TrainingProgramBuilder
} from "./training-program-builder";
import type {
  CreationDialogMode,
  TrainingProgramDraft,
  TrainingProgramSection,
  TrainingProgramTemplateDraftSource
} from "./training-program-builder";
import {
  ActiveProgramsPanel,
  TemplatesPanel,
  TrainingProgramAssignmentDialog,
  type AssignableProgramTarget
} from "./training-program-library-panels";

type ProgramTab = "Custom programs" | "Program templates";
export type ProgramSource = "api" | "fixtures";

export interface ApiTrainingTemplate {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  durationWeeks: number;
  status: "draft" | "published" | "archived";
  template: {
    days?: Array<{
      name: string;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        sets: number;
        reps: string;
        restSeconds?: number;
        rpe?: string;
        rir?: string;
        section?: TrainingProgramSection;
      }>;
    }>;
    instructions?: string;
  };
  updatedAt: string;
}

export interface ApiTrainingAssignment {
  id: string;
  clientId: string;
  clientName: string | null;
  templateId: string | null;
  name: string;
  status: "active" | "paused" | "completed" | "cancelled";
  startsOn: string;
  endsOn: string | null;
  snapshot: {
    templateId?: string;
    templateName?: string;
    goal?: string | null;
    durationWeeks?: number;
    template?: ApiTrainingTemplate["template"];
  };
  updatedAt: string;
}

const templateColors = ["bg-indigo-600", "bg-purple-600", "bg-orange-600", "bg-slate-800"];
const assignmentColors = [
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700"
];

export interface ProgramTemplateCard {
  id: string;
  name: string;
  description: string;
  uses: number;
  weeks: number;
  color: string;
  badge: string;
  goal: string;
  apiTemplate: ApiTrainingTemplate | null;
}

export interface ProgramAssignmentRow {
  id: string;
  name: string;
  clientName: string;
  activeClientCount: number;
  progress: number;
  weeksTotal: number;
  startDate: string;
  lastEdited: string;
  color: string;
  icon: string;
  apiTemplate: TrainingProgramTemplateDraftSource | null;
  templateId: string | null;
}

export function TrainingProgramsPage() {
  const [activeTab, setActiveTab] = useState<ProgramTab>("Custom programs");
  const [templates, setTemplates] = useState<ApiTrainingTemplate[]>([]);
  const [assignments, setAssignments] = useState<ApiTrainingAssignment[]>([]);
  const [localProgramRows, setLocalProgramRows] = useState<ProgramAssignmentRow[]>([]);
  const [localTemplateCards, setLocalTemplateCards] = useState<ProgramTemplateCard[]>([]);
  const [hiddenProgramIds, setHiddenProgramIds] = useState<string[]>([]);
  const [hiddenTemplateIds, setHiddenTemplateIds] = useState<string[]>([]);
  const [programSearchQuery, setProgramSearchQuery] = useState("");
  const [assignmentTarget, setAssignmentTarget] = useState<AssignableProgramTarget | null>(null);
  const [source, setSource] = useState<ProgramSource>("fixtures");
  const [loading, setLoading] = useState(true);
  const [creationDialogMode, setCreationDialogMode] = useState<CreationDialogMode | null>(null);
  const [programDraft, setProgramDraft] = useState<TrainingProgramDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProgramLibrary() {
      try {
        const [templatesResponse, assignmentsResponse] = await Promise.all([
          fetch("/api/v1/training-program-templates?limit=100"),
          fetch("/api/v1/training-program-assignments?limit=100")
        ]);

        if (!templatesResponse.ok || !assignmentsResponse.ok) {
          throw new Error("Training program API unavailable.");
        }

        const [templatesPayload, assignmentsPayload] = await Promise.all([
          templatesResponse.json(),
          assignmentsResponse.json()
        ]);

        if (!cancelled) {
          const loadedTemplates = Array.isArray(templatesPayload.data) ? templatesPayload.data : [];

          setTemplates((currentTemplates) => (currentTemplates.length > 0 ? currentTemplates : loadedTemplates));
          setAssignments(Array.isArray(assignmentsPayload.data) ? assignmentsPayload.data : []);
          setSource("api");
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setAssignments([]);
          setSource("fixtures");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProgramLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  const templateCards = useMemo(() => getProgramTemplateCards(source, templates, assignments), [assignments, source, templates]);
  const assignmentRows = useMemo(() => getProgramAssignmentRows(source, assignments, templates), [assignments, source, templates]);
  const visibleTemplateCards = useMemo(
    () => [...localTemplateCards, ...templateCards.filter((template) => !hiddenTemplateIds.includes(template.id))],
    [hiddenTemplateIds, localTemplateCards, templateCards]
  );
  const visibleAssignmentRows = useMemo(
    () =>
      [...localProgramRows, ...assignmentRows.filter((program) => !hiddenProgramIds.includes(program.id))].filter((program) => {
        const query = programSearchQuery.trim().toLowerCase();

        if (!query) {
          return true;
        }

        return program.name.toLowerCase().includes(query);
      }),
    [assignmentRows, hiddenProgramIds, localProgramRows, programSearchQuery]
  );

  async function createTemplateFromDraft(draft: TrainingProgramDraft) {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/training-program-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getTrainingProgramTemplatePayload(draft, templates.length + 1))
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Template could not be saved.");
      }

      if (!payload.data) {
        throw new Error("Template could not be saved.");
      }

      setTemplates((currentTemplates) => [payload.data, ...currentTemplates]);
      setSource("api");
      setActiveTab("Program templates");
      setProgramDraft(null);
      setCreationDialogMode(null);
      setStatusMessage("Program template saved to persistence API.");
    } catch {
      const localTemplate = createLocalTrainingTemplateFromDraft(draft, templates.length + 1);

      setTemplates((currentTemplates) => [localTemplate, ...currentTemplates]);
      setSource("api");
      setActiveTab("Program templates");
      setProgramDraft(null);
      setCreationDialogMode(null);
      setStatusMessage("Program saved locally because the persistence API is unavailable.");
      setErrorMessage(null);
    } finally {
      setSaving(false);
    }
  }

  function openScratchBuilder() {
    setProgramDraft(createBlankTrainingProgramDraft());
    setCreationDialogMode(null);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function openTemplateBuilder(template: ProgramTemplateCard) {
    setProgramDraft(createTrainingProgramDraftFromTemplate(getTemplateDraftSource(template)));
    setCreationDialogMode(null);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function editTemplate(template: ProgramTemplateCard) {
    setProgramDraft(createTrainingProgramDraftFromTemplate(getTemplateDraftSource(template), { copy: false }));
    setCreationDialogMode(null);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function openAssignedProgramBuilder(program: ProgramAssignmentRow) {
    const sourceTemplate = program.apiTemplate;
    const fallbackDraft = createBlankTrainingProgramDraft();

    setProgramDraft(
      sourceTemplate
        ? createTrainingProgramDraftFromTemplate(sourceTemplate, { copy: false })
        : { ...fallbackDraft, title: program.name }
    );
    setCreationDialogMode(null);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function deleteTrainingProgram(target: AssignableProgramTarget) {
    setStatusMessage(null);
    setErrorMessage(null);

    if (target.templateId && !target.templateId.startsWith("local-")) {
      try {
        const response = await fetch(`/api/v1/training-program-templates/${target.templateId}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          throw new Error("Training program could not be deleted.");
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Training program could not be deleted.");
        return;
      }
    }

    setHiddenProgramIds((currentIds) => [...currentIds, target.id]);

    if (target.templateId) {
      const templateId = target.templateId;

      setHiddenTemplateIds((currentIds) => [...currentIds, templateId]);
      setTemplates((currentTemplates) => currentTemplates.filter((template) => template.id !== templateId));
      setLocalTemplateCards((currentTemplates) => currentTemplates.filter((template) => template.id !== templateId));
      setAssignments((currentAssignments) => currentAssignments.filter((assignment) => assignment.templateId !== templateId));
    }

    setLocalProgramRows((currentRows) => currentRows.filter((program) => program.id !== target.id));
    setStatusMessage(`${target.name} deleted from the training library.`);
  }

  function copyProgram(program: ProgramAssignmentRow) {
    const copiedProgram: ProgramAssignmentRow = {
      ...program,
      id: `local-program-copy-${Date.now()}`,
      name: `${program.name} (copy)`,
      activeClientCount: 0,
      progress: 0,
      lastEdited: "Just now",
      templateId: program.templateId?.startsWith("local-") ? program.templateId : null
    };

    setLocalProgramRows((currentRows) => [copiedProgram, ...currentRows]);
    setActiveTab("Custom programs");
    setStatusMessage(`${copiedProgram.name} added to Custom programs.`);
  }

  function copyTemplate(template: ProgramTemplateCard) {
    const localTemplateId = `local-template-copy-${Date.now()}`;
    const sourceTemplate = getTemplateDraftSource(template);
    const copiedTemplate: ProgramTemplateCard = {
      ...template,
      id: localTemplateId,
      name: `${template.name} (copy)`,
      uses: 0,
      badge: "COPY",
      apiTemplate: {
        id: localTemplateId,
        name: `${template.name} (copy)`,
        description: template.description,
        goal: template.goal,
        durationWeeks: template.weeks,
        status: "draft",
        template: getApiTemplateJson(sourceTemplate),
        updatedAt: new Date().toISOString()
      }
    };

    setLocalTemplateCards((currentTemplates) => [copiedTemplate, ...currentTemplates]);
    setActiveTab("Program templates");
    setStatusMessage(`${copiedTemplate.name} added to Program templates.`);
  }

  async function assignTrainingProgram(target: AssignableProgramTarget, client: ClientSummary, durationWeeks: number) {
    const startsOn = new Date().toISOString().slice(0, 10);
    const endsOn = getAssignmentEndDate(startsOn, durationWeeks);

    if (target.templateId && !target.templateId.startsWith("local-")) {
      try {
        const response = await fetch("/api/v1/training-program-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: client.id,
            templateId: target.templateId,
            name: target.name,
            startsOn,
            endsOn
          })
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error?.message ?? "Training program could not be assigned.");
        }

        if (payload.data) {
          setAssignments((currentAssignments) => [payload.data, ...currentAssignments]);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Training program could not be assigned.");
        return;
      }
    } else {
      const localAssignment: ProgramAssignmentRow = {
        id: `local-assignment-${Date.now()}`,
        name: target.name,
        clientName: client.name,
        activeClientCount: 1,
        progress: 0,
        weeksTotal: durationWeeks,
        startDate: formatDisplayDate(startsOn),
        lastEdited: "Just now",
        color: "bg-indigo-100 text-indigo-700",
        icon: client.initials.slice(0, 1),
        apiTemplate: null,
        templateId: target.templateId
      };

      setLocalProgramRows((currentRows) => [localAssignment, ...currentRows]);
    }

    setAssignmentTarget(null);
    setActiveTab("Custom programs");
    setStatusMessage(`${target.name} assigned to ${client.name}.`);
  }

  if (programDraft) {
    return (
      <TrainingProgramBuilder
        draft={programDraft}
        saving={saving}
        onDraftChange={setProgramDraft}
        onCancel={() => setProgramDraft(null)}
        onSave={() => createTemplateFromDraft(programDraft)}
      />
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Program Library</h1>
            <p className="text-gray-600">Manage and organize your coaching templates.</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
            onClick={() => setCreationDialogMode("choice")}
          >
            <Plus className="size-4" aria-hidden="true" />
            {saving ? "Saving..." : "Create New Program"}
          </button>
        </div>
      </div>

      {loading ? <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Loading persisted program library...</p> : null}
      {source === "fixtures" && !loading ? (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Program persistence API unavailable. Showing fixture program library.
        </p>
      ) : null}
      {statusMessage ? <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{statusMessage}</p> : null}
      {errorMessage ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

      <div role="tablist" aria-label="Program library sections" className="mb-8 flex items-center gap-8 border-b border-gray-200">
        {(["Custom programs", "Program templates"] as ProgramTab[]).map((tab) => (
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

      {activeTab === "Custom programs" ? (
        <ActiveProgramsPanel
          programs={visibleAssignmentRows}
          searchQuery={programSearchQuery}
          onSearchChange={setProgramSearchQuery}
          onEditProgram={openAssignedProgramBuilder}
          onDeleteProgram={(program) => void deleteTrainingProgram(programToAssignableTarget(program))}
          onCopyProgram={copyProgram}
          onAssignProgram={(program) => setAssignmentTarget(programToAssignableTarget(program))}
        />
      ) : (
        <TemplatesPanel
          templates={visibleTemplateCards}
          canUseTemplates={true}
          onUseTemplate={openTemplateBuilder}
          onEditTemplate={editTemplate}
          onDeleteTemplate={(template) => void deleteTrainingProgram(templateToAssignableTarget(template))}
          onCopyTemplate={copyTemplate}
          onAssignTemplate={(template) => setAssignmentTarget(templateToAssignableTarget(template))}
        />
      )}

      {creationDialogMode ? (
        <CreateProgramDialog
          mode={creationDialogMode}
          templates={visibleTemplateCards}
          canUseTemplates={true}
          onModeChange={setCreationDialogMode}
          onClose={() => setCreationDialogMode(null)}
          onStartScratch={openScratchBuilder}
          onUseTemplate={openTemplateBuilder}
        />
      ) : null}

      {assignmentTarget ? (
        <TrainingProgramAssignmentDialog
          target={assignmentTarget}
          onClose={() => setAssignmentTarget(null)}
          onAssign={(client, durationWeeks) => void assignTrainingProgram(assignmentTarget, client, durationWeeks)}
        />
      ) : null}
    </div>
  );
}

export function getProgramTemplateCards(
  source: ProgramSource,
  templates: ApiTrainingTemplate[],
  assignments: ApiTrainingAssignment[]
): ProgramTemplateCard[] {
  if (source === "fixtures") {
    return programTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      uses: template.uses,
      weeks: template.weeks,
      color: template.color,
      badge: template.badge,
      goal: "template",
      apiTemplate: null
    }));
  }

  return templates.map((template, index) => ({
    id: template.id,
    name: template.name,
    description: template.description || "No description recorded.",
    uses: assignments.filter((assignment) => assignment.templateId === template.id).length,
    weeks: template.durationWeeks,
    color: templateColors[index % templateColors.length],
    badge: template.status.toUpperCase(),
    goal: template.goal || "template",
    apiTemplate: template
  }));
}

function createLocalTrainingTemplateFromDraft(draft: TrainingProgramDraft, fallbackIndex: number): ApiTrainingTemplate {
  const payload = getTrainingProgramTemplatePayload(draft, fallbackIndex);

  return {
    id: `local-template-${Date.now()}`,
    name: payload.name,
    description: payload.description,
    goal: payload.goal,
    durationWeeks: payload.durationWeeks,
    status: "draft",
    template: payload.template,
    updatedAt: new Date().toISOString()
  };
}

function getTemplateDraftSource(template: ProgramTemplateCard): TrainingProgramTemplateDraftSource {
  if (template.apiTemplate) {
    return {
      ...template.apiTemplate,
      durationWeeks: template.apiTemplate.durationWeeks
    };
  }

  return {
    name: template.name,
    description: template.description,
    goal: template.goal,
    durationWeeks: template.weeks,
    template: {
      days: [
        {
          name: "Day 1",
          exercises: [
            {
              exerciseName: "Manual Exercise",
              sets: 3,
              reps: "8-10",
              restSeconds: 120,
              section: "workout"
            }
          ]
        }
      ],
      instructions: ""
    }
  };
}

function getApiTemplateJson(source: TrainingProgramTemplateDraftSource): ApiTrainingTemplate["template"] {
  return {
    days: source.template.days?.map((day, dayIndex) => ({
      name: day.name,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: `manual-entry-${dayIndex + 1}-${exerciseIndex + 1}`,
        ...exercise
      }))
    })),
    instructions: source.template.instructions
  };
}

function programToAssignableTarget(program: ProgramAssignmentRow): AssignableProgramTarget {
  return {
    id: program.id,
    name: program.name,
    templateId: program.templateId,
    durationWeeks: program.weeksTotal
  };
}

function templateToAssignableTarget(template: ProgramTemplateCard): AssignableProgramTarget {
  return {
    id: template.id,
    name: template.name,
    templateId: template.id,
    durationWeeks: template.weeks
  };
}

function getAssignmentEndDate(startsOn: string, durationWeeks: number) {
  const startDate = new Date(`${startsOn}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() + durationWeeks * 7);
  return startDate.toISOString().slice(0, 10);
}

export function getProgramAssignmentRows(
  source: ProgramSource,
  assignments: ApiTrainingAssignment[],
  templates: ApiTrainingTemplate[] = []
): ProgramAssignmentRow[] {
  if (source === "fixtures") {
    return assignedPrograms.map((program) => ({ ...program, apiTemplate: null, templateId: null }));
  }

  const assignmentGroups = new Map<string, ApiTrainingAssignment[]>();

  assignments.forEach((assignment) => {
    const assignmentKey = assignment.templateId ?? assignment.id;
    assignmentGroups.set(assignmentKey, [...(assignmentGroups.get(assignmentKey) ?? []), assignment]);
  });

  return Array.from(assignmentGroups.entries()).map(([programKey, group], index) => {
    const assignment = group.find((entry) => entry.status === "active") ?? group[0];
    const template = getAssignmentTemplateDraftSource(assignment, templates);

    return {
      id: programKey,
      name: assignment.name,
      clientName: assignment.clientName || "Unassigned client",
      activeClientCount: group.filter((entry) => entry.status === "active").length,
      progress: getAssignmentProgress(assignment.startsOn, assignment.endsOn),
      weeksTotal: assignment.snapshot.durationWeeks ?? getWeeksBetween(assignment.startsOn, assignment.endsOn),
      startDate: formatDisplayDate(assignment.startsOn),
      lastEdited: formatRelativeDate(assignment.updatedAt),
      color: assignmentColors[index % assignmentColors.length],
      icon: assignment.clientName?.[0]?.toUpperCase() ?? "P",
      apiTemplate: template,
      templateId: assignment.templateId
    };
  });
}

function getAssignmentTemplateDraftSource(
  assignment: ApiTrainingAssignment,
  templates: ApiTrainingTemplate[]
): TrainingProgramTemplateDraftSource | null {
  if (assignment.snapshot.template) {
    return {
      name: assignment.name,
      description: null,
      goal: assignment.snapshot.goal ?? null,
      durationWeeks: assignment.snapshot.durationWeeks,
      template: assignment.snapshot.template
    };
  }

  const template = templates.find((entry) => entry.id === assignment.templateId);

  if (!template) {
    return null;
  }

  return {
    ...template,
    name: assignment.name
  };
}

export function getAssignmentProgress(startsOn: string, endsOn: string | null) {
  if (!endsOn) {
    return 0;
  }

  const start = new Date(startsOn).getTime();
  const end = new Date(endsOn).getTime();
  const now = Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

export function getWeeksBetween(startsOn: string, endsOn: string | null) {
  if (!endsOn) {
    return 1;
  }

  const start = new Date(startsOn).getTime();
  const end = new Date(endsOn).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 1;
  }

  return Math.max(1, Math.round((end - start) / (7 * 24 * 60 * 60 * 1000)));
}

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatRelativeDate(value: string) {
  const updated = new Date(value).getTime();

  if (Number.isNaN(updated)) {
    return "Recently";
  }

  const days = Math.floor((Date.now() - updated) / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  return days === 1 ? "Yesterday" : `${days} days ago`;
}
