"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  checkIns,
  formatSubmittedAt,
  getTimingStatus,
  type CheckInRecord,
  type CheckInSort,
  type CheckInTab
} from "@/fixtures/check-ins";
import { cn } from "@/lib/utils";

const sortOptions: Array<{ value: CheckInSort; label: string }> = [
  { value: "recent", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "name", label: "By Name" }
];

type CheckInSource = "api" | "fixture";

interface ApiCheckInRecord {
  id: string;
  clientId?: string;
  formSubmissionId?: string | null;
  name: string;
  initials: string;
  submittedAt: string;
  assignedDay?: string | null;
  dueAt?: string | null;
  lastCheckIn: string;
  status: CheckInTab;
  checkInStatus?: "pending-review" | "reviewed" | "completed";
  summary?: string | null;
  coachNotes?: string | null;
}

type DisplayCheckIn = CheckInRecord | ApiCheckInRecord;

export function CheckInManagementPage() {
  const [activeTab, setActiveTab] = useState<CheckInTab>("pending");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<CheckInSort>("recent");
  const [apiCheckIns, setApiCheckIns] = useState<ApiCheckInRecord[]>([]);
  const [checkInSource, setCheckInSource] = useState<CheckInSource>("fixture");
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCheckIns() {
      try {
        const response = await fetch("/api/v1/check-ins?limit=100");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: ApiCheckInRecord[] };

        if (active) {
          setApiCheckIns(payload.data ?? []);
          setCheckInSource("api");
        }
      } catch {
        // Keep local sample check-ins available until persistence is reachable.
      } finally {
        if (active) {
          setLoadingCheckIns(false);
        }
      }
    }

    void loadCheckIns();

    return () => {
      active = false;
    };
  }, []);

  const sourceCheckIns = checkInSource === "api" ? apiCheckIns : checkIns;
  const displayedCheckIns = sourceCheckIns
    .filter((checkIn) => checkIn.status === activeTab)
    .sort((a, b) => sortCheckIns(a, b, sortBy));

  const sortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? "Most Recent";

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Check In Review Center</h1>
        <p className="text-gray-600">Review submitted client check-ins and timing status.</p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div role="tablist" aria-label="Check-in status" className="flex items-center gap-4">
          <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>
            Pending Review
          </TabButton>
          <TabButton active={activeTab === "completed"} onClick={() => setActiveTab("completed")}>
            Completed
          </TabButton>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
              aria-label={`Sort check-ins, currently ${sortLabel}`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-50"
              onClick={() => setSortMenuOpen((open) => !open)}
            >
              <span className="text-gray-600">SORT BY: {sortLabel}</span>
              <ChevronDown className="size-4 text-gray-600" aria-hidden="true" />
            </button>

            {sortMenuOpen ? (
              <div
                role="menu"
                aria-label="Check-in sort options"
                className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50"
                    onClick={() => {
                      setSortBy(option.value);
                      setSortMenuOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
            Queue First
          </button>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Reviewing <span className="font-semibold text-gray-900">{displayedCheckIns.length}</span>{" "}
          {activeTab === "pending" ? "pending" : "completed"} check-ins
        </p>
        {checkInSource === "fixture" ? (
          <p className="mt-2 text-sm text-amber-700">Showing local sample check-ins until the persistence API is available.</p>
        ) : null}
      </div>

      <section aria-label="Check-in list" className="space-y-4">
        {loadingCheckIns ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading persisted check-ins...
          </div>
        ) : null}
        {displayedCheckIns.map((checkIn) => {
          const submittedAt = toDate(checkIn.submittedAt);
          const assignedDay = toDate(checkIn.assignedDay ?? checkIn.submittedAt);
          const timing = getTimingStatus(submittedAt, assignedDay);

          return (
            <article
              key={checkIn.id}
              data-testid="check-in-row"
              className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                    {checkIn.initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{checkIn.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-medium", timing.color)}>
                        {timing.label}
                      </span>
                      <span className="text-sm text-gray-500">Submitted: {formatSubmittedAt(submittedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/clients/${"clientId" in checkIn && checkIn.clientId ? checkIn.clientId : "1"}?tab=check-ins&checkInId=${encodeURIComponent(checkIn.id)}`} aria-label={`View full check-in for ${checkIn.name}`} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
                    View Full Check-In
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {checkInSource === "api" && !loadingCheckIns && displayedCheckIns.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No {activeTab === "pending" ? "pending" : "completed"} check-ins found.
        </div>
      ) : null}

      {displayedCheckIns.length > 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">End of current {activeTab} list</p>
        </div>
      ) : null}

    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "border-b-2 px-2 pb-3 text-sm font-medium transition-colors",
        active ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-600 hover:text-gray-900"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function sortCheckIns(a: DisplayCheckIn, b: DisplayCheckIn, sortBy: CheckInSort) {
  if (sortBy === "recent") {
    return toDate(b.submittedAt).getTime() - toDate(a.submittedAt).getTime();
  }

  if (sortBy === "oldest") {
    return toDate(a.submittedAt).getTime() - toDate(b.submittedAt).getTime();
  }

  return a.name.localeCompare(b.name);
}

function toDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value;
  }

  const parsedDate = value ? new Date(value) : new Date();

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}
