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

export function DailyCheckInsPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Daily Check-Ins</h2>
        <p className="mt-2 text-sm text-slate-500">
          No persisted daily check-in grid has been configured for this client yet.
        </p>
      </section>
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
