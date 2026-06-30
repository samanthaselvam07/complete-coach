import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent } from "@/components/ui/card";
import { isLocalDevAuthBypassEnabled } from "@/lib/auth/local-dev-session";

export default function SignUpPage() {
  if (isLocalDevAuthBypassEnabled()) {
    redirect("/");
  }

  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl shadow-slate-950/5">
        <CardContent className="p-8">
          <h1 className="mb-8 text-center text-3xl font-black tracking-tight text-slate-950">Sign up</h1>
          <SignUpForm />
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/sign-in" className="font-bold text-indigo-700 hover:text-indigo-900">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
