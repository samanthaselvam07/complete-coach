import { AcceptTeamInvitationPage } from "@/components/team/accept-team-invitation-page";

interface AcceptInvitationRouteProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitationRoute({
  searchParams
}: AcceptInvitationRouteProps) {
  const { token } = await searchParams;

  return <AcceptTeamInvitationPage token={token ?? null} />;
}
