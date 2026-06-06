"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AuditRecord {
  id: string;
  action: string;
  actor: { id: string; name: string | null } | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export function AuditLogPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/v1/audit-logs?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
        );

        if (!response.ok) {
          throw new Error("Audit API unavailable.");
        }

        const payload = (await response.json()) as { data: AuditRecord[] };

        if (active) {
          setRecords(payload.data);
          setNextCursor(response.headers.get("x-next-cursor"));
        }
      } catch {
        if (active) {
          setError("Audit events could not be loaded.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      active = false;
    };
  }, [cursor]);

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <ShieldCheck aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-3xl font-black">Audit Log</h1>
        <p className="text-sm text-slate-600">
          Review sensitive organization actions and access events.
        </p>
      </header>

      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p role="status" className="text-sm text-slate-500">Loading audit events...</p> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="whitespace-nowrap px-5 py-4">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">{record.actor?.name ?? "System/API"}</td>
                  <td className="px-5 py-4 font-semibold">{record.action}</td>
                  <td className="px-5 py-4">
                    {record.targetType ?? "organization"}
                    {record.targetId ? ` / ${record.targetId}` : ""}
                  </td>
                  <td className="max-w-sm px-5 py-4 text-xs text-slate-600">
                    {record.metadata ? JSON.stringify(record.metadata) : "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No audit events found.</p>
          ) : null}
        </div>
      ) : null}

      {nextCursor ? (
        <Button type="button" variant="outline" onClick={() => setCursor(nextCursor)}>
          Load older events
        </Button>
      ) : null}
    </main>
  );
}
