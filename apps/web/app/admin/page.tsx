import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PlatformAdminPage } from "@/components/admin/platform-admin-page";
import {
  PlatformAdminForbiddenError,
  requirePlatformAdmin
} from "@/lib/admin/platform-admin";
import { AuthenticationRequiredError } from "@/lib/auth/session-guards";

export default async function AdminRoute() {
  try {
    requirePlatformAdmin(await auth());
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in?callbackUrl=/admin");
    }

    if (error instanceof PlatformAdminForbiddenError) {
      return (
        <main className="min-h-screen bg-gray-50 p-8">
          <section className="mx-auto max-w-3xl rounded-xl border border-red-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-600">Admin access required</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">This area is restricted.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The Complete Coach platform admin console is only available to approved platform owner accounts.
            </p>
          </section>
        </main>
      );
    }

    throw error;
  }

  return <PlatformAdminPage />;
}
