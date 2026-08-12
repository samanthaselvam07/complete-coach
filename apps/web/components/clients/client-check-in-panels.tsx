"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ApiCheckInRecord {
  id: string;
  name: string;
  submittedAt: string;
  dueAt?: string | null;
  status: string;
  summary?: string | null;
  coachNotes?: string | null;
}

interface ApiDailySubmissionRecord {
  id: string;
  answers: unknown;
  formName: string;
  submittedAt: string;
}

export function DailyCheckInsPanel({ clientId }: { clientId: string }) {
  const [submissions, setSubmissions] = useState<ApiDailySubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDailyCheckIns() {
      try {
        const params = new URLSearchParams({
          clientId,
          formType: "habit-tracker",
          status: "submitted",
          limit: "100"
        });
        const response = await fetch(`/api/v1/form-submissions?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Daily check-in API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiDailySubmissionRecord[] };

        if (active) {
          setSubmissions(payload.data ?? []);
        }
      } catch {
        if (active) {
          setSubmissions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDailyCheckIns();

    return () => {
      active = false;
    };
  }, [clientId]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Daily Check-Ins</h2>
        <p className="mt-2 text-sm text-slate-500">Daily habit submissions from the client app</p>
      </section>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Preparing daily check-ins...</p>
      ) : submissions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No persisted daily check-ins were found for this client.
        </p>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <article key={submission.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">{submission.formName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{formatCheckInDate(submission.submittedAt)}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Submitted</span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {formatDailyAnswers(submission.answers).map((answer) => (
                  <div key={answer.key} className="rounded-xl bg-slate-50 px-3 py-2">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{answer.label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">{answer.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function CheckInHistoryPanel({ clientId }: { clientId: string }) {
  const [checkIns, setCheckIns] = useState<ApiCheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCheckIns() {
      try {
        const params = new URLSearchParams({ clientId, limit: "100" });
        const response = await fetch(`/api/v1/check-ins?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Check-in API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiCheckInRecord[] };

        if (active) {
          setCheckIns(payload.data ?? []);
        }
      } catch {
        if (active) {
          setCheckIns([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCheckIns();

    return () => {
      active = false;
    };
  }, [clientId]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Check-In History</h2>
        <p className="text-sm text-slate-500">View all persisted weekly check-ins and progress over time</p>
      </section>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Preparing check-ins...</p>
      ) : checkIns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No persisted check-ins were found for this client.
        </p>
      ) : (
        checkIns.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">
                  {entry.name}
                  <span className="ml-3 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold capitalize text-indigo-600">
                    {entry.status}
                  </span>
                </h3>
                <p className="mt-2 text-sm text-slate-500">{formatCheckInDate(entry.submittedAt)}</p>
              </div>
              <Link
                href={`/clients/${clientId}/check-ins/${entry.id}`}
                aria-label={`Open ${entry.name} check-in`}
                className="text-2xl text-slate-400 hover:text-indigo-600"
              >
                &gt;
              </Link>
            </div>

            <div className="grid gap-5 border-y border-slate-100 py-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold text-green-600">Summary</p>
                <p className="text-sm text-slate-700">{entry.summary ?? "No persisted summary was recorded."}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-indigo-600">Coach Notes</p>
                <p className="text-sm text-slate-700">{entry.coachNotes ?? "No persisted coach notes were recorded."}</p>
              </div>
            </div>

            <Link href={`/clients/${clientId}/check-ins/${entry.id}`} className="mt-4 inline-block text-sm font-bold text-indigo-600">
              View Full Check-In
            </Link>
          </article>
        ))
      )}
    </div>
  );
}

function formatCheckInDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function formatDailyAnswers(answers: unknown) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return [{ key: "empty", label: "Submission", value: "No answers were recorded." }];
  }

  const entries = Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      key,
      label: formatAnswerLabel(key),
      value: formatAnswerValue(value)
    }));

  return entries.length > 0 ? entries : [{ key: "empty", label: "Submission", value: "No answers were recorded." }];
}

function formatAnswerLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAnswerValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}
