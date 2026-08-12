"use client";

import { useEffect, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import type { FormField } from "@/lib/forms/form-config";
import { FormBuilder } from "./form-builder";
import { FormManagement } from "./form-management";

export type PersistedFormType =
  | "check-in"
  | "intake"
  | "application"
  | "contact"
  | "habit-tracker"
  | "terms-and-conditions";

export interface PersistedFormSummary {
  id: string;
  name: string;
  description: string | null;
  type: PersistedFormType;
  status: "published" | "archived";
  shareSlug?: string | null;
  shareUrlPath?: string | null;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function FormsPage() {
  const [currentView, setCurrentView] = useState<"management" | "builder">("management");
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | null>(null);
  const [selectedPresetFields, setSelectedPresetFields] = useState<FormField[] | null>(null);
  const [selectedForm, setSelectedForm] = useState<PersistedFormSummary | null>(null);
  const [forms, setForms] = useState<PersistedFormSummary[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadForms() {
      try {
        const response = await fetch("/api/v1/forms?limit=20");

        if (!response.ok) {
          throw new Error("Forms API unavailable.");
        }

        const payload = (await response.json()) as { data?: PersistedFormSummary[] };

        if (active) {
          setForms(payload.data ?? []);
        }
      } catch {
        if (active) {
          setForms([]);
        }
      } finally {
        if (active) {
          setLoadingForms(false);
        }
      }
    }

    void loadForms();

    return () => {
      active = false;
    };
  }, []);

  const handleCreateForm = (templateType?: string, presetFields?: FormField[]) => {
    setSelectedForm(null);
    setSelectedTemplateType(templateType ?? null);
    setSelectedPresetFields(presetFields ?? null);
    setCurrentView("builder");
  };

  const handleEditForm = (form: PersistedFormSummary) => {
    setSelectedForm(form);
    setSelectedTemplateType(form.type);
    setSelectedPresetFields(null);
    setCurrentView("builder");
  };

  const upsertForm = (form: PersistedFormSummary) => {
    setForms((currentForms) => {
      const existingIndex = currentForms.findIndex((currentForm) => currentForm.id === form.id);

      if (existingIndex === -1) {
        return [form, ...currentForms];
      }

      const nextForms = [...currentForms];
      nextForms[existingIndex] = form;
      return nextForms;
    });
  };

  return currentView === "management" ? (
    <>
      {loadingForms ? (
        <CompleteCoachLoadingScreen
          title="Preparing forms"
          label="Preparing forms library."
        />
      ) : null}
      <FormManagement
        forms={forms}
        loadingForms={loadingForms}
        onCreateForm={handleCreateForm}
        onEditForm={handleEditForm}
      />
    </>
  ) : (
    <FormBuilder
      form={selectedForm}
      templateType={selectedTemplateType}
      presetFields={selectedPresetFields}
      onBack={() => setCurrentView("management")}
      onPersistedForm={upsertForm}
    />
  );
}
