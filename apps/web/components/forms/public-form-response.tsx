"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { FormField } from "@/lib/forms/form-config";

interface PublicFormResponseProps {
  shareSlug: string;
}

interface PublicFormPayload {
  id: string;
  name: string;
  description: string | null;
  schema: {
    title: string;
    description?: string;
    fields: FormField[];
  };
  ui?: {
    primaryColor?: string;
    successMessage?: string;
  };
}

export function PublicFormResponse({ shareSlug }: PublicFormResponseProps) {
  const [form, setForm] = useState<PublicFormPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const visibleFields = useMemo(() => form?.schema.fields ?? [], [form]);

  useEffect(() => {
    let active = true;

    async function loadForm() {
      try {
        const response = await fetch(`/api/v1/forms/respond/${encodeURIComponent(shareSlug)}`);

        if (!response.ok) {
          throw new Error("This form link is no longer available.");
        }

        const payload = (await response.json()) as { data?: PublicFormPayload };

        if (active) {
          setForm(payload.data ?? null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "This form could not be loaded.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadForm();

    return () => {
      active = false;
    };
  }, [shareSlug]);

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [fieldId]: value
    }));
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/forms/respond/${encodeURIComponent(shareSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });

      if (!response.ok) {
        throw new Error("Your form could not be submitted. Please try again.");
      }

      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your form could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div role="status" className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-700 shadow-sm">
          Loading form...
        </div>
      </main>
    );
  }

  if (!form || errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div role="alert" className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-gray-950">Form unavailable</h1>
          <p className="text-sm text-gray-600">{errorMessage ?? "This form link is no longer available."}</p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div role="status" className="w-full max-w-lg rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
            Done
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-950">Form submitted</h1>
          <p className="text-sm text-gray-600">
            {form.ui?.successMessage ?? "Thanks. Your coach has received your response."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <form
        className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        onSubmit={submitForm}
      >
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-700 px-8 py-10 text-white">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-indigo-200">Complete Coach</p>
          <h1 className="text-3xl font-bold">{form.schema.title || form.name}</h1>
          {form.schema.description || form.description ? (
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">
              {form.schema.description ?? form.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-6 p-8">
          {visibleFields.map((field) => (
            <PublicFormField
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(value) => updateAnswer(field.id, value)}
            />
          ))}

          {errorMessage ? (
            <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit form"}
          </button>
        </div>
      </form>
    </main>
  );
}

function PublicFormField({
  field,
  onChange,
  value
}: {
  field: FormField;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  if (field.type === "content-block") {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <h2 className="mb-2 text-sm font-bold text-indigo-950">{field.label}</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{field.content}</p>
      </section>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-sm font-semibold text-gray-800">
        <input
          type="checkbox"
          required={field.required}
          checked={Boolean(value)}
          className="mt-1 size-4 rounded border-gray-300 text-indigo-600"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  const label = `${field.label}${field.required ? " *" : ""}`;

  if (field.type === "long-text") {
    return (
      <label className="block text-sm font-semibold text-gray-800">
        <span>{label}</span>
        <textarea
          required={field.required}
          rows={4}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          className="mt-2 w-full rounded-2xl border border-gray-200 p-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.type === "dropdown") {
    return (
      <label className="block text-sm font-semibold text-gray-800">
        <span>{label}</span>
        <select
          required={field.required}
          value={typeof value === "string" ? value : ""}
          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "multiple-choice" || field.type === "radio-buttons") {
    return (
      <fieldset className="space-y-3 rounded-2xl border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">{label}</legend>
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="radio"
              name={field.id}
              required={field.required}
              value={option}
              checked={value === option}
              className="size-4 border-gray-300 text-indigo-600"
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  const inputType = getInputType(field.type);

  return (
    <label className="block text-sm font-semibold text-gray-800">
      <span>{label}</span>
      <input
        type={inputType}
        required={field.required}
        min={field.type === "scale" || field.type === "rating-10" ? 1 : undefined}
        max={field.type === "scale" || field.type === "rating-10" ? 10 : undefined}
        placeholder={field.placeholder}
        value={typeof value === "string" || typeof value === "number" ? value : ""}
        className="mt-2 w-full rounded-2xl border border-gray-200 p-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(inputType === "number" ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
}

function getInputType(fieldType: FormField["type"]) {
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

  if (fieldType === "number" || fieldType === "scale" || fieldType === "rating-10") {
    return "number";
  }

  return "text";
}
