import { NewClientIntakePage } from "@/components/clients/new-client-intake-page";

interface NewClientRouteProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewClientRoute({ searchParams }: NewClientRouteProps) {
  const params = (await searchParams) ?? {};

  return (
    <NewClientIntakePage
      initialForm={{
        firstName: getSearchParam(params.firstName),
        lastName: getSearchParam(params.lastName),
        email: getSearchParam(params.email),
        phone: getSearchParam(params.phone),
        dateOfBirth: getSearchParam(params.dateOfBirth)
      }}
    />
  );
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
