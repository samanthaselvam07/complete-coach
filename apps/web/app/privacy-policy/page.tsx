import Link from "next/link";
import type { Route } from "next";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#fbf9f8] px-6 py-10 text-[#1b1c1c]">
      <article className="mx-auto max-w-3xl space-y-8">
        <Link href={"/profile" as Route} className="text-sm font-black text-[#3620b8]">
          Back to profile
        </Link>

        <header className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f87600]">Complete Coach</p>
          <h1 className="text-4xl font-black tracking-normal">Privacy Policy</h1>
          <p className="text-sm font-bold leading-7 text-[#777584]">Last updated 14 August 2026</p>
        </header>

        <section className="space-y-4 text-sm font-semibold leading-7 text-[#4f4d59]">
          <p>
            Complete Coach stores the account, coaching, billing, check-in, nutrition, training, supplement, calendar, and
            progress information needed to deliver your coaching experience.
          </p>
          <p>
            Your coach and authorised Complete Coach administrators can access the information required to support your
            programme. We do not sell your personal information.
          </p>
          <p>
            You can update your account details from your profile page. If you delete your account, your client portal
            access is removed while coaching records required for business, legal, safety, and audit purposes may be
            retained.
          </p>
          <p>
            For privacy questions, access requests, corrections, or data export requests, contact your coach or Complete
            Coach support.
          </p>
        </section>
      </article>
    </main>
  );
}
