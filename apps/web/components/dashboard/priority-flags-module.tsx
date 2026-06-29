import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DashboardPriorityFlag {
  id: string;
  clientName: string;
  priority: "medium" | "high";
  summary: string;
  note: string;
}

interface PriorityFlagsModuleProps {
  flags: DashboardPriorityFlag[];
}

export function PriorityFlagsModule({ flags }: PriorityFlagsModuleProps) {
  return (
    <section aria-label="Priority Flagged Clients" className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">AI flags</p>
          <h2 className="mt-1 text-xl font-bold text-gray-950">Priority Flagged Clients</h2>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          {flags.length}
        </span>
      </div>

      {flags.length > 0 ? (
        <div className="space-y-3">
          {flags.map((flag) => (
            <details key={flag.id} className="group rounded-lg border border-gray-100 bg-gray-50 p-4">
              <summary className="flex cursor-pointer list-none items-start gap-3">
                <AlertTriangle
                  className={cn("mt-0.5 size-4 shrink-0", priorityIconClassNames[flag.priority])}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-950">{flag.clientName}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", priorityBadgeClassNames[flag.priority])}>
                      {priorityLabels[flag.priority]}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">{flag.summary}</span>
                </span>
                <span className="text-xs font-semibold text-indigo-700 group-open:hidden">View note</span>
                <span className="hidden text-xs font-semibold text-indigo-700 group-open:inline">Hide note</span>
              </summary>
              <p className="mt-3 border-t border-gray-200 pt-3 text-sm leading-6 text-gray-700">{flag.note}</p>
            </details>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
          No AI priority flags right now.
        </p>
      )}
    </section>
  );
}

const priorityLabels: Record<DashboardPriorityFlag["priority"], string> = {
  medium: "Medium priority",
  high: "High priority"
};

const priorityBadgeClassNames: Record<DashboardPriorityFlag["priority"], string> = {
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700"
};

const priorityIconClassNames: Record<DashboardPriorityFlag["priority"], string> = {
  medium: "text-orange-500",
  high: "text-red-500"
};
