export interface ChatMessage {
  id: string;
  sender: "coach" | "client";
  text: string;
  time: string;
}
