import { describe, expect, it } from "vitest";

import { TaskCategory, TaskPriority, TaskStatus } from "@/app/generated/prisma/enums";
import {
  buildConversationWhere,
  getTaskCreateData,
  buildTaskWhere,
  getTaskUpdateData,
  serializeConversation,
  serializeMessage,
  serializeTask
} from "@/lib/operations/operation-records";

const now = new Date("2026-05-18T00:00:00.000Z");

describe("operation record helpers", () => {
  it("builds optional conversation filters", () => {
    expect(buildConversationWhere("org_1", { clientId: "client_1", limit: 50 })).toEqual({
      organizationId: "org_1",
      clientId: "client_1"
    });
    expect(buildConversationWhere("org_1", { limit: 50 })).toEqual({
      organizationId: "org_1"
    });
  });

  it("builds task filters for every supported query dimension", () => {
    expect(
      buildTaskWhere("org_1", {
        category: "social-media",
        status: "completed",
        priority: "high",
        dueFrom: "2026-06-01T00:00:00.000Z",
        dueTo: "2026-06-30T23:59:59.999Z",
        assignedUserId: "user_1",
        clientId: "client_1",
        limit: 50
      })
    ).toEqual({
      organizationId: "org_1",
      category: TaskCategory.SOCIAL_MEDIA,
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      dueAt: {
        gte: new Date("2026-06-01T00:00:00.000Z"),
        lte: new Date("2026-06-30T23:59:59.999Z")
      },
      assignedUserId: "user_1",
      clientId: "client_1"
    });
    expect(buildTaskWhere("org_1", { limit: 50 })).toEqual({ organizationId: "org_1" });
  });

  it("maps new client onboarding tasks to the persisted enum", () => {
    expect(
      getTaskCreateData("org_1", "user_1", {
        title: "Send onboarding questionnaire",
        category: "new-client-onboarding",
        priority: "medium"
      })
    ).toEqual(
      expect.objectContaining({
        organizationId: "org_1",
        createdByUserId: "user_1",
        category: TaskCategory.NEW_CLIENT_ONBOARDING,
        priority: TaskPriority.MEDIUM
      })
    );
  });

  it("serializes conversations with and without optional related records", () => {
    expect(
      serializeConversation({
        id: "conversation_1",
        organizationId: "org_1",
        clientId: "client_1",
        title: null,
        createdAt: now,
        updatedAt: now
      })
    ).toEqual(
      expect.objectContaining({
        clientName: null,
        latestMessage: null,
        createdAt: "2026-05-18T00:00:00.000Z"
      })
    );
    expect(
      serializeConversation({
        id: "conversation_1",
        organizationId: "org_1",
        clientId: "client_1",
        title: "Sarah",
        createdAt: now,
        updatedAt: now,
        client: { firstName: "Sarah", lastName: "Johnson" },
        messages: [
          {
            id: "message_1",
            organizationId: "org_1",
            conversationId: "conversation_1",
            senderUserId: null,
            senderClientId: "client_1",
            body: "Client reply",
            createdAt: now,
            editedAt: now,
            deletedAt: null
          }
        ]
      })
    ).toEqual(
      expect.objectContaining({
        clientName: "Sarah Johnson",
        latestMessage: expect.objectContaining({ senderType: "client", editedAt: "2026-05-18T00:00:00.000Z" })
      })
    );
  });

  it("serializes messages and tasks with nullable fields", () => {
    expect(
      serializeMessage({
        id: "message_1",
        organizationId: "org_1",
        conversationId: "conversation_1",
        senderUserId: "user_1",
        senderClientId: null,
        body: "Coach note",
        createdAt: "2026-05-18T00:00:00.000Z",
        editedAt: null,
        deletedAt: null,
        attachments: undefined,
        receipts: undefined
      })
    ).toEqual(
      expect.objectContaining({
        senderType: "user",
        attachments: [],
        receipts: [],
        editedAt: null
      })
    );
    expect(
      serializeTask({
        id: "task_1",
        organizationId: "org_1",
        title: "Task",
        description: null,
        category: TaskCategory.BUSINESS_OPERATIONS,
        priority: TaskPriority.LOW,
        status: TaskStatus.CANCELLED,
        dueAt: null,
        assignedUserId: null,
        clientId: null,
        createdByUserId: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now
      })
    ).toEqual(
      expect.objectContaining({
        category: "business-operations",
        priority: "low",
        status: "cancelled",
        dueAt: null,
        completedAt: null
      })
    );
  });

  it("maps task update status transitions", () => {
    expect(getTaskUpdateData({ status: "completed" })).toEqual(
      expect.objectContaining({ status: TaskStatus.COMPLETED, completedAt: expect.any(Date) })
    );
    expect(getTaskUpdateData({ status: "open" })).toEqual({
      status: TaskStatus.OPEN,
      completedAt: null
    });
    expect(getTaskUpdateData({ dueAt: undefined, assignedUserId: undefined, clientId: undefined })).toEqual({});
  });
});
