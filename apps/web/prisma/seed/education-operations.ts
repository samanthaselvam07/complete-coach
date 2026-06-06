import {
  EducationResourceAssignmentStatus,
  EducationResourceType,
  EducationResourceVisibility,
  EmailDeliveryStatus,
  LibraryScope,
  PrismaClient,
  SupplementPlanAssignmentStatus,
  SupplementPlanTemplateStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus
} from "../../app/generated/prisma/client";
import { clients } from "../../fixtures/clients";

export async function seedEducationSupplementationFoundation(prisma: PrismaClient, organizationId: string, userId: string) {
  const demoClient = clients[0];

  if (!demoClient) {
    return;
  }

  const clientId = `demo-client-${demoClient.id}`;
  const educationResourceId = "demo-education-resource-recovery-basics";

  await prisma.educationResource.upsert({
    where: { id: educationResourceId },
    update: {
      title: "Recovery Basics",
      description: "Seeded education resource for sleep and recovery coaching.",
      category: "Recovery",
      resourceType: EducationResourceType.PDF,
      objectId: "organizations/complete-coach-demo/education/resources/pdf/recovery-basics.pdf",
      tags: ["sleep", "recovery"],
      visibility: EducationResourceVisibility.ASSIGNED,
      createdByUserId: userId
    },
    create: {
      id: educationResourceId,
      organizationId,
      title: "Recovery Basics",
      description: "Seeded education resource for sleep and recovery coaching.",
      category: "Recovery",
      resourceType: EducationResourceType.PDF,
      objectId: "organizations/complete-coach-demo/education/resources/pdf/recovery-basics.pdf",
      tags: ["sleep", "recovery"],
      visibility: EducationResourceVisibility.ASSIGNED,
      createdByUserId: userId
    }
  });

  await prisma.educationResourceAssignment.upsert({
    where: { id: "demo-education-assignment-recovery-basics" },
    update: {
      clientId,
      resourceId: educationResourceId,
      assignedByUserId: userId,
      status: EducationResourceAssignmentStatus.ASSIGNED
    },
    create: {
      id: "demo-education-assignment-recovery-basics",
      organizationId,
      clientId,
      resourceId: educationResourceId,
      assignedByUserId: userId,
      status: EducationResourceAssignmentStatus.ASSIGNED
    }
  });

  await prisma.supplementLibraryItem.upsert({
    where: { id: "global-supplement-creatine-monohydrate" },
    update: {
      organizationId: null,
      scope: LibraryScope.GLOBAL,
      name: "Creatine Monohydrate",
      category: "Performance",
      recommendedTiming: "Daily",
      dosage: "5g",
      bioavailabilityNotes: "Use monohydrate consistently with water.",
      clinicalDescription: "Supports repeated high-intensity efforts.",
      tags: ["strength", "performance"],
      createdByUserId: userId
    },
    create: {
      id: "global-supplement-creatine-monohydrate",
      organizationId: null,
      scope: LibraryScope.GLOBAL,
      name: "Creatine Monohydrate",
      category: "Performance",
      recommendedTiming: "Daily",
      dosage: "5g",
      bioavailabilityNotes: "Use monohydrate consistently with water.",
      clinicalDescription: "Supports repeated high-intensity efforts.",
      tags: ["strength", "performance"],
      createdByUserId: userId
    }
  });

  await prisma.supplementLibraryItem.upsert({
    where: { id: "demo-supplement-electrolytes" },
    update: {
      organizationId,
      scope: LibraryScope.PRIVATE,
      name: "Coach Electrolytes",
      category: "Hydration",
      recommendedTiming: "During training",
      dosage: "1 serve",
      bioavailabilityNotes: "Use sodium-heavy mix for high-sweat sessions.",
      clinicalDescription: "Supports endurance sessions and fluid replacement.",
      tags: ["hydration"],
      createdByUserId: userId
    },
    create: {
      id: "demo-supplement-electrolytes",
      organizationId,
      scope: LibraryScope.PRIVATE,
      name: "Coach Electrolytes",
      category: "Hydration",
      recommendedTiming: "During training",
      dosage: "1 serve",
      bioavailabilityNotes: "Use sodium-heavy mix for high-sweat sessions.",
      clinicalDescription: "Supports endurance sessions and fluid replacement.",
      tags: ["hydration"],
      createdByUserId: userId
    }
  });

  const supplementTemplateJson = {
    phases: [
      {
        name: "Training Day",
        supplements: [
          {
            supplementId: "demo-supplement-electrolytes",
            supplementName: "Coach Electrolytes",
            dosage: "1 serve",
            timing: "During training",
            notes: "Increase fluid intake on hot days."
          }
        ]
      }
    ]
  };
  const supplementTemplateId = "demo-supplement-template-hydration-support";

  await prisma.supplementPlanTemplate.upsert({
    where: { id: supplementTemplateId },
    update: {
      name: "Hydration Support",
      description: "Seeded supplement protocol for training day hydration.",
      status: SupplementPlanTemplateStatus.PUBLISHED,
      templateJson: supplementTemplateJson,
      createdByUserId: userId
    },
    create: {
      id: supplementTemplateId,
      organizationId,
      name: "Hydration Support",
      description: "Seeded supplement protocol for training day hydration.",
      status: SupplementPlanTemplateStatus.PUBLISHED,
      templateJson: supplementTemplateJson,
      createdByUserId: userId
    }
  });

  await prisma.supplementPlanAssignment.upsert({
    where: { id: "demo-supplement-assignment-hydration-support" },
    update: {
      clientId,
      templateId: supplementTemplateId,
      name: "Hydration Support",
      status: SupplementPlanAssignmentStatus.ACTIVE,
      snapshotJson: {
        templateId: supplementTemplateId,
        templateName: "Hydration Support",
        template: supplementTemplateJson
      }
    },
    create: {
      id: "demo-supplement-assignment-hydration-support",
      organizationId,
      clientId,
      templateId: supplementTemplateId,
      name: "Hydration Support",
      status: SupplementPlanAssignmentStatus.ACTIVE,
      startsOn: new Date("2026-06-03T00:00:00.000Z"),
      snapshotJson: {
        templateId: supplementTemplateId,
        templateName: "Hydration Support",
        template: supplementTemplateJson
      },
      createdByUserId: userId
    }
  });
}

export async function seedOperationsFoundation(prisma: PrismaClient, organizationId: string, userId: string) {
  const demoClient = clients[0];

  if (!demoClient) {
    return;
  }

  const clientId = `demo-client-${demoClient.id}`;
  const conversationId = "demo-conversation-sarah-johnson";
  const messageId = "demo-message-check-in-follow-up";
  const taskId = "demo-task-review-check-in";
  const notificationId = "demo-notification-new-message";
  const emailDeliveryId = "demo-email-delivery-new-message";

  await prisma.conversation.upsert({
    where: { id: conversationId },
    update: {
      clientId,
      title: "Sarah Johnson"
    },
    create: {
      id: conversationId,
      organizationId,
      clientId,
      title: "Sarah Johnson"
    }
  });

  await prisma.message.upsert({
    where: { id: messageId },
    update: {
      conversationId,
      senderUserId: userId,
      senderClientId: null,
      body: "I reviewed your check-in and added the next action to the dashboard."
    },
    create: {
      id: messageId,
      organizationId,
      conversationId,
      senderUserId: userId,
      body: "I reviewed your check-in and added the next action to the dashboard."
    }
  });

  await prisma.task.upsert({
    where: { id: taskId },
    update: {
      title: "Review Sarah Johnson's weekly check-in",
      description: "Seeded operations task for dashboard persistence.",
      category: TaskCategory.CURRENT_CLIENT_CARE,
      priority: TaskPriority.HIGH,
      status: TaskStatus.OPEN,
      assignedUserId: userId,
      clientId
    },
    create: {
      id: taskId,
      organizationId,
      title: "Review Sarah Johnson's weekly check-in",
      description: "Seeded operations task for dashboard persistence.",
      category: TaskCategory.CURRENT_CLIENT_CARE,
      priority: TaskPriority.HIGH,
      status: TaskStatus.OPEN,
      assignedUserId: userId,
      clientId,
      createdByUserId: userId
    }
  });

  await prisma.notification.upsert({
    where: { id: notificationId },
    update: {
      recipientUserId: userId,
      type: "message",
      title: "New Message",
      body: "Sarah Johnson has a seeded message ready for review.",
      entityType: "message",
      entityId: messageId,
      readAt: null
    },
    create: {
      id: notificationId,
      organizationId,
      recipientUserId: userId,
      type: "message",
      title: "New Message",
      body: "Sarah Johnson has a seeded message ready for review.",
      entityType: "message",
      entityId: messageId
    }
  });

  await prisma.emailDelivery.upsert({
    where: { id: emailDeliveryId },
    update: {
      notificationId,
      providerEmailId: "demo-resend-message-id",
      toEmail: "client@example.com",
      subject: "New message from your coach",
      status: EmailDeliveryStatus.DELIVERED,
      eventType: "email.delivered",
      errorMessage: null,
      metadata: { source: "seed", template: "new-message" }
    },
    create: {
      id: emailDeliveryId,
      organizationId,
      notificationId,
      providerEmailId: "demo-resend-message-id",
      toEmail: "client@example.com",
      subject: "New message from your coach",
      status: EmailDeliveryStatus.DELIVERED,
      eventType: "email.delivered",
      metadata: { source: "seed", template: "new-message" }
    }
  });
}

