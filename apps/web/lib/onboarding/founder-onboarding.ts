import { z } from "zod";

export const founderOnboardingFocusOptions = [
  "General fitness",
  "Fat loss",
  "Muscle building",
  "Sports performance",
  "Health and lifestyle",
  "Other"
] as const;

export const founderOnboardingRosterSizeOptions = [
  "1 to 5",
  "6 to 15",
  "16 to 30",
  "31 to 50",
  "50 plus"
] as const;

export const founderOnboardingPlatformOptions = [
  "Trainerize",
  "Everfit",
  "TrueCoach",
  "Kahunas",
  "1Fit",
  "Google Sheets or spreadsheet",
  "My own system",
  "Other",
  "Just getting started (no existing clients)"
] as const;

export const founderOnboardingCompletionSchema = z
  .object({
    focus: z.enum(founderOnboardingFocusOptions),
    rosterSize: z.enum(founderOnboardingRosterSizeOptions),
    platform: z.enum(founderOnboardingPlatformOptions),
    otherPlatform: z.string().trim().max(120).optional()
  })
  .superRefine((value, context) => {
    if (value.platform === "Other" && !value.otherPlatform) {
      context.addIssue({
        code: "custom",
        path: ["otherPlatform"],
        message: "Enter the platform name."
      });
    }
  });

export type FounderOnboardingCompletionInput = z.infer<typeof founderOnboardingCompletionSchema>;

export interface FounderOnboardingRecord {
  founderOnboardingRequired: boolean;
  founderOnboardingCompletedAt: Date | null;
  founderOnboardingFocus: string | null;
  founderOnboardingRosterSize: string | null;
  founderOnboardingPlatform: string | null;
  founderOnboardingOtherPlatform: string | null;
}

export function serializeFounderOnboarding(input: {
  organization: FounderOnboardingRecord;
  firstName: string;
}) {
  return {
    firstName: input.firstName,
    required: input.organization.founderOnboardingRequired,
    completed: Boolean(input.organization.founderOnboardingCompletedAt),
    completedAt: input.organization.founderOnboardingCompletedAt?.toISOString() ?? null,
    focus: input.organization.founderOnboardingFocus,
    rosterSize: input.organization.founderOnboardingRosterSize,
    platform: input.organization.founderOnboardingPlatform,
    otherPlatform: input.organization.founderOnboardingOtherPlatform
  };
}

export function getFirstName(name: string | null | undefined, fallback = "there") {
  const firstName = name?.trim().split(/\s+/)[0];

  return firstName || fallback;
}

export function buildFounderOnboardingCompletionEmail(firstName: string) {
  const text = [
    `Hi ${firstName},`,
    "",
    "Looks like your account is all set up.",
    "",
    "How did it go? If anything felt confusing or did not work the way you expected, just reply and let me know.",
    "",
    "I want to make sure you are set up well before we jump on the call.",
    "",
    "Looking forward to it.",
    "",
    "Sammi"
  ].join("\n");

  return {
    subject: "Your Complete Coach account is ready",
    text,
    html: toHtmlParagraphs(text)
  };
}

export function buildFounderOnboardingNotificationEmail(input: {
  coachName: string;
  coachEmail: string | null;
  organizationName: string;
  focus: string;
  rosterSize: string;
  platform: string;
  otherPlatform?: string | null;
}) {
  const platform = input.platform === "Other" && input.otherPlatform ? input.otherPlatform : input.platform;
  const text = [
    `${input.coachName} has completed the Complete Coach founder onboarding wizard.`,
    "",
    `Organization: ${input.organizationName}`,
    `Email: ${input.coachEmail ?? "Not provided"}`,
    `Coaching focus: ${input.focus}`,
    `Roster size: ${input.rosterSize}`,
    `Current platform: ${platform}`
  ].join("\n");

  return {
    subject: `${input.organizationName} completed founder onboarding`,
    text,
    html: toHtmlParagraphs(text)
  };
}

function toHtmlParagraphs(text: string) {
  return text
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
