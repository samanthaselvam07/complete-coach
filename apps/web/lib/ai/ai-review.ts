import { createHash } from "node:crypto";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /email|phone|password|secret|token|api.?key|medical|health|address|full.?name|answer|notes?/i;
const CONTACT_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d/i;
const SENSITIVE_QUESTION_PATTERN = /email|phone|address|medical history|private note/i;

export interface CheckInReviewInput {
  checkInId: string;
  clientId: string;
  submittedAt: string | null;
  client: {
    displayName: string;
    sex?: string | null;
    goals?: unknown;
    injuries?: unknown;
    email?: never;
    phone?: never;
  };
  answers: Array<{ question: string; answer: string }>;
  metrics: Array<{ metricKey: string; metricValue: number; unit: string | null; measuredAt: string }>;
}

interface CheckInRecord {
  id: string;
  clientId: string;
  submittedAt?: Date | string | null;
  client?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    profile?: {
      sex?: string | null;
      goals?: unknown;
      injuries?: unknown;
      medicalNotes?: string | null;
    } | null;
  } | null;
  formSubmission?: {
    answersJson?: unknown;
  } | null;
}

interface MetricRecord {
  metricKey: string;
  metricValue: number | string | { toString: () => string };
  unit: string | null;
  measuredAt: Date | string;
}

export interface AiReviewFlag {
  severity: "urgent" | "high" | "medium" | "low";
  category: string;
  title: string;
  rationale: string;
}

export interface AiReviewOutputDraft {
  type:
    | "check-in-summary"
    | "risk-flag"
    | "workout-suggestion"
    | "nutrition-suggestion"
    | "message-draft"
    | "resource-recommendation"
    | "extraction-enhancement";
  severity?: string;
  title: string;
  contentMarkdown: string;
  data: unknown;
  requiresApproval: boolean;
}

export interface HeuristicCheckInReview {
  summaryMarkdown: string;
  flags: AiReviewFlag[];
  outputs: AiReviewOutputDraft[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostCents: number;
  };
}

export function buildCheckInReviewInput(checkIn: CheckInRecord, metrics: MetricRecord[]): CheckInReviewInput {
  const firstName = checkIn.client?.firstName?.trim() || "Client";
  const lastInitial = checkIn.client?.lastName?.trim()?.[0];

  return {
    checkInId: checkIn.id,
    clientId: checkIn.clientId,
    submittedAt: checkIn.submittedAt ? toIsoString(checkIn.submittedAt) : null,
    client: {
      displayName: lastInitial ? `${firstName} ${lastInitial}.` : firstName,
      sex: checkIn.client?.profile?.sex ?? null,
      goals: checkIn.client?.profile?.goals ?? null,
      injuries: checkIn.client?.profile?.injuries ?? null
    },
    answers: extractAnswers(checkIn.formSubmission?.answersJson),
    metrics: metrics.map((metric) => ({
      metricKey: metric.metricKey,
      metricValue: Number(metric.metricValue),
      unit: metric.unit,
      measuredAt: toIsoString(metric.measuredAt)
    }))
  };
}

export function generateHeuristicCheckInReview(input: CheckInReviewInput): HeuristicCheckInReview {
  const answerText = input.answers.map((answer) => `${answer.question}: ${answer.answer}`).join("\n");
  const bodyWeight = findMetric(input, "body_weight");
  const waist = findMetric(input, "waist") ?? findAnswerNumber(input, /waist/i);
  const stress = findAnswerNumber(input, /stress/i);
  const mobility = findAnswerNumber(input, /mobility|rolling|stretch/i);
  const injuryAnswer = findAnswer(input, /injur|niggle|pain|hurt/i);
  const nutritionAnswer = findAnswer(input, /nutrition plan|managing with the nutrition|untracked|off.?plan/i);
  const hydration = findAnswer(input, /litres|fluids|hydration/i);
  const motivation = findAnswerNumber(input, /motivation/i);

  const flags: AiReviewFlag[] = [];
  if (injuryAnswer && !/none|no\b|all good/i.test(injuryAnswer)) {
    flags.push({
      severity: "urgent",
      category: "injury",
      title: "Injury or pain requires coach review",
      rationale: `Client reported: ${truncate(injuryAnswer, 160)}`
    });
  }
  if (stress !== null && stress >= 7) {
    flags.push({
      severity: "high",
      category: "stress",
      title: "High stress may affect recovery and scale trends",
      rationale: `Stress was reported at ${stress}/10.`
    });
  }
  if (mobility !== null && mobility < 2) {
    flags.push({
      severity: "medium",
      category: "mobility",
      title: "Mobility work is below target",
      rationale: `Mobility was reported at ${mobility} session(s), below the 2x/week minimum review threshold.`
    });
  }
  if (nutritionAnswer && /not on plan|off plan|off-plan|untracked|work event/i.test(nutritionAnswer)) {
    flags.push({
      severity: stress !== null && stress >= 7 ? "high" : "medium",
      category: "nutrition",
      title: "Nutrition consistency needs a specific plan",
      rationale: `Nutrition response: ${truncate(nutritionAnswer, 160)}`
    });
  }

  const summaryMarkdown = [
    "# Weekly Fitness Review",
    `**Client:** ${input.client.displayName}`,
    "",
    "## 1. Weight / Waist",
    `- Body weight: ${bodyWeight !== null ? `${bodyWeight} kg` : "not supplied"}.`,
    `- Waist: ${waist !== null ? `${waist} cm` : "not supplied"}.`,
    "",
    "## 2. Training & Progression",
    injuryAnswer
      ? `- Training needs pain-free modification because the check-in reported: ${truncate(injuryAnswer, 140)}`
      : "- No explicit training pain flag was found in the submitted answers.",
    "",
    "## 3. Fatigue / Recovery",
    `- Stress: ${stress !== null ? `${stress}/10` : "not supplied"}. Motivation: ${motivation !== null ? `${motivation}/10` : "not supplied"}.`,
    "",
    "## 4. Nutrition",
    nutritionAnswer ? `- Nutrition note: ${truncate(nutritionAnswer, 160)}` : "- No nutrition barrier was supplied.",
    hydration ? `- Hydration note: ${truncate(hydration, 100)}` : "- Hydration was not supplied.",
    "",
    "## 5. Goals for Next Week",
    "- Resolve urgent injury flags before progressing load.",
    "- Keep nutrition targets specific to the reported barrier.",
    "- Review stress, sleep, and mobility before adding training volume."
  ].join("\n");

  const outputs: AiReviewOutputDraft[] = [
    {
      type: "check-in-summary",
      title: "CHFI weekly check-in summary",
      contentMarkdown: summaryMarkdown,
      data: { flags },
      requiresApproval: true
    },
    ...flags.map((flag) => ({
      type: "risk-flag" as const,
      severity: flag.severity,
      title: flag.title,
      contentMarkdown: flag.rationale,
      data: flag,
      requiresApproval: true
    })),
    {
      type: "workout-suggestion",
      severity: flags.some((flag) => flag.category === "injury") ? "urgent" : "medium",
      title: "Training adjustment suggestion",
      contentMarkdown: flags.some((flag) => flag.category === "injury")
        ? "Keep training in pain-free ranges, reduce affected upper-body loading, and ask for medical/physio review before progressing the painful area."
        : "Progress only if recovery, motivation, and performance markers are stable.",
      data: { source: "chfi-17-step", answerText: truncate(answerText, 500) },
      requiresApproval: true
    },
    {
      type: "nutrition-suggestion",
      severity: flags.some((flag) => flag.category === "nutrition") ? "high" : "low",
      title: "Nutrition adjustment suggestion",
      contentMarkdown: nutritionAnswer
        ? "Create a concrete plan for the reported nutrition barrier before changing calories."
        : "Maintain current nutrition targets unless trend data shows a two-week stall.",
      data: { source: "chfi-17-step" },
      requiresApproval: true
    },
    {
      type: "message-draft",
      severity: highestSeverity(flags),
      title: "Draft client check-in reply",
      contentMarkdown: buildDraftReply(input.client.displayName, flags),
      data: { source: "chfi-17-step" },
      requiresApproval: true
    }
  ];

  const inputTokens = estimateTokens(JSON.stringify(input));
  const outputTokens = estimateTokens(summaryMarkdown + JSON.stringify(flags));

  return {
    summaryMarkdown,
    flags,
    outputs,
    usage: {
      inputTokens,
      outputTokens,
      estimatedCostCents: estimateAiCostCents({
        inputTokens,
        outputTokens,
        inputPerMillionCents: 0,
        outputPerMillionCents: 0
      })
    }
  };
}

export function redactAiInput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactAiInput);
  }

  if (!value || typeof value !== "object") {
    return typeof value === "string" && CONTACT_VALUE_PATTERN.test(value) ? REDACTED : value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactAiInput(nestedValue)
    ])
  );
}

export function hashAiInput(input: unknown) {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

export function estimateAiCostCents(input: {
  inputTokens: number;
  outputTokens: number;
  inputPerMillionCents: number;
  outputPerMillionCents: number;
}) {
  const cost =
    (input.inputTokens / 1_000_000) * input.inputPerMillionCents +
    (input.outputTokens / 1_000_000) * input.outputPerMillionCents;

  return Math.round(cost * 100) / 100;
}

function extractAnswers(answersJson: unknown) {
  if (!answersJson || typeof answersJson !== "object" || Array.isArray(answersJson)) {
    return [];
  }

  return Object.entries(answersJson)
    .filter(([question, answer]) => !SENSITIVE_QUESTION_PATTERN.test(question) && typeof answer !== "undefined" && answer !== null)
    .map(([question, answer]) => ({
      question,
      answer: truncate(String(answer).replace(CONTACT_VALUE_PATTERN, REDACTED), 500)
    }));
}

function findMetric(input: CheckInReviewInput, metricKey: string) {
  return input.metrics.find((metric) => metric.metricKey === metricKey)?.metricValue ?? null;
}

function findAnswer(input: CheckInReviewInput, pattern: RegExp) {
  return input.answers.find((answer) => pattern.test(answer.question))?.answer ?? null;
}

function findAnswerNumber(input: CheckInReviewInput, pattern: RegExp) {
  const answer = findAnswer(input, pattern);
  if (!answer) {
    return null;
  }

  const match = answer.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function highestSeverity(flags: AiReviewFlag[]) {
  if (flags.some((flag) => flag.severity === "urgent")) {
    return "urgent";
  }
  if (flags.some((flag) => flag.severity === "high")) {
    return "high";
  }
  if (flags.some((flag) => flag.severity === "medium")) {
    return "medium";
  }
  return "low";
}

function buildDraftReply(clientName: string, flags: AiReviewFlag[]) {
  const urgentInjury = flags.find((flag) => flag.category === "injury");
  const nutrition = flags.find((flag) => flag.category === "nutrition");

  return [
    `${clientName}, thanks for the detailed check-in.`,
    urgentInjury
      ? "The main priority is getting the injury reviewed and keeping training pain-free rather than forcing progression this week."
      : "The main priority is keeping the next week simple and measurable.",
    nutrition ? "For nutrition, let's plan around the exact situation that pulled you off plan rather than making a broad calorie change." : null,
    "I will review the trend data and confirm the final adjustments before anything changes."
  ]
    .filter(Boolean)
    .join("\n\n");
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
