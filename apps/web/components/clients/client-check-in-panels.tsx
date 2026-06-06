const checkInDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const dailyRows = [
  ["Energy Level", "8", "7", "9", "8", "6", "9", "8"],
  ["Sleep Quality", "7", "6", "8", "7", "5", "9", "8"],
  ["Stress Level", "4", "5", "3", "4", "6", "2", "3"],
  ["Training Completed", "yes", "yes", "yes", "yes", "no", "yes", "yes"],
  ["Nutrition Targets Met", "yes", "no", "yes", "yes", "yes", "yes", "yes"],
  ["Sleep Hours", "7.5", "6", "8", "7", "5.5", "9", "8"],
  ["Water Intake (L)", "3.2", "2.8", "3.5", "3", "2.5", "3.8", "3.5"],
  ["Overall Feeling", "Good", "Average", "Great", "Good", "Tired", "Excellent", "Good"],
  ["Notes", "Feeling strong", "Struggled with meal prep", "Hit new PR!", "", "Long work day", "Recovery day", "Meal prep done"]
];

const history = [
  {
    week: "Week 24",
    status: "On Time",
    date: "April 18, 2026",
    weight: "84.2kg",
    waist: "80.2cm",
    training: "5/5",
    nutrition: "90%",
    win: "Hit new squat PR at 120kg. Slept 7+ hours every night except Friday.",
    challenge: "Cravings for sugar mid-afternoon. Struggling with meal prep on weekends."
  },
  {
    week: "Week 23",
    status: "Late",
    date: "April 11, 2026",
    weight: "85kg",
    waist: "80.8cm",
    training: "5/5",
    nutrition: "78%",
    win: "Still managed to get 3 workouts in despite busy week.",
    challenge: "Work stress affecting sleep and nutrition. Missed sessions."
  },
  {
    week: "Week 22",
    status: "Early",
    date: "April 4, 2026",
    weight: "85.6kg",
    waist: "81.3cm",
    training: "5/5",
    nutrition: "85%",
    win: "Strong adherence rebound after travel.",
    challenge: "Weekend structure still needs attention."
  }
];

export function DailyCheckInsPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Daily Check-Ins</h2>
            <p className="text-sm text-slate-500">Week of April 14 - April 20, 2026</p>
          </div>
          <p className="text-sm font-bold text-slate-700">This Week</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-bold text-blue-900">Form configured by coaching team</p>
          <p className="mt-1">
            This daily check-in form has been customized by your coaching organization to track the metrics most important to your progress.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-8 bg-gray-50 text-sm font-bold text-slate-600">
          <div className="px-5 py-4">Metric</div>
          {checkInDays.map((day) => (
            <div key={day} className="px-5 py-4 text-center">{day}</div>
          ))}
        </div>
        {dailyRows.map(([metric, ...values]) => (
          <div key={metric} className="grid grid-cols-8 even:bg-gray-50/60">
            <div className="px-5 py-4 text-sm font-semibold text-slate-950">{metric}</div>
            {values.map((value, index) => (
              <div key={`${metric}-${checkInDays[index]}`} className="px-5 py-4 text-center text-sm text-slate-700">
                {value === "yes" ? <span className="font-black text-green-600">Done</span> : value === "no" ? <span className="font-black text-red-600">Missed</span> : value}
              </div>
            ))}
          </div>
        ))}
      </section>

      <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <strong>Coach Note:</strong> Click any cell to edit values. Changes are saved automatically.
      </p>
    </div>
  );
}

export function CheckInHistoryPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Check-In History</h2>
        <p className="text-sm text-slate-500">View all weekly check-ins and progress over time</p>
      </section>

      {history.map((entry) => (
        <article key={entry.week} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">
                {entry.week}
                <span className={`ml-3 rounded-full px-3 py-1 text-xs font-bold ${entry.status === "Late" ? "bg-red-50 text-red-600" : entry.status === "Early" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                  {entry.status}
                </span>
              </h3>
              <p className="mt-2 text-sm text-slate-500">{entry.date}</p>
            </div>
            <span className="text-2xl text-slate-400">&gt;</span>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-4">
            <HistoryMetric label="Avg Body Weight" value={entry.weight} />
            <HistoryMetric label="Waist Measurement" value={entry.waist} />
            <HistoryMetric label="Training Sessions" value={entry.training} />
            <HistoryMetric label="Nutrition Compliance" value={entry.nutrition} />
          </div>

          <div className="grid gap-5 border-y border-slate-100 py-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold text-green-600">Top Win</p>
              <p className="text-sm text-slate-700">{entry.win}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-red-600">Main Challenge</p>
              <p className="text-sm text-slate-700">{entry.challenge}</p>
            </div>
          </div>

          <button type="button" className="mt-4 text-sm font-bold text-indigo-600">View Check-In Recording</button>
        </article>
      ))}
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}
