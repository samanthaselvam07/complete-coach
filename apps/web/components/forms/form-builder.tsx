import { ArrowLeft, Eye, Grip, Image } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";

import { SavedToast } from "@/components/ui/saved-toast";
import { formElements, getTemplateDescription, getTemplateName, type FormField } from "@/lib/forms/form-config";
import { confirmDestructiveAction } from "@/lib/ui/confirm-destructive-action";
import { cn } from "@/lib/utils";
import {
  fieldSupportsOptions,
  FormFieldEditor,
  FormPreviewDialog,
  getDefaultPlaceholder
} from "./form-builder-fields";
import type { PersistedFormSummary } from "./forms-page";

interface FormBuilderProps {
  form: PersistedFormSummary | null;
  templateType: string | null;
  presetFields: FormField[] | null;
  onBack: () => void;
  onPersistedForm: (form: PersistedFormSummary) => void;
}

interface PersistedFormVersion {
  id: string;
  formId: string;
  versionNumber: number;
  schema: {
    title: string;
    description?: string;
    fields: FormField[];
  };
  ui: {
    primaryColor?: string;
    successMessage?: string;
  } | null;
  publishedAt: string | null;
  createdAt: string;
}

interface PersistedFormDetail extends PersistedFormSummary {
  versions?: PersistedFormVersion[];
}

export function FormBuilder({ form, templateType, presetFields, onBack, onPersistedForm }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(presetFields ?? []);
  const [persistedForm, setPersistedForm] = useState<PersistedFormSummary | null>(form);
  const [formTitle, setFormTitle] = useState(form?.name ?? (templateType ? getTemplateName(templateType) : "New form"));
  const [formDescription, setFormDescription] = useState(form?.description ?? getTemplateDescription(templateType));
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [successMessage, setSuccessMessage] = useState(
    "Thanks for applying! Our elite performance team will review your application within 24 hours."
  );
  const [saving, setSaving] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const templateName = persistedForm?.name ?? getTemplateName(templateType);

  useEffect(() => {
    let active = true;

    async function loadPersistedVersion() {
      if (!form?.id) {
        return;
      }

      setLoadingVersion(true);

      try {
        const response = await fetch(`/api/v1/forms/${form.id}`);

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: PersistedFormDetail };
        const latestVersion = payload.data?.versions?.[0];

        if (!active || !latestVersion) {
          return;
        }

        setFields(latestVersion.schema.fields);
        setFormTitle(latestVersion.schema.title || payload.data?.name || form.name);
        setFormDescription(latestVersion.schema.description ?? payload.data?.description ?? form.description ?? "");
        setPrimaryColor(latestVersion.ui?.primaryColor ?? "#6366f1");
        setSuccessMessage(
          latestVersion.ui?.successMessage ??
            "Thanks for applying! Our elite performance team will review your application within 24 hours."
        );

        if (payload.data) {
          setPersistedForm(payload.data);
        }
      } catch {
        // Keep the metadata-only editor usable if version detail cannot be loaded.
      } finally {
        if (active) {
          setLoadingVersion(false);
        }
      }
    }

    void loadPersistedVersion();

    return () => {
      active = false;
    };
  }, [form]);

  const addField = (elementType: string) => {
    setFields((currentFields) => [
      ...currentFields,
      {
        id: `field-${currentFields.length + 1}-${elementType}`,
        type: elementType,
        label: `New ${elementType.replaceAll("-", " ")} field`,
        placeholder: getDefaultPlaceholder(elementType),
        required: false,
        options: fieldSupportsOptions(elementType) ? ["Option 1"] : undefined
      }
    ]);
  };

  const handleElementDragStart = (event: DragEvent<HTMLButtonElement>, elementType: string) => {
    event.dataTransfer.setData("application/x-complete-coach-form-element", elementType);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleElementDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const elementType = event.dataTransfer.getData("application/x-complete-coach-form-element");

    if (elementType) {
      addField(elementType);
    }
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields((currentFields) =>
      currentFields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field))
    );
  };

  const updateFieldOption = (fieldId: string, optionIndex: number, value: string) => {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }

        const options = [...(field.options ?? [])];
        options[optionIndex] = value;

        return { ...field, options };
      })
    );
  };

  const addFieldOption = (fieldId: string) => {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }

        return { ...field, options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`] };
      })
    );
  };

  const removeFieldOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find((currentField) => currentField.id === fieldId);

    if (
      !confirmDestructiveAction({
        action: "remove",
        itemName: field ? `option ${optionIndex + 1} from ${field.label}` : null,
        itemType: "field option"
      })
    ) {
      return;
    }

    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }

        const nextOptions = (field.options ?? []).filter((_, index) => index !== optionIndex);

        return { ...field, options: nextOptions.length > 0 ? nextOptions : ["Option 1"] };
      })
    );
  };

  const removeField = (fieldId: string) => {
    const field = fields.find((currentField) => currentField.id === fieldId);

    if (
      !confirmDestructiveAction({
        action: "remove",
        itemName: field?.label,
        itemType: "field"
      })
    ) {
      return;
    }

    setFields((currentFields) => currentFields.filter((field) => field.id !== fieldId));
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    setFields((currentFields) => {
      const index = currentFields.findIndex((field) => field.id === fieldId);
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || nextIndex < 0 || nextIndex >= currentFields.length) {
        return currentFields;
      }

      const updatedFields = [...currentFields];
      const [movedField] = updatedFields.splice(index, 1);
      updatedFields.splice(nextIndex, 0, movedField);

      return updatedFields;
    });
  };

  const saveDraft = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const savedForm = await ensureFormContainer();
      const savedVersion = await createFormVersion(savedForm.id);

      setPersistedForm(savedForm);
      onPersistedForm(savedForm);
      setStatusMessage("Draft saved.");

      return { form: savedForm, version: savedVersion };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Form could not be saved.";
      setErrorMessage(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveAndClose = async () => {
    const draft = await saveDraft();

    if (draft) {
      onBack();
    }
  };

  const ensureFormContainer = async () => {
    const body = {
      name: formTitle,
      description: formDescription,
      type: getApiFormType(templateType),
      status: persistedForm?.status ?? "draft"
    };

    const response = await fetch(persistedForm ? `/api/v1/forms/${persistedForm.id}` : "/api/v1/forms", {
      method: persistedForm ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Form details could not be saved. ${await getApiErrorMessage(response)}`);
    }

    const payload = (await response.json()) as { data?: PersistedFormSummary };

    if (!payload.data) {
      throw new Error("Form details could not be saved. The server returned an empty response.");
    }

    return payload.data;
  };

  const createFormVersion = async (formId: string) => {
    const response = await fetch(`/api/v1/forms/${formId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schema: {
          title: formTitle,
          description: formDescription,
          fields: fields.map((field) => {
            const options = getPersistableOptions(field);

            return {
              id: field.id,
              type: field.type,
              label: field.label,
              required: field.required,
              ...(field.placeholder ? { placeholder: field.placeholder } : {}),
              ...(field.content ? { content: field.content } : {}),
              ...(options.length > 0 ? { options } : {}),
              ...(field.category ? { category: field.category } : {}),
              exportPolicy: "private"
            };
          })
        },
        ui: {
          primaryColor,
          successMessage
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Form fields could not be saved. ${await getApiErrorMessage(response)}`);
    }

    const payload = (await response.json()) as { data?: PersistedFormVersion };

    if (!payload.data) {
      throw new Error("Form fields could not be saved. The server returned an empty response.");
    }

    return payload.data;
  };

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-gray-50">
      <header className="shrink-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Back to forms"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            onClick={onBack}
          >
            <ArrowLeft className="size-5 text-gray-600" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Form Builder</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Drafts</span>
              <span>/</span>
              <span className="text-indigo-600">{templateName}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="hidden rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 md:inline-flex"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="mr-2 size-4" aria-hidden="true" />
          Preview Form
        </button>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden pb-28 lg:grid-cols-[16rem_1fr]">
        <aside className="border-r border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Form Elements</h2>
          <div className="space-y-2">
            {formElements.map((element) => {
              const Icon = element.icon;

              return (
                <button
                  key={element.id}
                  type="button"
                  aria-label={`Add ${element.label} field`}
                  draggable
                  className={cn("flex w-full items-center gap-3 rounded-lg p-3 transition-opacity hover:opacity-80", element.color)}
                  onDragStart={(event) => handleElementDragStart(event, element.id)}
                  onClick={() => addField(element.id)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="text-sm font-medium">{element.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main
          className="overflow-y-auto p-6 md:p-8"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleElementDrop}
        >
          <section className="mx-auto max-w-3xl" aria-label="Form preview">
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="flex h-48 items-center justify-center bg-gradient-to-br from-slate-950 to-indigo-700 text-white">
                <Image className="size-10 opacity-80" aria-hidden="true" />
              </div>
              <div className="p-8">
                <div className="mb-8 space-y-3">
                  <div>
                    <label htmlFor="form-title" className="mb-1 block text-sm font-semibold text-gray-700">
                      Form title
                    </label>
                    <input
                      id="form-title"
                      value={formTitle}
                      className="w-full rounded-lg border border-gray-200 p-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(event) => setFormTitle(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="form-description" className="mb-1 block text-sm font-semibold text-gray-700">
                      Form description
                    </label>
                    <textarea
                      id="form-description"
                      value={formDescription}
                      rows={2}
                      className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(event) => setFormDescription(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {loadingVersion ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium text-indigo-800">
                      Preparing saved form fields...
                    </div>
                  ) : null}
                  {fields.map((field, index) => (
                    <FormFieldEditor
                      key={field.id}
                      field={field}
                      index={index}
                      fieldCount={fields.length}
                      primaryColor={primaryColor}
                      onChange={updateField}
                      onMove={moveField}
                      onRemove={removeField}
                      onOptionChange={updateFieldOption}
                      onOptionAdd={addFieldOption}
                      onOptionRemove={removeFieldOption}
                    />
                  ))}

                  <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gray-100">
                      <Grip className="size-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-500">Drag and drop elements here to build your form</p>
                    <p className="text-xs text-gray-400">Or click on elements from the left sidebar</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-h-10">
            {statusMessage ? <SavedToast message={statusMessage} /> : null}
            {errorMessage ? (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-4" aria-hidden="true" />
              Preview
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              onClick={saveDraft}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              onClick={saveAndClose}
            >
              {saving ? "Saving..." : "Save and Close"}
            </button>
          </div>
        </div>
      </footer>

      {previewOpen ? (
        <FormPreviewDialog
          title={formTitle}
          description={formDescription}
          fields={fields}
          primaryColor={primaryColor}
          successMessage={successMessage}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function getPersistableOptions(field: FormField) {
  if (!fieldSupportsOptions(field.type)) {
    return [];
  }

  return (field.options ?? []).map((option) => option.trim()).filter(Boolean);
}

async function getApiErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? "Please try again.";
  } catch {
    return "Please try again.";
  }
}

function getApiFormType(templateType: string | null): PersistedFormSummary["type"] {
  if (
    templateType === "check-in" ||
    templateType === "application" ||
    templateType === "contact" ||
    templateType === "habit-tracker" ||
    templateType === "terms-and-conditions"
  ) {
    return templateType;
  }

  return "intake";
}
