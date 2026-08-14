"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  founderOnboardingFocusOptions,
  founderOnboardingPlatformOptions,
  founderOnboardingRosterSizeOptions
} from "@/lib/onboarding/founder-onboarding";

type WizardStep = "welcome" | "profile" | "platform" | "done";

interface FounderOnboardingResponse {
  data: {
    firstName: string;
    required: boolean;
    completed: boolean;
    focus: string | null;
    rosterSize: string | null;
    platform: string | null;
    otherPlatform: string | null;
  };
}

export function FounderOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [firstName, setFirstName] = useState("there");
  const [focus, setFocus] = useState("");
  const [rosterSize, setRosterSize] = useState("");
  const [platform, setPlatform] = useState("");
  const [otherPlatform, setOtherPlatform] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      try {
        const response = await fetch("/api/v1/onboarding/founder");

        if (!response.ok) {
          throw new Error("Unable to load onboarding.");
        }

        const payload = (await response.json()) as FounderOnboardingResponse;

        if (cancelled) {
          return;
        }

        if (!payload.data.required || payload.data.completed) {
          router.replace("/");
          return;
        }

        setFirstName(payload.data.firstName);
        setFocus(payload.data.focus ?? "");
        setRosterSize(payload.data.rosterSize ?? "");
        setPlatform(payload.data.platform ?? "");
        setOtherPlatform(payload.data.otherPlatform ?? "");
      } catch {
        if (!cancelled) {
          setError("We could not load your onboarding flow. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const canContinueProfile = Boolean(focus && rosterSize);
  const canContinuePlatform = Boolean(platform && (platform !== "Other" || otherPlatform.trim()));

  async function completeOnboarding() {
    if (!canContinuePlatform) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/onboarding/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus,
          rosterSize,
          platform,
          otherPlatform: platform === "Other" ? otherPlatform.trim() : undefined
        })
      });

      if (!response.ok) {
        throw new Error("Unable to complete onboarding.");
      }

      const payload = (await response.json()) as FounderOnboardingResponse;
      setFirstName(payload.data.firstName);
      setStep("done");
    } catch {
      setError("We could not save your onboarding details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-slate-950">
        <div role="status" className="h-3 w-48 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          <span className="sr-only">Loading onboarding.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-10">
        {step === "welcome" ? (
          <WelcomeStep firstName={firstName} onNext={() => setStep("profile")} />
        ) : null}

        {step === "profile" ? (
          <ProfileStep
            focus={focus}
            rosterSize={rosterSize}
            onFocusChange={setFocus}
            onRosterSizeChange={setRosterSize}
            onNext={() => setStep("platform")}
            canContinue={canContinueProfile}
          />
        ) : null}

        {step === "platform" ? (
          <PlatformStep
            platform={platform}
            otherPlatform={otherPlatform}
            onPlatformChange={setPlatform}
            onOtherPlatformChange={setOtherPlatform}
            onNext={completeOnboarding}
            canContinue={canContinuePlatform}
            submitting={submitting}
          />
        ) : null}

        {step === "done" ? <DoneStep firstName={firstName} onDashboard={() => router.replace("/")} /> : null}

        {error ? <p className="mt-6 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    </main>
  );
}

function WelcomeStep({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  return (
    <section className="mx-auto w-full max-w-2xl text-center">
      <h1 className="text-4xl font-black text-slate-950 sm:text-5xl">Welcome to Complete Coach, {firstName}.</h1>
      <div className="mx-auto mt-6 max-w-xl space-y-4 text-base leading-7 text-slate-700 sm:text-lg">
        <p>
          I'm Sammi, the founder. Thanks for being one of the first five coaches on the platform.
          This will take about two minutes, and then I'll send you a link to book your personal
          onboarding call.
        </p>
        <p>On that call we'll set everything up together.</p>
      </div>
      <PrimaryButton onClick={onNext} label="Let's go" />
    </section>
  );
}

function ProfileStep(props: {
  focus: string;
  rosterSize: string;
  onFocusChange: (value: string) => void;
  onRosterSizeChange: (value: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <section className="w-full">
      <StepProgress current={1} total={2} />
      <h1 className="mt-6 text-3xl font-black text-slate-950 sm:text-4xl">Tell us a bit about your coaching.</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Coaching focus</span>
          <select
            value={props.focus}
            onChange={(event) => props.onFocusChange(event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Select focus</option>
            {founderOnboardingFocusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Current client roster</span>
          <select
            value={props.rosterSize}
            onChange={(event) => props.onRosterSizeChange(event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Select roster size</option>
            {founderOnboardingRosterSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <PrimaryButton onClick={props.onNext} label="Continue" disabled={!props.canContinue} />
    </section>
  );
}

function PlatformStep(props: {
  platform: string;
  otherPlatform: string;
  onPlatformChange: (value: string) => void;
  onOtherPlatformChange: (value: string) => void;
  onNext: () => void;
  canContinue: boolean;
  submitting: boolean;
}) {
  return (
    <section className="w-full">
      <StepProgress current={2} total={2} />
      <h1 className="mt-6 text-3xl font-black text-slate-950 sm:text-4xl">Where are your clients right now?</h1>
      <p className="mt-3 text-base leading-7 text-slate-700">We'll help you bring them over on your onboarding call.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {founderOnboardingPlatformOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => props.onPlatformChange(option)}
            className={`flex min-h-20 items-center justify-between rounded-lg border bg-white p-4 text-left text-sm font-semibold shadow-sm transition ${
              props.platform === option
                ? "border-emerald-600 ring-2 ring-emerald-200"
                : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <span>{option}</span>
            {props.platform === option ? <Check className="size-4 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {props.platform === "Other" ? (
        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-700">Other platform</span>
          <input
            value={props.otherPlatform}
            onChange={(event) => props.onOtherPlatformChange(event.target.value)}
            placeholder="Which platform are you on?"
            className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
          />
        </label>
      ) : null}
      <PrimaryButton
        onClick={props.onNext}
        label={props.submitting ? "Saving" : "Continue"}
        disabled={!props.canContinue || props.submitting}
      />
    </section>
  );
}

function DoneStep({ firstName, onDashboard }: { firstName: string; onDashboard: () => void }) {
  const bullets = useMemo(
    () => ["walk through dashboard", "bring clients into platform", "set up check-in flow", "cover anything else"],
    []
  );

  return (
    <section className="mx-auto w-full max-w-2xl text-center">
      <h1 className="text-4xl font-black text-slate-950 sm:text-5xl">You're all set, {firstName}.</h1>
      <div className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-700 sm:text-lg">
        <p>I've just sent you an email with a link to book your onboarding call. It is 30 minutes and we will:</p>
        <ul className="mx-auto mt-5 grid max-w-md gap-3 text-left text-sm font-semibold text-slate-800">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5">In the meantime, feel free to have a look around.</p>
      </div>
      <PrimaryButton onClick={onDashboard} label="Go to my dashboard" />
      <p className="mt-5 text-sm text-slate-500">
        Can't find the email? Check your spam folder or reply to your signup confirmation and I'll resend it.
      </p>
    </section>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">
        Step {current} of {total}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden="true">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full ${index < current ? "bg-emerald-600" : "bg-slate-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  label,
  disabled = false
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mx-auto mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {label}
      <ChevronRight className="size-4" aria-hidden="true" />
    </button>
  );
}
