import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  revenuePeriodOptions,
  type RevenueMetric,
  type RevenuePeriod
} from "@/fixtures/dashboard";

interface FinancialCardProps {
  currentPeriod: RevenuePeriod;
  metric: RevenueMetric;
  open: boolean;
  customStartDate: string;
  customEndDate: string;
  onToggleOpen: () => void;
  onSelectPeriod: (period: RevenuePeriod) => void;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
  onApplyCustomRange: () => void;
}

export function FinancialCard({
  currentPeriod,
  metric,
  open,
  customStartDate,
  customEndDate,
  onToggleOpen,
  onSelectPeriod,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onApplyCustomRange
}: FinancialCardProps) {
  return (
    <section className="relative rounded-xl border border-gray-200 bg-white p-6" aria-label="Revenue analytics">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">{metric.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-green-600">{metric.change}</span>
          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Change revenue period, currently ${currentPeriod}`}
              className="h-7 rounded-md bg-gray-100 px-2 text-xs capitalize hover:bg-gray-200"
              onClick={onToggleOpen}
            >
              {currentPeriod}
              <ChevronDown className="size-3" aria-hidden="true" />
            </Button>

            {open ? (
              <div
                role="menu"
                aria-label="Revenue period"
                className="absolute right-0 top-full z-20 mt-1 min-w-72 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {revenuePeriodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitem"
                    className={cn(
                      "block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50",
                      currentPeriod === option.value ? "bg-indigo-50 font-medium text-indigo-600" : "text-gray-700"
                    )}
                    onClick={() => onSelectPeriod(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                {currentPeriod === "custom" ? (
                  <div className="border-t border-gray-100 p-3" aria-label="Custom revenue date range">
                    <div className="grid gap-2">
                      <label className="grid gap-1 text-xs font-medium text-gray-700">
                        Custom revenue start date
                        <input
                          type="date"
                          value={customStartDate}
                          className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          onChange={(event) => onCustomStartDateChange(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-gray-700">
                        Custom revenue end date
                        <input
                          type="date"
                          value={customEndDate}
                          className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          onChange={(event) => onCustomEndDateChange(event.target.value)}
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-1 h-8 rounded-md bg-indigo-600 text-xs text-white hover:bg-indigo-700"
                        disabled={!customStartDate || !customEndDate}
                        onClick={onApplyCustomRange}
                      >
                        Apply custom dates
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-4 text-3xl font-bold">{metric.value}</div>
      <div className="flex h-16 items-end gap-1" aria-hidden="true">
        {metric.bars.map((height, index) => (
          <div
            key={`${metric.label}-${height}-${index}`}
            className={cn(
              "flex-1 rounded-t transition-all",
              index >= metric.bars.length - 2 ? "bg-indigo-600" : "bg-gray-200"
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </section>
  );
}
