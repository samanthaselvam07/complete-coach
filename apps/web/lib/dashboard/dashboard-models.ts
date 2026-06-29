export type RevenuePeriod = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type DashboardTaskCategory =
  | "current-client-care"
  | "new-client-onboarding"
  | "social-media"
  | "business-operations";
export type DashboardTaskPriority = "high" | "medium" | "low";

export interface RevenueMetric {
  label: string;
  value: string;
  change: string;
  bars: number[];
}

export interface DashboardTask {
  id: string;
  text: string;
  completed: boolean;
  category?: DashboardTaskCategory;
  priority?: DashboardTaskPriority;
  dueAt?: string | null;
}

export const revenuePeriodOptions: Array<{ value: RevenuePeriod; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" }
];

export const dashboardTaskCategories: Array<{
  id: DashboardTaskCategory;
  label: string;
  badgeClassName: string;
  hoverClassName: string;
}> = [
  {
    id: "current-client-care",
    label: "Client Work",
    badgeClassName: "bg-indigo-100 text-indigo-700",
    hoverClassName: "group-hover:text-indigo-400"
  },
  {
    id: "new-client-onboarding",
    label: "New Client/Onboarding",
    badgeClassName: "bg-blue-100 text-blue-700",
    hoverClassName: "group-hover:text-blue-400"
  },
  {
    id: "social-media",
    label: "Social Media",
    badgeClassName: "bg-purple-100 text-purple-700",
    hoverClassName: "group-hover:text-purple-400"
  },
  {
    id: "business-operations",
    label: "Business Ops/Admin",
    badgeClassName: "bg-orange-100 text-orange-700",
    hoverClassName: "group-hover:text-orange-400"
  }
];
