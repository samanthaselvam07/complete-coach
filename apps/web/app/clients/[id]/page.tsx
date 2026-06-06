import { ClientProfilePage } from "@/components/clients/client-profile-page";

interface ClientProfileRouteProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    checkInId?: string;
  }>;
}

export default async function ClientProfileRoute({ params, searchParams }: ClientProfileRouteProps) {
  const { id } = await params;
  const { tab, checkInId } = await searchParams;

  return <ClientProfilePage clientId={id} initialTab={tab === "check-ins" ? "Check-Ins" : undefined} highlightedCheckInId={checkInId} />;
}
