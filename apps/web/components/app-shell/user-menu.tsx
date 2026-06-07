"use client";

import { Building2, CreditCard, LogOut, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "Coach";
  const words = source.split(/[\s@.]+/).filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function UserMenu() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  if (status !== "authenticated" || !session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild className="rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  const userLabel = session.user.name || session.user.email || "Signed-in coach";
  const organizationLabel = session.activeOrganization
    ? `${session.activeOrganization.name} · ${session.activeOrganization.role}`
    : "No active organization";
  const initials = getInitials(session.user.name, session.user.email);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={menuOpen}
        aria-controls="account-menu"
        aria-label={`Open account menu for ${userLabel}`}
        className="size-11 rounded-full border border-border bg-white p-0 shadow-sm hover:bg-slate-50"
        onClick={() => {
          setMenuOpen((open) => !open);
        }}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {initials}
        </span>
      </Button>

      {menuOpen ? (
        <section
          id="account-menu"
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950">{userLabel}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {session.user.email || organizationLabel}
              </span>
            </span>
          </div>

          <div className="mb-2 rounded-xl border border-border p-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Building2 className="size-3.5" aria-hidden="true" />
              Workspace
            </span>
            <span className="mt-1 block truncate text-sm font-medium text-slate-900">
              {organizationLabel}
            </span>
          </div>

          <div className="space-y-1">
            <Link
              href="/team-management"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              <UsersRound className="size-4 text-slate-500" aria-hidden="true" />
              Team management
            </Link>
            <Link
              href={"/organization-settings" as Route}
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              <CreditCard className="size-4 text-slate-500" aria-hidden="true" />
              Subscription and billing
            </Link>
          </div>

          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
              onClick={() => {
                void signOut({ redirectTo: "/sign-in" });
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
