import { useMemo, useState } from "react";
import { Copy, Edit3, FileText, MoreVertical, X } from "lucide-react";

import {
  buildPresetFields,
  formTemplates,
  getPresetOptionsForTemplate,
  type FormField
} from "@/lib/forms/form-config";
import type { PersistedFormSummary, PersistedFormType } from "./forms-page";

type FormFilterId = "all" | PersistedFormType;

const formFilters: Array<{ id: FormFilterId; label: string }> = [
  { id: "all", label: "All Forms" },
  { id: "check-in", label: "Check-In Forms" },
  { id: "habit-tracker", label: "Daily Habit Tracker" },
  { id: "application", label: "Application Forms" },
  { id: "contact", label: "Contact Forms" },
  { id: "terms-and-conditions", label: "Terms and Conditions" }
];

interface FormManagementProps {
  forms: PersistedFormSummary[];
  loadingForms: boolean;
  onCreateForm: (templateType?: string, presetFields?: FormField[]) => void;
  onEditForm: (form: PersistedFormSummary) => void;
}

export function FormManagement({
  forms,
  loadingForms,
  onCreateForm,
  onEditForm
}: FormManagementProps) {
  const [activeFilter, setActiveFilter] = useState<FormFilterId>("all");
  const [presetTemplateId, setPresetTemplateId] = useState<string | null>(null);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const filteredForms = useMemo(() => {
    if (activeFilter === "all") {
      return forms;
    }

    return forms.filter((form) => form.type === activeFilter);
  }, [activeFilter, forms]);
  const selectedTemplate = formTemplates.find((template) => template.id === presetTemplateId) ?? null;
  const presetOptions = getPresetOptionsForTemplate(presetTemplateId);

  const openPresetSelector = (templateId: string) => {
    const templatePresetOptions = getPresetOptionsForTemplate(templateId);

    if (templatePresetOptions.length === 0) {
      onCreateForm(templateId);
      return;
    }

    setPresetTemplateId(templateId);
    setSelectedPresetIds(templatePresetOptions.map((preset) => preset.id));
  };

  const closePresetSelector = () => {
    setPresetTemplateId(null);
    setSelectedPresetIds([]);
  };

  const togglePreset = (presetId: string) => {
    setSelectedPresetIds((currentIds) =>
      currentIds.includes(presetId)
        ? currentIds.filter((currentId) => currentId !== presetId)
        : [...currentIds, presetId]
    );
  };

  const continueWithPresets = () => {
    if (!presetTemplateId) {
      return;
    }

    const presetFields = buildPresetFields(presetTemplateId, selectedPresetIds);
    onCreateForm(presetTemplateId, presetFields);
    closePresetSelector();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Create a New Form</h1>
          <p className="text-gray-600">Select a form type to start building from a specialized template.</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          onClick={() => onCreateForm()}
        >
          Start from Scratch
        </button>
      </div>

      <div className="mb-12 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {formTemplates.map((template) => {
          const Icon = template.icon;

          return (
            <button
              key={template.id}
              type="button"
              className="group rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:shadow-lg"
              aria-label={`Use ${template.name} template`}
              onClick={() => openPresetSelector(template.id)}
            >
              <div className={`mb-3 flex size-10 items-center justify-center rounded-lg ${template.color}`}>
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mb-1.5 text-sm font-semibold transition-colors group-hover:text-indigo-600">
                {template.name}
              </h2>
              <p className="line-clamp-3 text-xs leading-relaxed text-gray-600">{template.description}</p>
            </button>
          );
        })}
      </div>

      <section>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Recent Forms</h2>
          <div className="flex flex-wrap gap-2" aria-label="Form type filters">
            {formFilters.map((filter) => {
              const isActive = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-label={`Filter ${filter.label}`}
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          {loadingForms ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              Preparing forms...
            </div>
          ) : null}
          {!loadingForms && forms.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              No persisted forms yet. Start from scratch or choose a template.
            </div>
          ) : null}
          {!loadingForms && forms.length > 0 && filteredForms.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              No forms match the selected filter.
            </div>
          ) : null}
          {filteredForms.map((form) => <RecentPersistedFormRow key={form.id} form={form} onEditForm={onEditForm} />)}
        </div>
      </section>

      {selectedTemplate ? (
        <PresetSelectionDialog
          templateName={selectedTemplate.name}
          selectedPresetIds={selectedPresetIds}
          presets={presetOptions}
          onClose={closePresetSelector}
          onTogglePreset={togglePreset}
          onSelectAll={() => setSelectedPresetIds(presetOptions.map((preset) => preset.id))}
          onClearAll={() => setSelectedPresetIds([])}
          onContinue={continueWithPresets}
        />
      ) : null}
    </div>
  );
}

function PresetSelectionDialog({
  templateName,
  presets,
  selectedPresetIds,
  onClose,
  onTogglePreset,
  onSelectAll,
  onClearAll,
  onContinue
}: {
  templateName: string;
  presets: Array<{ id: string; label: string; fieldType: string; required?: boolean }>;
  selectedPresetIds: string[];
  onClose: () => void;
  onTogglePreset: (presetId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${templateName} preset checklist`}
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Preset checklist</p>
            <h2 className="text-2xl font-bold text-gray-950">{templateName}</h2>
            <p className="mt-2 text-sm text-gray-600">
              Select the questions you want included before customising the form.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close preset checklist"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
          <span className="text-sm font-medium text-gray-600">
            {selectedPresetIds.length} of {presets.length} selected
          </span>
          <div className="flex gap-2">
            <button type="button" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700" onClick={onSelectAll}>
              Select all
            </button>
            <button type="button" className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={onClearAll}>
              Clear
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {presets.map((preset) => {
              const checked = selectedPresetIds.includes(preset.id);

              return (
                <label
                  key={preset.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    checked
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    className="mt-1 size-4 rounded border-gray-300 text-indigo-600"
                    onChange={() => onTogglePreset(preset.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{preset.label}</span>
                    <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {preset.fieldType.replaceAll("-", " ")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedPresetIds.length === 0}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onContinue}
          >
            Continue to builder
          </button>
        </div>
      </div>
    </div>
  );
}

function RecentPersistedFormRow({
  form,
  onEditForm
}: {
  form: PersistedFormSummary;
  onEditForm: (form: PersistedFormSummary) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const shareUrl = getFormShareUrl(form);

  const copyFormLink = async () => {
    await navigator.clipboard?.writeText(shareUrl);
    setCopyStatus("Form link copied.");
    setMenuOpen(false);
  };

  return (
    <div className="group relative flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onEditForm(form)}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-indigo-50">
          <FileText
            className="size-5 text-gray-600 transition-colors group-hover:text-indigo-600"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{form.name}</div>
          <div className="text-xs text-gray-500">LAST EDITED {formatRelativeDate(form.updatedAt)}</div>
        </div>
      </button>

      <div className="ml-3 flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Edit ${form.name}`}
          className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
          onClick={() => onEditForm(form)}
        >
          <Edit3 className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Open actions for ${form.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </button>
      </div>

      {copyStatus ? (
        <span role="status" className="absolute right-4 top-full mt-1 text-xs font-semibold text-emerald-700">
          {copyStatus}
        </span>
      ) : null}

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close form actions"
            className="fixed inset-0 z-20 cursor-default bg-transparent"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            aria-label={`Actions for ${form.name}`}
            className="absolute right-4 top-14 z-30 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 text-sm shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              onClick={() => {
                setMenuOpen(false);
                onEditForm(form);
              }}
            >
              <Edit3 className="size-4" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              onClick={() => void copyFormLink()}
            >
              <Copy className="size-4" aria-hidden="true" />
              Get link
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function getFormShareUrl(form: PersistedFormSummary) {
  const sharePath = form.shareUrlPath ?? `/forms/respond/${form.shareSlug ?? form.id}`;
  const origin = typeof window === "undefined" ? "https://app.completecoach.fit" : window.location.origin;

  return new URL(sharePath, origin).toString();
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "RECENTLY";
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toUpperCase();
}
