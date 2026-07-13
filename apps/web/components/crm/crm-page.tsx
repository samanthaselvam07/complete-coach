"use client";

import { Clock, GripVertical, Link2, Mail, MapPin, Phone, Plus, Search, Settings2, Tag, Trash2, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import { pipelineStages, type Lead, type LeadStage, type LeadStageId, type LeadStatus } from "@/lib/crm/lead-models";
import { createCrmStageSlug, crmStageColorValues, type CrmStageColor } from "@/lib/crm/stage-records";
import { cn } from "@/lib/utils";

const statusConfig: Record<LeadStatus, { label: string; className: string; tone: string }> = {
  hot: { label: "Hot", className: "border-red-200 bg-red-100 text-red-700", tone: "text-red-600" },
  warm: { label: "Warm", className: "border-yellow-200 bg-yellow-100 text-yellow-700", tone: "text-yellow-600" },
  cold: { label: "Cold", className: "border-blue-200 bg-blue-100 text-blue-700", tone: "text-blue-600" }
};

const stageColorClasses: Record<CrmStageColor, string> = {
  gray: "bg-gray-50",
  blue: "bg-blue-50",
  purple: "bg-purple-50",
  yellow: "bg-yellow-50",
  green: "bg-green-50",
  orange: "bg-orange-50",
  red: "bg-red-50"
};

const stageColorSwatches: Record<CrmStageColor, string> = {
  gray: "bg-gray-400",
  blue: "bg-blue-500",
  purple: "bg-indigo-600",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  red: "bg-red-500"
};

interface LeadFormState {
  name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  stage: LeadStageId;
  location: string;
  notes: string;
  callLink: string;
}

const emptyLeadForm: LeadFormState = {
  name: "",
  email: "",
  phone: "",
  source: "",
  status: "warm",
  stage: "initial-contact",
  location: "",
  notes: "",
  callLink: ""
};

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [stageSettingsOpen, setStageSettingsOpen] = useState(false);
  const [crmStages, setCrmStages] = useState<LeadStage[]>(pipelineStages);
  const [draftStages, setDraftStages] = useState<LeadStage[]>(pipelineStages);
  const [stageSettingsError, setStageSettingsError] = useState<string | null>(null);
  const [savingStages, setSavingStages] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm);
  const [leadFormError, setLeadFormError] = useState<string | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const stageLabels = useMemo(
    () =>
      crmStages.reduce(
        (labels, stage) => ({
          ...labels,
          [stage.id]: stage.title
        }),
        {} as Record<LeadStageId, string>
      ),
    [crmStages]
  );

  useEffect(() => {
    let active = true;

    async function loadCrm() {
      try {
        const [leadResponse, stageResponse] = await Promise.all([fetch("/api/v1/leads"), fetch("/api/v1/crm/stages")]);

        if (!leadResponse.ok || !stageResponse.ok) {
          throw new Error("CRM API unavailable.");
        }

        const leadPayload = (await leadResponse.json()) as { data?: Lead[] };
        const stagePayload = (await stageResponse.json()) as { data?: LeadStage[] };

        if (active) {
          setLeads(leadPayload.data ?? []);
          setCrmStages(stagePayload.data?.length ? stagePayload.data : pipelineStages);
        }
      } catch {
        if (active) {
          setLeads([]);
        }
      } finally {
        if (active) {
          setLoadingLeads(false);
        }
      }
    }

    void loadCrm();

    return () => {
      active = false;
    };
  }, []);

  const searchFilteredLeads = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();

    if (!query) {
      return leads;
    }

    return leads.filter((lead) =>
      [lead.name, lead.email, lead.phone, lead.source, lead.location, lead.notes].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [leadSearch, leads]);

  const filteredLeads = useMemo(() => {
    if (!statusFilter) {
      return searchFilteredLeads;
    }

    return searchFilteredLeads.filter((lead) => lead.status === statusFilter);
  }, [searchFilteredLeads, statusFilter]);

  const openCreateLead = () => {
    setEditingLead(null);
    setLeadForm({ ...emptyLeadForm, stage: crmStages[0]?.id ?? emptyLeadForm.stage });
    setLeadFormError(null);
    setLeadFormOpen(true);
  };

  const openLeadProfile = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm(getLeadFormState(lead));
    setLeadFormError(null);
    setLeadFormOpen(true);
  };

  const closeLeadForm = () => {
    setLeadFormOpen(false);
    setEditingLead(null);
    setLeadForm(emptyLeadForm);
    setLeadFormError(null);
  };

  const openStageSettings = () => {
    setDraftStages(crmStages);
    setStageSettingsError(null);
    setStageSettingsOpen(true);
  };

  const saveStages = async () => {
    setSavingStages(true);
    setStageSettingsError(null);

    try {
      const response = await fetch("/api/v1/crm/stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: draftStages.map((stage, position) => ({
            id: stage.id,
            title: stage.title.trim(),
            color: stage.color,
            position
          }))
        })
      });

      if (!response.ok) {
        throw new Error("CRM stages could not be saved.");
      }

      const payload = (await response.json()) as { data?: LeadStage[] };
      const savedStages = payload.data?.length ? payload.data : draftStages;
      setCrmStages(savedStages);
      setDraftStages(savedStages);
      setStageSettingsOpen(false);
    } catch {
      setStageSettingsError("CRM stages could not be saved. Please try again.");
    } finally {
      setSavingStages(false);
    }
  };

  const saveLead = async () => {
    setSavingLead(true);
    setLeadFormError(null);

    try {
      const response = await fetch(editingLead ? `/api/v1/leads/${editingLead.id}` : "/api/v1/leads", {
        method: editingLead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email || undefined,
          phone: leadForm.phone || undefined,
          source: leadForm.source || undefined,
          status: leadForm.status,
          stage: leadForm.stage,
          location: leadForm.location || undefined,
          notes: leadForm.notes || undefined,
          callLink: leadForm.callLink || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Lead could not be saved.");
      }

      const payload = (await response.json()) as { data?: Lead };
      const savedLead = payload.data
        ? {
            ...payload.data,
            callLink: leadForm.callLink,
            applicationResponses: editingLead?.applicationResponses ?? payload.data.applicationResponses ?? []
          }
        : null;

      if (savedLead) {
        setLeads((currentLeads) => upsertLead(currentLeads, savedLead));
      }

      closeLeadForm();
    } catch {
      setLeadFormError("Lead could not be saved. Check the details and try again.");
    } finally {
      setSavingLead(false);
    }
  };

  const moveLead = async (leadId: string, stageId: LeadStageId) => {
    const previousLeads = leads;

    setLeads((currentLeads) => currentLeads.map((lead) => (lead.id === leadId ? { ...lead, stage: stageId, daysInStage: 0 } : lead)));
    setDraggedLeadId(null);

    const persistedLead = await persistLeadStage(leadId, stageId);

    if (persistedLead) {
      setLeads((currentLeads) => upsertLead(currentLeads, persistedLead));
      return;
    }

    setLeads(previousLeads);
  };

  return (
    <div className="p-6 md:p-8">
      {loadingLeads ? (
        <CompleteCoachLoadingScreen
          title="Preparing CRM"
          label="Preparing CRM pipeline."
        />
      ) : null}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Client Relationship Management</h1>
        <p className="text-gray-600">Manage leads and track client acquisition pipeline</p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="relative">
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            id="lead-search"
            type="search"
            value={leadSearch}
            placeholder="Search leads..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 md:w-80"
            onChange={(event) => setLeadSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-5 py-2.5 text-indigo-700 transition-colors hover:bg-indigo-50"
            onClick={openStageSettings}
          >
            <Settings2 className="size-4" aria-hidden="true" />
            Customize CRM stages
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition-colors hover:bg-indigo-700"
            onClick={openCreateLead}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add New Lead
          </button>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <CRMStat
          active={!statusFilter}
          label="Total Leads"
          value={searchFilteredLeads.length}
          tone="text-gray-900"
          onClick={() => setStatusFilter(null)}
        />
        {(["hot", "warm", "cold"] as LeadStatus[]).map((status) => (
          <CRMStat
            key={status}
            active={statusFilter === status}
            label={`${statusConfig[status].label} Leads`}
            value={searchFilteredLeads.filter((lead) => lead.status === status).length}
            tone={statusConfig[status].tone}
            onClick={() => setStatusFilter((currentStatus) => (currentStatus === status ? null : status))}
          />
        ))}
      </div>

      {statusFilter ? (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <span>Showing {statusConfig[statusFilter].label.toLowerCase()} leads across every CRM stage.</span>
          <button type="button" className="font-semibold text-indigo-700" onClick={() => setStatusFilter(null)}>
            Clear lead status filter
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-4">
        <div className="flex h-[620px] gap-4">
          {crmStages.map((stage) => {
            const stageLeads = filteredLeads.filter((lead) => lead.stage === stage.id);
            const stageTitle = stageLabels[stage.id];

            return (
              <section
                key={stage.id}
                aria-label={stageTitle}
                className={cn("flex min-w-80 flex-col rounded-xl border border-gray-200 p-4", getStageColorClass(stage.color))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedLeadId) {
                    void moveLead(draggedLeadId, stage.id);
                  }
                }}
              >
                <div className="mb-4 shrink-0">
                  <h2 className="mb-1 font-semibold text-gray-900">{stageTitle}</h2>
                  <p className="text-xs text-gray-500">
                    {stageLeads.length} lead{stageLeads.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      currentStage={stage.id}
                      stages={crmStages}
                      stageLabels={stageLabels}
                      onMove={(leadId, stageId) => void moveLead(leadId, stageId)}
                      onDragStart={setDraggedLeadId}
                      onView={openLeadProfile}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {leadFormOpen ? (
        editingLead ? (
          <LeadProfileDialog
            lead={editingLead}
            form={leadForm}
            error={leadFormError}
            saving={savingLead}
            stageLabels={stageLabels}
            stages={crmStages}
            onChange={(field, value) => setLeadForm((currentForm) => ({ ...currentForm, [field]: value }))}
            onClose={closeLeadForm}
            onSubmit={() => void saveLead()}
          />
        ) : (
          <LeadFormDialog
            form={leadForm}
            error={leadFormError}
            saving={savingLead}
            stageLabels={stageLabels}
            stages={crmStages}
            onChange={(field, value) => setLeadForm((currentForm) => ({ ...currentForm, [field]: value }))}
            onClose={closeLeadForm}
            onSubmit={() => void saveLead()}
          />
        )
      ) : null}

      {stageSettingsOpen ? (
        <StageSettingsDialog
          error={stageSettingsError}
          saving={savingStages}
          stages={draftStages}
          onAdd={() => setDraftStages((currentStages) => addDraftStage(currentStages))}
          onChange={(stageId, updates) =>
            setDraftStages((currentStages) =>
              currentStages.map((stage) => (stage.id === stageId ? { ...stage, ...updates } : stage))
            )
          }
          onDelete={(stageId) => setDraftStages((currentStages) => currentStages.filter((stage) => stage.id !== stageId))}
          onClose={() => setStageSettingsOpen(false)}
          onSubmit={() => void saveStages()}
        />
      ) : null}
    </div>
  );
}

async function persistLeadStage(leadId: string, stageId: LeadStageId) {
  try {
    const response = await fetch(`/api/v1/leads/${leadId}/stage-transitions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stage: stageId })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: Lead };

    return payload.data ?? null;
  } catch {
    return null;
  }
}

function CRMStat({ active, label, value, tone, onClick }: { active: boolean; label: string; value: number; tone: string; onClick: () => void }) {
  const statusLabel = label === "Total Leads" ? "Show all leads" : `Filter ${label}`;

  return (
    <button
      type="button"
      aria-label={statusLabel}
      className={cn(
        "rounded-xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        active ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200"
      )}
      onClick={onClick}
    >
      <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={cn("text-3xl font-bold", tone)}>{value}</div>
    </button>
  );
}

function LeadCard({
  lead,
  currentStage,
  stages,
  stageLabels,
  onMove,
  onDragStart,
  onView
}: {
  lead: Lead;
  currentStage: LeadStageId;
  stages: LeadStage[];
  stageLabels: Record<LeadStageId, string>;
  onMove: (leadId: string, stageId: LeadStageId) => void;
  onDragStart: (leadId: string) => void;
  onView: (lead: Lead) => void;
}) {
  const status = statusConfig[lead.status];
  const nextStages = stages.filter((stage) => stage.id !== currentStage);

  return (
    <article
      draggable
      className="cursor-move rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:shadow-lg"
      onDragStart={() => onDragStart(lead.id)}
    >
      <div className="mb-3 flex items-start gap-3">
        <GripVertical className="mt-1 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {lead.initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">{lead.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="size-3" aria-hidden="true" />
            {lead.location}
          </p>
        </div>
        <span className={cn("shrink-0 rounded border px-2 py-1 text-xs font-medium", status.className)}>
          {status.label}
        </span>
      </div>

      <div className="mb-3 space-y-1.5 text-xs">
        <p className="flex items-center gap-2 text-gray-600">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{lead.email || "No email"}</span>
        </p>
        <p className="flex items-center gap-2 text-gray-600">
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{lead.phone || "No phone"}</span>
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Tag className="size-3.5" aria-hidden="true" />
          {lead.source}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          {lead.daysInStage}d
        </span>
      </div>

      <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
        Last contact: <span className="font-medium text-gray-700">{lead.lastContact}</span>
      </p>

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-1 rounded bg-indigo-600 py-2 text-white transition-colors hover:bg-indigo-700"
        onClick={() => onView(lead)}
      >
        <span className="text-xs font-semibold">View {lead.name}</span>
      </button>

      <div className="sr-only">
        {nextStages.map((stage) => (
          <button key={stage.id} type="button" onClick={() => onMove(lead.id, stage.id)}>
            Move {lead.name} to {stageLabels[stage.id]}
          </button>
        ))}
      </div>
    </article>
  );
}

function LeadFormDialog({
  form,
  error,
  saving,
  stageLabels,
  stages,
  onChange,
  onClose,
  onSubmit
}: {
  form: LeadFormState;
  error: string | null;
  saving: boolean;
  stageLabels: Record<LeadStageId, string>;
  stages: LeadStage[];
  onChange: (field: keyof LeadFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <LeadDialogShell labelledBy="lead-form-title" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <LeadDialogHeader id="lead-form-title" title="Add lead" subtitle="Persist pipeline details to the active coaching organization." onClose={onClose} />
        <LeadEditorFields form={form} stageLabels={stageLabels} stages={stages} onChange={onChange} />
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
            Save lead
          </button>
        </div>
      </form>
    </LeadDialogShell>
  );
}

function LeadProfileDialog({
  lead,
  form,
  error,
  saving,
  stageLabels,
  stages,
  onChange,
  onClose,
  onSubmit
}: {
  lead: Lead;
  form: LeadFormState;
  error: string | null;
  saving: boolean;
  stageLabels: Record<LeadStageId, string>;
  stages: LeadStage[];
  onChange: (field: keyof LeadFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const clientIntakeHref = buildClientIntakeHref(lead, form);

  return (
    <LeadDialogShell labelledBy="lead-profile-title" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <LeadDialogHeader id="lead-profile-title" title={`${lead.name} lead profile`} subtitle="Review application details, update contact details, and move this lead through the CRM." onClose={onClose} />
        <LeadEditorFields form={form} stageLabels={stageLabels} stages={stages} onChange={onChange} />

        <section className="mt-6 rounded-2xl border border-gray-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-950">Application form responses</h3>
          {lead.applicationResponses?.length ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table aria-label="Application form responses" className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lead.applicationResponses.map((response) => (
                    <tr key={`${response.question}-${response.answer}`}>
                      <td className="px-3 py-2 font-medium text-slate-700">{response.question}</td>
                      <td className="px-3 py-2 text-slate-600">{response.answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No application form responses are attached to this lead yet.</p>
          )}
        </section>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Link
            href={clientIntakeHref as `/clients/new?${string}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
          >
            <UserCheck className="size-4" aria-hidden="true" />
            Convert to client
          </Link>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
              Save lead profile
            </button>
          </div>
        </div>
      </form>
    </LeadDialogShell>
  );
}

function LeadDialogShell({ children, labelledBy, onClose }: { children: React.ReactNode; labelledBy: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        {children}
      </div>
      <button type="button" aria-label="Close lead dialog backdrop" className="fixed inset-0 -z-10 cursor-default" onClick={onClose} />
    </div>
  );
}

function LeadDialogHeader({ id, title, subtitle, onClose }: { id: string; title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-bold text-gray-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      </div>
      <button type="button" aria-label="Close lead form" className="rounded-lg p-2 hover:bg-gray-100" onClick={onClose}>
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function LeadEditorFields({
  form,
  stageLabels,
  stages,
  onChange
}: {
  form: LeadFormState;
  stageLabels: Record<LeadStageId, string>;
  stages: LeadStage[];
  onChange: (field: keyof LeadFormState, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LeadTextField label="Lead name" value={form.name} onChange={(value) => onChange("name", value)} required />
      <LeadTextField label="Lead email" type="email" value={form.email} onChange={(value) => onChange("email", value)} />
      <LeadTextField label="Lead phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
      <LeadTextField label="Lead source" value={form.source} onChange={(value) => onChange("source", value)} />
      <LeadSelectField label="Lead status" value={form.status} options={["hot", "warm", "cold"]} onChange={(value) => onChange("status", value)} />
      <LeadSelectField
        label="Lead stage"
        value={form.stage}
        options={stages.map((stage) => stage.id)}
        optionLabels={stageLabels}
        onChange={(value) => onChange("stage", value)}
      />
      <LeadTextField label="Lead location" value={form.location} onChange={(value) => onChange("location", value)} />
      <LeadTextField label="Call link" type="url" value={form.callLink} onChange={(value) => onChange("callLink", value)} icon={<Link2 className="size-4" aria-hidden="true" />} />
      <div className="md:col-span-2">
        <label htmlFor="lead-notes" className="mb-1 block text-sm font-medium text-gray-700">
          Lead notes
        </label>
        <textarea
          id="lead-notes"
          value={form.notes}
          className="min-h-32 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(event) => onChange("notes", event.target.value)}
        />
      </div>
    </div>
  );
}

function StageSettingsDialog({
  error,
  saving,
  stages,
  onAdd,
  onChange,
  onDelete,
  onClose,
  onSubmit
}: {
  error: string | null;
  saving: boolean;
  stages: LeadStage[];
  onAdd: () => void;
  onChange: (stageId: LeadStageId, updates: Partial<LeadStage>) => void;
  onDelete: (stageId: LeadStageId) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-settings-title"
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <LeadDialogHeader
          id="stage-settings-title"
          title="Customize CRM stages"
          subtitle="Add, delete, rename, and colour-code the stages for this organization."
          onClose={onClose}
        />
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {stages.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className={cn("mt-7 size-4 rounded-full", getStageSwatchClass(stage.color))} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <LeadTextField
                    label={`Stage ${index + 1} name`}
                    value={stage.title}
                    onChange={(value) => onChange(stage.id, { title: value })}
                    required
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${stage.title} stage`}
                  className="mt-6 rounded-lg border border-red-100 p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={stages.length <= 1}
                  onClick={() => onDelete(stage.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Stage colour</p>
                <div className="flex flex-wrap gap-2">
                  {crmStageColorValues.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Set ${stage.title} stage colour to ${color}`}
                      className={cn(
                        "size-8 rounded-full border-2 transition",
                        getStageSwatchClass(color),
                        stage.color === color ? "border-slate-950 ring-2 ring-indigo-200" : "border-white"
                      )}
                      onClick={() => onChange(stage.id, { color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="mr-auto rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" onClick={onAdd}>
            Add stage
          </button>
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
            Save stages
          </button>
        </div>
      </form>
    </div>
  );
}

function LeadTextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  icon
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        {icon ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span> : null}
        <input
          id={id}
          type={type}
          value={value}
          required={required}
          className={cn(
            "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
            icon ? "pl-9" : ""
          )}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function LeadSelectField({
  label,
  value,
  options,
  optionLabels,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option}
          </option>
        ))}
      </select>
    </div>
  );
}

function getLeadFormState(lead: Lead): LeadFormState {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source === "Unknown" ? "" : lead.source,
    status: lead.status,
    stage: lead.stage,
    location: lead.location === "Unknown" ? "" : lead.location,
    notes: lead.notes,
    callLink: lead.callLink ?? ""
  };
}

function splitLeadName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "New";
  const lastName = parts.join(" ") || "Client";

  return { firstName, lastName };
}

function buildClientIntakeHref(lead: Lead, form: LeadFormState) {
  const { firstName, lastName } = splitLeadName(form.name || lead.name);
  const params = new URLSearchParams({
    source: "crm",
    leadId: lead.id,
    firstName,
    lastName
  });
  const email = form.email || lead.email;
  const phone = form.phone || lead.phone;
  const dateOfBirth = extractLeadDateOfBirth(lead);

  if (email) {
    params.set("email", email);
  }

  if (phone) {
    params.set("phone", phone);
  }

  if (dateOfBirth) {
    params.set("dateOfBirth", dateOfBirth);
  }

  return `/clients/new?${params.toString()}`;
}

function extractLeadDateOfBirth(lead: Lead) {
  const dateResponse = lead.applicationResponses?.find((response) =>
    /date\s*of\s*birth|dob|birth\s*date/i.test(response.question)
  );

  return dateResponse?.answer.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function upsertLead(leads: Lead[], lead: Lead) {
  const existingLead = leads.find((currentLead) => currentLead.id === lead.id);

  if (!existingLead) {
    return [lead, ...leads];
  }

  return leads.map((currentLead) => (currentLead.id === lead.id ? lead : currentLead));
}

function addDraftStage(stages: LeadStage[]) {
  const existingSlugs = new Set(stages.map((stage) => stage.id));
  const title = "New Stage";

  return [
    ...stages,
    {
      id: createCrmStageSlug(title, existingSlugs),
      title,
      color: "purple"
    }
  ];
}

function getStageColorClass(color: string) {
  return stageColorClasses[(color as CrmStageColor) in stageColorClasses ? (color as CrmStageColor) : "gray"];
}

function getStageSwatchClass(color: string) {
  return stageColorSwatches[(color as CrmStageColor) in stageColorSwatches ? (color as CrmStageColor) : "gray"];
}
