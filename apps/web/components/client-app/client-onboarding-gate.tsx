"use client";

import { CheckCircle2, CreditCard, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/components/ui/utils";
import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";
import { DailyCheckInFieldControl } from "./client-daily-check-in-form-page";

interface OnboardingGateResponse {
  data?: OnboardingGateState;
  error?: {
    message?: string;
  };
}

interface OnboardingGateState {
  payment: {
    required: boolean;
    packageId: string | null;
    packageName: string | null;
    status: string | null;
  };
  questionnaire: QuestionnaireAssignment | null;
}

interface QuestionnaireAssignment {
  id: string;
  formName: string;
  formVersion?: {
    schema?: {
      title?: string;
      description?: string;
      fields?: QuestionnaireField[];
    };
  };
}

interface QuestionnaireField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  content?: string;
  options?: string[];
}

type GateLoadState = "loading" | "ready" | "error";
type GateActionState = "idle" | "working" | "submitted";

export function ClientOnboardingGate({ children }: { children: React.ReactNode }) {
  const [loadState, setLoadState] = useState<GateLoadState>("loading");
  const [actionState, setActionState] = useState<GateActionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [gateState, setGateState] = useState<OnboardingGateState | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const fields = useMemo(() => gateState?.questionnaire?.formVersion?.schema?.fields ?? [], [gateState]);

  async function loadGateState() {
    try {
      setLoadState("loading");
      setErrorMessage("");
      const response = await fetch("/api/v1/client/onboarding/status");
      const payload = (await response.json().catch(() => null)) as OnboardingGateResponse | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "Your account setup could not be loaded.");
      }

      setGateState(payload.data);
      setLoadState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your account setup could not be loaded.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadGateState);

    const refreshGateState = () => {
      if (document.visibilityState === "visible") {
        void loadGateState();
      }
    };

    window.addEventListener("focus", refreshGateState);
    document.addEventListener("visibilitychange", refreshGateState);

    return () => {
      window.removeEventListener("focus", refreshGateState);
      document.removeEventListener("visibilitychange", refreshGateState);
    };
  }, []);

  async function startCheckout() {
    try {
      setActionState("working");
      setErrorMessage("");
      const response = await fetch("/api/v1/client/onboarding/checkout", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { data?: { checkoutUrl?: string }; error?: { message?: string } } | null;

      if (!response.ok || !payload?.data?.checkoutUrl) {
        throw new Error(payload?.error?.message ?? "Your payment link could not be opened.");
      }

      window.location.assign(payload.data.checkoutUrl);
    } catch (error) {
      setActionState("idle");
      setErrorMessage(error instanceof Error ? error.message : "Your payment link could not be opened.");
    }
  }

  async function submitQuestionnaire(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setActionState("working");
      setErrorMessage("");
      const response = await fetch("/api/v1/client/onboarding/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Your onboarding Q&A could not be submitted.");
      }

      setActionState("submitted");
      setGateState((current) => current ? { ...current, questionnaire: null } : current);
    } catch (error) {
      setActionState("idle");
      setErrorMessage(error instanceof Error ? error.message : "Your onboarding Q&A could not be submitted.");
    }
  }

  function updateAnswer(fieldId: string, value: unknown) {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value
    }));
  }

  if (loadState === "ready" && gateState && !gateState.payment.required && !gateState.questionnaire) {
    return <>{children}</>;
  }

  return (
    <ClientMobileShell title="Complete Coach" avatarLabel="CC" hideBottomNav>
      {loadState === "loading" ? <GateStatus message="Loading your account setup" /> : null}
      {loadState === "error" ? <GateStatus message={errorMessage} tone="error" /> : null}

      {loadState === "ready" && gateState?.payment.required ? (
        <div className="space-y-6">
          <ClientSectionHeading eyebrow="Account setup" title="Complete your payment">
            <p className="text-sm font-semibold leading-6 text-[#777584]">
              Your coach has assigned {gateState.payment.packageName ?? "your coaching package"}. Complete payment to unlock your account.
            </p>
          </ClientSectionHeading>

          <section className="rounded-[1.65rem] bg-white p-6 shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
            <div className="flex items-start gap-4">
              <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#f5f3f3] text-[#3620b8]">
                <CreditCard aria-hidden="true" className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1b1c1c]">{gateState.payment.packageName ?? "Coaching package"}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#777584]">
                  Payment is handled securely through your coach&apos;s connected Stripe account.
                </p>
                {gateState.payment.status ? (
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-[#f87600]">Payment status: {gateState.payment.status}</p>
                ) : null}
              </div>
            </div>

            {errorMessage ? <GateInlineError message={errorMessage} /> : null}

            <button
              type="button"
              disabled={actionState === "working"}
              onClick={startCheckout}
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#3620b8] text-base font-black text-white shadow-[0_20px_45px_rgba(54,32,184,0.24)] transition active:scale-[0.98] disabled:opacity-70"
            >
              <CreditCard aria-hidden="true" className="size-5" />
              {actionState === "working" ? "Opening payment" : "Complete payment"}
            </button>

            <button
              type="button"
              onClick={() => void loadGateState()}
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[#f5f3f3] text-sm font-black text-[#777584]"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Refresh payment status
            </button>
          </section>
        </div>
      ) : null}

      {loadState === "ready" && gateState && !gateState.payment.required && gateState.questionnaire ? (
        <div className="space-y-6">
          <ClientSectionHeading eyebrow="Onboarding Q&A" title={gateState.questionnaire.formVersion?.schema?.title ?? gateState.questionnaire.formName}>
            <p className="text-sm font-semibold leading-6 text-[#777584]">
              {gateState.questionnaire.formVersion?.schema?.description ?? "Answer these questions so your coach can finish setting up your profile."}
            </p>
          </ClientSectionHeading>

          <form onSubmit={submitQuestionnaire} className="space-y-4">
            {fields.map((field) => (
              <DailyCheckInFieldControl
                key={field.id}
                field={field}
                value={answers[field.id]}
                onChange={(value) => updateAnswer(field.id, value)}
              />
            ))}

            {errorMessage ? <GateInlineError message={errorMessage} /> : null}

            <button
              type="submit"
              disabled={actionState !== "idle"}
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#3620b8] text-base font-black text-white shadow-[0_20px_45px_rgba(54,32,184,0.24)] transition active:scale-[0.98] disabled:opacity-70"
            >
              {actionState === "submitted" ? <CheckCircle2 aria-hidden="true" className="size-5" /> : <Send aria-hidden="true" className="size-5" />}
              {actionState === "submitted" ? "Submitted" : actionState === "working" ? "Submitting" : "Submit onboarding Q&A"}
            </button>
          </form>
        </div>
      ) : null}
    </ClientMobileShell>
  );
}

function GateStatus({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
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

function GateInlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
      {message}
    </p>
  );
}
