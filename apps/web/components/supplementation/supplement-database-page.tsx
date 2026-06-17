"use client";

import { Check, ChevronLeft, ChevronRight, Grid2X2, List, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supplementEntries, type SupplementEntry } from "@/fixtures/supplementation";
import { cn } from "@/lib/utils";

const categoryOptions = ["Morning", "Evening", "Anytime"] as const;
const timingOptions = ["Morning", "Mid-day", "Evening", "Anytime"] as const;
const supplementsPerPage = 12;

type SupplementViewMode = "cards" | "list";
type SupplementSort = "az" | "za";

interface ApiSupplement {
  id: string;
  scope?: "global" | "private";
  name: string;
  category: string;
  recommendedTiming: string | null;
  dosage: string | null;
  bioavailabilityNotes: string | null;
  clinicalDescription: string | null;
}

interface ApiSupplementCoachDetails {
  coachDosageInstructions: string;
  coachNotes: string;
  affiliateLink: string;
}

type SupplementLibraryEntry = SupplementEntry & {
  verified: boolean;
  description: string;
  bioavailabilityNotes?: string;
  clinicalDescription?: string;
  coachDosageInstructions?: string;
  affiliateLink?: string;
};

type CoachSupplementDetails = {
  dosageInstructions: string;
  notes: string;
  affiliateLink: string;
};

export function SupplementDatabasePage() {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<SupplementLibraryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SupplementSort>("az");
  const [viewMode, setViewMode] = useState<SupplementViewMode>("cards");
  const [currentPage, setCurrentPage] = useState(1);
  const [supplements, setSupplements] = useState<SupplementLibraryEntry[]>(
    supplementEntries.map(mapFixtureSupplementToEntry)
  );
  const [coachDetails, setCoachDetails] = useState<Record<string, CoachSupplementDetails>>({});
  const [coachDetailsLoadingId, setCoachDetailsLoadingId] = useState<string | null>(null);
  const [coachDetailsSavingId, setCoachDetailsSavingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [newSupplement, setNewSupplement] = useState({
    name: "",
    category: "",
    timing: "",
    dosage: ""
  });

  useEffect(() => {
    let mounted = true;

    async function loadSupplements() {
      try {
        const response = await fetch("/api/v1/supplements?limit=1000");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: ApiSupplement[] };
        const apiSupplements = Array.isArray(payload.data) ? payload.data : [];

        if (mounted && apiSupplements.length > 0) {
          setSupplements(apiSupplements.map(mapApiSupplementToEntry));
        }
      } catch {
        // Keep fixture supplements visible when the API is unavailable.
      }
    }

    void loadSupplements();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSupplements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return supplements
      .filter((supplement) => {
        if (!query) {
          return true;
        }

        return (
          supplement.name.toLowerCase().includes(query) ||
          supplement.category.toLowerCase().includes(query) ||
          supplement.description.toLowerCase().includes(query)
        );
      })
      .sort((first, second) => {
        const comparison = first.name.localeCompare(second.name);
        return sortOrder === "az" ? comparison : -comparison;
      });
  }, [searchQuery, sortOrder, supplements]);

  const totalPages = Math.max(1, Math.ceil(filteredSupplements.length / supplementsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visibleSupplements = filteredSupplements.slice(
    (safePage - 1) * supplementsPerPage,
    safePage * supplementsPerPage
  );

  async function createSupplement() {
    if (!newSupplement.name.trim()) {
      return;
    }

    setIsSaving(true);
    setStatus("Creating supplement...");

    try {
      const response = await fetch("/api/v1/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupplement.name.trim(),
          category: newSupplement.category || "Custom",
          recommendedTiming: newSupplement.timing || "As needed",
          dosage: newSupplement.dosage || "Variable",
          clinicalDescription: "Coach-created supplement library entry."
        })
      });

      if (!response.ok) {
        throw new Error("Supplement creation failed.");
      }

      const payload = (await response.json()) as { data: ApiSupplement };
      const createdSupplement = mapApiSupplementToEntry(payload.data);
      const initialCoachDetails = {
        dosageInstructions: newSupplement.dosage.trim(),
        notes: "",
        affiliateLink: ""
      };

      setSupplements((current) => [createdSupplement, ...current]);
      setCoachDetails((current) => ({
        ...current,
        [createdSupplement.id]: initialCoachDetails
      }));

      if (initialCoachDetails.dosageInstructions) {
        await saveSupplementCoachDetails(createdSupplement.id, initialCoachDetails, "Supplement created.");
      }

      setNewSupplement({ name: "", category: "", timing: "", dosage: "" });
      setShowAddPanel(false);
      setStatus("Supplement created.");
    } catch {
      setStatus("Could not create this supplement.");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadSupplementCoachDetails(supplement: SupplementLibraryEntry) {
    setCoachDetailsLoadingId(supplement.id);

    try {
      const response = await fetch(`/api/v1/supplements/${supplement.id}/coach-details`);

      if (!response.ok) {
        throw new Error("Coach supplement details unavailable.");
      }

      const payload = (await response.json()) as { data?: ApiSupplementCoachDetails };

      setCoachDetails((current) => ({
        ...current,
        [supplement.id]: isApiCoachDetails(payload.data) ? mapApiCoachDetails(payload.data) : getDefaultCoachDetails(supplement)
      }));
    } catch {
      setCoachDetails((current) => ({
        ...current,
        [supplement.id]: current[supplement.id] ?? getDefaultCoachDetails(supplement)
      }));
      setStatus("Could not load coach supplement details.");
    } finally {
      setCoachDetailsLoadingId((current) => (current === supplement.id ? null : current));
    }
  }

  async function saveSupplementCoachDetails(
    supplementId: string,
    details: CoachSupplementDetails,
    successStatus = "Coach supplement details saved."
  ) {
    setCoachDetailsSavingId(supplementId);

    try {
      const response = await fetch(`/api/v1/supplements/${supplementId}/coach-details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachDosageInstructions: details.dosageInstructions,
          coachNotes: details.notes,
          affiliateLink: details.affiliateLink
        })
      });

      if (!response.ok) {
        throw new Error("Coach supplement details save failed.");
      }

      const payload = (await response.json()) as { data?: ApiSupplementCoachDetails };
      const savedDetails = isApiCoachDetails(payload.data) ? mapApiCoachDetails(payload.data) : details;

      setCoachDetails((current) => ({ ...current, [supplementId]: savedDetails }));
      setStatus(successStatus);
    } catch {
      setStatus("Could not save coach supplement details.");
      throw new Error("Coach supplement details save failed.");
    } finally {
      setCoachDetailsSavingId((current) => (current === supplementId ? null : current));
    }
  }

  function openSupplementDetails(supplement: SupplementLibraryEntry) {
    setSelectedSupplement(supplement);
    void loadSupplementCoachDetails(supplement);
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black">Supplementation Library</h1>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
            Master Compendium
          </span>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Manage your entire protocol for performance and recovery. Curate precise methodology for
          data-optimized client results.
        </p>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
        <label className="relative">
          <span className="sr-only">Search supplements or protocols</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search supplements or protocols..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          Sort supplements
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as SupplementSort);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
          </select>
        </label>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Supplement view">
          <button
            type="button"
            aria-label="Card view"
            aria-pressed={viewMode === "cards"}
            onClick={() => setViewMode("cards")}
            className={cn(
              "rounded-lg p-2 text-slate-500 transition hover:text-indigo-700",
              viewMode === "cards" ? "bg-indigo-50 text-indigo-700" : ""
            )}
          >
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-lg p-2 text-slate-500 transition hover:text-indigo-700",
              viewMode === "list" ? "bg-indigo-50 text-indigo-700" : ""
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddPanel(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Entry
        </button>
      </section>

      <section aria-labelledby="supplements-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="supplements-heading" className="text-lg font-black">
            Supplements & Nutrients
          </h2>
          {status ? (
            <p role="status" aria-label="Supplement save status" className="text-sm font-bold text-indigo-600">
              {status}
            </p>
          ) : null}
        </div>

        {viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleSupplements.map((supplement) => (
              <SupplementCard
                key={supplement.id}
                supplement={supplement}
                onSelect={() => openSupplementDetails(supplement)}
              />
            ))}
          </div>
        ) : (
          <div role="list" aria-label="Supplement list" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {visibleSupplements.map((supplement) => (
              <SupplementListRow
                key={supplement.id}
                supplement={supplement}
                onSelect={() => openSupplementDetails(supplement)}
              />
            ))}
          </div>
        )}

        {visibleSupplements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No supplements match the current search.
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            aria-label="Previous supplement page"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <p role="status" aria-label="Supplement database page" className="text-sm font-bold text-slate-500">
            Page {safePage} of {totalPages}
          </p>
          <button
            type="button"
            aria-label="Next supplement page"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {selectedSupplement ? (
        <SupplementDetailsDialog
          supplement={selectedSupplement}
          coachDetails={coachDetails[selectedSupplement.id] ?? getDefaultCoachDetails(selectedSupplement)}
          isLoadingCoachDetails={coachDetailsLoadingId === selectedSupplement.id}
          isSavingCoachDetails={coachDetailsSavingId === selectedSupplement.id}
          onSaveCoachDetails={(details) => saveSupplementCoachDetails(selectedSupplement.id, details)}
          onClose={() => setSelectedSupplement(null)}
        />
      ) : null}

      {showAddPanel ? (
        <NewSupplementPanel
          supplement={newSupplement}
          isSaving={isSaving}
          onChange={setNewSupplement}
          onClose={() => setShowAddPanel(false)}
          onCreate={createSupplement}
        />
      ) : null}
    </main>
  );
}

function SupplementCard({
  supplement,
  onSelect
}: {
  supplement: SupplementLibraryEntry;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`View details for ${supplement.name}`}
      onClick={onSelect}
      className="min-h-44 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-black text-slate-950">{supplement.name}</h3>
        <VerifiedTick label="Verified Complete Coach supplement" verified={supplement.verified} />
      </div>
      <p className="line-clamp-4 text-sm leading-6 text-slate-600">{supplement.description}</p>
    </button>
  );
}

function SupplementListRow({
  supplement,
  onSelect
}: {
  supplement: SupplementLibraryEntry;
  onSelect: () => void;
}) {
  return (
    <div role="listitem" className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        aria-label={`View details for ${supplement.name}`}
        onClick={onSelect}
        className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
      >
        <span>
          <span className="block font-black text-slate-950">{supplement.name}</span>
          <span className="mt-1 line-clamp-2 block text-sm leading-6 text-slate-600">{supplement.description}</span>
        </span>
        <VerifiedTick label="Verified Complete Coach supplement" verified={supplement.verified} />
      </button>
    </div>
  );
}

function VerifiedTick({ label, verified }: { label: string; verified: boolean }) {
  if (!verified) {
    return null;
  }

  return (
    <span
      aria-label={label}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      title={label}
    >
      <Check className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function SupplementDetailsDialog({
  supplement,
  coachDetails,
  isLoadingCoachDetails,
  isSavingCoachDetails,
  onSaveCoachDetails,
  onClose
}: {
  supplement: SupplementLibraryEntry;
  coachDetails: CoachSupplementDetails;
  isLoadingCoachDetails: boolean;
  isSavingCoachDetails: boolean;
  onSaveCoachDetails: (details: CoachSupplementDetails) => Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDetails, setDraftDetails] = useState(coachDetails);

  async function saveDetails() {
    try {
      await onSaveCoachDetails({
        dosageInstructions: draftDetails.dosageInstructions.trim(),
        notes: draftDetails.notes.trim(),
        affiliateLink: draftDetails.affiliateLink.trim()
      });
      setEditing(false);
    } catch {
      // Status is shown by the parent component.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${supplement.name} details`}
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-950">{supplement.name}</h2>
              <VerifiedTick label="Verified Complete Coach supplement" verified={supplement.verified} />
            </div>
            <p className="text-sm leading-6 text-slate-600">{supplement.description}</p>
          </div>
          <button
            type="button"
            aria-label="Close supplement details"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-9rem)] space-y-5 overflow-y-auto p-6">
          <DetailGrid
            items={[
              ["Category", supplement.category],
              ["Timing", supplement.timing],
              ["Bioavailability", supplement.bioavailabilityNotes ?? "No bioavailability notes recorded."]
            ]}
          />
          <section>
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-500">Clinical Description</h3>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
              {supplement.clinicalDescription ?? supplement.description}
            </p>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Coach Supplement Details</h3>
              <button
                type="button"
                disabled={isLoadingCoachDetails}
                onClick={() => {
                  setDraftDetails(coachDetails);
                  setEditing(true);
                }}
                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit coach supplement details
              </button>
            </div>

            {isLoadingCoachDetails ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                Loading coach supplement details...
              </p>
            ) : editing ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-bold text-slate-700">
                  Coach dosage instructions
                  <textarea
                    value={draftDetails.dosageInstructions}
                    onChange={(event) => setDraftDetails({ ...draftDetails, dosageInstructions: event.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add your own client-specific dosage guidance."
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Coach notes
                  <textarea
                    value={draftDetails.notes}
                    onChange={(event) => setDraftDetails({ ...draftDetails, notes: event.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add your own coaching notes for client use."
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Affiliate or product link
                  <input
                    value={draftDetails.affiliateLink}
                    onChange={(event) => setDraftDetails({ ...draftDetails, affiliateLink: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://"
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingCoachDetails}
                    onClick={() => void saveDetails()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                  >
                    {isSavingCoachDetails ? "Saving..." : "Save coach details"}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid gap-3">
                <CoachDetail label="Coach dosage instructions" value={coachDetails.dosageInstructions || "No coach dosage instructions added."} />
                <CoachDetail label="Coach notes" value={coachDetails.notes || "No coach notes added."} />
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">Affiliate or product link</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900">
                    {coachDetails.affiliateLink ? (
                      <a
                        className="text-indigo-700 underline"
                        href={coachDetails.affiliateLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {coachDetails.affiliateLink}
                      </a>
                    ) : (
                      "No affiliate or product link added."
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CoachDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function NewSupplementPanel({
  supplement,
  isSaving,
  onChange,
  onClose,
  onCreate
}: {
  supplement: { name: string; category: string; timing: string; dosage: string };
  isSaving: boolean;
  onChange: (supplement: { name: string; category: string; timing: string; dosage: string }) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close new protocol backdrop"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="New Protocol"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-hidden bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div>
            <h2 className="text-2xl font-black">New Protocol</h2>
            <p className="text-sm text-indigo-100">Add supplement to library</p>
          </div>
          <button
            type="button"
            aria-label="Close new protocol panel"
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="h-[calc(100%-180px)] space-y-6 overflow-y-auto p-6">
          <label className="block text-sm font-bold text-slate-700">
            Supplement Name
            <input
              value={supplement.name}
              onChange={(event) => onChange({ ...supplement, name: event.target.value })}
              placeholder="e.g., Vitamin D3"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <div>
            <div className="mb-2 text-sm font-bold text-slate-700">Supplement Category</div>
            <div className="grid grid-cols-3 gap-3">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onChange({ ...supplement, category })}
                  className={cn(
                    "rounded-xl border-2 p-3 text-sm font-bold transition",
                    supplement.category === category
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-bold text-slate-700">Optimal Timing</div>
            <div className="grid grid-cols-2 gap-3">
              {timingOptions.map((timing) => (
                <button
                  key={timing}
                  type="button"
                  aria-label={`Timing ${timing}`}
                  onClick={() => onChange({ ...supplement, timing: `Once ${timing.toLowerCase()}` })}
                  className={cn(
                    "rounded-xl border-2 p-3 text-sm font-bold transition",
                    supplement.timing === `Once ${timing.toLowerCase()}`
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  )}
                >
                  {timing}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Coach dosage instructions
            <input
              value={supplement.dosage}
              onChange={(event) => onChange({ ...supplement, dosage: event.target.value })}
              placeholder="e.g., 5000 IU"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex gap-3 border-t border-slate-200 bg-slate-50 p-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={!supplement.name.trim()}
            onClick={onCreate}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Creating..." : "Create Protocol"}
          </button>
        </div>
      </aside>
    </>
  );
}

function mapApiSupplementToEntry(supplement: ApiSupplement): SupplementLibraryEntry {
  const clinicalDescription = supplement.clinicalDescription ?? undefined;
  const bioavailabilityNotes = supplement.bioavailabilityNotes ?? undefined;
  const description = getBriefDescription(clinicalDescription ?? bioavailabilityNotes ?? supplement.category);

  return {
    id: supplement.id,
    name: supplement.name,
    category: supplement.category,
    timing: supplement.recommendedTiming ?? "As needed",
    dosage: supplement.dosage ?? "Variable",
    coachNote: "",
    verified: supplement.scope === "global",
    description,
    bioavailabilityNotes,
    clinicalDescription,
    coachDosageInstructions: supplement.scope === "private" ? supplement.dosage ?? "" : ""
  };
}

function mapFixtureSupplementToEntry(supplement: SupplementEntry): SupplementLibraryEntry {
  return {
    ...supplement,
    verified: true,
    description: supplement.coachNote,
    bioavailabilityNotes: supplement.coachNote,
    clinicalDescription: supplement.coachNote,
    coachDosageInstructions: ""
  };
}

function getDefaultCoachDetails(supplement: SupplementLibraryEntry): CoachSupplementDetails {
  return {
    dosageInstructions: supplement.coachDosageInstructions ?? "",
    notes: supplement.coachNote,
    affiliateLink: supplement.affiliateLink ?? ""
  };
}

function mapApiCoachDetails(details: ApiSupplementCoachDetails): CoachSupplementDetails {
  return {
    dosageInstructions: details.coachDosageInstructions,
    notes: details.coachNotes,
    affiliateLink: details.affiliateLink
  };
}

function isApiCoachDetails(value: unknown): value is ApiSupplementCoachDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "coachDosageInstructions" in value &&
    "coachNotes" in value &&
    "affiliateLink" in value
  );
}

function getBriefDescription(value: string) {
  const trimmed = value.trim();
  const firstSentence = trimmed.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return firstSentence || trimmed || "Supplement details available.";
}
