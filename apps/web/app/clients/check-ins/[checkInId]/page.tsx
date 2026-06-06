import { CheckInDetailPage } from "@/components/check-ins/check-in-detail-page";

interface ReviewCenterCheckInDetailRouteProps {
  params: Promise<{ checkInId: string }>;
  searchParams: Promise<{ compare?: string }>;
}

export default async function ReviewCenterCheckInDetailRoute({
  params,
  searchParams
}: ReviewCenterCheckInDetailRouteProps) {
  const { checkInId } = await params;
  const { compare } = await searchParams;

  return <CheckInDetailPage checkInId={checkInId} compare={compare === "previous"} />;
}
