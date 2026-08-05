"use client";

import { Check, Clock3, ExternalLink, Layers3, Pill, Plus, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { saveClientActivityLog } from "./client-activity-log-actions";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface ClientMeResponse {
  data?: {
    client: {
      id: string;
      name: string;
    };
    supplementPlanAssignments: SupplementPlanAssignment[];
  };
  error?: {
    message?: string;
  };
}

interface SupplementPlanAssignment {
  id: string;
  name: string;
  status: string;
  startsOn: string;
  endsOn: string | null;
  snapshot: unknown;
}

interface SupplementProtocol {
  id: string;
  name: string;
  status: string;
  phases: SupplementPhase[];
}

interface SupplementPhase {
  name: string;
  supplements: SupplementItem[];
}

interface SupplementItem {
  supplementId?: string;
  supplementName: string;
  dosage: string;
  timing: string;
  notes?: string;
  productUrl?: string;
}

type LoadState = "loading" | "ready" | "error";
type SupplementWithContext = SupplementItem & {
  phaseName: string;
  key: string;
};

export function ClientSupplementsPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [protocols, setProtocols] = useState<SupplementProtocol[]>([]);
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState<SupplementWithContext | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSupplements() {
      try {
        const response = await fetch("/api/v1/client/me");
        const payload = (await response.json().catch(() => null)) as ClientMeResponse | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "Your supplement stack could not be loaded.");
        }

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        setProtocols(payload.data.supplementPlanAssignments.map(normalizeSupplementProtocol).filter(hasSupplements));
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Your supplement stack could not be loaded.");
        setLoadState("error");
      }
    }

    void loadSupplements();

    const refreshSupplements = () => {
      if (document.visibilityState === "visible") {
        void loadSupplements();
      }
    };

    window.addEventListener("focus", refreshSupplements);
    document.addEventListener("visibilitychange", refreshSupplements);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshSupplements);
      document.removeEventListener("visibilitychange", refreshSupplements);
    };
  }, []);

  const activeProtocol = useMemo(
    () => protocols.find((protocol) => protocol.status === "active") ?? null,
    [protocols]
  );
  const supplements = activeProtocol?.phases.flatMap((phase) =>
    phase.supplements.map((supplement, index) => ({
      ...supplement,
      phaseName: phase.name,
      key: `${phase.name}:${supplement.supplementName}:${index}`
    }))
  ) ?? [];
  const completedCount = supplements.filter((supplement) => completedKeys.includes(supplement.key)).length;
  const adherencePercentage = supplements.length > 0 ? Math.round((completedCount / supplements.length) * 100) : 0;

  function toggleSupplement(key: string) {
    setCompletedKeys((currentKeys) => {
      const nextKeys = currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key];
      const nextStatus = nextKeys.length > 0 ? "completed" : "missed";

      void saveClientActivityLog({
        domain: "supplementation",
        status: nextStatus,
        notes: nextKeys.length > 0
          ? `${nextKeys.length} supplement${nextKeys.length === 1 ? "" : "s"} completed today.`
          : "No supplements completed today."
      }).catch(() => undefined);

      return nextKeys;
    });
  }

  if (loadState === "loading") {
    return (
      <ClientMobileShell title="MCP" avatarLabel="SU">
        <ClientSupplementsStatus message="Loading supplement stack" />
      </ClientMobileShell>
    );
  }

  if (loadState === "error") {
    return (
      <ClientMobileShell title="MCP" avatarLabel="SU">
        <ClientSupplementsStatus message={errorMessage} tone="error" />
      </ClientMobileShell>
    );
  }

  return (
    <ClientMobileShell title="MCP" avatarLabel={clientName || "SU"}>
      <div className="space-y-8">
        <ClientSectionHeading eyebrow="Supplementation" title="Supplement Stack">
          <p className="text-sm font-semibold leading-6 text-[#777584]">
            {activeProtocol?.name ?? "Assigned supplement protocol"} • {clientName}
          </p>
        </ClientSectionHeading>

        {activeProtocol && supplements.length > 0 ? (
          <>
            <SupplementStackSummary
              protocolName={activeProtocol.name}
              completedCount={completedCount}
              supplementCount={supplements.length}
              adherencePercentage={adherencePercentage}
              phaseCount={activeProtocol.phases.length}
            />

            <section className="rounded-[1.65rem] bg-gradient-to-br from-[#f87600] to-[#9a4600] p-6 shadow-[0_18px_45px_rgba(248,118,0,0.18)]">
              <div className="flex gap-4">
                <div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md">
                  <Zap aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Hydration tip</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white/90">
                    Take your morning stack with water and your coach's timing notes.
                  </p>
                </div>
              </div>
            </section>

            <section aria-label="Supplement stack" className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#edeaff] text-[#3620b8]">
                    <Layers3 aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#777584]">Coach assigned</p>
                    <h2 className="text-xl font-black tracking-normal text-[#1b1c1c]">Today&apos;s stack</h2>
                  </div>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#3620b8] shadow-[0_10px_24px_rgba(27,28,28,0.05)]">
                  {supplements.length} items
                </span>
              </div>

              {activeProtocol.phases.map((phase) => (
                <SupplementPhaseStack
                  key={phase.name}
                  phase={phase}
                  completedKeys={completedKeys}
                  onToggle={toggleSupplement}
                  onSelect={setSelectedSupplement}
                />
              ))}
            </section>
          </>
        ) : (
          <ClientSupplementsStatus message="No supplement protocol has been assigned yet." />
        )}

        {selectedSupplement ? (
          <SupplementDetailsDialog supplement={selectedSupplement} onClose={() => setSelectedSupplement(null)} />
        ) : null}
      </div>
    </ClientMobileShell>
  );
}

function SupplementStackSummary({
  protocolName,
  completedCount,
  supplementCount,
  adherencePercentage,
  phaseCount
}: {
  protocolName: string;
  completedCount: number;
  supplementCount: number;
  adherencePercentage: number;
  phaseCount: number;
}) {
  return (
    <section aria-label="Supplement adherence" className="overflow-hidden rounded-[1.65rem] bg-[#1b1c1c] p-6 text-white shadow-[0_22px_55px_rgba(27,28,28,0.18)]">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-[#f87600]" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Supplement stack</p>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-normal">{protocolName}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/68">
            {completedCount} of {supplementCount} supplements completed today.
          </p>
        </div>
        <div className="flex size-20 flex-none items-center justify-center rounded-[1.4rem] bg-white text-[#3620b8]">
          <span className="text-3xl font-black italic">{adherencePercentage}%</span>
        </div>
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
        <div className="h-full rounded-full bg-[#f87600]" style={{ width: `${adherencePercentage}%` }} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[1.1rem] bg-white/8 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Timing blocks</p>
          <p className="mt-1 text-xl font-black">{phaseCount}</p>
        </div>
        <div className="rounded-[1.1rem] bg-white/8 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Remaining</p>
          <p className="mt-1 text-xl font-black">{Math.max(supplementCount - completedCount, 0)}</p>
        </div>
      </div>
    </section>
  );
}

function SupplementPhaseStack({
  phase,
  completedKeys,
  onToggle,
  onSelect
}: {
  phase: SupplementPhase;
  completedKeys: string[];
  onToggle: (key: string) => void;
  onSelect: (supplement: SupplementWithContext) => void;
}) {
  const completedPhaseCount = phase.supplements.filter((supplement, index) =>
    completedKeys.includes(`${phase.name}:${supplement.supplementName}:${index}`)
  ).length;

  return (
    <section aria-label={`${phase.name} supplements`} className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-[#fff0e6] text-[#f87600]">
            <Clock3 aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black tracking-normal text-[#1b1c1c]">{phase.name}</h3>
            <p className="mt-1 text-xs font-bold text-[#777584]">
              {completedPhaseCount}/{phase.supplements.length} complete
            </p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {phase.supplements.slice(0, 3).map((supplement, index) => (
            <span
              key={`${phase.name}-${supplement.supplementName}-${index}`}
              className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#edeaff] text-[10px] font-black text-[#3620b8]"
            >
              {supplement.supplementName.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {phase.supplements.map((supplement, index) => {
          const key = `${phase.name}:${supplement.supplementName}:${index}`;
          const completed = completedKeys.includes(key);
          const supplementWithContext = { ...supplement, phaseName: phase.name, key };

          return (
            <SupplementStackCard
              key={key}
              supplement={supplementWithContext}
              completed={completed}
              onSelect={() => onSelect(supplementWithContext)}
              onToggle={() => onToggle(key)}
            />
          );
        })}
      </div>
    </section>
  );
}

function SupplementStackCard({
  supplement,
  completed,
  onSelect,
  onToggle
}: {
  supplement: SupplementWithContext;
  completed: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <article className={cn("rounded-[1.25rem] border p-4 transition", completed ? "border-[#3620b8]/20 bg-[#f7f5ff]" : "border-[#efedec] bg-[#fbf9f8]")}>
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 gap-3 text-left transition active:scale-[0.99]"
          aria-label={`View details for ${supplement.supplementName}`}
        >
          <div className={cn("flex size-12 flex-none items-center justify-center rounded-2xl", completed ? "bg-[#3620b8] text-white" : "bg-white text-[#3620b8]")}>
            <Pill aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-black leading-5 text-[#1b1c1c]">{supplement.supplementName}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#3620b8]">{supplement.dosage}</span>
              <span className="rounded-full bg-[#fff0e6] px-2.5 py-1 text-xs font-black text-[#9a4600]">{supplement.timing}</span>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "inline-flex size-11 flex-none items-center justify-center rounded-full transition active:scale-95",
            completed ? "bg-[#3620b8] text-white" : "bg-white text-[#777584] shadow-[0_10px_24px_rgba(27,28,28,0.05)]"
          )}
          aria-label={`${completed ? "Mark incomplete" : "Mark complete"} ${supplement.supplementName}`}
        >
          {completed ? <Check aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-5" />}
        </button>
      </div>
    </article>
  );
}

function SupplementDetailsDialog({ supplement, onClose }: { supplement: SupplementWithContext; onClose: () => void }) {
  const { instructions, productUrl } = parseSupplementDisplayNotes(supplement.notes ?? "", supplement.productUrl ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1c1c]/35 px-4 pb-4 pt-20 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="supplement-details-title" className="w-full max-w-xl rounded-[1.65rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#edeaff] text-[#3620b8]">
              <Pill aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#777584]">{supplement.phaseName}</p>
              <h2 id="supplement-details-title" className="mt-1 text-2xl font-black tracking-normal text-[#1b1c1c]">
                {supplement.supplementName}
              </h2>
            </div>
          </div>
          <button type="button" aria-label="Close supplement details" onClick={onClose} className="inline-flex size-10 flex-none items-center justify-center rounded-full bg-[#f5f3f3] text-[#777584] transition active:scale-95">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[1.1rem] bg-[#f5f3f3] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#777584]">Dose</p>
            <p className="mt-1 text-sm font-black text-[#1b1c1c]">{supplement.dosage}</p>
          </div>
          <div className="rounded-[1.1rem] bg-[#fff0e6] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9a4600]">Timing</p>
            <p className="mt-1 text-sm font-black text-[#1b1c1c]">{supplement.timing}</p>
          </div>
        </div>

        <section className="mt-5 rounded-[1.25rem] border border-[#efedec] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#777584]">Coach notes</p>
          <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[#1b1c1c]">
            {instructions || "No coach notes added."}
          </p>
        </section>

        {productUrl ? (
          <a
            href={productUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[#3620b8] text-sm font-black text-white shadow-[0_16px_34px_rgba(54,32,184,0.22)]"
          >
            Purchase supplement
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ClientSupplementsStatus({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[1.65rem] bg-white px-5 py-8 text-center text-sm font-black shadow-[0_18px_45px_rgba(27,28,28,0.06)]",
        tone === "error" ? "text-red-700" : "text-[#777584]"
      )}
    >
      {message}
    </div>
  );
}

function normalizeSupplementProtocol(assignment: SupplementPlanAssignment): SupplementProtocol {
  const snapshot = isRecord(assignment.snapshot) ? assignment.snapshot : {};
  const snapshotTemplate = isRecord(snapshot.template) ? snapshot.template : {};
  const phases = Array.isArray(snapshotTemplate.phases)
    ? snapshotTemplate.phases.flatMap(normalizeSupplementPhase)
    : [];

  return {
    id: assignment.id,
    name: getString(assignment.name) ?? getString(snapshot.templateName) ?? "Supplement protocol",
    status: assignment.status,
    phases
  };
}

function normalizeSupplementPhase(phase: unknown): SupplementPhase[] {
  if (!isRecord(phase)) {
    return [];
  }

  const name = getString(phase.name) ?? "Supplement phase";
  const supplements = Array.isArray(phase.supplements) ? phase.supplements.flatMap(normalizeSupplementItem) : [];

  return [{ name, supplements }];
}

function normalizeSupplementItem(supplement: unknown): SupplementItem[] {
  if (!isRecord(supplement)) {
    return [];
  }

  const supplementName = getString(supplement.supplementName) ?? getString(supplement.name);

  if (!supplementName) {
    return [];
  }

  return [{
    supplementId: getString(supplement.supplementId),
    supplementName,
    dosage: getString(supplement.dosage) ?? "Dose set by coach",
    timing: getString(supplement.timing) ?? "Timing set by coach",
    notes: getString(supplement.notes),
    productUrl: getString(supplement.productUrl) ?? getString(supplement.purchaseLink) ?? getString(supplement.affiliateLink)
  }];
}

function hasSupplements(protocol: SupplementProtocol) {
  return protocol.phases.some((phase) => phase.supplements.length > 0);
}

function parseSupplementDisplayNotes(notes: string, fallbackProductUrl = "") {
  const linkPrefix = "Supplement link:";
  const lines = notes.split("\n");
  const productUrlLine = lines.find((line) => line.trim().startsWith(linkPrefix));

  return {
    instructions: lines.filter((line) => !line.trim().startsWith(linkPrefix)).join("\n").trim(),
    productUrl: productUrlLine?.replace(linkPrefix, "").trim() ?? fallbackProductUrl
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
