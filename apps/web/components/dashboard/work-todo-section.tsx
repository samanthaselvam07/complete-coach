import { Circle } from "lucide-react";

import {
  dashboardTaskCategories,
  type DashboardTask,
  type DashboardTaskCategory
} from "@/lib/dashboard/dashboard-models";
import { cn } from "@/lib/utils";

interface WorkTodoSectionProps {
  tasks: Record<DashboardTaskCategory, DashboardTask[]>;
  loading?: boolean;
  onToggleTask: (category: DashboardTaskCategory, taskId: string) => void;
  onAddTask: () => void;
}

export function WorkTodoSection({ tasks, loading = false, onToggleTask, onAddTask }: WorkTodoSectionProps) {
  return (
    <section className="col-span-1 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Work To-Do</h2>
        <button
          type="button"
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          onClick={onAddTask}
        >
          Add Task
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardTaskCategories.map((category) => {
          const categoryTasks = tasks[category.id];
          const visibleTasks = categoryTasks.filter((task) => !task.completed);
          const openTaskCount = visibleTasks.length;

          return (
            <section
              key={category.id}
              aria-label={category.label}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{category.label}</h3>
                <span className={cn("rounded px-2 py-1 text-xs", category.badgeClassName)}>
                  {loading ? "..." : openTaskCount}
                </span>
              </div>

              <div className="space-y-2">
                {loading ? (
                  <div role="status" aria-label={`Preparing ${category.label} tasks.`} className="space-y-2 rounded-lg bg-gray-50 px-3 py-3">
                    <span className="sr-only">Preparing {category.label} tasks.</span>
                    <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-200" aria-hidden="true" />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-gray-100" aria-hidden="true" />
                  </div>
                ) : visibleTasks.length > 0 ? visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="group flex w-full items-start gap-2 text-left"
                    aria-label={`Mark ${task.text} complete`}
                    onClick={() => onToggleTask(category.id, task.id)}
                  >
                    <Circle
                      className={cn("mt-0.5 size-4 shrink-0 text-gray-300", category.hoverClassName)}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-gray-700">
                        {task.text}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {task.dueAt ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            Due {formatTaskDueDate(task.dueAt)}
                          </span>
                        ) : null}
                        {task.priority ? (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", priorityClassNames[task.priority])}>
                            {priorityLabels[task.priority]}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    No open tasks.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

const priorityLabels: Record<NonNullable<DashboardTask["priority"]>, string> = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

const priorityClassNames: Record<NonNullable<DashboardTask["priority"]>, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-yellow-50 text-yellow-700",
  low: "bg-green-50 text-green-700"
};

function formatTaskDueDate(dueAt: string) {
  const date = new Date(dueAt);

  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}
