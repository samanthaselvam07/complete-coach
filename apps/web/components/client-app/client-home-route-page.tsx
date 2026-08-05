"use client";

import { useSession } from "next-auth/react";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ClientHomePage } from "./client-home-page";
import { ClientOnboardingGate } from "./client-onboarding-gate";

export function ClientHomeRoutePage() {
  const { data: session } = useSession();

  if (session?.activeOrganization?.role === "client") {
    return (
      <ClientOnboardingGate>
        <ClientHomePage />
      </ClientOnboardingGate>
    );
  }

  return <DashboardPage />;
}
