import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent } from "@/components/ui/card";
import { isLocalDevAuthBypassEnabled } from "@/lib/auth/local-dev-session";

interface SignInPageProps {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
  }>;
}

function getSafeCallbackUrl(value: string | string[] | undefined) {
  const callbackUrl = Array.isArray(value) ? value[0] : value;

  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/";
  }

  return callbackUrl;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  if (isLocalDevAuthBypassEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl);

  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl shadow-slate-950/5">
        <CardContent className="p-8">
          <h1 className="mb-8 text-center text-3xl font-black tracking-tight text-slate-950">Sign in</h1>
          <SignInForm callbackUrl={callbackUrl} />
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/sign-up" className="font-bold text-indigo-700 hover:text-indigo-900">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
