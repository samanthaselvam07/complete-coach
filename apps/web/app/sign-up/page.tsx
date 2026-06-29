import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent } from "@/components/ui/card";
import { isLocalDevAuthBypassEnabled } from "@/lib/auth/local-dev-session";

export default function SignUpPage() {
  if (isLocalDevAuthBypassEnabled()) {
    redirect("/");
  }

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_34rem),linear-gradient(135deg,#f8fafc_0%,#fff7ed_100%)] px-8 py-12">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" />
            Fresh coach workspace
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950">
            Start with a clean Complete Coach operating system.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Create your owner account and organization without demo clients, copied templates, local-only task data,
            or another coach&apos;s records.
          </p>
          <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3">
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
              <ShieldCheck className="mb-3 size-5 text-indigo-600" aria-hidden="true" />
              Isolated organization
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">Empty dashboard</div>
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">Owner access ready</div>
          </div>
        </div>

        <Card className="border-indigo-100 bg-white/95 shadow-2xl shadow-indigo-950/10">
          <CardContent className="p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">
                Complete Coach
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Create your workspace</h2>
              <p className="mt-2 text-sm text-slate-600">
                Takes about 30 seconds. No seeded client data is copied into your account.
              </p>
            </div>
            <SignUpForm />
            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-bold text-indigo-700 hover:text-indigo-900">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
