"use client";

import { ArrowLeft, CheckCircle2, ClipboardCheck, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface DailyCheckInAssignmentResponse {
  data?: DailyCheckInAssignment | null;
  error?: {
    message?: string;
  };
}

interface DailyCheckInAssignment {
  id: string;
  formName: string;
  dueAt: string | null;
  formVersion?: {
    schema?: {
      title?: string;
      description?: string;
      fields?: DailyCheckInField[];
    };
  };
}

interface DailyCheckInField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  content?: string;
  options?: string[];
}

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "submitted";
type CheckInFormKind = "daily" | "weekly";

export function ClientDailyCheckInFormPage({ kind = "daily" }: { kind?: CheckInFormKind } = {}) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [assignment, setAssignment] = useState<DailyCheckInAssignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const fields = useMemo(() => assignment?.formVersion?.schema?.fields ?? [], [assignment]);
  const formLabel = kind === "weekly" ? "weekly check-in" : "daily check-in";
  const apiUrl = `/api/v1/client/daily-check-in?kind=${kind}`;

  useEffect(() => {
    let mounted = true;

    async function loadAssignedForm() {
      try {
        const response = await fetch(apiUrl);
        const payload = (await response.json().catch(() => null)) as DailyCheckInAssignmentResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? `Your assigned ${formLabel} could not be loaded.`);
        }

        if (!mounted) {
          return;
        }

        setAssignment(payload?.data ?? null);
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : `Your assigned ${formLabel} could not be loaded.`);
        setLoadState("error");
      }
    }

    void loadAssignedForm();

    return () => {
      mounted = false;
    };
  }, [apiUrl, formLabel]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitState("submitting");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? `Your ${formLabel} could not be submitted.`);
      }

      setSubmitState("submitted");
      window.setTimeout(() => router.push("/"), 650);
    } catch (error) {
      setSubmitState("idle");
      setErrorMessage(error instanceof Error ? error.message : `Your ${formLabel} could not be submitted.`);
    }
  }

  function updateAnswer(fieldId: string, value: unknown) {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value
    }));
  }

  return (
    <ClientMobileShell title="MCP" avatarLabel="CI">
      <div className="space-y-6">
        <Link href="/check-in" className="inline-flex items-center gap-2 text-sm font-black text-[#777584]">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Check in
        </Link>

        {loadState === "loading" ? <DailyFormStatus message="Loading assigned form" /> : null}
        {loadState === "error" ? <DailyFormStatus message={errorMessage} tone="error" /> : null}

        {loadState === "ready" && !assignment ? (
          <DailyFormStatus message={`No ${formLabel} form has been assigned yet.`} />
        ) : null}

        {loadState === "ready" && assignment ? (
          <>
            <ClientSectionHeading eyebrow={kind === "weekly" ? "Weekly check-in" : "Daily check-in"} title={assignment.formVersion?.schema?.title ?? assignment.formName}>
              <p className="text-sm font-semibold leading-6 text-[#777584]">
                {assignment.formVersion?.schema?.description ?? "Complete today’s update for your coach."}
              </p>
            </ClientSectionHeading>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <DailyCheckInFieldControl
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  onChange={(value) => updateAnswer(field.id, value)}
                />
              ))}

              {errorMessage ? (
                <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitState !== "idle"}
                className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#3620b8] text-base font-black text-white shadow-[0_20px_45px_rgba(54,32,184,0.24)] transition active:scale-[0.98] disabled:opacity-70"
              >
                {submitState === "submitted" ? <CheckCircle2 aria-hidden="true" className="size-5" /> : <Send aria-hidden="true" className="size-5" />}
                {submitState === "submitted" ? "Submitted" : submitState === "submitting" ? "Submitting" : `Submit ${formLabel}`}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </ClientMobileShell>
  );
}

export function DailyCheckInFieldControl({
  field,
  value,
  onChange
}: {
  field: DailyCheckInField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "content-block") {
    return (
      <section className="rounded-[1.35rem] bg-[#f5f3f3] p-5 text-sm font-semibold leading-6 text-[#777584]">
        {field.content}
      </section>
    );
  }

  return (
    <label className="block rounded-[1.35rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <span className="mb-3 flex items-start justify-between gap-4">
        <span className="text-sm font-black text-[#1b1c1c]">{field.label}</span>
        {field.required ? <span className="text-xs font-black uppercase tracking-wide text-[#f87600]">Required</span> : null}
      </span>
      <FieldInput field={field} value={value} onChange={onChange} />
    </label>
  );
}

function FieldInput({
  field,
  value,
  onChange
}: {
  field: DailyCheckInField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const baseClass = "min-h-12 w-full rounded-2xl border-0 bg-[#f5f3f3] px-4 text-sm font-bold text-[#1b1c1c] outline-none ring-2 ring-transparent transition focus:ring-[#3620b8]";

  if (field.type === "long-text") {
    return (
      <textarea
        required={field.required}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(baseClass, "min-h-32 py-3 leading-6")}
      />
    );
  }

  if (field.type === "number" || field.type === "scale") {
    return (
      <input
        required={field.required}
        type="number"
        inputMode="decimal"
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        className={baseClass}
      />
    );
  }

  if (field.type === "date" || field.type === "time" || field.type === "email" || field.type === "phone") {
    return (
      <input
        required={field.required}
        type={field.type === "phone" ? "tel" : field.type}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={baseClass}
      />
    );
  }

  if (field.type === "dropdown") {
    return (
      <select
        required={field.required}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className={baseClass}
      >
        <option value="">Select</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (["multiple-choice", "radio-buttons", "rating-10"].includes(field.type)) {
    const options = field.type === "rating-10"
      ? Array.from({ length: 10 }, (_, index) => String(index + 1))
      : field.options ?? [];

    return (
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "min-h-12 rounded-2xl px-3 text-sm font-black",
              value === option ? "bg-[#3620b8] text-white" : "bg-[#f5f3f3] text-[#777584]"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const checked = value === true;

    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black",
          checked ? "bg-[#3620b8] text-white" : "bg-[#f5f3f3] text-[#777584]"
        )}
      >
        <ClipboardCheck aria-hidden="true" className="size-4" />
        {checked ? "Completed" : "Mark complete"}
      </button>
    );
  }

  if (field.type === "photo") {
    return (
      <input
        required={field.required}
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0]?.name ?? "")}
        className="block w-full rounded-2xl bg-[#f5f3f3] px-4 py-3 text-sm font-bold text-[#777584] file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-black file:text-[#3620b8]"
      />
    );
  }

  return (
    <input
      required={field.required}
      type="text"
      value={typeof value === "string" ? value : ""}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={baseClass}
    />
  );
}

function DailyFormStatus({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[1.65rem] bg-white px-5 py-8 text-center text-sm font-black shadow-[0_18px_45px_rgba(27,28,28,0.06)]",
        tone === "error" ? "text-red-700" : "text-[#777584]"
      )}
    >
      {message}
    </div>
  );
}
