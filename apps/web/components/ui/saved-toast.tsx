"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SavedToastProps {
  durationMs?: number;
  message?: string;
}

export function SavedToast({ durationMs = 5000, message = "Saved" }: SavedToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, message]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed right-6 top-6 z-[80] flex max-w-sm items-start gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl"
    >
      <span className="mt-0.5 rounded-full bg-indigo-600 p-1 text-white">
        <CheckCircle2 className="size-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-black text-slate-950">Saved</span>
        {message !== "Saved" ? <span className="mt-0.5 block text-slate-500">{message}</span> : null}
      </span>
    </div>
  );
}
