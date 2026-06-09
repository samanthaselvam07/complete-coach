"use client";

import { CalendarDays, CheckCircle2, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CalendarProviderId = "apple" | "google" | "outlook";
type CalendarConnectionScope = "organization" | "coach";

interface CalendarConnection {
  id: string;
  provider: CalendarProviderId;
  scope: CalendarConnectionScope;
  accountName: string;
  calendarName: string | null;
  status: "pending" | "active" | "revoked" | "error";
}

interface CalendarConnectionsPanelProps {
  scope: CalendarConnectionScope;
  redirectTo: string;
  title: string;
  description: string;
}

const calendarProviders: Array<{
  id: CalendarProviderId;
  label: string;
  description: string;
  actionLabel: string;
}> = [
  {
    id: "apple",
    label: "Apple Calendar",
    description: "Track Apple Calendar CalDAV setup for this workspace.",
    actionLabel: "Set up Apple Calendar"
  },
  {
    id: "google",
    label: "Google Calendar",
    description: "Sync coaching calls, events, and reminders from Google Calendar.",
    actionLabel: "Connect Google Calendar"
  },
  {
    id: "outlook",
    label: "Outlook Calendar",
    description: "Sync Microsoft 365 and Outlook calendar events.",
    actionLabel: "Connect Outlook Calendar"
  }
];

export function CalendarConnectionsPanel({ scope, redirectTo, title, description }: CalendarConnectionsPanelProps) {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading calendar connections...");
  const [connectingApple, setConnectingApple] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch(`/api/v1/calendar/connections?scope=${scope}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Calendar connection API unavailable.");
        }

        return response.json() as Promise<{ data: CalendarConnection[] }>;
      })
      .then((payload) => {
        if (mounted) {
          setConnections(payload.data);
          setStatusMessage(payload.data.length > 0 ? "Calendar connections loaded." : "No calendars connected yet.");
        }
      })
      .catch(() => {
        if (mounted) {
          setStatusMessage("Calendar connections could not be loaded.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [scope]);

  const connectApple = async () => {
    setConnectingApple(true);
    setStatusMessage("Creating Apple Calendar setup record...");

    try {
      const response = await fetch("/api/v1/calendar/connections/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope })
      });
      const payload = (await response.json()) as { data?: CalendarConnection; error?: { message: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not create Apple Calendar setup.");
      }

      setConnections((currentConnections) => [
        payload.data as CalendarConnection,
        ...currentConnections.filter((connection) => connection.provider !== "apple")
      ]);
      setStatusMessage("Apple Calendar setup is ready. Add app-specific CalDAV credentials in production secrets.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create Apple Calendar setup.");
    } finally {
      setConnectingApple(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black text-slate-950">
            <CalendarDays className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <p role="status" className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {statusMessage}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {calendarProviders.map((provider) => {
          const connection = connections.find((entry) => entry.provider === provider.id);
          const isConnected = connection?.status === "active";
          const isPending = connection?.status === "pending";

          return (
            <article key={provider.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{provider.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{provider.description}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                    isConnected
                      ? "bg-green-100 text-green-700"
                      : isPending
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                  )}
                >
                  {isConnected ? "Connected" : isPending ? "Pending" : "Not connected"}
                </span>
              </div>
              {connection ? (
                <p className="mt-4 text-sm font-bold text-slate-700">{connection.accountName}</p>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No calendar connected.</p>
              )}
              {provider.id === "apple" ? (
                <button
                  type="button"
                  disabled={connectingApple}
                  onClick={connectApple}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {connectingApple ? "Setting up..." : provider.actionLabel}
                </button>
              ) : (
                <a
                  href={`/api/v1/calendar/connections/oauth/start?provider=${provider.id}&scope=${scope}&redirectTo=${redirectTo}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  {provider.actionLabel}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
