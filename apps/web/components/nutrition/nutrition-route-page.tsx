"use client";

import { useSession } from "next-auth/react";

import { ClientNutritionPage } from "@/components/client-app/client-nutrition-page";
import { NutritionPage } from "@/components/nutrition/nutrition-page";

export function NutritionRoutePage() {
  const { data: session } = useSession();

  if (session?.activeOrganization?.role === "client") {
    return <ClientNutritionPage />;
  }

  return <NutritionPage />;
}
