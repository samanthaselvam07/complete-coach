import { z } from "zod";

export const clientCalendarEventTypeSchema = z.enum([
  "strength",
  "cardio",
  "rest",
  "face-to-face",
  "video-call",
  "phone-call",
  "phase",
  "milestone"
]);

export const clientCalendarEventPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: clientCalendarEventTypeSchema,
  startDate: z.string().date(),
  endDate: z.string().date().optional().default(""),
  allDay: z.boolean().default(true),
  time: z.string().trim().max(20).optional().default(""),
  recurring: z.boolean().default(false),
  recurrenceCount: z.string().trim().max(10).optional().default(""),
  recurrenceEndsOn: z.string().date().or(z.literal("")).optional().default(""),
  recurrenceDays: z.array(z.string().trim().min(1).max(20)).max(7).default([]),
  goal: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(5000).optional().default(""),
  meetingUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  roadmapPhaseId: z.string().trim().min(1).or(z.literal("")).optional().default(""),
  scheduledTrainingProgramId: z.string().trim().min(1).or(z.literal("")).optional().default(""),
  scheduledTrainingProgramName: z.string().trim().max(200).optional().default(""),
  scheduledTrainingDayName: z.string().trim().max(200).optional().default("")
});

export type ClientCalendarEventPayload = z.infer<typeof clientCalendarEventPayloadSchema>;

export interface ClientCalendarEventRecord {
  id: string;
  clientId: string;
  title: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay: boolean;
  eventTime: string | null;
  recurring: boolean;
  recurrenceCount: number | null;
  recurrenceEndsOn: Date | string | null;
  recurrenceDays: string[];
  goal: string | null;
  notes: string | null;
  meetingUrl: string | null;
  roadmapPhaseId: string | null;
  scheduledTrainingProgramId: string | null;
  scheduledTrainingProgramName: string | null;
  scheduledTrainingDayName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function serializeClientCalendarEvent(event: ClientCalendarEventRecord) {
  return {
    id: event.id,
    clientId: event.clientId,
    title: event.title,
    type: clientCalendarEventTypeSchema.safeParse(event.type).success ? event.type : "strength",
    startDate: toDateValue(event.startDate),
    endDate: toDateValue(event.endDate),
    allDay: event.allDay,
    time: event.eventTime ?? "",
    recurring: event.recurring,
    recurrenceCount: event.recurrenceCount === null ? "" : String(event.recurrenceCount),
    recurrenceEndsOn: event.recurrenceEndsOn ? toDateValue(event.recurrenceEndsOn) : "",
    recurrenceDays: event.recurrenceDays,
    goal: event.goal ?? "",
    notes: event.notes ?? "",
    meetingUrl: event.meetingUrl ?? "",
    roadmapPhaseId: event.roadmapPhaseId ?? "",
    scheduledTrainingProgramId: event.scheduledTrainingProgramId ?? "",
    scheduledTrainingProgramName: event.scheduledTrainingProgramName ?? "",
    scheduledTrainingDayName: event.scheduledTrainingDayName ?? "",
    createdAt: toIsoString(event.createdAt),
    updatedAt: toIsoString(event.updatedAt)
  };
}

export function toClientCalendarEventDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toNullableClientCalendarEventDate(value: string) {
  return value ? toClientCalendarEventDate(value) : null;
}

export function toNullableClientCalendarEventInt(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateValue(value: Date | string) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function toIsoString(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}
