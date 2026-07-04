export interface ActiveSupplementProtocol {
  id: string;
  clientId: string;
  templateId: string | null;
  clientName: string;
  protocol: string;
  supplements: string[];
  status: "Active" | "Inactive";
  compliance: number | null;
  createdOn: string;
  assignedOn: string;
  template: {
    phases: Array<{
      name: string;
      supplements: Array<{
        supplementId?: string;
        supplementName: string;
        dosage: string;
        timing: string;
        notes?: string;
      }>;
    }>;
  };
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  category: "General Health" | "Performance" | "Recovery";
  description: string;
  supplements: number;
  status: string;
  template: ActiveSupplementProtocol["template"];
}
