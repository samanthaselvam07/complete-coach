"use client";

import { ClipboardCopy, Edit, MoreVertical, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CardListViewToggle, type CardListViewMode } from "@/components/ui/card-list-view-toggle";
import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import { SavedToast } from "@/components/ui/saved-toast";
import { usePersistedCardListView } from "@/components/ui/use-persisted-card-list-view";
import type { ActiveSupplementProtocol, ProtocolTemplate } from "@/lib/supplements/protocol-display";
import { confirmDestructiveAction } from "@/lib/ui/confirm-destructive-action";

type TabId = "active" | "library";
type ProtocolTemplateDraft = {
  id?: string;
  name: string;
  category: ProtocolTemplate["category"];
  description: string;
  supplements: number;
  status: ApiSupplementTemplate["status"];
  template: SupplementTemplateJson;
};

interface SupplementTemplateJson {
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

interface ApiSupplementTemplate {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived" | string;
  template: SupplementTemplateJson | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiSupplementAssignment {
  id: string;
  clientId: string;
  templateId: string | null;
  name: string;
  clientName: string | null;
  status: string;
  snapshot: { templateId?: string; templateName?: string; template?: SupplementTemplateJson; compliance?: number } | null;
  startsOn?: string;
  endsOn?: string | null;
  createdAt?: string;
  updatedAt?: string;
  compliance?: number | null;
}

interface AssignableClient {
  id: string;
  name: string;
  packageName?: string;
  status?: string;
}

function filterSupplementProtocols(protocols: ActiveSupplementProtocol[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return protocols;
  }

  return protocols.filter((protocol) =>
    [
      protocol.protocol,
      protocol.status,
      protocol.createdOn,
      protocol.assignedOn,
      protocol.supplements.join(" ")
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function filterProtocolTemplates(templates: ProtocolTemplate[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return templates;
  }

  return templates.filter((template) =>
    [template.name, template.category, template.description, `${template.supplements} supplements`]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function SupplementPlansPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [activeProtocols, setActiveProtocols] = useState<ActiveSupplementProtocol[]>([]);
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<ProtocolTemplate | null>(null);
  const [clients, setClients] = useState<AssignableClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [templateViewMode, setTemplateViewMode] = usePersistedCardListView("complete-coach:protocol-template-library-view");

  const filteredActiveProtocols = useMemo(
    () => filterSupplementProtocols(activeProtocols, librarySearchQuery),
    [activeProtocols, librarySearchQuery]
  );
  const filteredTemplates = useMemo(
    () => filterProtocolTemplates(templates, librarySearchQuery),
    [templates, librarySearchQuery]
  );

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

        const [assignmentsPayload, templatesPayload] = (await Promise.all([
          assignmentsResponse.json(),
          templatesResponse.json()
        ])) as [{ data?: ApiSupplementAssignment[] }, { data?: ApiSupplementTemplate[] }];

        if (mounted) {
          setActiveProtocols((assignmentsPayload.data ?? []).map(mapApiAssignmentToProtocol));
          setTemplates((templatesPayload.data ?? []).map(mapApiTemplateToCard));
        }
      } catch {
        if (mounted) {
          setActiveProtocols([]);
          setTemplates([]);
        }
      } finally {
        if (mounted) {
          setLoadingPlans(false);
        }
      }
    }

    void loadPlans();

    return () => {
      mounted = false;
    };
  }, []);

  async function createPersistedTemplate(draft: ProtocolTemplateDraft) {
    const response = await fetch("/api/v1/supplement-plan-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getTemplatePayload(draft))
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

  async function openAssignDialog(template: ProtocolTemplate) {
    setAssigningTemplate(template);
    setClientSearch("");
    setSelectedClientId("");
    setStatusMessage(null);

    try {
      const response = await fetch("/api/v1/clients?limit=100");

      if (!response.ok) {
        throw new Error("Client roster unavailable.");
      }

      const payload = (await response.json()) as { data?: AssignableClient[] };
      setClients(payload.data ?? []);
    } catch {
      setClients([]);
      setStatusMessage("Client roster could not be loaded.");
    }
  }

  async function assignTemplateToClient() {
    if (!assigningTemplate || !selectedClientId) {
      setStatusMessage("Select a client before assigning this protocol.");
      return;
    }

    setAssigning(true);

    try {
      const response = await fetch("/api/v1/supplement-plan-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          templateId: assigningTemplate.id,
          name: assigningTemplate.name,
          startsOn: todayDateOnly()
        })
      });

      if (!response.ok) {
        throw new Error("Protocol could not be assigned.");
      }

      const payload = (await response.json()) as { data?: ApiSupplementAssignment };

      const selectedClient = clients.find((client) => client.id === selectedClientId);
      const assignment =
        payload.data ??
        ({
          id: `pending-${assigningTemplate.id}-${selectedClientId}`,
          clientId: selectedClientId,
          templateId: assigningTemplate.id,
          clientName: selectedClient?.name ?? "Selected client",
          name: assigningTemplate.name,
          status: "active",
          startsOn: todayDateOnly(),
          createdAt: new Date().toISOString(),
          snapshot: {
            templateId: assigningTemplate.id,
            templateName: assigningTemplate.name,
            template: assigningTemplate.template
          }
        } satisfies ApiSupplementAssignment);

      setActiveProtocols((currentProtocols) => [
        mapApiAssignmentToProtocol({
          ...assignment,
          clientId: assignment.clientId || selectedClientId,
          clientName: assignment.clientName ?? selectedClient?.name ?? "Selected client",
          name: assignment.name || assigningTemplate.name,
          templateId: assignment.templateId ?? assigningTemplate.id,
          snapshot: assignment.snapshot ?? {
            templateId: assigningTemplate.id,
            templateName: assigningTemplate.name,
            template: assigningTemplate.template
          }
        }),
        ...currentProtocols
      ]);

      setAssigningTemplate(null);
      setActiveTab("active");
      setStatusMessage(`${assigningTemplate.name} assigned.`);
    } catch {
      setStatusMessage("Supplement protocol could not be assigned.");
    } finally {
      setAssigning(false);
    }
  }

  async function duplicateTemplate(template: ProtocolTemplate) {
    try {
      const createdTemplate = await createPersistedTemplate({
        id: undefined,
        name: `${template.name} (copy)`,
        category: template.category,
        description: template.description,
        supplements: template.supplements,
        status: template.status,
        template: template.template
      });

      setTemplates((currentTemplates) => [createdTemplate, ...currentTemplates]);
      setStatusMessage(`${template.name} duplicated.`);
    } catch {
      setStatusMessage("Supplement template copy could not be saved.");
    }
  }

  async function duplicateAssignment(protocol: ActiveSupplementProtocol) {
    if (!protocol.templateId) {
      setStatusMessage("This protocol cannot be duplicated because it is not linked to a template.");
      return;
    }

    try {
      const response = await fetch("/api/v1/supplement-plan-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: protocol.clientId,
          templateId: protocol.templateId,
          name: `${protocol.protocol} (copy)`,
          startsOn: todayDateOnly()
        })
      });

      if (!response.ok) {
        throw new Error("Protocol could not be duplicated.");
      }

      const payload = (await response.json()) as { data?: ApiSupplementAssignment };

      if (payload.data) {
        setActiveProtocols((currentProtocols) => [mapApiAssignmentToProtocol(payload.data as ApiSupplementAssignment), ...currentProtocols]);
      }

      setStatusMessage(`${protocol.protocol} duplicated.`);
    } catch {
      setStatusMessage("Supplement protocol could not be duplicated.");
    }
  }

  async function deleteTemplate(template: ProtocolTemplate) {
    if (
      !confirmDestructiveAction({
        itemName: template.name,
        itemType: "supplement template"
      })
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/supplement-plan-templates/${template.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Template could not be deleted.");
      }

      setTemplates((currentTemplates) => currentTemplates.filter((item) => item.id !== template.id));
      setStatusMessage(`${template.name} deleted.`);
    } catch {
      setStatusMessage("Supplement template could not be deleted.");
    }
  }

  async function deleteAssignment(protocol: ActiveSupplementProtocol) {
    if (
      !confirmDestructiveAction({
        itemName: protocol.protocol,
        itemType: "supplement protocol"
      })
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/supplement-plan-assignments/${protocol.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Protocol could not be deleted.");
      }

      setActiveProtocols((currentProtocols) => currentProtocols.filter((item) => item.id !== protocol.id));
      setStatusMessage(`${protocol.protocol} deleted.`);
    } catch {
      setStatusMessage("Supplement protocol could not be deleted.");
    }
  }

  function openProtocolBuilder(templateId: string | null) {
    if (!templateId) {
      setStatusMessage("This protocol cannot be edited because it is not linked to a saved protocol template.");
      return;
    }

    router.push(`/supplementation/plans/${templateId}/edit` as Route);
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      {loadingPlans ? <CompleteCoachLoadingScreen title="Preparing supplement protocols" label="Preparing supplement protocols." /> : null}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-black">Supplementation Hub</h1>
          <p className="text-sm text-slate-600">Manage client protocols and track compliance</p>
        </div>
        <Link
          href="/supplementation/plans/create"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Protocol
        </Link>
      </header>
      {statusMessage ? <SavedToast message={statusMessage} /> : null}

      <section>
        <div className="mb-6 flex border-b border-slate-200">
          <div role="tablist" aria-label="Supplement protocol sections" className="flex gap-8">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "active"}
              onClick={() => {
                setActiveTab("active");
                setOpenActionMenuId(null);
              }}
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
              onClick={() => {
                setActiveTab("library");
                setOpenActionMenuId(null);
              }}
              className={`border-b-2 pb-3 text-sm font-bold transition ${
                activeTab === "library" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600"
              }`}
            >
              Protocol Templates
            </button>
          </div>
        </div>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block flex-1">
            <span className="sr-only">{activeTab === "active" ? "Search supplement protocols" : "Search protocol templates"}</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              aria-label={activeTab === "active" ? "Search supplement protocols" : "Search protocol templates"}
              value={librarySearchQuery}
              placeholder={activeTab === "active" ? "Search supplement protocols..." : "Search protocol templates..."}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => {
                setLibrarySearchQuery(event.target.value);
                setOpenActionMenuId(null);
              }}
            />
          </label>
          {activeTab === "library" ? (
            <CardListViewToggle label="Protocol template view options" value={templateViewMode} onChange={setTemplateViewMode} />
          ) : null}
        </div>

        {activeTab === "active" ? (
          <SupplementProtocolsTable
            protocols={filteredActiveProtocols}
            emptyMessage={activeProtocols.length > 0 && filteredActiveProtocols.length === 0 ? "No supplement protocols match your search." : "No supplement protocols have been assigned yet."}
            openActionMenuId={openActionMenuId}
            onActionMenuToggle={setOpenActionMenuId}
            onAssign={openAssignDialog}
            onEdit={openProtocolBuilder}
            onDuplicate={duplicateAssignment}
            onDelete={deleteAssignment}
          />
        ) : (
          <ProtocolTemplateGrid
            templates={filteredTemplates}
            emptyMessage={templates.length > 0 && filteredTemplates.length === 0 ? "No protocol templates match your search." : "No protocol templates have been created yet."}
            viewMode={templateViewMode}
            openActionMenuId={openActionMenuId}
            onActionMenuToggle={setOpenActionMenuId}
            onAssign={openAssignDialog}
            onEdit={openProtocolBuilder}
            onDuplicate={duplicateTemplate}
            onDelete={deleteTemplate}
          />
        )}
      </section>

      {assigningTemplate ? (
        <AssignTemplateDialog
          template={assigningTemplate}
          clients={clients}
          clientSearch={clientSearch}
          selectedClientId={selectedClientId}
          assigning={assigning}
          onSearchChange={setClientSearch}
          onSelectClient={setSelectedClientId}
          onClose={() => setAssigningTemplate(null)}
          onConfirm={assignTemplateToClient}
        />
      ) : null}
    </main>
  );
}

function SupplementProtocolsTable({
  protocols,
  emptyMessage,
  openActionMenuId,
  onActionMenuToggle,
  onAssign,
  onEdit,
  onDuplicate,
  onDelete
}: {
  protocols: ActiveSupplementProtocol[];
  emptyMessage: string;
  openActionMenuId: string | null;
  onActionMenuToggle: (id: string | null) => void;
  onAssign: (template: ProtocolTemplate) => void;
  onEdit: (templateId: string | null) => void;
  onDuplicate: (protocol: ActiveSupplementProtocol) => void;
  onDelete: (protocol: ActiveSupplementProtocol) => void;
}) {
  const assignmentCounts = protocols.reduce((counts, protocol) => {
    const key = protocol.templateId ?? protocol.protocol;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return (
    <div role="tabpanel" aria-label="Supplement Protocols" className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      {openActionMenuId ? (
        <button
          type="button"
          aria-label="Close supplement protocol actions"
          className="fixed inset-0 z-[50] cursor-default bg-transparent"
          onClick={() => onActionMenuToggle(null)}
        />
      ) : null}
      <table className="w-full min-w-[980px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-6 py-4">Supplement Plan</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Assigned Clients</th>
            <th className="px-6 py-4">Plan Created</th>
            <th className="px-6 py-4">Assigned</th>
            <th className="px-6 py-4">Compliance</th>
            <th className="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {protocols.length > 0 ? (
            protocols.map((protocol) => {
              const menuOpen = openActionMenuId === `protocol-${protocol.id}`;
              const assignedClientCount = assignmentCounts.get(protocol.templateId ?? protocol.protocol) ?? 1;

              return (
                <tr key={protocol.id} className={`relative border-b border-slate-100 last:border-0 ${menuOpen ? "z-[70]" : "z-0"}`}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-950">{protocol.protocol}</p>
                    <p className="mt-1 text-xs text-slate-500">{protocol.supplements.join(", ") || "No supplements listed"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${protocol.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {protocol.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-950">
                    {assignedClientCount} active {assignedClientCount === 1 ? "client" : "clients"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{protocol.createdOn}</td>
                  <td className="px-6 py-4 text-slate-600">{protocol.assignedOn}</td>
                  <td className="px-6 py-4">
                    {protocol.compliance === null ? (
                      <span className="text-slate-500">Not logged</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(0, protocol.compliance))}%` }} />
                        </div>
                        <span>{protocol.compliance}%</span>
                      </div>
                    )}
                  </td>
                  <td className="relative px-6 py-4">
                    <SupplementInlineActions
                      id={`supplement-protocol-actions-${protocol.id}`}
                      label={`Supplement protocol actions for ${protocol.protocol}`}
                      menuOpen={menuOpen}
                      itemName={protocol.protocol}
                      onMenuToggle={() => onActionMenuToggle(menuOpen ? null : `protocol-${protocol.id}`)}
                      onMenuClose={() => onActionMenuToggle(null)}
                      onEdit={() => onEdit(protocol.templateId)}
                      onDelete={() => onDelete(protocol)}
                      onAssign={() => onAssign(createProtocolTemplateFromProtocol(protocol))}
                      onCopy={() => onDuplicate(protocol)}
                    />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProtocolTemplateGrid({
  templates,
  emptyMessage,
  viewMode,
  openActionMenuId,
  onActionMenuToggle,
  onAssign,
  onEdit,
  onDuplicate,
  onDelete
}: {
  templates: ProtocolTemplate[];
  emptyMessage: string;
  viewMode: CardListViewMode;
  openActionMenuId: string | null;
  onActionMenuToggle: (id: string | null) => void;
  onAssign: (template: ProtocolTemplate) => void;
  onEdit: (templateId: string | null) => void;
  onDuplicate: (template: ProtocolTemplate) => void;
  onDelete: (template: ProtocolTemplate) => void;
}) {
  return (
    <div role="tabpanel" aria-label="Protocol Templates" className="relative">
      {openActionMenuId ? (
        <button
          type="button"
          aria-label="Close protocol template actions"
          className="fixed inset-0 z-[50] cursor-default bg-transparent"
          onClick={() => onActionMenuToggle(null)}
        />
      ) : null}
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          {emptyMessage}
        </div>
      ) : viewMode === "cards" ? (
        <div role="region" aria-label="Protocol template cards" className="grid gap-6 lg:grid-cols-3">
          {templates.map((protocol) => {
            const menuOpen = openActionMenuId === `template-${protocol.id}`;

            return (
              <article key={protocol.id} className={`relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-lg ${menuOpen ? "z-[70]" : "z-0"}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl font-black text-indigo-700">
                    {protocol.name.slice(0, 1)}
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{protocol.category}</span>
                </div>
                <h2 className="mb-2 font-black">{protocol.name}</h2>
                <p className="mb-4 text-sm leading-6 text-slate-600">{protocol.description}</p>
                <p className="mb-4 text-sm text-slate-500">{protocol.supplements} supplement{protocol.supplements === 1 ? "" : "s"}</p>
                <SupplementInlineActions
                  id={`supplement-template-actions-${protocol.id}`}
                  label={`Supplement template actions for ${protocol.name}`}
                  menuOpen={menuOpen}
                  itemName={protocol.name}
                  onMenuToggle={() => onActionMenuToggle(menuOpen ? null : `template-${protocol.id}`)}
                  onMenuClose={() => onActionMenuToggle(null)}
                  onEdit={() => onEdit(protocol.id)}
                  onDelete={() => onDelete(protocol)}
                  onAssign={() => onAssign(protocol)}
                  onCopy={() => onDuplicate(protocol)}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <div role="region" aria-label="Protocol template list" className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-600">
            <div className="col-span-5">Template Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Supplements</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Actions</div>
          </div>
          {templates.map((protocol) => {
            const menuOpen = openActionMenuId === `template-${protocol.id}`;

            return (
              <article
                key={protocol.id}
                className={`relative grid grid-cols-12 items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-0 hover:bg-slate-50 ${menuOpen ? "z-[70]" : "z-0"}`}
              >
                <div className="col-span-5">
                  <h2 className="text-sm font-semibold text-slate-950">{protocol.name}</h2>
                </div>
                <div className="col-span-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{protocol.category}</span>
                </div>
                <div className="col-span-2 text-sm text-slate-600">
                  {protocol.supplements} supplement{protocol.supplements === 1 ? "" : "s"}
                </div>
                <div className="col-span-2 whitespace-normal break-words text-sm leading-5 text-slate-500">{protocol.description}</div>
                <div className="col-span-1">
                  <SupplementInlineActions
                    id={`supplement-template-actions-${protocol.id}`}
                    label={`Supplement template actions for ${protocol.name}`}
                    menuOpen={menuOpen}
                    itemName={protocol.name}
                    onMenuToggle={() => onActionMenuToggle(menuOpen ? null : `template-${protocol.id}`)}
                    onMenuClose={() => onActionMenuToggle(null)}
                    onEdit={() => onEdit(protocol.id)}
                    onDelete={() => onDelete(protocol)}
                    onAssign={() => onAssign(protocol)}
                    onCopy={() => onDuplicate(protocol)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplementInlineActions({
  id,
  label,
  menuOpen,
  itemName,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onAssign,
  onCopy
}: {
  id: string;
  label: string;
  menuOpen: boolean;
  itemName: string;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign?: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        aria-label={`Edit ${itemName}`}
        className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
        onClick={onEdit}
      >
        <Edit className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`More actions for ${itemName}`}
        aria-expanded={menuOpen}
        aria-controls={id}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        onClick={onMenuToggle}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      {menuOpen ? (
        <SupplementActionMenu
          id={id}
          label={label}
          onEdit={() => {
            onMenuClose();
            onEdit();
          }}
          onDelete={() => {
            onMenuClose();
            onDelete();
          }}
          onAssign={
            onAssign
              ? () => {
                  onMenuClose();
                  onAssign();
                }
              : undefined
          }
          onCopy={() => {
            onMenuClose();
            onCopy();
          }}
        />
      ) : null}
    </div>
  );
}

function SupplementActionMenu({
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
  onAssign?: () => void;
  onCopy: () => void;
}) {
  const actions = [
    { label: "Edit", icon: Edit, onSelect: onEdit },
    { label: "Delete", icon: Trash2, onSelect: onDelete },
    ...(onAssign ? [{ label: "Assign to", icon: UserPlus, onSelect: onAssign }] : []),
    { label: "Copy", icon: ClipboardCopy, onSelect: onCopy }
  ];

  return (
    <div
      id={id}
      role="menu"
      aria-label={label}
      className="absolute right-0 top-10 z-[80] w-44 rounded-xl border border-slate-200 bg-white py-2 shadow-xl"
    >
      {actions.map(({ label: actionLabel, icon: Icon, onSelect }) => (
        <button
          key={actionLabel}
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
          onClick={onSelect}
        >
          <Icon className="size-4 text-slate-500" aria-hidden="true" />
          {actionLabel}
        </button>
      ))}
    </div>
  );
}

function AssignTemplateDialog({
  template,
  clients,
  clientSearch,
  selectedClientId,
  assigning,
  onSearchChange,
  onSelectClient,
  onClose,
  onConfirm
}: {
  template: ProtocolTemplate;
  clients: AssignableClient[];
  clientSearch: string;
  selectedClientId: string;
  assigning: boolean;
  onSearchChange: (value: string) => void;
  onSelectClient: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    return query ? clients.filter((client) => client.name.toLowerCase().includes(query)) : clients;
  }, [clientSearch, clients]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="assign-template-title" className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="assign-template-title" className="text-xl font-black text-slate-950">
              Assign Protocol Template
            </h2>
            <p className="mt-1 text-sm text-slate-600">{template.name}</p>
          </div>
          <button type="button" aria-label="Close assign template" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-6">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Search client roster</span>
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={clientSearch}
                placeholder="Search clients..."
                className="w-full border-0 bg-transparent text-sm outline-none"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </span>
          </label>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <label
                  key={client.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50"
                  onClick={() => onSelectClient(client.id)}
                >
                  <span>
                    <span className="block text-sm font-bold text-slate-950">{client.name}</span>
                    <span className="text-xs text-slate-500">{client.packageName ?? "No package assigned"}</span>
                  </span>
                  <input
                    aria-label={`Select ${client.name}`}
                    type="radio"
                    name="supplement-client"
                    checked={selectedClientId === client.id}
                    onChange={() => onSelectClient(client.id)}
                  />
                </label>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-500">No clients match that search.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!selectedClientId || assigning} onClick={onConfirm}>
            {assigning ? "Assigning..." : "Confirm Assignment"}
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
  const compliance = assignment.compliance ?? assignment.snapshot?.compliance ?? null;

  return {
    id: assignment.id,
    clientId: assignment.clientId,
    templateId: assignment.templateId ?? assignment.snapshot?.templateId ?? null,
    clientName: assignment.clientName ?? "Unassigned client",
    protocol: assignment.name || assignment.snapshot?.templateName || "Supplement protocol",
    supplements,
    status: assignment.status === "active" ? "Active" : "Inactive",
    compliance: typeof compliance === "number" ? compliance : null,
    createdOn: formatDisplayDate(assignment.createdAt),
    assignedOn: formatDisplayDate(assignment.startsOn),
    template: assignment.snapshot?.template ?? createTemplateJson("General Health", Math.max(1, supplements.length))
  };
}

function mapApiTemplateToCard(template: ApiSupplementTemplate): ProtocolTemplate {
  const supplementCount = template.template?.phases?.reduce((total, phase) => total + (phase.supplements?.length ?? 0), 0) ?? 0;

  return {
    id: template.id,
    name: template.name,
    category: inferTemplateCategory(template),
    description: template.description ?? "Coach-created supplement protocol.",
    supplements: Math.max(1, supplementCount),
    status: template.status,
    template: template.template ?? createTemplateJson("General Health", Math.max(1, supplementCount))
  };
}

function createProtocolTemplateFromProtocol(protocol: ActiveSupplementProtocol): ProtocolTemplate {
  return {
    id: protocol.templateId ?? protocol.id,
    name: protocol.protocol,
    category: "General Health",
    description: `Template linked to ${protocol.clientName}'s supplement plan.`,
    supplements: Math.max(1, protocol.supplements.length),
    status: "draft",
    template: protocol.template
  };
}

function createTemplateJson(category: ProtocolTemplate["category"] | string, supplements: number, existingTemplate?: SupplementTemplateJson): SupplementTemplateJson {
  const existingSupplements = existingTemplate?.phases?.[0]?.supplements ?? [];

  return {
    phases: [
      {
        name: category || "General Health",
        supplements: Array.from({ length: supplements }, (_, index) => ({
          supplementName: existingSupplements[index]?.supplementName ?? `Supplement ${index + 1}`,
          dosage: existingSupplements[index]?.dosage ?? "Coach to complete",
          timing: existingSupplements[index]?.timing ?? "Coach to complete",
          ...(existingSupplements[index]?.supplementId ? { supplementId: existingSupplements[index]?.supplementId } : {}),
          ...(existingSupplements[index]?.notes ? { notes: existingSupplements[index]?.notes } : {})
        }))
      }
    ]
  };
}

function getTemplatePayload(draft: ProtocolTemplateDraft) {
  return {
    name: draft.name.trim() || "Untitled Protocol Template",
    description: draft.description.trim() || "Coach-created supplement protocol template.",
    status: draft.status,
    template: createTemplateJson(draft.category, draft.supplements, draft.template)
  };
}

function inferTemplateCategory(template: ApiSupplementTemplate): ProtocolTemplate["category"] {
  const firstPhase = template.template?.phases?.[0]?.name;

  if (firstPhase === "Performance" || firstPhase === "Recovery" || firstPhase === "General Health") {
    return firstPhase;
  }

  return template.status === "published" ? "Performance" : "General Health";
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
