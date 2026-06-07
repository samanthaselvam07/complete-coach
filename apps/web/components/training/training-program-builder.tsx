"use client";

import { ArrowLeft, Copy, Plus, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ApiTrainingTemplate, ProgramTemplateCard } from "./training-programs-page";

export type CreationDialogMode = "choice" | "template";
export type TrainingProgramSection = "warmUp" | "workout" | "coolDown";

export interface TrainingProgramExerciseDraft {
  id: string;
  section: TrainingProgramSection;
  exerciseName: string;
  sets: string;
  reps: string;
  rpe: string;
  rir: string;
  restSeconds: string;
}

export interface TrainingProgramDayDraft {
  id: string;
  name: string;
  exercises: TrainingProgramExerciseDraft[];
}

export interface TrainingProgramDraft {
  title: string;
  tags: string;
  overview: string;
  instructions: string;
  activeDayId: string;
  days: TrainingProgramDayDraft[];
}

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
                Template duplication needs the persisted program library. The app is currently showing fixture data.
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
  onSave
}: {
  draft: TrainingProgramDraft;
  saving: boolean;
  onDraftChange: (draft: TrainingProgramDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const activeDay = draft.days.find((day) => day.id === draft.activeDayId) ?? draft.days[0];

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

  function addExercise(section: TrainingProgramSection) {
    const sectionExerciseCount = activeDay.exercises.filter((exercise) => exercise.section === section).length + 1;

    updateActiveDay({
      exercises: [
        ...activeDay.exercises,
        {
          id: `${activeDay.id}-${section}-${sectionExerciseCount}`,
          section,
          exerciseName: "",
          sets: "3",
          reps: "8-10",
          rpe: "",
          rir: "",
          restSeconds: "120"
        }
      ]
    });
  }

  function updateExercise(exerciseId: string, updates: Partial<TrainingProgramExerciseDraft>) {
    updateActiveDay({
      exercises: activeDay.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, ...updates } : exercise))
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Back to program library" className="rounded-lg p-2 hover:bg-gray-100" onClick={onCancel}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Create a Program</h1>
        </div>
        <button type="button" className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Upload className="size-4" aria-hidden="true" />
          Upload doc
        </button>
      </div>

      <form
        className="rounded-xl border border-gray-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-gray-900">
            Program Title <span className="text-red-500">*</span>
            <input
              required
              value={draft.title}
              placeholder="Enter Program Title"
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(event) => updateDraft({ title: event.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-gray-900">
            Tags
            <input
              value={draft.tags}
              placeholder="Enter Tags"
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(event) => updateDraft({ tags: event.target.value })}
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-gray-900">
          Program Overview
          <textarea
            value={draft.overview}
            placeholder="Enter Program Overview"
            rows={4}
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) => updateDraft({ overview: event.target.value })}
          />
        </label>

        <div role="tablist" aria-label="Training days" className="mt-4 flex items-center bg-blue-50">
          {draft.days.map((day, dayIndex) => (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={day.id === draft.activeDayId}
              className={cn(
                "border-b-2 px-4 py-3 text-sm font-medium",
                day.id === draft.activeDayId ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
              )}
              onClick={() => updateDraft({ activeDayId: day.id })}
            >
              {day.name || `Day ${dayIndex + 1}`}
            </button>
          ))}
          <button type="button" aria-label="Add training day" className="ml-2 rounded p-2 text-blue-600" onClick={addTrainingDay}>
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="mt-4 block max-w-2xl text-sm font-semibold text-gray-900">
          Day Name <span className="text-red-500">*</span>
          <input
            required
            value={activeDay.name}
            placeholder="Enter Day Name"
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) => updateActiveDay({ name: event.target.value })}
          />
        </label>

        {(["warmUp", "workout", "coolDown"] as TrainingProgramSection[]).map((section) => (
          <ProgramBuilderSection
            key={section}
            section={section}
            exercises={activeDay.exercises.filter((exercise) => exercise.section === section)}
            onAddExercise={() => addExercise(section)}
            onExerciseChange={updateExercise}
          />
        ))}

        <label className="mt-4 block text-sm font-semibold text-gray-900">
          Workout Instructions
          <textarea
            value={draft.instructions}
            placeholder="Enter Workout Instructions"
            rows={5}
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) => updateDraft({ instructions: event.target.value })}
          />
        </label>

        <div className="mt-6 flex justify-end">
          <button type="submit" className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
            {saving ? "Saving..." : "Save & Close"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function createBlankTrainingProgramDraft(): TrainingProgramDraft {
  const firstDay = createBlankTrainingDay(1);

  return {
    title: "",
    tags: "",
    overview: "",
    instructions: "",
    activeDayId: firstDay.id,
    days: [firstDay]
  };
}

export function createTrainingProgramDraftFromTemplate(template: ApiTrainingTemplate): TrainingProgramDraft {
  const days =
    template.template.days?.map((day, dayIndex) => ({
      id: `day-${dayIndex + 1}`,
      name: day.name || `Day ${dayIndex + 1}`,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        id: `exercise-${dayIndex + 1}-${exerciseIndex + 1}`,
        section: exercise.section ?? "workout",
        exerciseName: exercise.exerciseName,
        sets: String(exercise.sets),
        reps: exercise.reps,
        rpe: exercise.rpe ?? "",
        rir: exercise.rir ?? "",
        restSeconds: String(exercise.restSeconds ?? "")
      }))
    })) ?? [];
  const firstDay = days[0] ?? createBlankTrainingDay(1);

  return {
    title: `${template.name} Copy`,
    tags: template.goal ?? "",
    overview: template.description ?? "",
    instructions: template.template.instructions ?? "",
    activeDayId: firstDay.id,
    days: days.length > 0 ? days : [firstDay]
  };
}

export function getTrainingProgramTemplatePayload(draft: TrainingProgramDraft, fallbackIndex: number) {
  const title = draft.title.trim() || `Strength Template ${fallbackIndex}`;

  return {
    name: title,
    description: draft.overview.trim() || "Coach-created template from the program library.",
    goal: draft.tags.trim() || "custom",
    durationWeeks: Math.max(1, draft.days.length),
    status: "draft",
    template: {
      days: draft.days.map((day, dayIndex) => ({
        name: day.name.trim() || `Day ${dayIndex + 1}`,
        exercises: day.exercises.map((exercise) => ({
          exerciseId: "manual-entry",
          exerciseName: exercise.exerciseName.trim() || "Manual Exercise",
          sets: parsePositiveInteger(exercise.sets, 3),
          reps: exercise.reps.trim() || "8-10",
          rpe: exercise.rpe.trim(),
          rir: exercise.rir.trim(),
          restSeconds: parsePositiveInteger(exercise.restSeconds, 120),
          section: exercise.section
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
  onExerciseChange
}: {
  section: TrainingProgramSection;
  exercises: TrainingProgramExerciseDraft[];
  onAddExercise: () => void;
  onExerciseChange: (exerciseId: string, updates: Partial<TrainingProgramExerciseDraft>) => void;
}) {
  const sectionLabel = getProgramSectionLabel(section);

  return (
    <div className="mt-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{sectionLabel}</h2>
      <div className="space-y-3">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 md:grid-cols-6">
            <ExerciseField label="Exercise name" value={exercise.exerciseName} onChange={(exerciseName) => onExerciseChange(exercise.id, { exerciseName })} />
            <ExerciseField label="Sets" value={exercise.sets} inputMode="numeric" onChange={(sets) => onExerciseChange(exercise.id, { sets })} />
            <ExerciseField label="Reps" value={exercise.reps} onChange={(reps) => onExerciseChange(exercise.id, { reps })} />
            <ExerciseField label="RPE" value={exercise.rpe} onChange={(rpe) => onExerciseChange(exercise.id, { rpe })} />
            <ExerciseField label="RIR" value={exercise.rir} onChange={(rir) => onExerciseChange(exercise.id, { rir })} />
            <ExerciseField label="Rest time" value={exercise.restSeconds} inputMode="numeric" onChange={(restSeconds) => onExerciseChange(exercise.id, { restSeconds })} />
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label={`Add ${sectionLabel.toLowerCase()} exercise`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-600"
        onClick={onAddExercise}
      >
        <Plus className="size-4" aria-hidden="true" />
        Add an Exercise
      </button>
    </div>
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
    <label className={cn("text-xs font-semibold uppercase tracking-wide text-gray-500", label === "Exercise name" ? "md:col-span-2" : "")}>
      {label}
      <input
        value={value}
        inputMode={inputMode}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal normal-case text-gray-900"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function createBlankTrainingDay(dayNumber: number): TrainingProgramDayDraft {
  return {
    id: `day-${dayNumber}`,
    name: `Day ${dayNumber}`,
    exercises: []
  };
}

function parsePositiveInteger(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function getProgramSectionLabel(section: TrainingProgramSection) {
  const labels: Record<TrainingProgramSection, string> = {
    warmUp: "Warm up",
    workout: "Workout",
    coolDown: "Cool Down"
  };

  return labels[section];
}
