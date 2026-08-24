import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Complete Coach | AI Operating System for Online Fitness Coaches",
  description:
    "Complete Coach is the AI operating system for online fitness coaches. One place for everything, with intelligence that tells you where to look.",
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
      <body>{children}</body>
    </html>
  );
}
