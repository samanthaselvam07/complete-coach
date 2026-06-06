"use client";

import { useState } from "react";
import { CheckCircle2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AcceptTeamInvitationPage({ token }: { token: string | null }) {
  const [status, setStatus] = useState<"idle" | "saving" | "accepted" | "error">("idle");

  async function acceptInvitation() {
    if (!token) {
      setStatus("error");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/v1/team-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error("Invitation could not be accepted.");
      }

      setStatus("accepted");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center p-6">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          {status === "accepted" ? <CheckCircle2 aria-hidden="true" /> : <Users aria-hidden="true" />}
        </div>
        <h1 className="text-3xl font-black">
          {status === "accepted" ? "Invitation accepted" : "Join the coaching team"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {status === "accepted"
            ? "Your membership is active. Sign out and back in if the new organization is not visible yet."
            : "Accept this invitation using the same email address that received it."}
        </p>

        {!token ? (
          <p role="alert" className="mt-5 text-sm font-semibold text-red-700">
            This invitation link is incomplete.
          </p>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="mt-5 text-sm font-semibold text-red-700">
            The invitation is invalid, expired, or belongs to a different signed-in email.
          </p>
        ) : null}
        {status !== "accepted" ? (
          <Button
            type="button"
            className="mt-6"
            disabled={!token || status === "saving"}
            onClick={() => void acceptInvitation()}
          >
            {status === "saving" ? "Accepting..." : "Accept invitation"}
          </Button>
        ) : null}
      </section>
    </main>
  );
}
