"use client";

import Link from "next/link";
import { ArrowLeft, FileText, LinkIcon, Plus, Save, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { SavedToast } from "@/components/ui/saved-toast";

type TimingPreset = "Morning" | "Afternoon" | "Evening";

interface ApiSupplement {
  id: string;
  name: string;
  category: string;
  recommendedTiming?: string | null;
  dosage?: string | null;
  bioavailabilityNotes?: string | null;
  clinicalDescription?: string | null;
  affiliateLink?: string;
  scope?: string;
}

interface ApiSupplementTemplate {
  id: string;
  name: string;
  description: string | null;
  status: string;
  template: SupplementTemplateJson | null;
}

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

interface ProtocolSupplement {
  id: string;
  supplementId?: string;
  supplementName: string;
  category: string;
  timingPreset: TimingPreset;
  specificTime: string;
  dosage: string;
  instructions: string;
  productUrl: string;
  clinicalNotes: string;
}

const timingPresets: TimingPreset[] = ["Morning", "Afternoon", "Evening"];

export function SupplementProtocolBuilderPage({
  templateId,
  embedded = false,
  onBack,
  onSaved
}: {
  templateId?: string;
  embedded?: boolean;
  onBack?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [persistedTemplateId, setPersistedTemplateId] = useState(templateId ?? "");
  const [protocolName, setProtocolName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiSupplement[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<ProtocolSupplement[]>([]);
  const [activeLinkSupplementId, setActiveLinkSupplementId] = useState<string | null>(null);
  const [activeClinicalSupplementId, setActiveClinicalSupplementId] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const supplementSearchLookup = useMemo(
    () => new Map(searchResults.map((supplement) => [supplement.id, supplement])),
    [searchResults]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSupplements() {
      try {
        const params = new URLSearchParams({ limit: "20" });
        const query = searchQuery.trim();

        if (query) {
          params.set("search", query);
        }

        const response = await fetch(`/api/v1/supplements?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Supplement search failed.");
        }

        const payload = (await response.json()) as { data?: ApiSupplement[] };

        if (!cancelled) {
          setSearchResults(payload.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      }
    }

    void loadSupplements();

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!templateId) {
      return;
    }

    let cancelled = false;

    async function loadTemplate() {
      setLoadingTemplate(true);

      try {
        const response = await fetch(`/api/v1/supplement-plan-templates/${templateId}`);

        if (!response.ok) {
          throw new Error("Supplement protocol could not be loaded.");
        }

        const payload = (await response.json()) as { data?: ApiSupplementTemplate };

        if (!payload.data || cancelled) {
          return;
        }

        const template = payload.data;
        setPersistedTemplateId(template.id);
        setProtocolName(template.name);
        setDescription(template.description ?? "");
        setSelectedSupplements(mapTemplateToProtocolSupplements(template.template));
      } catch {
        if (!cancelled) {
          setStatusMessage("Supplement protocol could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplate(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  function addSupplement(supplement: ApiSupplement) {
    setSelectedSupplements((current) => {
      if (current.some((item) => item.supplementId === supplement.id)) {
        return current;
      }

      return [
        ...current,
        {
          id: `protocol-supplement-${supplement.id}`,
          supplementId: supplement.id,
          supplementName: supplement.name,
          category: supplement.category,
          timingPreset: getTimingPreset(supplement.recommendedTiming),
          specificTime: "",
          dosage: "",
          instructions: "",
          productUrl: supplement.affiliateLink ?? "",
          clinicalNotes: formatClinicalNotes(supplement)
        }
      ];
    });
  }

  function handleSupplementDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const supplementId = event.dataTransfer.getData("application/complete-coach-supplement-id");
    const supplement = supplementSearchLookup.get(supplementId);

    if (supplement) {
      addSupplement(supplement);
    }
  }

  function updateSupplement(id: string, updates: Partial<ProtocolSupplement>) {
    setSelectedSupplements((current) =>
      current.map((supplement) => (supplement.id === id ? { ...supplement, ...updates } : supplement))
    );
  }

  function removeSupplement(id: string) {
    setSelectedSupplements((current) => current.filter((supplement) => supplement.id !== id));
  }

  function getSaveValidationMessage() {
    if (!protocolName.trim()) {
      return "Add a protocol name before saving.";
    }

    if (selectedSupplements.length === 0) {
      return "Add at least one supplement before saving.";
    }

    const missingDosageNames = selectedSupplements
      .filter((supplement) => !supplement.dosage.trim())
      .map((supplement) => supplement.supplementName);

    if (missingDosageNames.length > 0) {
      return `Add dosage for ${missingDosageNames.join(", ")} before saving.`;
    }

    return null;
  }

  async function saveProtocol({ closeAfterSave = false }: { closeAfterSave?: boolean } = {}) {
    const validationMessage = getSaveValidationMessage();

    if (validationMessage) {
      setStatusMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(persistedTemplateId ? `/api/v1/supplement-plan-templates/${persistedTemplateId}` : "/api/v1/supplement-plan-templates", {
        method: persistedTemplateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: protocolName.trim(),
          description: description.trim(),
          status: "published",
          template: {
            phases: [
              {
                name: "Daily Supplement Protocol",
                supplements: selectedSupplements.map((supplement) => ({
                  supplementId: supplement.supplementId,
                  supplementName: supplement.supplementName,
                  dosage: supplement.dosage.trim(),
                  timing: formatTiming(supplement.timingPreset, supplement.specificTime),
                  notes: formatSupplementNotes(supplement.instructions, supplement.productUrl)
                }))
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error("Protocol save failed.");
      }

      const payload = (await response.json()) as { data?: ApiSupplementTemplate };
      const savedId = payload.data?.id;

      if (savedId) {
        setPersistedTemplateId(savedId);
      }

      setStatusMessage(`${protocolName.trim()} saved.`);

      if (closeAfterSave && embedded) {
        onSaved?.();
      } else if (closeAfterSave) {
        router.replace("/supplementation/plans");
        router.refresh();
      }
    } catch {
      setStatusMessage("Supplement protocol could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      {statusMessage ? <SavedToast message={statusMessage} /> : null}
      <header>
        <div>
          {embedded ? (
            <button type="button" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600" onClick={onBack}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to supplementation
            </button>
          ) : (
            <Link href="/supplementation/plans" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to supplement protocols
            </Link>
          )}
          <h1 className="text-3xl font-black text-slate-950">{persistedTemplateId ? "Edit Supplement Protocol" : "Create Supplement Protocol"}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Build a reusable protocol from your supplement database, then configure dosage, timing, and client-facing instructions.
          </p>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Protocol name</span>
          <input
            value={protocolName}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="e.g. Contest Prep Sleep & Recovery"
            onChange={(event) => setProtocolName(event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Protocol description</span>
          <input
            value={description}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Short internal description"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="flex max-h-[calc(100vh-18rem)] min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Supplement Database</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Search your global and organisation supplement library.</p>
          <label className="relative mt-4 block">
            <span className="sr-only">Search supplement database</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Search supplements..."
              aria-label="Search supplement database"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-2">
            {searchResults.length > 0 ? (
              searchResults.map((supplement) => (
                <div
                  key={supplement.id}
                  className="rounded-xl border border-slate-200 p-4"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/complete-coach-supplement-id", supplement.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{supplement.name}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Add ${supplement.name}`}
                      className="inline-flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
                      onClick={() => addSupplement(supplement)}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Search for supplements to add to this protocol.
              </p>
            )}
          </div>
        </aside>

        <section
          aria-label="Protocol Builder drop zone"
          className="flex max-h-[calc(100vh-18rem)] min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleSupplementDrop}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Protocol Builder</h2>
              <p className="mt-1 text-sm text-slate-500">Configure timing, dosage, and instructions for each supplement.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
              {selectedSupplements.length} supplement{selectedSupplements.length === 1 ? "" : "s"}
            </span>
          </div>

          {selectedSupplements.length > 0 ? (
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {selectedSupplements.map((supplement) => (
                <article key={supplement.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-950">{supplement.supplementName}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {supplement.clinicalNotes ? (
                        <button
                          type="button"
                          aria-label={`View clinical notes for ${supplement.supplementName}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          onClick={() => setActiveClinicalSupplementId((current) => (current === supplement.id ? null : supplement.id))}
                        >
                          <FileText className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Add link for ${supplement.supplementName}`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => setActiveLinkSupplementId((current) => (current === supplement.id ? null : supplement.id))}
                      >
                        <LinkIcon className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${supplement.supplementName}`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeSupplement(supplement.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {activeLinkSupplementId === supplement.id || supplement.productUrl ? (
                    <label className="mb-4 grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Supplement link</span>
                      <input
                        type="url"
                        aria-label={`Supplement link for ${supplement.supplementName}`}
                        value={supplement.productUrl}
                        className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="https://"
                        onChange={(event) => updateSupplement(supplement.id, { productUrl: event.target.value })}
                      />
                    </label>
                  ) : null}
                  {activeClinicalSupplementId === supplement.id ? (
                    <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-slate-700">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-indigo-700">Clinical notes</p>
                      <p className="whitespace-pre-wrap">{supplement.clinicalNotes}</p>
                    </div>
                  ) : null}
                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Timing preset</span>
                      <select
                        aria-label={`Timing preset for ${supplement.supplementName}`}
                        value={supplement.timingPreset}
                        className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        onChange={(event) => updateSupplement(supplement.id, { timingPreset: event.target.value as TimingPreset })}
                      >
                        {timingPresets.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Specific time</span>
                      <input
                        type="time"
                        aria-label={`Specific time for ${supplement.supplementName}`}
                        value={supplement.specificTime}
                        className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        onChange={(event) => updateSupplement(supplement.id, { specificTime: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Dosage</span>
                      <input
                        aria-label={`Dosage for ${supplement.supplementName}`}
                        value={supplement.dosage}
                        className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="e.g. 5g"
                        onChange={(event) => updateSupplement(supplement.id, { dosage: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-2 lg:col-span-4">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Instructions</span>
                      <textarea
                        aria-label={`Instructions for ${supplement.supplementName}`}
                        value={supplement.instructions}
                        rows={3}
                        className="min-h-24 resize-y whitespace-pre-wrap rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="How the client should take it"
                        onChange={(event) => updateSupplement(supplement.id, { instructions: event.target.value })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
              Add supplements from the database to start building this protocol.
            </p>
          )}
        </section>
      </section>

      <section
        aria-label="Supplement protocol save actions"
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end"
      >
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={saving || loadingTemplate}
          onClick={() => void saveProtocol()}
        >
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving..." : "Save Protocol"}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={saving || loadingTemplate}
          onClick={() => void saveProtocol({ closeAfterSave: true })}
        >
          Save and Close
        </button>
      </section>
    </main>
  );
}

function getTimingPreset(value?: string | null): TimingPreset {
  const normalizedValue = value?.toLowerCase() ?? "";

  if (normalizedValue.includes("afternoon")) {
    return "Afternoon";
  }

  if (normalizedValue.includes("evening") || normalizedValue.includes("night")) {
    return "Evening";
  }

  return "Morning";
}

function formatTiming(preset: TimingPreset, specificTime: string) {
  return specificTime ? `${preset} at ${specificTime}` : preset;
}

function mapTemplateToProtocolSupplements(template: SupplementTemplateJson | null): ProtocolSupplement[] {
  return (
    template?.phases?.flatMap((phase, phaseIndex) =>
      phase.supplements.map((supplement, supplementIndex) => {
        const { instructions, productUrl } = parseSupplementNotes(supplement.notes ?? "");
        const { timingPreset, specificTime } = parseTiming(supplement.timing);

        return {
          id: `protocol-supplement-${supplement.supplementId ?? `${phaseIndex}-${supplementIndex}`}`,
          supplementId: supplement.supplementId,
          supplementName: supplement.supplementName,
          category: phase.name,
          timingPreset,
          specificTime,
          dosage: supplement.dosage,
          instructions,
          productUrl,
          clinicalNotes: ""
        };
      })
    ) ?? []
  );
}

function parseTiming(timing: string): { timingPreset: TimingPreset; specificTime: string } {
  const [presetValue, timeValue] = timing.split(" at ");
  const timingPreset = getTimingPreset(presetValue);

  return {
    timingPreset,
    specificTime: timeValue ?? ""
  };
}

function parseSupplementNotes(notes: string) {
  const lines = notes.split("\n");
  const linkPrefix = "Supplement link:";
  const productUrlLine = lines.find((line) => line.trim().startsWith(linkPrefix));

  return {
    instructions: lines.filter((line) => !line.trim().startsWith(linkPrefix)).join("\n").trim(),
    productUrl: productUrlLine?.replace(linkPrefix, "").trim() ?? ""
  };
}

function formatSupplementNotes(instructions: string, productUrl: string) {
  const noteParts = [instructions.trim(), productUrl.trim() ? `Supplement link: ${productUrl.trim()}` : ""].filter(Boolean);

  return noteParts.join("\n");
}

function formatClinicalNotes(supplement: ApiSupplement) {
  const notes = [
    supplement.dosage?.trim() ? `Database dosage: ${supplement.dosage.trim()}` : "",
    supplement.clinicalDescription?.trim() ? `Clinical notes: ${supplement.clinicalDescription.trim()}` : "",
    supplement.bioavailabilityNotes?.trim() ? `Bioavailability: ${supplement.bioavailabilityNotes.trim()}` : ""
  ].filter(Boolean);

  return notes.join("\n\n");
}
