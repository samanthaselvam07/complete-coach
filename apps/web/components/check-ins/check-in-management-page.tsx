"use client";

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

interface CheckInMetric {
  id: string;
  metricKey: string;
  metricValue: number;
  unit: string | null;
  measuredAt: string;
}

interface CheckInDetail extends ApiCheckInRecord {
  answers?: Record<string, unknown> | null;
  metrics?: CheckInMetric[];
}

interface AiRecommendation {
  id: string;
  type: string;
  status: "pending-approval" | "approved" | "rejected" | "applied" | "discarded";
  severity?: string | null;
  title: string;
  contentMarkdown: string;
  requiresApproval: boolean;
}

type DisplayCheckIn = CheckInRecord | ApiCheckInRecord;

export function CheckInManagementPage() {
  const [activeTab, setActiveTab] = useState<CheckInTab>("pending");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<CheckInSort>("recent");
  const [apiCheckIns, setApiCheckIns] = useState<ApiCheckInRecord[]>([]);
  const [checkInSource, setCheckInSource] = useState<CheckInSource>("fixture");
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewSummary, setReviewSummary] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

                <button
                  type="button"
                  aria-label={`View full check-in for ${checkIn.name}`}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  onClick={() => openCheckInDetail(checkIn)}
                >
                  View Full Check-In
                </button>
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

      {selectedCheckIn ? (
        <CheckInDetailDialog
          checkIn={selectedCheckIn}
          loadingDetail={loadingDetail}
          reviewSummary={reviewSummary}
          coachNotes={coachNotes}
          actionMessage={actionMessage}
          actionError={actionError}
          aiRecommendations={aiRecommendations}
          aiLoading={aiLoading}
          onClose={() => setSelectedCheckIn(null)}
          onReviewSummaryChange={setReviewSummary}
          onCoachNotesChange={setCoachNotes}
          onReview={reviewSelectedCheckIn}
          onComplete={completeSelectedCheckIn}
          onGenerateAiReview={generateAiReview}
          onApproveAiRecommendation={approveAiRecommendation}
          onRejectAiRecommendation={rejectAiRecommendation}
        />
      ) : null}
    </div>
  );

  async function openCheckInDetail(checkIn: DisplayCheckIn) {
    setActionMessage(null);
    setActionError(null);
    setReviewSummary("");
    setCoachNotes("");
    setAiRecommendations([]);

    if (checkInSource === "fixture") {
      setSelectedCheckIn({
        id: checkIn.id,
        name: checkIn.name,
        initials: checkIn.initials,
        submittedAt: toDate(checkIn.submittedAt).toISOString(),
        assignedDay: toDate(checkIn.assignedDay ?? checkIn.submittedAt).toISOString(),
        lastCheckIn: checkIn.lastCheckIn,
        status: checkIn.status,
        answers: null,
        metrics: []
      });
      return;
    }

    setLoadingDetail(true);
    setSelectedCheckIn({
      ...(checkIn as ApiCheckInRecord),
      answers: null,
      metrics: []
    });

    try {
      const response = await fetch(`/api/v1/check-ins/${checkIn.id}`);

      if (!response.ok) {
        throw new Error("Detail request failed.");
      }

      const payload = (await response.json()) as { data?: CheckInDetail };

      if (payload.data) {
        setSelectedCheckIn(payload.data);
        setReviewSummary(payload.data.summary ?? "");
        setCoachNotes(payload.data.coachNotes ?? "");
        await loadAiRecommendations(payload.data);
      }
    } catch {
      setActionError("Check-in details could not be loaded.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadAiRecommendations(checkIn: CheckInDetail) {
    try {
      const search = new URLSearchParams({
        targetType: "check_in",
        targetId: checkIn.id,
        limit: "25"
      });
      const response = await fetch(`/api/v1/ai/recommendations?${search.toString()}`);

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: AiRecommendation[] };
      setAiRecommendations(payload.data ?? []);
    } catch {
      // AI recommendations are optional; keep the check-in review usable if this call fails.
    }
  }

  async function generateAiReview() {
    if (!selectedCheckIn || checkInSource !== "api") {
      return;
    }

    setAiLoading(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await fetch(`/api/v1/check-ins/${selectedCheckIn.id}/ai-review`, { method: "POST" });

      if (!response.ok) {
        throw new Error("AI review request failed.");
      }

      const payload = (await response.json()) as {
        data?: { outputs?: AiRecommendation[] };
      };

      setAiRecommendations(payload.data?.outputs ?? []);
      const summary = payload.data?.outputs?.find((output) => output.type === "check-in-summary");
      if (summary) {
        setReviewSummary(summary.contentMarkdown);
      }
      setActionMessage("AI review generated. Review and approve any client-facing recommendations before using them.");
    } catch {
      setActionError("AI review could not be generated.");
    } finally {
      setAiLoading(false);
    }
  }

  async function approveAiRecommendation(recommendationId: string) {
    await updateAiRecommendationStatus(recommendationId, "approve");
  }

  async function rejectAiRecommendation(recommendationId: string) {
    await updateAiRecommendationStatus(recommendationId, "reject");
  }

  async function updateAiRecommendationStatus(recommendationId: string, action: "approve" | "reject") {
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await fetch(`/api/v1/ai/recommendations/${recommendationId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(action === "reject" ? { body: JSON.stringify({ reason: "Rejected during check-in review." }) } : {})
      });

      if (!response.ok) {
        throw new Error("Recommendation update failed.");
      }

      const payload = (await response.json()) as { data?: AiRecommendation };
      if (payload.data) {
        setAiRecommendations((current) =>
          current.map((recommendation) => (recommendation.id === recommendationId ? payload.data! : recommendation))
        );
      }

      setActionMessage(action === "approve" ? "AI recommendation approved." : "AI recommendation rejected.");
    } catch {
      setActionError("AI recommendation could not be updated.");
    }
  }

  async function reviewSelectedCheckIn() {
    if (!selectedCheckIn) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/check-ins/${selectedCheckIn.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: reviewSummary,
          coachNotes
        })
      });

      if (!response.ok) {
        throw new Error("Review request failed.");
      }

      const payload = (await response.json()) as { data?: ApiCheckInRecord };

      if (payload.data) {
        updateCheckIn(payload.data);
        setSelectedCheckIn((current) => (current ? { ...current, ...payload.data } : current));
      }

      setActionMessage("Check-in reviewed.");
      setActionError(null);
    } catch {
      setActionError("Check-in could not be reviewed.");
    }
  }

  async function completeSelectedCheckIn() {
    if (!selectedCheckIn) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/check-ins/${selectedCheckIn.id}/complete`, { method: "POST" });

      if (!response.ok) {
        throw new Error("Complete request failed.");
      }

      const payload = (await response.json()) as { data?: ApiCheckInRecord };

      if (payload.data) {
        updateCheckIn(payload.data);
        setSelectedCheckIn((current) => (current ? { ...current, ...payload.data } : current));
      }

      setActionMessage("Check-in completed.");
      setActionError(null);
    } catch {
      setActionError("Check-in could not be completed.");
    }
  }

  function updateCheckIn(checkIn: ApiCheckInRecord) {
    setApiCheckIns((currentCheckIns) =>
      currentCheckIns.map((currentCheckIn) => (currentCheckIn.id === checkIn.id ? { ...currentCheckIn, ...checkIn } : currentCheckIn))
    );
  }
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

function CheckInDetailDialog({
  checkIn,
  loadingDetail,
  reviewSummary,
  coachNotes,
  actionMessage,
  actionError,
  aiRecommendations,
  aiLoading,
  onClose,
  onReviewSummaryChange,
  onCoachNotesChange,
  onReview,
  onComplete,
  onGenerateAiReview,
  onApproveAiRecommendation,
  onRejectAiRecommendation
}: {
  checkIn: CheckInDetail;
  loadingDetail: boolean;
  reviewSummary: string;
  coachNotes: string;
  actionMessage: string | null;
  actionError: string | null;
  aiRecommendations: AiRecommendation[];
  aiLoading: boolean;
  onClose: () => void;
  onReviewSummaryChange: (value: string) => void;
  onCoachNotesChange: (value: string) => void;
  onReview: () => void;
  onComplete: () => void;
  onGenerateAiReview: () => void;
  onApproveAiRecommendation: (recommendationId: string) => void;
  onRejectAiRecommendation: (recommendationId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Check-in detail for ${checkIn.name}`}
        className="mx-auto max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{checkIn.name}</h2>
            <p className="text-sm text-gray-500">Submitted: {formatSubmittedAt(toDate(checkIn.submittedAt))}</p>
          </div>
          <button type="button" className="rounded-lg border border-gray-200 px-3 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {loadingDetail ? <p className="text-sm text-gray-500">Loading check-in details...</p> : null}

        {actionMessage ? (
          <div role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {actionMessage}
          </div>
        ) : null}
        {actionError ? (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {actionError}
          </div>
        ) : null}

        <section className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Answers</h3>
          {checkIn.answers ? (
            <div className="space-y-2">
              {Object.entries(checkIn.answers).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold uppercase text-gray-500">{key}</div>
                  <div className="mt-1 text-sm text-gray-900">{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No persisted answers available.</p>
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Extracted Metrics</h3>
          {checkIn.metrics?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {checkIn.metrics.map((metric) => (
                <div key={metric.id} className="rounded-lg bg-indigo-50 p-3">
                  <div className="text-xs font-semibold uppercase text-indigo-700">{metric.metricKey}</div>
                  <div className="mt-1 text-lg font-bold text-indigo-950">
                    {metric.metricValue}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No metrics extracted.</p>
          )}
        </section>

        <section className="space-y-3 border-t border-gray-200 pt-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900">AI-Assisted Coaching</h3>
                <p className="mt-1 text-sm text-indigo-800">
                  Generate a CHFI-style review, then approve or reject recommendations before using them with a client.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={aiLoading}
                onClick={onGenerateAiReview}
              >
                {aiLoading ? "Generating..." : "Generate AI review"}
              </button>
            </div>

            {aiRecommendations.length ? (
              <div className="mt-4 space-y-3">
                {aiRecommendations.map((recommendation) => (
                  <article key={recommendation.id} className="rounded-lg border border-indigo-100 bg-white p-3">
                    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {recommendation.status}
                          </span>
                          {recommendation.severity ? (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              {recommendation.severity}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{recommendation.contentMarkdown}</p>
                      </div>
                      {recommendation.status === "pending-approval" ? (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                            onClick={() => onApproveAiRecommendation(recommendation.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                            onClick={() => onRejectAiRecommendation(recommendation.id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-indigo-800">No AI recommendations have been generated for this check-in yet.</p>
            )}
          </div>

          <label htmlFor="review-summary" className="block text-sm font-medium text-gray-700">
            Review summary
          </label>
          <textarea
            id="review-summary"
            value={reviewSummary}
            rows={3}
            className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => onReviewSummaryChange(event.target.value)}
          />
          <label htmlFor="coach-notes" className="block text-sm font-medium text-gray-700">
            Coach notes
          </label>
          <textarea
            id="coach-notes"
            value={coachNotes}
            rows={3}
            className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => onCoachNotesChange(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              onClick={onReview}
            >
              Mark reviewed
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              onClick={onComplete}
            >
              Mark complete
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function toDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value;
  }

  const parsedDate = value ? new Date(value) : new Date();

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}
