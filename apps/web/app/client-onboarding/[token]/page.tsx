import { ClientOnboardingPage } from "@/components/clients/client-onboarding-page";

interface ClientOnboardingRouteProps {
  params: Promise<{ token: string }>;
}

export default async function ClientOnboardingRoute({ params }: ClientOnboardingRouteProps) {
  const { token } = await params;

  return <ClientOnboardingPage token={token} />;
}
