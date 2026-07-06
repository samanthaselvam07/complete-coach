import { PublicFormResponse } from "@/components/forms/public-form-response";

interface PublicFormResponseRouteProps {
  params: Promise<{ shareSlug: string }>;
}

export default async function PublicFormResponseRoute({ params }: PublicFormResponseRouteProps) {
  const { shareSlug } = await params;

  return <PublicFormResponse shareSlug={shareSlug} />;
}
