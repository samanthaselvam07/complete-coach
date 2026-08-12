"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";

interface ApiCheckInRecord {
  id: string;
  clientId?: string;
  name: string;
  submittedAt: string;
  dueAt?: string | null;
  summary?: string | null;
  coachNotes?: string | null;
  status: string;
  checkInStatus?: string;
  answers?: Record<string, unknown> | null;
  submission?: {
    formName?: string;
    formVersion?: {
      schema?: {
        title?: string;
        fields?: Array<{
          id: string;
          type: string;
          label: string;
        }>;
      };
    };
  } | null;
}

interface CheckInDetailView {
  id: string;
  week: string;
  submitted: string;
  assigned: string;
  status: string;
  questions: Array<{ id: string; label: string; answer: string }>;
  photos: Array<{ label: string; url: string }>;
}

export function CheckInDetailPage({
  clientId = "1",
  checkInId,
  compare = false,
  embedded = false
}: {
  clientId?: string;
  checkInId: string;
  compare?: boolean | string;
  embedded?: boolean;
}) {
  const [checkIns, setCheckIns] = useState<ApiCheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [comparisonSelection, setComparisonSelection] = useState("");
  const selectedComparisonId = typeof compare === "string" && compare !== "previous" ? compare : "";
  const isComparing = Boolean(compare);
  const compareFormAction = embedded ? `/clients/${clientId}` : `/clients/${clientId}/check-ins/${checkInId}`;
  const currentHref = embedded
    ? `/clients/${clientId}?tab=check-ins&checkInId=${encodeURIComponent(checkInId)}`
    : `/clients/${clientId}/check-ins/${checkInId}`;
  const backHref = embedded ? `/clients/${clientId}?tab=check-ins` : `/clients/${clientId}`;
  const selectedCheckIn = useMemo(() => checkIns.find((item) => item.id === checkInId) ?? checkIns[0] ?? null, [checkInId, checkIns]);
  const checkInOptions = checkIns.map((item) => ({ id: item.id, label: `${item.name} - ${formatCheckInDate(item.submittedAt)}` }));
  const compareOptions = checkInOptions.filter((option) => option.id !== selectedCheckIn?.id);
  const currentCheckInValue = selectedCheckIn?.id ?? "";
  const selectedCompareValue = comparisonSelection || selectedComparisonId || compareOptions[0]?.id || "";
  const comparedCheckIn = checkIns.find((item) => item.id === selectedCompareValue) ?? null;

  const hydrateCheckInDetail = useCallback(async (id: string, active: boolean) => {
    try {
      const response = await fetch(`/api/v1/check-ins/${id}`);

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: ApiCheckInRecord };

      if (active && payload.data && !Array.isArray(payload.data)) {
        setCheckIns((currentCheckIns) =>
          currentCheckIns.map((item) => (item.id === id ? { ...item, ...payload.data } : item))
        );
      }
    } catch {
      // Keep the list-backed check-in if the detail endpoint is unavailable.
    }
  }, []);

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
          const current = (payload.data ?? []).find((item) => item.id === checkInId) ?? payload.data?.[0] ?? null;
          const comparisonId = selectedComparisonId || (compare ? findPreviousCheckInId(payload.data ?? [], current?.id) : "");
          const idsToHydrate = [current?.id, comparisonId].filter(Boolean) as string[];

          await Promise.all(idsToHydrate.map((id) => hydrateCheckInDetail(id, active)));
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
  }, [checkInId, clientId, compare, hydrateCheckInDetail, selectedComparisonId]);

  async function completeCheckIn() {
    if (!selectedCheckIn || completing) {
      return;
    }

    setCompleting(true);
    setCompleteError(null);

    try {
      const response = await fetch(`/api/v1/check-ins/${selectedCheckIn.id}/complete`, { method: "POST" });

      if (!response.ok) {
        throw new Error("Unable to complete check-in.");
      }

      const payload = (await response.json()) as { data?: ApiCheckInRecord };

      setCheckIns((currentCheckIns) =>
        currentCheckIns.map((item) =>
          item.id === selectedCheckIn.id
            ? { ...item, status: "completed", checkInStatus: "completed", ...payload.data }
            : item
        )
      );
    } catch {
      setCompleteError("Check-in could not be marked complete. Try again.");
    } finally {
      setCompleting(false);
    }
  }

  if (loading && !embedded) {
    return (
      <CompleteCoachLoadingScreen
        title="Preparing check-in"
        label="Preparing check-in detail."
      />
    );
  }

  return (
    <main className={embedded ? "overflow-hidden rounded-xl border border-slate-200 bg-white" : "min-h-screen bg-gray-50"}>
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600" aria-label="Check-in actions">
          {isComparing ? (
            <Link href={currentHref as Route} className="hover:text-indigo-600">
              Close
            </Link>
          ) : null}
          <Link href={backHref as Route} className="hover:text-indigo-600">
            Go Back
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          {selectedCheckIn?.checkInStatus === "completed" || selectedCheckIn?.status === "completed" ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">Completed</span>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
              disabled={!selectedCheckIn || completing}
              onClick={() => void completeCheckIn()}
            >
              Complete
            </button>
          )}
          {completeError ? <span className="text-sm font-semibold text-red-600">{completeError}</span> : null}
        </div>
        <form action={compareFormAction} method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {embedded ? (
            <>
              <input type="hidden" name="tab" value="check-ins" />
              <input type="hidden" name="checkInId" value={checkInId} />
            </>
          ) : null}
          <label className="sr-only" htmlFor="current-check-in-select">Current check-in</label>
          <select
            id="current-check-in-select"
            aria-label="Current check-in"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            value={currentCheckInValue}
            onChange={() => undefined}
          >
            {checkInOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="compare-check-in-select">Compare against</label>
          <select
            id="compare-check-in-select"
            aria-label="Compare against"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            name="compare"
            value={selectedCompareValue}
            onChange={(event) => setComparisonSelection(event.target.value)}
          >
            {compareOptions.length === 0 ? <option value="">No previous check-in</option> : null}
            {compareOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className={isComparing ? "rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white" : "rounded-lg border border-indigo-200 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50"}
          >
            Compare
          </button>
        </form>
      </header>

      {loading ? (
        <section className="bg-white p-6 text-sm text-slate-500">Preparing check-in...</section>
      ) : !selectedCheckIn ? (
        <section className="bg-white p-6 text-sm text-slate-500">No persisted check-in was found for this client.</section>
      ) : isComparing ? (
        <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {comparedCheckIn ? (
            <CheckInColumn title="Previous Check in" checkIn={mapApiCheckInToDetail(comparedCheckIn)} muted />
          ) : (
            <section className="bg-gray-50 p-6" aria-label="No comparison check-in">
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                No check in to compare
              </div>
            </section>
          )}
          <CheckInColumn title="Current Checkin" checkIn={mapApiCheckInToDetail(selectedCheckIn)} />
        </div>
      ) : (
        <CheckInColumn title="Current Checkin" checkIn={mapApiCheckInToDetail(selectedCheckIn)} />
      )}
    </main>
  );
}

function CheckInColumn({
  title,
  checkIn,
  muted = false,
}: {
  title: string;
  checkIn: CheckInDetailView;
  muted?: boolean;
}) {
  return (
    <section className={`space-y-5 p-6 ${muted ? "bg-gray-50" : "bg-white"}`}>
      <div>
        <h1 className="text-xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">Submitted on: {checkIn.submitted}</p>
        <p className="mt-1 text-sm text-slate-600">Assigned: {checkIn.assigned}</p>
      </div>

      <section className="bg-white">
        <h2 className="mb-3 text-sm font-bold text-slate-700">Submitted answers</h2>
        {checkIn.questions.length > 0 ? (
          <dl className="divide-y divide-slate-100 border-y border-slate-100">
            {checkIn.questions.map((question) => (
              <div key={question.id} className="grid gap-2 py-3 md:grid-cols-[minmax(180px,0.34fr)_1fr]">
                <dt className="text-sm font-bold text-slate-950">{question.label}</dt>
                <dd className="whitespace-pre-line text-sm leading-6 text-slate-700">{question.answer}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-500">No submitted answers were found for this check-in.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-bold text-slate-700">Submitted photos</h2>
        {checkIn.photos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {checkIn.photos.map((photo, index) => (
              <a key={`${photo.url}-${index}`} href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-200">
                <img src={photo.url} alt={`${photo.label} ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No photos were submitted with this check-in.</p>
        )}
      </section>
    </section>
  );
}

function mapApiCheckInToDetail(checkIn: ApiCheckInRecord): CheckInDetailView {
  const fields = checkIn.submission?.formVersion?.schema?.fields ?? [];
  const answers = isRecord(checkIn.answers) ? checkIn.answers : {};
  const photoFieldIds = new Set(fields.filter((field) => field.type === "photo").map((field) => field.id));
  const questionRows = fields
    .filter((field) => field.type !== "photo")
    .map((field) => ({
      id: field.id,
      label: field.label,
      answer: formatAnswer(answers[field.id])
    }));
  const unknownAnswerRows = Object.entries(answers)
    .filter(([id]) => !fields.some((field) => field.id === id) && !looksLikePhotoAnswer(answers[id]))
    .map(([id, answer]) => ({ id, label: humanizeFieldId(id), answer: formatAnswer(answer) }));

  return {
    id: checkIn.id,
    week: checkIn.name,
    submitted: formatCheckInDateTime(checkIn.submittedAt),
    assigned: checkIn.dueAt ? formatCheckInDateTime(checkIn.dueAt) : "Not assigned",
    status: checkIn.checkInStatus ?? checkIn.status,
    questions: [...questionRows, ...unknownAnswerRows],
    photos: Object.entries(answers).flatMap(([id, answer]) => {
      if (!photoFieldIds.has(id) && !looksLikePhotoAnswer(answer)) {
        return [];
      }

      const label = fields.find((field) => field.id === id)?.label ?? humanizeFieldId(id);
      return getPhotoUrls(answer).map((url) => ({ label, url }));
    })
  };
}

function findPreviousCheckInId(checkIns: ApiCheckInRecord[], currentId?: string) {
  const currentIndex = checkIns.findIndex((item) => item.id === currentId);

  if (currentIndex < 0) {
    return checkIns.find((item) => item.id !== currentId)?.id ?? "";
  }

  return checkIns[currentIndex + 1]?.id ?? "";
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "No answer submitted";
  }

  if (Array.isArray(value)) {
    return value.map(formatAnswer).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getPhotoUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return value ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getPhotoUrls);
  }

  if (isRecord(value)) {
    const possibleUrl = value.url ?? value.src ?? value.href;
    return typeof possibleUrl === "string" ? [possibleUrl] : [];
  }

  return [];
}

function looksLikePhotoAnswer(value: unknown) {
  return getPhotoUrls(value).some((url) => /\.(avif|gif|jpe?g|png|webp)(\?|$)/i.test(url));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function humanizeFieldId(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCheckInDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCheckInDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
}
