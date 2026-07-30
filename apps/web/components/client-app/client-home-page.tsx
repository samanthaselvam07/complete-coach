"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Dumbbell, TrendingUp, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface ClientMeResponse {
  data?: {
    client: {
      id: string;
      name: string;
    };
    trainingAssignments: Array<{
      id: string;
      name: string;
      status: string;
      snapshot: unknown;
    }>;
    mealPlanAssignments: Array<{
      id: string;
      name: string;
      status: string;
      targetCalories: number;
    }>;
  };
  error?: {
    message?: string;
  };
}

type LoadState = "loading" | "ready" | "error";
type ClientHomeTileHref = "/workout" | "/nutrition";

export function ClientHomePage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [trainingName, setTrainingName] = useState("Training plan");
  const [mealPlanName, setMealPlanName] = useState("Nutrition plan");
  const [trainingDays, setTrainingDays] = useState(0);
  const [targetCalories, setTargetCalories] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadClientHome() {
      try {
        const response = await fetch("/api/v1/client/me");
        const payload = (await response.json().catch(() => null)) as ClientMeResponse | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "Your client dashboard could not be loaded.");
        }

        const activeTraining = payload.data.trainingAssignments.find((assignment) => assignment.status === "active")
          ?? payload.data.trainingAssignments[0]
          ?? null;
        const activeMealPlan = payload.data.mealPlanAssignments.find((assignment) => assignment.status === "active")
          ?? payload.data.mealPlanAssignments[0]
          ?? null;

        if (!mounted) {
          return;
        }

        setClientName(payload.data.client.name);
        setTrainingName(activeTraining?.name ?? "Training plan");
        setMealPlanName(activeMealPlan?.name ?? "Nutrition plan");
        setTrainingDays(countTrainingDays(activeTraining?.snapshot));
        setTargetCalories(activeMealPlan?.targetCalories ?? 0);
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Your client dashboard could not be loaded.");
        setLoadState("error");
      }
    }

    void loadClientHome();

    return () => {
      mounted = false;
    };
  }, []);

  const firstName = useMemo(() => clientName.split(/\s+/u)[0] ?? "there", [clientName]);
  const todayLabel = useMemo(() => new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date()), []);

  return (
    <ClientMobileShell title="Complete Coach" avatarLabel={firstName || "CC"}>
      {loadState === "loading" ? <ClientHomeStatus message="Loading your dashboard" /> : null}
      {loadState === "error" ? <ClientHomeStatus message={errorMessage} tone="error" /> : null}

      {loadState === "ready" ? (
        <div className="space-y-8">
          <ClientSectionHeading eyebrow={todayLabel} title={`Hello, ${firstName}`}>
            <p className="max-w-sm text-sm font-semibold leading-6 text-[#777584]">
              Your training, nutrition and check-ins are ready for today.
            </p>
          </ClientSectionHeading>

          <section className="rounded-[1.65rem] bg-white p-8 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">Daily check-in</p>
                <h2 className="mt-2 text-2xl font-black tracking-normal text-[#1b1c1c]">Log your metrics</h2>
                <p className="mt-1 text-sm font-semibold text-[#777584]">Align your week before training starts.</p>
              </div>
              <TrendingUp aria-hidden="true" className="size-14 text-[#e9e8e7]" />
            </div>
            <Link
              href="/check-in"
              className="mt-7 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-base font-black text-white shadow-[0_20px_45px_rgba(54,32,184,0.24)] transition active:scale-[0.98]"
            >
              Log Daily Check In
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <ClientHomeTile
              href="/workout"
              icon={<Dumbbell aria-hidden="true" className="size-5" />}
              label="Workout"
              title={trainingName}
              meta={`${trainingDays || 0} training days`}
            />
            <ClientHomeTile
              href="/nutrition"
              icon={<Utensils aria-hidden="true" className="size-5" />}
              label="Nutrition"
              title={mealPlanName}
              meta={targetCalories ? `${targetCalories.toLocaleString()} kcal target` : "Meal plan ready"}
            />
          </section>

          <section className="rounded-[1.65rem] bg-[#f5f3f3] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-black text-[#1b1c1c]">Hydration</p>
                <p className="text-sm font-semibold text-[#777584]">Daily rhythm</p>
              </div>
              <p className="text-2xl font-black text-[#3620b8]">0L <span className="text-sm text-[#777584]">/ 3.0L</span></p>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e4e2e2]">
              <div className="h-full w-0 rounded-full bg-gradient-to-r from-[#3620b8] to-[#5f50f0]" />
            </div>
          </section>

          <section className="rounded-[1.65rem] bg-white p-6 shadow-[0_18px_45px_rgba(27,28,28,0.05)]">
            <div className="flex items-start gap-4">
              <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#fff0e6] text-[#f87600]">
                <CalendarDays aria-hidden="true" className="size-5" />
              </div>
              <div>
                <p className="font-black text-[#1b1c1c]">Weekly check-in</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#777584]">
                  Review progress, training feedback and recovery notes with your coach.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </ClientMobileShell>
  );
}

function ClientHomeStatus({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
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

function ClientHomeTile({
  href,
  icon,
  label,
  title,
  meta
}: {
  href: ClientHomeTileHref;
  icon: React.ReactNode;
  label: string;
  title: string;
  meta: string;
}) {
  return (
    <Link href={href} className="rounded-[1.65rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.06)] transition active:scale-[0.98]">
      <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-[#f5f3f3] text-[#3620b8]">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#777584]">{label}</p>
      <p className="mt-2 min-h-12 overflow-hidden text-lg font-black leading-6 text-[#1b1c1c]">{title}</p>
      <p className="mt-3 text-xs font-bold text-[#777584]">{meta}</p>
    </Link>
  );
}

function countTrainingDays(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("days" in snapshot)) {
    return 0;
  }

  const days = (snapshot as { days?: unknown }).days;

  return Array.isArray(days) ? days.length : 0;
}
