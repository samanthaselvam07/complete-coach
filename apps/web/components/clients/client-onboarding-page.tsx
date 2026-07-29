"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OnboardingStatus = "loading" | "ready" | "saving" | "saved" | "error";

interface ClientOnboardingData {
  clientName: string;
  clientEmail: string | null;
  organizationName: string;
  packageName: string | null;
  paymentRequired: boolean;
  paymentStatus: string | null;
  canSetPassword: boolean;
}

export function ClientOnboardingPage({ token }: { token: string }) {
  const [data, setData] = useState<ClientOnboardingData | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<OnboardingStatus>("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      setStatus("loading");
      const response = await fetch(`/api/v1/client-onboarding/${encodeURIComponent(token)}`);
      const payload = (await response.json().catch(() => null)) as
        | { data?: ClientOnboardingData; error?: { message?: string } }
        | null;

      if (cancelled) {
        return;
      }

      if (!response.ok || !payload?.data) {
        setStatus("error");
        setMessage(payload?.error?.message ?? "This setup link is invalid or expired.");
        return;
      }

      setData(payload.data);
      setStatus("ready");
    }

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const response = await fetch(`/api/v1/client-onboarding/${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

    if (!response.ok) {
      setStatus("error");
      setMessage(payload?.error?.message ?? "Your account could not be set up. Please try again.");
      return;
    }

    setStatus("saved");
    const signInResult = await signIn("credentials", {
      email: data?.clientEmail ?? "",
      password,
      redirect: false
    });

    if (signInResult?.error) {
      router.replace("/sign-in");
      return;
    }

    router.replace("/");
  }

  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-lg border-slate-200 bg-white shadow-xl shadow-slate-950/5">
        <CardContent className="p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-700">Complete Coach</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Set up your account</h1>

          {status === "loading" ? <p className="mt-6 text-sm text-slate-600">Checking your setup link...</p> : null}

          {data ? (
            <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">{data.organizationName}</span> invited{" "}
                <span className="font-semibold text-slate-950">{data.clientName}</span>.
              </p>
              {data.packageName ? <p>Package: {data.packageName}</p> : null}
              {paymentResult === "success" && data.paymentRequired ? (
                <p className="font-semibold text-amber-700">Payment is still confirming. Please refresh in a moment.</p>
              ) : null}
              {paymentResult === "cancelled" ? (
                <p className="font-semibold text-amber-700">Payment was not completed.</p>
              ) : null}
            </div>
          ) : null}

          {data?.paymentRequired ? (
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Complete your package payment from the email link before setting up your login.
            </p>
          ) : null}

          {message ? (
            <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </p>
          ) : null}

          {data?.canSetPassword ? (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="client-password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Input
                  id="client-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={status === "saving" || status === "saved"}
                className="h-11 w-full rounded-xl bg-indigo-700 text-white hover:bg-indigo-800"
              >
                {status === "saving" ? "Saving..." : "Create login"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
