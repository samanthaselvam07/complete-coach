import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent } from "@/components/ui/card";
import { isLocalDevAuthBypassEnabled } from "@/lib/auth/local-dev-session";

export default function SignInPage() {
  if (isLocalDevAuthBypassEnabled()) {
    redirect("/");
  }

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.16),transparent_32rem),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-8 py-12">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Secure coach workspace
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950">
            Sign in to manage clients, programming, and team operations.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Complete Coach now uses Auth.js with Neon-backed users and organization memberships.
            Product surfaces now load their records from the Neon-backed application APIs.
          </p>
        </div>

        <Card className="border-indigo-100 bg-white/95 shadow-2xl shadow-indigo-950/10">
          <CardContent className="p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">
                Complete Coach
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-600">
                Use the owner credentials configured through the environment.
              </p>
            </div>
            <SignInForm />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
