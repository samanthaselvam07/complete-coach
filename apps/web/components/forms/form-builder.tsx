import { ArrowLeft, Bell, Eye, Grip, Image, Search, Send, Settings } from "lucide-react";
import { useEffect, useState } from "react";

import { SavedToast } from "@/components/ui/saved-toast";
import { formElements, getTemplateName, initialFormFields, type FormField } from "@/fixtures/forms";
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

interface ClientOption {
  id: string;
  name: string;
}

const colorOptions = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#f97316", label: "Orange" },
  { value: "#10b981", label: "Green" },
  { value: "#1f2937", label: "Dark" }
];

export function FormBuilder({ form, templateType, onBack, onPersistedForm }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFormFields);
  const [persistedForm, setPersistedForm] = useState<PersistedFormSummary | null>(form);
  const [formTitle, setFormTitle] = useState(form?.name ?? getTemplateName(templateType));
  const [formDescription, setFormDescription] = useState(form?.description ?? "Please provide your details for coach review.");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [successMessage, setSuccessMessage] = useState(
    "Thanks for applying! Our elite performance team will review your application within 24 hours."
  );
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const templateName = persistedForm?.name ?? getTemplateName(templateType);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const response = await fetch("/api/v1/clients?limit=100");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: ClientOption[] };
        const nextClients = payload.data ?? [];

        if (active) {
          setClients(nextClients);
          setSelectedClientId((currentClientId) => currentClientId || nextClients[0]?.id || "");
        }
      } catch {
        // Assignment remains disabled until the client API is available.
      }
    }

    void loadClients();

    return () => {
      active = false;
    };
  }, []);

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
    } catch {
      setErrorMessage("Form could not be saved. Check the details and try again.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const draft = await saveDraftForPublish();

      if (!draft) {
        throw new Error("Draft save failed.");
      }

      const response = await fetch(`/api/v1/forms/${draft.form.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formVersionId: draft.version.id })
      });

      if (!response.ok) {
        throw new Error("Publish failed.");
      }

      const payload = (await response.json()) as { data?: PersistedFormSummary };

      if (!payload.data) {
        throw new Error("Publish response was empty.");
      }

      setPersistedForm(payload.data);
      onPersistedForm(payload.data);
      setStatusMessage("Form published and ready for assignment.");
    } catch {
      setErrorMessage("Form could not be published. Save the draft and try again.");
    } finally {
      setSaving(false);
    }
  };

  const assignForm = async () => {
    if (!persistedForm?.currentVersionId || !selectedClientId) {
      setErrorMessage("Publish the form and select a client before assigning.");
      return;
    }

    setAssigning(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/forms/${persistedForm.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          formVersionId: persistedForm.currentVersionId
        })
      });

      if (!response.ok) {
        throw new Error("Assignment failed.");
      }

      setStatusMessage("Form assigned to selected client.");
    } catch {
      setErrorMessage("Form could not be assigned. Check the client and try again.");
    } finally {
      setAssigning(false);
    }
  };

  const saveDraftForPublish = async () => {
    const savedForm = await ensureFormContainer();
    const savedVersion = await createFormVersion(savedForm.id);

    setPersistedForm(savedForm);
    onPersistedForm(savedForm);

    return { form: savedForm, version: savedVersion };
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
      throw new Error("Form container save failed.");
    }

    const payload = (await response.json()) as { data?: PersistedFormSummary };

    if (!payload.data) {
      throw new Error("Form container response was empty.");
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
          fields: fields.map((field) => ({
            id: field.id,
            type: field.type,
            label: field.label,
            required: field.required,
            ...(field.placeholder ? { placeholder: field.placeholder } : {}),
            ...(field.options ? { options: field.options } : {}),
            exportPolicy: "private"
          }))
        },
        ui: {
          primaryColor,
          successMessage
        }
      })
    });

    if (!response.ok) {
      throw new Error("Form version save failed.");
    }

    const payload = (await response.json()) as { data?: PersistedFormVersion };

    if (!payload.data) {
      throw new Error("Form version response was empty.");
    }

    return payload.data;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
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

        <div className="hidden items-center gap-3 md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search components"
              placeholder="Search components..."
              className="w-64 rounded-lg border border-gray-200 py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button type="button" aria-label="Builder notifications" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <Bell className="size-5 text-gray-600" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Builder settings" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <Settings className="size-5 text-gray-600" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            onClick={saveDraft}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[16rem_1fr_20rem]">
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
                  className={cn("flex w-full items-center gap-3 rounded-lg p-3 transition-opacity hover:opacity-80", element.color)}
                  onClick={() => addField(element.id)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="text-sm font-medium">{element.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="overflow-y-auto p-6 md:p-8">
          <section className="mx-auto max-w-2xl" aria-label="Form preview">
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
                      Loading saved form fields...
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

        <aside className="border-l border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">Global Settings</h2>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Primary Color</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={`Set primary color ${color.label}`}
                  className={cn("size-10 rounded-lg border-2 transition-all", primaryColor === color.value ? "scale-110 border-gray-900" : "border-gray-200")}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setPrimaryColor(color.value)}
                />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="success-message" className="mb-2 block text-sm font-medium text-gray-700">
              Success Message
            </label>
            <textarea
              id="success-message"
              value={successMessage}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setSuccessMessage(event.target.value)}
            />
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            {statusMessage ? <SavedToast message={statusMessage} /> : null}
            {errorMessage ? (
              <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-4" aria-hidden="true" />
              Preview Form
            </button>
            <button
              type="button"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
              onClick={publishForm}
            >
              <Send className="size-4" aria-hidden="true" />
              {saving ? "Publishing..." : "Publish Form"}
            </button>
          </div>

          <div className="mt-6 space-y-3 border-t border-gray-200 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Assignment</h3>
            <label htmlFor="assign-client" className="block text-sm font-medium text-gray-700">
              Assign to client
            </label>
            <select
              id="assign-client"
              value={selectedClientId}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setSelectedClientId(event.target.value)}
            >
              {clients.length === 0 ? <option value="">No API clients loaded</option> : null}
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!persistedForm?.currentVersionId || !selectedClientId || assigning}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={assignForm}
            >
              {assigning ? "Assigning..." : "Assign Form"}
            </button>
          </div>
        </aside>
      </div>

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

function getApiFormType(templateType: string | null): PersistedFormSummary["type"] {
  if (
    templateType === "check-in" ||
    templateType === "application" ||
    templateType === "contact" ||
    templateType === "habit-tracker"
  ) {
    return templateType;
  }

  return "intake";
}
