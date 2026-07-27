import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskCategory, TaskPriority, TaskStatus } from "@/app/generated/prisma/enums";
import { GET as getConversations, POST as createConversation } from "@/app/api/v1/conversations/route";
import {
  GET as getConversationMessages,
  POST as createConversationMessage
} from "@/app/api/v1/conversations/[conversationId]/messages/route";
import { POST as createMessageAttachmentUploadUrl } from "@/app/api/v1/messages/attachment-upload-url/route";
import { POST as markMessageRead } from "@/app/api/v1/messages/[messageId]/read/route";
import { GET as getTasks, POST as createTask } from "@/app/api/v1/tasks/route";
import { PATCH as updateTask } from "@/app/api/v1/tasks/[taskId]/route";
import { POST as completeTask } from "@/app/api/v1/tasks/[taskId]/complete/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    client: { findFirst: vi.fn() },
    conversation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    messageReceipt: {
      upsert: vi.fn()
    },
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const now = new Date("2026-05-18T00:00:00.000Z");

const clientRecord = {
  id: "client_1",
  firstName: "Sarah",
  lastName: "Johnson"
};

const conversationRecord = {
  id: "conversation_1",
  organizationId: "org_1",
  clientId: "client_1",
  title: "Sarah Johnson",
  createdAt: now,
  updatedAt: now,
  client: {
    firstName: "Sarah",
    lastName: "Johnson"
  },
  messages: []
};

const messageRecord = {
  id: "message_1",
  organizationId: "org_1",
  conversationId: "conversation_1",
  senderUserId: "user_1",
  senderClientId: null,
  body: "Updated your check-in notes.",
  createdAt: now,
  editedAt: null,
  deletedAt: null,
  attachments: [
    {
      id: "attachment_1",
      objectId: "organizations/org_1/messages/attachments/00000000-0000-4000-8000-000000000000.pdf",
      createdAt: now
    }
  ],
  receipts: []
};

const taskRecord = {
  id: "task_1",
  organizationId: "org_1",
  title: "Review Sarah's check-in",
  description: "Use the latest form submission.",
  category: TaskCategory.CURRENT_CLIENT_CARE,
  priority: TaskPriority.HIGH,
  status: TaskStatus.OPEN,
  dueAt: now,
  assignedUserId: "user_1",
  clientId: "client_1",
  createdByUserId: "user_1",
  completedAt: null,
  createdAt: now,
  updatedAt: now
};

describe("operations persistence APIs", () => {
  beforeEach(() => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.conversation.create.mockReset();
    mocks.prisma.conversation.findMany.mockReset();
    mocks.prisma.conversation.findFirst.mockReset();
    mocks.prisma.conversation.update.mockReset();
    mocks.prisma.message.create.mockReset();
    mocks.prisma.message.findMany.mockReset();
    mocks.prisma.message.findFirst.mockReset();
    mocks.prisma.messageReceipt.upsert.mockReset();
    mocks.prisma.task.create.mockReset();
    mocks.prisma.task.findMany.mockReset();
    mocks.prisma.task.findFirst.mockReset();
    mocks.prisma.task.update.mockReset();
  });

  it("creates tenant-scoped conversations for accessible clients", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.conversation.findFirst.mockResolvedValue(null);
    mocks.prisma.conversation.create.mockResolvedValue(conversationRecord);

    const response = await createConversation(
      new Request("http://test.local/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", title: "Sarah Johnson" })
      })
    );
    const payload = (await response.json()) as { data: { id: string; clientName: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "conversation_1", clientName: "Sarah Johnson" }));
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "client_1", organizationId: "org_1", deletedAt: null })
      })
    );
    expect(mocks.prisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org_1", clientId: "client_1" })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "conversation.created" }) })
    );
  });

  it("reuses an existing tenant-scoped conversation for the client", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.conversation.findFirst.mockResolvedValue(conversationRecord);

    const response = await createConversation(
      new Request("http://test.local/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", title: "Sarah Johnson" })
      })
    );
    const payload = (await response.json()) as { data: { id: string; clientName: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ id: "conversation_1", clientName: "Sarah Johnson" }));
    expect(mocks.prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1", clientId: "client_1" })
      })
    );
    expect(mocks.prisma.conversation.create).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects conversation creation for inaccessible clients", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await createConversation(
      new Request("http://test.local/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({ clientId: "missing_client" })
      })
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: "not_found", message: "Client not found." });
    expect(mocks.prisma.conversation.create).not.toHaveBeenCalled();
  });

  it("lists tenant conversations with latest message summaries", async () => {
    mocks.prisma.conversation.findMany.mockResolvedValue([{ ...conversationRecord, messages: [messageRecord] }]);

    const response = await getConversations(new Request("http://test.local/api/v1/conversations?clientId=client_1"));
    const payload = (await response.json()) as { data: Array<{ latestMessage: { body: string } }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.latestMessage.body).toBe("Updated your check-in notes.");
    expect(mocks.prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1", clientId: "client_1" })
      })
    );
  });

  it("creates messages with attachment object references in scoped conversations", async () => {
    mocks.prisma.conversation.findFirst.mockResolvedValue(conversationRecord);
    mocks.prisma.message.create.mockResolvedValue(messageRecord);
    mocks.prisma.conversation.update.mockResolvedValue(conversationRecord);

    const response = await createConversationMessage(
      new Request("http://test.local/api/v1/conversations/conversation_1/messages", {
        method: "POST",
        body: JSON.stringify({
          body: "Updated your check-in notes.",
          attachmentObjectIds: ["organizations/org_1/messages/attachments/00000000-0000-4000-8000-000000000000.pdf"]
        })
      }),
      { params: Promise.resolve({ conversationId: "conversation_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; attachments: Array<{ objectId: string }> } };

    expect(response.status).toBe(201);
    expect(payload.data.attachments).toEqual([
      expect.objectContaining({
        objectId: "organizations/org_1/messages/attachments/00000000-0000-4000-8000-000000000000.pdf"
      })
    ]);
    expect(mocks.prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          conversationId: "conversation_1",
          senderUserId: "user_1",
          body: "Updated your check-in notes."
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "message.created",
          metadata: expect.objectContaining({ attachmentCount: 1 })
        })
      })
    );
  });

  it("rejects message attachments outside the active organization upload path", async () => {
    mocks.prisma.conversation.findFirst.mockResolvedValue(conversationRecord);

    const response = await createConversationMessage(
      new Request("http://test.local/api/v1/conversations/conversation_1/messages", {
        method: "POST",
        body: JSON.stringify({
          body: "Updated your check-in notes.",
          attachmentObjectIds: ["organizations/other_org/messages/attachments/00000000-0000-4000-8000-000000000000.pdf"]
        })
      }),
      { params: Promise.resolve({ conversationId: "conversation_1" }) }
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(422);
    expect(payload.error).toMatchObject({
      code: "invalid_attachment",
      message: "Invalid message attachment object key for active organization."
    });
    expect(mocks.prisma.message.create).not.toHaveBeenCalled();
  });

  it("creates scoped R2 upload URLs for message attachments", async () => {
    process.env.R2_ACCOUNT_ID = "account";
    process.env.R2_ACCESS_KEY_ID = "access";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET_NAME = "bucket";
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createMessageAttachmentUploadUrl(
      new Request("http://test.local/api/v1/messages/attachment-upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: "check-in.pdf",
          contentType: "application/pdf",
          byteSize: 1024,
          checksumSha256: "a".repeat(64)
        })
      })
    );
    const payload = (await response.json()) as {
      data: { objectKey: string; uploadUrl: string; method: string; requiredHeaders: Record<string, string> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.objectKey).toMatch(
      /^organizations\/org_1\/messages\/attachments\/[0-9a-f-]{36}\.pdf$/
    );
    expect(payload.data.uploadUrl).toContain("https://account.r2.cloudflarestorage.com/bucket/");
    expect(payload.data.method).toBe("PUT");
    expect(payload.data.requiredHeaders).toEqual({ "Content-Type": "application/pdf" });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "message_attachment.upload_url_created",
          targetId: payload.data.objectKey
        })
      })
    );
  });

  it("lists messages for scoped conversations only", async () => {
    mocks.prisma.conversation.findFirst.mockResolvedValue(conversationRecord);
    mocks.prisma.message.findMany.mockResolvedValue([messageRecord]);

    const response = await getConversationMessages(
      new Request("http://test.local/api/v1/conversations/conversation_1/messages"),
      { params: Promise.resolve({ conversationId: "conversation_1" }) }
    );
    const payload = (await response.json()) as { data: Array<{ id: string; body: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ id: "message_1", body: "Updated your check-in notes." })]);
    expect(mocks.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          conversationId: "conversation_1",
          deletedAt: null
        })
      })
    );
  });

  it("returns not found for inaccessible conversation messages", async () => {
    mocks.prisma.conversation.findFirst.mockResolvedValue(null);

    const response = await getConversationMessages(
      new Request("http://test.local/api/v1/conversations/missing/messages"),
      { params: Promise.resolve({ conversationId: "missing" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
    expect(mocks.prisma.message.findMany).not.toHaveBeenCalled();
  });

  it("marks a scoped message as read for the current user", async () => {
    mocks.prisma.message.findFirst.mockResolvedValue(messageRecord);
    mocks.prisma.messageReceipt.upsert.mockResolvedValue({
      id: "receipt_1",
      organizationId: "org_1",
      messageId: "message_1",
      userId: "user_1",
      clientId: null,
      readAt: now
    });

    const response = await markMessageRead(new Request("http://test.local/api/v1/messages/message_1/read"), {
      params: Promise.resolve({ messageId: "message_1" })
    });
    const payload = (await response.json()) as { data: { messageId: string; userId: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ messageId: "message_1", userId: "user_1" }));
    expect(mocks.prisma.messageReceipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { messageId_userId: { messageId: "message_1", userId: "user_1" } }
      })
    );
  });

  it("returns not found when marking an inaccessible message read", async () => {
    mocks.prisma.message.findFirst.mockResolvedValue(null);

    const response = await markMessageRead(new Request("http://test.local/api/v1/messages/missing/read"), {
      params: Promise.resolve({ messageId: "missing" })
    });

    expect(response.status).toBe(404);
    expect(mocks.prisma.messageReceipt.upsert).not.toHaveBeenCalled();
  });

  it("creates and lists tenant tasks", async () => {
    mocks.prisma.task.create.mockResolvedValue(taskRecord);
    mocks.prisma.task.findMany.mockResolvedValue([taskRecord]);

    const createResponse = await createTask(
      new Request("http://test.local/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "Review Sarah's check-in",
          description: "Use the latest form submission.",
          category: "current-client-care",
          priority: "high",
          dueAt: "2026-05-18T00:00:00.000Z",
          assignedUserId: "user_1",
          clientId: "client_1"
        })
      })
    );
    const listResponse = await getTasks(
      new Request(
        "http://test.local/api/v1/tasks?status=open&priority=high&dueFrom=2026-05-01T00:00:00.000Z&dueTo=2026-05-31T23:59:59.999Z"
      )
    );
    const listPayload = (await listResponse.json()) as { data: Array<{ id: string; category: string }> };

    expect(createResponse.status).toBe(201);
    expect(listResponse.status).toBe(200);
    expect(listPayload.data).toEqual([expect.objectContaining({ id: "task_1", category: "current-client-care" })]);
    expect(mocks.prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          createdByUserId: "user_1",
          category: TaskCategory.CURRENT_CLIENT_CARE,
          priority: TaskPriority.HIGH
        })
      })
    );
    expect(mocks.prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          priority: TaskPriority.HIGH,
          dueAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lte: new Date("2026-05-31T23:59:59.999Z")
          }
        }),
        orderBy: [{ status: "asc" }, { dueAt: "asc" }, { priority: "asc" }, { createdAt: "desc" }]
      })
    );
  });

  it("updates and completes scoped tasks", async () => {
    const updatedTask = { ...taskRecord, title: "Review Sarah's updated check-in" };
    const completedTask = { ...taskRecord, status: TaskStatus.COMPLETED, completedAt: now };
    mocks.prisma.task.findFirst.mockResolvedValue(taskRecord);
    mocks.prisma.task.update.mockResolvedValueOnce(updatedTask).mockResolvedValueOnce(completedTask);

    const updateResponse = await updateTask(
      new Request("http://test.local/api/v1/tasks/task_1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Review Sarah's updated check-in" })
      }),
      { params: Promise.resolve({ taskId: "task_1" }) }
    );
    const completeResponse = await completeTask(new Request("http://test.local/api/v1/tasks/task_1/complete"), {
      params: Promise.resolve({ taskId: "task_1" })
    });

    expect(updateResponse.status).toBe(200);
    expect(completeResponse.status).toBe(200);
    expect(mocks.prisma.task.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "task_1", organizationId: "org_1" },
        data: expect.objectContaining({ status: TaskStatus.COMPLETED })
      })
    );
  });

  it("returns not found when updating inaccessible tasks", async () => {
    mocks.prisma.task.findFirst.mockResolvedValue(null);

    const response = await updateTask(
      new Request("http://test.local/api/v1/tasks/missing", {
        method: "PATCH",
        body: JSON.stringify({ title: "No access" })
      }),
      { params: Promise.resolve({ taskId: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.task.update).not.toHaveBeenCalled();
  });

  it("rejects invalid task payloads before persistence", async () => {
    const response = await createTask(
      new Request("http://test.local/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "",
          category: "unknown"
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.task.create).not.toHaveBeenCalled();
  });
});
