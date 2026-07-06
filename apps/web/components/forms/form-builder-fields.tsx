import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import type { FormField } from "@/lib/forms/form-config";

export function fieldSupportsOptions(fieldType: string) {
  return fieldType === "multiple-choice" || fieldType === "radio-buttons" || fieldType === "dropdown" || fieldType === "checkbox";
}

function fieldSupportsPlaceholder(fieldType: string) {
  return !["content-block", "multiple-choice", "radio-buttons", "dropdown", "checkbox", "photo", "rating-10"].includes(fieldType);
}

export function getDefaultPlaceholder(fieldType: string) {
  if (!fieldSupportsPlaceholder(fieldType)) {
    return "";
  }

  if (fieldType === "email") {
    return "you@example.com";
  }

  if (fieldType === "phone") {
    return "+1 555 000 0000";
  }

  if (fieldType === "date") {
    return "Select a date";
  }

  if (fieldType === "time") {
    return "Select a time";
  }

  return "Client response";
}

export function FormFieldEditor({
  field,
  index,
  fieldCount,
  primaryColor,
  onChange,
  onMove,
  onRemove,
  onOptionChange,
  onOptionAdd,
  onOptionRemove
}: {
  field: FormField;
  index: number;
  fieldCount: number;
  primaryColor: string;
  onChange: (fieldId: string, updates: Partial<FormField>) => void;
  onMove: (fieldId: string, direction: "up" | "down") => void;
  onRemove: (fieldId: string) => void;
  onOptionChange: (fieldId: string, optionIndex: number, value: string) => void;
  onOptionAdd: (fieldId: string) => void;
  onOptionRemove: (fieldId: string, optionIndex: number) => void;
}) {
  return (
    <div data-testid="form-field" className="rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">{field.label}</h3>
          <p className="text-xs uppercase tracking-wider text-gray-500">{field.type}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={`Move ${field.label} up`}
            disabled={index === 0}
            className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            onClick={() => onMove(field.id, "up")}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Move ${field.label} down`}
            disabled={index === fieldCount - 1}
            className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            onClick={() => onMove(field.id, "down")}
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${field.label}`}
            className="rounded p-1 text-red-500 hover:bg-red-50"
            onClick={() => onRemove(field.id)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor={`${field.id}-label`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Field label
          </label>
          <input
            id={`${field.id}-label`}
            value={field.label}
            className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => onChange(field.id, { label: event.target.value })}
          />
        </div>

        {fieldSupportsPlaceholder(field.type) ? (
          <div>
            <label htmlFor={`${field.id}-placeholder`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Placeholder
            </label>
            <input
              id={`${field.id}-placeholder`}
              value={field.placeholder ?? ""}
              placeholder={getDefaultPlaceholder(field.type)}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => onChange(field.id, { placeholder: event.target.value })}
            />
          </div>
        ) : null}

        {field.type === "content-block" ? (
          <div>
            <label htmlFor={`${field.id}-content`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Agreement content
            </label>
            <textarea
              id={`${field.id}-content`}
              value={field.content ?? ""}
              rows={16}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => onChange(field.id, { content: event.target.value })}
            />
          </div>
        ) : null}

        {fieldSupportsOptions(field.type) ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Options</span>
              <button
                type="button"
                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => onOptionAdd(field.id)}
              >
                Add option
              </button>
            </div>
            {(field.options ?? ["Option 1"]).map((option, optionIndex) => (
              <div key={`${field.id}-option-${optionIndex}`} className="flex items-center gap-2">
                <label htmlFor={`${field.id}-option-${optionIndex}`} className="sr-only">
                  Option {optionIndex + 1}
                </label>
                <input
                  id={`${field.id}-option-${optionIndex}`}
                  value={option}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(event) => onOptionChange(field.id, optionIndex, event.target.value)}
                />
                <button
                  type="button"
                  aria-label={`Remove option ${optionIndex + 1} from ${field.label}`}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => onOptionRemove(field.id, optionIndex)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={field.required}
            className="size-4 rounded border-gray-300"
            style={{ accentColor: primaryColor }}
            onChange={(event) => onChange(field.id, { required: event.target.checked })}
          />
          Required field
        </label>
      </div>
    </div>
  );
}

export function FormPreviewDialog({
  title,
  description,
  fields,
  primaryColor,
  successMessage,
  onClose
}: {
  title: string;
  description: string;
  fields: FormField[];
  primaryColor: string;
  successMessage: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} preview`}
        className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Client preview</p>
            <h2 className="text-2xl font-bold text-gray-950">{title}</h2>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Close preview
          </button>
        </div>

        <div className="space-y-5 p-6">
          {fields.map((field) => (
            <PreviewField key={field.id} field={field} primaryColor={primaryColor} />
          ))}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-6">
          <button
            type="button"
            className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Submit preview
          </button>
          <p className="mt-3 text-center text-xs text-gray-500">{successMessage}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field, primaryColor }: { field: FormField; primaryColor: string }) {
  const label = `${field.label}${field.required ? " *" : ""}`;
  const commonInputClass = "mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none";

  if (field.type === "long-text") {
    return (
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        <textarea rows={4} placeholder={field.placeholder || "Client response"} className={commonInputClass} />
      </label>
    );
  }

  if (field.type === "content-block") {
    return (
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">{field.label}</h3>
        <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {field.content}
        </div>
      </section>
    );
  }

  if (field.type === "multiple-choice" || field.type === "radio-buttons") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-800">{label}</legend>
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="radio" name={field.id} style={{ accentColor: primaryColor }} />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }

  if (field.type === "rating-10") {
    return (
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800">{label}</legend>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
            <label
              key={rating}
              className="flex aspect-square items-center justify-center rounded-lg border border-gray-200 text-sm font-semibold text-gray-700"
            >
              <input type="radio" name={field.id} value={rating} className="sr-only" />
              {rating}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "dropdown") {
    return (
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        <select className={commonInputClass} defaultValue="">
          <option value="" disabled>
            Select an option
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-800">{label}</legend>
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" style={{ accentColor: primaryColor }} />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }

  if (field.type === "photo") {
    return (
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        <input type="file" accept="image/*" className={commonInputClass} />
      </label>
    );
  }

  return (
    <label className="block text-sm font-semibold text-gray-800">
      {label}
      <input type={getPreviewInputType(field.type)} placeholder={field.placeholder || "Client response"} className={commonInputClass} />
    </label>
  );
}

function getPreviewInputType(fieldType: string) {
  if (fieldType === "email") {
    return "email";
  }

  if (fieldType === "phone") {
    return "tel";
  }

  if (fieldType === "date") {
    return "date";
  }

  if (fieldType === "time") {
    return "time";
  }

  if (fieldType === "number") {
    return "number";
  }

  return "text";
}
