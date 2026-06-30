"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignUpStatus = "idle" | "submitting" | "success" | "error";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [status, setStatus] = useState<SignUpStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("submitting");
        setErrorMessage("");

        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            organizationName,
            timezone
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          setStatus("error");
          setErrorMessage(payload?.error?.message ?? "Unable to create your workspace right now.");
          return;
        }

        setStatus("success");
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false
        });

        if (signInResult?.error) {
          setStatus("error");
          setErrorMessage("Workspace created, but we could not sign you in automatically. Please sign in.");
          return;
        }

        router.replace("/");
      }}
    >
      <div className="space-y-2">
        <label htmlFor="signup-name" className="text-sm font-semibold text-slate-700">
          Full name
        </label>
        <Input
          id="signup-name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-semibold text-slate-700">
          Work email
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-semibold text-slate-700">
          Password
        </label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-organization" className="text-sm font-semibold text-slate-700">
          Business name
        </label>
        <Input
          id="signup-organization"
          name="organizationName"
          autoComplete="organization"
          required
          value={organizationName}
          onChange={(event) => {
            setOrganizationName(event.target.value);
          }}
        />
      </div>

      {status === "success" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Workspace created. Signing you in now.
        </p>
      ) : null}

      {status === "error" ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={status === "submitting"}
        className="h-11 w-full rounded-xl bg-indigo-700 text-white hover:bg-indigo-800"
      >
        {status === "submitting" ? "Signing up..." : "Sign up"}
      </Button>
    </form>
  );
}
