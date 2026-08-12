"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FormDefinitionSchema, type FormFieldDefinition } from "@/lib/forms/schema";

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
  formVersion?: {
    schema?: unknown;
  } | null;
}

interface DailyAnswerRow {
  fieldId: string;
  label: string;
  valuesByDay: Map<number, unknown>;
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
        <DailyHabitsWeekTable submissions={submissions} />
      )}
    </div>
  );
}

function DailyHabitsWeekTable({ submissions }: { submissions: ApiDailySubmissionRecord[] }) {
  const latestWeekStart = useMemo(() => getWeekStart(getLatestSubmissionDate(submissions) ?? new Date().toISOString()), [submissions]);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(latestWeekStart, weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const rows = buildDailyAnswerRows(submissions, weekStart);
  const goToPreviousWeek = () => setWeekOffset((currentOffset) => currentOffset - 1);
  const goToNextWeek = () => setWeekOffset((currentOffset) => currentOffset + 1);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-black text-slate-950">{formatWeekRange(weekStart, weekEnd)}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
            onClick={goToPreviousWeek}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next week"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
            onClick={goToNextWeek}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed text-left" aria-label="Daily habits weekly summary">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-black uppercase text-slate-900">
              <th scope="col" className="w-[32%] px-5 py-3">
                Habits
              </th>
              {weekDayLabels.map((label) => (
                <th key={label} scope="col" className="px-3 py-3 text-center">
                  {label}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-center">
                Average
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? rows.map((row, rowIndex) => (
              <tr key={row.fieldId} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                <th scope="row" className="px-5 py-3 text-sm font-semibold leading-5 text-slate-700">
                  {row.label}
                </th>
                {weekDayLabels.map((label, dayIndex) => (
                  <td key={`${row.fieldId}-${label}`} className="px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    {formatDailyCellValue(row.valuesByDay.get(dayIndex))}
                  </td>
                ))}
                <td className="px-3 py-3 text-center text-sm font-semibold text-slate-600">{formatAverage(row)}</td>
              </tr>
            )) : (
              <tr>
                <td className="px-5 py-4 text-sm font-semibold text-slate-500" colSpan={weekDayLabels.length + 2}>
                  No daily check-ins were submitted for this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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

const weekDayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function getLatestSubmissionDate(submissions: ApiDailySubmissionRecord[]) {
  return submissions.reduce<string | null>((latestDate, submission) => {
    if (!latestDate) {
      return submission.submittedAt;
    }

    return new Date(submission.submittedAt).getTime() > new Date(latestDate).getTime() ? submission.submittedAt : latestDate;
  }, null);
}

function buildDailyAnswerRows(submissions: ApiDailySubmissionRecord[], weekStart: Date): DailyAnswerRow[] {
  const rows = new Map<string, DailyAnswerRow>();

  submissions.forEach((submission) => {
    const dayIndex = getWeekDayIndex(submission.submittedAt, weekStart);

    if (dayIndex === null || !isRecord(submission.answers)) {
      return;
    }

    const schemaFields = getSubmissionSchemaFields(submission.formVersion?.schema);
    const schemaFieldsById = new Map(schemaFields.map((field) => [field.id, field]));
    const answerEntries = Object.entries(submission.answers).filter(([, value]) => value !== undefined && value !== null && value !== "");

    answerEntries.forEach(([fieldId, value]) => {
      const field = schemaFieldsById.get(fieldId);
      const existingRow = rows.get(fieldId);
      const row = existingRow ?? {
        fieldId,
        label: field ? getDisplayAnswerLabel(field.label) : getDisplayAnswerLabel(formatAnswerLabel(fieldId)),
        valuesByDay: new Map<number, unknown>()
      };

      row.valuesByDay.set(dayIndex, value);
      rows.set(fieldId, row);
    });
  });

  return Array.from(rows.values());
}

function getSubmissionSchemaFields(schema: unknown): FormFieldDefinition[] {
  const definition = FormDefinitionSchema.safeParse(schema);

  if (!definition.success) {
    return [];
  }

  return definition.data.fields.filter((field) => field.type !== "content-block");
}

function getWeekStart(value: string) {
  const date = new Date(value);
  const baseDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const start = new Date(baseDate);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);

  return start;
}

function getWeekDayIndex(value: string, weekStart: Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dayStart.getTime() - weekStart.getTime()) / 86_400_000);

  return diffDays >= 0 && diffDays <= 6 ? diffDays : null;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function formatWeekRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
  const yearFormatter = new Intl.DateTimeFormat("en", { year: "numeric" });
  const startDay = start.getDate().toString().padStart(2, "0");
  const endDay = end.getDate().toString().padStart(2, "0");

  if (sameMonth) {
    return `${startDay} - ${endDay} ${monthFormatter.format(end)}, ${yearFormatter.format(end)}`;
  }

  return `${startDay} ${monthFormatter.format(start)} - ${endDay} ${monthFormatter.format(end)}, ${yearFormatter.format(end)}`;
}

function formatDailyCellValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return formatAnswerValue(value);
}

function formatAverage(row: DailyAnswerRow) {
  const values = Array.from(row.valuesByDay.values());
  const numericValues = values.map(toFiniteNumber).filter((value): value is number => value !== null);

  if (numericValues.length === 0 || numericValues.length !== values.length) {
    return "-";
  }

  const average = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;

  return Number.isInteger(average) ? String(average) : average.toFixed(2).replace(/\.?0+$/u, "");
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizePresetHabitLabel(label: string) {
  return label
    .replace(/^preset\s+habit\s+/iu, "")
    .replace(/\s+\d+$/u, "")
    .trim();
}

function getDisplayAnswerLabel(label: string) {
  const normalizedLabel = normalizePresetHabitLabel(label);

  return normalizedLabel ? formatAnswerLabel(normalizedLabel) : formatAnswerLabel(label);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatAnswerLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
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
