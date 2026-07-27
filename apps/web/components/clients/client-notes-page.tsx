"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import type { ClientSummary } from "@/lib/clients/client-models";
import type { ClientNoteSummary } from "@/lib/clients/client-notes";

export function ClientNotesPage({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [notes, setNotes] = useState<ClientNoteSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadClient() {
      try {
        const response = await fetch(`/api/v1/clients/${clientId}`);

        if (!response.ok) {
          throw new Error("Client not found.");
        }

        const payload = (await response.json()) as { data?: ClientSummary };

        if (active) {
          setClient(payload.data ?? null);
        }
      } catch {
        if (active) {
          setClient(null);
        }
      }
    }

    void loadClient();

    return () => {
      active = false;
    };
  }, [clientId]);

  useEffect(() => {
    let active = true;

    async function loadNotes() {
      setLoading(true);

      try {
        const params = new URLSearchParams({ limit: "100" });

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        if (searchDate) {
          params.set("date", searchDate);
        }

        const response = await fetch(`/api/v1/clients/${clientId}/notes?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Notes unavailable.");
        }

        const payload = (await response.json()) as { data?: ClientNoteSummary[] };

        if (active) {
          setNotes(payload.data ?? []);
        }
      } catch {
        if (active) {
          setNotes([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(() => void loadNotes(), 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [clientId, searchDate, searchQuery]);

  if (!client && loading) {
    return <CompleteCoachLoadingScreen title="Preparing client notes" label="Preparing client notes." />;
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-8">
        <Link href="/clients" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to clients
        </Link>
        <section className="rounded-2xl border border-gray-200 bg-white p-10">
          <h1 className="mb-2 text-3xl font-bold">Client Notes Not Found</h1>
          <p className="text-gray-600">This client was not found in the Neon database.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <Link href={`/clients/${client.id}` as Route} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to profile
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-950">{client.name} Notes</h1>
        <p className="mt-2 text-sm text-slate-600">Search coaching notes by word or note date.</p>
      </div>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Search notes</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                placeholder="Search by word..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Search date</span>
            <input
              type="date"
              value={searchDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setSearchDate(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-label="Client notes timeline">
        {loading ? <p className="text-sm text-slate-500">Loading notes...</p> : null}

        {!loading && notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No notes match your search.
          </p>
        ) : null}

        {notes.length > 0 ? (
          <ol className="space-y-5">
            {notes.map((note) => (
              <li key={note.id} className="relative border-l-2 border-indigo-100 pl-5">
                <span className="absolute -left-[5px] top-2 size-2 rounded-full bg-indigo-600" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-950">{formatNoteDate(note.noteDate)}</span>
                  <span className="text-xs text-slate-500">Added by {note.authorName}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}
