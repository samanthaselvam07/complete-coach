"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CrmStageSummary {
  stage: string;
  label: string;
  count: number;
}

export interface CrmSummary {
  newLeadsLastFiveDays: number;
  totalLeadsAndCustomers: number;
  stageBreakdown: CrmStageSummary[];
  updatedAt: string;
}

const chartColors = ["#4f46e5", "#2563eb", "#9333ea", "#f97316", "#16a34a"];

export const emptyCrmSummary: CrmSummary = {
  newLeadsLastFiveDays: 0,
  totalLeadsAndCustomers: 0,
  stageBreakdown: [],
  updatedAt: new Date(0).toISOString()
};

interface LivePipelineProps {
  initialSummary?: CrmSummary | null;
  loading?: boolean;
}

export function LivePipeline({ initialSummary = null, loading = false }: LivePipelineProps) {
  const [summary, setSummary] = useState<CrmSummary>(() => initialSummary ?? emptyCrmSummary);

  useEffect(() => {
    let isActive = true;

    async function loadCrmSummary() {
      const nextSummary = await fetchCrmSummary();

      if (isActive) {
        setSummary(nextSummary);
      }
    }

    void loadCrmSummary();
    const intervalId = window.setInterval(loadCrmSummary, 30_000);
    window.addEventListener("focus", loadCrmSummary);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadCrmSummary);
    };
  }, []);

  const pieGradient = useMemo(() => buildPieGradient(summary.stageBreakdown), [summary.stageBreakdown]);

  return (
    <section aria-label="CRM Pipeline">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">CRM Pipeline</h2>
          <p className="text-xs text-gray-500">Role-assigned CRM visibility</p>
        </div>
        <Link
          href="/clients/crm"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Open CRM
        </Link>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">New lead intake</p>
              <p className="mt-1 text-xs text-indigo-900">new leads in the last 5 days</p>
            </div>
            <p className="text-4xl font-black text-indigo-700">{loading ? "..." : summary.newLeadsLastFiveDays}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Leads / customers by stage</h3>
              <p className="text-xs text-gray-500">{loading ? "Syncing total" : `${summary.totalLeadsAndCustomers} total`}</p>
            </div>
            <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">{loading ? "Syncing" : "Live"}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-[116px_1fr]">
            <div
              className="mx-auto flex size-28 items-center justify-center rounded-full"
              role="img"
              aria-label="CRM stage pie chart"
              style={{ background: pieGradient }}
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                CRM
              </div>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div role="status" aria-label="Preparing CRM pipeline." className="space-y-2 rounded-lg bg-gray-50 px-3 py-3">
                  <span className="sr-only">Preparing CRM pipeline.</span>
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-200" aria-hidden="true" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-gray-100" aria-hidden="true" />
                  <div className="h-3 w-3/5 animate-pulse rounded-full bg-gray-100" aria-hidden="true" />
                </div>
              ) : summary.stageBreakdown.length > 0 ? (
                summary.stageBreakdown.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        aria-hidden="true"
                      />
                      <span className="text-gray-600">{stage.label}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stage.count}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  No CRM stage data loaded from the database yet.
                </p>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-400">Updates every 30 seconds while the dashboard is open.</p>
        </div>
      </div>
    </section>
  );
}

export async function fetchCrmSummary() {
  try {
    const response = await fetch("/api/v1/dashboard/crm-summary");

    if (!response.ok) {
      throw new Error("CRM summary unavailable.");
    }

    const payload = (await response.json()) as { data?: CrmSummary };

    if (isCrmSummary(payload.data)) {
      return payload.data;
    }
  } catch {
    return emptyCrmSummary;
  }

  return emptyCrmSummary;
}

export function isCrmSummary(value: unknown): value is CrmSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "newLeadsLastFiveDays" in value &&
    typeof (value as { newLeadsLastFiveDays?: unknown }).newLeadsLastFiveDays === "number" &&
    "totalLeadsAndCustomers" in value &&
    typeof (value as { totalLeadsAndCustomers?: unknown }).totalLeadsAndCustomers === "number" &&
    "stageBreakdown" in value &&
    Array.isArray((value as { stageBreakdown?: unknown }).stageBreakdown)
  );
}

function buildPieGradient(stageBreakdown: CrmStageSummary[]) {
  const total = stageBreakdown.reduce((sum, stage) => sum + stage.count, 0);

  if (total === 0) {
    return "conic-gradient(#e5e7eb 0deg 360deg)";
  }

  let currentDegree = 0;
  const stops = stageBreakdown.map((stage, index) => {
    const nextDegree = currentDegree + (stage.count / total) * 360;
    const stop = `${chartColors[index % chartColors.length]} ${currentDegree}deg ${nextDegree}deg`;
    currentDegree = nextDegree;
    return stop;
  });

  return `conic-gradient(${stops.join(", ")})`;
}
