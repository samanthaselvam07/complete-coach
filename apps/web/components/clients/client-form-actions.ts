"use client";

import type { ClientFormOption, ClientFormState } from "./client-form-dialog";

const todayDate = () => new Date().toISOString().slice(0, 10);

export interface ClientProfileResponse {
  dateOfBirth?: string | null;
}

export interface AssignedClientPlanIds {
  trainingPlanIds: string[];
  nutritionPlanIds: string[];
  supplementationPlanIds: string[];
}

interface ClientPlanAssignmentResponse {
  templateId?: string | null;
  status?: string | null;
}

export async function fetchClientFormOptions(url: string): Promise<ClientFormOption[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data?: Array<{ id: string; name: string; currency?: string | null }> };

    return (payload.data ?? []).map((record) => ({
      value: record.id,
      label: record.name,
      currency: record.currency
    }));
  } catch {
    return [];
  }
}

export async function fetchAssignedClientPlanIds(clientId: string): Promise<AssignedClientPlanIds> {
  const [trainingPlanIds, nutritionPlanIds, supplementationPlanIds] = await Promise.all([
    fetchAssignedTemplateIds(`/api/v1/training-program-assignments?clientId=${encodeURIComponent(clientId)}&limit=100`),
    fetchAssignedTemplateIds(`/api/v1/meal-plan-assignments?clientId=${encodeURIComponent(clientId)}&limit=100`),
    fetchAssignedTemplateIds(`/api/v1/supplement-plan-assignments?clientId=${encodeURIComponent(clientId)}&limit=100`)
  ]);

  return {
    trainingPlanIds,
    nutritionPlanIds,
    supplementationPlanIds
  };
}

export async function updateClientProfile(clientId: string, form: ClientFormState) {
  if (!form.dateOfBirth) {
    return;
  }

  const response = await fetch(`/api/v1/clients/${clientId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dateOfBirth: form.dateOfBirth })
  });

  if (!response.ok) {
    throw new Error("Client profile could not be saved.");
  }
}

export async function assignSelectedClientPlans(clientId: string, form: ClientFormState) {
  const startsOn = form.planStartDate || todayDate();
  const assignedPlanIds = await fetchAssignedClientPlanIds(clientId);
  const assignmentRequests = [
    ...withoutExistingIds(form.trainingPlanIds, assignedPlanIds.trainingPlanIds).map((templateId) =>
      createPlanAssignment("/api/v1/training-program-assignments", clientId, templateId, startsOn)
    ),
    ...withoutExistingIds(form.nutritionPlanIds, assignedPlanIds.nutritionPlanIds).map((templateId) =>
      createPlanAssignment("/api/v1/meal-plan-assignments", clientId, templateId, startsOn)
    ),
    ...withoutExistingIds(form.supplementationPlanIds, assignedPlanIds.supplementationPlanIds).map((templateId) =>
      createPlanAssignment("/api/v1/supplement-plan-assignments", clientId, templateId, startsOn)
    )
  ];

  await Promise.all(assignmentRequests);
}

export async function scheduleAssignedPackagePaymentChange(form: ClientFormState) {
  const scheduledPrice = form.scheduledPaymentPrice ? Number(form.scheduledPaymentPrice) : undefined;
  const hasScheduledPaymentChange = form.scheduledPaymentPrice.trim() || form.scheduledPaymentStartsAt.trim();

  if (!hasScheduledPaymentChange) {
    return;
  }

  if (!form.packageId || scheduledPrice === undefined || !Number.isFinite(scheduledPrice) || scheduledPrice < 0 || !form.scheduledPaymentStartsAt) {
    throw new Error("Scheduled payment changes require an assigned package, price, and start date.");
  }

  const response = await fetch(`/api/v1/packages/${form.packageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scheduledPriceAmount: Math.round(scheduledPrice * 100),
      scheduledPriceCurrency: form.scheduledPaymentCurrency,
      scheduledPriceStartsAt: new Date(`${form.scheduledPaymentStartsAt}T00:00:00.000Z`).toISOString()
    })
  });

  if (!response.ok) {
    throw new Error("Scheduled payment change could not be saved.");
  }
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

async function createPlanAssignment(url: string, clientId: string, templateId: string, startsOn: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, templateId, startsOn })
  });

  if (!response.ok) {
    throw new Error("Client plan assignments could not be saved.");
  }
}

async function fetchAssignedTemplateIds(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data?: ClientPlanAssignmentResponse[] };

    return Array.from(
      new Set(
        (payload.data ?? [])
          .filter((assignment) => !assignment.status || !["completed", "cancelled"].includes(assignment.status))
          .map((assignment) => assignment.templateId)
          .filter((templateId): templateId is string => Boolean(templateId))
      )
    );
  } catch {
    return [];
  }
}

function withoutExistingIds(selectedIds: string[], existingIds: string[]) {
  const existingIdSet = new Set(existingIds);

  return selectedIds.filter((selectedId) => !existingIdSet.has(selectedId));
}
