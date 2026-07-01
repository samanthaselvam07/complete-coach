"use client";

import { useEffect, useState } from "react";

import { FinancialCard } from "./financial-card";
import { emptyCrmSummary, fetchCrmSummary, LivePipeline, type CrmSummary } from "./live-pipeline";
import {
  ClientCapacityCard,
  PriorityTasksCard,
  TeamSnapshotCard,
  TodaysCheckInsCard,
  type TeamCapacityMember
} from "./metric-cards";
import { PriorityFlagsModule, type DashboardPriorityFlag } from "./priority-flags-module";
import { TaskCreationPanel } from "./task-creation-panel";
import { WorkTodoSection } from "./work-todo-section";
import {
  type DashboardTask,
  type DashboardTaskCategory,
  type RevenueMetric,
  type RevenuePeriod
} from "@/lib/dashboard/dashboard-models";

interface ApiTask {
  id: string;
  title: string;
  category: DashboardTaskCategory;
  priority: "high" | "medium" | "low";
  status: "open" | "completed" | "cancelled";
  dueAt: string | null;
}

interface ApiCheckIn {
  id: string;
  status?: string;
  checkInStatus?: string;
}

interface ApiClientSummary {
  id: string;
  name: string;
  checkInDay?: string | null;
  status?: string;
}

interface ApiFinancialReport {
  label: string;
  amount: number;
  currency: string;
  change: string;
  bars: number[];
}

interface ApiDashboardMetadata {
  timezone: string;
}

interface ApiPriorityFlag {
  id: string;
  severity: string | null;
  title: string;
  contentMarkdown: string;
  client?: {
    id: string;
    name: string;
  } | null;
}

export function DashboardPage() {
  const defaultCustomRange = getDefaultCustomDateRange();
  const [period, setPeriod] = useState<RevenuePeriod>("monthly");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(defaultCustomRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCustomRange.endDate);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [taskSource, setTaskSource] = useState<"api" | "unavailable">("unavailable");
  const [taskSaveError, setTaskSaveError] = useState("");
  const [tasks, setTasks] = useState<Record<DashboardTaskCategory, DashboardTask[]>>(emptyDashboardTasks);
  const [teamCapacityMembers, setTeamCapacityMembers] = useState<TeamCapacityMember[] | null>(null);
  const [pendingCheckInCount, setPendingCheckInCount] = useState(0);
  const [activeClients, setActiveClients] = useState<ApiClientSummary[]>([]);
  const [priorityFlags, setPriorityFlags] = useState<DashboardPriorityFlag[]>([]);
  const [crmSummary, setCrmSummary] = useState<CrmSummary>(emptyCrmSummary);
  const [revenueMetricSource, setRevenueMetricSource] = useState(emptyRevenueMetrics);
  const [coachTimezone, setCoachTimezone] = useState(getBrowserTimezone());
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      const [
        tasksLoaded,
        teamCapacityLoaded,
        pendingCheckIns,
        activeClientsLoaded,
        aiPriorityFlags,
        packageRevenue,
        dashboardMetadata,
        crmSummaryLoaded
      ] = await Promise.all([
        loadPersistedTasks(),
        loadTeamCapacityMembers(),
        loadUncompletedCheckInCount(),
        loadActiveClients(),
        loadPriorityFlags(),
        loadStripeFinancialMetric("monthly"),
        loadDashboardMetadata(),
        fetchCrmSummary()
      ]);

      if (!isActive) {
        return;
      }

      if (tasksLoaded) {
        setTaskSource("api");
        setTasks(tasksLoaded);
      } else {
        setTaskSource("unavailable");
        setTasks(emptyDashboardTasks);
      }

      if (teamCapacityLoaded) {
        setTeamCapacityMembers(teamCapacityLoaded);
      }

      if (pendingCheckIns !== null) {
        setPendingCheckInCount(pendingCheckIns);
      }

      if (activeClientsLoaded) {
        setActiveClients(activeClientsLoaded);
      }

      if (aiPriorityFlags) {
        setPriorityFlags(aiPriorityFlags);
      }

      if (packageRevenue) {
        setRevenueMetricSource((currentMetrics) => ({
          ...currentMetrics,
          monthly: packageRevenue
        }));
      }

      if (dashboardMetadata) {
        setCoachTimezone(dashboardMetadata.timezone);
      }

      setCrmSummary(crmSummaryLoaded);
      setDashboardLoaded(true);
    }

    void loadDashboardData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeTaskCount = getActiveTaskCount(tasks);
  const dashboardWeekday = getDashboardWeekday(now, coachTimezone);
  const todaysCheckInClients = getClientsCheckingInOnDay(activeClients, dashboardWeekday);
  const dashboardSubtitle = dashboardLoaded
    ? `${formatDashboardDate(now, coachTimezone)} - ${activeTaskCount} ${activeTaskCount === 1 ? "pipeline action requires" : "pipeline actions require"} attention.`
    : "Preparing your dashboard...";

  const toggleTask = async (category: DashboardTaskCategory, taskId: string) => {
    const targetTask = tasks[category].find((task) => task.id === taskId);

    if (!targetTask) {
      return;
    }

    setTasks((currentTasks) => ({
      ...currentTasks,
      [category]: currentTasks[category].map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));

    if (taskSource !== "api") {
      return;
    }

    try {
      const response = await fetch(
        targetTask.completed ? `/api/v1/tasks/${taskId}` : `/api/v1/tasks/${taskId}/complete`,
        {
          method: targetTask.completed ? "PATCH" : "POST",
          headers: targetTask.completed ? { "Content-Type": "application/json" } : undefined,
          body: targetTask.completed ? JSON.stringify({ status: "open" }) : undefined
        }
      );

      if (!response.ok) {
        throw new Error("Task persistence API unavailable.");
      }
    } catch {
      setTasks((currentTasks) => ({
        ...currentTasks,
        [category]: currentTasks[category].map((task) =>
          task.id === taskId ? { ...task, completed: targetTask.completed } : task
        )
      }));
    }
  };

  const handleCreateTask = async (task: {
    text: string;
    category: DashboardTaskCategory;
    priority: "high" | "medium" | "low";
    dueDate: string;
  }) => {
    const dueAt = getDueAtFromDateInput(task.dueDate);

    if (taskSource !== "api") {
      setTaskSaveError("Dashboard tasks are unavailable until the task database reconnects.");
      return;
    }

    try {
      const response = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.text,
          category: task.category,
          priority: task.priority,
          ...(dueAt ? { dueAt } : {})
        })
      });

      if (!response.ok) {
        throw new Error("Task persistence API unavailable.");
      }

      const payload = (await response.json()) as { data: ApiTask };
      appendTask(mapApiTask(payload.data));
      setTaskSaveError("");
    } catch {
      setTaskSaveError("Task could not be saved to the database. Please try again once the dashboard reconnects.");
    }
  };

  function appendTask(nextTask: DashboardTask, category?: DashboardTaskCategory) {
    const targetCategory = category ?? nextTask.category ?? "current-client-care";

    setTasks((currentTasks) => ({
      ...currentTasks,
      [targetCategory]: sortDashboardTasks([...currentTasks[targetCategory], nextTask])
    }));
  }

  if (!dashboardLoaded) {
    return <DashboardLoadingScreen />;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Coach Operations Dashboard</h1>
        <p className="text-gray-600">{dashboardSubtitle}</p>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-4">
        <FinancialCard
          currentPeriod={period}
          metric={revenueMetricSource[period]}
          loading={!dashboardLoaded}
          open={periodMenuOpen}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onToggleOpen={() => setPeriodMenuOpen((open) => !open)}
          onSelectPeriod={(nextPeriod) => {
            setPeriod(nextPeriod);
            if (nextPeriod === "custom") {
              setPeriodMenuOpen(true);
              return;
            }

            setPeriodMenuOpen(false);
            void refreshFinancialMetric(nextPeriod);
          }}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
          onApplyCustomRange={() => {
            setPeriod("custom");
            setPeriodMenuOpen(false);
            void refreshFinancialMetric("custom", customStartDate, customEndDate);
          }}
        />
        <ClientCapacityCard members={teamCapacityMembers ?? []} loading={!dashboardLoaded} />
        <PriorityTasksCard pendingCheckIns={pendingCheckInCount} loading={!dashboardLoaded} />
        <TodaysCheckInsCard weekday={dashboardWeekday} clients={todaysCheckInClients} loading={!dashboardLoaded} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WorkTodoSection
            tasks={tasks}
            loading={!dashboardLoaded}
            onToggleTask={toggleTask}
            onAddTask={() => setTaskPanelOpen(true)}
          />
          <PriorityFlagsModule flags={priorityFlags} />
          {taskSaveError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {taskSaveError}
            </p>
          ) : null}
        </div>
        <div className="space-y-6">
          <LivePipeline initialSummary={crmSummary} loading={!dashboardLoaded} />
          <TeamSnapshotCard members={teamCapacityMembers ?? []} loading={!dashboardLoaded} />
        </div>
      </div>

      <TaskCreationPanel
        open={taskPanelOpen}
        onClose={() => setTaskPanelOpen(false)}
        onCreateTask={handleCreateTask}
      />
    </div>
  );

  async function refreshFinancialMetric(nextPeriod: RevenuePeriod, startDate?: string, endDate?: string) {
    const financialMetric = await loadStripeFinancialMetric(nextPeriod, startDate, endDate);

    if (!financialMetric) {
      return;
    }

    setRevenueMetricSource((currentMetrics) => ({
      ...currentMetrics,
      [nextPeriod]: financialMetric
    }));
  }
}

function DashboardLoadingScreen() {
  return (
    <section
      role="status"
      aria-label="Preparing Complete Coach dashboard."
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-gray-50 px-6"
    >
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-indigo-50">
          <div className="size-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Complete Coach</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">Preparing your dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          We&apos;re getting your workspace ready.
        </p>
        <span className="sr-only">Preparing Complete Coach dashboard.</span>
      </div>
    </section>
  );
}

const emptyDashboardTasks: Record<DashboardTaskCategory, DashboardTask[]> = {
  "current-client-care": [],
  "new-client-onboarding": [],
  "social-media": [],
  "business-operations": []
};

const emptyRevenueMetrics: Record<RevenuePeriod, RevenueMetric> = {
  weekly: {
    label: "Weekly Revenue",
    value: "$0",
    change: "Awaiting database data",
    bars: []
  },
  monthly: {
    label: "Monthly Revenue",
    value: "$0",
    change: "Awaiting database data",
    bars: []
  },
  quarterly: {
    label: "Quarterly Revenue",
    value: "$0",
    change: "Awaiting database data",
    bars: []
  },
  yearly: {
    label: "Yearly Revenue",
    value: "$0",
    change: "Awaiting database data",
    bars: []
  },
  custom: {
    label: "Custom Revenue",
    value: "$0",
    change: "Awaiting database data",
    bars: []
  }
};

async function loadPersistedTasks() {
  try {
    const response = await fetch("/api/v1/tasks?limit=100");

    if (!response.ok) {
      throw new Error("Tasks API unavailable.");
    }

    const payload = (await response.json()) as { data: ApiTask[] };
    const grouped = payload.data.reduce<Record<DashboardTaskCategory, DashboardTask[]>>(
      (groupedTasks, task) => {
        groupedTasks[task.category].push(mapApiTask(task));
        return groupedTasks;
      },
      {
        "current-client-care": [],
        "new-client-onboarding": [],
        "social-media": [],
        "business-operations": []
      }
    );

    return Object.fromEntries(
      Object.entries(grouped).map(([category, categoryTasks]) => [category, sortDashboardTasks(categoryTasks)])
    ) as Record<DashboardTaskCategory, DashboardTask[]>;
  } catch {
    return null;
  }
}

async function loadUncompletedCheckInCount() {
  try {
    const response = await fetch("/api/v1/check-ins?limit=100");

    if (!response.ok) {
      throw new Error("Check-ins API unavailable.");
    }

    const payload = (await response.json()) as { data?: ApiCheckIn[] };
    const checkIns = payload.data ?? [];
    return checkIns.filter((checkIn) => (checkIn.checkInStatus ?? checkIn.status) !== "completed").length;
  } catch {
    return null;
  }
}

async function loadActiveClients() {
  try {
    const response = await fetch("/api/v1/clients?status=active&limit=100");

    if (!response.ok) {
      throw new Error("Clients API unavailable.");
    }

    const payload = (await response.json()) as { data?: ApiClientSummary[] };
    return (payload.data ?? []).filter(isApiClientSummary);
  } catch {
    return null;
  }
}

async function loadPriorityFlags() {
  try {
    const response = await fetch("/api/v1/ai/recommendations?type=risk-flag&status=pending-approval&limit=5");

    if (!response.ok) {
      throw new Error("AI priority flags API unavailable.");
    }

    const payload = (await response.json()) as { data?: ApiPriorityFlag[] };
    return (payload.data ?? []).map(mapPriorityFlag).filter((flag): flag is DashboardPriorityFlag => Boolean(flag));
  } catch {
    return null;
  }
}

function isApiClientSummary(value: unknown): value is ApiClientSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ApiClientSummary>;

  return typeof candidate.id === "string" && typeof candidate.name === "string";
}

function mapPriorityFlag(flag: ApiPriorityFlag): DashboardPriorityFlag | null {
  const priority = normalizePriorityFlagSeverity(flag.severity);

  if (!priority) {
    return null;
  }

  return {
    id: flag.id,
    clientName: flag.client?.name || "Unknown client",
    priority,
    summary: getOneLineSummary(flag.title, flag.contentMarkdown),
    note: flag.contentMarkdown || "No detailed AI note is available for this priority flag."
  };
}

function normalizePriorityFlagSeverity(severity: string | null): DashboardPriorityFlag["priority"] | null {
  if (severity === "high" || severity === "medium") {
    return severity;
  }

  return null;
}

function getOneLineSummary(title: string, contentMarkdown: string) {
  const cleanTitle = title.trim();

  if (cleanTitle) {
    return cleanTitle;
  }

  const [firstSentence] = contentMarkdown.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/u);
  return firstSentence || "AI has flagged this client for coach review.";
}

async function loadTeamCapacityMembers() {
  try {
    const response = await fetch("/api/v1/team-members");

    if (!response.ok) {
      throw new Error("Team members API unavailable.");
    }

    const payload = (await response.json()) as { data?: { members?: TeamCapacityMember[] } };
    const members = payload.data?.members?.filter(isTeamCapacityMember) ?? [];
    return members.length ? members : null;
  } catch {
    return null;
  }
}

export function isTeamCapacityMember(value: unknown): value is TeamCapacityMember {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TeamCapacityMember>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.activeClientCount === "number" &&
    typeof candidate.capacityLimit === "number" &&
    typeof candidate.capacityPercent === "number"
  );
}

async function loadStripeFinancialMetric(period: RevenuePeriod, startDate?: string, endDate?: string) {
  try {
    const response = await fetch(buildFinancialReportingUrl(period, startDate, endDate));

    if (!response.ok) {
      throw new Error("Stripe financial reporting API unavailable.");
    }

    const payload = (await response.json()) as { data: ApiFinancialReport };
    return mapFinancialReport(payload.data);
  } catch {
    return null;
  }
}

async function loadDashboardMetadata() {
  try {
    const response = await fetch("/api/v1/dashboard/metadata");

    if (!response.ok) {
      throw new Error("Dashboard metadata API unavailable.");
    }

    const payload = (await response.json()) as { data: ApiDashboardMetadata };
    return payload.data;
  } catch {
    return null;
  }
}

export function buildFinancialReportingUrl(period: RevenuePeriod, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ period });

  if (period === "custom" && startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  return `/api/v1/dashboard/financial-reporting?${params.toString()}`;
}

export function mapFinancialReport(report: ApiFinancialReport): RevenueMetric | null {
  if (!report || typeof report.amount !== "number" || !Array.isArray(report.bars)) {
    return null;
  }

  return {
    label: report.label,
    value: formatCents(report.amount, report.currency),
    change: report.change,
    bars: report.bars
  };
}

export function mapApiTask(task: ApiTask): DashboardTask {
  return {
    id: task.id,
    text: task.title,
    completed: task.status === "completed",
    category: task.category,
    priority: task.priority,
    dueAt: task.dueAt
  };
}

export function sortDashboardTasks(tasks: DashboardTask[]) {
  return [...tasks].sort((firstTask, secondTask) => {
    if (firstTask.completed !== secondTask.completed) {
      return firstTask.completed ? 1 : -1;
    }

    const dueComparison = getDueTimestamp(firstTask.dueAt) - getDueTimestamp(secondTask.dueAt);

    if (dueComparison !== 0) {
      return dueComparison;
    }

    return getPriorityRank(firstTask.priority) - getPriorityRank(secondTask.priority);
  });
}

export function getDueTimestamp(dueAt?: string | null) {
  if (!dueAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(dueAt).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export function getPriorityRank(priority?: DashboardTask["priority"]) {
  const priorityRanks: Record<NonNullable<DashboardTask["priority"]>, number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  return priority ? priorityRanks[priority] : 3;
}

export function getDueAtFromDateInput(dueDate: string) {
  return dueDate ? `${dueDate}T00:00:00.000Z` : null;
}

export function getActiveTaskCount(tasks: Record<DashboardTaskCategory, DashboardTask[]>) {
  return Object.values(tasks).reduce(
    (total, categoryTasks) => total + categoryTasks.filter((task) => !task.completed).length,
    0
  );
}

export function formatDashboardDate(date: Date, timezone: string) {
  const parts = getDashboardDateParts(date, timezone);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}`;
}

export function getDashboardWeekday(date: Date, timezone: string) {
  return getDashboardDateParts(date, timezone).find((part) => part.type === "weekday")?.value ?? "Today";
}

export function getClientsCheckingInOnDay(clients: ApiClientSummary[], weekday: string) {
  return clients
    .filter((client) => normalizeWeekday(client.checkInDay) === normalizeWeekday(weekday))
    .map((client) => ({
      id: client.id,
      name: client.name,
      checkInDay: client.checkInDay ?? weekday
    }));
}

export function normalizeWeekday(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function getDashboardDateParts(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: timezone
    }).formatToParts(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).formatToParts(date);
  }
}

export function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatCents(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2
  }).format(amount / 100);
}

export function getDefaultCustomDateRange() {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}
