"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type SocialConnection = {
  id: string;
  provider: "instagram" | "facebook" | "x";
  accountName: string;
  status: string;
};

export function CreatePostPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [caption, setCaption] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadConnections() {
      try {
        const response = await fetch("/api/v1/social/connections");

        if (!response.ok) {
          throw new Error("Unable to load connections");
        }

        const payload = (await response.json()) as { data?: SocialConnection[]; connections?: SocialConnection[] };

        if (isMounted) {
          setConnections(payload.data ?? payload.connections ?? []);
        }
      } catch {
        if (isMounted) {
          setError("Social connections could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setLoadingConnections(false);
        }
      }
    }

    void loadConnections();

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleConnection(connectionId: string) {
    setSelectedConnectionIds((currentIds) =>
      currentIds.includes(connectionId)
        ? currentIds.filter((currentId) => currentId !== connectionId)
        : [...currentIds, connectionId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(false);

    if (!caption.trim() || !scheduledFor || selectedConnectionIds.length === 0) {
      setError("Add a caption, schedule date, and at least one account.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/v1/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          scheduledFor: normalizeDateTimeLocal(scheduledFor),
          targetConnectionIds: selectedConnectionIds,
          media: []
        })
      });

      if (!response.ok) {
        throw new Error("Unable to schedule post");
      }

      setCreated(true);
      setCaption("");
      setScheduledFor("");
      setSelectedConnectionIds([]);
    } catch {
      setError("Post could not be scheduled. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">Content planner</p>
        <h1 className="mb-2 text-3xl font-black text-slate-950">Create Post</h1>
        <p className="text-sm text-slate-600">
          Draft a caption, choose the connected accounts, and schedule the post into the social calendar.
        </p>
      </header>

      <form className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="create-post-caption">
              Caption
            </label>
            <textarea
              id="create-post-caption"
              value={caption}
              className="min-h-36 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="create-post-scheduled-for">
              Schedule date
            </label>
            <input
              id="create-post-scheduled-for"
              type="datetime-local"
              value={scheduledFor}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-slate-700">Accounts</legend>
            {loadingConnections ? <p className="text-sm text-slate-500">Loading social accounts...</p> : null}
            {!loadingConnections && connections.length === 0 ? (
              <p className="text-sm text-slate-500">Connect a social account before scheduling posts.</p>
            ) : null}
            {connections.map((connection) => (
              <label key={connection.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  aria-label={connection.accountName}
                  type="checkbox"
                  checked={selectedConnectionIds.includes(connection.id)}
                  onChange={() => toggleConnection(connection.id)}
                />
                <span>
                  <span className="font-bold">{connection.accountName}</span>
                  <span className="ml-2 text-xs uppercase text-slate-500">{connection.provider}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        {created ? <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800">Post scheduled.</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
          >
            Schedule post
          </button>
          <Link className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700" href="/social-media">
            Back to social hub
          </Link>
        </div>
      </form>
    </main>
  );
}

function normalizeDateTimeLocal(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return `${value}:00.000Z`;
  }

  return new Date(value).toISOString();
}
