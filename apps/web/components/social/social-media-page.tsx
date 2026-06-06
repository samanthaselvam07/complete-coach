"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BarChart3, Calendar, Image, Share2 } from "lucide-react";

import { scheduledPosts, socialAnalytics } from "@/fixtures/operations";

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

const providerTone = {
  instagram: "bg-pink-50 text-pink-600",
  facebook: "bg-blue-50 text-blue-600",
  x: "bg-sky-50 text-sky-500"
};

const fixturePlatformIcon = {
  Instagram: Share2,
  Facebook: Share2,
  Twitter: Share2
};

export function SocialMediaPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
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
          setIsFallback(false);
        }
      } catch {
        if (isMounted) {
          setIsFallback(true);
        }
      }
    }

    void loadSocialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedPosts = useMemo(() => {
    if (!isFallback) {
      return posts;
    }

    return scheduledPosts.map((post) => ({
      id: post.id,
      caption: post.content,
      scheduledFor: post.scheduled,
      status: post.status,
      media: [],
      targets: [
        {
          id: `${post.id}-${post.platform}`,
          provider: post.platform === "Instagram" ? "instagram" : post.platform === "Facebook" ? "facebook" : "x",
          accountName: post.platform,
          status: post.status
        }
      ]
    })) satisfies SocialPost[];
  }, [isFallback, posts]);

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
    setIsFallback(false);

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
    <main className="space-y-8 p-6 lg:p-8">
      <header>
        <h1 className="mb-2 text-3xl font-black">Social Media Hub</h1>
        <p className="text-sm text-slate-600">Manage your social presence and track engagement across platforms.</p>
      </header>

      {isFallback ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Social integrations are in read-only fallback mode until the API is available.
        </div>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {socialAnalytics.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</span>
              <span className="text-xs font-bold text-green-600">{stat.change}</span>
            </div>
            <div className="text-2xl font-black">{stat.value}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">Scheduled Posts</h2>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
              type="button"
              onClick={() => setIsComposerOpen((value) => !value)}
            >
              + New Post
            </button>
          </div>

          {isComposerOpen ? (
            <form
              className="mb-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={handleCreatePost}
            >
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
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              <button
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                type="submit"
              >
                Schedule post
              </button>
            </form>
          ) : null}

          <div className="space-y-4">
            {displayedPosts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex gap-4">
                  <div className="hidden h-24 w-24 shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-orange-400 sm:block" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {post.targets.map((target) => (
                        <span key={target.id} className="inline-flex items-center gap-2 text-sm font-bold">
                          <Share2 className="h-4 w-4" />
                          {providerLabel[target.provider]}
                        </span>
                      ))}
                      <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                        {post.status}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-slate-700">{post.caption}</p>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {formatScheduledDate(post.scheduledFor)}
                    </span>
                  </div>
                  <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700" type="button">
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside>
          <h2 className="mb-4 text-xl font-black">Platform Overview</h2>
          <div className="mb-6 space-y-4">
            {isFallback
              ? (["Instagram", "Facebook", "Twitter"] as const).map((platform) => {
                  const Icon = fixturePlatformIcon[platform];
                  return (
                    <article key={platform} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{platform}</div>
                          <div className="text-xs text-slate-500">Fixture overview</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600">Read-only social planning data.</div>
                    </article>
                  );
                })
              : connections.map((connection) => (
                  <article key={connection.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${providerTone[connection.provider]}`}
                      >
                        <Share2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">{connection.accountName}</div>
                        <div className="text-xs text-slate-500">{providerLabel[connection.provider]}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">Status: {connection.status}</div>
                  </article>
                ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:bg-slate-50" type="button">
              <BarChart3 className="mx-auto mb-2 h-5 w-5 text-indigo-600" />
              <span className="text-xs font-bold">Analytics</span>
            </button>
            <button className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:bg-slate-50" type="button">
              <Image className="mx-auto mb-2 h-5 w-5 text-purple-600" />
              <span className="text-xs font-bold">Media</span>
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

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
