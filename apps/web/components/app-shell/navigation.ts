import {
  Apple,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Database,
  Dumbbell,
  FileText,
  GraduationCap,
  LayoutGrid,
  Library,
  MessageSquare,
  Package,
  Pill,
  PlusCircle,
  Share2,
  ShieldCheck,
  Settings,
  UserCircle,
  UserPlus,
  Users,
  Users2,
  Utensils
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: ReadonlyArray<{
    href: string;
    label: string;
    icon: LucideIcon;
  }>;
}

export const navigationItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  {
    href: "/training",
    label: "Training",
    icon: Dumbbell,
    children: [
      { href: "/training/programs", label: "Training Programs", icon: Library },
      { href: "/training/exercises", label: "Exercise Database", icon: BookOpen }
    ]
  },
  {
    href: "/nutrition",
    label: "Nutrition",
    icon: Apple,
    children: [
      { href: "/nutrition/meal-plans", label: "Meal Plans", icon: Utensils },
      { href: "/nutrition/food-database", label: "Food Database", icon: Database }
    ]
  },
  { href: "/education", label: "Education", icon: GraduationCap },
  {
    href: "/supplementation",
    label: "Supplementation",
    icon: Pill,
    children: [
      { href: "/supplementation/plans", label: "Supplement Plans", icon: ClipboardCheck },
      { href: "/supplementation/database", label: "Supplement Database", icon: Database }
    ]
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    children: [
      { href: "/clients", label: "Client Roster", icon: Users },
      { href: "/clients/new", label: "New Client Intake", icon: UserPlus },
      { href: "/clients/check-ins", label: "Check-ins", icon: ClipboardCheck },
      { href: "/clients/crm", label: "CRM", icon: Share2 },
      { href: "/messages", label: "Messages", icon: MessageSquare }
    ]
  },
  { href: "/forms", label: "Forms", icon: FileText },
  {
    href: "/social-media",
    label: "Social Media",
    icon: Share2,
    children: [
      { href: "/social-media", label: "Social Hub", icon: Share2 },
      { href: "/social-media/create", label: "Create Post", icon: PlusCircle }
    ]
  },
  { href: "/schedule", label: "Scheduling", icon: CalendarDays },
  { href: "/team-management", label: "Team Management", icon: Users2 },
  { href: "/audit-logs", label: "Audit Log", icon: ShieldCheck },
  {
    href: "/packages",
    label: "Packages",
    icon: Package,
    children: [
      { href: "/packages", label: "Package Library", icon: Package },
      { href: "/packages/create", label: "Create Package", icon: PlusCircle }
    ]
  },
  { href: "/coach-profile", label: "Coach Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings }
] satisfies ReadonlyArray<NavigationItem>;

export function isActivePath(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
