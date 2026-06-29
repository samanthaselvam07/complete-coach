"use client";

import { ClipboardCopy, Edit, Plus, Save, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type ActiveSupplementProtocol,
  type ProtocolTemplate
} from "@/lib/supplements/protocol-display";
import { SavedToast } from "@/components/ui/saved-toast";

type TabId = "active" | "library";
type ProtocolTemplateDraft = {
  id?: string;
  name: string;
  category: ProtocolTemplate["category"];
  description: string;
  supplements: number;
};

interface ApiSupplementTemplate {
  id: string;
  name: string;
  description: string | null;
  status: string;
  template: { phases?: Array<{ supplements?: unknown[] }> } | null;
}

interface ApiSupplementAssignment {
  id: string;
  name: string;
  clientName: string | null;
  status: string;
  snapshot: { template?: { phases?: Array<{ supplements?: Array<{ supplementName?: string }> }> } } | null;
}

export function SupplementPlansPage() {
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [activeProtocols, setActiveProtocols] = useState<ActiveSupplementProtocol[]>([]);
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [templateDraft, setTemplateDraft] = useState<ProtocolTemplateDraft | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function createPersistedTemplate(draft: ProtocolTemplateDraft) {
    const response = await fetch("/api/v1/supplement-plan-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim() || "Untitled Protocol Template",
        description: draft.description.trim() || "Coach-created supplement protocol template.",
        status: "draft",
        template: {
          phases: [
            {
              name: draft.category,
              supplements: Array.from(
                { length: Math.max(1, Number.isFinite(draft.supplements) ? draft.supplements : 1) },
                (_, index) => ({
                  supplementName: `Supplement ${index + 1}`,
                  dosage: "Coach to complete",
                  timing: "Coach to complete"
                })
              )
            }
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error("Supplement template could not be saved.");
    }

    const payload = (await response.json()) as { data?: ApiSupplementTemplate };

    if (!payload.data) {
      throw new Error("Supplement template response was empty.");
    }

    return mapApiTemplateToCard(payload.data);
  }

  useEffect(() => {
    let mounted = true;

    async function loadPlans() {
      try {
        const [assignmentsResponse, templatesResponse] = await Promise.all([
          fetch("/api/v1/supplement-plan-assignments?limit=100"),
          fetch("/api/v1/supplement-plan-templates?limit=100")
        ]);

        if (!assignmentsResponse.ok || !templatesResponse.ok) {
          throw new Error("Supplement plan API unavailable.");
        }

        const [assignmentsPayload, templatesPayload] = await Promise.all([
          assignmentsResponse.json(),
          templatesResponse.json()
        ]) as [{ data?: ApiSupplementAssignment[] }, { data?: ApiSupplementTemplate[] }];
        const assignments = Array.isArray(assignmentsPayload.data) ? assignmentsPayload.data : [];
        const apiTemplates = Array.isArray(templatesPayload.data) ? templatesPayload.data : [];

        if (mounted) {
          setActiveProtocols(assignments.map(mapApiAssignmentToProtocol));
          setTemplates(apiTemplates.map(mapApiTemplateToCard));
        }
      } catch {
        if (mounted) {
          setActiveProtocols([]);
          setTemplates([]);
        }
      }
    }

    void loadPlans();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-black">Supplementation Hub</h1>
          <p className="text-sm text-slate-600">Manage client protocols and track compliance</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
          onClick={() =>
            setTemplateDraft({
              name: "",
              category: "General Health",
              description: "",
              supplements: 1
            })
          }
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </header>
      {statusMessage ? <SavedToast message={statusMessage} /> : null}

      <section>
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 lg:flex-row lg:items-end lg:justify-between">
          <div role="tablist" aria-label="Supplement protocol sections" className="flex gap-8">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              className={`border-b-2 pb-3 text-sm font-bold transition ${
                activeTab === "active" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600"
              }`}
            >
              Supplement Protocols
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "library"}
              onClick={() => setActiveTab("library")}
              className={`border-b-2 pb-3 text-sm font-bold transition ${
                activeTab === "library" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600"
              }`}
            >
              Protocol Templates
            </button>
          </div>
          <div className="pb-3 text-sm font-bold text-indigo-600">
            {activeTab === "active" ? `${activeProtocols.length} protocols stored` : `${templates.length} reusable templates`}
          </div>
        </div>

        {activeTab === "active" ? (
          <div role="tabpanel" aria-label="Supplement Protocols" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Primary Protocol</th>
                  <th className="px-6 py-4">Daily Stack</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Compliance</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeProtocols.map((protocol) => (
                  <tr key={protocol.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 font-bold">{protocol.clientName}</td>
                    <td className="px-6 py-4">{protocol.protocol}</td>
                    <td className="px-6 py-4 text-slate-600">{protocol.supplements.join(", ")}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${protocol.status === "Active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {protocol.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-slate-200">
                          <div className={`h-2 rounded-full ${protocol.compliance >= 90 ? "bg-green-600" : "bg-orange-600"}`} style={{ width: `${protocol.compliance}%` }} />
                        </div>
                        <span>{protocol.compliance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button aria-label={`Edit ${protocol.clientName} protocol`} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Save ${protocol.protocol} as template`}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          onClick={async () => {
                            try {
                              const template = await createPersistedTemplate({
                                name: protocol.protocol,
                                category: "General Health",
                                description: `Template saved from ${protocol.clientName}'s protocol.`,
                                supplements: protocol.supplements.length || 1
                              });
                              setTemplates((currentTemplates) => [template, ...currentTemplates]);
                              setActiveTab("library");
                              setStatusMessage(`${protocol.protocol} saved as a template.`);
                            } catch {
                              setStatusMessage("Supplement template could not be saved to Neon.");
                            }
                          }}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Protocol Templates" className="grid gap-6 lg:grid-cols-3">
            {templates.map((protocol) => (
              <article key={protocol.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl font-black text-indigo-700">
                    {protocol.name.slice(0, 1)}
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{protocol.category}</span>
                </div>
                <h2 className="mb-2 font-black">{protocol.name}</h2>
                <p className="mb-4 text-sm leading-6 text-slate-600">{protocol.description}</p>
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-slate-500">{protocol.supplements} supplement{protocol.supplements === 1 ? "" : "s"}</span>
                  <button className="font-bold text-indigo-600">View Details -&gt;</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                    onClick={() => {
                      setStatusMessage("Assigning a protocol requires selecting a persisted client from the Neon roster.");
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                    onClick={() =>
                      setStatusMessage("Editing persisted protocol templates needs the Neon template update endpoint.")
                    }
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                    onClick={async () => {
                      try {
                        const template = await createPersistedTemplate({
                          name: `${protocol.name} (copy)`,
                          category: protocol.category,
                          description: protocol.description,
                          supplements: protocol.supplements
                        });
                        setTemplates((currentTemplates) => [template, ...currentTemplates]);
                        setStatusMessage(`${protocol.name} duplicated.`);
                      } catch {
                        setStatusMessage("Supplement template copy could not be saved to Neon.");
                      }
                    }}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {templateDraft ? (
        <ProtocolTemplateDialog
          draft={templateDraft}
          onChange={setTemplateDraft}
          onClose={() => setTemplateDraft(null)}
          onSave={async (draft) => {
            if (draft.id) {
              setStatusMessage("Editing persisted protocol templates needs the Neon template update endpoint.");
              return;
            }

            try {
              const template = await createPersistedTemplate(draft);
              setTemplates((currentTemplates) => [template, ...currentTemplates]);
              setActiveTab("library");
              setTemplateDraft(null);
              setStatusMessage(`${template.name} template saved.`);
            } catch {
              setStatusMessage("Supplement template could not be saved to Neon.");
            }
          }}
        />
      ) : null}
    </main>
  );
}

function ProtocolTemplateDialog({
  draft,
  onChange,
  onClose,
  onSave
}: {
  draft: ProtocolTemplateDraft;
  onChange: (draft: ProtocolTemplateDraft) => void;
  onClose: () => void;
  onSave: (draft: ProtocolTemplateDraft) => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="supplement-template-title" className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="supplement-template-title" className="text-xl font-black text-slate-950">
            {draft.id ? "Edit Protocol Template" : "Create Protocol Template"}
          </h2>
          <button type="button" aria-label="Close template editor" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-5 px-6 py-6">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Template name</span>
            <input
              value={draft.name}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Category</span>
            <select
              value={draft.category}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => onChange({ ...draft, category: event.target.value as ProtocolTemplate["category"] })}
            >
              <option>General Health</option>
              <option>Performance</option>
              <option>Recovery</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Description</span>
            <textarea
              value={draft.description}
              className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Supplement count</span>
            <input
              type="number"
              min="1"
              value={draft.supplements}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => onChange({ ...draft, supplements: Number(event.target.value) })}
            />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700" onClick={() => onSave(draft)}>
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

function mapApiAssignmentToProtocol(assignment: ApiSupplementAssignment): ActiveSupplementProtocol {
  const supplements =
    assignment.snapshot?.template?.phases?.flatMap((phase) =>
      phase.supplements?.map((supplement) => supplement.supplementName ?? "Supplement") ?? []
    ) ?? [];

  return {
    id: assignment.id,
    clientName: assignment.clientName ?? "Unassigned client",
    protocol: assignment.name,
    supplements,
    status: assignment.status === "active" ? "Active" : "In Review",
    compliance: assignment.status === "active" ? 95 : 70
  };
}

function mapApiTemplateToCard(template: ApiSupplementTemplate): ProtocolTemplate {
  const supplementCount =
    template.template?.phases?.reduce((total, phase) => total + (phase.supplements?.length ?? 0), 0) ?? 0;

  return {
    id: template.id,
    name: template.name,
    category: template.status === "published" ? "Performance" : "General Health",
    description: template.description ?? "Coach-created supplement protocol.",
    supplements: supplementCount
  };
}
