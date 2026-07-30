"use client";

import { ArrowLeft, ClipboardCheck, Package } from "lucide-react";
import Link from "next/link";

import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface ClientPlaceholderPageProps {
  type: "vault" | "check-in";
}

const placeholderContent = {
  vault: {
    title: "Vault",
    eyebrow: "Resources",
    body: "Coach resources, documents and saved education will live here.",
    icon: Package
  },
  "check-in": {
    title: "Check-in",
    eyebrow: "Coach feedback",
    body: "Daily and weekly check-ins will live here once the client check-in flow is connected.",
    icon: ClipboardCheck
  }
};

export function ClientPlaceholderPage({ type }: ClientPlaceholderPageProps) {
  const content = placeholderContent[type];
  const Icon = content.icon;

  return (
    <ClientMobileShell title="MCP" avatarLabel={content.title}>
      <div className="space-y-8">
        <ClientSectionHeading eyebrow={content.eyebrow} title={content.title} />

        <section className="rounded-[1.65rem] bg-white p-8 text-center shadow-[0_18px_45px_rgba(27,28,28,0.06)]">
          <div className="mx-auto flex size-16 items-center justify-center rounded-[1.25rem] bg-[#f5f3f3] text-[#3620b8]">
            <Icon aria-hidden="true" className="size-7" />
          </div>
          <p className="mt-6 text-sm font-semibold leading-6 text-[#777584]">{content.body}</p>
          <Link
            href="/"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#5f50f0] to-[#3620b8] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(54,32,184,0.22)]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back home
          </Link>
        </section>
      </div>
    </ClientMobileShell>
  );
}
