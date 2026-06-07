"use client";

import Link from "next/link";
import { MessageSquare, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { leads as leadFixtures, pipelineStages, type LeadStageId } from "@/fixtures/leads";
import { cn } from "@/lib/utils";

interface LivePipelineProps {
  onAddTask: () => void;
}

interface CrmStageSummary {
  stage: LeadStageId;
  label: string;
  count: number;
}

interface CrmSummary {
  newLeadsLastFiveDays: number;
  totalLeadsAndCustomers: number;
  stageBreakdown: CrmStageSummary[];
  updatedAt: string;
}

const chartColors = ["#4f46e5", "#2563eb", "#9333ea", "#f97316", "#16a34a"];

const fallbackCrmSummary = buildFixtureCrmSummary();

export function LivePipeline({ onAddTask }: LivePipelineProps) {
  const [summary, setSummary] = useState<CrmSummary>(fallbackCrmSummary);

  useEffect(() => {
    let isActive = true;

    async function loadCrmSummary() {
      try {
        const response = await fetch("/api/v1/dashboard/crm-summary");

        if (!response.ok) {
          throw new Error("CRM summary unavailable.");
        }

        const payload = (await response.json()) as { data?: CrmSummary };

        if (isActive && isCrmSummary(payload.data)) {
          setSummary(payload.data);
        }
      } catch {
        if (isActive) {
          setSummary(fallbackCrmSummary);
        }
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
            <p className="text-4xl font-black text-indigo-700">{summary.newLeadsLastFiveDays}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Leads / customers by stage</h3>
              <p className="text-xs text-gray-500">{summary.totalLeadsAndCustomers} total</p>
            </div>
            <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Live</span>
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
              {summary.stageBreakdown.map((stage, index) => (
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
              ))}
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-400">Updates every 30 seconds while the dashboard is open.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
            onClick={onAddTask}
          >
            <TrendingUp className="mx-auto mb-2 size-5 text-orange-500" aria-hidden="true" />
            <span className="text-xs font-medium">Add Task</span>
          </button>
          <Link
            href="/messages"
            className={cn(
              "rounded-lg border border-gray-200 bg-white p-3 text-center transition-colors",
              "hover:border-indigo-300 hover:bg-indigo-50"
            )}
          >
            <MessageSquare className="mx-auto mb-2 size-5 text-indigo-600" aria-hidden="true" />
            <span className="text-xs font-medium">Messages</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildFixtureCrmSummary(): CrmSummary {
  const stageBreakdown = pipelineStages.map((stage) => ({
    stage: stage.id,
    label: stage.title,
    count: leadFixtures.filter((lead) => lead.stage === stage.id).length
  }));

  return {
    newLeadsLastFiveDays: leadFixtures.filter((lead) => lead.daysInStage <= 5).length,
    totalLeadsAndCustomers: leadFixtures.length,
    stageBreakdown,
    updatedAt: new Date(0).toISOString()
  };
}

function isCrmSummary(value: unknown): value is CrmSummary {
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
