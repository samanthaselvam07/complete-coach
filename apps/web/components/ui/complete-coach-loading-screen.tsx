interface CompleteCoachLoadingScreenProps {
  title?: string;
  description?: string;
  label?: string;
}

export function CompleteCoachLoadingScreen({
  title = "Preparing your workspace",
  description = "We're getting your workspace ready.",
  label
}: CompleteCoachLoadingScreenProps) {
  const statusLabel = label ?? `${title}.`;

  return (
    <section
      role="status"
      aria-label={statusLabel}
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-gray-50 px-6"
    >
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-indigo-50">
          <div className="size-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Complete Coach</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>
        <span className="sr-only">{statusLabel}</span>
      </div>
    </section>
  );
}
