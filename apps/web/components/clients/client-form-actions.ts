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

export interface AssignedClientFormIds {
  initialQuestionnaire: string;
  dailyHabitForm: string;
  checkInForm: string;
}

interface ClientPlanAssignmentResponse {
  templateId?: string | null;
  status?: string | null;
}

interface ClientFormAssignmentResponse {
  formId?: string | null;
  formType?: string | null;
  status?: string | null;
}

interface ClientFormOptionResponse {
  id: string;
  name: string;
  type?: string | null;
  currency?: string | null;
}

export async function fetchClientFormOptions(url: string): Promise<ClientFormOption[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data?: ClientFormOptionResponse[] };

    return toClientFormOptions(payload.data ?? []);
  } catch {
    return [];
  }
}

export async function fetchPublishedClientFormsByType() {
  const [
    initialQuestionnaireOptions,
    dailyHabitFormOptions,
    checkInFormOptions
  ] = await Promise.all([
    fetchClientFormOptionsFromUrls([
      "/api/v1/forms?type=intake&status=published&limit=100",
      "/api/v1/forms?type=application&status=published&limit=100",
      "/api/v1/forms?type=contact&status=published&limit=100",
      "/api/v1/forms?type=terms-and-conditions&status=published&limit=100"
    ]),
    fetchClientFormOptions("/api/v1/forms?type=habit-tracker&status=published&limit=100"),
    fetchClientFormOptions("/api/v1/forms?type=check-in&status=published&limit=100")
  ]);

  return {
    initialQuestionnaireOptions,
    dailyHabitFormOptions,
    checkInFormOptions
  };
}

export async function fetchClientFormOptionsFromUrls(urls: string[]): Promise<ClientFormOption[]> {
  const optionGroups = await Promise.all(urls.map((url) => fetchClientFormOptions(url)));
  const optionsById = new Map<string, ClientFormOption>();

  optionGroups.flat().forEach((option) => {
    if (!optionsById.has(option.value)) {
      optionsById.set(option.value, option);
    }
  });

  return Array.from(optionsById.values());
}

export async function fetchAssignedClientFormIds(clientId: string): Promise<AssignedClientFormIds> {
  try {
    const response = await fetch(`/api/v1/form-assignments?clientId=${encodeURIComponent(clientId)}&limit=100`);

    if (!response.ok) {
      return emptyAssignedClientFormIds();
    }

    const payload = (await response.json()) as { data?: ClientFormAssignmentResponse[] };
    const activeAssignments = (payload.data ?? []).filter(
      (assignment) => !assignment.status || !["completed", "cancelled"].includes(assignment.status)
    );

    return {
      initialQuestionnaire: findAssignedFormByTypes(activeAssignments, ["intake", "application", "contact", "terms-and-conditions"]),
      dailyHabitForm: findAssignedFormByTypes(activeAssignments, ["habit-tracker"]),
      checkInForm: findAssignedFormByTypes(activeAssignments, ["check-in"])
    };
  } catch {
    return emptyAssignedClientFormIds();
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

export async function assignSelectedClientForms(clientId: string, form: ClientFormState) {
  const assignedFormIds = await fetchAssignedClientFormIds(clientId);
  const assignmentRequests = [
    ...withoutExistingIds([form.initialQuestionnaire].filter(Boolean), [assignedFormIds.initialQuestionnaire]).map((formId) =>
      createFormAssignment(formId, clientId)
    ),
    ...withoutExistingIds([form.dailyHabitForm].filter(Boolean), [assignedFormIds.dailyHabitForm]).map((formId) =>
      createFormAssignment(formId, clientId)
    ),
    ...withoutExistingIds([form.checkInForm].filter(Boolean), [assignedFormIds.checkInForm]).map((formId) =>
      createFormAssignment(formId, clientId)
    )
  ];

  await Promise.all(assignmentRequests);
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
  const trainingPlanIds = withoutExistingIds(form.trainingPlanIds, assignedPlanIds.trainingPlanIds);
  const nutritionPlanIds = withoutExistingIds(form.nutritionPlanIds, assignedPlanIds.nutritionPlanIds);
  const supplementationPlanIds = withoutExistingIds(form.supplementationPlanIds, assignedPlanIds.supplementationPlanIds);
  const assignmentRequests = [
    ...trainingPlanIds.map((templateId) =>
      createPlanAssignment("/api/v1/training-program-assignments", clientId, templateId, startsOn)
    ),
    ...nutritionPlanIds.map((templateId) =>
      createPlanAssignment("/api/v1/meal-plan-assignments", clientId, templateId, startsOn)
    ),
    ...supplementationPlanIds.map((templateId) =>
      createPlanAssignment("/api/v1/supplement-plan-assignments", clientId, templateId, startsOn)
    )
  ];

  await Promise.all(assignmentRequests);

  return { trainingPlanIds, nutritionPlanIds, supplementationPlanIds };
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

async function createFormAssignment(formId: string, clientId: string) {
  const response = await fetch(`/api/v1/forms/${formId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId })
  });

  if (!response.ok) {
    throw new Error("Client form assignments could not be saved.");
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

function findAssignedFormByTypes(assignments: ClientFormAssignmentResponse[], formTypes: string[]) {
  return assignments.find((assignment) => assignment.formId && assignment.formType && formTypes.includes(assignment.formType))?.formId ?? "";
}

function toClientFormOptions(records: ClientFormOptionResponse[]): ClientFormOption[] {
  return records.map((record) => ({
    value: record.id,
    label: record.name,
    currency: record.currency
  }));
}

function emptyAssignedClientFormIds(): AssignedClientFormIds {
  return {
    initialQuestionnaire: "",
    dailyHabitForm: "",
    checkInForm: ""
  };
}
