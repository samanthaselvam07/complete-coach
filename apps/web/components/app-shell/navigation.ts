import {
  Apple,
  BookOpen,
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
  Share2,
  ShieldCheck,
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
      { href: "/clients/check-ins", label: "Check-ins", icon: ClipboardCheck },
      { href: "/clients/crm", label: "CRM", icon: Share2 }
    ]
  },
  { href: "/forms", label: "Forms", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/social-media", label: "Social Media", icon: Share2 },
  { href: "/team-management", label: "Team Management", icon: Users2 },
  { href: "/audit-logs", label: "Audit Log", icon: ShieldCheck },
  { href: "/packages", label: "Packages", icon: Package }
] satisfies ReadonlyArray<NavigationItem>;

export function isActivePath(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
