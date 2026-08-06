"use client";

import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, NotebookPen, Target, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClientProfile } from "@/lib/clients/client-models";
import type { ClientNoteSummary } from "@/lib/clients/client-notes";
import { cn } from "@/lib/utils";

export function ClientProfileDashboard({
  client,
  recentNotes = []
}: {
  client: ClientProfile;
  recentNotes?: ClientNoteSummary[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <ProgressAnalyticsCard client={client} />
        <ClientCalendarPanel client={client} compact />
      </div>
      <aside className="space-y-6">
        <CheckInHistoryCard client={client} />
        <GoalsCountdownsCard client={client} recentNotes={recentNotes} />
        <ActivityLogCard client={client} />
      </aside>
    </div>
  );
}

type ProgressRange = "week" | "month" | "year" | "custom";

interface ClientMetricRecord {
  id: string;
  measuredAt: string;
  metricKey: string;
  metricValue: number;
  x?: string;
  y?: number;
  unit: string | null;
  metadata: unknown;
}

interface ProgressChartPoint extends ClientMetricRecord {
  metricKey: string;
  x: string;
  y: number;
  chartX: number;
  chartY: number;
}

interface ProgressYAxisTick {
  value: number;
  chartY: number;
  label: string;
}

interface ProgressChartSeries extends MetricDefinition {
  points: ProgressChartPoint[];
  yTicks: ProgressYAxisTick[];
}

interface MetricDefinition {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

interface ProgressRangeWindow {
  from: number;
  to: number;
  label: string;
}

const defaultMetricDefinitions: MetricDefinition[] = [
  { key: "body_weight", label: "Bodyweight", color: "#4f46e5", unit: "kg" },
  { key: "waist", label: "Waist", color: "#f97316", unit: "cm" },
  { key: "total_calories", label: "Total Calories", color: "#16a34a", unit: "kcal" },
  { key: "protein", label: "Protein", color: "#2563eb", unit: "g" },
  { key: "carbs", label: "Carbs", color: "#0891b2", unit: "g" },
  { key: "fats", label: "Fats", color: "#db2777", unit: "g" },
  { key: "steps", label: "Steps", color: "#7c3aed" }
];
const fallbackMetricColors = ["#dc2626", "#0f766e", "#9333ea", "#ca8a04", "#475569", "#be123c"];
const progressChartBounds = {
  left: 56,
  right: 620,
  top: 36,
  bottom: 220
};

type ClientCalendarEventType =
  | "strength"
  | "cardio"
  | "rest"
  | "face-to-face"
  | "video-call"
  | "phone-call"
  | "phase"
  | "milestone";

interface ClientCalendarEvent {
  id: string;
  title: string;
  type: ClientCalendarEventType;
  startDate: string;
  endDate: string;
  allDay: boolean;
  time: string;
  recurring: boolean;
  recurrenceCount: string;
  recurrenceEndsOn: string;
  recurrenceDays: string[];
  goal: string;
  notes: string;
  meetingUrl: string;
  roadmapPhaseId: string;
  scheduledTrainingProgramId: string;
  scheduledTrainingProgramName: string;
  scheduledTrainingDayName: string;
}

interface CalendarDraft {
  title: string;
  type: ClientCalendarEventType;
  startDate: string;
  endDate: string;
  allDay: boolean;
  time: string;
  recurring: boolean;
  recurrenceCount: string;
  recurrenceEndsOn: string;
  recurrenceDays: string[];
  goal: string;
  notes: string;
  meetingUrl: string;
  roadmapPhaseId: string;
  scheduledTrainingProgramId: string;
  scheduledTrainingProgramName: string;
  scheduledTrainingDayName: string;
}

interface CalendarTrainingProgram {
  id: string;
  name: string;
  status: string;
  days: CalendarTrainingDay[];
}

interface CalendarTrainingDay {
  name: string;
  exerciseCount: number;
}

interface RoadmapPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "completed";
  items?: RoadmapEvent[];
}

interface RoadmapEvent {
  id: string;
  phaseId: string;
  title: string;
  type: "event" | "milestone" | "task";
  date: string;
  notes: string;
}

interface ClientGoal {
  id: string;
  title: string;
  targetDate: string;
  notes: string;
  roadmapPhaseId: string | null;
  roadmapPhaseName: string | null;
  daysRemaining: number;
}

interface AccountActivity {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  actorName: string | null;
}

interface RoadmapPhaseDraft {
  name: string;
  startDate: string;
  endDate: string;
}

interface RoadmapEventDraft {
  phaseId: string;
  title: string;
  type: RoadmapEvent["type"];
  date: string;
  notes: string;
}

const calendarEventTypes: Array<{ value: ClientCalendarEventType; label: string; color: string; bg: string; border: string }> = [
  { value: "strength", label: "Strength", color: "bg-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { value: "cardio", label: "Cardio", color: "bg-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { value: "rest", label: "Rest", color: "bg-slate-500", bg: "bg-slate-100", border: "border-slate-200" },
  { value: "face-to-face", label: "Face-to-face", color: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  { value: "video-call", label: "Video call", color: "bg-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  { value: "phone-call", label: "Phone call", color: "bg-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { value: "phase", label: "Phase", color: "bg-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { value: "milestone", label: "Milestone", color: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200" }
];
const recurrenceDayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ProgressAnalyticsCard({ client }: { client: ClientProfile }) {
  const [metrics, setMetrics] = useState<ClientMetricRecord[]>([]);
  const [range, setRange] = useState<ProgressRange>("month");
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>(["body_weight"]);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [periodAnchor, setPeriodAnchor] = useState(() => startOfUtcDay(new Date()));

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      try {
        const response = await fetch(`/api/v1/clients/${client.id}/metrics?limit=200`);

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: ClientMetricRecord[] };

        if (active) {
          const metricRecords = Array.isArray(payload.data) ? payload.data : [];
          const latestMetricDate = getLatestMetricDate(metricRecords);

          setMetrics(metricRecords);

          if (latestMetricDate) {
            setPeriodAnchor(latestMetricDate);
          }
        }
      } catch {
        if (active) {
          setMetrics([]);
        }
      }
    }

    void loadMetrics();

    return () => {
      active = false;
    };
  }, [client.id]);

  const normalizedMetrics = useMemo(() => metrics.map(normalizeProgressMetricRecord), [metrics]);
  const metricDefinitions = useMemo(() => createMetricDefinitions(normalizedMetrics), [normalizedMetrics]);
  const rangeWindow = useMemo(
    () => createProgressRangeWindow(range, periodAnchor, customFrom, customTo),
    [customFrom, customTo, periodAnchor, range]
  );
  const filteredMetrics = useMemo(
    () => filterMetricsByRange(normalizedMetrics, rangeWindow),
    [normalizedMetrics, rangeWindow]
  );
  const visibleMetrics = filteredMetrics.filter((metric) => selectedMetricKeys.includes(metric.metricKey));

  const toggleMetric = (metricKey: string) => {
    setSelectedMetricKeys((currentKeys) =>
      currentKeys.includes(metricKey)
        ? currentKeys.filter((currentKey) => currentKey !== metricKey)
        : [...currentKeys, metricKey]
    );
  };

  const movePeriod = (direction: -1 | 1) => {
    setPeriodAnchor((currentAnchor) => addProgressRangePeriod(currentAnchor, range, direction));
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Progress Analytics</h2>
          <p className="text-sm text-slate-600">Multi-metric tracking over time</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
          {(["week", "month", "year", "custom"] as const).map((rangeOption) => (
            <button
              key={rangeOption}
              type="button"
              className={cn(
                "rounded-lg px-4 py-2 capitalize",
                range === rangeOption ? "bg-white font-bold text-slate-950 shadow-sm" : "text-slate-600"
              )}
              onClick={() => setRange(rangeOption)}
            >
              {formatRangeLabel(rangeOption)}
            </button>
          ))}
          </div>

          {range !== "custom" ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
              <button
                type="button"
                aria-label={`Previous ${range}`}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => movePeriod(-1)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <div className="min-w-40 text-center text-sm font-bold text-slate-800">{rangeWindow.label}</div>
              <button
                type="button"
                aria-label={`Next ${range}`}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => movePeriod(1)}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={metricsOpen}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
              onClick={() => setMetricsOpen((open) => !open)}
            >
              Metrics ({selectedMetricKeys.length})
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>

            {metricsOpen ? (
              <div role="menu" aria-label="Progress metrics" className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Visible metrics</p>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {metricDefinitions.map((metric) => (
                    <button
                      key={metric.key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={selectedMetricKeys.includes(metric.key)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => toggleMetric(metric.key)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: metric.color }} aria-hidden="true" />
                        <span className="truncate font-semibold text-slate-700">{metric.label}</span>
                      </span>
                      <span className="text-xs font-bold text-indigo-600">{selectedMetricKeys.includes(metric.key) ? "On" : "Off"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {range === "custom" ? (
        <div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">From</span>
            <input
              type="date"
              value={customFrom}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">To</span>
            <input
              type="date"
              value={customTo}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <ProgressChart metrics={visibleMetrics} definitions={metricDefinitions} />

      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
        {metricDefinitions
          .filter((metric) => selectedMetricKeys.includes(metric.key))
          .map((metric) => (
            <button
              key={metric.key}
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => toggleMetric(metric.key)}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: metric.color }} aria-hidden="true" />
              {metric.label}
            </button>
          ))}
      </div>
    </section>
  );
}

function ProgressChart({
  metrics,
  definitions
}: {
  metrics: ClientMetricRecord[];
  definitions: MetricDefinition[];
}) {
  const series = createProgressChartSeries(metrics, definitions)
    .filter((definition) => definition.points.length > 0);
  const xTicks = createProgressXAxisTicks(series);
  const primarySeries = series[0];

  if (series.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No persisted progress analytics are available for the selected metrics and date range.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <svg role="img" aria-label="Progress analytics chart" viewBox="0 0 640 270" className="h-72 w-full overflow-visible">
        <line x1={progressChartBounds.left} x2={progressChartBounds.left} y1={progressChartBounds.top} y2={progressChartBounds.bottom} stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1={progressChartBounds.left} x2={progressChartBounds.right} y1={progressChartBounds.bottom} y2={progressChartBounds.bottom} stroke="#cbd5e1" strokeWidth="1.5" />
        {primarySeries?.yTicks.map((tick) => (
          <g key={`${primarySeries.key}-tick-${tick.value}`}>
            <line
              x1={progressChartBounds.left}
              x2={progressChartBounds.right}
              y1={tick.chartY}
              y2={tick.chartY}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={progressChartBounds.left - 8} y={tick.chartY + 4} fill="#475569" fontSize="11" textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x-tick-${tick.value}`}>
            <line x1={tick.chartX} x2={tick.chartX} y1={progressChartBounds.top} y2={progressChartBounds.bottom} stroke="#eef2f7" strokeWidth="1" />
            <text x={tick.chartX} y={progressChartBounds.bottom + 18} fill="#475569" fontSize="11" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        {series.map((definition) => (
          <g key={definition.key}>
            <polyline
              fill="none"
              stroke={definition.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={toPolylinePoints(definition.points)}
            />
            {definition.points.map((point) => {
              const tooltipText = `${definition.label}: ${formatMetricValue(point, definition)} on ${formatMetricDate(point.x)}`;

              return (
                <g key={point.id} className="group outline-none" tabIndex={0} aria-label={tooltipText}>
                  <circle
                    cx={point.chartX}
                    cy={point.chartY}
                    r="5"
                    fill={definition.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    data-metric-key={point.metricKey}
                    data-x={point.x}
                    data-y={point.y}
                    data-chart-x={point.chartX}
                    data-chart-y={point.chartY}
                  >
                    <title>{tooltipText}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function normalizeProgressMetricRecord(metric: ClientMetricRecord): ClientMetricRecord & { x: string; y: number } {
  return {
    ...metric,
    metricKey: normalizeProgressMetricKey(metric.metricKey),
    x: metric.x ?? metric.measuredAt,
    y: typeof metric.y === "number" ? metric.y : metric.metricValue
  };
}

function getLatestMetricDate(metrics: ClientMetricRecord[]) {
  const latestMetricTime = metrics
    .map((metric) => new Date(metric.x ?? metric.measuredAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return latestMetricTime ? startOfUtcDay(new Date(latestMetricTime)) : null;
}

function createMetricDefinitions(metrics: ClientMetricRecord[]) {
  const definitions = [...defaultMetricDefinitions];
  const knownKeys = new Set(definitions.map((definition) => definition.key));

  metrics.forEach((metric) => {
    if (knownKeys.has(metric.metricKey)) {
      return;
    }

    const customIndex = definitions.length - defaultMetricDefinitions.length;
    definitions.push({
      key: metric.metricKey,
      label: getMetricLabel(metric),
      color: fallbackMetricColors[customIndex % fallbackMetricColors.length],
      unit: metric.unit ?? undefined
    });
    knownKeys.add(metric.metricKey);
  });

  return definitions;
}

function normalizeProgressMetricKey(metricKey: string) {
  const normalized = metricKey.trim().toLowerCase();

  if (["bodyweight", "body_weight", "body-weight", "body weight", "weight"].includes(normalized)) {
    return "body_weight";
  }

  return normalized.replaceAll("-", "_").replaceAll(" ", "_");
}

function filterMetricsByRange(metrics: ClientMetricRecord[], rangeWindow: ProgressRangeWindow) {
  return metrics.filter((metric) => {
    const measuredAt = new Date(metric.x ?? metric.measuredAt).getTime();

    return measuredAt >= rangeWindow.from && measuredAt <= rangeWindow.to;
  });
}

function formatRangeLabel(range: ProgressRange) {
  return range.charAt(0).toUpperCase() + range.slice(1);
}

export function createProgressRangeWindow(range: ProgressRange, anchor: Date, customFrom: string, customTo: string): ProgressRangeWindow {
  if (range === "custom") {
    const fromDate = customFrom ? new Date(`${customFrom}T00:00:00.000Z`) : new Date(0);
    const toDate = customTo ? new Date(`${customTo}T23:59:59.999Z`) : endOfUtcDay(new Date());

    return {
      from: fromDate.getTime(),
      to: toDate.getTime(),
      label: customFrom || customTo ? `${customFrom || "Start"} - ${customTo || "Today"}` : "Custom range"
    };
  }

  if (range === "year") {
    const year = anchor.getUTCFullYear();
    const fromDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const toDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    return {
      from: fromDate.getTime(),
      to: toDate.getTime(),
      label: String(year)
    };
  }

  if (range === "month") {
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth();
    const fromDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const toDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    return {
      from: fromDate.getTime(),
      to: toDate.getTime(),
      label: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(anchor)
    };
  }

  const fromDate = startOfUtcWeek(anchor);
  const toDate = endOfUtcDay(addUtcDays(fromDate, 6));

  return {
    from: fromDate.getTime(),
    to: toDate.getTime(),
    label: `${formatShortMetricDate(fromDate.toISOString())} - ${formatMetricDate(toDate.toISOString())}`
  };
}

function addProgressRangePeriod(anchor: Date, range: ProgressRange, direction: -1 | 1) {
  if (range === "year") {
    return new Date(Date.UTC(anchor.getUTCFullYear() + direction, anchor.getUTCMonth(), anchor.getUTCDate()));
  }

  if (range === "month") {
    return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + direction, 1));
  }

  if (range === "week") {
    return addUtcDays(anchor, 7 * direction);
  }

  return anchor;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function startOfUtcWeek(date: Date) {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return addUtcDays(start, mondayOffset);
}

export function createProgressChartSeries(metrics: ClientMetricRecord[], definitions: MetricDefinition[]): ProgressChartSeries[] {
  const sortedSeries = definitions.map((definition) => ({
    ...definition,
    points: metrics
      .filter((metric) => metric.metricKey === definition.key)
      .sort((a, b) => new Date(a.x ?? a.measuredAt).getTime() - new Date(b.x ?? b.measuredAt).getTime())
  }));
  const chartMetrics = sortedSeries.flatMap((definition) => definition.points);

  if (chartMetrics.length === 0) {
    return sortedSeries.map((definition) => ({ ...definition, points: [], yTicks: [] }));
  }

  const minTime = Math.min(...chartMetrics.map((metric) => new Date(metric.x ?? metric.measuredAt).getTime()));
  const maxTime = Math.max(...chartMetrics.map((metric) => new Date(metric.x ?? metric.measuredAt).getTime()));

  return sortedSeries.map((definition) => ({
    ...definition,
    yTicks: createYAxisTicks(definition.points, definition),
    points: definition.points.map((point) => {
      const [chartX, chartY] = toChartPoint(point, definition.points, minTime, maxTime);

      return {
        ...point,
        x: point.x ?? point.measuredAt,
        y: typeof point.y === "number" ? point.y : point.metricValue,
        chartX,
        chartY
      };
    })
  }));
}

function toPolylinePoints(points: ProgressChartPoint[]) {
  return points.map((point) => `${point.chartX},${point.chartY}`).join(" ");
}

function createProgressXAxisTicks(series: ProgressChartSeries[]) {
  const points = series.flatMap((definition) => definition.points);

  if (points.length === 0) {
    return [];
  }

  const minTime = Math.min(...points.map((point) => new Date(point.x).getTime()));
  const maxTime = Math.max(...points.map((point) => new Date(point.x).getTime()));

  if (minTime === maxTime) {
    return [{ value: minTime, chartX: toChartX(minTime, minTime, maxTime), label: formatMetricDate(new Date(minTime).toISOString()) }];
  }

  return Array.from({ length: 5 }, (_, index) => {
    const value = minTime + ((maxTime - minTime) / 4) * index;

    return {
      value,
      chartX: toChartX(value, minTime, maxTime),
      label: formatShortMetricDate(new Date(value).toISOString())
    };
  });
}

function createYAxisTicks(points: ClientMetricRecord[], definition: MetricDefinition): ProgressYAxisTick[] {
  if (points.length === 0) {
    return [];
  }

  const step = getMetricYAxisStep(definition.key);
  const values = points.map((metric) => metric.y ?? metric.metricValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const start = Math.floor(minValue / step) * step;
  const end = Math.max(start + step, Math.ceil(maxValue / step) * step);
  const ticks: ProgressYAxisTick[] = [];

  for (let value = start; value <= end; value += step) {
    ticks.push({
      value,
      chartY: toChartY(value, start, end),
      label: formatAxisValue(value, definition)
    });
  }

  return ticks;
}

export function getMetricYAxisStep(metricKey: string) {
  if (["body_weight", "waist"].includes(metricKey)) {
    return 10;
  }

  if (metricKey === "steps") {
    return 5000;
  }

  if (metricKey === "total_calories") {
    return 1000;
  }

  if (["protein", "carbs", "fats"].includes(metricKey)) {
    return 100;
  }

  return 10;
}

function toChartPoint(point: ClientMetricRecord, series: ClientMetricRecord[], minTime: number, maxTime: number) {
  const metricKey = point.metricKey;
  const step = getMetricYAxisStep(metricKey);
  const values = series.map((metric) => metric.y ?? metric.metricValue);
  const minValue = Math.floor(Math.min(...values) / step) * step;
  const maxValue = Math.max(minValue + step, Math.ceil(Math.max(...values) / step) * step);
  const time = new Date(point.x ?? point.measuredAt).getTime();
  const yValue = point.y ?? point.metricValue;
  const x = toChartX(time, minTime, maxTime);
  const y = toChartY(yValue, minValue, maxValue);

  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

function toChartX(time: number, minTime: number, maxTime: number) {
  const xRatio = maxTime === minTime ? 0.5 : (time - minTime) / (maxTime - minTime);

  return progressChartBounds.left + xRatio * (progressChartBounds.right - progressChartBounds.left);
}

function toChartY(value: number, minValue: number, maxValue: number) {
  const yRatio = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);

  return progressChartBounds.bottom - yRatio * (progressChartBounds.bottom - progressChartBounds.top);
}

function getMetricLabel(metric: ClientMetricRecord) {
  const metadata = metric.metadata;

  if (metadata && typeof metadata === "object" && "label" in metadata && typeof metadata.label === "string") {
    return metadata.label;
  }

  return metric.metricKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetricValue(metric: ClientMetricRecord, definition: MetricDefinition) {
  const metricValue = metric.y ?? metric.metricValue;
  const value = Number.isInteger(metricValue) ? String(metricValue) : metricValue.toFixed(1);
  const unit = metric.unit ?? definition.unit;

  return unit ? `${value}${unit}` : value;
}

function formatAxisValue(value: number, definition: MetricDefinition) {
  const unit = definition.unit;
  const formattedValue = Number.isInteger(value) ? String(value) : value.toFixed(1);

  return unit ? `${formattedValue}${unit}` : formattedValue;
}

function formatMetricDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatShortMetricDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

export function ClientCalendarPanel({ client, compact = false }: { client: ClientProfile; compact?: boolean }) {
  const clientTimezone = client.timezone || "UTC";
  const trainingPrograms = useMemo(() => getCalendarTrainingPrograms(client), [client]);
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [windowStart, setWindowStart] = useState(createDateFromDateValue(getTodayDateValue(clientTimezone)));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarDraft>(() =>
    applyDefaultStrengthWorkout(createCalendarDraft(getTodayDateValue(clientTimezone), getTodayDateValue(clientTimezone), client.protocol), trainingPrograms)
  );
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [roadmapPhases, setRoadmapPhases] = useState<RoadmapPhase[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const visibleDays = useMemo(
    () => Array.from({ length: compact ? 14 : 42 }, (_, index) => addDays(windowStart, index)),
    [compact, windowStart]
  );
  const goalOptions = [client.protocol, client.packageName].filter((goal, index, goals) => goal && goal !== "Unassigned" && goals.indexOf(goal) === index);
  const title = compact ? "Calendar" : `${client.name} Calendar`;
  const calendarRangeLabel = formatCalendarRange(visibleDays[0], visibleDays[visibleDays.length - 1]);

  useEffect(() => {
    let active = true;

    async function loadCalendarContext() {
      try {
        const [roadmapResponse, eventsResponse] = await Promise.all([
          fetch(`/api/v1/clients/${client.id}/roadmap`),
          fetch(`/api/v1/clients/${client.id}/calendar-events`)
        ]);

        const roadmapPayload = roadmapResponse.ok ? ((await roadmapResponse.json()) as { data?: RoadmapPhase[] }) : {};
        const eventsPayload = eventsResponse.ok ? ((await eventsResponse.json()) as { data?: ClientCalendarEvent[] }) : {};

        if (active) {
          setRoadmapPhases(Array.isArray(roadmapPayload.data) ? roadmapPayload.data : []);
          setEvents(Array.isArray(eventsPayload.data) ? eventsPayload.data : []);

          if (!eventsResponse.ok) {
            setCalendarError("Calendar events could not be loaded.");
          }
        }
      } catch {
        if (active) {
          setCalendarError("Calendar events could not be loaded.");
        }
      }
    }

    void loadCalendarContext();

    return () => {
      active = false;
    };
  }, [client.id, clientTimezone]);

  const openDraft = (startDate = getTodayDateValue(clientTimezone), endDate = startDate) => {
    setEditingEventId(null);
    setDraft(applyDefaultStrengthWorkout(createCalendarDraft(startDate, endDate, goalOptions[0] ?? ""), trainingPrograms));
    setDialogOpen(true);
  };

  const openEventDetails = (event: ClientCalendarEvent) => {
    setEditingEventId(event.id);
    setDraft(calendarEventToDraft(event));
    setDialogOpen(true);
  };

  const startRangeSelection = (dateValue: string) => {
    setSelectionStart(dateValue);
    setSelectionEnd(dateValue);
  };

  const finishRangeSelection = (dateValue: string) => {
    if (!selectionStart) {
      return;
    }

    const [startDate, endDate] = sortDateRange(selectionStart, dateValue);
    setSelectionStart(null);
    setSelectionEnd(null);
    openDraft(startDate, endDate);
  };

  const saveEvent = async () => {
    setSavingEvent(true);
    setCalendarError(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/calendar-events${editingEventId ? `?eventId=${encodeURIComponent(editingEventId)}` : ""}`, {
        method: editingEventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          endDate: draft.endDate || draft.startDate
        })
      });
      const payload = (await response.json().catch(() => null)) as { data?: ClientCalendarEvent } | null;

      if (!response.ok || !payload?.data) {
        throw new Error("Calendar event could not be saved.");
      }

      setEvents((currentEvents) => {
        if (editingEventId) {
          return currentEvents.map((event) => (event.id === editingEventId ? payload.data as ClientCalendarEvent : event));
        }

        return [...currentEvents, payload.data as ClientCalendarEvent];
      });
      setEditingEventId(null);
      setDialogOpen(false);
    } catch {
      setCalendarError("Calendar event could not be saved. Please try again.");
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEventId) {
      return;
    }

    const confirmed = window.confirm(`Delete ${draft.title || "this event"}? This calendar event will be removed from the client schedule.`);

    if (!confirmed) {
      return;
    }

    setSavingEvent(true);
    setCalendarError(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/calendar-events?eventId=${encodeURIComponent(editingEventId)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Calendar event could not be deleted.");
      }

      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== editingEventId));
      setEditingEventId(null);
      setDialogOpen(false);
    } catch {
      setCalendarError("Calendar event could not be deleted. Please try again.");
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="text-sm text-slate-600">
            {compact ? "14-day client schedule" : "Full client schedule and recurring events"}
            <span className="text-slate-300" aria-hidden="true"> | </span>
            <span className="font-semibold text-slate-700">{calendarRangeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            aria-label="Previous calendar period"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
            onClick={() => setWindowStart((date) => addDays(date, compact ? -14 : -42))}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-700" onClick={() => setWindowStart(createDateFromDateValue(getTodayDateValue(clientTimezone)))}>
            Today
          </button>
          <button
            type="button"
            aria-label="Next calendar period"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
            onClick={() => setWindowStart((date) => addDays(date, compact ? 14 : 42))}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white" onClick={() => openDraft()}>
            + Add Event
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2" role="grid" aria-label={compact ? "14 day client calendar" : "Full client calendar"}>
        {visibleDays.map((date) => {
          const dateValue = toDateValue(date);
          const dayEvents = events.filter((event) => isDateWithinRange(dateValue, event.startDate, event.endDate));
          const [selectedRangeStart, selectedRangeEnd] = selectionStart && selectionEnd ? sortDateRange(selectionStart, selectionEnd) : ["", ""];
          const isInSelectedRange = Boolean(selectionStart && selectionEnd && isDateWithinRange(dateValue, selectedRangeStart, selectedRangeEnd));

          return (
            <div
              key={dateValue}
              role="gridcell"
              aria-label={`Create event on ${formatCalendarDay(date)}`}
              className={cn(
                "flex min-h-24 flex-col rounded-lg border p-2 text-left text-sm transition hover:border-indigo-300",
                dateValue === getTodayDateValue(clientTimezone) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50",
                isInSelectedRange ? "ring-2 ring-indigo-300" : null
              )}
              onMouseDown={() => startRangeSelection(dateValue)}
              onMouseEnter={(event) => {
                if (event.buttons === 1 && selectionStart) {
                  setSelectionEnd(dateValue);
                }
              }}
              onMouseUp={() => finishRangeSelection(dateValue)}
              onClick={() => {
                if (!selectionStart) {
                  openDraft(dateValue, dateValue);
                }
              }}
            >
              <span className="font-black text-slate-900">{date.getDate()}</span>
              <span className="text-xs text-slate-500">{date.toLocaleDateString("en", { month: "short" })}</span>
              <span className="mt-2 space-y-1">
                {dayEvents.slice(0, compact ? 2 : 4).map((event) => {
                  const type = getCalendarEventType(event.type);

                  return (
                    <button
                      key={event.id}
                      type="button"
                      aria-label={`Open event ${event.title}`}
                      className={cn("block w-full truncate rounded-md border px-2 py-1 text-left text-xs font-bold text-slate-800", type.bg, type.border)}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        openEventDetails(event);
                      }}
                      onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                      onMouseUp={(mouseEvent) => mouseEvent.stopPropagation()}
                    >
                      <span className={cn("mr-1 inline-block size-2 rounded-full", type.color)} aria-hidden="true" />
                      {event.title}
                    </button>
                  );
                })}
                {dayEvents.length > (compact ? 2 : 4) ? <span className="block text-xs font-bold text-slate-500">+{dayEvents.length - (compact ? 2 : 4)} more</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
        {calendarEventTypes.map((item) => (
          <span key={item.value} className="inline-flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", item.color)} />
            {item.label}
          </span>
        ))}
      </div>
      {calendarError ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{calendarError}</p> : null}

      {dialogOpen ? (
        <CalendarEventDialog
          draft={draft}
          goalOptions={goalOptions}
          roadmapPhases={roadmapPhases}
          trainingPrograms={trainingPrograms}
          editing={Boolean(editingEventId)}
          onChange={(nextDraft) => setDraft(nextDraft)}
          onClose={() => {
            setEditingEventId(null);
            setDialogOpen(false);
          }}
          onDelete={() => void deleteEvent()}
          onSave={() => void saveEvent()}
          saving={savingEvent}
        />
      ) : null}
    </section>
  );
}

export function ClientRoadmapPeriodisationPanel({ client }: { client: ClientProfile }) {
  const clientTimezone = client.timezone || "UTC";
  const currentYear = Number(getTodayDateValue(clientTimezone).slice(0, 4));
  const [roadmapYear, setRoadmapYear] = useState(currentYear);
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [events, setEvents] = useState<RoadmapEvent[]>([]);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [phaseDraft, setPhaseDraft] = useState<RoadmapPhaseDraft>(() => createRoadmapPhaseDraft(clientTimezone));
  const [eventDraft, setEventDraft] = useState<RoadmapEventDraft>(() => createRoadmapEventDraft("", clientTimezone));
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<string[]>([]);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const months = useMemo(() => Array.from({ length: 12 }, (_, monthIndex) => new Date(roadmapYear, monthIndex, 1)), [roadmapYear]);
  const visiblePhases = phases.filter((phase) => isRoadmapPhaseInYear(phase, roadmapYear));
  const visiblePhaseIds = new Set(visiblePhases.map((phase) => phase.id));
  const visibleEvents = events.filter((event) => visiblePhaseIds.has(event.phaseId) && isRoadmapDateInYear(event.date, roadmapYear));

  const activePhase =
    visiblePhases.find((phase) => getRoadmapPhaseStatusForTimezone(phase, clientTimezone) === "active") ??
    phases.find((phase) => getRoadmapPhaseStatusForTimezone(phase, clientTimezone) === "active");

  useEffect(() => {
    let active = true;

    async function loadRoadmap() {
      try {
        const response = await fetch(`/api/v1/clients/${client.id}/roadmap`);

        if (!response.ok) {
          throw new Error("Roadmap could not be loaded.");
        }

        const payload = (await response.json()) as { data?: RoadmapPhase[] };
        const persistedPhases = Array.isArray(payload.data) ? payload.data : [];

        if (active) {
          setPhases(persistedPhases);
          setEvents(persistedPhases.flatMap((phase) => phase.items ?? []));
          setExpandedPhaseIds(persistedPhases.filter((phase) => getRoadmapPhaseStatusForTimezone(phase, clientTimezone) === "active").map((phase) => phase.id));
        }
      } catch {
        if (active) {
          setRoadmapError("Roadmap could not be loaded. Please try again.");
        }
      }
    }

    void loadRoadmap();

    return () => {
      active = false;
    };
  }, [client.id, clientTimezone]);

  const openEventDialog = (phaseId = activePhase?.id ?? phases[0]?.id ?? "") => {
    setEventDraft(createRoadmapEventDraft(phaseId, clientTimezone));
    setEventDialogOpen(true);
  };

  const togglePhaseExpanded = (phaseId: string) => {
    setExpandedPhaseIds((currentIds) =>
      currentIds.includes(phaseId)
        ? currentIds.filter((currentId) => currentId !== phaseId)
        : [...currentIds, phaseId]
    );
  };

  const savePhase = async () => {
    if (!phaseDraft.name.trim() || !phaseDraft.startDate || !phaseDraft.endDate) {
      return;
    }

    try {
      setRoadmapError(null);

      const response = await fetch(`/api/v1/clients/${client.id}/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "phase", ...phaseDraft })
      });

      if (!response.ok) {
        throw new Error("Roadmap phase could not be saved.");
      }

      const payload = (await response.json()) as { data?: RoadmapPhase };

      if (payload.data) {
        const savedPhase = payload.data as RoadmapPhase;

        setPhases((currentPhases) => [...currentPhases, savedPhase]);
        setExpandedPhaseIds((currentIds) => [...new Set([...currentIds, savedPhase.id])]);
      }

      setPhaseDraft(createRoadmapPhaseDraft(clientTimezone));
      setPhaseDialogOpen(false);
    } catch {
      setRoadmapError("Roadmap phase could not be saved. Please try again.");
    }
  };

  const saveEvent = async () => {
    if (!eventDraft.title.trim() || !eventDraft.phaseId || !eventDraft.date) {
      return;
    }

    try {
      setRoadmapError(null);

      const response = await fetch(`/api/v1/clients/${client.id}/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "item", ...eventDraft })
      });

      if (!response.ok) {
        throw new Error("Roadmap item could not be saved.");
      }

      const payload = (await response.json()) as { data?: RoadmapEvent };

      if (payload.data) {
        const savedEvent = payload.data as RoadmapEvent;

        setEvents((currentEvents) => [...currentEvents, savedEvent]);
        setExpandedPhaseIds((currentIds) => [...new Set([...currentIds, savedEvent.phaseId])]);
      }

      setEventDialogOpen(false);
    } catch {
      setRoadmapError("Roadmap item could not be saved. Please try again.");
    }
  };

  const deletePhase = async (phase: RoadmapPhase) => {
    const confirmed = window.confirm(`Delete ${phase.name}? Events, milestones, and tasks attached to this phase will also be deleted.`);

    if (!confirmed) {
      return;
    }

    try {
      setRoadmapError(null);

      const response = await fetch(`/api/v1/clients/${client.id}/roadmap?phaseId=${encodeURIComponent(phase.id)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Roadmap phase could not be deleted.");
      }

      setPhases((currentPhases) => currentPhases.filter((currentPhase) => currentPhase.id !== phase.id));
      setEvents((currentEvents) => currentEvents.filter((event) => event.phaseId !== phase.id));
      setExpandedPhaseIds((currentIds) => currentIds.filter((phaseId) => phaseId !== phase.id));
    } catch {
      setRoadmapError("Roadmap phase could not be deleted. Please try again.");
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Roadmap Periodisation</h2>
          <p className="text-sm text-slate-600">Annual phase plan for {client.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous roadmap year"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => setRoadmapYear((year) => year - 1)}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="min-w-24 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-black text-slate-900">{roadmapYear}</span>
          <button
            type="button"
            aria-label="Next roadmap year"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => setRoadmapYear((year) => year + 1)}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => setPhaseDialogOpen(true)}>
            New Phase
          </button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white" onClick={() => openEventDialog()} aria-label="Add roadmap event">
            Add Event
          </button>
        </div>
      </div>

      {roadmapError ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{roadmapError}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(220px,0.65fr)_1.8fr]">
        <div className="space-y-2">
          {visiblePhases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              No phases scheduled for {roadmapYear}.
            </div>
          ) : null}
          {visiblePhases.map((phase) => {
            const phaseEvents = visibleEvents.filter((event) => event.phaseId === phase.id);
            const phaseStatus = getRoadmapPhaseStatusForTimezone(phase, clientTimezone);
            const isActive = phaseStatus === "active";
            const isCompleted = phaseStatus === "completed";
            const isExpanded = expandedPhaseIds.includes(phase.id);

            return (
              <article
                key={phase.id}
                data-testid={isActive ? "roadmap-phase-active" : isCompleted ? "roadmap-phase-completed" : "roadmap-phase-planned"}
                className={cn(
                  "rounded-xl border p-3 shadow-sm",
                  isActive ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-slate-50"
                )}
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => togglePhaseExpanded(phase.id)}
                >
                  <span>
                    <h3 className={cn("font-black", isActive ? "text-purple-950" : "text-slate-900")}>{phase.name}</h3>
                    <p className="text-xs font-semibold text-slate-500">{formatRoadmapDateRange(phase.startDate, phase.endDate, clientTimezone)}</p>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isActive || isCompleted ? (
                      <span className={cn("rounded-full px-2 py-1 text-[11px] font-black uppercase", isActive ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600")}>
                        {isActive ? "Active Phase" : "Completed"}
                      </span>
                    ) : null}
                    <ChevronDown className={cn("size-4 text-slate-500 transition-transform", isExpanded ? "rotate-180" : null)} aria-hidden="true" />
                  </span>
                </button>
                {isExpanded ? (
                  <div className="mt-3 space-y-2">
                    {phaseEvents.length > 0 ? (
                      phaseEvents.map((event) => (
                        <div key={event.id} className="rounded-lg border border-white/80 bg-white p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">{event.title}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{formatRoadmapEventType(event.type)}</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatRoadmapDate(event.date, clientTimezone)}</p>
                          {event.notes ? <p className="mt-2 text-sm leading-5 text-slate-600">{event.notes}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">No events, milestones, or tasks attached yet.</p>
                    )}
                  </div>
                ) : null}
                <button type="button" className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700" onClick={() => openEventDialog(phase.id)}>
                  Add to phase
                </button>
                <button
                  type="button"
                  className="ml-4 mt-2 inline-flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700"
                  onClick={() => void deletePhase(phase)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete phase
                </button>
              </article>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {months.map((month) => (
            <RoadmapMonth key={month.toISOString()} month={month} phases={visiblePhases} timezone={clientTimezone} />
          ))}
        </div>
      </div>

      {phaseDialogOpen ? (
        <RoadmapPhaseDialog
          draft={phaseDraft}
          onChange={setPhaseDraft}
          onClose={() => setPhaseDialogOpen(false)}
          onSave={() => void savePhase()}
        />
      ) : null}

      {eventDialogOpen ? (
        <RoadmapEventDialog
          draft={eventDraft}
          phases={phases}
          onChange={setEventDraft}
          onClose={() => setEventDialogOpen(false)}
          onSave={() => void saveEvent()}
        />
      ) : null}
    </section>
  );
}

function RoadmapMonth({
  month,
  phases,
  timezone
}: {
  month: Date;
  phases: RoadmapPhase[];
  timezone: string;
}) {
  const todayValue = useTodayDateValue(timezone);
  const monthDays = Array.from({ length: daysInMonth(month) }, (_, dayIndex) => new Date(month.getFullYear(), month.getMonth(), dayIndex + 1));
  const monthName = month.toLocaleDateString("en", { month: "long" });

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="mb-2 text-sm font-black text-slate-900">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div role="grid" aria-label={`${monthName} roadmap month`} className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: getMondayFirstOffset(month) }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {monthDays.map((day) => {
          const dateValue = toDateValue(day);
          const phase = phases.find((phaseItem) => isDateWithinRange(dateValue, phaseItem.startDate, phaseItem.endDate));
          const isActive = phase ? getRoadmapPhaseStatusForTimezone(phase, timezone) === "active" : false;
          const isToday = dateValue === todayValue;

          return (
            <span
              key={dateValue}
              role="gridcell"
              aria-label={`${formatCalendarDay(day)}${phase ? ` ${phase.name}` : ""}`}
              className={cn(
                "min-h-6 rounded px-1 py-1 text-center text-[11px] font-semibold",
                phase ? (isActive ? "bg-purple-100 text-purple-900" : "bg-slate-200 text-slate-600") : "text-slate-500",
                isToday ? "ring-2 ring-purple-800 ring-offset-1 ring-offset-slate-50 shadow-sm" : null
              )}
            >
              {day.getDate()}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function useTodayDateValue(timezone: string) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [timezone]);

  return getDateValueInTimeZone(currentTime, timezone);
}

function RoadmapPhaseDialog({
  draft,
  onChange,
  onClose,
  onSave
}: {
  draft: RoadmapPhaseDraft;
  onChange: (draft: RoadmapPhaseDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="roadmap-phase-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="roadmap-phase-title" className="text-2xl font-black text-slate-950">New Phase</h2>
        <div className="mt-5 grid gap-4">
          <CalendarInput label="Phase name" value={draft.name} onChange={(value) => onChange({ ...draft, name: value })} />
          <CalendarInput label="Phase start date" type="date" value={draft.startDate} onChange={(value) => onChange({ ...draft, startDate: value })} />
          <CalendarInput label="Phase end date" type="date" value={draft.endDate} onChange={(value) => onChange({ ...draft, endDate: value })} />
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            Phase status is set automatically from the start and end dates.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300" disabled={!draft.name.trim() || !draft.startDate || !draft.endDate} onClick={onSave}>Save phase</button>
        </div>
      </div>
    </div>
  );
}

function RoadmapEventDialog({
  draft,
  phases,
  onChange,
  onClose,
  onSave
}: {
  draft: RoadmapEventDraft;
  phases: RoadmapPhase[];
  onChange: (draft: RoadmapEventDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="roadmap-event-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="roadmap-event-title" className="text-2xl font-black text-slate-950">Roadmap Event</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <CalendarInput label="Roadmap event title" value={draft.title} onChange={(value) => onChange({ ...draft, title: value })} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Roadmap event type</span>
            <select aria-label="Roadmap event type" value={draft.type} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => onChange({ ...draft, type: event.target.value as RoadmapEvent["type"] })}>
              <option value="event">Event</option>
              <option value="milestone">Milestone</option>
              <option value="task">Task</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Linked phase</span>
            <select aria-label="Linked phase" value={draft.phaseId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => onChange({ ...draft, phaseId: event.target.value })}>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>
          </label>
          <CalendarInput label="Roadmap event date" type="date" value={draft.date} onChange={(value) => onChange({ ...draft, date: value })} />
          <CalendarTextarea label="Roadmap event notes" value={draft.notes} onChange={(value) => onChange({ ...draft, notes: value })} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300" disabled={!draft.title.trim() || !draft.phaseId || !draft.date} onClick={onSave}>Save roadmap event</button>
        </div>
      </div>
    </div>
  );
}

function CalendarEventDialog({
  draft,
  goalOptions,
  roadmapPhases,
  trainingPrograms,
  editing,
  onChange,
  onClose,
  onDelete,
  onSave,
  saving
}: {
  draft: CalendarDraft;
  goalOptions: string[];
  roadmapPhases: RoadmapPhase[];
  trainingPrograms: CalendarTrainingProgram[];
  editing: boolean;
  onChange: (draft: CalendarDraft) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const selectedTrainingProgram = trainingPrograms.find((program) => program.id === draft.scheduledTrainingProgramId) ?? trainingPrograms[0] ?? null;
  const selectedTrainingDay = selectedTrainingProgram?.days.find((day) => day.name === draft.scheduledTrainingDayName) ?? selectedTrainingProgram?.days[0] ?? null;

  const updateDraft = <TKey extends keyof CalendarDraft>(key: TKey, value: CalendarDraft[TKey]) => {
    onChange({ ...draft, [key]: value });
  };

  const updateEventType = (type: ClientCalendarEventType) => {
    if (type !== "strength") {
      onChange({
        ...draft,
        type,
        scheduledTrainingProgramId: "",
        scheduledTrainingProgramName: "",
        scheduledTrainingDayName: ""
      });
      return;
    }

    const program = selectedTrainingProgram ?? trainingPrograms[0] ?? null;
    const day = program?.days[0] ?? null;

    onChange({
      ...draft,
      type,
      scheduledTrainingProgramId: program?.id ?? "",
      scheduledTrainingProgramName: program?.name ?? "",
      scheduledTrainingDayName: day?.name ?? "",
      title: draft.title.trim() || (day ? `Strength: ${day.name}` : "Strength session")
    });
  };

  const updateTrainingProgram = (programId: string) => {
    const program = trainingPrograms.find((item) => item.id === programId) ?? null;
    const day = program?.days[0] ?? null;

    onChange({
      ...draft,
      scheduledTrainingProgramId: program?.id ?? "",
      scheduledTrainingProgramName: program?.name ?? "",
      scheduledTrainingDayName: day?.name ?? "",
      title: day ? getNextStrengthTitle(draft.title, day.name) : draft.title
    });
  };

  const updateTrainingDay = (dayName: string) => {
    onChange({
      ...draft,
      scheduledTrainingProgramId: selectedTrainingProgram?.id ?? "",
      scheduledTrainingProgramName: selectedTrainingProgram?.name ?? "",
      scheduledTrainingDayName: dayName,
      title: getNextStrengthTitle(draft.title, dayName)
    });
  };

  const toggleRecurrenceDay = (day: string) => {
    updateDraft(
      "recurrenceDays",
      draft.recurrenceDays.includes(day)
        ? draft.recurrenceDays.filter((currentDay) => currentDay !== day)
        : [...draft.recurrenceDays, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="calendar-event-title" className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="calendar-event-title" className="text-2xl font-black text-slate-950">{editing ? "Event Details" : "Create Event"}</h2>
            <p className="mt-1 text-sm text-slate-600">{editing ? "Review or update this client schedule item." : "Add a client schedule item, goal milestone, or recurring event."}</p>
          </div>
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CalendarInput label="Event title" value={draft.title} onChange={(value) => updateDraft("title", value)} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Event type</span>
            <select aria-label="Event type" value={draft.type} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateEventType(event.target.value as ClientCalendarEventType)}>
              {calendarEventTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          {draft.type === "strength" ? (
            <div className="grid gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 md:col-span-2 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Training program</span>
                <select
                  aria-label="Training program"
                  value={draft.scheduledTrainingProgramId}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  onChange={(event) => updateTrainingProgram(event.target.value)}
                >
                  <option value="">No assigned program selected</option>
                  {trainingPrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}{program.status ? ` - ${program.status}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Workout day</span>
                <select
                  aria-label="Workout day"
                  value={draft.scheduledTrainingDayName}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={!selectedTrainingProgram}
                  onChange={(event) => updateTrainingDay(event.target.value)}
                >
                  <option value="">Select workout day</option>
                  {selectedTrainingProgram?.days.map((day) => (
                    <option key={day.name} value={day.name}>
                      {day.name} ({day.exerciseCount} exercises)
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs font-semibold text-slate-600 md:col-span-2">
                {selectedTrainingProgram && selectedTrainingDay
                  ? `${selectedTrainingProgram.name} / ${selectedTrainingDay.name} will be scheduled for this client.`
                  : "Choose an assigned training program and workout day to schedule a strength session."}
              </p>
            </div>
          ) : null}
          <CalendarInput label="Start date" type="date" value={draft.startDate} onChange={(value) => updateDraft("startDate", value)} />
          <CalendarInput label="End date" type="date" value={draft.endDate} onChange={(value) => updateDraft("endDate", value)} />
          {draft.type === "video-call" ? (
            <div className="md:col-span-2">
              <CalendarInput label="Meeting URL" type="url" value={draft.meetingUrl} onChange={(value) => updateDraft("meetingUrl", value)} />
              <p className="mt-1 text-xs text-slate-500">This link is visible to the client for video call events.</p>
            </div>
          ) : null}
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={draft.allDay} className="size-4" onChange={(event) => updateDraft("allDay", event.target.checked)} />
            All day event
          </label>
          {!draft.allDay ? <CalendarInput label="Event time" type="time" value={draft.time} onChange={(value) => updateDraft("time", value)} /> : null}
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={draft.recurring} className="size-4" onChange={(event) => updateDraft("recurring", event.target.checked)} />
            Recurring event
          </label>
          {draft.recurring ? (
            <>
              <CalendarInput label="Number of recurrences" type="number" value={draft.recurrenceCount} onChange={(value) => updateDraft("recurrenceCount", value)} />
              <CalendarInput label="Recurring finishes on" type="date" value={draft.recurrenceEndsOn} onChange={(value) => updateDraft("recurrenceEndsOn", value)} />
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-700">Days per week</p>
                <div className="flex flex-wrap gap-2">
                  {recurrenceDayOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={draft.recurrenceDays.includes(day)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-semibold",
                        draft.recurrenceDays.includes(day) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700"
                      )}
                      onClick={() => toggleRecurrenceDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Associated goal</span>
            <select aria-label="Associated goal" value={draft.goal} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateDraft("goal", event.target.value)}>
              <option value="">No goal linked</option>
              {goalOptions.map((goal) => (
                <option key={goal} value={goal}>{goal}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Linked goals appear in the Goals & Countdowns section of the client profile.</p>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Roadmap phase</span>
            <select aria-label="Roadmap phase" value={draft.roadmapPhaseId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateDraft("roadmapPhaseId", event.target.value)}>
              <option value="">No roadmap phase linked</option>
              {roadmapPhases.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Use this to connect calendar work back to the annual roadmap phase.</p>
          </label>
          <CalendarTextarea label="Event notes" value={draft.notes} onChange={(value) => updateDraft("notes", value)} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {editing ? (
            <button type="button" className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60" disabled={saving} onClick={onDelete}>
              Delete event
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>Cancel</button>
            <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300" disabled={saving || !draft.title.trim() || !draft.startDate} onClick={onSave}>
              {saving ? "Saving..." : editing ? "Update event" : "Save event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = `calendar-field-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CalendarTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `calendar-field-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <label htmlFor={id} className="block md:col-span-2">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        id={id}
        value={value}
        rows={4}
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function createRoadmapPhaseDraft(timezone = "UTC"): RoadmapPhaseDraft {
  const today = getTodayDateValue(timezone);

  return {
    name: "",
    startDate: today,
    endDate: today
  };
}

function createRoadmapEventDraft(phaseId: string, timezone = "UTC"): RoadmapEventDraft {
  return {
    phaseId,
    title: "",
    type: "event",
    date: getTodayDateValue(timezone),
    notes: ""
  };
}

function createCalendarDraft(startDate: string, endDate: string, goal: string): CalendarDraft {
  return {
    title: "",
    type: "strength",
    startDate,
    endDate,
    allDay: true,
    time: "",
    recurring: false,
    recurrenceCount: "",
    recurrenceEndsOn: "",
    recurrenceDays: [],
    goal,
    notes: "",
    meetingUrl: "",
    roadmapPhaseId: "",
    scheduledTrainingProgramId: "",
    scheduledTrainingProgramName: "",
    scheduledTrainingDayName: ""
  };
}

function calendarEventToDraft(event: ClientCalendarEvent): CalendarDraft {
  return {
    title: event.title,
    type: event.type,
    startDate: event.startDate,
    endDate: event.endDate,
    allDay: event.allDay,
    time: event.time,
    recurring: event.recurring,
    recurrenceCount: event.recurrenceCount,
    recurrenceEndsOn: event.recurrenceEndsOn,
    recurrenceDays: event.recurrenceDays,
    goal: event.goal,
    notes: event.notes,
    meetingUrl: event.meetingUrl,
    roadmapPhaseId: event.roadmapPhaseId,
    scheduledTrainingProgramId: event.scheduledTrainingProgramId,
    scheduledTrainingProgramName: event.scheduledTrainingProgramName,
    scheduledTrainingDayName: event.scheduledTrainingDayName
  };
}

function applyDefaultStrengthWorkout(draft: CalendarDraft, trainingPrograms: CalendarTrainingProgram[]) {
  if (draft.type !== "strength" || draft.scheduledTrainingProgramId) {
    return draft;
  }

  const program = trainingPrograms[0];
  const day = program?.days[0];

  if (!program || !day) {
    return draft;
  }

  return {
    ...draft,
    scheduledTrainingProgramId: program.id,
    scheduledTrainingProgramName: program.name,
    scheduledTrainingDayName: day.name,
    title: draft.title.trim() || `Strength: ${day.name}`
  };
}

function getNextStrengthTitle(currentTitle: string, dayName: string) {
  if (!currentTitle.trim() || currentTitle.startsWith("Strength:")) {
    return `Strength: ${dayName}`;
  }

  return currentTitle;
}

function getCalendarTrainingPrograms(client: ClientProfile): CalendarTrainingProgram[] {
  const clientWithPrograms = client as ClientProfile & {
    trainingPrograms?: Array<{
      id: string;
      name: string;
      status?: string;
      template?: {
        days?: Array<{
          name: string;
          exercises?: unknown[];
        }>;
      };
    }>;
  };

  return (clientWithPrograms.trainingPrograms ?? [])
    .map((program) => ({
      id: program.id,
      name: program.name,
      status: program.status ?? "",
      days: (program.template?.days ?? [])
        .filter((day) => Boolean(day.name))
        .map((day) => ({
          name: day.name,
          exerciseCount: Array.isArray(day.exercises) ? day.exercises.length : 0
        }))
    }))
    .filter((program) => program.days.length > 0);
}

function getCalendarEventType(type: ClientCalendarEventType) {
  return calendarEventTypes.find((eventType) => eventType.value === type) ?? calendarEventTypes[0];
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return startOfDay(nextDate);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateValue(timezone: string) {
  return getDateValueInTimeZone(new Date(), timezone);
}

function getDateValueInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? String(date.getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(date.getMonth() + 1).padStart(2, "0");
  const day = parts.find((part) => part.type === "day")?.value ?? String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDateFromDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function sortDateRange(firstDate: string, secondDate: string): [string, string] {
  return firstDate <= secondDate ? [firstDate, secondDate] : [secondDate, firstDate];
}

function isDateWithinRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function formatCalendarDay(date: Date) {
  return date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
}

function formatCalendarRange(startDate: Date, endDate: Date) {
  const start = startDate.toLocaleDateString("en", { month: "short", day: "numeric" });
  const end = endDate.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  return `${start} - ${end}`;
}

function formatRoadmapDate(value: string, timezone = "UTC") {
  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatRoadmapDateRange(startDate: string, endDate: string, timezone = "UTC") {
  return `${formatRoadmapDate(startDate, timezone)} - ${formatRoadmapDate(endDate, timezone)}`;
}

function formatRoadmapEventType(type: RoadmapEvent["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function isRoadmapPhaseInYear(phase: RoadmapPhase, year: number) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return phase.startDate <= yearEnd && phase.endDate >= yearStart;
}

function isRoadmapDateInYear(date: string, year: number) {
  return date.startsWith(`${year}-`);
}

function getRoadmapPhaseStatusForTimezone(phase: RoadmapPhase, timezone = "UTC"): RoadmapPhase["status"] {
  const today = getTodayDateValue(timezone);

  if (phase.endDate < today) {
    return "completed";
  }

  if (phase.startDate <= today && phase.endDate >= today) {
    return "active";
  }

  return "planned";
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getMondayFirstOffset(date: Date) {
  return (date.getDay() + 6) % 7;
}

function CheckInHistoryCard({ client }: { client: ClientProfile }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Weekly Check-In History</h2>
      <p className="mb-5 text-sm text-slate-600">Recent coach check-ins</p>
      <Link href={`/clients/${client.id}/check-ins` as Route} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
        View persisted check-ins
      </Link>
    </section>
  );
}

function GoalsCountdownsCard({
  client,
  recentNotes
}: {
  client: ClientProfile;
  recentNotes: ClientNoteSummary[];
}) {
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [roadmapPhases, setRoadmapPhases] = useState<RoadmapPhase[]>([]);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGoals() {
      setLoadingGoals(true);

      try {
        const [goalsResponse, roadmapResponse] = await Promise.all([
          fetch(`/api/v1/clients/${client.id}/goals?limit=20`),
          fetch(`/api/v1/clients/${client.id}/roadmap`)
        ]);
        const goalsPayload = goalsResponse.ok ? ((await goalsResponse.json()) as { data?: ClientGoal[] }) : {};
        const roadmapPayload = roadmapResponse.ok ? ((await roadmapResponse.json()) as { data?: RoadmapPhase[] }) : {};

        if (active) {
          setGoals(goalsPayload.data ?? []);
          setRoadmapPhases(roadmapPayload.data ?? []);
        }
      } catch {
        if (active) {
          setGoals([]);
          setRoadmapPhases([]);
        }
      } finally {
        if (active) {
          setLoadingGoals(false);
        }
      }
    }

    void loadGoals();

    return () => {
      active = false;
    };
  }, [client.id]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <Target className="size-5 text-indigo-600" aria-hidden="true" />
          Goals & Countdowns
        </h2>
        <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white" onClick={() => setGoalDialogOpen(true)}>
          + Add Goal
        </button>
      </div>
      {goals.length > 0 ? (
        <div className="space-y-3">
          {goals.slice(0, 4).map((goal) => (
            <div key={goal.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-950">{goal.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatNoteDate(goal.targetDate)}
                    {goal.roadmapPhaseName ? ` - ${goal.roadmapPhaseName}` : ""}
                  </p>
                </div>
                <span className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-black text-white">
                  {goal.daysRemaining < 0 ? "Past due" : `${goal.daysRemaining}d`}
                </span>
              </div>
              {goal.notes ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{goal.notes}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          {loadingGoals ? "Loading goals..." : "No persisted goals or countdowns are available for this client yet."}
        </p>
      )}

      {goalDialogOpen ? (
        <ClientGoalDialog
          client={client}
          roadmapPhases={roadmapPhases}
          onClose={() => setGoalDialogOpen(false)}
          onSaved={(goal) => {
            setGoals((currentGoals) => [...currentGoals, goal].sort((first, second) => first.targetDate.localeCompare(second.targetDate)));
            setGoalDialogOpen(false);
          }}
        />
      ) : null}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
            <NotebookPen className="size-4 text-indigo-600" aria-hidden="true" />
            Notes Timeline
          </h3>
          <Link href={`/clients/${client.id}/notes` as Route} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        </div>

        {recentNotes.length > 0 ? (
          <ol className="space-y-4">
            {recentNotes.slice(0, 3).map((note) => (
              <li key={note.id} className="relative border-l-2 border-indigo-100 pl-4">
                <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-indigo-600" aria-hidden="true" />
                <div className="text-xs font-bold text-slate-500">{formatNoteDate(note.noteDate)}</div>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">{note.body}</p>
                <p className="mt-1 text-xs text-slate-500">Added by {note.authorName}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No client notes have been added yet.
          </p>
        )}
      </div>
    </section>
  );
}

function ClientGoalDialog({
  client,
  roadmapPhases,
  onClose,
  onSaved
}: {
  client: ClientProfile;
  roadmapPhases: RoadmapPhase[];
  onClose: () => void;
  onSaved: (goal: ClientGoal) => void;
}) {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [roadmapPhaseId, setRoadmapPhaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveGoal() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetDate,
          notes,
          roadmapPhaseId: roadmapPhaseId || null
        })
      });

      if (!response.ok) {
        throw new Error("Goal could not be saved.");
      }

      const payload = (await response.json()) as { data?: ClientGoal };

      if (payload.data) {
        onSaved(payload.data);
      }
    } catch {
      setError("Goal could not be saved. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="client-goal-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="client-goal-title" className="text-2xl font-black text-slate-950">
              Add Goal
            </h2>
            <p className="mt-1 text-sm text-slate-600">{client.name}</p>
          </div>
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Goal</span>
            <input value={title} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Target date</span>
            <input type="date" value={targetDate} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(event) => setTargetDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Roadmap phase</span>
            <select value={roadmapPhaseId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(event) => setRoadmapPhaseId(event.target.value)}>
              <option value="">No phase linked</option>
              {roadmapPhases.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Notes</span>
            <textarea value={notes} rows={5} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(event) => setNotes(event.target.value)} />
          </label>

          {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={saving || !title.trim() || !targetDate} onClick={() => void saveGoal()}>
            {saving ? "Saving..." : "Save goal"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function ActivityLogCard({ client }: { client: ClientProfile }) {
  const [activity, setActivity] = useState<AccountActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadActivity() {
      setLoading(true);

      try {
        const response = await fetch(`/api/v1/clients/${client.id}/activity?limit=6`);
        const payload = response.ok ? ((await response.json()) as { data?: AccountActivity[] }) : {};

        if (active) {
          setActivity(payload.data ?? []);
        }
      } catch {
        if (active) {
          setActivity([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      active = false;
    };
  }, [client.id]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <CalendarDays className="size-5 text-indigo-600" aria-hidden="true" />
          Account Activity Log
        </h2>
        <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          View All
        </button>
      </div>
      <div className="space-y-3">
        {activity.length > 0 ? (
          activity.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatActivityDate(item.occurredAt)}
                {item.actorName ? ` - ${item.actorName}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            {loading ? "Loading account activity..." : "No persisted activity events are available for this client yet."}
          </p>
        )}
      </div>
    </section>
  );
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
