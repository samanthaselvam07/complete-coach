import { AlignJustify, AlignLeft, Calendar, Check, CheckSquare, ChevronDown, Image, Mail, Phone } from "lucide-react";
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
  required: boolean;
  options?: string[];
}

export interface FormElementDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
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
  { id: "multiple-choice", label: "Multiple Choice", icon: CheckSquare, color: "bg-blue-50 text-blue-600" },
  { id: "phone", label: "Phone Number", icon: Phone, color: "bg-green-50 text-green-600" },
  { id: "email", label: "Email", icon: Mail, color: "bg-purple-50 text-purple-600" },
  { id: "date", label: "Date of Birth", icon: Calendar, color: "bg-red-50 text-red-600" },
  { id: "photo", label: "Photo Upload", icon: Image, color: "bg-yellow-50 text-yellow-600" },
  { id: "dropdown", label: "Dropdown", icon: ChevronDown, color: "bg-teal-50 text-teal-600" },
  { id: "checkbox", label: "Checkbox", icon: Check, color: "bg-pink-50 text-pink-600" }
];

export function getTemplateName(formId: string | null) {
  if (!formId || formId === "new") {
    return "New Client Intake";
  }

  return formTemplates.find((template) => template.id === formId)?.name ?? "New Client Intake";
}
