import { describe, expect, it } from "vitest";

import { ClientActivityLogDomain, ClientActivityLogStatus } from "@/app/generated/prisma/enums";
import {
  buildClientActivityLogSummary,
  getClientActivityLogDateRange,
  type ClientActivityLogRecord
} from "@/lib/clients/client-activity-logs";

function activityLog(
  id: string,
  domain: ClientActivityLogDomain,
  logDate: string,
  status: ClientActivityLogStatus = ClientActivityLogStatus.COMPLETED
): ClientActivityLogRecord {
  return {
    id,
    domain,
    logDate,
    status,
    notes: null,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z"
  };
}

describe("client activity log compliance summary", () => {
  it("scores seven completed days across training, nutrition, and supplementation as 100%", () => {
    const { dateFrom, dateTo } = getClientActivityLogDateRange({ days: 7 }, new Date("2026-07-30T12:00:00.000Z"));
    const records: ClientActivityLogRecord[] = [];

    for (let day = 24; day <= 30; day += 1) {
      const logDate = `2026-07-${String(day).padStart(2, "0")}`;
      records.push(activityLog(`training_${day}`, ClientActivityLogDomain.TRAINING, logDate));
      records.push(activityLog(`nutrition_${day}`, ClientActivityLogDomain.NUTRITION, logDate));
      records.push(activityLog(`supplementation_${day}`, ClientActivityLogDomain.SUPPLEMENTATION, logDate));
    }

    expect(buildClientActivityLogSummary(records, dateFrom, dateTo)).toMatchObject({
      days: 7,
      completedLogs: 21,
      possibleLogs: 21,
      complianceScore: 100,
      byDomain: [
        { domain: "training", completedLogs: 7, possibleLogs: 7, complianceScore: 100 },
        { domain: "nutrition", completedLogs: 7, possibleLogs: 7, complianceScore: 100 },
        { domain: "supplementation", completedLogs: 7, possibleLogs: 7, complianceScore: 100 }
      ]
    });
  });

  it("only counts completed logs toward compliance", () => {
    const dateFrom = new Date("2026-07-24T00:00:00.000Z");
    const dateTo = new Date("2026-07-30T00:00:00.000Z");
    const records = [
      activityLog("training_1", ClientActivityLogDomain.TRAINING, "2026-07-24"),
      activityLog("training_2", ClientActivityLogDomain.TRAINING, "2026-07-25", ClientActivityLogStatus.MISSED),
      activityLog("nutrition_1", ClientActivityLogDomain.NUTRITION, "2026-07-24"),
      activityLog("supplementation_1", ClientActivityLogDomain.SUPPLEMENTATION, "2026-07-24")
    ];

    expect(buildClientActivityLogSummary(records, dateFrom, dateTo)).toMatchObject({
      days: 7,
      completedLogs: 3,
      possibleLogs: 21,
      complianceScore: 14,
      byDomain: [
        { domain: "training", completedLogs: 1, possibleLogs: 7, complianceScore: 14 },
        { domain: "nutrition", completedLogs: 1, possibleLogs: 7, complianceScore: 14 },
        { domain: "supplementation", completedLogs: 1, possibleLogs: 7, complianceScore: 14 }
      ]
    });
  });
});
