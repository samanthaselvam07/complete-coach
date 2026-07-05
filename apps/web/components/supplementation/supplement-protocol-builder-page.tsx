"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SavedToast } from "@/components/ui/saved-toast";

type TimingPreset = "Morning" | "Afternoon" | "Evening";

interface ApiSupplement {
  id: string;
  name: string;
  category: string;
  recommendedTiming?: string | null;
  dosage?: string | null;
  scope?: string;
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
}

const timingPresets: TimingPreset[] = ["Morning", "Afternoon", "Evening"];

export function SupplementProtocolBuilderPage() {
  const [protocolName, setProtocolName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiSupplement[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<ProtocolSupplement[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const canSave = useMemo(
    () => protocolName.trim().length > 0 && selectedSupplements.length > 0 && selectedSupplements.every((supplement) => supplement.dosage.trim()),
    [protocolName, selectedSupplements]
  );

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
          dosage: supplement.dosage ?? "",
          instructions: ""
        }
      ];
    });
  }

  function updateSupplement(id: string, updates: Partial<ProtocolSupplement>) {
    setSelectedSupplements((current) =>
      current.map((supplement) => (supplement.id === id ? { ...supplement, ...updates } : supplement))
    );
  }

  function removeSupplement(id: string) {
    setSelectedSupplements((current) => current.filter((supplement) => supplement.id !== id));
  }

  async function saveProtocol() {
    if (!canSave) {
      setStatusMessage("Add a protocol name and at least one supplement with dosage.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/v1/supplement-plan-templates", {
        method: "POST",
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
                  notes: supplement.instructions.trim()
                }))
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error("Protocol save failed.");
      }

      setStatusMessage(`${protocolName.trim()} saved.`);
    } catch {
      setStatusMessage("Supplement protocol could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      {statusMessage ? <SavedToast message={statusMessage} /> : null}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/supplementation/plans" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to supplement protocols
          </Link>
          <h1 className="text-3xl font-black text-slate-950">Create Supplement Protocol</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Build a reusable protocol from your supplement database, then configure dosage, timing, and client-facing instructions.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={saving || !canSave}
          onClick={saveProtocol}
        >
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving..." : "Save Protocol"}
        </button>
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
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <div className="mt-4 space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((supplement) => (
                <div key={supplement.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{supplement.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{supplement.category}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
                      onClick={() => addSupplement(supplement)}
                    >
                      <Plus className="size-3" aria-hidden="true" />
                      Add {supplement.name}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <div className="space-y-4">
              {selectedSupplements.map((supplement) => (
                <article key={supplement.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-950">{supplement.supplementName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{supplement.category}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${supplement.supplementName}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeSupplement(supplement.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
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
                    <label className="grid gap-2 lg:col-span-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Instructions</span>
                      <input
                        aria-label={`Instructions for ${supplement.supplementName}`}
                        value={supplement.instructions}
                        className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="How the client should take it"
                        onChange={(event) => updateSupplement(supplement.id, { instructions: event.target.value })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
              Add supplements from the database to start building this protocol.
            </p>
          )}
        </section>
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
