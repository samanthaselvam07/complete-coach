"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { DashboardTaskCategory, DashboardTaskPriority } from "@/fixtures/dashboard";
import { cn } from "@/lib/utils";

interface NewDashboardTask {
  text: string;
  category: DashboardTaskCategory;
  priority: DashboardTaskPriority;
  dueDate: string;
}

interface TaskCreationPanelProps {
  open: boolean;
  onClose: () => void;
  onCreateTask: (task: NewDashboardTask) => void;
}

const categories: Array<{ value: DashboardTaskCategory; label: string }> = [
  { value: "current-client-care", label: "Current Client Care" },
  { value: "new-client-onboarding", label: "New client/ Onboarding" },
  { value: "business-operations", label: "Business / Operations" },
  { value: "social-media", label: "Social Media" }
];

const priorities: Array<{ value: DashboardTaskPriority; label: string; activeClassName: string }> = [
  { value: "high", label: "High", activeClassName: "border-red-500 bg-red-50 text-red-700" },
  { value: "medium", label: "Medium", activeClassName: "border-yellow-500 bg-yellow-50 text-yellow-700" },
  { value: "low", label: "Low", activeClassName: "border-green-500 bg-green-50 text-green-700" }
];

export function TaskCreationPanel({ open, onClose, onCreateTask }: TaskCreationPanelProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<DashboardTaskCategory>("current-client-care");
  const [priority, setPriority] = useState<DashboardTaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    onCreateTask({ text: trimmedText, category, priority, dueDate });
    setText("");
    setCategory("current-client-care");
    setPriority("medium");
    setDueDate("");
    onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close task creation backdrop"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-creation-title"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div>
            <h2 id="task-creation-title" className="mb-1 text-2xl font-bold">
              Create New Task
            </h2>
            <p className="text-sm text-indigo-100">Add a task to your workload</p>
          </div>
          <button
            type="button"
            aria-label="Close task creation panel"
            className="rounded-lg p-2 transition-colors hover:bg-white/20"
            onClick={onClose}
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label htmlFor="task-description" className="mb-2 block text-sm font-semibold text-gray-700">
              Task Description
            </label>
            <textarea
              id="task-description"
              value={text}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter task details..."
              onChange={(event) => setText(event.target.value)}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-700">Category</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={category === option.value}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm font-medium transition-all",
                    category === option.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                  onClick={() => setCategory(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-700">Priority</legend>
            <div className="flex gap-3">
              {priorities.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={priority === option.value}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-all",
                    priority === option.value
                      ? option.activeClassName
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                  onClick={() => setPriority(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="task-due-date" className="mb-2 block text-sm font-semibold text-gray-700">
              Due Date
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={!text.trim()}
              onClick={handleSubmit}
            >
              Create Task
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
