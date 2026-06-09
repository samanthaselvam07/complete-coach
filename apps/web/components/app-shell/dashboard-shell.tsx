"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
import { MessageMenu } from "./message-menu";
import { NewClientButton } from "./new-client-button";
import { NotificationMenu } from "./notification-menu";
import { ScheduleEventButton } from "./schedule-event-button";
import { SidebarNav } from "./sidebar-nav";
import { TopSearch } from "./top-search";
import { UserMenu } from "./user-menu";

interface DashboardShellProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = new Set(["/sign-in"]);

function isPublicPath(pathname: string | null) {
  return Boolean(pathname && PUBLIC_PATHS.has(pathname));
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <AuthSessionProvider>
      <DashboardShellContent>{children}</DashboardShellContent>
    </AuthSessionProvider>
  );
}

function PublicLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-sm font-medium text-slate-600">
      Loading secure workspace...
    </main>
  );
}

function DashboardShellContent({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (status === "unauthenticated" && !publicPath) {
      router.replace("/sign-in");
    }

    if (status === "authenticated" && publicPath) {
      router.replace("/");
    }
  }, [publicPath, router, status]);

  if (publicPath && status !== "authenticated") {
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return <PublicLoadingScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-foreground">
      <SidebarNav currentPath={pathname} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between gap-4 border-b border-border bg-white/95 px-8 backdrop-blur">
          <TopSearch />
          <div className="flex items-center gap-3">
            <ScheduleEventButton />
            <NewClientButton />
            <MessageMenu />
            <NotificationMenu />
            <UserMenu />
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
