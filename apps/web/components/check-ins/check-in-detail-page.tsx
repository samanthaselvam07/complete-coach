import Link from "next/link";
import type { Route } from "next";

const currentCheckIn = {
  week: "Week 24",
  date: "April 18, 2026",
  submitted: "April 18, 2026 08:24 AM",
  assigned: "April 18, 2026 08:12 AM",
  recordingUrl: "https://app.usetrellis.com/recording/week24-checkin",
  measurements: {
    Weight: "84.2kg",
    Waist: "80.2cm",
    "Body Fat": "13.4%",
    Chest: "101.5cm"
  },
  wellbeing: {
    "Energy Level": "8/10",
    "Sleep Quality": "7/10",
    "Stress Level": "4/10",
    Adherence: "90%"
  },
  wins: "Hit new squat PR at 120kg. Slept 7+ hours every night except Friday.",
  struggles: "Cravings for sugar mid-afternoon. Struggling with meal prep on weekends.",
  dietNotes: "Followed the meal plan 6/7 days. Had a cheat meal on Saturday for a family event. Hit protein targets consistently."
};

const previousCheckIn = {
  week: "Week 23",
  date: "April 11, 2026",
  submitted: "April 11, 2026 08:24 AM",
  assigned: "April 11, 2026 08:12 AM",
  recordingUrl: "https://app.usetrellis.com/recording/week23-checkin",
  measurements: {
    Weight: "85kg",
    Waist: "80.8cm",
    "Body Fat": "13.9%",
    Chest: "101cm"
  },
  wellbeing: {
    "Energy Level": "6/10",
    "Sleep Quality": "6/10",
    "Stress Level": "6/10",
    Adherence: "78%"
  },
  wins: "Still managed to get 3 workouts in despite busy week.",
  struggles: "Work stress affecting sleep and nutrition. Missed sessions.",
  dietNotes: "Struggled this week. Work was stressful and missed two meal preps. Protein was low on 3 days."
};

const checkInOptions = [
  { id: "week-24", label: "Week 24 - April 18, 2026" },
  { id: "demo-weekly-check-in", label: "Week 24 - April 18, 2026" },
  { id: "week-23", label: "Week 23 - April 11, 2026" },
  { id: "week-22", label: "Week 22 - April 04, 2026" }
] as const;

const compareOptions = checkInOptions.filter((option) => option.id !== "week-24" && option.id !== "demo-weekly-check-in");

export function CheckInDetailPage({
  clientId = "1",
  checkInId,
  compare = false,
  embedded = false
}: {
  clientId?: string;
  checkInId: string;
  compare?: boolean | string;
  embedded?: boolean;
}) {
  const selectedComparisonId = typeof compare === "string" && compare !== "previous" ? compare : "week-23";
  const isComparing = Boolean(compare);
  const currentCheckInValue = checkInOptions.some((option) => option.id === checkInId) ? checkInId : "week-24";
  const compareFormAction = embedded ? `/clients/${clientId}` : `/clients/${clientId}/check-ins/${checkInId}`;
  const currentHref = embedded
    ? `/clients/${clientId}?tab=check-ins&checkInId=${encodeURIComponent(checkInId)}`
    : `/clients/${clientId}/check-ins/${checkInId}`;
  const backHref = embedded ? `/clients/${clientId}?tab=check-ins` : `/clients/${clientId}`;

  return (
    <main className={embedded ? "overflow-hidden rounded-xl border border-slate-200 bg-white" : "min-h-screen bg-gray-50"}>
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600" aria-label="Check-in actions">
          <Link href={currentHref as Route} className="hover:text-indigo-600">
            Reply
          </Link>
          {isComparing ? (
            <Link href={currentHref as Route} className="hover:text-indigo-600">
              Close
            </Link>
          ) : null}
          <Link href={backHref as Route} className="hover:text-indigo-600">
            Go Back
          </Link>
        </nav>
        <form action={compareFormAction} method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {embedded ? (
            <>
              <input type="hidden" name="tab" value="check-ins" />
              <input type="hidden" name="checkInId" value={checkInId} />
            </>
          ) : null}
          <label className="sr-only" htmlFor="current-check-in-select">Current check-in</label>
          <select
            id="current-check-in-select"
            aria-label="Current check-in"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            defaultValue={currentCheckInValue}
          >
            {checkInOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="compare-check-in-select">Compare against</label>
          <select
            id="compare-check-in-select"
            aria-label="Compare against"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            name="compare"
            defaultValue={selectedComparisonId}
          >
            {compareOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className={isComparing ? "rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white" : "rounded-lg border border-indigo-200 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50"}
          >
            Compare
          </button>
        </form>
      </header>

      {isComparing ? (
        <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <CheckInColumn title="Previous Check in" checkIn={previousCheckIn} muted />
          <CheckInColumn title="Current Checkin" checkIn={currentCheckIn} showDeltas />
        </div>
      ) : (
        <CheckInColumn title="Current Checkin" checkIn={currentCheckIn} />
      )}
    </main>
  );
}

function CheckInColumn({
  title,
  checkIn,
  muted = false,
  showDeltas = false
}: {
  title: string;
  checkIn: typeof currentCheckIn;
  muted?: boolean;
  showDeltas?: boolean;
}) {
  return (
    <section className={`space-y-5 p-6 ${muted ? "bg-gray-50" : "bg-white"}`}>
      <div>
        <h1 className="text-xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">Submitted on: {checkIn.submitted}</p>
        <p className="mt-1 text-sm text-slate-600">Assigned: {checkIn.assigned}</p>
      </div>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-indigo-950">Check-In Recording</p>
            <a href={checkIn.recordingUrl} className="text-sm font-bold text-indigo-600">
              {checkIn.recordingUrl}
            </a>
          </div>
          <button type="button" className="text-sm font-bold text-indigo-600">Copy Link</button>
        </div>
      </section>

      <MetricGroup title="Key Measurements" metrics={checkIn.measurements} deltas={showDeltas ? measurementDeltas : undefined} />
      <MetricGroup title="Well-being" metrics={checkIn.wellbeing} deltas={showDeltas ? wellbeingDeltas : undefined} />
      <TextPanel title="Wins" tone="text-green-600" body={checkIn.wins} />
      <TextPanel title="Struggles" tone="text-red-600" body={checkIn.struggles} />
      <TextPanel title="Diet Notes" tone="text-slate-700" body={checkIn.dietNotes} />
    </section>
  );
}

const measurementDeltas: Record<string, string> = {
  Weight: "-0.8kg",
  Waist: "-0.6cm",
  "Body Fat": "-0.5%",
  Chest: "+0.5cm"
};

const wellbeingDeltas: Record<string, string> = {
  "Energy Level": "+2",
  "Sleep Quality": "+1",
  "Stress Level": "-2",
  Adherence: "+12"
};

function MetricGroup({
  title,
  metrics,
  deltas
}: {
  title: string;
  metrics: Record<string, string>;
  deltas?: Record<string, string>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-bold text-slate-700">{title}</h2>
      <dl className="grid gap-3 md:grid-cols-2">
        {Object.entries(metrics).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-bold text-slate-950">
              {deltas?.[label] ? (
                <span className={deltas[label].startsWith("-") ? "mr-3 text-red-600" : "mr-3 text-green-600"}>
                  {deltas[label]}
                </span>
              ) : null}
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TextPanel({ title, tone, body }: { title: string; tone: string; body: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className={`mb-3 text-sm font-bold ${tone}`}>{title}</h2>
      <p className="text-sm leading-6 text-slate-700">{body}</p>
    </section>
  );
}
