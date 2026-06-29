export type CheckInTab = "pending" | "completed";
export type CheckInSort = "recent" | "oldest" | "name";

export interface CheckInListRecord {
  id: string;
  name: string;
  initials: string;
  submittedAt: Date | string;
  assignedDay?: Date | string | null;
  lastCheckIn: string;
  status: CheckInTab;
}

export function getTimingStatus(submittedAt: Date, assignedDay: Date) {
  const deadline = new Date(assignedDay);
  deadline.setHours(9, 0, 0, 0);

  const assignedDayStart = new Date(assignedDay);
  assignedDayStart.setHours(0, 0, 0, 0);

  if (submittedAt < assignedDayStart) {
    return { label: "Early", color: "text-blue-600 bg-blue-50" };
  }

  if (submittedAt <= deadline) {
    return { label: "On Time", color: "text-green-600 bg-green-50" };
  }

  return { label: "Late", color: "text-red-600 bg-red-50" };
}

export function formatSubmittedAt(date: Date) {
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })}`;
}
