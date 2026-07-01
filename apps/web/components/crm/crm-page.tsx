"use client";

import { Calendar, Clock, GripVertical, Mail, MapPin, Pencil, Phone, Plus, Search, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import { pipelineStages, type Lead, type LeadStageId, type LeadStatus } from "@/lib/crm/lead-models";
import { cn } from "@/lib/utils";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  hot: { label: "Hot", className: "border-red-200 bg-red-100 text-red-700" },
  warm: { label: "Warm", className: "border-yellow-200 bg-yellow-100 text-yellow-700" },
  cold: { label: "Cold", className: "border-blue-200 bg-blue-100 text-blue-700" }
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
}

const emptyLeadForm: LeadFormState = {
  name: "",
  email: "",
  phone: "",
  source: "",
  status: "warm",
  stage: "initial-contact",
  location: "",
  notes: ""
};

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm);
  const [leadFormError, setLeadFormError] = useState<string | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        const response = await fetch("/api/v1/leads");

        if (!response.ok) {
          throw new Error("Lead API unavailable.");
        }

        const payload = (await response.json()) as { data?: Lead[] };

        if (active) {
          setLeads(payload.data ?? []);
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

    void loadLeads();

    return () => {
      active = false;
    };
  }, []);

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

  const filteredLeads = leads.filter((lead) => {
    const query = leadSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [lead.name, lead.email, lead.phone, lead.source, lead.location, lead.notes].some((value) =>
      value.toLowerCase().includes(query)
    );
  });

  const openCreateLead = () => {
    setEditingLead(null);
    setLeadForm(emptyLeadForm);
    setLeadFormError(null);
    setLeadFormOpen(true);
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source === "Unknown" ? "" : lead.source,
      status: lead.status,
      stage: lead.stage,
      location: lead.location === "Unknown" ? "" : lead.location,
      notes: lead.notes
    });
    setLeadFormError(null);
    setLeadFormOpen(true);
  };

  const closeLeadForm = () => {
    setLeadFormOpen(false);
    setEditingLead(null);
    setLeadForm(emptyLeadForm);
    setLeadFormError(null);
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
          notes: leadForm.notes || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Lead could not be saved.");
      }

      const payload = (await response.json()) as { data?: Lead };

      const savedLead = payload.data;

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

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition-colors hover:bg-indigo-700"
          onClick={openCreateLead}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add New Lead
        </button>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <CRMStat label="Total Leads" value={filteredLeads.length} tone="text-gray-900" />
        <CRMStat label="Hot Leads" value={filteredLeads.filter((lead) => lead.status === "hot").length} tone="text-red-600" />
        <CRMStat label="Warm Leads" value={filteredLeads.filter((lead) => lead.status === "warm").length} tone="text-yellow-600" />
        <CRMStat label="Cold Leads" value={filteredLeads.filter((lead) => lead.status === "cold").length} tone="text-blue-600" />
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-h-[600px] gap-4">
          {pipelineStages.map((stage) => {
            const stageLeads = filteredLeads.filter((lead) => lead.stage === stage.id);

            return (
              <section
                key={stage.id}
                aria-label={stage.title}
                className={cn("flex min-w-80 flex-col rounded-xl border border-gray-200 p-4", stage.color)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedLeadId) {
                    moveLead(draggedLeadId, stage.id);
                  }
                }}
              >
                <div className="mb-4">
                  <h2 className="mb-1 font-semibold text-gray-900">{stage.title}</h2>
                  <p className="text-xs text-gray-500">
                    {stageLeads.length} lead{stageLeads.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      currentStage={stage.id}
                      onEdit={openEditLead}
                      onMove={(leadId, stageId) => void moveLead(leadId, stageId)}
                      onDragStart={setDraggedLeadId}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {leadFormOpen ? (
        <LeadFormDialog
          editingLead={editingLead}
          form={leadForm}
          error={leadFormError}
          saving={savingLead}
          onChange={(field, value) => setLeadForm((currentForm) => ({ ...currentForm, [field]: value }))}
          onClose={closeLeadForm}
          onSubmit={() => void saveLead()}
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
    // Local optimistic movement remains available if persistence is not configured yet.
    return null;
  }
}

function CRMStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={cn("text-3xl font-bold", tone)}>{value}</div>
    </section>
  );
}

function LeadCard({
  lead,
  currentStage,
  onEdit,
  onMove,
  onDragStart
}: {
  lead: Lead;
  currentStage: LeadStageId;
  onEdit: (lead: Lead) => void;
  onMove: (leadId: string, stageId: LeadStageId) => void;
  onDragStart: (leadId: string) => void;
}) {
  const status = statusConfig[lead.status];
  const nextStages = pipelineStages.filter((stage) => stage.id !== currentStage);

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

      <p className="mb-3 text-sm text-gray-600">{lead.notes}</p>

      <div className="mb-3 space-y-1.5 text-xs">
        <p className="flex items-center gap-2 text-gray-600">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{lead.email}</span>
        </p>
        <p className="flex items-center gap-2 text-gray-600">
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{lead.phone}</span>
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Tag className="size-3.5" aria-hidden="true" />
            {lead.source}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {lead.daysInStage}d
          </span>
        </div>
      </div>

      <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
        Last contact: <span className="font-medium text-gray-700">{lead.lastContact}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-1 rounded bg-indigo-50 py-1.5 text-indigo-600 transition-colors hover:bg-indigo-100">
          <Mail className="size-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Email</span>
        </button>
        <button className="flex items-center justify-center gap-1 rounded bg-green-50 py-1.5 text-green-600 transition-colors hover:bg-green-100">
          <Phone className="size-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Call</span>
        </button>
      </div>

      <button
        type="button"
        className="mt-2 flex w-full items-center justify-center gap-1 rounded bg-slate-100 py-1.5 text-slate-700 transition-colors hover:bg-slate-200"
        onClick={() => onEdit(lead)}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        <span className="text-xs font-medium">Edit {lead.name}</span>
      </button>

      <div className="mt-2">
        <label htmlFor={`move-${lead.id}`} className="sr-only">
          Move {lead.name}
        </label>
        <select
          id={`move-${lead.id}`}
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600"
          value=""
          onChange={(event) => onMove(lead.id, event.target.value as LeadStageId)}
        >
          <option value="" disabled>
            Move stage
          </option>
          {nextStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </select>
      </div>

      <div className="sr-only">
        {nextStages.map((stage) => (
          <button key={stage.id} type="button" onClick={() => onMove(lead.id, stage.id)}>
            Move {lead.name} to {stage.title}
          </button>
        ))}
      </div>

      <button type="button" className="sr-only">
        <Calendar className="size-3.5" aria-hidden="true" />
        Schedule follow-up
      </button>
    </article>
  );
}

function LeadFormDialog({
  editingLead,
  form,
  error,
  saving,
  onChange,
  onClose,
  onSubmit
}: {
  editingLead: Lead | null;
  form: LeadFormState;
  error: string | null;
  saving: boolean;
  onChange: (field: keyof LeadFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="lead-form-title" className="text-2xl font-bold text-gray-900">
              {editingLead ? "Edit lead" : "Add lead"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">Persist pipeline details to the active coaching organization.</p>
          </div>
          <button type="button" aria-label="Close lead form" className="rounded-lg p-2 hover:bg-gray-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <LeadTextField label="Lead name" value={form.name} onChange={(value) => onChange("name", value)} required />
          <LeadTextField label="Lead email" type="email" value={form.email} onChange={(value) => onChange("email", value)} />
          <LeadTextField label="Lead phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
          <LeadTextField label="Lead source" value={form.source} onChange={(value) => onChange("source", value)} />
          <LeadSelectField label="Lead status" value={form.status} options={["hot", "warm", "cold"]} onChange={(value) => onChange("status", value)} />
          <LeadSelectField
            label="Lead stage"
            value={form.stage}
            options={["initial-contact", "consultation", "proposal", "negotiation", "closed-won"]}
            onChange={(value) => onChange("stage", value)}
          />
          <LeadTextField label="Lead location" value={form.location} onChange={(value) => onChange("location", value)} />
          <div className="md:col-span-2">
            <label htmlFor="lead-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Lead notes
            </label>
            <textarea
              id="lead-notes"
              value={form.notes}
              className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => onChange("notes", event.target.value)}
            />
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
          >
            Save lead
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
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function LeadSelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
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
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function upsertLead(leads: Lead[], lead: Lead) {
  const existingLead = leads.find((currentLead) => currentLead.id === lead.id);

  if (!existingLead) {
    return [lead, ...leads];
  }

  return leads.map((currentLead) => (currentLead.id === lead.id ? lead : currentLead));
}
