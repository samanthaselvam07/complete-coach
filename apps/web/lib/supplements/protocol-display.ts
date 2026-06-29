export interface ActiveSupplementProtocol {
  id: string;
  clientName: string;
  protocol: string;
  supplements: string[];
  status: "Active" | "In Review";
  compliance: number;
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  category: "General Health" | "Performance" | "Recovery";
  description: string;
  supplements: number;
}
