import { ClientNotesPage } from "@/components/clients/client-notes-page";

interface ClientNotesRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClientNotesRoute({ params }: ClientNotesRouteProps) {
  const { id } = await params;

  return <ClientNotesPage clientId={id} />;
}
