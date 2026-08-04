export type ClientStatus = "active" | "archived" | "new" | "deactivated";

export interface ClientSummary {
  id: string;
  name: string;
  packageName: string;
  compliance: number;
  checkInDay: string;
  latestCheckIn: string;
  status: ClientStatus;
  assignedCoachName?: string | null;
  startDate: string;
  timezone?: string | null;
  initials: string;
  avatarColor: string;
}

export interface ClientMetric {
  label: string;
  value: string;
  detail: string;
  tone: string;
}

export interface ClientProfile extends ClientSummary {
  age: number;
  waterTargetLitres?: number | null;
  stepTarget?: number | null;
  trainingLogTargetDays?: number | null;
  weeksWithCoach: number;
  protocol: string;
  bio: string;
  metrics: ClientMetric[];
  trainingSchedule: Array<{
    day: string;
    name: string;
    focus: string;
    duration: string;
  }>;
  nutritionPlan: {
    name: string;
    phase: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  supplements: string[];
}
