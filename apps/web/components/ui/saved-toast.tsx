import { CheckCircle2 } from "lucide-react";

interface SavedToastProps {
  message?: string;
}

export function SavedToast({ message = "Saved" }: SavedToastProps) {
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
