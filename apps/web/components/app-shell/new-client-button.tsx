"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ClientFormDialog,
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState
} from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";
import type { ClientSummary } from "@/fixtures/clients";

export function NewClientButton() {
  const router = useRouter();
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);

  const openClientForm = () => {
    setClientForm(emptyClientForm);
    setClientFormError(null);
    setClientFormOpen(true);
  };

  const closeClientForm = () => {
    setClientFormOpen(false);
    setClientForm(emptyClientForm);
    setClientFormError(null);
  };

  const saveClient = async () => {
    setSavingClient(true);
    setClientFormError(null);

    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createClientMutationBody(clientForm))
      });

      if (!response.ok) {
        throw new Error("Client could not be saved.");
      }

      const payload = (await response.json()) as { data?: ClientSummary };

      closeClientForm();

      if (payload.data) {
        router.push(`/clients/${payload.data.id}`);
      }
    } catch {
      setClientFormError("Client could not be saved. Check the details and try again.");
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
        onClick={openClientForm}
      >
        <Plus className="mr-2 size-4" aria-hidden="true" />
        New Client
      </Button>

      {clientFormOpen ? (
        <ClientFormDialog
          editingClient={null}
          form={clientForm}
          error={clientFormError}
          saving={savingClient}
          onChange={(field, value) => setClientForm((currentForm) => ({ ...currentForm, [field]: value }))}
          onClose={closeClientForm}
          onSubmit={() => void saveClient()}
        />
      ) : null}
    </>
  );
}
