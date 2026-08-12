const logStateMarker = "__complete_coach_client_log_state__:";

export interface ClientDailyLogState {
  nutrition?: {
    loggedMealKeysByDay?: Record<string, string[]>;
  };
  supplementation?: {
    completedKeys?: string[];
  };
}

export interface ClientActivityLogRecord {
  domain: "training" | "nutrition" | "supplementation";
  logDate: string;
  status: "completed" | "missed";
  notes: string | null;
}

export interface ClientActivityLogsResponse {
  data?: {
    logs?: ClientActivityLogRecord[];
  };
}

export function buildClientLogNotes(summary: string, state: ClientDailyLogState) {
  return `${summary}\n${logStateMarker}${JSON.stringify(state)}`;
}

export function parseClientLogState(notes: string | null | undefined): ClientDailyLogState | null {
  if (!notes) {
    return null;
  }

  const markerIndex = notes.lastIndexOf(logStateMarker);

  if (markerIndex < 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(notes.slice(markerIndex + logStateMarker.length).trim()) as unknown;

    return isClientDailyLogState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getLogStateForDomain(logs: ClientActivityLogRecord[], domain: ClientActivityLogRecord["domain"]) {
  const log = [...logs].reverse().find((record) => record.domain === domain);

  return parseClientLogState(log?.notes);
}

function isClientDailyLogState(value: unknown): value is ClientDailyLogState {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
