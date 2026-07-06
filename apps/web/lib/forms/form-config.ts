import {
  AlignJustify,
  AlignLeft,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  Hash,
  Image,
  Mail,
  Phone
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  tags: string[];
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  content?: string;
  required: boolean;
  options?: string[];
}

export interface FormElementDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface FormPresetOption {
  id: string;
  label: string;
  fieldType: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  content?: string;
}

export const formTemplates: FormTemplate[] = [
  {
    id: "check-in",
    name: "Check-in Forms",
    description: "Track physique progress, energy levels, and weekly qualitative data.",
    icon: CheckSquare,
    color: "bg-indigo-50 text-indigo-600",
    tags: ["WEIGHT TRACKING", "PHOTO UPLOADS"]
  },
  {
    id: "habit-tracker",
    name: "Daily Habit Trackers",
    description: "Create recurring checklists for hydration, steps, and sleep targets.",
    icon: CheckSquare,
    color: "bg-orange-50 text-orange-600",
    tags: ["CHECKBOXES", "DAILY FREQUENCY"]
  },
  {
    id: "application",
    name: "Application Forms",
    description: "Qualify potential athletes with background info and health history.",
    icon: AlignJustify,
    color: "bg-green-50 text-green-600",
    tags: ["LONG TEXT", "FILE UPLOAD"]
  },
  {
    id: "contact",
    name: "Contact Forms",
    description: "Simple intake for general inquiries and feedback from your team.",
    icon: Mail,
    color: "bg-blue-50 text-blue-600",
    tags: ["SHORT ANSWER", "EMAIL FIELD"]
  },
  {
    id: "terms-and-conditions",
    name: "Terms and Conditions",
    description: "Collect client agreement acceptance, waivers, and policy acknowledgements.",
    icon: FileText,
    color: "bg-slate-100 text-slate-700",
    tags: ["AGREEMENT", "ACKNOWLEDGEMENT"]
  }
];

export const initialFormFields: FormField[] = [
  {
    id: "field-1",
    type: "short-text",
    label: "Full Legal Name",
    placeholder: "e.g. Johnathan",
    required: true
  },
  {
    id: "field-2",
    type: "multiple-choice",
    label: "Current Activity Level",
    options: ["Sedentary (Office job, no exercise)", "Moderately Active (3-5 workouts per week)"],
    required: false
  }
];

export const formElements: FormElementDefinition[] = [
  { id: "short-text", label: "Short Text", icon: AlignLeft, color: "bg-indigo-50 text-indigo-600" },
  { id: "long-text", label: "Long Text", icon: AlignJustify, color: "bg-orange-50 text-orange-600" },
  { id: "number", label: "Number", icon: Hash, color: "bg-slate-100 text-slate-700" },
  { id: "multiple-choice", label: "Multiple Choice", icon: CheckSquare, color: "bg-blue-50 text-blue-600" },
  { id: "radio-buttons", label: "Radio Buttons", icon: Check, color: "bg-violet-50 text-violet-600" },
  { id: "rating-10", label: "Rating out of 10", icon: CheckSquare, color: "bg-amber-50 text-amber-600" },
  { id: "phone", label: "Phone Number", icon: Phone, color: "bg-green-50 text-green-600" },
  { id: "email", label: "Email", icon: Mail, color: "bg-purple-50 text-purple-600" },
  { id: "date", label: "Date of Birth", icon: Calendar, color: "bg-red-50 text-red-600" },
  { id: "time", label: "Time", icon: Clock, color: "bg-cyan-50 text-cyan-600" },
  { id: "photo", label: "Photo Upload", icon: Image, color: "bg-yellow-50 text-yellow-600" },
  { id: "dropdown", label: "Dropdown", icon: ChevronDown, color: "bg-teal-50 text-teal-600" },
  { id: "checkbox", label: "Checkbox", icon: Check, color: "bg-pink-50 text-pink-600" }
];

export const termsAndConditionsPresetContent = `Template for use within Complete Coach. Fields marked [LIKE THIS] should be completed before sending to clients. This document is a template only and does not constitute legal advice. It is recommended you have this reviewed by a qualified legal professional before use in your business.

Coach / Business: [BUSINESS NAME], operated by [YOUR FULL NAME]
Email: [YOUR EMAIL ADDRESS]
Website: [YOUR WEBSITE URL]

Client Name: [CLIENT FULL NAME]
Programme: [PROGRAMME NAME]
Start Date: [START DATE]
Programme Duration: [e.g. 3 months / ongoing month-to-month]
Monthly Investment: [CURRENCY + AMOUNT] per month

1. Agreement

By signing or acknowledging this document, the client ("you") agrees to enter into a coaching agreement with [BUSINESS NAME] ("the Coach") under the terms set out below. This agreement is effective from the start date listed above.

2. Services

The Coach agrees to provide online fitness and/or nutrition coaching services as outlined below.

Services included in this programme:

- [e.g. Weekly check-in review and written coach feedback]
- [e.g. Personalised training programme, updated every X weeks]
- [e.g. Personalised nutrition guidance]
- [e.g. Access to the coaching platform and app]
- [e.g. Direct messaging support, responded to within X business hours]
- [e.g. Monthly progress review call]

The Coach reserves the right to adjust the delivery format of services where necessary, provided the overall standard of service is maintained. Any significant changes to the programme structure will be communicated in advance.

3. Payment Terms

Monthly fee: [CURRENCY + AMOUNT], charged on the [e.g. 1st] of each month.

Payment method: [e.g. Direct debit / bank transfer / payment link]

Payment is due on or before the scheduled date. If payment is not received within [e.g. 5] business days of the due date, the Coach reserves the right to pause access to the coaching programme until payment is received.

All fees are listed in [CURRENCY]. [If applicable: Prices are inclusive of VAT / exclusive of VAT at the prevailing rate.]

4. Minimum Commitment and Cancellation Policy

This programme has a minimum commitment period of [e.g. 1 month / 3 months / no minimum].

To cancel your coaching programme, you are required to provide [e.g. 30 days] written notice via email to [YOUR EMAIL ADDRESS]. Notice periods begin from the date the email is received.

You will be charged for any sessions or months falling within the notice period. Cancellation of payment without providing the required notice does not constitute cancellation of the agreement and any outstanding amounts remain payable.

5. Refund Policy

Due to the personalised and time-intensive nature of coaching services, [BUSINESS NAME] does not offer refunds on payments already made.

If you experience an exceptional circumstance, please contact [YOUR EMAIL ADDRESS] to discuss your situation. Requests will be considered on a case-by-case basis at the Coach's discretion.

[Optional: A [NUMBER]-day satisfaction period applies at the start of the programme. If you are not satisfied within this period, please contact us to discuss options.]

6. Client Responsibilities

To get the most from this programme and to allow the Coach to deliver services effectively, you agree to:

- Complete check-ins and any required forms honestly and on time, as directed by your Coach
- Communicate any changes to your health, lifestyle, or circumstances that may affect your programme
- Follow the programme as provided and raise any concerns or questions rather than making unilateral changes
- Engage with the programme with reasonable commitment and effort
- Treat the Coach with respect in all communications

The Coach is not responsible for a lack of results where the client has not engaged with or followed the programme as directed.

7. Health, Medical, and Safety Disclaimer

Your health and safety is the Coach's priority. By entering into this agreement, you confirm that:

- You are in a satisfactory state of health to participate in a fitness and/or nutrition programme
- You have disclosed any known injuries, medical conditions, or health concerns to the Coach prior to starting
- You understand that if you have any underlying health conditions, you should seek clearance from a qualified medical professional before beginning any exercise or nutrition programme
- You will inform the Coach immediately if your health status changes during the programme

The Coach is not a medical doctor. Nothing provided as part of this coaching programme should be interpreted as medical advice or used as a substitute for professional medical care.

8. Results Disclaimer

The Coach will work with you to the best of their professional ability to support your goals. However, results are not guaranteed. Individual outcomes depend on a range of factors including but not limited to effort, adherence, lifestyle, genetics, and health status.

[BUSINESS NAME] makes no specific promises regarding the results you will achieve from this programme.

9. Intellectual Property

All training programmes, nutrition plans, check-in frameworks, resources, and materials provided by the Coach are the intellectual property of [BUSINESS NAME] and are provided for your personal use only.

You agree not to share, reproduce, resell, or distribute any materials provided to you as part of this programme without the prior written consent of the Coach.

10. Confidentiality and Privacy

The Coach agrees to keep your personal information, health data, and progress information confidential and will not share it with third parties without your consent, except where required by law.

Your data will be stored and processed in accordance with [BUSINESS NAME]'s Privacy Policy, available at [PRIVACY POLICY URL or "on request"].

[Optional: With your consent, anonymised progress information or testimonials may be used for marketing purposes. You will be asked separately before any such use.]

11. Communication and Availability

The Coach will aim to respond to messages and check-in feedback within [e.g. 24-48] business hours, [e.g. Monday to Friday].

The Coach is not available [e.g. on weekends / on public holidays / outside of business hours] for routine queries. In the case of a health emergency, please contact the appropriate emergency services.

Planned periods of Coach unavailability (e.g. holidays) will be communicated in advance with at least [e.g. 2 weeks] notice.

12. Termination

The Coach reserves the right to terminate this agreement immediately, without refund of fees already paid, in the event of:

- Abusive, threatening, or disrespectful behaviour toward the Coach or other clients
- Fraud or misrepresentation of health or personal circumstances
- Non-payment of fees

The Coach will provide written notice of termination and any outstanding amounts will remain payable.

13. Limitation of Liability

To the fullest extent permitted by law, [BUSINESS NAME] shall not be liable for any indirect, incidental, or consequential damages arising from participation in this coaching programme, including but not limited to injury, loss of income, or failure to achieve a specific outcome.

The Coach's total liability to you under this agreement shall not exceed the total fees paid by you in the [e.g. 3] months preceding the event giving rise to the claim.

14. Governing Law

This agreement is governed by the laws of [COUNTRY / STATE / JURISDICTION]. Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of the courts of [COUNTRY / STATE / JURISDICTION].

15. Amendments

The Coach reserves the right to update these terms with reasonable notice. You will be notified of any material changes by email at least [e.g. 14] days before they take effect. Continued participation in the programme after the effective date constitutes acceptance of the updated terms.

Acknowledgement

By ticking the box below and submitting this form, you confirm that you have read, understood, and agree to all terms outlined in this agreement.

Last updated: [DATE]
[BUSINESS NAME] | [EMAIL ADDRESS] | [WEBSITE URL]`;

export const formPresetOptionsByTemplate: Record<string, FormPresetOption[]> = {
  "check-in": [
    { id: "check-training-performance", label: "Training performance this week", fieldType: "rating-10" },
    { id: "check-nutrition-adherence", label: "Nutrition adherence this week", fieldType: "rating-10" },
    { id: "check-sleep-quality", label: "Sleep quality this week", fieldType: "rating-10" },
    { id: "check-energy-levels", label: "Energy levels this week", fieldType: "rating-10" },
    { id: "check-motivation", label: "Motivation this week", fieldType: "rating-10" },
    { id: "check-stress", label: "Stress levels this week", fieldType: "rating-10" },
    { id: "check-completed-sessions", label: "Did you complete all planned training sessions?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "check-protein-target", label: "Did you hit your protein target most days?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "check-soreness", label: "Any soreness, fatigue, illness, injury, or pain to report?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "check-weight", label: "Current body weight", fieldType: "number", placeholder: "Enter weight" },
    { id: "check-measurements", label: "Body measurements", fieldType: "long-text", required: false, placeholder: "Waist, hips, chest, or other measurements" },
    { id: "check-water", label: "Average water intake in litres", fieldType: "number", required: false, placeholder: "Litres per day" },
    { id: "check-clothes-fitting", label: "How are clothes fitting?", fieldType: "dropdown", options: ["Looser", "Same", "Tighter"], required: false },
    { id: "check-cycle-phase", label: "Cycle phase", fieldType: "dropdown", options: ["Follicular", "Ovulatory", "Luteal", "Menstrual", "Not tracking"], required: false },
    { id: "check-win", label: "Biggest win this week", fieldType: "long-text" },
    { id: "check-questions", label: "Anything else or questions for your coach?", fieldType: "long-text", required: false },
    { id: "check-progress-photos", label: "Progress photos: front, side, and back", fieldType: "photo", required: false }
  ],
  "habit-tracker": [
    { id: "habit-sleep-quality", label: "Sleep quality last night", fieldType: "rating-10" },
    { id: "habit-energy", label: "Energy today", fieldType: "rating-10" },
    { id: "habit-mood", label: "Mood today", fieldType: "rating-10" },
    { id: "habit-stress", label: "Stress today", fieldType: "rating-10" },
    { id: "habit-calorie-target", label: "Did you hit your calorie or macro target?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "habit-planned-meals", label: "Did you complete your planned meals?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "habit-training", label: "Did you complete training today?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "habit-supplements", label: "Did you take your supplements?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "habit-sleep-hours", label: "Sleep hours", fieldType: "number", placeholder: "Hours" },
    { id: "habit-water", label: "Water intake in litres", fieldType: "number", placeholder: "Litres" },
    { id: "habit-steps", label: "Steps", fieldType: "number", required: false, placeholder: "Step count" },
    { id: "habit-bedtime", label: "Bedtime", fieldType: "time", required: false },
    { id: "habit-wake-time", label: "Wake time", fieldType: "time", required: false },
    { id: "habit-unplanned-eating", label: "Unplanned eating details", fieldType: "long-text", required: false }
  ],
  application: [
    { id: "application-full-name", label: "Full name", fieldType: "short-text" },
    { id: "application-location", label: "Location and timezone", fieldType: "short-text" },
    { id: "application-occupation", label: "Occupation", fieldType: "short-text", required: false },
    { id: "application-age", label: "Age", fieldType: "number" },
    { id: "application-goal", label: "Primary goal", fieldType: "dropdown", options: ["Fat loss", "Muscle gain", "Athletic performance", "General health and fitness", "Lifestyle change", "Other"] },
    { id: "application-training-experience", label: "Training consistency", fieldType: "dropdown", options: ["Never", "Less than 1 year", "1 to 3 years", "3 or more years"] },
    { id: "application-days-training", label: "How many days per week can you train?", fieldType: "number" },
    { id: "application-ideal-outcome", label: "What is your ideal outcome?", fieldType: "long-text" },
    { id: "application-eating-habits", label: "Describe your current eating habits", fieldType: "long-text" },
    { id: "application-injuries", label: "Do you have injuries or health concerns?", fieldType: "radio-buttons", options: ["Yes", "No"] },
    { id: "application-injury-details", label: "Injury or health concern details", fieldType: "long-text", required: false },
    { id: "application-start-timing", label: "When are you looking to start?", fieldType: "dropdown", options: ["Immediately", "Within 2 weeks", "Within 30 days", "Not sure yet"] },
    { id: "application-start-date", label: "Preferred start date", fieldType: "date", required: false },
    { id: "application-how-found", label: "How did you find the programme?", fieldType: "checkbox", options: ["Instagram", "Referral", "Google", "Podcast", "Other"], required: false }
  ],
  contact: [
    { id: "contact-name", label: "Your name", fieldType: "short-text" },
    { id: "contact-email", label: "Email address", fieldType: "email" },
    { id: "contact-phone", label: "Phone number", fieldType: "phone", required: false },
    { id: "contact-currently-train", label: "Do you currently train?", fieldType: "radio-buttons", options: ["Yes", "No"], required: false },
    { id: "contact-goal", label: "What are you looking to achieve?", fieldType: "long-text" },
    { id: "contact-start-timing", label: "When would you like to start?", fieldType: "dropdown", options: ["Immediately", "Within 2 weeks", "Within 30 days", "Just asking questions"], required: false },
    { id: "contact-how-heard", label: "How did you hear about us?", fieldType: "checkbox", options: ["Instagram", "Word of mouth", "Google", "Other"], required: false },
    { id: "contact-best-time", label: "Best time to contact you", fieldType: "checkbox", options: ["Morning", "Afternoon", "Evening"], required: false },
    { id: "contact-anything-else", label: "Anything else you want us to know?", fieldType: "long-text", required: false }
  ],
  "terms-and-conditions": [
    {
      id: "terms-agreement-body",
      label: "Online Coaching Agreement and Terms of Service",
      fieldType: "content-block",
      content: termsAndConditionsPresetContent,
      required: false
    },
    {
      id: "terms-confirmation",
      label: "Terms confirmation",
      fieldType: "checkbox",
      options: ["I confirm I have read and agree to the Terms of Service and Coaching Agreement above"]
    }
  ]
};

export function getPresetOptionsForTemplate(templateId: string | null) {
  return formPresetOptionsByTemplate[templateId ?? ""] ?? [];
}

export function buildPresetFields(templateId: string, selectedPresetIds: string[]): FormField[] {
  const selectedPresetIdSet = new Set(selectedPresetIds);

  return getPresetOptionsForTemplate(templateId)
    .filter((preset) => selectedPresetIdSet.has(preset.id))
    .map((preset, index) => ({
      id: `preset-${preset.id}-${index + 1}`,
      type: preset.fieldType,
      label: preset.label,
      placeholder: preset.placeholder,
      content: preset.content,
      required: preset.required ?? true,
      options: preset.options
    }));
}

export function getTemplateName(formId: string | null) {
  if (!formId || formId === "new") {
    return "New Client Intake";
  }

  return formTemplates.find((template) => template.id === formId)?.name ?? "New Client Intake";
}
