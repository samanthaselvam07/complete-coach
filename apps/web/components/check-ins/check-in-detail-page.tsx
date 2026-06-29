"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

interface ApiCheckInRecord {
  id: string;
  clientId?: string;
  name: string;
  submittedAt: string;
  dueAt?: string | null;
  summary?: string | null;
  coachNotes?: string | null;
  status: string;
}

interface CheckInDetailView {
  id: string;
  week: string;
  submitted: string;
  assigned: string;
  recordingUrl: string | null;
  measurements: Record<string, string>;
  wellbeing: Record<string, string>;
  wins: string;
  struggles: string;
  dietNotes: string;
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
  const [comparisonSelection, setComparisonSelection] = useState("");
  const selectedComparisonId = typeof compare === "string" && compare !== "previous" ? compare : "";
  const isComparing = Boolean(compare);
  const compareFormAction = embedded ? `/clients/${clientId}` : `/clients/${clientId}/check-ins/${checkInId}`;
  const currentHref = embedded
    ? `/clients/${clientId}?tab=check-ins&checkInId=${encodeURIComponent(checkInId)}`
    : `/clients/${clientId}/check-ins/${checkInId}`;
  const backHref = embedded ? `/clients/${clientId}?tab=check-ins` : `/clients/${clientId}`;
  const selectedCheckIn = useMemo(() => checkIns.find((item) => item.id === checkInId) ?? checkIns[0] ?? null, [checkInId, checkIns]);
  const comparedCheckIn = useMemo(
    () => checkIns.find((item) => item.id === selectedComparisonId) ?? checkIns.find((item) => item.id !== selectedCheckIn?.id) ?? null,
    [checkIns, selectedCheckIn?.id, selectedComparisonId]
  );
  const checkInOptions = checkIns.map((item) => ({ id: item.id, label: `${item.name} - ${formatCheckInDate(item.submittedAt)}` }));
  const compareOptions = checkInOptions.filter((option) => option.id !== selectedCheckIn?.id);
  const currentCheckInValue = selectedCheckIn?.id ?? "";
  const selectedCompareValue = comparisonSelection || selectedComparisonId || compareOptions[0]?.id || "";

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

  useEffect(() => {
    if (selectedComparisonId) {
      setComparisonSelection(selectedComparisonId);
      return;
    }

    if (compareOptions[0]?.id && !comparisonSelection) {
      setComparisonSelection(compareOptions[0].id);
    }
  }, [compareOptions, comparisonSelection, selectedComparisonId]);

  return (
    <main className={embedded ? "overflow-hidden rounded-xl border border-slate-200 bg-white" : "min-h-screen bg-gray-50"}>
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600" aria-label="Check-in actions">
          <Link href={currentHref as Route} className="hover:text-indigo-600">
            Reply
          </Link>
          {isComparing ? (
            <Link href={currentHref as Route} className="hover:text-indigo-600">
              Close
            </Link>
          ) : null}
          <Link href={backHref as Route} className="hover:text-indigo-600">
            Go Back
          </Link>
        </nav>
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
        <section className="bg-white p-6 text-sm text-slate-500">Loading check-in from the database...</section>
      ) : !selectedCheckIn ? (
        <section className="bg-white p-6 text-sm text-slate-500">No persisted check-in was found for this client.</section>
      ) : isComparing && comparedCheckIn ? (
        <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <CheckInColumn title="Previous Check in" checkIn={mapApiCheckInToDetail(comparedCheckIn)} muted />
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

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-indigo-950">Check-In Recording</p>
            {checkIn.recordingUrl ? (
              <a href={checkIn.recordingUrl} className="text-sm font-bold text-indigo-600">
                {checkIn.recordingUrl}
              </a>
            ) : (
              <span className="text-sm font-bold text-slate-500">No recording attached</span>
            )}
          </div>
          <button type="button" className="text-sm font-bold text-indigo-600">Copy Link</button>
        </div>
      </section>

      <MetricGroup title="Key Measurements" metrics={checkIn.measurements} />
      <MetricGroup title="Well-being" metrics={checkIn.wellbeing} />
      <TextPanel title="Wins" tone="text-green-600" body={checkIn.wins} />
      <TextPanel title="Struggles" tone="text-red-600" body={checkIn.struggles} />
      <TextPanel title="Diet Notes" tone="text-slate-700" body={checkIn.dietNotes} />
    </section>
  );
}

function MetricGroup({
  title,
  metrics,
  deltas
}: {
  title: string;
  metrics: Record<string, string>;
  deltas?: Record<string, string>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-bold text-slate-700">{title}</h2>
      <dl className="grid gap-3 md:grid-cols-2">
        {Object.entries(metrics).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-bold text-slate-950">
              {deltas?.[label] ? (
                <span className={deltas[label].startsWith("-") ? "mr-3 text-red-600" : "mr-3 text-green-600"}>
                  {deltas[label]}
                </span>
              ) : null}
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TextPanel({ title, tone, body }: { title: string; tone: string; body: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className={`mb-3 text-sm font-bold ${tone}`}>{title}</h2>
      <p className="text-sm leading-6 text-slate-700">{body}</p>
    </section>
  );
}

function mapApiCheckInToDetail(checkIn: ApiCheckInRecord): CheckInDetailView {
  return {
    id: checkIn.id,
    week: checkIn.name,
    submitted: formatCheckInDateTime(checkIn.submittedAt),
    assigned: checkIn.dueAt ? formatCheckInDateTime(checkIn.dueAt) : "Not assigned",
    recordingUrl: null,
    measurements: {
      Weight: "Not recorded",
      Waist: "Not recorded",
      "Body Fat": "Not recorded",
      Chest: "Not recorded"
    },
    wellbeing: {
      "Energy Level": "Not recorded",
      "Sleep Quality": "Not recorded",
      "Stress Level": "Not recorded",
      Adherence: "Not recorded"
    },
    wins: checkIn.summary ?? "No persisted wins summary has been recorded.",
    struggles: checkIn.coachNotes ?? "No persisted struggles summary has been recorded.",
    dietNotes: "No persisted diet notes have been recorded."
  };
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
