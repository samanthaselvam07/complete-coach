import { SupplementProtocolBuilderPage } from "@/components/supplementation/supplement-protocol-builder-page";

interface EditSupplementProtocolPageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditSupplementProtocolPage({ params }: EditSupplementProtocolPageProps) {
  const { templateId } = await params;

  return <SupplementProtocolBuilderPage templateId={templateId} />;
}
