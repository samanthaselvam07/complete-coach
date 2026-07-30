"use client";

import { Check, ExternalLink, Pill, Plus, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
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
}

type LoadState = "loading" | "ready" | "error";

export function ClientSupplementsPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [protocols, setProtocols] = useState<SupplementProtocol[]>([]);
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);

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
        setProtocols(payload.data.supplementPlanAssignments.map(normalizeSupplementProtocol));
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

    return () => {
      mounted = false;
    };
  }, []);

  const activeProtocol = useMemo(
    () => protocols.find((protocol) => protocol.status === "active") ?? protocols[0] ?? null,
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
    setCompletedKeys((currentKeys) =>
      currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key]
    );
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
            <section aria-label="Supplement adherence" className="rounded-[1.65rem] bg-[#f5f3f3] p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">Daily status</p>
                  <h2 className="mt-1 text-2xl font-black tracking-normal text-[#1b1c1c]">Stack adherence</h2>
                </div>
                <p className="text-3xl font-black italic text-[#3620b8]">{adherencePercentage}%</p>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e4e2e2]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#3620b8] to-[#5f50f0]" style={{ width: `${adherencePercentage}%` }} />
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-[#777584]">
                {completedCount} of {supplements.length} supplements completed today.
              </p>
            </section>

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

            {activeProtocol.phases.map((phase) => (
              <section key={phase.name} className="space-y-4" aria-label={`${phase.name} supplements`}>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#fff0e6] text-[#f87600]">
                    <Pill aria-hidden="true" className="size-5" />
                  </div>
                  <h2 className="text-xl font-black tracking-normal text-[#1b1c1c]">{phase.name}</h2>
                </div>

                <div className="space-y-4">
                  {phase.supplements.map((supplement, index) => {
                    const key = `${phase.name}:${supplement.supplementName}:${index}`;
                    const completed = completedKeys.includes(key);
                    const { instructions, productUrl } = parseSupplementDisplayNotes(supplement.notes ?? "");

                    return (
                      <article key={key} className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#f5f3f3] text-[#3620b8]">
                              <Pill aria-hidden="true" className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-black text-[#1b1c1c]">{supplement.supplementName}</h3>
                              <p className="mt-1 text-xs font-bold text-[#777584]">
                                {supplement.dosage} • <span className="text-[#9a4600]">{supplement.timing}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSupplement(key)}
                            className={cn(
                              "inline-flex size-11 flex-none items-center justify-center rounded-full transition",
                              completed ? "bg-[#3620b8] text-white" : "bg-[#e9e8e7] text-[#777584]"
                            )}
                            aria-label={`${completed ? "Mark incomplete" : "Mark complete"} ${supplement.supplementName}`}
                          >
                            {completed ? <Check aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-5" />}
                          </button>
                        </div>
                        {instructions || productUrl ? (
                          <div className="mt-4 rounded-2xl bg-[#f5f3f3] px-4 py-3">
                            {instructions ? <p className="text-sm font-semibold leading-6 text-[#777584]">{instructions}</p> : null}
                            {productUrl ? (
                              <a
                                href={productUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#3620b8]"
                              >
                                Buy supplement
                                <ExternalLink aria-hidden="true" className="size-4" />
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        ) : (
          <ClientSupplementsStatus message="No supplement protocol has been assigned yet." />
        )}
      </div>
    </ClientMobileShell>
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
    notes: getString(supplement.notes)
  }];
}

function parseSupplementDisplayNotes(notes: string) {
  const linkPrefix = "Supplement link:";
  const lines = notes.split("\n");
  const productUrlLine = lines.find((line) => line.trim().startsWith(linkPrefix));

  return {
    instructions: lines.filter((line) => !line.trim().startsWith(linkPrefix)).join("\n").trim(),
    productUrl: productUrlLine?.replace(linkPrefix, "").trim() ?? ""
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
