"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
import { MessageMenu } from "./message-menu";
import { NewClientButton } from "./new-client-button";
import { NotificationMenu } from "./notification-menu";
import { SidebarNav } from "./sidebar-nav";
import { TopSearch } from "./top-search";
import { UserMenu } from "./user-menu";

interface DashboardShellProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = new Set(["/sign-in", "/sign-up"]);
const PUBLIC_PATH_PREFIXES = ["/forms/respond/"];

function isPublicPath(pathname: string | null) {
  return Boolean(pathname && (PUBLIC_PATHS.has(pathname) || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))));
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div role="status" aria-label="Opening Complete Coach workspace" className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-gray-950">Complete Coach</p>
            <p className="text-xs text-gray-500">Opening your workspace</p>
          </div>
        </div>
        <div className="space-y-3" aria-hidden="true">
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-100" />
          <div className="h-3 w-3/5 animate-pulse rounded-full bg-gray-100" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="h-14 animate-pulse rounded-xl bg-indigo-50" />
            <div className="h-14 animate-pulse rounded-xl bg-violet-50" />
            <div className="h-14 animate-pulse rounded-xl bg-orange-50" />
          </div>
        </div>
        <span className="sr-only">Opening Complete Coach workspace.</span>
      </div>
    </main>
  );
}

function DashboardShellContent({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const publicPath = isPublicPath(pathname);
  const clientSession = session?.activeOrganization?.role === "client";

  useEffect(() => {
    if (status === "unauthenticated" && !publicPath) {
      router.replace("/sign-in");
    }

    if (status === "authenticated" && publicPath) {
      router.replace("/");
    }
  }, [clientSession, pathname, publicPath, router, status]);

  if (publicPath && status !== "authenticated") {
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return <PublicLoadingScreen />;
  }

  if (clientSession) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-foreground">
      <SidebarNav currentPath={pathname} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between gap-4 border-b border-border bg-white/95 px-8 backdrop-blur">
          <TopSearch />
          <div className="flex items-center gap-3">
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
