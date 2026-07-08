export type LeadStatus = "hot" | "warm" | "cold";
export type LeadStageId = string;

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
  callLink?: string;
  applicationResponses?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface LeadStage {
  id: LeadStageId;
  title: string;
  color: string;
}

export const pipelineStages: LeadStage[] = [
  { id: "initial-contact", title: "Initial Contact", color: "gray" },
  { id: "consultation", title: "Consultation Scheduled", color: "blue" },
  { id: "proposal", title: "Proposal Sent", color: "purple" },
  { id: "negotiation", title: "In Negotiation", color: "yellow" },
  { id: "closed-won", title: "Closed - Won", color: "green" }
];
