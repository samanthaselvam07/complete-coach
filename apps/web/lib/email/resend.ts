import { EmailDeliveryStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildSenderFromAddress } from "@/lib/email/sender-domains";
import { serializeEmailDelivery } from "@/lib/operations/notification-records";

interface SendTransactionalEmailInput {
  organizationId: string;
  notificationId?: string;
  toEmail: string;
  fromEmail?: string;
  subject?: string;
  html?: string;
  text?: string;
  template?: {
    id: string;
    variables?: Record<string, string | number>;
  };
  metadata?: Prisma.InputJsonValue;
}

interface ResendEmailResponse {
  id?: string;
}

const resendApiUrl = "https://api.resend.com/emails";

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const queuedDelivery = await prisma.emailDelivery.create({
    data: {
      organizationId: input.organizationId,
      notificationId: input.notificationId,
      toEmail: input.toEmail,
      subject: input.subject ?? input.template?.id ?? "Transactional email",
      status: EmailDeliveryStatus.QUEUED,
      metadata: input.metadata
    }
  });

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = input.fromEmail ?? (await getTransactionalFromAddress(input.organizationId));

  if (!apiKey || !fromEmail) {
    const failedDelivery = await prisma.emailDelivery.update({
      where: { id: queuedDelivery.id, organizationId: input.organizationId },
      data: {
        status: EmailDeliveryStatus.FAILED,
        eventType: "configuration_missing",
        errorMessage: "Resend is not configured."
      }
    });

    return serializeEmailDelivery(failedDelivery);
  }

  try {
    const response = await fetch(resendApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: input.toEmail,
        ...(input.subject ? { subject: input.subject } : {}),
        ...(input.template ? { template: input.template } : { html: input.html, text: input.text }),
        tags: [
          { name: "organization_id", value: input.organizationId },
          { name: "email_delivery_id", value: queuedDelivery.id }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Resend send failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as ResendEmailResponse;
    const sentDelivery = await prisma.emailDelivery.update({
      where: { id: queuedDelivery.id, organizationId: input.organizationId },
      data: {
        status: EmailDeliveryStatus.SENT,
        providerEmailId: payload.id ?? null,
        eventType: "email.sent"
      }
    });

    return serializeEmailDelivery(sentDelivery);
  } catch (error) {
    const failedDelivery = await prisma.emailDelivery.update({
      where: { id: queuedDelivery.id, organizationId: input.organizationId },
      data: {
        status: EmailDeliveryStatus.FAILED,
        eventType: "email.failed",
        errorMessage: error instanceof Error ? error.message : "Resend send failed."
      }
    });

    return serializeEmailDelivery(failedDelivery);
  }
}

async function getTransactionalFromAddress(organizationId: string) {
  const configuredDomain = await prisma.organizationSenderDomain.findFirst({
    where: {
      organizationId,
      provider: "resend",
      status: "verified"
    },
    orderBy: [{ verifiedAt: "desc" }, { updatedAt: "desc" }]
  });

  return configuredDomain ? buildSenderFromAddress(configuredDomain) : process.env.RESEND_FROM_EMAIL;
}
