import type { Metadata } from "next";

import { WaitlistPage } from "@/components/waitlist/waitlist-page";

export const metadata: Metadata = {
  metadataBase: new URL("https://completecoach.fit"),
  title: "Complete Coach | Join the Waitlist",
  description:
    "Complete Coach is the AI-powered coaching OS for online fitness coaches. Join the waitlist for early access and founding member pricing.",
  openGraph: {
    title: "Complete Coach | Join the Waitlist",
    description:
      "Built by a coach, for coaches. Complete Coach helps you coach smarter, scale without burnout, and run your business from one place.",
    images: ["/og-image.png"]
  }
};

export default function WaitlistRoute() {
  return <WaitlistPage />;
}
