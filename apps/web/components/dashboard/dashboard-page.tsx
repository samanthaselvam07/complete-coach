"use client";

import { useEffect, useState } from "react";

import { FinancialCard } from "./financial-card";
import { LivePipeline } from "./live-pipeline";
import { ClientCapacityCard, PriorityTasksCard, TeamSnapshotCard, type TeamCapacityMember } from "./metric-cards";
import { TaskCreationPanel } from "./task-creation-panel";
import { WorkTodoSection } from "./work-todo-section";
import {
  dashboardTasks,
  revenueMetrics,
  type DashboardTask,
  type DashboardTaskCategory,
  type RevenueMetric,
  type RevenuePeriod
} from "@/fixtures/dashboard";

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

export function DashboardPage() {
  const defaultCustomRange = getDefaultCustomDateRange();
  const [period, setPeriod] = useState<RevenuePeriod>("monthly");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(defaultCustomRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCustomRange.endDate);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [taskSource, setTaskSource] = useState<"api" | "fixture">("fixture");
  const [tasks, setTasks] = useState<Record<DashboardTaskCategory, DashboardTask[]>>(dashboardTasks);
  const [teamCapacityMembers, setTeamCapacityMembers] = useState<TeamCapacityMember[] | null>(null);
  const [pendingCheckInCount, setPendingCheckInCount] = useState(5);
  const [revenueMetricSource, setRevenueMetricSource] = useState(revenueMetrics);
  const [coachTimezone, setCoachTimezone] = useState(getBrowserTimezone());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      const [tasksLoaded, teamCapacityLoaded, pendingCheckIns, packageRevenue, dashboardMetadata] = await Promise.all([
        loadPersistedTasks(),
        loadTeamCapacityMembers(),
        loadCount<ApiCheckIn>("/api/v1/check-ins?status=pending-review&limit=100"),
        loadStripeFinancialMetric("monthly"),
        loadDashboardMetadata()
      ]);

      if (!isActive) {
        return;
      }

      if (tasksLoaded) {
        setTaskSource("api");
        setTasks(tasksLoaded);
      } else {
        setTaskSource("fixture");
        setTasks(dashboardTasks);
      }

      if (teamCapacityLoaded) {
        setTeamCapacityMembers(teamCapacityLoaded);
      }

      if (pendingCheckIns !== null) {
        setPendingCheckInCount(pendingCheckIns);
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
  const dashboardSubtitle = `${formatDashboardDate(now, coachTimezone)} - ${activeTaskCount} ${activeTaskCount === 1 ? "pipeline action requires" : "pipeline actions require"} attention.`;

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

    if (taskSource === "api") {
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
        return;
      } catch {
        appendTask(createLocalDashboardTask(task.text, task.category, task.priority, dueAt), task.category);
        return;
      }
    }

    appendTask(createLocalDashboardTask(task.text, task.category, task.priority, dueAt), task.category);
  };

  function appendTask(nextTask: DashboardTask, category?: DashboardTaskCategory) {
    const targetCategory = category ?? nextTask.category ?? "current-client-care";

    setTasks((currentTasks) => ({
      ...currentTasks,
      [targetCategory]: sortDashboardTasks([...currentTasks[targetCategory], nextTask])
    }));
  }

  function createLocalDashboardTask(
    text: string,
    category: DashboardTaskCategory,
    priority: DashboardTask["priority"],
    dueAt: string | null
  ): DashboardTask {
    return {
      id: `local-${Date.now()}`,
      text,
      completed: false,
      category,
      priority,
      dueAt
    };
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Coach Operations Dashboard</h1>
        <p className="text-gray-600">{dashboardSubtitle}</p>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <FinancialCard
          currentPeriod={period}
          metric={revenueMetricSource[period]}
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
        <ClientCapacityCard members={teamCapacityMembers ?? undefined} />
        <PriorityTasksCard pendingCheckIns={pendingCheckInCount} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <WorkTodoSection tasks={tasks} onToggleTask={toggleTask} />
        <LivePipeline onAddTask={() => setTaskPanelOpen(true)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TeamSnapshotCard />
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

async function loadCount<T>(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Dashboard count API unavailable.");
    }

    const payload = (await response.json()) as { data: T[] };
    return payload.data.length;
  } catch {
    return null;
  }
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

function isTeamCapacityMember(value: unknown): value is TeamCapacityMember {
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

function buildFinancialReportingUrl(period: RevenuePeriod, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ period });

  if (period === "custom" && startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  return `/api/v1/dashboard/financial-reporting?${params.toString()}`;
}

function mapFinancialReport(report: ApiFinancialReport): RevenueMetric | null {
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

function mapApiTask(task: ApiTask): DashboardTask {
  return {
    id: task.id,
    text: task.title,
    completed: task.status === "completed",
    category: task.category,
    priority: task.priority,
    dueAt: task.dueAt
  };
}

function sortDashboardTasks(tasks: DashboardTask[]) {
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

function getDueTimestamp(dueAt?: string | null) {
  if (!dueAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(dueAt).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function getPriorityRank(priority?: DashboardTask["priority"]) {
  const priorityRanks: Record<NonNullable<DashboardTask["priority"]>, number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  return priority ? priorityRanks[priority] : 3;
}

function getDueAtFromDateInput(dueDate: string) {
  return dueDate ? `${dueDate}T00:00:00.000Z` : null;
}

function getActiveTaskCount(tasks: Record<DashboardTaskCategory, DashboardTask[]>) {
  return Object.values(tasks).reduce(
    (total, categoryTasks) => total + categoryTasks.filter((task) => !task.completed).length,
    0
  );
}

function formatDashboardDate(date: Date, timezone: string) {
  const parts = getDashboardDateParts(date, timezone);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}`;
}

function getDashboardDateParts(date: Date, timezone: string) {
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

function getOrdinalSuffix(day: number) {
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

function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatCents(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2
  }).format(amount / 100);
}

function getDefaultCustomDateRange() {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}
