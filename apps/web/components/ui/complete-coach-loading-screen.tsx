"use client";

import { useEffect, useState } from "react";

interface CompleteCoachLoadingScreenProps {
  title?: string;
  description?: string;
  label?: string;
  delayMs?: number;
}

export function CompleteCoachLoadingScreen({
  title = "Preparing your workspace",
  description = "We're getting your workspace ready.",
  label,
  delayMs = 160
}: CompleteCoachLoadingScreenProps) {
  const [showDelayedLoader, setShowDelayedLoader] = useState(false);
  const statusLabel = label ?? `${title}.`;
  const showLoader = delayMs <= 0 || showDelayedLoader;

  useEffect(() => {
    if (delayMs <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => setShowDelayedLoader(true), delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs]);

  if (!showLoader) {
    return null;
  }

  return (
    <section
      role="status"
      aria-label={statusLabel}
      className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gray-50 px-6 py-10"
    >
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50" aria-hidden="true">
            <div className="size-5 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-950">Complete Coach</p>
            <p className="truncate text-xs text-gray-500">{title}</p>
          </div>
        </div>
        <div className="space-y-3" aria-hidden="true">
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-100" />
          <div className="h-3 w-3/5 animate-pulse rounded-full bg-gray-100" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="h-12 animate-pulse rounded-md bg-indigo-50" />
            <div className="h-12 animate-pulse rounded-md bg-violet-50" />
            <div className="h-12 animate-pulse rounded-md bg-orange-50" />
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-gray-500">{description}</p>
        <span className="sr-only">{statusLabel}</span>
      </div>
    </section>
  );
}
