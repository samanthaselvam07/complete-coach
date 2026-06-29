import { FileText, MoreVertical } from "lucide-react";

import { formTemplates } from "@/fixtures/forms";
import type { PersistedFormSummary } from "./forms-page";

interface FormManagementProps {
  forms: PersistedFormSummary[];
  loadingForms: boolean;
  onCreateForm: (templateType?: string) => void;
  onEditForm: (form: PersistedFormSummary) => void;
}

export function FormManagement({
  forms,
  loadingForms,
  onCreateForm,
  onEditForm
}: FormManagementProps) {
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

      <div className="mb-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {formTemplates.map((template) => {
          const Icon = template.icon;

          return (
            <button
              key={template.id}
              type="button"
              className="group rounded-xl border border-gray-200 bg-white p-6 text-left transition-all hover:border-indigo-300 hover:shadow-lg"
              aria-label={`Use ${template.name} template`}
              onClick={() => onCreateForm(template.id)}
            >
              <div className={`mb-4 flex size-12 items-center justify-center rounded-lg ${template.color}`}>
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-base font-semibold transition-colors group-hover:text-indigo-600">
                {template.name}
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-gray-600">{template.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900">Recent Forms</h2>
        <div className="space-y-3">
          {loadingForms ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              Loading persisted forms...
            </div>
          ) : null}
          {!loadingForms && forms.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              No persisted forms yet. Start from scratch or choose a template.
            </div>
          ) : null}
          {forms.map((form) => <RecentPersistedFormRow key={form.id} form={form} onEditForm={onEditForm} />)}
        </div>
      </section>
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
  return (
    <button
      type="button"
      className="group flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
      onClick={() => onEditForm(form)}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-indigo-50">
          <FileText className="size-5 text-gray-600 transition-colors group-hover:text-indigo-600" aria-hidden="true" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium">{form.name}</div>
          <div className="text-xs text-gray-500">
            {form.status.toUpperCase()} - LAST EDITED {formatRelativeDate(form.updatedAt)}
          </div>
        </div>
      </div>
      <span className="rounded-lg p-2 transition-colors hover:bg-gray-100" aria-hidden="true">
        <MoreVertical className="size-4 text-gray-400" />
      </span>
    </button>
  );
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
