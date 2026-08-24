import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import {
  adminCreateOrganizationSchema,
  handlePlatformAdminGuardError,
  requirePlatformAdmin
} from "@/lib/admin/platform-admin";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/resend";

const DESIGN_PARTNER_WELCOME_TEMPLATE_ID = "complete-coach-design-partner-welcome";
const DESIGN_PARTNER_WELCOME_FROM_EMAIL = "Complete Coach <info@completecoach.fit>";

export async function POST(request: Request) {
  try {
    const actor = requirePlatformAdmin(await auth());
    const input = adminCreateOrganizationSchema.parse(await request.json());
    const ownerEmail = input.ownerEmail.toLowerCase();

    const existingOrganization = await prisma.organization.findUnique({
      where: { slug: input.slug },
      select: { id: true }
    });

    if (existingOrganization) {
      return errorResponse("slug_taken", "An organization already exists with this slug.", 409);
    }

    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {
        name: input.ownerName
      },
      create: {
        email: ownerEmail,
        name: input.ownerName,
        authProvider: "manual-admin"
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        timezone: input.timezone,
        memberships: {
          create: {
            userId: owner.id,
            role: "OWNER",
            status: "INVITED"
          }
        }
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        actorUserId: actor.userId,
        action: "platform.organization.created",
        targetType: "organization",
        targetId: organization.id,
        metadata: {
          ownerEmail: owner.email,
          ownerMembershipStatus: "invited"
        }
      }
    });

    await sendOrganizationCreatedEmail({
      organizationId: organization.id,
      organizationName: organization.name,
      ownerEmail: owner.email,
      ownerName: owner.name
    });

    return dataResponse(
      {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        owner: {
          name: owner.name,
          email: owner.email
        },
        status: "active",
        ownerMembershipStatus: "invited"
      },
      {
        status: 201,
        headers: { Location: `/api/v1/admin/organizations/${organization.id}` }
      }
    );
  } catch (error) {
    const guardError = handlePlatformAdminGuardError(error);

    if (guardError) {
      return errorResponse(guardError.code, guardError.message, guardError.status);
    }

    return handleApiError(error);
  }
}

async function sendOrganizationCreatedEmail(input: {
  organizationId: string;
  organizationName: string;
  ownerEmail: string | null;
  ownerName: string | null;
}) {
  if (!input.ownerEmail) {
    return;
  }

  const signInUrl = getCompleteCoachSignInUrl();
  const ownerFirstName = getFirstName(input.ownerName) ?? "there";
  const organizationName = input.organizationName;

  try {
    await sendTransactionalEmail({
      organizationId: input.organizationId,
      toEmail: input.ownerEmail,
      fromEmail: DESIGN_PARTNER_WELCOME_FROM_EMAIL,
      template: {
        id: DESIGN_PARTNER_WELCOME_TEMPLATE_ID,
        variables: {
          OWNER_NAME: ownerFirstName,
          ORGANIZATION_NAME: organizationName,
          SIGN_IN_URL: signInUrl
        }
      },
      metadata: {
        template: DESIGN_PARTNER_WELCOME_TEMPLATE_ID,
        organizationName,
        signInUrl
      }
    });
  } catch (error) {
    console.error("Organization-created email could not be queued.", error);
  }
}

function getCompleteCoachSignInUrl() {
  const baseUrl = (process.env.COMPLETE_COACH_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://completecoach.fit")
    .trim()
    .replace(/\/+$/, "");

  return `${baseUrl}/sign-in`;
}

function getFirstName(name: string | null) {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || null;
}
