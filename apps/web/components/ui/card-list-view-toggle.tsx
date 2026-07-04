"use client";

import { Grid2X2, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type CardListViewMode = "cards" | "list";

interface CardListViewToggleProps {
  value: CardListViewMode;
  onChange: (value: CardListViewMode) => void;
  label: string;
}

export function CardListViewToggle({ value, onChange, label }: CardListViewToggleProps) {
  const options = [
    { value: "cards" as const, label: "Cards", ariaLabel: "Card view", icon: Grid2X2 },
    { value: "list" as const, label: "List", ariaLabel: "List view", icon: List }
  ];

  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm" aria-label={label}>
      {options.map(({ value: optionValue, label: optionLabel, ariaLabel, icon: Icon }) => {
        const selected = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            aria-label={ariaLabel}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              selected ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
            onClick={() => onChange(optionValue)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
