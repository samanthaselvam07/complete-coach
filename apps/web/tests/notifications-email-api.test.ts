import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailDeliveryStatus } from "@/app/generated/prisma/enums";
import { POST as handleResendWebhook } from "@/app/api/webhooks/resend/route";
import { GET as getNotifications } from "@/app/api/v1/notifications/route";
import { POST as markAllNotificationsRead } from "@/app/api/v1/notifications/read/route";
import { POST as markNotificationRead } from "@/app/api/v1/notifications/[notificationId]/read/route";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  buildNotificationWhere,
  getResendRecipient,
  mapResendEventToStatus,
  serializeNotification,
  verifyResendWebhookSignature
} from "@/lib/operations/notification-records";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    emailDelivery: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    organizationSenderDomain: {
      findFirst: vi.fn()
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
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

const notificationRecord = {
  id: "notification_1",
  organizationId: "org_1",
  recipientUserId: "user_1",
  recipientClientId: null,
  type: "message",
  title: "New Message",
  body: "Sarah replied to your check-in note",
  entityType: "message",
  entityId: "message_1",
  readAt: null,
  createdAt: now
};

const emailDeliveryRecord = {
  id: "email_delivery_1",
  organizationId: "org_1",
  notificationId: "notification_1",
  provider: "resend",
  providerEmailId: null,
  toEmail: "client@example.com",
  subject: "New message from your coach",
  status: EmailDeliveryStatus.QUEUED,
  eventType: null,
  errorMessage: null,
  metadata: null,
  createdAt: now,
  updatedAt: now
};

describe("notification APIs and Resend email workflows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_WEBHOOK_SECRET;
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.emailDelivery.create.mockReset();
    mocks.prisma.emailDelivery.findFirst.mockReset();
    mocks.prisma.emailDelivery.update.mockReset();
    mocks.prisma.organizationSenderDomain.findFirst.mockReset();
    mocks.prisma.notification.findMany.mockReset();
    mocks.prisma.notification.findFirst.mockReset();
    mocks.prisma.notification.update.mockReset();
    mocks.prisma.notification.updateMany.mockReset();
  });

  it("lists current-user notifications with unread filtering", async () => {
    mocks.prisma.notification.findMany.mockResolvedValue([notificationRecord]);

    const response = await getNotifications(
      new Request("http://test.local/api/v1/notifications?unreadOnly=true&limit=10")
    );
    const payload = (await response.json()) as { data: Array<{ id: string; unread: boolean }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ id: "notification_1", unread: true })]);
    expect(mocks.prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          recipientUserId: "user_1",
          readAt: null
        },
        take: 10
      })
    );
  });

  it("marks one scoped notification as read", async () => {
    mocks.prisma.notification.findFirst.mockResolvedValue(notificationRecord);
    mocks.prisma.notification.update.mockResolvedValue({ ...notificationRecord, readAt: now });

    const response = await markNotificationRead(
      new Request("http://test.local/api/v1/notifications/notification_1/read", { method: "POST" }),
      { params: Promise.resolve({ notificationId: "notification_1" }) }
    );
    const payload = (await response.json()) as { data: { unread: boolean; readAt: string } };

    expect(response.status).toBe(200);
    expect(payload.data.unread).toBe(false);
    expect(mocks.prisma.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "notification_1",
          organizationId: "org_1",
          recipientUserId: "user_1"
        }
      })
    );
    expect(mocks.prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notification_1" },
        data: expect.objectContaining({ readAt: expect.any(Date) })
      })
    );
  });

  it("marks all current-user notifications as read", async () => {
    mocks.prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const response = await markAllNotificationsRead();
    const payload = (await response.json()) as { data: { updatedCount: number } };

    expect(response.status).toBe(200);
    expect(payload.data.updatedCount).toBe(3);
    expect(mocks.prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          recipientUserId: "user_1",
          readAt: null
        },
        data: expect.objectContaining({ readAt: expect.any(Date) })
      })
    );
  });

  it("records queued and sent statuses when Resend accepts an email", async () => {
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.RESEND_FROM_EMAIL = "Complete Coach <noreply@example.com>";
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue(null);
    mocks.prisma.emailDelivery.create.mockResolvedValue(emailDeliveryRecord);
    mocks.prisma.emailDelivery.update.mockResolvedValue({
      ...emailDeliveryRecord,
      providerEmailId: "resend_email_1",
      status: EmailDeliveryStatus.SENT,
      eventType: "email.sent"
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "resend_email_1" }), { status: 200 })
    );

    const delivery = await sendTransactionalEmail({
      organizationId: "org_1",
      notificationId: "notification_1",
      toEmail: "client@example.com",
      subject: "New message from your coach",
      text: "You have a new message.",
      metadata: { template: "new-message" }
    });

    expect(delivery.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test_resend_key" }),
        body: expect.stringContaining("email_delivery_id")
      })
    );
    expect(mocks.prisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryStatus.QUEUED,
          subject: "New message from your coach"
        })
      })
    );
    expect(mocks.prisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryStatus.SENT,
          providerEmailId: "resend_email_1"
        })
      })
    );
  });

  it("uses a verified organization sender domain when sending Resend emails", async () => {
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.RESEND_FROM_EMAIL = "Complete Coach <noreply@example.com>";
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue({
      id: "sender_domain_1",
      domain: "mail.example.com",
      fromLocalPart: "coach",
      senderName: "Example Coaching"
    });
    mocks.prisma.emailDelivery.create.mockResolvedValue(emailDeliveryRecord);
    mocks.prisma.emailDelivery.update.mockResolvedValue({
      ...emailDeliveryRecord,
      providerEmailId: "resend_email_1",
      status: EmailDeliveryStatus.SENT,
      eventType: "email.sent"
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "resend_email_1" }), { status: 200 })
    );

    await sendTransactionalEmail({
      organizationId: "org_1",
      toEmail: "client@example.com",
      subject: "New message from your coach",
      text: "You have a new message."
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: expect.stringContaining("\"from\":\"Example Coaching <coach@mail.example.com>\"")
      })
    );
    expect(mocks.prisma.organizationSenderDomain.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          provider: "resend",
          status: "verified"
        }
      })
    );
  });

  it("records failed status without leaking email body when Resend rejects an email", async () => {
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.RESEND_FROM_EMAIL = "Complete Coach <noreply@example.com>";
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue(null);
    mocks.prisma.emailDelivery.create.mockResolvedValue(emailDeliveryRecord);
    mocks.prisma.emailDelivery.update.mockResolvedValue({
      ...emailDeliveryRecord,
      status: EmailDeliveryStatus.FAILED,
      eventType: "email.failed",
      errorMessage: "Resend send failed with status 500."
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("provider unavailable", { status: 500 }));

    const delivery = await sendTransactionalEmail({
      organizationId: "org_1",
      toEmail: "client@example.com",
      subject: "New message from your coach",
      text: "Sensitive email body should not be persisted."
    });

    expect(delivery.status).toBe("failed");
    expect(mocks.prisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        data: expect.objectContaining({ text: expect.any(String), html: expect.any(String) })
      })
    );
    expect(mocks.prisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryStatus.FAILED,
          errorMessage: "Resend send failed with status 500."
        })
      })
    );
  });

  it("records failed status when Resend configuration is missing", async () => {
    mocks.prisma.emailDelivery.create.mockResolvedValue(emailDeliveryRecord);
    mocks.prisma.emailDelivery.update.mockResolvedValue({
      ...emailDeliveryRecord,
      status: EmailDeliveryStatus.FAILED,
      eventType: "configuration_missing",
      errorMessage: "Resend is not configured."
    });

    const delivery = await sendTransactionalEmail({
      organizationId: "org_1",
      toEmail: "client@example.com",
      subject: "New message from your coach",
      text: "You have a new message."
    });

    expect(delivery.status).toBe("failed");
    expect(mocks.prisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryStatus.FAILED,
          eventType: "configuration_missing"
        })
      })
    );
  });

  it("persists Resend webhook delivery events against an existing delivery", async () => {
    mocks.prisma.emailDelivery.findFirst.mockResolvedValue({
      ...emailDeliveryRecord,
      providerEmailId: "resend_email_1"
    });
    mocks.prisma.emailDelivery.update.mockResolvedValue({
      ...emailDeliveryRecord,
      providerEmailId: "resend_email_1",
      status: EmailDeliveryStatus.DELIVERED,
      eventType: "email.delivered"
    });
    const body = JSON.stringify({
      type: "email.delivered",
      created_at: "2026-05-18T00:00:00.000Z",
      data: {
        email_id: "resend_email_1",
        to: "client@example.com",
        subject: "New message from your coach",
        tags: [
          { name: "organization_id", value: "org_1" },
          { name: "email_delivery_id", value: "email_delivery_1" }
        ]
      }
    });

    const response = await handleResendWebhook(
      new Request("http://test.local/api/webhooks/resend", { method: "POST", body })
    );
    const payload = (await response.json()) as { data: { status: string; eventType: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ status: "delivered", eventType: "email.delivered" });
    expect(mocks.prisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "email_delivery_1" },
        data: expect.objectContaining({
          providerEmailId: "resend_email_1",
          status: EmailDeliveryStatus.DELIVERED,
          eventType: "email.delivered"
        })
      })
    );
  });

  it("creates an email delivery from a matched Resend webhook when no existing delivery is found", async () => {
    mocks.prisma.emailDelivery.findFirst.mockResolvedValue(null);
    mocks.prisma.emailDelivery.create.mockResolvedValue({
      ...emailDeliveryRecord,
      id: "email_delivery_created",
      providerEmailId: "resend_email_2",
      status: EmailDeliveryStatus.COMPLAINED,
      eventType: "email.complained",
      toEmail: "unknown@example.invalid",
      subject: "Unknown Resend email"
    });
    const body = JSON.stringify({
      type: "email.complained",
      data: {
        id: "resend_email_2",
        to: [],
        tags: [{ name: "organization_id", value: "org_1" }]
      }
    });

    const response = await handleResendWebhook(
      new Request("http://test.local/api/webhooks/resend", { method: "POST", body })
    );
    const payload = (await response.json()) as { data: { id: string; status: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({ id: "email_delivery_created", status: "complained" });
    expect(mocks.prisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          providerEmailId: "resend_email_2",
          toEmail: "unknown@example.invalid",
          subject: "Unknown Resend email",
          status: EmailDeliveryStatus.COMPLAINED
        })
      })
    );
  });

  it("acknowledges unmatched Resend webhook events without persistence", async () => {
    const body = JSON.stringify({
      type: "email.delivered",
      data: {}
    });

    const response = await handleResendWebhook(
      new Request("http://test.local/api/webhooks/resend", { method: "POST", body })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(202);
    expect(payload.error.code).toBe("unmatched_email_delivery");
    expect(mocks.prisma.emailDelivery.create).not.toHaveBeenCalled();
    expect(mocks.prisma.emailDelivery.update).not.toHaveBeenCalled();
  });

  it("rejects Resend webhooks with invalid configured signatures", async () => {
    process.env.RESEND_WEBHOOK_SECRET = "whsec_" + Buffer.from("test_secret").toString("base64");
    const body = JSON.stringify({ type: "email.delivered", data: { email_id: "resend_email_1" } });

    const response = await handleResendWebhook(
      new Request("http://test.local/api/webhooks/resend", {
        method: "POST",
        body,
        headers: {
          "svix-id": "msg_1",
          "svix-timestamp": "1777248000",
          "svix-signature": "v1,invalid"
        }
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.emailDelivery.update).not.toHaveBeenCalled();
  });

  it("accepts Resend webhooks with valid configured signatures", async () => {
    const secret = "test_secret";
    process.env.RESEND_WEBHOOK_SECRET = "whsec_" + Buffer.from(secret).toString("base64");
    const body = JSON.stringify({
      type: "email.bounced",
      data: {
        email_id: "resend_email_1",
        error: { message: "Mailbox unavailable" },
        tags: [{ name: "email_delivery_id", value: "email_delivery_1" }]
      }
    });
    const id = "msg_1";
    const timestamp = "1777248000";
    const signature = createHmac("sha256", Buffer.from(secret))
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");
    mocks.prisma.emailDelivery.findFirst.mockResolvedValue(emailDeliveryRecord);
    mocks.prisma.emailDelivery.update.mockResolvedValue({
      ...emailDeliveryRecord,
      providerEmailId: "resend_email_1",
      status: EmailDeliveryStatus.BOUNCED,
      eventType: "email.bounced",
      errorMessage: "Mailbox unavailable"
    });

    const response = await handleResendWebhook(
      new Request("http://test.local/api/webhooks/resend", {
        method: "POST",
        body,
        headers: {
          "svix-id": id,
          "svix-timestamp": timestamp,
          "svix-signature": `v1,${signature}`
        }
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryStatus.BOUNCED,
          errorMessage: "Mailbox unavailable"
        })
      })
    );
  });

  it("covers notification serialization and Resend signature helper branches", () => {
    const serialized = serializeNotification({
      ...notificationRecord,
      type: "unknown",
      body: null,
      readAt: "2026-05-18T01:00:00.000Z",
      createdAt: "2026-05-18T00:00:00.000Z"
    });
    const secret = "test_secret";
    const body = "{}";
    const id = "msg_2";
    const timestamp = "1777248000";
    const signature = createHmac("sha256", Buffer.from(secret))
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");

    expect(serialized).toMatchObject({
      type: "task",
      message: "",
      unread: false,
      readAt: "2026-05-18T01:00:00.000Z"
    });
    expect(buildNotificationWhere("org_1", "user_1", { unreadOnly: false, limit: 50 })).toEqual({
      organizationId: "org_1",
      recipientUserId: "user_1"
    });
    expect(getResendRecipient({ type: "email.sent", data: { to: "client@example.com" } })).toBe(
      "client@example.com"
    );
    expect(mapResendEventToStatus("email.sent")).toBe(EmailDeliveryStatus.SENT);
    expect(mapResendEventToStatus("email.failed")).toBe(EmailDeliveryStatus.FAILED);
    expect(mapResendEventToStatus("email.unknown")).toBe(EmailDeliveryStatus.SENT);
    expect(verifyResendWebhookSignature(body, new Headers(), `whsec_${Buffer.from(secret).toString("base64")}`)).toBe(
      false
    );
    expect(
      verifyResendWebhookSignature(
        body,
        new Headers({
          "svix-id": id,
          "svix-timestamp": timestamp,
          "svix-signature": `v1=${signature}`
        }),
        `whsec_${Buffer.from(secret).toString("base64")}`
      )
    ).toBe(true);
    expect(
      verifyResendWebhookSignature(
        body,
        new Headers({
          "svix-id": id,
          "svix-timestamp": timestamp,
          "svix-signature": "v1,"
        }),
        `whsec_${Buffer.from(secret).toString("base64")}`
      )
    ).toBe(false);
  });
});
