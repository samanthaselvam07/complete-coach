"use client";

import {
  Calendar,
  ClipboardCopy,
  Edit,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
  UserPlus,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

type ProgramTab = "Active Client Programs" | "Master Templates";
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
}

export function TrainingProgramsPage() {
  const [activeTab, setActiveTab] = useState<ProgramTab>("Active Client Programs");
  const [templates, setTemplates] = useState<ApiTrainingTemplate[]>([]);
  const [assignments, setAssignments] = useState<ApiTrainingAssignment[]>([]);
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
          setTemplates(Array.isArray(templatesPayload.data) ? templatesPayload.data : []);
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

      setTemplates((currentTemplates) => [payload.data, ...currentTemplates]);
      setSource("api");
      setActiveTab("Master Templates");
      setProgramDraft(null);
      setCreationDialogMode(null);
      setStatusMessage("Program template saved to persistence API.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Template could not be saved.");
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
    if (!template.apiTemplate) {
      setErrorMessage("Persisted templates are required before duplicating a program.");
      return;
    }

    setProgramDraft(createTrainingProgramDraftFromTemplate(template.apiTemplate));
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
        {(["Active Client Programs", "Master Templates"] as ProgramTab[]).map((tab) => (
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

      {activeTab === "Active Client Programs" ? (
        <ActiveProgramsPanel programs={assignmentRows} onEditProgram={openAssignedProgramBuilder} />
      ) : (
        <TemplatesPanel
          templates={templateCards}
          canUseTemplates={source === "api"}
          onUseTemplate={openTemplateBuilder}
        />
      )}

      {creationDialogMode ? (
        <CreateProgramDialog
          mode={creationDialogMode}
          templates={templateCards}
          canUseTemplates={source === "api"}
          onModeChange={setCreationDialogMode}
          onClose={() => setCreationDialogMode(null)}
          onStartScratch={openScratchBuilder}
          onUseTemplate={openTemplateBuilder}
        />
      ) : null}
    </div>
  );
}

function ActiveProgramsPanel({
  programs,
  onEditProgram
}: {
  programs: ProgramAssignmentRow[];
  onEditProgram: (program: ProgramAssignmentRow) => void;
}) {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  return (
    <section role="tabpanel" aria-label="Active Client Programs">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search active programs"
            placeholder="Search programs..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm transition-colors hover:bg-gray-50">
          <Filter className="size-4" aria-hidden="true" />
          Filters
        </button>
      </div>

      <div className="overflow-visible rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
          <div className="col-span-4">Program Name</div>
          <div className="col-span-3">Assigned To</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2">Last Edited</div>
          <div className="col-span-1">Actions</div>
        </div>
        {programs.map((program) => (
          <article key={program.id} className="relative grid grid-cols-12 items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0 hover:bg-gray-50">
            <div className="col-span-4 flex items-center gap-3">
              <div className={cn("flex size-10 items-center justify-center rounded-lg font-bold", program.color)}>
                {program.icon}
              </div>
              <div>
                <div className="font-medium text-gray-900">{program.name}</div>
                <div className="text-xs text-gray-500">
                  {program.weeksTotal} weeks - Started {program.startDate}
                </div>
              </div>
            </div>
            <div className="col-span-3 text-sm font-medium text-gray-700">
              {program.activeClientCount} active {program.activeClientCount === 1 ? "client" : "clients"}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <div className="h-2 max-w-28 flex-1 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${program.progress}%` }} />
              </div>
              <span className="text-xs text-gray-600">{program.progress}%</span>
            </div>
            <div className="col-span-2 text-sm text-gray-600">{program.lastEdited}</div>
            <div className="relative z-30 col-span-1 flex items-center gap-2">
              <button
                type="button"
                aria-label={`Edit ${program.name}`}
                className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
                onClick={() => onEditProgram(program)}
              >
                <Edit className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`More actions for ${program.name}`}
                aria-expanded={openActionMenuId === program.id}
                aria-controls={`training-program-actions-${program.id}`}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                onClick={() => setOpenActionMenuId((currentMenuId) => (currentMenuId === program.id ? null : program.id))}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </button>
              {openActionMenuId === program.id ? (
                <TrainingProgramActionsMenu program={program} onEditProgram={onEditProgram} />
              ) : null}
            </div>
          </article>
        ))}
        {programs.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-600">No active client programs have been assigned yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function TrainingProgramActionsMenu({
  program,
  onEditProgram
}: {
  program: ProgramAssignmentRow;
  onEditProgram: (program: ProgramAssignmentRow) => void;
}) {
  const actions = [
    { label: "Edit", icon: Edit },
    { label: "Delete", icon: Trash2 },
    { label: "Assign to", icon: UserPlus },
    { label: "Copy", icon: ClipboardCopy }
  ];

  return (
    <div
      id={`training-program-actions-${program.id}`}
      role="menu"
      aria-label={`Actions for ${program.name}`}
      className="absolute right-0 top-10 z-50 w-40 rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
    >
      {actions.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
          onClick={() => {
            if (label === "Edit") {
              onEditProgram(program);
            }
          }}
        >
          <Icon className="size-4 text-gray-500" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function TemplatesPanel({
  templates,
  canUseTemplates,
  onUseTemplate
}: {
  templates: ProgramTemplateCard[];
  canUseTemplates: boolean;
  onUseTemplate: (template: ProgramTemplateCard) => void;
}) {
  return (
    <section role="tabpanel" aria-label="Master Templates">
      <div className="grid gap-6 md:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg">
            <div className={cn("relative p-6 text-white", template.color)}>
              <div className="absolute right-3 top-3 rounded bg-white/20 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                {template.badge}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Zap className="size-5" aria-hidden="true" />
                <h2 className="text-lg font-bold">{template.name}</h2>
              </div>
              <p className="text-sm text-white/90">{template.description}</p>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="size-4" aria-hidden="true" />
                  {template.uses} clients
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="size-4" aria-hidden="true" />
                  {template.weeks} weeks
                </div>
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300"
                disabled={!canUseTemplates}
                onClick={() => onUseTemplate(template)}
              >
                Use Template
              </button>
            </div>
          </article>
        ))}
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
            No program templates exist yet. Create a new program to start the library.
          </p>
        ) : null}
      </div>
    </section>
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

export function getProgramAssignmentRows(
  source: ProgramSource,
  assignments: ApiTrainingAssignment[],
  templates: ApiTrainingTemplate[] = []
): ProgramAssignmentRow[] {
  if (source === "fixtures") {
    return assignedPrograms.map((program) => ({ ...program, apiTemplate: null }));
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
      apiTemplate: template
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
