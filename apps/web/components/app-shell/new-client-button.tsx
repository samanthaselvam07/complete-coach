"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function NewClientButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
      onClick={() => router.push("/clients/new")}
    >
      <Plus className="mr-2 size-4" aria-hidden="true" />
      New Client
    </Button>
  );
}
