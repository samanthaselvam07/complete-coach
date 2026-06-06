import { CheckInDetailPage } from "@/components/check-ins/check-in-detail-page";

interface ClientCheckInDetailRouteProps {
  params: Promise<{ id: string; checkInId: string }>;
  searchParams: Promise<{ compare?: string }>;
}

export default async function ClientCheckInDetailRoute({
  params,
  searchParams
}: ClientCheckInDetailRouteProps) {
  const { id, checkInId } = await params;
  const { compare } = await searchParams;

  return <CheckInDetailPage clientId={id} checkInId={checkInId} compare={compare} />;
}
