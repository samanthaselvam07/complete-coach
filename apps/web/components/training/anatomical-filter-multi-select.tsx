"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { muscleGroups } from "@/lib/training/training-models";
import { cn } from "@/lib/utils";

interface AnatomicalFilterMultiSelectProps {
  selectedMuscles: string[];
  onChange: (selectedMuscles: string[]) => void;
  label?: string;
  helperText?: string;
  className?: string;
}

export function AnatomicalFilterMultiSelect({
  selectedMuscles,
  onChange,
  label = "Anatomical Filter",
  helperText,
  className
}: AnatomicalFilterMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedSet = new Set(selectedMuscles);
  const displayText = selectedMuscles.length > 0 ? `${selectedMuscles.length} selected` : "Select anatomical targets";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function toggleMuscle(muscle: string) {
    if (selectedSet.has(muscle)) {
      const nextSelectedMuscles = selectedMuscles.filter((selectedMuscle) => selectedMuscle !== muscle);
      onChange(nextSelectedMuscles.length > 0 ? nextSelectedMuscles : [muscleGroups[0] ?? muscle]);
      return;
    }

    onChange([...selectedMuscles, muscle]);
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <span className="block text-sm font-bold text-slate-800">{label}</span>
      {helperText ? <p className="mt-1 text-xs font-medium text-slate-500">{helperText}</p> : null}
      <button
        type="button"
        className="mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{displayText}</span>
        <ChevronDown className={cn("size-4 text-slate-400 transition", isOpen ? "rotate-180" : "")} aria-hidden="true" />
      </button>

      {selectedMuscles.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedMuscles.map((muscle) => (
            <span key={muscle} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              {muscle}
              {selectedMuscles.length > 1 ? (
                <button type="button" aria-label={`Remove ${muscle}`} className="rounded-full p-0.5 hover:bg-indigo-100" onClick={() => onChange(selectedMuscles.filter((selectedMuscle) => selectedMuscle !== muscle))}>
                  <X className="size-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl" role="listbox" aria-label={`${label} options`}>
          {muscleGroups.map((muscle) => (
            <label key={muscle} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-indigo-50">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={selectedSet.has(muscle)}
                onChange={() => toggleMuscle(muscle)}
              />
              <span>{muscle}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
