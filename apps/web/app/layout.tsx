import type { Metadata } from "next";
import { DashboardShell } from "@/components/app-shell/dashboard-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Complete Coach",
  description: "Coaching operations platform",
  icons: {
    icon: "/brand/favicon.svg"
  }
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
