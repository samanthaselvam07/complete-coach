export const automationIntervalValues = ["Minutes", "Hours", "Days", "Weeks"] as const;

export const organizationAutomationTriggers = [
  {
    id: "new-client-created",
    name: "New client created",
    enabled: true,
    subject: "Welcome to Complete Coach!",
    template:
      "[FIRST_NAME]!\n\nWelcome to your coaching program. I need 10 minutes of your time to make sure you are clear on the next steps.\n\nThings you will need for success:\n\n- Bodyweight scales\n- Measuring tape\n- Wearable activity tracker\n- Food scale\n- Meal prep containers\n- Gym membership",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "client-completes-check-in",
    name: "Client completes a check-in",
    enabled: true,
    subject: "Your check-in has been received",
    template: "Thanks [FIRST_NAME], your check-in has been submitted and your coach will review it soon.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "nutrition-plan-added",
    name: "Nutrition plan added to your client",
    enabled: true,
    subject: "Your nutrition plan is ready",
    template: "Hi [FIRST_NAME], your nutrition plan has been added to your Complete Coach profile.",
    delay: 5,
    interval: "Minutes"
  },
  {
    id: "initial-qa-completed",
    name: "Client completes initial Q&A form",
    enabled: true,
    subject: "Initial Q&A received",
    template: "Thanks [FIRST_NAME], your initial Q&A form has been attached to your profile.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "workout-plan-added",
    name: "Workout plan added to your client",
    enabled: true,
    subject: "Your workout plan is ready",
    template: "Hi [FIRST_NAME], your workout plan is now available in Complete Coach.",
    delay: 5,
    interval: "Minutes"
  },
  {
    id: "supplement-plan-added",
    name: "Supplement plan added to your client",
    enabled: true,
    subject: "Your supplement plan is ready",
    template: "Hi [FIRST_NAME], your supplement plan has been added to your profile.",
    delay: 5,
    interval: "Minutes"
  },
  {
    id: "workout-plan-updated",
    name: "Workout plan updated",
    enabled: true,
    subject: "Your workout plan has been updated",
    template: "Hi [FIRST_NAME], your coach has updated your workout plan.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "nutrition-plan-updated",
    name: "Nutrition plan updated",
    enabled: true,
    subject: "Your nutrition plan has been updated",
    template: "Hi [FIRST_NAME], your coach has updated your nutrition plan.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "client-misses-check-in",
    name: "Client misses a check-in",
    enabled: true,
    subject: "Your check-in is overdue",
    template: "Hi [FIRST_NAME], your check-in is still waiting. Please submit it when you can.",
    delay: 1,
    interval: "Days"
  },
  {
    id: "client-check-in-reminder",
    name: "Client check-in reminder",
    enabled: true,
    subject: "Check-in reminder",
    template: "Hi [FIRST_NAME], this is a reminder that your check-in is due soon.",
    delay: 1,
    interval: "Days"
  },
  {
    id: "client-birthday",
    name: "Client's birthday",
    enabled: true,
    subject: "Happy birthday from your coaching team",
    template: "Happy birthday [FIRST_NAME]. Have a great day from the Complete Coach team.",
    delay: 0,
    interval: "Minutes"
  },
  {
    id: "supplement-plan-updated",
    name: "Supplement plan updated",
    enabled: true,
    subject: "Your supplement plan has been updated",
    template: "Hi [FIRST_NAME], your coach has updated your supplement plan.",
    delay: 1,
    interval: "Minutes"
  }
] as const;

export type OrganizationAutomationTriggerId = (typeof organizationAutomationTriggers)[number]["id"];
export type OrganizationAutomationInterval = (typeof automationIntervalValues)[number];

export interface SerializedOrganizationAutomation {
  id: OrganizationAutomationTriggerId;
  name: string;
  enabled: boolean;
  subject: string;
  template: string;
  delay: number;
  interval: OrganizationAutomationInterval;
}
