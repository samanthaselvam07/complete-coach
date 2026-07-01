"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bell, Calendar, ChevronLeft, ChevronRight, Search, Settings, Share2 } from "lucide-react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";

type SocialConnection = {
  id: string;
  provider: "instagram" | "facebook" | "x";
  accountName: string;
  status: string;
  scopes: string[];
  connectedAt: string;
};

type SocialPostTarget = {
  id: string;
  provider: "instagram" | "facebook" | "x";
  accountName: string;
  status: string;
};

type SocialPost = {
  id: string;
  caption: string;
  scheduledFor: string;
  status: string;
  media: unknown[];
  targets: SocialPostTarget[];
};

const providerLabel = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X"
};

export function SocialMediaPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [loadingSocialData, setLoadingSocialData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSocialData() {
      try {
        const [connectionsResponse, postsResponse] = await Promise.all([
          fetch("/api/v1/social/connections"),
          fetch("/api/v1/social/posts?limit=20")
        ]);

        if (!connectionsResponse.ok || !postsResponse.ok) {
          throw new Error("Social API unavailable");
        }

        const [connectionsPayload, postsPayload] = await Promise.all([
          connectionsResponse.json() as Promise<{ data: SocialConnection[] }>,
          postsResponse.json() as Promise<{ data: SocialPost[] }>
        ]);

        if (isMounted) {
          setConnections(connectionsPayload.data);
          setPosts(postsPayload.data);
        }
      } catch {
        if (isMounted) {
          setConnections([]);
          setPosts([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSocialData(false);
        }
      }
    }

    void loadSocialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedPosts = useMemo(() => {
    return posts;
  }, [posts]);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticScheduledFor = normalizeDateTimeLocal(scheduledFor);
    const optimisticPost: SocialPost = {
      id: optimisticId,
      caption,
      scheduledFor: optimisticScheduledFor,
      status: "scheduled",
      media: [],
      targets: connections
        .filter((connection) => selectedConnectionIds.includes(connection.id))
        .map((connection) => ({
          id: `${optimisticId}-${connection.id}`,
          provider: connection.provider,
          accountName: connection.accountName,
          status: "scheduled"
        }))
    };

    setPosts((currentPosts) => [optimisticPost, ...currentPosts]);

    try {
      const response = await fetch("/api/v1/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          scheduledFor: optimisticScheduledFor,
          targetConnectionIds: selectedConnectionIds,
          media: []
        })
      });

      if (!response.ok) {
        throw new Error("Unable to schedule social post");
      }

      const payload = (await response.json()) as { data: SocialPost };
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === optimisticId ? payload.data : post))
      );
      setCaption("");
      setScheduledFor("");
      setSelectedConnectionIds([]);
      setIsComposerOpen(false);
    } catch (createError) {
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== optimisticId));
      setError(createError instanceof Error ? createError.message : "Unable to schedule social post");
    }
  }

  function toggleConnection(connectionId: string) {
    setSelectedConnectionIds((currentIds) =>
      currentIds.includes(connectionId)
        ? currentIds.filter((id) => id !== connectionId)
        : [...currentIds, connectionId]
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {loadingSocialData ? (
        <CompleteCoachLoadingScreen
          title="Preparing social planner"
          label="Preparing social planner."
        />
      ) : null}
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-black text-slate-950">Social Planner</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <span className="sr-only">Search scheduled content</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search scheduled content..."
              className="h-10 w-72 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <div className="rounded-xl bg-slate-100 p-1">
            <button type="button" className="rounded-lg bg-white px-5 py-2 text-sm font-bold shadow-sm">
              Month
            </button>
            <button type="button" className="rounded-lg px-5 py-2 text-sm font-bold text-slate-600">
              Week
            </button>
          </div>
          <Bell className="h-5 w-5 text-slate-600" aria-hidden="true" />
          <Settings className="h-5 w-5 text-slate-600" aria-hidden="true" />
        </div>
      </header>

      <section className="p-6">
        <div className="mb-6 flex items-center gap-6">
          <button type="button" aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-black text-slate-950">June 2026</h2>
          <button type="button" aria-label="Next month">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {isComposerOpen ? (
          <form
            className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_260px_auto]"
            onSubmit={handleCreatePost}
          >
            <div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="social-caption">
                  Caption
                </label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  id="social-caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </div>
            </div>
            <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="social-scheduled-for">
                  Schedule date
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  id="social-scheduled-for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                />
            </div>
            <fieldset className="space-y-2">
                <legend className="text-sm font-bold text-slate-700">Accounts</legend>
                {connections.length > 0 ? (
                  connections.map((connection) => (
                    <label key={connection.id} className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        checked={selectedConnectionIds.includes(connection.id)}
                        type="checkbox"
                        onChange={() => toggleConnection(connection.id)}
                      />
                      {connection.accountName}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Connect a social account before scheduling new posts.</p>
                )}
            </fieldset>
            <div className="flex items-end">
              <button
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                type="submit"
              >
                Schedule post
              </button>
            </div>
            {error ? <p className="text-sm font-medium text-red-600 lg:col-span-3">{error}</p> : null}
          </form>
        ) : null}

        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-7">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
            <div key={day} className="border-b border-slate-200 py-3 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
              {day}
            </div>
          ))}
          {calendarDays.map((day) => (
            <div key={`${day.label}-${day.date}`} className="min-h-28 border-b border-r border-slate-200 p-3 last:border-r-0">
              <div className={day.today ? "mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white" : "mb-3 text-slate-700"}>
                {day.date}
              </div>
              {day.events.map((event) => (
                <div key={event.title} className={`mb-2 truncate rounded-lg px-2 py-1 text-xs font-bold ${event.className}`}>
                  {event.title}
                </div>
              ))}
            </div>
          ))}
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Scheduled queue">
          {displayedPosts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {post.targets.map((target) => (
                  <span key={target.id} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                    <Share2 className="h-3 w-3" aria-hidden="true" />
                    {target.accountName || providerLabel[target.provider]}
                  </span>
                ))}
                <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{post.status}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{post.caption}</p>
              <span className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {formatScheduledDate(post.scheduledFor)}
              </span>
            </article>
          ))}
        </section>

        <div className="fixed bottom-6 right-6">
          <button
            className="rounded-full bg-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700"
            type="button"
            onClick={() => setIsComposerOpen((value) => !value)}
          >
            + Schedule Post
          </button>
        </div>
      </section>
    </main>
  );
}

const calendarDays = [
  { label: "prev", date: "31", today: false, events: [] },
  { label: "day", date: "1", today: false, events: [] },
  { label: "day", date: "2", today: false, events: [{ title: "Morning Routine", className: "bg-slate-100 text-slate-600" }] },
  { label: "day", date: "3", today: false, events: [] },
  { label: "day", date: "4", today: true, events: [{ title: "Reels: HIIT Circuit", className: "bg-slate-100 text-slate-600" }] },
  { label: "day", date: "5", today: false, events: [] },
  { label: "day", date: "6", today: false, events: [] },
  { label: "day", date: "7", today: false, events: [] },
  { label: "day", date: "8", today: false, events: [{ title: "TikTok Viral...", className: "bg-black text-white" }, { title: "Republish: FB", className: "bg-blue-600 text-white" }] },
  { label: "day", date: "9", today: false, events: [] },
  { label: "day", date: "10", today: false, events: [] },
  { label: "day", date: "11", today: false, events: [] },
  { label: "day", date: "12", today: false, events: [] },
  { label: "day", date: "13", today: false, events: [] },
  { label: "day", date: "14", today: false, events: [] },
  { label: "day", date: "15", today: false, events: [{ title: "Nutrition Spotlight", className: "bg-orange-100 text-orange-700" }] },
  { label: "day", date: "16", today: false, events: [] },
  { label: "day", date: "17", today: false, events: [] },
  { label: "day", date: "18", today: false, events: [] },
  { label: "day", date: "19", today: false, events: [] },
  { label: "day", date: "20", today: false, events: [] },
  { label: "day", date: "21", today: false, events: [] },
  { label: "day", date: "22", today: false, events: [] },
  { label: "day", date: "23", today: false, events: [] },
  { label: "day", date: "24", today: false, events: [] },
  { label: "day", date: "25", today: false, events: [] },
  { label: "day", date: "26", today: false, events: [] },
  { label: "day", date: "27", today: false, events: [] },
  { label: "day", date: "28", today: false, events: [] },
  { label: "day", date: "29", today: false, events: [] },
  { label: "day", date: "30", today: false, events: [] },
  { label: "next", date: "1", today: false, events: [] },
  { label: "next", date: "2", today: false, events: [] },
  { label: "next", date: "3", today: false, events: [] },
  { label: "next", date: "4", today: false, events: [] }
];

function normalizeDateTimeLocal(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return `${value}:00.000Z`;
  }

  return new Date(value).toISOString();
}

function formatScheduledDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
