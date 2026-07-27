import { z } from "zod";

type RoadmapPhaseRecord = {
  id: string;
  clientId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  items?: RoadmapItemRecord[];
};

type RoadmapItemRecord = {
  id: string;
  phaseId: string;
  clientId: string;
  title: string;
  type: string;
  eventDate: Date;
  notes: string | null;
};

export const roadmapPhaseStatusSchema = z.enum(["planned", "active", "completed"]);
export const roadmapItemTypeSchema = z.enum(["event", "milestone", "task"]);

export const createRoadmapPhaseSchema = z.object({
  kind: z.literal("phase"),
  name: z.string().trim().min(1).max(200),
  startDate: z.string().date(),
  endDate: z.string().date()
});

export const createRoadmapItemSchema = z.object({
  kind: z.literal("item"),
  phaseId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  type: roadmapItemTypeSchema,
  date: z.string().date(),
  notes: z.string().trim().max(5000).optional().default("")
});

export const createRoadmapEntrySchema = z.discriminatedUnion("kind", [
  createRoadmapPhaseSchema,
  createRoadmapItemSchema
]);

export function serializeRoadmapPhase(phase: RoadmapPhaseRecord) {
  return {
    id: phase.id,
    clientId: phase.clientId,
    name: phase.name,
    startDate: toDateValue(phase.startDate),
    endDate: toDateValue(phase.endDate),
    status: getRoadmapPhaseStatus(toDateValue(phase.startDate), toDateValue(phase.endDate)),
    items: (phase.items ?? []).map(serializeRoadmapItem)
  };
}

export function serializeRoadmapItem(item: RoadmapItemRecord) {
  return {
    id: item.id,
    phaseId: item.phaseId,
    clientId: item.clientId,
    title: item.title,
    type: roadmapItemTypeSchema.safeParse(item.type).success ? item.type : "event",
    date: toDateValue(item.eventDate),
    notes: item.notes ?? ""
  };
}

export function toRoadmapDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function getRoadmapPhaseStatus(startDate: string, endDate: string, today = new Date()) {
  const todayValue = toDateValue(today);

  if (endDate < todayValue) {
    return "completed";
  }

  if (startDate <= todayValue && endDate >= todayValue) {
    return "active";
  }

  return "planned";
}

function toDateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}
