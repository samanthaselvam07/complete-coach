export type LeadStatus = "hot" | "warm" | "cold";
export type LeadStageId = "initial-contact" | "consultation" | "proposal" | "negotiation" | "closed-won";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  lastContact: string;
  notes: string;
  location: string;
  status: LeadStatus;
  stage: LeadStageId;
  daysInStage: number;
  initials: string;
}

export interface LeadStage {
  id: LeadStageId;
  title: string;
  color: string;
}

export const pipelineStages: LeadStage[] = [
  { id: "initial-contact", title: "Initial Contact", color: "bg-gray-50" },
  { id: "consultation", title: "Consultation Scheduled", color: "bg-blue-50" },
  { id: "proposal", title: "Proposal Sent", color: "bg-purple-50" },
  { id: "negotiation", title: "In Negotiation", color: "bg-yellow-50" },
  { id: "closed-won", title: "Closed - Won", color: "bg-green-50" }
];
