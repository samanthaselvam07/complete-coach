"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardCheck, Dumbbell, Home, Package, Utensils } from "lucide-react";

import { cn } from "@/components/ui/utils";

interface ClientMobileShellProps {
  children: React.ReactNode;
  title?: string;
  kicker?: string;
  avatarLabel?: string;
  hideBottomNav?: boolean;
}

const clientNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/vault", label: "Vault", icon: Package },
  { href: "/check-in", label: "Check-in", icon: ClipboardCheck }
] as const;

export function ClientMobileShell({
  children,
  title = "Complete Coach",
  kicker,
  avatarLabel = "CC",
  hideBottomNav = false
}: ClientMobileShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
      <header className="fixed inset-x-0 top-0 z-40 bg-white/72 shadow-[0_10px_30px_rgba(27,28,28,0.04)] backdrop-blur-2xl">
        <div className="mx-auto flex h-20 w-full max-w-xl items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#3620b8] to-[#f87600] text-xs font-black text-white shadow-[0_14px_34px_rgba(54,32,184,0.22)]">
              {avatarLabel.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              {kicker ? (
                <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[#f87600]">
                  {kicker}
                </p>
              ) : null}
              <p className="truncate text-xl font-black italic tracking-normal text-[#1b1c1c]">{title}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="inline-flex size-11 items-center justify-center rounded-full text-[#777584] transition active:scale-95"
          >
            <Bell aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-6 pb-32 pt-28">{children}</div>

      {!hideBottomNav ? (
        <nav
          aria-label="Client app navigation"
          className="fixed inset-x-0 bottom-6 z-40 mx-auto flex h-20 w-[92%] max-w-xl items-center justify-around rounded-[2rem] bg-white/76 px-4 shadow-[0_20px_50px_rgba(27,28,28,0.12)] backdrop-blur-2xl"
        >
          {clientNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wide transition",
                  active ? "text-[#3620b8]" : "text-[#9a99a4]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-full transition",
                    active ? "bg-gradient-to-br from-[#5f50f0] to-[#3620b8] text-white shadow-[0_12px_30px_rgba(54,32,184,0.30)]" : "text-[#9a99a4]"
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </main>
  );
}

export function ClientSectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="space-y-2">
      {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f87600]">{eyebrow}</p> : null}
      <div>
        <h1 className="text-4xl font-black tracking-normal text-[#1b1c1c]">{title}</h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-[#3620b8]" />
      </div>
      {children}
    </header>
  );
}
