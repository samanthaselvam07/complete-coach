"use client";

import { Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type GlobalSearchResultType = "task" | "client" | "lead";

interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

const resultTypeLabels: Record<GlobalSearchResultType, string> = {
  task: "Task",
  client: "Client",
  lead: "CRM"
};

export function TopSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLFormElement>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();

    async function searchWorkspace() {
      try {
        const params = new URLSearchParams({ query: trimmedQuery, limit: "5" });
        const response = await fetch(`/api/v1/search?${params.toString()}`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("Global search unavailable.");
        }

        const payload = (await response.json()) as { data?: { results?: GlobalSearchResult[] } };
        setResults(payload.data?.results ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setError("Search is unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void searchWorkspace();

    return () => controller.abort();
  }, [trimmedQuery]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const groupedResults = useMemo(
    () =>
      results.reduce(
        (groups, result) => ({
          ...groups,
          [result.type]: [...groups[result.type], result]
        }),
        { task: [], client: [], lead: [] } as Record<GlobalSearchResultType, GlobalSearchResult[]>
      ),
    [results]
  );

  const showPanel = open && trimmedQuery.length >= 2;

  return (
    <form
      ref={containerRef}
      className="relative w-full max-w-md"
      role="search"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="sr-only" htmlFor="global-search">
        Search tasks, clients, or CRM
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="global-search"
        type="search"
        value={query}
        autoComplete="off"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          setError("");
          setLoading(nextQuery.trim().length >= 2);

          if (nextQuery.trim().length < 2) {
            setResults([]);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search tasks, clients, or CRM"
        className="h-10 w-full rounded-full border border-transparent bg-muted px-10 text-sm outline-none transition-[border,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
      />

      {showPanel ? (
        <div
          id="global-search-results"
          role="region"
          aria-label="Global search results"
          className="absolute left-0 right-0 top-12 z-50 max-h-[28rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          {loading ? <p className="px-3 py-2 text-sm text-slate-500">Searching...</p> : null}
          {error ? <p className="px-3 py-2 text-sm text-red-600">{error}</p> : null}
          {!loading && !error && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No tasks, clients, or CRM leads found.</p>
          ) : null}
          {!loading && !error
            ? (Object.keys(groupedResults) as GlobalSearchResultType[]).map((type) =>
                groupedResults[type].length > 0 ? (
                  <div key={type} className="py-1">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {resultTypeLabels[type]}
                    </p>
                    <div className="space-y-1">
                      {groupedResults[type].map((result) => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          href={result.href as Route}
                          className="block rounded-xl px-3 py-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <span className="block text-sm font-semibold text-slate-950">{result.title}</span>
                          <span className="block truncate text-xs text-slate-500">{result.subtitle}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null
              )
            : null}
        </div>
      ) : null}
    </form>
  );
}
