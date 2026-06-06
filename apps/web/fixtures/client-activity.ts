export interface ClientActivityEvent {
  id: string;
  clientId: string;
  action: string;
  title: string;
  summary: string;
  detail: string;
  occurredAt: string;
  tone: "blue" | "green" | "orange" | "red" | "slate";
}

export const clientActivityEvents: ClientActivityEvent[] = [
  {
    id: "activity_session_1",
    clientId: "1",
    action: "session.completed",
    title: "App session recorded",
    summary: "Client logged in for 18 minutes",
    detail: "Session started on iPhone 15 Pro. Client opened training, nutrition, and check-in views before logging out.",
    occurredAt: "Jun 06, 2026 at 7:42PM",
    tone: "slate"
  },
  {
    id: "activity_training_1",
    clientId: "1",
    action: "training_program.updated",
    title: "Training program updated",
    summary: "Upper/Lower 4-Day Split assigned",
    detail: "Coach updated the active training plan and attached the next four-week progression block.",
    occurredAt: "Jun 05, 2026 at 2:30PM",
    tone: "blue"
  },
  {
    id: "activity_payment_1",
    clientId: "1",
    action: "billing.payment_succeeded",
    title: "Payment successful",
    summary: "$299.00 charged for Premium Coaching",
    detail: "Billing provider confirmed the monthly subscription renewal and receipt email was queued.",
    occurredAt: "Jun 05, 2026 at 9:15AM",
    tone: "green"
  },
  {
    id: "activity_checkin_1",
    clientId: "1",
    action: "check_in.submitted",
    title: "Check-in submitted",
    summary: "Week 24 check-in submitted on time",
    detail: "Client submitted weekly measurements, wellbeing scores, wins, challenges, and nutrition notes.",
    occurredAt: "Apr 18, 2026 at 8:24AM",
    tone: "blue"
  },
  {
    id: "activity_checkin_2",
    clientId: "1",
    action: "check_in.completed",
    title: "Check-in completed",
    summary: "Coach review marked complete",
    detail: "Coach completed the check-in review and saved a summary for the client record.",
    occurredAt: "Apr 18, 2026 at 10:02AM",
    tone: "green"
  },
  {
    id: "activity_supplement_1",
    clientId: "1",
    action: "supplement_plan.updated",
    title: "Supplementation plan updated",
    summary: "Vitamin D3 + K2 protocol adjusted",
    detail: "Coach updated supplement timing and attached adherence notes to the client profile.",
    occurredAt: "Apr 17, 2026 at 4:10PM",
    tone: "orange"
  },
  {
    id: "activity_form_1",
    clientId: "1",
    action: "form.submitted",
    title: "Form submitted",
    summary: "Readiness questionnaire attached",
    detail: "A submitted readiness form was attached to the client profile without exposing raw answers in the activity preview.",
    occurredAt: "Apr 17, 2026 at 9:04AM",
    tone: "slate"
  },
  {
    id: "activity_billing_declined_1",
    clientId: "1",
    action: "billing.payment_declined",
    title: "Payment declined",
    summary: "Card declined for add-on package",
    detail: "Billing provider declined an add-on package payment. No card details are stored in the activity event.",
    occurredAt: "Apr 16, 2026 at 8:12AM",
    tone: "red"
  }
];

export function getRecentClientActivity(clientId: string, limit = 7) {
  return clientActivityEvents.filter((event) => event.clientId === clientId).slice(0, limit);
}
