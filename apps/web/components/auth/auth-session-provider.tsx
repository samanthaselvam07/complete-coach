"use client";

import { SessionProvider } from "next-auth/react";

import { isLocalDevAuthBypassEnabled, localDevelopmentSession } from "@/lib/auth/local-dev-session";

interface AuthSessionProviderProps {
  children: React.ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  if (isLocalDevAuthBypassEnabled()) {
    return (
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
        session={localDevelopmentSession}
      >
        {children}
      </SessionProvider>
    );
  }

  return <SessionProvider>{children}</SessionProvider>;
}
