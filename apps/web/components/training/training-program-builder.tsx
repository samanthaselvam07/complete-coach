"use client";

import { ArrowLeft, Copy, GripVertical, PlayCircle, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

import { muscleGroups, type Exercise } from "@/lib/training/training-models";
import { cn } from "@/lib/utils";

import { AnatomicalFilterMultiSelect } from "./anatomical-filter-multi-select";
import { MuscleVolumeHeatmap } from "./muscle-volume-heatmap";
import type { ProgramTemplateCard } from "./training-programs-page";

export type CreationDialogMode = "choice" | "template";
export type TrainingProgramSection = "warmUp" | "workout" | "coolDown";

export interface TrainingProgramExerciseDraft {
  id: string;
  exerciseId?: string;
  section: TrainingProgramSection;
  exerciseName: string;
  sets: string;
  reps: string;
  rpe: string;
  rir: string;
  restSeconds: string;
  bodyPart?: string;
  primaryMuscles?: string[];
  customVideoUrl?: string;
  customVideoFileName?: string;
  exerciseVideoObjectKey?: string;
  exerciseImageObjectKey?: string;
}

export interface TrainingProgramDayDraft {
  id: string;
  name: string;
  exercises: TrainingProgramExerciseDraft[];
}

export interface TrainingProgramDraft {
  sourceTemplateId?: string | null;
  title: string;
  tags: string;
  durationWeeks: string;
  overview: string;
  instructions: string;
  activeDayId: string;
  days: TrainingProgramDayDraft[];
}

export interface TrainingProgramTemplateDraftSource {
  id?: string | null;
  name: string;
  description?: string | null;
  goal?: string | null;
  durationWeeks?: number;
  template: {
    days?: Array<{
      name: string;
      exercises: Array<{
        exerciseId?: string;
        exerciseName: string;
        sets: number;
        reps: string;
        restSeconds?: number;
        rpe?: string;
        rir?: string;
        section?: TrainingProgramSection;
        videoObjectKey?: string;
        imageObjectKey?: string;
        primaryMuscles?: string[];
      }>;
    }>;
    instructions?: string;
  };
}

interface ApiExercise {
  id: string;
  name: string;
  category: string;
  scope: "global" | "private";
  equipment: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  videoObjectKey: string | null;
  videoUrl?: string | null;
  imageObjectKey?: string | null;
  primaryMuscles: string[];
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultRestSeconds?: number | null;
  defaultRpe?: number | null;
  defaultRir?: string | null;
  executionCues?: string[];
}

type BuilderExerciseLibraryItem = ApiExercise | Exercise;

export interface CustomExerciseInput {
  exerciseName: string;
  bodyPart: string;
  primaryMuscles: string[];
  sets: string;
  reps: string;
  restSeconds: string;
  rpe: string;
  rir: string;
  videoUrl?: string;
  videoObjectKey?: string;
  videoFileName?: string;
}

export interface CustomExerciseApiPayload {
  name: string;
  category: string;
  primaryMuscles: string[];
  difficulty: "intermediate";
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
  defaultRpe?: number;
  defaultRir?: string;
  videoUrl?: string;
  videoObjectKey?: string;
  executionCues?: string[];
}

interface ExerciseMediaUploadResponse {
  data?: {
    objectKey: string;
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
  };
  error?: {
    message?: string;
  };
}

interface ExerciseVideoPreviewResponse {
  data?: {
    mediaType: "video" | "image";
    source: "uploaded" | "external";
    url: string;
    expiresAt: string | null;
  };
}

const builderFieldClassName =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-950 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function CreateProgramDialog({
  mode,
  templates,
  canUseTemplates,
  onModeChange,
  onClose,
  onStartScratch,
  onUseTemplate
}: {
  mode: CreationDialogMode;
  templates: ProgramTemplateCard[];
  canUseTemplates: boolean;
  onModeChange: (mode: CreationDialogMode) => void;
  onClose: () => void;
  onStartScratch: () => void;
  onUseTemplate: (template: ProgramTemplateCard) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-program-title"
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-program-title" className="text-2xl font-bold text-gray-900">
              How do you want to create this program?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Start with a blank canvas or duplicate a saved template and edit the training details.
            </p>
          </div>
          <button type="button" className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>

        {mode === "choice" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              aria-label="Create From Template"
              className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-left transition-colors hover:border-indigo-500"
              onClick={() => onModeChange("template")}
            >
              <Copy className="mb-4 size-6 text-indigo-600" aria-hidden="true" />
              <span className="block text-lg font-semibold text-gray-900">Create From Template</span>
              <span className="mt-2 block text-sm text-gray-600">
                Duplicate an existing template, then adjust exercises, order, sets, reps, RPE, RIR and rest.
              </span>
            </button>
            <button
              type="button"
              aria-label="Start From Scratch"
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-indigo-500"
              onClick={onStartScratch}
            >
              <Plus className="mb-4 size-6 text-indigo-600" aria-hidden="true" />
              <span className="block text-lg font-semibold text-gray-900">Start From Scratch</span>
              <span className="mt-2 block text-sm text-gray-600">
                Open a blank program canvas with warm up, workout, cool down, days and instructions.
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <button type="button" className="mb-4 text-sm font-medium text-indigo-600" onClick={() => onModeChange("choice")}>
              Back to options
            </button>
            {!canUseTemplates ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Template duplication needs persisted templates from the program library.
              </p>
            ) : null}
            <div className="grid gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-label={`Duplicate ${template.name}`}
                  disabled={!canUseTemplates || !template.apiTemplate}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onUseTemplate(template)}
                >
                  <span className="block font-semibold text-gray-900">Duplicate {template.name}</span>
                  <span className="mt-1 block text-sm text-gray-600">
                    {template.weeks} weeks · {template.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function TrainingProgramBuilder({
  draft,
  saving,
  onDraftChange,
  onCancel,
  onSave,
  onSaveAsTemplate,
  onSaveDayAsTemplate
}: {
  draft: TrainingProgramDraft;
  saving: boolean;
  onDraftChange: (draft: TrainingProgramDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  onSaveAsTemplate: () => void;
  onSaveDayAsTemplate: (draft: TrainingProgramDraft) => Promise<void>;
}) {
  const activeDay = draft.days.find((day) => day.id === draft.activeDayId) ?? draft.days[0];
  const [exercisePanelSection, setExercisePanelSection] = useState<TrainingProgramSection | null>(null);
  const [customExerciseSection, setCustomExerciseSection] = useState<TrainingProgramSection | null>(null);
  const [dayTemplateMessage, setDayTemplateMessage] = useState<string | null>(null);

  function updateDraft(updates: Partial<TrainingProgramDraft>) {
    onDraftChange({ ...draft, ...updates });
  }

  function updateActiveDay(updates: Partial<TrainingProgramDayDraft>) {
    onDraftChange({
      ...draft,
      days: draft.days.map((day) => (day.id === activeDay.id ? { ...day, ...updates } : day))
    });
  }

  function addTrainingDay() {
    const dayNumber = draft.days.length + 1;
    const newDay = createBlankTrainingDay(dayNumber);
    onDraftChange({
      ...draft,
      activeDayId: newDay.id,
      days: [...draft.days, newDay]
    });
  }

  function duplicateActiveDay() {
    const activeDayIndex = draft.days.findIndex((day) => day.id === activeDay.id);
    const duplicatedDay = duplicateTrainingDay(activeDay, draft.days.length + 1, `${activeDay.name || "Day"} Copy`);
    const nextDays = [...draft.days];
    nextDays.splice(activeDayIndex + 1, 0, duplicatedDay);

    onDraftChange({
      ...draft,
      activeDayId: duplicatedDay.id,
      days: nextDays
    });
    setDayTemplateMessage(null);
  }

  function deleteActiveDay() {
    if (draft.days.length <= 1) {
      return;
    }

    const activeDayIndex = draft.days.findIndex((day) => day.id === activeDay.id);
    const remainingDays = draft.days.filter((day) => day.id !== activeDay.id);
    const nextActiveDay = remainingDays[Math.max(0, activeDayIndex - 1)] ?? remainingDays[0];

    onDraftChange({
      ...draft,
      activeDayId: nextActiveDay.id,
      days: remainingDays
    });
    setDayTemplateMessage(null);
  }

  async function saveActiveDayAsTemplate() {
    setDayTemplateMessage(null);
    try {
      await onSaveDayAsTemplate(createTrainingProgramDraftForDayTemplate(draft, activeDay));
      setDayTemplateMessage(`${activeDay.name || "Training day"} saved as a template.`);
    } catch {
      setDayTemplateMessage("Day template could not be saved.");
    }
  }

  function addExercise(
    section: TrainingProgramSection,
    exerciseName = "",
    customInput: Partial<CustomExerciseInput> & {
      exerciseId?: string;
      bodyPart?: string;
      primaryMuscles?: string[];
      exerciseVideoObjectKey?: string;
      exerciseImageObjectKey?: string;
    } = {}
  ) {
    const sectionExerciseCount = activeDay.exercises.filter((exercise) => exercise.section === section).length + 1;

    updateActiveDay({
      exercises: [
        ...activeDay.exercises,
        {
          id: `${activeDay.id}-${section}-${sectionExerciseCount}`,
          exerciseId: customInput.exerciseId,
          section,
          exerciseName,
          sets: customInput.sets || "3",
          reps: customInput.reps || "8-10",
          rpe: customInput.rpe || "",
          rir: customInput.rir || "",
          restSeconds: customInput.restSeconds || "120",
          bodyPart: customInput.bodyPart,
          primaryMuscles: customInput.primaryMuscles ?? [],
          customVideoUrl: customInput.videoUrl,
          customVideoFileName: customInput.videoFileName,
          exerciseVideoObjectKey: customInput.exerciseVideoObjectKey,
          exerciseImageObjectKey: customInput.exerciseImageObjectKey
        }
      ]
    });
  }

  function openExercisePanel(section: TrainingProgramSection) {
    setExercisePanelSection(section);
  }

  function addLibraryExercise(section: TrainingProgramSection, exercise: BuilderExerciseLibraryItem) {
    addExercise(section, exercise.name, getBuilderExerciseDropPayload(exercise));
  }

  async function addCustomExercise(section: TrainingProgramSection, input: CustomExerciseInput) {
    let savedExercise: ApiExercise | null;

    try {
      savedExercise = await createOrganizationExercise(input);
    } catch {
      savedExercise = null;
    }

    addExercise(section, savedExercise?.name ?? input.exerciseName, {
      exerciseId: savedExercise?.id,
      sets: input.sets,
      reps: input.reps,
      restSeconds: input.restSeconds,
      rpe: input.rpe,
      rir: input.rir,
      videoUrl: input.videoUrl,
      videoFileName: input.videoFileName,
      exerciseVideoObjectKey: savedExercise?.videoObjectKey ?? input.videoObjectKey,
      bodyPart: savedExercise?.category ?? input.bodyPart,
      primaryMuscles: savedExercise?.primaryMuscles ?? input.primaryMuscles
    });
    setCustomExerciseSection(null);
  }

  function updateExercise(exerciseId: string, updates: Partial<TrainingProgramExerciseDraft>) {
    updateActiveDay({
      exercises: activeDay.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, ...updates } : exercise))
    });
  }

  function deleteExercise(exerciseId: string) {
    updateActiveDay({
      exercises: activeDay.exercises.filter((exercise) => exercise.id !== exerciseId)
    });
  }

  function moveExercise(exerciseId: string, targetExerciseId: string) {
    if (exerciseId === targetExerciseId) {
      return;
    }

    const exerciseToMove = activeDay.exercises.find((exercise) => exercise.id === exerciseId);
    const targetExercise = activeDay.exercises.find((exercise) => exercise.id === targetExerciseId);

    if (!exerciseToMove || !targetExercise || exerciseToMove.section !== targetExercise.section) {
      return;
    }

    const exercisesWithoutMovedItem = activeDay.exercises.filter((exercise) => exercise.id !== exerciseId);
    const targetIndex = exercisesWithoutMovedItem.findIndex((exercise) => exercise.id === targetExerciseId);

    if (targetIndex < 0) {
      return;
    }

    const nextExercises = [...exercisesWithoutMovedItem];
    nextExercises.splice(targetIndex, 0, exerciseToMove);

    updateActiveDay({ exercises: nextExercises });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <button
              type="button"
              aria-label="Back to program library"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              onClick={onCancel}
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Complete Coach Builder</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Create a Program</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Design a branded training blueprint with editable days, sections, exercises, sets, reps, RPE, RIR and rest timing.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Upload className="size-4" aria-hidden="true" />
            Upload doc
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid items-start gap-5 transition-[grid-template-columns]",
          exercisePanelSection ? "xl:grid-cols-[minmax(0,1fr)_380px]" : "xl:grid-cols-1"
        )}
      >
        <form
          role="main"
          aria-label="Program builder canvas"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-800">
              Program Title <span className="text-red-500">*</span>
              <input
                required
                value={draft.title}
                placeholder="Enter Program Title"
                className={builderFieldClassName}
                onChange={(event) => updateDraft({ title: event.target.value })}
              />
            </label>
            <label className="text-sm font-bold text-slate-800">
              Tags
              <input
                value={draft.tags}
                placeholder="Enter Tags"
                className={builderFieldClassName}
                onChange={(event) => updateDraft({ tags: event.target.value })}
              />
            </label>
          </div>

          <label className="mt-5 block max-w-xs text-sm font-bold text-slate-800">
            Program Duration
            <span className="ml-1 text-xs font-medium text-slate-500">(weeks)</span>
            <input
              type="number"
              min="1"
              max="104"
              value={draft.durationWeeks}
              placeholder="Enter duration"
              className={builderFieldClassName}
              onChange={(event) => updateDraft({ durationWeeks: event.target.value })}
            />
          </label>

          <label className="mt-5 block text-sm font-bold text-slate-800">
            Program Overview
            <textarea
              value={draft.overview}
              placeholder="Enter Program Overview"
              rows={4}
              className={builderFieldClassName}
              onChange={(event) => updateDraft({ overview: event.target.value })}
            />
          </label>

          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-2 xl:flex-row xl:items-center xl:justify-between">
            <div role="tablist" aria-label="Training days" className="flex min-w-0 flex-wrap items-center gap-1">
              {draft.days.map((day, dayIndex) => (
                <button
                  key={day.id}
                  type="button"
                  role="tab"
                  aria-selected={day.id === draft.activeDayId}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
                    day.id === draft.activeDayId ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                  )}
                  onClick={() => updateDraft({ activeDayId: day.id })}
                >
                  {day.name || `Day ${dayIndex + 1}`}
                </button>
              ))}
              <button
                type="button"
                aria-label="Add training day"
                className="rounded-xl p-2 text-indigo-600 transition-colors hover:bg-white"
                onClick={addTrainingDay}
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100"
                onClick={duplicateActiveDay}
              >
                <Copy className="size-4" aria-hidden="true" />
                Duplicate day
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => void saveActiveDayAsTemplate()}
              >
                <Save className="size-4" aria-hidden="true" />
                {saving ? "Saving..." : "Save day as template"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={draft.days.length <= 1}
                onClick={deleteActiveDay}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete day
              </button>
            </div>
          </div>

          <label className="mt-5 block max-w-2xl text-sm font-bold text-slate-800">
            Day Name <span className="text-red-500">*</span>
            <input
              required
              value={activeDay.name}
              placeholder="Enter Day Name"
              className={builderFieldClassName}
              onChange={(event) => updateActiveDay({ name: event.target.value })}
            />
          </label>

          {dayTemplateMessage ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {dayTemplateMessage}
            </p>
          ) : null}

          <div className="mt-5">
            <MuscleVolumeHeatmap activeDay={activeDay} />
          </div>

          {(["warmUp", "workout", "coolDown"] as TrainingProgramSection[]).map((section) => (
            <ProgramBuilderSection
              key={section}
              section={section}
              exercises={activeDay.exercises.filter((exercise) => exercise.section === section)}
              onAddExercise={() => openExercisePanel(section)}
              onExerciseChange={updateExercise}
              onExerciseDelete={deleteExercise}
              onExerciseDrop={(exerciseName, metadata) => addExercise(section, exerciseName, metadata)}
              onExerciseMove={moveExercise}
            />
          ))}

          <label className="mt-5 block text-sm font-bold text-slate-800">
            Workout Instructions
            <textarea
              value={draft.instructions}
              placeholder="Enter Workout Instructions"
              rows={5}
              className={builderFieldClassName}
              onChange={(event) => updateDraft({ instructions: event.target.value })}
            />
          </label>

          <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 disabled:opacity-60"
              disabled={saving}
              onClick={onSaveAsTemplate}
            >
              {saving ? "Saving..." : "Save as Template"}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save & Close"}
            </button>
          </div>
        </form>

        {exercisePanelSection ? (
          <ExerciseDatabaseSidePanel
            activeSection={exercisePanelSection}
            onClose={() => setExercisePanelSection(null)}
            onAddManual={() => setCustomExerciseSection(exercisePanelSection)}
            onAddExercise={(exercise) => addLibraryExercise(exercisePanelSection, exercise)}
          />
        ) : null}
      </div>

      {customExerciseSection ? (
        <CustomExerciseDialog
          section={customExerciseSection}
          onClose={() => setCustomExerciseSection(null)}
          onCreate={(input) => addCustomExercise(customExerciseSection, input)}
        />
      ) : null}
    </div>
  );
}

export function createBlankTrainingProgramDraft(): TrainingProgramDraft {
  const firstDay = createBlankTrainingDay(1);

  return {
    sourceTemplateId: null,
    title: "",
    tags: "",
    durationWeeks: "8",
    overview: "",
    instructions: "",
    activeDayId: firstDay.id,
    days: [firstDay]
  };
}

export function createTrainingProgramDraftFromTemplate(
  template: TrainingProgramTemplateDraftSource,
  options: { copy?: boolean } = {}
): TrainingProgramDraft {
  const days =
    template.template.days?.map((day, dayIndex) => ({
      id: `day-${dayIndex + 1}`,
      name: day.name || `Day ${dayIndex + 1}`,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        id: `exercise-${dayIndex + 1}-${exerciseIndex + 1}`,
        exerciseId: exercise.exerciseId,
        section: exercise.section ?? "workout",
        exerciseName: exercise.exerciseName,
        sets: String(exercise.sets),
        reps: exercise.reps,
        rpe: exercise.rpe ?? "",
        rir: exercise.rir ?? "",
        restSeconds: String(exercise.restSeconds ?? ""),
        exerciseVideoObjectKey: exercise.videoObjectKey,
        exerciseImageObjectKey: exercise.imageObjectKey,
        primaryMuscles: exercise.primaryMuscles ?? []
      }))
    })) ?? [];
  const firstDay = days[0] ?? createBlankTrainingDay(1);

  return {
    sourceTemplateId: options.copy === false ? template.id ?? null : null,
    title: options.copy === false ? template.name : `${template.name} Copy`,
    tags: template.goal ?? "",
    durationWeeks: String(template.durationWeeks ?? Math.max(1, days.length)),
    overview: template.description ?? "",
    instructions: template.template.instructions ?? "",
    activeDayId: firstDay.id,
    days: days.length > 0 ? days : [firstDay]
  };
}

export function duplicateTrainingDay(
  day: TrainingProgramDayDraft,
  dayNumber: number,
  name = `${day.name || `Day ${dayNumber}`} Copy`
): TrainingProgramDayDraft {
  const nextDayId = `day-${dayNumber}-${Date.now()}`;

  return {
    id: nextDayId,
    name,
    exercises: day.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      id: `${nextDayId}-${exercise.section}-${exerciseIndex + 1}`
    }))
  };
}

export function createTrainingProgramDraftForDayTemplate(
  draft: TrainingProgramDraft,
  day: TrainingProgramDayDraft
): TrainingProgramDraft {
  const dayName = day.name.trim() || "Training Day";
  const programTitle = draft.title.trim();

  return {
    ...draft,
    sourceTemplateId: null,
    title: programTitle ? `${programTitle} - ${dayName}` : dayName,
    durationWeeks: "1",
    activeDayId: day.id,
    days: [day]
  };
}

export function getTrainingProgramTemplatePayload(
  draft: TrainingProgramDraft,
  fallbackIndex: number,
  options: { status?: "draft" | "published"; goal?: string; description?: string } = {}
) {
  const title = draft.title.trim() || `Strength Template ${fallbackIndex}`;
  const description = options.description ?? (draft.overview.trim() || "Coach-created template from the program library.");
  const goal = options.goal ?? (draft.tags.trim() || "custom");

  return {
    name: title,
    description,
    goal,
    durationWeeks: parsePositiveInteger(draft.durationWeeks, Math.max(1, draft.days.length)),
    status: options.status ?? "draft",
    template: {
      days: draft.days.map((day, dayIndex) => ({
        name: day.name.trim() || `Day ${dayIndex + 1}`,
        exercises: day.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId ?? "manual-entry",
          exerciseName: exercise.exerciseName.trim() || "Manual Exercise",
          sets: parsePositiveInteger(exercise.sets, 3),
          reps: exercise.reps.trim() || "8-10",
          rpe: exercise.rpe.trim(),
          rir: exercise.rir.trim(),
          restSeconds: parsePositiveInteger(exercise.restSeconds, 120),
          section: exercise.section,
          ...(exercise.exerciseVideoObjectKey ? { videoObjectKey: exercise.exerciseVideoObjectKey } : {}),
          ...(exercise.exerciseImageObjectKey ? { imageObjectKey: exercise.exerciseImageObjectKey } : {}),
          primaryMuscles: exercise.primaryMuscles ?? [],
          ...(buildCustomExerciseNotes(exercise) ? { notes: buildCustomExerciseNotes(exercise) } : {})
        }))
      })),
      instructions: draft.instructions.trim()
    }
  };
}

function ProgramBuilderSection({
  section,
  exercises,
  onAddExercise,
  onExerciseDrop,
  onExerciseChange,
  onExerciseDelete,
  onExerciseMove
}: {
  section: TrainingProgramSection;
  exercises: TrainingProgramExerciseDraft[];
  onAddExercise: () => void;
  onExerciseDrop: (
    exerciseName: string,
    metadata?: Partial<CustomExerciseInput> & {
      exerciseId?: string;
      bodyPart?: string;
      primaryMuscles?: string[];
      exerciseVideoObjectKey?: string;
      exerciseImageObjectKey?: string;
    }
  ) => void;
  onExerciseChange: (exerciseId: string, updates: Partial<TrainingProgramExerciseDraft>) => void;
  onExerciseDelete: (exerciseId: string) => void;
  onExerciseMove: (exerciseId: string, targetExerciseId: string) => void;
}) {
  const sectionLabel = getProgramSectionLabel(section);
  const [selectedVideoExercise, setSelectedVideoExercise] = useState<TrainingProgramExerciseDraft | null>(null);

  return (
    <>
      <div
        className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const exercisePayload = parseBuilderExerciseDropPayload(event.dataTransfer.getData("application/x-complete-coach-library-exercise"));
          const exerciseName = event.dataTransfer.getData("text/plain");

          if (exercisePayload) {
            onExerciseDrop(exercisePayload.exerciseName, exercisePayload);
          } else if (exerciseName) {
            onExerciseDrop(exerciseName);
          }
        }}
      >
        <h2 className="mb-3 text-sm font-black text-slate-900">{sectionLabel}</h2>
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              role="group"
              aria-label={`${exercise.exerciseName || "Untitled exercise"} exercise row`}
              draggable
              className="grid cursor-grab gap-3 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm active:cursor-grabbing lg:grid-cols-[2.5rem_4.5rem_minmax(12rem,2fr)_repeat(5,minmax(4.25rem,1fr))_2.5rem]"
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-complete-coach-exercise-id", exercise.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const exerciseId = event.dataTransfer.getData("application/x-complete-coach-exercise-id");

                if (exerciseId) {
                  onExerciseMove(exerciseId, exercise.id);
                }
              }}
            >
              <button
                type="button"
                aria-label={`Move ${exercise.exerciseName || "untitled"} exercise`}
                className="mt-6 inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <GripVertical className="size-4" aria-hidden="true" />
              </button>
              <ExerciseVideoThumbnail exercise={exercise} onView={() => setSelectedVideoExercise(exercise)} />
              <ExerciseField label="Exercise name" value={exercise.exerciseName} onChange={(exerciseName) => onExerciseChange(exercise.id, { exerciseName })} />
              <ExerciseField label="Sets" value={exercise.sets} inputMode="numeric" onChange={(sets) => onExerciseChange(exercise.id, { sets })} />
              <ExerciseField label="Reps" value={exercise.reps} onChange={(reps) => onExerciseChange(exercise.id, { reps })} />
              <ExerciseField label="RPE" value={exercise.rpe} onChange={(rpe) => onExerciseChange(exercise.id, { rpe })} />
              <ExerciseField label="RIR" value={exercise.rir} onChange={(rir) => onExerciseChange(exercise.id, { rir })} />
              <ExerciseField label="Rest time" value={exercise.restSeconds} inputMode="numeric" onChange={(restSeconds) => onExerciseChange(exercise.id, { restSeconds })} />
              <button
                type="button"
                aria-label={`Delete ${exercise.exerciseName || "untitled exercise"}`}
                className="mt-6 inline-flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"
                onClick={() => onExerciseDelete(exercise.id)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label={`Add ${sectionLabel.toLowerCase()} exercise`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-4 text-sm font-bold text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-100"
          onClick={onAddExercise}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add an Exercise
        </button>
      </div>
      {selectedVideoExercise ? <ExerciseVideoDialog exercise={selectedVideoExercise} onClose={() => setSelectedVideoExercise(null)} /> : null}
    </>
  );
}

function ExerciseVideoThumbnail({ exercise, onView }: { exercise: TrainingProgramExerciseDraft; onView: () => void }) {
  const hasVideoReference = Boolean(exercise.customVideoUrl || exercise.customVideoFileName || exercise.exerciseVideoObjectKey);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadThumbnailUrl() {
      if (!exercise.exerciseId || !exercise.exerciseImageObjectKey) {
        return;
      }

      try {
        const response = await fetch(`/api/v1/exercises/${exercise.exerciseId}/media-url?type=image`);
        const payload = (await response.json()) as ExerciseVideoPreviewResponse;

        if (active && response.ok && payload.data?.url) {
          setThumbnailUrl(payload.data.url);
        }
      } catch {
        if (active) {
          setThumbnailUrl(null);
        }
      }
    }

    void loadThumbnailUrl();

    return () => {
      active = false;
    };
  }, [exercise.exerciseId, exercise.exerciseImageObjectKey]);

  if (!hasVideoReference) {
    return (
      <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-[0.65rem] font-black uppercase tracking-wide text-slate-400">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <span className="absolute inset-0 bg-white/50" aria-hidden="true" />
        <PlayCircle className="relative size-4" aria-hidden="true" />
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`View ${exercise.exerciseName || "untitled"} exercise video`}
      className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl border border-indigo-200 bg-indigo-950 text-center text-[0.65rem] font-black uppercase tracking-wide text-white shadow-sm transition hover:border-indigo-400 hover:brightness-110"
      onClick={(event) => {
        event.stopPropagation();
        onView();
      }}
    >
      {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      <span className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />
      <span className="relative grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur-sm" aria-hidden="true">
        <PlayCircle className="size-5" />
      </span>
    </button>
  );
}

function ExerciseVideoDialog({ exercise, onClose }: { exercise: TrainingProgramExerciseDraft; onClose: () => void }) {
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoError, setUploadedVideoError] = useState<string | null>(null);
  const embedUrl = getEmbeddableExerciseVideoUrl(exercise.customVideoUrl);
  const hasVideoReference = Boolean(exercise.customVideoUrl || exercise.customVideoFileName || exercise.exerciseVideoObjectKey);

  useEffect(() => {
    let active = true;

    async function loadUploadedVideoUrl() {
      if (!exercise.exerciseId || !exercise.exerciseVideoObjectKey || exercise.customVideoUrl) {
        return;
      }

      try {
        const response = await fetch(`/api/v1/exercises/${exercise.exerciseId}/media-url`);
        const payload = (await response.json()) as ExerciseVideoPreviewResponse;

        if (!response.ok || !payload.data?.url) {
          throw new Error("Exercise video is unavailable.");
        }

        if (active) {
          setUploadedVideoUrl(payload.data.url);
        }
      } catch {
        if (active) {
          setUploadedVideoError("Exercise video is unavailable right now.");
        }
      }
    }

    void loadUploadedVideoUrl();

    return () => {
      active = false;
    };
  }, [exercise.customVideoUrl, exercise.exerciseId, exercise.exerciseVideoObjectKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-video-dialog-title"
        className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Exercise video</p>
            <h2 id="exercise-video-dialog-title" className="mt-1 text-2xl font-black text-slate-950">
              {exercise.exerciseName || "Exercise"} exercise video
            </h2>
          </div>
          <button type="button" aria-label="Close exercise video" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {uploadedVideoUrl ? (
          <video
            controls
            title={`${exercise.exerciseName || "Exercise"} video`}
            src={uploadedVideoUrl}
            className="mt-5 aspect-video w-full rounded-2xl border border-slate-200 bg-slate-950"
          >
            <track kind="captions" />
          </video>
        ) : embedUrl ? (
          <iframe
            title={`${exercise.exerciseName || "Exercise"} video`}
            src={embedUrl}
            className="mt-5 aspect-video w-full rounded-2xl border border-slate-200 bg-slate-950"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="mt-5 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            {uploadedVideoError ? (
              <span>{uploadedVideoError}</span>
            ) : hasVideoReference ? (
              <span>
                {exercise.customVideoFileName
                  ? `${exercise.customVideoFileName} attached`
                  : exercise.exerciseVideoObjectKey
                    ? "Loading uploaded exercise video..."
                    : "External video attached. Open source to view."}
              </span>
            ) : (
              <span>No video attached yet.</span>
            )}
          </div>
        )}

        {exercise.customVideoUrl ? (
          <a
            href={exercise.customVideoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
            onClick={(event) => event.stopPropagation()}
          >
            Open source
          </a>
        ) : null}
      </section>
    </div>
  );
}

function CustomExerciseDialog({
  section,
  onClose,
  onCreate
}: {
  section: TrainingProgramSection;
  onClose: () => void;
  onCreate: (input: CustomExerciseInput) => Promise<void>;
}) {
  const [exerciseName, setExerciseName] = useState("");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([muscleGroups[0] ?? "Pectoralis Major"]);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-10");
  const [restSeconds, setRestSeconds] = useState("120");
  const [rpe, setRpe] = useState("");
  const [rir, setRir] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sectionLabel = getProgramSectionLabel(section);

  async function handleCreate() {
    setSaving(true);
    setErrorMessage("");

    try {
      const primaryMuscles = selectedMuscles.length > 0 ? selectedMuscles : [muscleGroups[0] ?? "Pectoralis Major"];

      let videoObjectKey: string | undefined;
      let uploadedVideoFileName: string | undefined;

      if (videoFile) {
        try {
          videoObjectKey = await uploadCustomExerciseVideo(videoFile);
          uploadedVideoFileName = videoFileName || videoFile.name;
        } catch {
          videoObjectKey = undefined;
          uploadedVideoFileName = undefined;
        }
      }

      await onCreate({
        exerciseName: exerciseName.trim(),
        bodyPart: primaryMuscles[0] ?? "Pectoralis Major",
        primaryMuscles,
        sets: sets.trim() || "3",
        reps: reps.trim() || "8-10",
        restSeconds: restSeconds.trim() || "120",
        rpe: rpe.trim(),
        rir: rir.trim(),
        videoUrl: videoUrl.trim() || undefined,
        videoObjectKey,
        videoFileName: uploadedVideoFileName
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Custom exercise could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-exercise-title"
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Add to {sectionLabel}</p>
            <h2 id="custom-exercise-title" className="mt-1 text-2xl font-black text-slate-950">
              Add custom exercise
            </h2>
            <p className="mt-2 text-sm text-slate-500">Save this movement to your organization exercise database and add it to the current program.</p>
          </div>
          <button type="button" aria-label="Close custom exercise dialog" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {errorMessage ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}
          <label className="block text-sm font-bold text-slate-800">
            Exercise name
            <input
              value={exerciseName}
              placeholder="e.g. Single Leg Squat"
              className={builderFieldClassName}
              onChange={(event) => setExerciseName(event.target.value)}
            />
          </label>

          <AnatomicalFilterMultiSelect
            selectedMuscles={selectedMuscles}
            onChange={setSelectedMuscles}
            helperText="Select every anatomical target this exercise should light up in the heatmap."
          />

          <div className="grid gap-3 md:grid-cols-5">
            <label className="text-sm font-bold text-slate-800">
              Sets
              <input value={sets} inputMode="numeric" className={builderFieldClassName} onChange={(event) => setSets(event.target.value)} />
            </label>
            <label className="text-sm font-bold text-slate-800">
              Reps
              <input value={reps} className={builderFieldClassName} onChange={(event) => setReps(event.target.value)} />
            </label>
            <label className="text-sm font-bold text-slate-800">
              Rest time
              <input value={restSeconds} inputMode="numeric" className={builderFieldClassName} onChange={(event) => setRestSeconds(event.target.value)} />
            </label>
            <label className="text-sm font-bold text-slate-800">
              RPE
              <input value={rpe} inputMode="numeric" className={builderFieldClassName} onChange={(event) => setRpe(event.target.value)} />
            </label>
            <label className="text-sm font-bold text-slate-800">
              RIR
              <input value={rir} inputMode="numeric" className={builderFieldClassName} onChange={(event) => setRir(event.target.value)} />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-800">
            YouTube or external video link
            <input
              type="url"
              value={videoUrl}
              placeholder="https://youtube.com/..."
              className={builderFieldClassName}
              onChange={(event) => setVideoUrl(event.target.value)}
            />
          </label>

          <label className="block rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 p-4 text-sm font-bold text-indigo-700">
            <span className="flex items-center gap-2">
              <Upload className="size-4" aria-hidden="true" />
              Upload exercise video
            </span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="mt-3 block w-full text-sm font-medium text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-indigo-700"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;

                setVideoFile(file);
                setVideoFileName(file?.name ?? "");
              }}
            />
            {videoFileName ? <span className="mt-2 block text-xs text-slate-500">{videoFileName}</span> : null}
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!exerciseName.trim() || saving}
            onClick={() => void handleCreate()}
          >
            {saving ? "Saving..." : "Add exercise"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ExerciseDatabaseSidePanel({
  activeSection,
  onClose,
  onAddManual,
  onAddExercise
}: {
  activeSection: TrainingProgramSection;
  onClose: () => void;
  onAddManual: () => void;
  onAddExercise: (exercise: BuilderExerciseLibraryItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const sectionLabel = getProgramSectionLabel(activeSection);
  const trimmedSearchQuery = searchQuery.trim();

  useEffect(() => {
    let active = true;

    if (!trimmedSearchQuery) {
      return () => {
        active = false;
      };
    }

    async function loadExercises() {
      setLoadingExercises(true);

      try {
        const params = new URLSearchParams({ limit: "20", search: trimmedSearchQuery, sort: "recent" });

        const response = await fetch(`/api/v1/exercises?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Exercise API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiExercise[] };

        if (active) {
          setApiExercises(payload.data ?? []);
        }
      } catch {
        if (active) {
          setApiExercises([]);
        }
      } finally {
        if (active) {
          setLoadingExercises(false);
        }
      }
    }

    void loadExercises();

    return () => {
      active = false;
    };
  }, [trimmedSearchQuery]);

  const sourceExercises: BuilderExerciseLibraryItem[] = apiExercises;
  const filteredExercises = trimmedSearchQuery ? sourceExercises : [];

  return (
    <aside
      role="complementary"
      aria-label="Exercise database panel"
      className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Add to {sectionLabel}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Exercise Database</h2>
            <p className="mt-1 text-sm text-slate-500">Search, drag, or tap to add exercises without covering the builder.</p>
          </div>
          <button type="button" aria-label="Close exercise database" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Search exercise database</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search movements..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100"
          onClick={onAddManual}
        >
          Add custom exercise
        </button>
      </div>

      <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-4">
        {!trimmedSearchQuery ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Search to add an exercise.</p>
        ) : null}
        {loadingExercises ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Preparing exercise database...</p> : null}
        {trimmedSearchQuery && !loadingExercises && filteredExercises.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No exercises match that search.</p>
        ) : null}
        {filteredExercises.map((exercise) => (
          <ExerciseSearchResult
            key={exercise.id}
            exercise={exercise}
            sectionLabel={sectionLabel}
            onAddExercise={onAddExercise}
          />
        ))}
      </div>
    </aside>
  );
}

function ExerciseSearchResult({
  exercise,
  sectionLabel,
  onAddExercise
}: {
  exercise: BuilderExerciseLibraryItem;
  sectionLabel: string;
  onAddExercise: (exercise: BuilderExerciseLibraryItem) => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const imageObjectKey = "imageObjectKey" in exercise ? exercise.imageObjectKey : null;

  useEffect(() => {
    let active = true;

    async function loadThumbnailUrl() {
      if (!imageObjectKey) {
        return;
      }

      try {
        const response = await fetch(`/api/v1/exercises/${exercise.id}/media-url?type=image`);
        const payload = (await response.json()) as ExerciseVideoPreviewResponse;

        if (active && response.ok && payload.data?.url) {
          setThumbnailUrl(payload.data.url);
        }
      } catch {
        if (active) {
          setThumbnailUrl(null);
        }
      }
    }

    void loadThumbnailUrl();

    return () => {
      active = false;
    };
  }, [exercise.id, imageObjectKey]);

  return (
    <button
      type="button"
      draggable
      aria-label={`Add ${exercise.name} to ${sectionLabel}`}
      className="grid w-full cursor-grab grid-cols-[1fr_3.5rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 active:cursor-grabbing"
      onClick={() => onAddExercise(exercise)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", exercise.name);
        event.dataTransfer.setData("application/x-complete-coach-library-exercise", JSON.stringify(getBuilderExerciseDropPayload(exercise)));
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <span className="min-w-0">
        <span className="block truncate font-black text-slate-900">{exercise.name}</span>
      </span>
      <span className="relative size-14 overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <span className="absolute inset-0 bg-slate-950/10" aria-hidden="true" />
      </span>
    </button>
  );
}

function ExerciseField({
  label,
  value,
  inputMode,
  onChange
}: {
  label: string;
  value: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      <input
        value={value}
        inputMode={inputMode}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function createBlankTrainingDay(dayNumber: number): TrainingProgramDayDraft {
  return {
    id: `day-${dayNumber}`,
    name: `Day ${dayNumber}`,
    exercises: []
  };
}

export function parsePositiveInteger(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function parseOptionalNumber(value: string) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function getEmbeddableExerciseVideoUrl(videoUrl?: string) {
  if (!videoUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(videoUrl);
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "vimeo.com") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function createOrganizationExercise(input: CustomExerciseInput): Promise<ApiExercise> {
  const response = await fetch("/api/v1/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getCustomExerciseApiPayload(input))
  });

  if (!response.ok) {
    throw new Error("Custom exercise could not be saved to the exercise database.");
  }

  const payload = (await response.json()) as { data?: ApiExercise };

  if (!payload.data) {
    throw new Error("Custom exercise save response was empty.");
  }

  return payload.data;
}

export function getCustomExerciseApiPayload(input: CustomExerciseInput): CustomExerciseApiPayload {
  const defaultRpe = parseOptionalNumber(input.rpe);
  const executionCues = [
    input.videoFileName ? `Uploaded video file: ${input.videoFileName}` : ""
  ].filter(Boolean);

  return {
    name: input.exerciseName,
    category: input.bodyPart,
    primaryMuscles: input.primaryMuscles.length > 0 ? input.primaryMuscles : [input.bodyPart],
    difficulty: "intermediate",
    defaultSets: parsePositiveInteger(input.sets, 3),
    defaultReps: input.reps.trim() || "8-10",
    defaultRestSeconds: parsePositiveInteger(input.restSeconds, 120),
    ...(defaultRpe !== null ? { defaultRpe } : {}),
    ...(input.rir.trim() ? { defaultRir: input.rir.trim() } : {}),
    ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
    ...(input.videoObjectKey ? { videoObjectKey: input.videoObjectKey } : {}),
    ...(executionCues.length > 0 ? { executionCues } : {})
  };
}

async function uploadCustomExerciseVideo(file: File) {
  const signedUrlResponse = await fetch("/api/v1/exercises/media-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaType: "video",
      filename: file.name,
      contentType: file.type,
      byteSize: file.size
    })
  });
  const signedUrlPayload = (await signedUrlResponse.json()) as ExerciseMediaUploadResponse;

  if (!signedUrlResponse.ok || !signedUrlPayload.data) {
    throw new Error(signedUrlPayload.error?.message ?? "Video upload could not be authorized.");
  }

  const uploadResponse = await fetch(signedUrlPayload.data.uploadUrl, {
    method: "PUT",
    headers: signedUrlPayload.data.requiredHeaders,
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error("Video upload failed.");
  }

  return signedUrlPayload.data.objectKey;
}

export function buildCustomExerciseNotes(exercise: TrainingProgramExerciseDraft) {
  const notes = [
    exercise.customVideoUrl ? `Video link: ${exercise.customVideoUrl}` : null,
    exercise.customVideoFileName ? `Uploaded video: ${exercise.customVideoFileName}` : null
  ].filter(Boolean);

  return notes.length > 0 ? notes.join("\n") : "";
}

export function getProgramSectionLabel(section: TrainingProgramSection) {
  const labels: Record<TrainingProgramSection, string> = {
    warmUp: "Warm up",
    workout: "Workout",
    coolDown: "Cool Down"
  };

  return labels[section];
}

export function getBuilderExerciseMeta(exercise: BuilderExerciseLibraryItem) {
  if ("variations" in exercise) {
    return `${exercise.category} - ${exercise.variations} variations`;
  }

  const muscles = exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.join(", ") : "No muscles tagged";
  const equipment = exercise.equipment ? `${exercise.equipment} - ` : "";

  return `${exercise.category} - ${equipment}${muscles}`;
}

export function getBuilderExerciseDropPayload(exercise: BuilderExerciseLibraryItem) {
  const exerciseRecord = exercise as BuilderExerciseLibraryItem & Record<string, unknown>;
  const primaryMuscles = getLegacyStringList(
    exerciseRecord.primaryMuscles ??
      exerciseRecord.primary_muscles ??
      exerciseRecord.muscleGroups ??
      exerciseRecord.muscle_groups ??
      exerciseRecord.bodyParts ??
      exerciseRecord.body_parts ??
      exerciseRecord.anatomicalFilter ??
      exerciseRecord.anatomical_filter ??
      exerciseRecord.targetMuscles ??
      exerciseRecord.target_muscles ??
      exerciseRecord.muscles
  );

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: getLegacyDefaultValue(exerciseRecord, "defaultSets", "default_sets") ?? "3",
    reps: getLegacyDefaultValue(exerciseRecord, "defaultReps", "default_reps") ?? "8-10",
    restSeconds: getLegacyDefaultValue(exerciseRecord, "defaultRestSeconds", "default_rest_seconds") ?? "120",
    rpe: getLegacyDefaultValue(exerciseRecord, "defaultRpe", "default_rpe") ?? "",
    rir: getLegacyDefaultValue(exerciseRecord, "defaultRir", "default_rir") ?? "",
    videoUrl: "videoUrl" in exercise && exercise.videoUrl ? exercise.videoUrl : undefined,
    exerciseVideoObjectKey: "videoObjectKey" in exercise && exercise.videoObjectKey ? exercise.videoObjectKey : undefined,
    exerciseImageObjectKey: "imageObjectKey" in exercise && exercise.imageObjectKey ? exercise.imageObjectKey : undefined,
    bodyPart: exercise.category,
    primaryMuscles: primaryMuscles.length > 0 ? primaryMuscles : [exercise.category]
  };
}

export function parseBuilderExerciseDropPayload(payload: string) {
  if (!payload) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(payload) as ReturnType<typeof getBuilderExerciseDropPayload>;

    return typeof parsedPayload.exerciseName === "string" ? parsedPayload : null;
  } catch {
    return null;
  }
}

function getLegacyDefaultValue(record: Record<string, unknown>, camelKey: string, snakeKey: string) {
  const value = record[camelKey] ?? record[snakeKey];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function getLegacyStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => getLegacyStringList(item));
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    if (trimmedValue.startsWith("[") || trimmedValue.startsWith("{")) {
      try {
        return getLegacyStringList(JSON.parse(trimmedValue) as unknown);
      } catch {
        return splitLegacyStringList(trimmedValue);
      }
    }

    return splitLegacyStringList(trimmedValue);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return getLegacyStringList(
      record.primaryMuscles ??
        record.primary_muscles ??
        record.muscleGroups ??
        record.muscle_groups ??
        record.bodyParts ??
        record.body_parts ??
        record.anatomicalFilter ??
        record.anatomical_filter ??
        record.targetMuscles ??
        record.target_muscles ??
        record.muscles ??
        record.values ??
        record.items
    );
  }

  return [];
}

function splitLegacyStringList(value: string) {
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
