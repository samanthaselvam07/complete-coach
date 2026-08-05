export type ClientActivityLogDomain = "training" | "nutrition" | "supplementation";
export type ClientActivityLogStatus = "completed" | "missed";

export async function saveClientActivityLog({
  domain,
  notes,
  status
}: {
  domain: ClientActivityLogDomain;
  notes?: string;
  status: ClientActivityLogStatus;
}) {
  const response = await fetch("/api/v1/client/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain,
      logDate: getTodayDateValue(),
      status,
      notes
    })
  });

  if (!response.ok) {
    throw new Error("Activity log could not be saved.");
  }
}

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
