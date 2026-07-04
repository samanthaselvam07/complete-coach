"use client";

import { Calendar, ClipboardCopy, Edit, MoreVertical, Search, Trash2, Users, UserPlus, Zap } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

import { CardListViewToggle } from "@/components/ui/card-list-view-toggle";
import { usePersistedCardListView } from "@/components/ui/use-persisted-card-list-view";
import type { ClientSummary } from "@/lib/clients/client-models";
import { cn } from "@/lib/utils";

import type { ProgramAssignmentRow, ProgramTemplateCard } from "./training-programs-page";

export interface AssignableProgramTarget {
  id: string;
  name: string;
  templateId: string | null;
  durationWeeks: number;
}

export function ActiveProgramsPanel({
  programs,
  searchQuery,
  onSearchChange,
  onEditProgram,
  onDeleteProgram,
  onCopyProgram,
  onAssignProgram
}: {
  programs: ProgramAssignmentRow[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onEditProgram: (program: ProgramAssignmentRow) => void;
  onDeleteProgram: (program: ProgramAssignmentRow) => void;
  onCopyProgram: (program: ProgramAssignmentRow) => void;
  onAssignProgram: (program: ProgramAssignmentRow) => void;
}) {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  return (
    <section role="tabpanel" aria-label="Custom programs" className="relative">
      {openActionMenuId ? (
        <button
          type="button"
          aria-label="Close training program actions"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setOpenActionMenuId(null)}
        />
      ) : null}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search custom programs"
            placeholder="Search programs..."
            value={searchQuery}
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-visible rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
          <div className="col-span-4">Program Name</div>
          <div className="col-span-3">Assigned To</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2">Last Edited</div>
          <div className="col-span-1">Actions</div>
        </div>
        {programs.map((program) => {
          const isActionMenuOpen = openActionMenuId === program.id;

          return (
            <article
              key={program.id}
              className={cn(
                "relative grid grid-cols-12 items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0 hover:bg-gray-50",
                isActionMenuOpen ? "z-40" : "z-0"
              )}
            >
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
              <div className={cn("relative col-span-1 flex items-center gap-2", isActionMenuOpen ? "z-[70]" : "z-10")}>
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
                  aria-expanded={isActionMenuOpen}
                  aria-controls={`training-program-actions-${program.id}`}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                  onClick={() => setOpenActionMenuId((currentMenuId) => (currentMenuId === program.id ? null : program.id))}
                >
                  <MoreVertical className="size-4" aria-hidden="true" />
                </button>
                {isActionMenuOpen ? (
                  <TrainingProgramActionsMenu
                    id={`training-program-actions-${program.id}`}
                    label={`Actions for ${program.name}`}
                    onEdit={() => {
                      setOpenActionMenuId(null);
                      onEditProgram(program);
                    }}
                    onDelete={() => {
                      setOpenActionMenuId(null);
                      onDeleteProgram(program);
                    }}
                    onAssign={() => {
                      setOpenActionMenuId(null);
                      onAssignProgram(program);
                    }}
                    onCopy={() => {
                      setOpenActionMenuId(null);
                      onCopyProgram(program);
                    }}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
        {programs.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-600">No custom programs match the current search.</p>
        ) : null}
      </div>
    </section>
  );
}

export function TemplatesPanel({
  templates,
  canUseTemplates,
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCopyTemplate,
  onAssignTemplate
}: {
  templates: ProgramTemplateCard[];
  canUseTemplates: boolean;
  onUseTemplate: (template: ProgramTemplateCard) => void;
  onEditTemplate: (template: ProgramTemplateCard) => void;
  onDeleteTemplate: (template: ProgramTemplateCard) => void;
  onCopyTemplate: (template: ProgramTemplateCard) => void;
  onAssignTemplate: (template: ProgramTemplateCard) => void;
}) {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = usePersistedCardListView("complete-coach:program-template-library-view");

  return (
    <section role="tabpanel" aria-label="Program templates" className="relative">
      {openActionMenuId ? (
        <button
          type="button"
          aria-label="Close program template actions"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setOpenActionMenuId(null)}
        />
      ) : null}
      <div className="mb-6 flex justify-end">
        <CardListViewToggle label="Program template view options" value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "cards" ? (
        <div role="region" aria-label="Program template cards" className="grid gap-6 md:grid-cols-3">
          {templates.map((template) => {
            const isActionMenuOpen = openActionMenuId === template.id;

            return (
              <article
                key={template.id}
                className={cn(
                  "group relative overflow-visible rounded-xl border border-gray-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg",
                  isActionMenuOpen ? "z-40" : "z-0"
                )}
              >
                <div className={cn("relative p-6 text-white", template.color)}>
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="size-5" aria-hidden="true" />
                    <h2 className="text-lg font-bold">{template.name}</h2>
                  </div>
                  <p className="text-sm text-white/90">{template.description}</p>
                </div>
                <div className="p-5">
                  <TemplateActionsButton
                    template={template}
                    isActionMenuOpen={isActionMenuOpen}
                    setOpenActionMenuId={setOpenActionMenuId}
                    wrapperClassName="mb-4 flex justify-end"
                    onEditTemplate={onEditTemplate}
                    onDeleteTemplate={onDeleteTemplate}
                    onAssignTemplate={onAssignTemplate}
                    onCopyTemplate={onCopyTemplate}
                  />
                  <TemplateMeta template={template} />
                  <UseTemplateButton template={template} canUseTemplates={canUseTemplates} onUseTemplate={onUseTemplate} />
                </div>
              </article>
            );
          })}
          <EmptyTemplatesState templates={templates} />
        </div>
      ) : (
        <div role="region" aria-label="Program template list" className="overflow-visible rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
            <div className="col-span-5">Template Name</div>
            <div className="col-span-2">Clients</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Use Template</div>
            <div className="col-span-1">Actions</div>
          </div>
          {templates.map((template) => {
            const isActionMenuOpen = openActionMenuId === template.id;

            return (
              <article
                key={template.id}
                className={cn(
                  "relative grid grid-cols-12 items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0 hover:bg-gray-50",
                  isActionMenuOpen ? "z-40" : "z-0"
                )}
              >
                <div className="col-span-5">
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </div>
                <div className="col-span-2 flex items-center gap-1 text-sm text-gray-600">
                  <Users className="size-4" aria-hidden="true" />
                  {template.uses} clients
                </div>
                <div className="col-span-2 flex items-center gap-1 text-sm text-gray-600">
                  <Calendar className="size-4" aria-hidden="true" />
                  {template.weeks} weeks
                </div>
                <div className="col-span-2">
                  <UseTemplateButton template={template} canUseTemplates={canUseTemplates} onUseTemplate={onUseTemplate} compact />
                </div>
                <div className={cn("relative col-span-1 flex justify-end", isActionMenuOpen ? "z-[70]" : "z-10")}>
                  <TemplateActionsButton
                    template={template}
                    isActionMenuOpen={isActionMenuOpen}
                    setOpenActionMenuId={setOpenActionMenuId}
                    wrapperClassName="flex justify-end"
                    onEditTemplate={onEditTemplate}
                    onDeleteTemplate={onDeleteTemplate}
                    onAssignTemplate={onAssignTemplate}
                    onCopyTemplate={onCopyTemplate}
                  />
                </div>
              </article>
            );
          })}
          {templates.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-600">No program templates exist yet. Create a new program to start the library.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function TemplateActionsButton({
  template,
  isActionMenuOpen,
  setOpenActionMenuId,
  wrapperClassName,
  onEditTemplate,
  onDeleteTemplate,
  onAssignTemplate,
  onCopyTemplate
}: {
  template: ProgramTemplateCard;
  isActionMenuOpen: boolean;
  setOpenActionMenuId: Dispatch<SetStateAction<string | null>>;
  wrapperClassName: string;
  onEditTemplate: (template: ProgramTemplateCard) => void;
  onDeleteTemplate: (template: ProgramTemplateCard) => void;
  onAssignTemplate: (template: ProgramTemplateCard) => void;
  onCopyTemplate: (template: ProgramTemplateCard) => void;
}) {
  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        aria-label={`More actions for ${template.name}`}
        aria-expanded={isActionMenuOpen}
        aria-controls={`training-template-actions-${template.id}`}
        className={cn("relative rounded-lg p-2 text-gray-600 hover:bg-gray-100", isActionMenuOpen ? "z-[70]" : "z-10")}
        onClick={() => setOpenActionMenuId((currentMenuId) => (currentMenuId === template.id ? null : template.id))}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      {isActionMenuOpen ? (
        <TrainingProgramActionsMenu
          id={`training-template-actions-${template.id}`}
          label={`Actions for ${template.name}`}
          onEdit={() => {
            setOpenActionMenuId(null);
            onEditTemplate(template);
          }}
          onDelete={() => {
            setOpenActionMenuId(null);
            onDeleteTemplate(template);
          }}
          onAssign={() => {
            setOpenActionMenuId(null);
            onAssignTemplate(template);
          }}
          onCopy={() => {
            setOpenActionMenuId(null);
            onCopyTemplate(template);
          }}
        />
      ) : null}
    </div>
  );
}

function TemplateMeta({ template }: { template: ProgramTemplateCard }) {
  return (
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
  );
}

function UseTemplateButton({
  template,
  canUseTemplates,
  onUseTemplate,
  compact = false
}: {
  template: ProgramTemplateCard;
  canUseTemplates: boolean;
  onUseTemplate: (template: ProgramTemplateCard) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300",
        compact ? "px-4 py-2" : "w-full py-2.5"
      )}
      disabled={!canUseTemplates}
      onClick={() => onUseTemplate(template)}
    >
      Use Template
    </button>
  );
}

function EmptyTemplatesState({ templates }: { templates: ProgramTemplateCard[] }) {
  return templates.length === 0 ? (
    <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
      No program templates exist yet. Create a new program to start the library.
    </p>
  ) : null;
}

function TrainingProgramActionsMenu({
  id,
  label,
  onEdit,
  onDelete,
  onAssign,
  onCopy
}: {
  id: string;
  label: string;
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
      aria-label={label}
      className="absolute right-0 top-10 z-[80] w-40 rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
    >
      {actions.map(({ label: actionLabel, icon: Icon, onSelect }) => (
        <button
          key={actionLabel}
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
          onClick={onSelect}
        >
          <Icon className="size-4 text-gray-500" aria-hidden="true" />
          {actionLabel}
        </button>
      ))}
    </div>
  );
}

export function TrainingProgramAssignmentDialog({
  target,
  onClose,
  onAssign
}: {
  target: AssignableProgramTarget;
  onClose: () => void;
  onAssign: (client: ClientSummary, durationWeeks: number) => void;
}) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(String(target.durationWeeks));

  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const response = await fetch("/api/v1/clients?status=active&limit=100");

        if (!response.ok) {
          throw new Error("Client API unavailable.");
        }

        const payload = (await response.json()) as { data?: ClientSummary[] };

        if (active && Array.isArray(payload.data)) {
          setClients(payload.data);
        }
      } catch {
        if (active) {
          setClients([]);
        }
      }
    }

    void loadClients();

    return () => {
      active = false;
    };
  }, []);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(clientSearchQuery.trim().toLowerCase())
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const parsedDurationWeeks = Math.max(1, Number(durationWeeks) || target.durationWeeks);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-training-program-title"
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="assign-training-program-title" className="text-2xl font-bold text-gray-900">
              Assign Training Program
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Search the client roster and assign <span className="font-semibold text-gray-900">{target.name}</span>.
            </p>
          </div>
          <button type="button" className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="mt-6 block text-sm font-semibold text-gray-700">
          Search clients
          <input
            type="search"
            value={clientSearchQuery}
            placeholder="Search client roster..."
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setClientSearchQuery(event.target.value)}
          />
        </label>

        <div role="listbox" aria-label="Client roster results" className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-gray-200">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              type="button"
              role="option"
              aria-selected={selectedClientId === client.id}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-indigo-50",
                selectedClientId === client.id ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
              )}
              onClick={() => setSelectedClientId(client.id)}
            >
              <span className="font-semibold">{client.name}</span>
              <span className="text-xs text-gray-500">{client.packageName}</span>
            </button>
          ))}
          {filteredClients.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-600">No clients match that search.</p>
          ) : null}
        </div>

        <label className="mt-5 block max-w-xs text-sm font-semibold text-gray-700">
          Program duration
          <span className="ml-1 text-xs text-gray-500">(weeks)</span>
          <input
            type="number"
            min="1"
            max="104"
            value={durationWeeks}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setDurationWeeks(event.target.value)}
          />
        </label>
        <p className="mt-2 text-xs text-gray-500">
          Access ends after this duration. Use this expiry to trigger a new-program task for the coach.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!selectedClient}
            onClick={() => {
              if (selectedClient) {
                onAssign(selectedClient, parsedDurationWeeks);
              }
            }}
          >
            Assign Program
          </button>
        </div>
      </section>
    </div>
  );
}
