"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Dumbbell, Flag, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface ClientMeResponse {
  data?: {
    client: {
      name: string;
    };
  };
  error?: {
    message?: string;
  };
}

interface RoadmapPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  items: RoadmapItem[];
}

interface RoadmapItem {
  id: string;
  phaseId: string;
  title: string;
  type: string;
  date: string;
  notes: string;
}

interface CalendarEvent extends RoadmapItem {
  phaseName: string;
}

type LoadState = "loading" | "ready" | "error";

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export function ClientCalendarPage({ today = new Date().toISOString().slice(0, 10) }: { today?: string } = {}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      try {
        const [meResponse, roadmapResponse] = await Promise.all([
          fetch("/api/v1/client/me"),
          fetch("/api/v1/client/roadmap")
        ]);
        const [mePayload, roadmapPayload] = await Promise.all([
          meResponse.json().catch(() => null) as Promise<ClientMeResponse | null>,
          roadmapResponse.json().catch(() => null) as Promise<{ data?: RoadmapPhase[] } | null>
        ]);

        if (!meResponse.ok || !mePayload?.data) {
          throw new Error(mePayload?.error?.message ?? "Your calendar could not be loaded.");
        }

        if (!mounted) {
          return;
        }

        setClientName(mePayload.data.client.name);
        setPhases(roadmapResponse.ok && Array.isArray(roadmapPayload?.data) ? roadmapPayload.data : []);
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Your calendar could not be loaded.");
        setLoadState("error");
      }
    }

    void loadCalendar();

    return () => {
      mounted = false;
    };
  }, []);

  const events = useMemo(() => flattenRoadmapEvents(phases), [phases]);
  const activePhase = useMemo(() => phases.find((phase) => phase.status === "active") ?? phases[0] ?? null, [phases]);
  const monthCells = useMemo(() => buildMonthCells(visibleMonth, today), [today, visibleMonth]);
  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);
  const selectedEvents = events.filter((event) => event.date === selectedDate);
  const upcomingEvents = events.filter((event) => event.date >= today).slice(0, 8);

  if (loadState === "loading") {
    return (
      <ClientMobileShell title="MCP" avatarLabel="CA">
        <CalendarStatus message="Loading calendar" />
      </ClientMobileShell>
    );
  }

  if (loadState === "error") {
    return (
      <ClientMobileShell title="MCP" avatarLabel="CA">
        <CalendarStatus message={errorMessage} tone="error" />
      </ClientMobileShell>
    );
  }

  return (
    <ClientMobileShell title="MCP" avatarLabel={clientName || "CA"}>
      <div className="space-y-7">
        <ClientSectionHeading eyebrow="Client calendar" title="Calendar">
          <p className="text-sm font-semibold leading-6 text-[#777584]">
            {clientName || "Client"} • coach-planned schedule.
          </p>
        </ClientSectionHeading>

        <section className="relative overflow-hidden rounded-[1.65rem] bg-white p-6 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
          <div className="absolute right-0 top-0 size-28 rounded-full bg-[#3620b8]/10 blur-3xl" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#f0efff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#3620b8]">
                Current protocol
              </span>
              <span className="rounded-full bg-[#fff0e6] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f87600]">
                {activePhase?.status ?? "planned"}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-normal text-[#1b1c1c]">{activePhase?.name ?? "Coach calendar"}</h2>
            <p className="text-sm font-semibold leading-6 text-[#777584]">
              {activePhase ? `${formatShortDate(activePhase.startDate)} - ${formatShortDate(activePhase.endDate)}` : "Your scheduled coaching events will appear here."}
            </p>
          </div>
        </section>

        <section className="space-y-4" aria-label="Calendar month view">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-[#1b1c1c]">{formatMonthLabel(visibleMonth)}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                className="flex size-9 items-center justify-center rounded-full bg-white text-[#777584] shadow-[0_8px_20px_rgba(27,28,28,0.05)]"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                className="flex size-9 items-center justify-center rounded-full bg-white text-[#777584] shadow-[0_8px_20px_rgba(27,28,28,0.05)]"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[1.65rem] bg-white p-4 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
            <div className="mb-4 grid grid-cols-7 gap-1 text-center">
              {weekdayLabels.map((weekday, index) => (
                <span key={`${weekday}-${index}`} className="text-[10px] font-black uppercase text-[#777584]">{weekday}</span>
              ))}
            </div>
            <div role="grid" aria-label={`${formatMonthLabel(visibleMonth)} calendar`} className="grid grid-cols-7 gap-y-4 text-center">
              {monthCells.map((cell) => {
                const selected = cell.date === selectedDate;
                const hasEvent = eventDates.has(cell.date);

                return (
                  <button
                    key={cell.date}
                    type="button"
                    role="gridcell"
                    aria-label={`${cell.label}${hasEvent ? ", has event" : ""}`}
                    onClick={() => setSelectedDate(cell.date)}
                    className={cn(
                      "relative mx-auto flex size-10 items-center justify-center rounded-xl text-sm font-black transition active:scale-95",
                      selected ? "bg-[#3620b8] text-white shadow-[0_12px_24px_rgba(54,32,184,0.25)]" : cell.inMonth ? "text-[#1b1c1c]" : "text-[#cbc6c2]",
                      cell.isToday && !selected ? "ring-2 ring-[#f87600]/40" : ""
                    )}
                  >
                    {cell.day}
                    {hasEvent ? <span className={cn("absolute bottom-1 size-1 rounded-full", selected ? "bg-white" : "bg-[#f87600]")} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-[#1b1c1c]">Selected day</h2>
            <span className="text-xs font-black text-[#3620b8]">{formatLongDate(selectedDate)}</span>
          </div>
          <div className="space-y-3">
            {(selectedEvents.length > 0 ? selectedEvents : upcomingEvents.slice(0, 2)).map((event) => (
              <CalendarEventCard key={event.id} event={event} faded={selectedEvents.length === 0} />
            ))}
            {selectedEvents.length === 0 && upcomingEvents.length === 0 ? (
              <p className="rounded-[1.35rem] bg-white p-5 text-sm font-semibold leading-6 text-[#777584] shadow-[0_10px_30px_rgba(27,28,28,0.04)]">
                No coach-planned events are scheduled yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 pb-8">
          <h2 className="px-2 text-lg font-black text-[#1b1c1c]">Upcoming milestones</h2>
          <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <MilestoneCard key={event.id} event={event} />
            )) : (
              <div className="min-w-[240px] rounded-[1.35rem] bg-white p-5 shadow-[0_10px_30px_rgba(27,28,28,0.06)]">
                <p className="text-sm font-black text-[#1b1c1c]">Nothing scheduled</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#777584]">Your coach-planned milestones will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </ClientMobileShell>
  );
}

function CalendarEventCard({ event, faded = false }: { event: CalendarEvent; faded?: boolean }) {
  return (
    <article className={cn("flex items-center gap-4 rounded-[1.35rem] bg-white p-4 shadow-[0_10px_30px_rgba(27,28,28,0.04)]", faded ? "opacity-80" : "")}>
      <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#f0efff] text-[#3620b8]">
        <EventIcon event={event} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-black text-[#1b1c1c]">{event.title}</h3>
        <p className="mt-1 truncate text-xs font-bold text-[#777584]">{event.phaseName} • {formatShortDate(event.date)}</p>
      </div>
      <ChevronRight aria-hidden="true" className="size-5 text-[#c8c3bf]" />
    </article>
  );
}

function MilestoneCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="flex min-w-[240px] flex-col gap-3 rounded-[1.35rem] bg-white p-5 shadow-[0_10px_30px_rgba(27,28,28,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#f5f3f3] text-[#3620b8]">
          <EventIcon event={event} className="size-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wide text-[#777584]">{formatShortDate(event.date)}</span>
      </div>
      <div>
        <h3 className="text-sm font-black text-[#1b1c1c]">{event.title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-[#777584]">{event.notes || event.phaseName}</p>
      </div>
      <div className="mt-auto h-1 overflow-hidden rounded-full bg-[#f5f3f3]">
        <div className="h-full w-1/3 rounded-full bg-[#3620b8]" />
      </div>
    </article>
  );
}

function CalendarStatus({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
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

function flattenRoadmapEvents(phases: RoadmapPhase[]): CalendarEvent[] {
  return phases
    .flatMap((phase) => phase.items.map((item) => ({ ...item, phaseName: phase.name })))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildMonthCells(monthValue: string, today: string) {
  const monthStart = new Date(`${monthValue}-01T00:00:00.000Z`);
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(monthStart.getUTCDate() - ((monthStart.getUTCDay() + 6) % 7));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const value = date.toISOString().slice(0, 10);

    return {
      date: value,
      day: date.getUTCDate(),
      inMonth: value.startsWith(monthValue),
      isToday: value === today,
      label: formatLongDate(value)
    };
  });
}

function addMonths(monthValue: string, amount: number) {
  const date = new Date(`${monthValue}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);

  return date.toISOString().slice(0, 7);
}

function EventIcon({ event, className }: { event: CalendarEvent; className: string }) {
  const value = `${event.type} ${event.title}`.toLowerCase();

  if (value.includes("video") || value.includes("call") || value.includes("sync")) {
    return <Video aria-hidden="true" className={className} />;
  }

  if (value.includes("training") || value.includes("workout") || value.includes("strength") || value.includes("lower") || value.includes("upper")) {
    return <Dumbbell aria-hidden="true" className={className} />;
  }

  if (value.includes("check")) {
    return <CheckCircle2 aria-hidden="true" className={className} />;
  }

  return <Flag aria-hidden="true" className={className} />;
}

function formatMonthLabel(monthValue: string) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${monthValue}-01T00:00:00.000Z`));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T00:00:00.000Z`));
}
