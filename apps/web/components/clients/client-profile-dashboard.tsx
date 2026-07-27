"use client";

import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, NotebookPen, Target } from "lucide-react";
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
        <ActivityLogCard />
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
  unit: string | null;
  metadata: unknown;
}

interface MetricDefinition {
  key: string;
  label: string;
  color: string;
  unit?: string;
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
          setMetrics(Array.isArray(payload.data) ? payload.data : []);
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

  const metricDefinitions = useMemo(() => createMetricDefinitions(metrics), [metrics]);
  const filteredMetrics = useMemo(
    () => filterMetricsByRange(metrics, range, customFrom, customTo),
    [customFrom, customTo, metrics, range]
  );
  const visibleMetrics = filteredMetrics.filter((metric) => selectedMetricKeys.includes(metric.metricKey));

  const toggleMetric = (metricKey: string) => {
    setSelectedMetricKeys((currentKeys) =>
      currentKeys.includes(metricKey)
        ? currentKeys.filter((currentKey) => currentKey !== metricKey)
        : [...currentKeys, metricKey]
    );
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
  const series = definitions
    .map((definition) => ({
      ...definition,
      points: metrics
        .filter((metric) => metric.metricKey === definition.key)
        .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    }))
    .filter((definition) => definition.points.length > 0);

  if (series.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No persisted progress analytics are available for the selected metrics and date range.
      </div>
    );
  }

  const chartMetrics = series.flatMap((definition) => definition.points);
  const minTime = Math.min(...chartMetrics.map((metric) => new Date(metric.measuredAt).getTime()));
  const maxTime = Math.max(...chartMetrics.map((metric) => new Date(metric.measuredAt).getTime()));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <svg role="img" aria-label="Progress analytics chart" viewBox="0 0 640 260" className="h-72 w-full">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="28" x2="620" y1={42 + line * 54} y2={42 + line * 54} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {series.map((definition) => (
          <g key={definition.key}>
            <polyline
              fill="none"
              stroke={definition.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={toPolylinePoints(definition.points, minTime, maxTime)}
            />
            {definition.points.map((point) => {
              const [cx, cy] = toChartPoint(point, definition.points, minTime, maxTime);

              return (
                <circle key={point.id} cx={cx} cy={cy} r="4" fill={definition.color}>
                  <title>{`${definition.label}: ${formatMetricValue(point, definition)} on ${formatMetricDate(point.measuredAt)}`}</title>
                </circle>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
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

function filterMetricsByRange(metrics: ClientMetricRecord[], range: ProgressRange, customFrom: string, customTo: string) {
  const now = Date.now();
  const from = getRangeStart(range, now, customFrom);
  const to = range === "custom" && customTo ? new Date(`${customTo}T23:59:59.999Z`).getTime() : now;

  return metrics.filter((metric) => {
    const measuredAt = new Date(metric.measuredAt).getTime();

    return measuredAt >= from && measuredAt <= to;
  });
}

function formatRangeLabel(range: ProgressRange) {
  return range.charAt(0).toUpperCase() + range.slice(1);
}

function getRangeStart(range: ProgressRange, now: number, customFrom: string) {
  if (range === "custom") {
    return customFrom ? new Date(`${customFrom}T00:00:00.000Z`).getTime() : 0;
  }

  const days = range === "week" ? 7 : range === "month" ? 31 : 365;

  return now - days * 24 * 60 * 60 * 1000;
}

function toPolylinePoints(points: ClientMetricRecord[], minTime: number, maxTime: number) {
  return points.map((point) => toChartPoint(point, points, minTime, maxTime).join(",")).join(" ");
}

function toChartPoint(point: ClientMetricRecord, series: ClientMetricRecord[], minTime: number, maxTime: number) {
  const values = series.map((metric) => metric.metricValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const time = new Date(point.measuredAt).getTime();
  const xRatio = maxTime === minTime ? 0.5 : (time - minTime) / (maxTime - minTime);
  const yRatio = maxValue === minValue ? 0.5 : (point.metricValue - minValue) / (maxValue - minValue);
  const x = 28 + xRatio * 592;
  const y = 220 - yRatio * 178;

  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
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
  const value = Number.isInteger(metric.metricValue) ? String(metric.metricValue) : metric.metricValue.toFixed(1);
  const unit = metric.unit ?? definition.unit;

  return unit ? `${value}${unit}` : value;
}

function formatMetricDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function ClientCalendarPanel({ client, compact = false }: { client: ClientProfile; compact?: boolean }) {
  const clientTimezone = client.timezone || "UTC";
  const [events, setEvents] = useState<ClientCalendarEvent[]>(() => createInitialCalendarEvents(clientTimezone));
  const [windowStart, setWindowStart] = useState(createDateFromDateValue(getTodayDateValue(clientTimezone)));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarDraft>(() => createCalendarDraft(getTodayDateValue(clientTimezone), getTodayDateValue(clientTimezone), client.protocol));
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [roadmapPhases, setRoadmapPhases] = useState<RoadmapPhase[]>(() => createInitialRoadmapPhases(client.protocol, clientTimezone));
  const visibleDays = useMemo(
    () => Array.from({ length: compact ? 14 : 42 }, (_, index) => addDays(windowStart, index)),
    [compact, windowStart]
  );
  const goalOptions = [client.protocol, client.packageName].filter((goal, index, goals) => goal && goal !== "Unassigned" && goals.indexOf(goal) === index);
  const title = compact ? "Calendar" : `${client.name} Calendar`;
  const calendarRangeLabel = formatCalendarRange(visibleDays[0], visibleDays[visibleDays.length - 1]);

  useEffect(() => {
    let active = true;

    async function loadRoadmapPhases() {
      try {
        const response = await fetch(`/api/v1/clients/${client.id}/roadmap`);

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: RoadmapPhase[] };
        const persistedPhases = Array.isArray(payload.data) ? payload.data : [];

        if (active && persistedPhases.length > 0) {
          setRoadmapPhases(persistedPhases);
        }
      } catch {
        // Roadmap phases are optional context for calendar events.
      }
    }

    void loadRoadmapPhases();

    return () => {
      active = false;
    };
  }, [client.id, clientTimezone]);

  const openDraft = (startDate = getTodayDateValue(clientTimezone), endDate = startDate) => {
    setEditingEventId(null);
    setDraft(createCalendarDraft(startDate, endDate, goalOptions[0] ?? ""));
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

  const saveEvent = () => {
    setEvents((currentEvents) => {
      if (editingEventId) {
        return currentEvents.map((event) =>
          event.id === editingEventId
            ? {
                ...event,
                ...draft,
                endDate: draft.endDate || draft.startDate
              }
            : event
        );
      }

      return [
        ...currentEvents,
        {
          id: `event_${Date.now()}`,
          ...draft,
          endDate: draft.endDate || draft.startDate
        }
      ];
    });
    setEditingEventId(null);
    setDialogOpen(false);
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

      {dialogOpen ? (
        <CalendarEventDialog
          draft={draft}
          goalOptions={goalOptions}
          roadmapPhases={roadmapPhases}
          editing={Boolean(editingEventId)}
          onChange={(nextDraft) => setDraft(nextDraft)}
          onClose={() => {
            setEditingEventId(null);
            setDialogOpen(false);
          }}
          onSave={saveEvent}
        />
      ) : null}
    </section>
  );
}

export function ClientRoadmapPeriodisationPanel({ client }: { client: ClientProfile }) {
  const clientTimezone = client.timezone || "UTC";
  const currentYear = Number(getTodayDateValue(clientTimezone).slice(0, 4));
  const [roadmapYear, setRoadmapYear] = useState(currentYear);
  const [phases, setPhases] = useState<RoadmapPhase[]>(() => createInitialRoadmapPhases(client.protocol, clientTimezone));
  const [events, setEvents] = useState<RoadmapEvent[]>(() => createInitialRoadmapEvents(clientTimezone));
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [phaseDraft, setPhaseDraft] = useState<RoadmapPhaseDraft>(() => createRoadmapPhaseDraft(clientTimezone));
  const [eventDraft, setEventDraft] = useState<RoadmapEventDraft>(() => createRoadmapEventDraft("phase_active", clientTimezone));
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<string[]>(["phase_active"]);
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

        if (active && persistedPhases.length > 0) {
          setPhases(persistedPhases);
          setEvents(persistedPhases.flatMap((phase) => phase.items ?? []));
          setExpandedPhaseIds(persistedPhases.filter((phase) => getRoadmapPhaseStatusForTimezone(phase, clientTimezone) === "active").map((phase) => phase.id));
        }
      } catch {
        if (active) {
          setRoadmapError("Roadmap could not be loaded. Starter phases are shown until the connection recovers.");
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
  editing,
  onChange,
  onClose,
  onSave
}: {
  draft: CalendarDraft;
  goalOptions: string[];
  roadmapPhases: RoadmapPhase[];
  editing: boolean;
  onChange: (draft: CalendarDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const updateDraft = <TKey extends keyof CalendarDraft>(key: TKey, value: CalendarDraft[TKey]) => {
    onChange({ ...draft, [key]: value });
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
            <select aria-label="Event type" value={draft.type} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateDraft("type", event.target.value as ClientCalendarEventType)}>
              {calendarEventTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
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

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300" disabled={!draft.title.trim() || !draft.startDate} onClick={onSave}>
            {editing ? "Update event" : "Save event"}
          </button>
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

function createInitialCalendarEvents(timezone = "UTC"): ClientCalendarEvent[] {
  const today = createDateFromDateValue(getTodayDateValue(timezone));

  return [
    createCalendarEvent("Training block", "strength", toDateValue(addDays(today, 1)), toDateValue(addDays(today, 1))),
    createCalendarEvent("Check-in call", "video-call", toDateValue(addDays(today, 3)), toDateValue(addDays(today, 3)), false, "10:00"),
    createCalendarEvent("Recovery day", "rest", toDateValue(addDays(today, 5)), toDateValue(addDays(today, 5))),
    createCalendarEvent("Phase review", "phase", toDateValue(addDays(today, 9)), toDateValue(addDays(today, 12)))
  ];
}

function createCalendarEvent(title: string, type: ClientCalendarEventType, startDate: string, endDate: string, allDay = true, time = ""): ClientCalendarEvent {
  return {
    id: `${type}_${startDate}_${title}`,
    title,
    type,
    startDate,
    endDate,
    allDay,
    time,
    recurring: false,
    recurrenceCount: "",
    recurrenceEndsOn: "",
    recurrenceDays: [],
    goal: "",
    notes: "",
    meetingUrl: "",
    roadmapPhaseId: ""
  };
}

function createInitialRoadmapPhases(activePhaseName: string, timezone = "UTC"): RoadmapPhase[] {
  const today = createDateFromDateValue(getTodayDateValue(timezone));
  const year = today.getFullYear();

  return [
    {
      id: "phase_completed",
      name: "Foundation Block",
      startDate: toDateValue(new Date(year, 0, 1)),
      endDate: toDateValue(addDays(today, -31)),
      status: "completed"
    },
    {
      id: "phase_active",
      name: activePhaseName === "Unassigned" ? "Current Coaching Phase" : activePhaseName,
      startDate: toDateValue(addDays(today, -30)),
      endDate: toDateValue(addDays(today, 60)),
      status: "active"
    },
    {
      id: "phase_planned",
      name: "Performance Build",
      startDate: toDateValue(addDays(today, 61)),
      endDate: toDateValue(new Date(year, 11, 31)),
      status: "planned"
    }
  ];
}

function createInitialRoadmapEvents(timezone = "UTC"): RoadmapEvent[] {
  const today = createDateFromDateValue(getTodayDateValue(timezone));

  return [
    {
      id: "roadmap_event_check_in",
      phaseId: "phase_active",
      title: "Phase review",
      type: "event",
      date: toDateValue(addDays(today, 14)),
      notes: "Review adherence, recovery, and progression before the next training block."
    },
    {
      id: "roadmap_event_milestone",
      phaseId: "phase_active",
      title: "Progress milestone",
      type: "milestone",
      date: toDateValue(addDays(today, 42)),
      notes: "Compare bodyweight, waist, photos, and client feedback."
    }
  ];
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
    roadmapPhaseId: ""
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
    roadmapPhaseId: event.roadmapPhaseId
  };
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
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <Target className="size-5 text-indigo-600" aria-hidden="true" />
          Goals & Countdowns
        </h2>
        <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
          + Add Goal
        </button>
      </div>
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No persisted goals or countdowns are available for this client yet.
      </p>

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

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function ActivityLogCard() {
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
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No persisted activity events are available for this client yet.
        </p>
      </div>
    </section>
  );
}
