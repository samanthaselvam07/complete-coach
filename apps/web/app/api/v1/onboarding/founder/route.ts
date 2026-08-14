import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { isLocalDevAuthBypassEnabled } from "@/lib/auth/local-dev-session";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  buildFounderOnboardingCompletionEmail,
  buildFounderOnboardingNotificationEmail,
  founderOnboardingCompletionSchema,
  getFirstName,
  serializeFounderOnboarding
} from "@/lib/onboarding/founder-onboarding";

const founderOnboardingFromEmail =
  process.env.FOUNDER_ONBOARDING_FROM_EMAIL ?? "Sammi Szalinski <info@completecoach.fit>";

const localFounderOnboardingState = {
  completedAt: null as Date | null,
  focus: null as string | null,
  rosterSize: null as string | null,
  platform: null as string | null,
  otherPlatform: null as string | null
};

export async function GET() {
  try {
    const session = await auth();
    const actor = requireActiveActor(session, "team:manage");

    if (isLocalFounderOnboardingPreview(actor.organizationId)) {
      return dataResponse(
        serializeFounderOnboarding({
          organization: {
            founderOnboardingRequired: true,
            founderOnboardingCompletedAt: localFounderOnboardingState.completedAt,
            founderOnboardingFocus: localFounderOnboardingState.focus,
            founderOnboardingRosterSize: localFounderOnboardingState.rosterSize,
            founderOnboardingPlatform: localFounderOnboardingState.platform,
            founderOnboardingOtherPlatform: localFounderOnboardingState.otherPlatform
          },
          firstName: getFirstName(session?.user?.name)
        })
      );
    }

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
      select: {
        founderOnboardingRequired: true,
        founderOnboardingCompletedAt: true,
        founderOnboardingFocus: true,
        founderOnboardingRosterSize: true,
        founderOnboardingPlatform: true,
        founderOnboardingOtherPlatform: true
      }
    });

    return dataResponse(
      serializeFounderOnboarding({
        organization,
        firstName: getFirstName(session?.user?.name)
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const actor = requireActiveActor(session, "team:manage");
    const input = founderOnboardingCompletionSchema.parse(await request.json());

    if (isLocalFounderOnboardingPreview(actor.organizationId)) {
      localFounderOnboardingState.completedAt ??= new Date();
      localFounderOnboardingState.focus ??= input.focus;
      localFounderOnboardingState.rosterSize ??= input.rosterSize;
      localFounderOnboardingState.platform ??= input.platform;
      localFounderOnboardingState.otherPlatform ??= input.platform === "Other" ? input.otherPlatform ?? null : null;

      return dataResponse(
        serializeFounderOnboarding({
          organization: {
            founderOnboardingRequired: true,
            founderOnboardingCompletedAt: localFounderOnboardingState.completedAt,
            founderOnboardingFocus: localFounderOnboardingState.focus,
            founderOnboardingRosterSize: localFounderOnboardingState.rosterSize,
            founderOnboardingPlatform: localFounderOnboardingState.platform,
            founderOnboardingOtherPlatform: localFounderOnboardingState.otherPlatform
          },
          firstName: getFirstName(session?.user?.name)
        })
      );
    }

    const existingOrganization = await prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
      select: {
        id: true,
        name: true,
        founderOnboardingRequired: true,
        founderOnboardingCompletedAt: true,
        founderOnboardingFocus: true,
        founderOnboardingRosterSize: true,
        founderOnboardingPlatform: true,
        founderOnboardingOtherPlatform: true
      }
    });

    if (existingOrganization.founderOnboardingCompletedAt) {
      return dataResponse(
        serializeFounderOnboarding({
          organization: existingOrganization,
          firstName: getFirstName(session?.user?.name)
        })
      );
    }

    const completedAt = new Date();
    const organization = await prisma.organization.update({
      where: { id: actor.organizationId },
      data: {
        founderOnboardingRequired: true,
        founderOnboardingCompletedAt: completedAt,
        founderOnboardingFocus: input.focus,
        founderOnboardingRosterSize: input.rosterSize,
        founderOnboardingPlatform: input.platform,
        founderOnboardingOtherPlatform: input.platform === "Other" ? input.otherPlatform ?? null : null
      },
      select: {
        id: true,
        name: true,
        founderOnboardingRequired: true,
        founderOnboardingCompletedAt: true,
        founderOnboardingFocus: true,
        founderOnboardingRosterSize: true,
        founderOnboardingPlatform: true,
        founderOnboardingOtherPlatform: true
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "founder_onboarding.completed",
        targetType: "organization",
        targetId: actor.organizationId,
        metadata: {
          focus: input.focus,
          rosterSize: input.rosterSize,
          platform: input.platform,
          hasOtherPlatform: Boolean(input.otherPlatform)
        }
      }
    });

    const firstName = getFirstName(session?.user?.name);
    const completionEmail = buildFounderOnboardingCompletionEmail(firstName);

    if (session?.user?.email) {
      await sendTransactionalEmail({
        organizationId: actor.organizationId,
        toEmail: session.user.email,
        fromEmail: founderOnboardingFromEmail,
        subject: completionEmail.subject,
        text: completionEmail.text,
        html: completionEmail.html,
        metadata: {
          type: "founder_onboarding_completion",
          completedAt: completedAt.toISOString()
        }
      });
    }

    const notificationEmail = process.env.FOUNDER_ONBOARDING_NOTIFY_EMAIL;

    if (notificationEmail) {
      const sammiEmail = buildFounderOnboardingNotificationEmail({
        coachName: session?.user?.name ?? firstName,
        coachEmail: session?.user?.email ?? null,
        organizationName: organization.name,
        focus: input.focus,
        rosterSize: input.rosterSize,
        platform: input.platform,
        otherPlatform: input.otherPlatform
      });

      await sendTransactionalEmail({
        organizationId: actor.organizationId,
        toEmail: notificationEmail,
        fromEmail: founderOnboardingFromEmail,
        subject: sammiEmail.subject,
        text: sammiEmail.text,
        html: sammiEmail.html,
        metadata: {
          type: "founder_onboarding_internal_notification",
          completedByUserId: actor.userId,
          completedAt: completedAt.toISOString()
        }
      });
    }

    return dataResponse(
      serializeFounderOnboarding({
        organization,
        firstName
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function isLocalFounderOnboardingPreview(organizationId: string) {
  return isLocalDevAuthBypassEnabled() && organizationId === "local-dev-organization";
}
