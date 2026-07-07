import { z } from "zod";

import { dataResponse, handleApiError } from "@/lib/api/responses";
import { prisma } from "@/lib/db/prisma";

const waitlistSignupSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  source: z.string().trim().max(80).optional()
});

export async function POST(request: Request) {
  try {
    const input = waitlistSignupSchema.parse(await request.json());
    const signup = await prisma.waitlistSignup.upsert({
      where: { email: input.email },
      update: {
        source: input.source ?? "waitlist-page",
        metadata: {
          lastSubmittedAt: new Date().toISOString()
        }
      },
      create: {
        email: input.email,
        source: input.source ?? "waitlist-page",
        metadata: {
          userAgent: request.headers.get("user-agent")
        }
      }
    });

    return dataResponse(
      {
        id: signup.id,
        email: signup.email,
        status: "joined"
      },
      { status: 202 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
