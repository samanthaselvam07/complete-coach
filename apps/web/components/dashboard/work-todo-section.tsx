import { CheckCircle2, Circle } from "lucide-react";

import {
  dashboardTaskCategories,
  type DashboardTask,
  type DashboardTaskCategory
} from "@/fixtures/dashboard";
import { cn } from "@/lib/utils";

interface WorkTodoSectionProps {
  tasks: Record<DashboardTaskCategory, DashboardTask[]>;
  onToggleTask: (category: DashboardTaskCategory, taskId: string) => void;
}

export function WorkTodoSection({ tasks, onToggleTask }: WorkTodoSectionProps) {
  return (
    <section className="col-span-1 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Work To-Do</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardTaskCategories.map((category) => {
          const categoryTasks = tasks[category.id];
          const openTaskCount = categoryTasks.filter((task) => !task.completed).length;

          return (
            <section
              key={category.id}
              aria-label={category.label}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{category.label}</h3>
                <span className={cn("rounded px-2 py-1 text-xs", category.badgeClassName)}>
                  {openTaskCount}
                </span>
              </div>

              <div className="space-y-2">
                {categoryTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="group flex w-full items-start gap-2 text-left"
                    aria-label={`Mark ${task.text} ${task.completed ? "incomplete" : "complete"}`}
                    onClick={() => onToggleTask(category.id, task.id)}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden="true" />
                    ) : (
                      <Circle
                        className={cn("mt-0.5 size-4 shrink-0 text-gray-300", category.hoverClassName)}
                        aria-hidden="true"
                      />
                    )}
                    <span className={cn("text-xs", task.completed ? "text-gray-400 line-through" : "text-gray-700")}>
                      {task.text}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
