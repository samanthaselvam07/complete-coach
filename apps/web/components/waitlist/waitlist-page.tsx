"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { ArrowRight, Brain, CheckCircle2, Clock3, Dumbbell, Gauge, LineChart, LockKeyhole, LogIn, MessageSquareText, Sparkles, UsersRound } from "lucide-react";

type SubmissionState = "idle" | "submitting" | "success" | "error";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const painPoints = [
  {
    title: "You spend hours on admin that should take minutes.",
    copy: "Check-ins, program updates, client messages, invoices. The work behind the work never stops."
  },
  {
    title: "Your platform tells you nothing.",
    copy: "It stores data but never flags what needs attention or tells you what to do next."
  },
  {
    title: "Scaling means sacrificing quality.",
    copy: "More clients means more manual work, and quality starts to slip. There has to be a better way."
  }
];

const features = [
  {
    icon: Brain,
    title: "AI Check-in Analysis",
    copy: "Complete Coach reads your clients' check-ins and flags what needs your attention, so nothing falls through the cracks."
  },
  {
    icon: Dumbbell,
    title: "Smart Program Management",
    copy: "Build, assign and update training and nutrition programs without the copy-paste grind."
  },
  {
    icon: Gauge,
    title: "Client and Business Dashboard",
    copy: "See the health of your entire business at a glance. Who needs a follow-up. What's working. What isn't."
  },
  {
    icon: UsersRound,
    title: "Built for how coaches actually work",
    copy: "Packages, forms, onboarding, coach settings and more. Everything in one place, talking to each other."
  }
];

const reasons = [
  {
    icon: Sparkles,
    title: "Early Access",
    copy: "Be among the first coaches on the platform before public launch."
  },
  {
    icon: LockKeyhole,
    title: "Founding Member Pricing",
    copy: "Waitlist members get access to a locked-in rate that won't be available after launch."
  },
  {
    icon: MessageSquareText,
    title: "Shape the Product",
    copy: "Early members get a direct line to the founder. Your feedback influences what gets built next."
  }
];

function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, source: "waitlist-page" })
      });

      if (!response.ok) {
        throw new Error("Waitlist signup failed.");
      }

      setState("success");
      setMessage("You're on the list. We'll be in touch when early access opens.");
    } catch {
      setState("error");
      setMessage("Something went wrong, please try again");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-[1.75rem] border border-emerald-300/50 bg-emerald-50 px-5 py-4 text-left text-emerald-950 shadow-[0_20px_70px_rgba(16,185,129,0.14)]" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-black sm:text-base">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <form className={compact ? "mx-auto mt-7 grid w-full max-w-2xl gap-3 sm:grid-cols-[1fr_auto]" : "mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-[1fr_auto]"} onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor={inputId}>
        Email address
      </label>
      <input
        id={inputId}
        className="min-h-14 rounded-full border border-white/18 bg-white px-5 text-base font-semibold text-slate-950 shadow-[0_18px_50px_rgba(0,0,0,0.18)] outline-none transition focus:border-[#ff6b16] focus:ring-4 focus:ring-[#ff6b16]/20"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Enter your email address"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (state === "error") {
            setState("idle");
            setMessage("");
          }
        }}
        aria-invalid={state === "error"}
        aria-describedby={state === "error" ? `${inputId}-message` : undefined}
      />
      <button
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#ff6b16] px-7 text-base font-black text-white shadow-[0_18px_50px_rgba(255,107,22,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff7f35] focus:outline-none focus:ring-4 focus:ring-[#ff6b16]/25 disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
        disabled={state === "submitting"}
      >
        {state === "submitting" ? "Joining..." : "Join the Waitlist"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      {state === "error" ? (
        <p id={`${inputId}-message`} className="px-2 text-sm font-bold text-[#ffb199] sm:col-span-2" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function IntelligenceGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.07] p-4 shadow-[0_38px_100px_rgba(0,0,0,0.32)] backdrop-blur">
      <div className="absolute inset-x-14 top-10 h-28 rounded-full bg-[#5036e8]/35 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-[#f8f7fb] p-4 text-slate-950">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#5036e8]">Coach command</p>
            <p className="mt-1 text-lg font-black">Today needs attention</p>
          </div>
          <span className="rounded-full bg-[#5036e8] px-3 py-1 text-xs font-black text-white">Live</span>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black">Recovery risk</span>
              <span className="text-xs font-black text-[#ff6b16]">High</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-[#5036e8] to-[#ff6b16]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <Clock3 aria-hidden="true" className="mb-5 size-5 text-[#5036e8]" />
              <p className="text-2xl font-black">12</p>
              <p className="text-xs font-bold text-slate-500">signals read</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <LineChart aria-hidden="true" className="mb-5 size-5 text-[#ff6b16]" />
              <p className="text-2xl font-black">3</p>
              <p className="text-xs font-bold text-slate-500">coach actions</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#111118] p-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffc36a]">Next best action</p>
            <p className="mt-2 text-lg font-black">Message clients whose check-ins and adherence disagree.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandLockup() {
  return (
    <div className="inline-flex items-center gap-3">
      <Image
        src="/brand/favicon.svg"
        alt="Complete Coach logo"
        width={58}
        height={58}
        priority
        className="size-12 shrink-0 sm:size-[3.65rem]"
      />
      <div className="min-w-0">
        <p className="text-[1.18rem] font-black leading-none tracking-[-0.01em] text-white sm:text-[1.28rem]">Complete Coach</p>
        <p className="mt-2 text-[0.59rem] font-black uppercase leading-none tracking-[0.42em] text-white/68 sm:text-[0.64rem]">
          Business OS for fitness professionals
        </p>
      </div>
    </div>
  );
}

export function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#111118]">
      <section className="relative overflow-hidden bg-[#111118] px-5 py-8 text-white sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(80,54,232,0.55),transparent_28rem),radial-gradient(circle_at_88%_28%,rgba(255,107,22,0.32),transparent_24rem)]" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[92svh] w-full max-w-7xl content-center gap-12 py-10 lg:grid-cols-[0.95fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-12 flex flex-wrap items-center justify-between gap-5">
              <BrandLockup />
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/10 px-5 text-sm font-black text-white shadow-[0_18px_50px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:bg-white/16 focus:outline-none focus:ring-4 focus:ring-white/18"
                href="https://app.completecoach.fit"
              >
                <LogIn aria-hidden="true" className="size-4" />
                Log in
              </a>
            </div>
            <p className="mb-5 inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-[#ffc36a]">Early access waitlist</p>
            <h1 className="max-w-4xl text-[clamp(3.35rem,12vw,7.8rem)] font-black leading-[0.86] tracking-[-0.04em]">
              Your coaching platform should work as hard as you do.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-white/74 sm:text-xl">
              Complete Coach is the AI-powered coaching OS built for online fitness coaches. Less admin, better decisions, more time coaching.
            </p>
            <WaitlistForm />
            <p className="mt-4 text-sm font-bold text-white/58">Be first in line for early access and founding member pricing.</p>
          </div>
          <IntelligenceGraphic />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#5036e8]">The problem</p>
          <h2 className="mt-4 text-[clamp(2.45rem,7vw,5.4rem)] font-black leading-[0.92] tracking-[-0.035em]">
            Most coaching software is a database. Complete Coach is a business tool.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {painPoints.map((point, index) => (
            <article className="rounded-[1.75rem] border border-[#e5e0ed] bg-white p-6 shadow-[0_18px_55px_rgba(17,17,24,0.06)]" key={point.title}>
              <span className="text-5xl font-black text-[#5036e8]">{index + 1}</span>
              <h3 className="mt-12 text-2xl font-black leading-tight">{point.title}</h3>
              <p className="mt-4 text-base font-medium leading-7 text-slate-600">{point.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#5036e8]">What Complete Coach does</p>
            <h2 className="mt-4 text-[clamp(2.45rem,7vw,5.2rem)] font-black leading-[0.92] tracking-[-0.035em]">
              An operating system for your coaching business.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="rounded-[1.75rem] border border-[#e5e0ed] bg-[#fbfaf8] p-6 shadow-[0_18px_55px_rgba(17,17,24,0.055)]" key={feature.title}>
                  <Icon aria-hidden="true" className="size-6 text-[#5036e8]" />
                  <h3 className="mt-16 text-2xl font-black leading-tight">{feature.title}</h3>
                  <p className="mt-4 text-base font-medium leading-7 text-slate-600">{feature.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.82fr_1fr] lg:px-12">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#5036e8]">Why join</p>
          <h2 className="mt-4 text-[clamp(2.45rem,7vw,5.2rem)] font-black leading-[0.92] tracking-[-0.035em]">
            Get in early. It matters.
          </h2>
        </div>
        <div className="grid gap-4">
          {reasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <article className="grid gap-5 rounded-[1.75rem] border border-[#e5e0ed] bg-white p-6 shadow-[0_18px_55px_rgba(17,17,24,0.055)] sm:grid-cols-[auto_1fr] sm:items-start" key={reason.title}>
                <div className="grid size-12 place-items-center rounded-2xl bg-[#eee9ff] text-[#5036e8]">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-black leading-tight">{reason.title}</h3>
                  <p className="mt-2 text-base font-medium leading-7 text-slate-600">{reason.copy}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#111118] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-7">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffc36a]">Founder</p>
            <h2 className="mt-4 text-[clamp(2.45rem,7vw,5rem)] font-black leading-[0.92] tracking-[-0.035em]">
              Built by a coach, for coaches.
            </h2>
          </div>
          <p className="text-lg font-semibold leading-9 text-white/74">
            Complete Coach was founded by Sammi Szalinski, an online fitness coach who experienced firsthand how broken coaching software actually is. After using multiple platforms and watching other coaches struggle with the same problems, she decided to build what the industry actually needs: a platform that works with you, not just for you.
          </p>
        </div>
      </section>

      <section className="px-5 py-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#5036e8]">Final call</p>
          <h2 className="mt-4 text-[clamp(2.75rem,8vw,6rem)] font-black leading-[0.9] tracking-[-0.04em]">
            Ready to coach smarter?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
            Join the waitlist today and be first to know when Complete Coach opens its doors.
          </p>
          <WaitlistForm compact />
          <p className="mt-4 text-sm font-bold text-slate-500">No spam. Just updates on the build and your early access invite when we launch.</p>
        </div>
      </section>

      <footer className="border-t border-[#e5e0ed] px-5 py-8 text-center text-sm font-bold text-slate-500 sm:px-8 lg:px-12">
        © 2026 Complete Coach. Built for coaches who want their systems to think with them.
      </footer>
    </main>
  );
}
