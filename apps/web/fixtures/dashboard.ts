import type { LucideIcon } from "lucide-react";
import { CalendarDays, CreditCard, FileText } from "lucide-react";

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
}

export interface PipelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: string;
  icon: LucideIcon;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}

export const revenueMetrics: Record<RevenuePeriod, RevenueMetric> = {
  weekly: {
    label: "Weekly Revenue",
    value: "$6,212",
    change: "+8.2%",
    bars: [65, 70, 85, 60, 75, 80, 90]
  },
  monthly: {
    label: "Monthly Revenue",
    value: "$24,850",
    change: "+12.5%",
    bars: [30, 35, 25, 40, 32, 38, 28, 42, 36, 45, 50, 65, 70, 85]
  },
  quarterly: {
    label: "Quarterly Revenue",
    value: "$74,550",
    change: "+18.3%",
    bars: [45, 52, 58, 62, 70, 75, 80, 85, 88, 92, 90, 95]
  },
  yearly: {
    label: "Yearly Revenue",
    value: "$298,200",
    change: "+24.7%",
    bars: [40, 42, 45, 50, 55, 58, 62, 68, 72, 78, 85, 95]
  },
  custom: {
    label: "Custom Period",
    value: "$18,420",
    change: "+10.1%",
    bars: [50, 55, 48, 60, 58, 65, 70, 75, 72, 80, 85, 90]
  }
};

export const revenuePeriodOptions: Array<{ value: RevenuePeriod; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" }
];

export const dashboardTasks: Record<DashboardTaskCategory, DashboardTask[]> = {
  "current-client-care": [
    { id: "client-1", text: "Review Jordan's progress check-in", completed: false },
    { id: "client-2", text: "Update Marcus's meal plan", completed: true },
    { id: "client-3", text: "Schedule call with Sarah J.", completed: false },
    { id: "client-4", text: "Send workout adjustments to Emma", completed: false }
  ],
  "new-client-onboarding": [
    { id: "onboarding-1", text: "Send intake form to new lead", completed: false },
    { id: "onboarding-2", text: "Create welcome message sequence", completed: false },
    { id: "onboarding-3", text: "Confirm onboarding call details", completed: true }
  ],
  "social-media": [
    { id: "social-1", text: "Post transformation Tuesday content", completed: false },
    { id: "social-2", text: "Respond to DM inquiries", completed: true },
    { id: "social-3", text: "Schedule week's Instagram stories", completed: false },
    { id: "social-4", text: "Film testimonial video", completed: false }
  ],
  "business-operations": [
    { id: "ops-1", text: "Process monthly invoices", completed: false },
    { id: "ops-2", text: "Update CRM database", completed: true },
    { id: "ops-3", text: "Review supplement inventory", completed: false },
    { id: "ops-4", text: "Quarterly tax prep review", completed: false }
  ]
};

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

export const pipelineItems: PipelineItem[] = [
  {
    id: "payment-secured",
    title: "Payment Secured",
    description: "Leo G. has paid for Platinum tier...",
    time: "4m ago",
    tone: "bg-green-50 text-green-600",
    icon: CreditCard
  },
  {
    id: "form-received",
    title: "Form Received",
    description: "Elena Rossi submitted health waiver...",
    time: "22m ago",
    tone: "bg-blue-50 text-blue-600",
    icon: FileText
  },
  {
    id: "call-scheduled",
    title: "Call Scheduled",
    description: "Initial consult booked for Marcus...",
    time: "2h ago",
    tone: "bg-gray-50 text-gray-600",
    icon: CalendarDays
  }
];

export const dashboardTeamMembers: TeamMember[] = [
  {
    id: "ava",
    name: "Ava Patel",
    role: "Nutrition Coach",
    initials: "AP",
    color: "bg-orange-500"
  },
  {
    id: "nia",
    name: "Nia Brooks",
    role: "Client Success",
    initials: "NB",
    color: "bg-indigo-600"
  },
  {
    id: "marcus",
    name: "Marcus Lee",
    role: "Performance Coach",
    initials: "ML",
    color: "bg-slate-900"
  }
];
