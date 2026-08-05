"use client";

import { CalendarCheck, Camera, ClipboardCheck, LineChart, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface ClientMeResponse {
  data?: {
    client: {
      id: string;
      name: string;
      checkInDay: string;
    };
  };
  error?: {
    message?: string;
  };
}

interface ClientRoadmapPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface PhaseProgress {
  phaseName: string;
  weekNumber: number;
  totalWeeks: number;
  weeksLeft: number;
  percentage: number;
  startsOn: string;
  endsOn: string | null;
}

type LoadState = "loading" | "ready" | "error";
type ProgressMetricKey = "body_weight" | "waist";
type ProgressRange = "week" | "month" | "quarter" | "all";

interface ClientCheckIn {
  id: string;
  status: string;
  submittedAt: string;
  summary: string | null;
  coachNotes: string | null;
  answers: unknown;
  metrics?: ClientMetricRecord[];
}

interface ClientMetricRecord {
  id: string;
  measuredAt: string;
  metricKey: string;
  metricValue: number;
  unit: string | null;
  metadata?: unknown;
}

interface ProgressPhoto {
  id: string;
  date: string;
  label: string;
  url: string;
}

interface CheckInAssignmentResponse {
  data?: { id: string; formName: string } | null;
}

const progressMetricOptions: Array<{ key: ProgressMetricKey; label: string; unit: string; aliases: string[]; color: string }> = [
  { key: "body_weight", label: "Bodyweight", unit: "kg", aliases: ["body_weight"], color: "#3620b8" },
  { key: "waist", label: "Waist circumference", unit: "cm", aliases: ["waist", "waist_circumference"], color: "#f87600" }
];

const progressRangeOptions: Array<{ key: ProgressRange; label: string; days: number | null }> = [
  { key: "week", label: "1 week", days: 7 },
  { key: "month", label: "1 month", days: 31 },
  { key: "quarter", label: "3 months", days: 93 },
  { key: "all", label: "All", days: null }
];

export function ClientDailyCheckInPage({ today = new Date().toISOString().slice(0, 10) }: { today?: string } = {}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [weeklyCheckInDay, setWeeklyCheckInDay] = useState("Unscheduled");
  const [roadmapPhases, setRoadmapPhases] = useState<ClientRoadmapPhase[]>([]);
  const [checkIns, setCheckIns] = useState<ClientCheckIn[]>([]);
  const [metrics, setMetrics] = useState<ClientMetricRecord[]>([]);
  const [showAllCheckIns, setShowAllCheckIns] = useState(false);
  const [selectedMetricKey, setSelectedMetricKey] = useState<ProgressMetricKey>("body_weight");
  const [selectedRange, setSelectedRange] = useState<ProgressRange>("month");
  const [leftPhotoId, setLeftPhotoId] = useState("");
  const [rightPhotoId, setRightPhotoId] = useState("");
  const [weeklyCheckInAssigned, setWeeklyCheckInAssigned] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCheckInContext() {
      try {
        const [response, roadmapResponse, weeklyCheckInResponse] = await Promise.all([
          fetch("/api/v1/client/me"),
          fetch("/api/v1/client/roadmap"),
          fetch("/api/v1/client/daily-check-in?kind=weekly")
        ]);
        const [payload, roadmapPayload, weeklyCheckInPayload] = await Promise.all([
          response.json().catch(() => null) as Promise<ClientMeResponse | null>,
          roadmapResponse.json().catch(() => null) as Promise<{ data?: ClientRoadmapPhase[] } | null>,
          weeklyCheckInResponse.json().catch(() => null) as Promise<CheckInAssignmentResponse | null>
        ]);

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "Your check-in could not be loaded.");
        }

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        setWeeklyCheckInDay(payload.data.client.checkInDay ?? "Unscheduled");
        setRoadmapPhases(roadmapResponse.ok && Array.isArray(roadmapPayload?.data) ? roadmapPayload.data : []);
        setWeeklyCheckInAssigned(weeklyCheckInResponse.ok && Boolean(weeklyCheckInPayload?.data?.id));

        const [checkInsResponse, metricsResponse] = await Promise.all([
          fetch("/api/v1/client/check-ins?limit=100"),
          fetch(`/api/v1/clients/${payload.data.client.id}/metrics?limit=200`)
        ]);
        const [checkInsPayload, metricsPayload] = await Promise.all([
          checkInsResponse.json().catch(() => null) as Promise<{ data?: ClientCheckIn[] } | null>,
          metricsResponse.json().catch(() => null) as Promise<{ data?: ClientMetricRecord[] } | null>
        ]);

        if (!mounted) {
          return;
        }

        setCheckIns(checkInsResponse.ok && Array.isArray(checkInsPayload?.data) ? checkInsPayload.data : []);
        setMetrics(metricsResponse.ok && Array.isArray(metricsPayload?.data) ? metricsPayload.data : []);
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Your check-in could not be loaded.");
        setLoadState("error");
      }
    }

    void loadCheckInContext();

    function reloadWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadCheckInContext();
      }
    }

    window.addEventListener("focus", reloadWhenVisible);
    document.addEventListener("visibilitychange", reloadWhenVisible);

    return () => {
      mounted = false;
      window.removeEventListener("focus", reloadWhenVisible);
      document.removeEventListener("visibilitychange", reloadWhenVisible);
    };
  }, []);

  const activeRoadmapPhase = useMemo(() => selectCurrentRoadmapPhase(roadmapPhases, today), [roadmapPhases, today]);
  const phaseProgress = useMemo(() => calculatePhaseProgress(activeRoadmapPhase, today), [activeRoadmapPhase, today]);
  const progressPhotos = useMemo(() => extractProgressPhotos(checkIns), [checkIns]);
  const selectedMetric = progressMetricOptions.find((metric) => metric.key === selectedMetricKey) ?? progressMetricOptions[0];
  const visibleCheckIns = showAllCheckIns ? checkIns : checkIns.slice(0, 3);
  const selectedLeftPhotoId = leftPhotoId && progressPhotos.some((photo) => photo.id === leftPhotoId)
    ? leftPhotoId
    : progressPhotos.at(-1)?.id ?? "";
  const selectedRightPhotoId = rightPhotoId && progressPhotos.some((photo) => photo.id === rightPhotoId)
    ? rightPhotoId
    : progressPhotos[0]?.id ?? "";

  if (loadState === "loading") {
    return (
      <ClientMobileShell title="MCP" avatarLabel="CI">
        <CheckInStatus message="Loading daily check-in" />
      </ClientMobileShell>
    );
  }

  if (loadState === "error") {
    return (
      <ClientMobileShell title="MCP" avatarLabel="CI">
        <CheckInStatus message={errorMessage} tone="error" />
      </ClientMobileShell>
    );
  }

  return (
    <ClientMobileShell title="MCP" avatarLabel={clientName || "CI"}>
      <div className="space-y-8">
        <ClientSectionHeading eyebrow="Daily check-in" title="Check In">
          <p className="text-sm font-semibold leading-6 text-[#777584]">
            {clientName || "Client"} • keep your coach updated.
          </p>
        </ClientSectionHeading>

        <section className="rounded-[1.65rem] bg-white p-7 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">Current phase</p>
              <h2 className="mt-2 text-2xl font-black tracking-normal text-[#1b1c1c]">{phaseProgress.phaseName}</h2>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fff0e6] text-[#f87600]">
              <TrendingUp aria-hidden="true" className="size-5" />
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between gap-4">
            <p className="text-5xl font-black leading-none tracking-normal text-[#3620b8]">
              {phaseProgress.weekNumber}
              <span className="text-lg text-[#777584]">/{phaseProgress.totalWeeks}</span>
            </p>
            <p className="pb-1 text-sm font-black text-[#777584]">{phaseProgress.percentage}% complete</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e9e8e7]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#3620b8] to-[#f87600]" style={{ width: `${phaseProgress.percentage}%` }} />
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-[#777584]">
            Week {phaseProgress.weekNumber} of {phaseProgress.totalWeeks}
            {phaseProgress.endsOn ? ` • ${formatWeeksLeft(phaseProgress.weeksLeft)}` : ""}
            {phaseProgress.endsOn ? ` • phase ends ${formatDate(phaseProgress.endsOn)}` : ""}
          </p>
        </section>

        <section className="rounded-[1.65rem] bg-[#f5f3f3] p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-white text-[#3620b8]">
              <ClipboardCheck aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1b1c1c]">Daily metrics</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#777584]">
                Weight, steps, recovery and notes will be logged here.
              </p>
            </div>
          </div>
          <Link
            href={{ pathname: "/check-in/daily" }}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-base font-black text-white shadow-[0_20px_45px_rgba(54,32,184,0.24)]"
          >
            <CalendarCheck aria-hidden="true" className="size-5" />
            Complete daily check in
          </Link>
        </section>

        <WeeklyCheckInsModule
          checkInDay={weeklyCheckInDay}
          today={today}
          assigned={weeklyCheckInAssigned}
          checkIns={visibleCheckIns}
          totalCount={checkIns.length}
          showAll={showAllCheckIns}
          onToggleShowAll={() => setShowAllCheckIns((current) => !current)}
        />

        <ProgressMetricsModule
          metrics={metrics}
          selectedMetric={selectedMetric}
          selectedMetricKey={selectedMetricKey}
          selectedRange={selectedRange}
          today={today}
          onMetricChange={setSelectedMetricKey}
          onRangeChange={setSelectedRange}
        />

        <PhotoComparisonModule
          photos={progressPhotos}
          leftPhotoId={selectedLeftPhotoId}
          rightPhotoId={selectedRightPhotoId}
          onLeftPhotoChange={setLeftPhotoId}
          onRightPhotoChange={setRightPhotoId}
        />
      </div>
    </ClientMobileShell>
  );
}

function WeeklyCheckInsModule({
  checkInDay,
  today,
  assigned,
  checkIns,
  totalCount,
  showAll,
  onToggleShowAll
}: {
  checkInDay: string;
  today: string;
  assigned: boolean;
  checkIns: ClientCheckIn[];
  totalCount: number;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const countdown = getWeeklyCheckInCountdown(checkInDay, today);

  return (
    <section className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">Weekly check-ins</p>
          <h2 className="mt-2 text-xl font-black text-[#1b1c1c]">Submitted history</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#777584]">
            {countdown
              ? `${checkInDay} • ${countdown}`
              : "Your coach has not assigned a weekly check-in day yet."}
          </p>
        </div>
        {totalCount > 3 ? (
          <button type="button" onClick={onToggleShowAll} className="rounded-full bg-[#f5f3f3] px-4 py-2 text-xs font-black text-[#3620b8]">
            {showAll ? "Show recent" : "View all"}
          </button>
        ) : null}
      </div>
      {assigned ? (
        <Link href={{ pathname: "/check-in/weekly" }} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[#fff0e6] text-sm font-black text-[#9a4600] transition active:scale-[0.98]">
          Submit weekly check-in
          <CalendarCheck aria-hidden="true" className="size-4" />
        </Link>
      ) : null}

      <div className="mt-5 space-y-3">
        {checkIns.length > 0 ? checkIns.map((checkIn) => (
          <article key={checkIn.id} className="rounded-2xl bg-[#f5f3f3] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#1b1c1c]">{formatDate(checkIn.submittedAt)}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#777584]">{formatCheckInStatus(checkIn.status)}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#f87600]">Weekly</span>
            </div>
            {checkIn.summary ? <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#777584]">{checkIn.summary}</p> : null}
          </article>
        )) : (
          <p className="rounded-2xl bg-[#f5f3f3] p-4 text-sm font-semibold text-[#777584]">No submitted weekly check-ins are visible yet.</p>
        )}
      </div>
    </section>
  );
}

function ProgressMetricsModule({
  metrics,
  selectedMetric,
  selectedMetricKey,
  selectedRange,
  today,
  onMetricChange,
  onRangeChange
}: {
  metrics: ClientMetricRecord[];
  selectedMetric: (typeof progressMetricOptions)[number];
  selectedMetricKey: ProgressMetricKey;
  selectedRange: ProgressRange;
  today: string;
  onMetricChange: (metric: ProgressMetricKey) => void;
  onRangeChange: (range: ProgressRange) => void;
}) {
  const visibleMetrics = filterMetricsForChart(metrics, selectedMetric, selectedRange, today);

  return (
    <section className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#f0efff] text-[#3620b8]">
          <LineChart aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">Progress</p>
          <h2 className="mt-1 text-xl font-black text-[#1b1c1c]">{selectedMetric.label}</h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-[#f5f3f3] p-1">
        {progressMetricOptions.map((metric) => (
          <button
            key={metric.key}
            type="button"
            onClick={() => onMetricChange(metric.key)}
            className={cn("rounded-full px-3 py-2 text-sm font-black", selectedMetricKey === metric.key ? "bg-white text-[#1b1c1c] shadow-sm" : "text-[#777584]")}
          >
            {metric.key === "body_weight" ? "Bodyweight" : "Waist"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {progressRangeOptions.map((range) => (
          <button
            key={range.key}
            type="button"
            onClick={() => onRangeChange(range.key)}
            className={cn("h-10 rounded-full text-xs font-black", selectedRange === range.key ? "bg-[#3620b8] text-white" : "bg-[#f5f3f3] text-[#777584]")}
          >
            {range.label}
          </button>
        ))}
      </div>

      <ProgressLineChart metrics={visibleMetrics} metric={selectedMetric} />
    </section>
  );
}

function ProgressLineChart({ metrics, metric }: { metrics: ClientMetricRecord[]; metric: (typeof progressMetricOptions)[number] }) {
  const sortedMetrics = [...metrics].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());

  if (sortedMetrics.length === 0) {
    return (
      <div className="mt-5 flex h-56 items-center justify-center rounded-2xl bg-[#f5f3f3] px-5 text-center text-sm font-semibold leading-6 text-[#777584]">
        No {metric.label.toLowerCase()} entries are available for this range.
      </div>
    );
  }

  const values = sortedMetrics.map((entry) => entry.metricValue);
  const latest = sortedMetrics[sortedMetrics.length - 1];
  const minTime = Math.min(...sortedMetrics.map((entry) => new Date(entry.measuredAt).getTime()));
  const maxTime = Math.max(...sortedMetrics.map((entry) => new Date(entry.measuredAt).getTime()));
  const points = sortedMetrics.map((entry) => toChartPoint(entry, values, minTime, maxTime)).join(" ");

  return (
    <div className="mt-5 rounded-2xl bg-[#f5f3f3] p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black text-[#1b1c1c]">{formatMetricNumber(latest.metricValue)}{latest.unit ?? metric.unit}</p>
        <p className="text-xs font-black text-[#777584]">{formatDate(latest.measuredAt)}</p>
      </div>
      <svg role="img" aria-label={`${metric.label} chart`} viewBox="0 0 320 180" className="h-48 w-full">
        {[0, 1, 2].map((line) => (
          <line key={line} x1="18" x2="306" y1={36 + line * 52} y2={36 + line * 52} stroke="#e1dedb" strokeWidth="1" />
        ))}
        <polyline fill="none" stroke={metric.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" points={points} />
        {sortedMetrics.map((entry) => {
          const [cx, cy] = toChartPoint(entry, values, minTime, maxTime).split(",").map(Number);

          return <circle key={entry.id} cx={cx} cy={cy} r="4" fill={metric.color} />;
        })}
      </svg>
    </div>
  );
}

function PhotoComparisonModule({
  photos,
  leftPhotoId,
  rightPhotoId,
  onLeftPhotoChange,
  onRightPhotoChange
}: {
  photos: ProgressPhoto[];
  leftPhotoId: string;
  rightPhotoId: string;
  onLeftPhotoChange: (photoId: string) => void;
  onRightPhotoChange: (photoId: string) => void;
}) {
  const leftPhoto = photos.find((photo) => photo.id === leftPhotoId) ?? null;
  const rightPhoto = photos.find((photo) => photo.id === rightPhotoId) ?? null;

  return (
    <section className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#fff0e6] text-[#f87600]">
          <Camera aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">Photo comparison</p>
          <h2 className="mt-1 text-xl font-black text-[#1b1c1c]">Compare check-ins</h2>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <PhotoSelector label="Left photo" photos={photos} selectedPhotoId={leftPhotoId} onChange={onLeftPhotoChange} />
          <PhotoSelector label="Right photo" photos={photos} selectedPhotoId={rightPhotoId} onChange={onRightPhotoChange} />
          <PhotoPreview photo={leftPhoto} />
          <PhotoPreview photo={rightPhoto} />
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-[#f5f3f3] p-4 text-sm font-semibold leading-6 text-[#777584]">
          Progress photos from weekly check-ins will appear here once they have been submitted.
        </p>
      )}
    </section>
  );
}

function PhotoSelector({ label, photos, selectedPhotoId, onChange }: { label: string; photos: ProgressPhoto[]; selectedPhotoId: string; onChange: (photoId: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-[#777584]">{label}</span>
      <select value={selectedPhotoId} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-2xl border-0 bg-[#f5f3f3] px-3 text-sm font-black text-[#1b1c1c]">
        {photos.map((photo) => (
          <option key={photo.id} value={photo.id}>{photo.label}</option>
        ))}
      </select>
    </label>
  );
}

function PhotoPreview({ photo }: { photo: ProgressPhoto | null }) {
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-[#f5f3f3]">
      {photo ? <img src={photo.url} alt={`${photo.label} progress`} className="h-full w-full object-cover" /> : null}
    </div>
  );
}

function CheckInStatus({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[1.65rem] bg-white px-5 py-8 text-center text-sm font-black shadow-[0_18px_45px_rgba(27,28,28,0.06)]",
        tone === "error" ? "text-red-700" : "text-[#777584]"
      )}
    >
      {message}
    </div>
  );
}

function selectCurrentRoadmapPhase(phases: ClientRoadmapPhase[], today: string) {
  return phases.find((phase) => phase.status === "active")
    ?? phases.find((phase) => phase.startDate <= today && phase.endDate >= today)
    ?? null;
}

function calculatePhaseProgress(phase: ClientRoadmapPhase | null, today: string): PhaseProgress {
  if (phase) {
    const totalDays = Math.max(daysBetween(phase.startDate, phase.endDate) + 1, 1);
    const elapsedDays = Math.min(Math.max(daysBetween(phase.startDate, today) + 1, 0), totalDays);
    const totalWeeks = Math.max(Math.ceil(totalDays / 7), 1);
    const weekNumber = Math.min(Math.max(Math.ceil(elapsedDays / 7), 1), totalWeeks);
    const weeksLeft = Math.max(Math.ceil(daysBetween(today, phase.endDate) / 7), 0);

    return {
      phaseName: phase.name || "Current phase",
      weekNumber,
      totalWeeks,
      weeksLeft,
      percentage: Math.min(Math.max(Math.round((elapsedDays / totalDays) * 100), 0), 100),
      startsOn: phase.startDate,
      endsOn: phase.endDate
    };
  }

  return {
    phaseName: "No active phase",
    weekNumber: 0,
    totalWeeks: 0,
    weeksLeft: 0,
    percentage: 0,
    startsOn: "",
    endsOn: null
  };
}

function filterMetricsForChart(metrics: ClientMetricRecord[], selectedMetric: (typeof progressMetricOptions)[number], selectedRange: ProgressRange, today: string) {
  const rangeOption = progressRangeOptions.find((range) => range.key === selectedRange) ?? progressRangeOptions[1];
  const now = Date.parse(`${today}T23:59:59.999Z`);
  const from = rangeOption.days ? now - rangeOption.days * 24 * 60 * 60 * 1000 : 0;

  return metrics.filter((metric) => {
    const measuredAt = new Date(metric.measuredAt).getTime();

    return selectedMetric.aliases.includes(metric.metricKey) && measuredAt >= from && measuredAt <= now;
  });
}

function toChartPoint(entry: ClientMetricRecord, values: number[], minTime: number, maxTime: number) {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const time = new Date(entry.measuredAt).getTime();
  const xRatio = maxTime === minTime ? 0.5 : (time - minTime) / (maxTime - minTime);
  const yRatio = maxValue === minValue ? 0.5 : (entry.metricValue - minValue) / (maxValue - minValue);
  const x = 18 + xRatio * 288;
  const y = 154 - yRatio * 116;

  return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`;
}

function extractProgressPhotos(checkIns: ClientCheckIn[]) {
  return checkIns.flatMap((checkIn) => {
    const photoUrls = collectPhotoUrls(checkIn.answers);

    return photoUrls.map((url, index) => ({
      id: `${checkIn.id}:${index}`,
      date: checkIn.submittedAt,
      label: `${formatDate(checkIn.submittedAt)}${photoUrls.length > 1 ? ` #${index + 1}` : ""}`,
      url
    }));
  });
}

function collectPhotoUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return isPhotoUrl(value) ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectPhotoUrls);
  }

  if (!isRecord(value)) {
    return [];
  }

  const directUrl = [value.url, value.src, value.photoUrl, value.fileUrl, value.previewUrl]
    .find((candidate): candidate is string => typeof candidate === "string" && isPhotoUrl(candidate));

  return [
    ...(directUrl ? [directUrl] : []),
    ...Object.entries(value)
      .filter(([key]) => key !== "url" && key !== "src" && key !== "photoUrl" && key !== "fileUrl" && key !== "previewUrl")
      .flatMap(([, nestedValue]) => collectPhotoUrls(nestedValue))
  ];
}

function isPhotoUrl(value: string) {
  return /^https?:\/\//u.test(value) && /\.(?:avif|gif|heic|heif|jpe?g|png|webp)(?:[?#].*)?$/iu.test(value);
}

function formatCheckInStatus(status: string) {
  return status.replaceAll("-", " ");
}

function formatMetricNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function daysBetween(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  return Math.max(Math.floor((end - start) / 86_400_000), 0);
}

function formatDate(value: string) {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short"
  }).format(date);
}

function formatWeeksLeft(weeksLeft: number) {
  if (weeksLeft <= 0) {
    return "final week";
  }

  return weeksLeft === 1 ? "1 week left" : `${weeksLeft} weeks left`;
}

const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeeklyCheckInCountdown(checkInDay: string, today: string) {
  const targetIndex = weekdayLabels.findIndex((day) => day.toLowerCase() === checkInDay.toLowerCase());

  if (targetIndex < 0) {
    return null;
  }

  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const daysUntil = (targetIndex - todayDate.getUTCDay() + 7) % 7;

  if (daysUntil === 0) {
    return "due today";
  }

  if (daysUntil === 1) {
    return "1 day until check-in";
  }

  return `${daysUntil} days until check-in`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}
