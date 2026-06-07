import { z } from "zod";

import { TaskCategory, TaskPriority, TaskStatus } from "@/app/generated/prisma/enums";

export const taskCategoryValues = [
  "current-client-care",
  "new-client-onboarding",
  "social-media",
  "business-operations"
] as const;
export const taskPriorityValues = ["high", "medium", "low"] as const;
export const taskStatusValues = ["open", "completed", "cancelled"] as const;

export type ApiTaskCategory = (typeof taskCategoryValues)[number];
export type ApiTaskPriority = (typeof taskPriorityValues)[number];
export type ApiTaskStatus = (typeof taskStatusValues)[number];

const taskCategoryToPrisma: Record<ApiTaskCategory, TaskCategory> = {
  "current-client-care": TaskCategory.CURRENT_CLIENT_CARE,
  "new-client-onboarding": TaskCategory.NEW_CLIENT_ONBOARDING,
  "social-media": TaskCategory.SOCIAL_MEDIA,
  "business-operations": TaskCategory.BUSINESS_OPERATIONS
};

const taskCategoryFromPrisma: Record<TaskCategory, ApiTaskCategory> = {
  [TaskCategory.CURRENT_CLIENT_CARE]: "current-client-care",
  [TaskCategory.NEW_CLIENT_ONBOARDING]: "new-client-onboarding",
  [TaskCategory.SOCIAL_MEDIA]: "social-media",
  [TaskCategory.BUSINESS_OPERATIONS]: "business-operations"
};

const taskPriorityToPrisma: Record<ApiTaskPriority, TaskPriority> = {
  high: TaskPriority.HIGH,
  medium: TaskPriority.MEDIUM,
  low: TaskPriority.LOW
};

const taskPriorityFromPrisma: Record<TaskPriority, ApiTaskPriority> = {
  [TaskPriority.HIGH]: "high",
  [TaskPriority.MEDIUM]: "medium",
  [TaskPriority.LOW]: "low"
};

const taskStatusToPrisma: Record<ApiTaskStatus, TaskStatus> = {
  open: TaskStatus.OPEN,
  completed: TaskStatus.COMPLETED,
  cancelled: TaskStatus.CANCELLED
};

const taskStatusFromPrisma: Record<TaskStatus, ApiTaskStatus> = {
  [TaskStatus.OPEN]: "open",
  [TaskStatus.COMPLETED]: "completed",
  [TaskStatus.CANCELLED]: "cancelled"
};

export const conversationListQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createConversationSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(160).optional()
});

export const messageListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  attachmentObjectIds: z.array(z.string().trim().min(1).max(500)).max(10).default([])
});

export const taskListQuerySchema = z.object({
  category: z.enum(taskCategoryValues).optional(),
  status: z.enum(taskStatusValues).optional(),
  assignedUserId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(taskCategoryValues),
  priority: z.enum(taskPriorityValues).default("medium"),
  dueAt: z.string().datetime().optional(),
  assignedUserId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional()
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    status: z.enum(taskStatusValues).optional()
  })
  .refine((input) => Object.keys(input).length > 0, { message: "At least one field is required." });

export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

interface ConversationRecord {
  id: string;
  organizationId: string;
  clientId: string;
  title: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  client?: {
    firstName: string;
    lastName: string;
  };
  messages?: MessageRecord[];
}

interface MessageRecord {
  id: string;
  organizationId: string;
  conversationId: string;
  senderUserId: string | null;
  senderClientId: string | null;
  body: string;
  createdAt: Date | string;
  editedAt: Date | string | null;
  deletedAt: Date | string | null;
  attachments?: Array<{ id: string; objectId: string; createdAt: Date | string }>;
  receipts?: Array<{ id: string; userId: string | null; clientId: string | null; readAt: Date | string }>;
}

interface TaskRecord {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: Date | string | null;
  assignedUserId: string | null;
  clientId: string | null;
  createdByUserId: string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function buildConversationWhere(organizationId: string, query: ConversationListQuery) {
  return {
    organizationId,
    ...(query.clientId ? { clientId: query.clientId } : {})
  };
}

export function getConversationCreateData(organizationId: string, input: CreateConversationInput) {
  return {
    organizationId,
    clientId: input.clientId,
    title: input.title
  };
}

export function buildTaskWhere(organizationId: string, query: TaskListQuery) {
  return {
    organizationId,
    ...(query.category ? { category: taskCategoryToPrisma[query.category] } : {}),
    ...(query.status ? { status: taskStatusToPrisma[query.status] } : {}),
    ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {})
  };
}

export function getTaskCreateData(organizationId: string, userId: string, input: CreateTaskInput) {
  return {
    organizationId,
    title: input.title,
    description: input.description,
    category: taskCategoryToPrisma[input.category],
    priority: taskPriorityToPrisma[input.priority],
    dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    assignedUserId: input.assignedUserId,
    clientId: input.clientId,
    createdByUserId: userId
  };
}

export function getTaskUpdateData(input: UpdateTaskInput) {
  return {
    ...(input.title ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.category ? { category: taskCategoryToPrisma[input.category] } : {}),
    ...(input.priority ? { priority: taskPriorityToPrisma[input.priority] } : {}),
    ...(input.status ? { status: taskStatusToPrisma[input.status] } : {}),
    ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
    ...(input.assignedUserId !== undefined ? { assignedUserId: input.assignedUserId } : {}),
    ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
    ...(input.status === "completed" ? { completedAt: new Date() } : {}),
    ...(input.status && input.status !== "completed" ? { completedAt: null } : {})
  };
}

export function serializeConversation(record: ConversationRecord) {
  const latestMessage = record.messages?.[0] ?? null;

  return {
    id: record.id,
    clientId: record.clientId,
    clientName: record.client ? `${record.client.firstName} ${record.client.lastName}` : null,
    title: record.title,
    latestMessage: latestMessage ? serializeMessage(latestMessage) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeMessage(record: MessageRecord) {
  return {
    id: record.id,
    conversationId: record.conversationId,
    senderType: record.senderUserId ? "user" : "client",
    senderUserId: record.senderUserId,
    senderClientId: record.senderClientId,
    body: record.body,
    attachments: record.attachments?.map((attachment) => ({
      id: attachment.id,
      objectId: attachment.objectId,
      createdAt: toIsoString(attachment.createdAt)
    })) ?? [],
    receipts: record.receipts?.map((receipt) => ({
      id: receipt.id,
      userId: receipt.userId,
      clientId: receipt.clientId,
      readAt: toIsoString(receipt.readAt)
    })) ?? [],
    createdAt: toIsoString(record.createdAt),
    editedAt: record.editedAt ? toIsoString(record.editedAt) : null
  };
}

export function serializeTask(record: TaskRecord) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: taskCategoryFromPrisma[record.category],
    priority: taskPriorityFromPrisma[record.priority],
    status: taskStatusFromPrisma[record.status],
    dueAt: record.dueAt ? toIsoString(record.dueAt) : null,
    assignedUserId: record.assignedUserId,
    clientId: record.clientId,
    createdByUserId: record.createdByUserId,
    completedAt: record.completedAt ? toIsoString(record.completedAt) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
