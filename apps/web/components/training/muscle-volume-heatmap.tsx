"use client";

import { useEffect, useMemo } from "react";
import { Activity } from "lucide-react";
import { Alignment, Fit, Layout, useRive, useViewModel, useViewModelInstance } from "@rive-app/react-canvas";

import type { TrainingProgramDayDraft } from "@/components/training/training-program-builder";
import {
  calculateTrainingDayMuscleVolume,
  fitnessVisualsRiveMuscleProperties,
  getActiveRiveMuscleProperties,
  type FitnessVisualsRiveMuscleProperty
} from "@/lib/training/muscle-volume";
import { cn } from "@/lib/utils";

interface MuscleVolumeHeatmapProps {
  activeDay: TrainingProgramDayDraft;
  variant?: "default" | "compact";
}

const fitnessVisualsRiveAssetPath = "/vendor/fitness-visuals/human_anatomy_basic.riv";
const fitnessVisualsRiveLayout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });

export function MuscleVolumeHeatmap({ activeDay, variant = "default" }: MuscleVolumeHeatmapProps) {
  const volumeRows = calculateTrainingDayMuscleVolume(activeDay);
  const activeVolumeRows = volumeRows.filter((row) => row.sets > 0);
  const activeRiveMuscles = getActiveRiveMuscleProperties(volumeRows);
  const totalSets = activeVolumeRows.reduce((total, row) => total + row.sets, 0);
  const isCompact = variant === "compact";
  const heatmapStateKey = `${activeDay.id}:${activeRiveMuscles.join("|")}`;

  return (
    <section
      aria-label={`${activeDay.name}${isCompact ? " compact" : ""} muscle volume heatmap`}
      className={cn("rounded-3xl border border-indigo-100 bg-indigo-50/50 shadow-sm", isCompact ? "p-3" : "p-4")}
    >
      <div className={cn("flex justify-between gap-3", isCompact ? "items-start" : "flex-col lg:flex-row lg:items-start")}>
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
            <Activity className="size-4" aria-hidden="true" />
            Anatomy volume
          </p>
          <h2 className={cn("mt-1 font-black text-slate-950", isCompact ? "text-base" : "text-xl")}>{activeDay.name} volume map</h2>
          <p className={cn("mt-1 text-slate-500", isCompact ? "hidden" : "text-sm")}>
            Live set distribution by muscle group for the selected training day.
          </p>
        </div>
        <div className={cn("rounded-2xl bg-white text-right shadow-sm", isCompact ? "px-3 py-2" : "px-4 py-3")}>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tracked sets</p>
          <p className={cn("font-black text-indigo-700", isCompact ? "text-xl" : "text-2xl")}>{totalSets}</p>
        </div>
      </div>

      <div className={cn("mt-4 grid gap-4", isCompact ? "" : "2xl:grid-cols-[minmax(18rem,0.7fr)_minmax(20rem,1fr)]")}>
        <div className="rounded-3xl border border-white bg-white p-3 shadow-sm">
          <FitnessVisualsRiveHeatmap key={heatmapStateKey} activeMuscles={activeRiveMuscles} variant={variant} />
        </div>

        <div className={cn("grid content-start gap-2", isCompact ? "" : "sm:grid-cols-2")}>
          {activeVolumeRows.length > 0 ? (
            activeVolumeRows.map((row) => (
              <div key={row.muscleGroup} className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", isCompact ? "p-2" : "p-3")}>
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("font-black text-slate-900", isCompact ? "text-sm" : "")}>{row.muscleGroup}</span>
                  <span className="text-sm font-black text-indigo-700">{row.sets} sets</span>
                </div>
                <div className={cn("h-2 rounded-full bg-slate-100", isCompact ? "mt-2" : "mt-3")}>
                  <div className={cn("h-2 rounded-full", getIntensityClassName(row.intensity))} style={{ width: `${Math.max(row.intensity * 100, 8)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className={cn("rounded-2xl border border-dashed border-indigo-200 bg-white text-sm text-slate-500", isCompact ? "p-3" : "p-4 sm:col-span-2")}>
              Add exercises with muscle tags to see where the day&apos;s training volume is going.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FitnessVisualsRiveHeatmap({ activeMuscles, variant }: { activeMuscles: FitnessVisualsRiveMuscleProperty[]; variant: "default" | "compact" }) {
  const activeMuscleSet = useMemo(() => new Set(activeMuscles), [activeMuscles]);
  const isCompact = variant === "compact";

  return (
    <div className={cn("grid gap-2 rounded-2xl bg-slate-950 p-2", isCompact ? "grid-cols-2" : "sm:grid-cols-2")}>
      <FitnessVisualsRiveArtboard artboard="Front" activeMuscleSet={activeMuscleSet} label="Front anatomy heatmap" variant={variant} />
      <FitnessVisualsRiveArtboard artboard="Back" activeMuscleSet={activeMuscleSet} label="Back anatomy heatmap" variant={variant} />
    </div>
  );
}

function FitnessVisualsRiveArtboard({
  artboard,
  activeMuscleSet,
  label,
  variant
}: {
  artboard: "Front" | "Back";
  activeMuscleSet: Set<FitnessVisualsRiveMuscleProperty>;
  label: string;
  variant: "default" | "compact";
}) {
  const { rive, RiveComponent } = useRive(
    {
      src: fitnessVisualsRiveAssetPath,
      artboard,
      autoplay: true,
      layout: fitnessVisualsRiveLayout,
      shouldDisableRiveListeners: true
    },
    {
      fitCanvasToArtboardHeight: false,
      shouldResizeCanvasToContainer: true,
      useOffscreenRenderer: true
    }
  );
  const viewModel = useViewModel(rive, { useDefault: true });
  const viewModelInstance = useViewModelInstance(viewModel, { useDefault: true, rive });

  useEffect(() => {
    if (!viewModelInstance) {
      return;
    }

    fitnessVisualsRiveMuscleProperties.forEach((muscleProperty) => {
      const muscleViewModel = viewModelInstance.viewModel(muscleProperty);
      const isOnProperty = muscleViewModel?.boolean("isOn");

      if (isOnProperty) {
        isOnProperty.value = activeMuscleSet.has(muscleProperty);
      }
    });
  }, [activeMuscleSet, viewModelInstance]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-black", variant === "compact" ? "h-44" : "h-[17rem]")}>
      <RiveComponent aria-label={`Fitness Visuals ${label}`} className="block size-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
        {artboard}
      </div>
    </div>
  );
}

function getIntensityClassName(intensity: number) {
  if (intensity >= 0.85) {
    return "bg-red-500";
  }

  if (intensity >= 0.55) {
    return "bg-orange-500";
  }

  if (intensity > 0) {
    return "bg-indigo-600";
  }

  return "bg-slate-200";
}
