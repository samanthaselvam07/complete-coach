import {
  Apple,
  BookOpen,
  ClipboardCheck,
  Database,
  Dumbbell,
  FileText,
  LayoutGrid,
  Library,
  Package,
  Pill,
  Share2,
  UserPlus,
  Users,
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
      { href: "/clients/crm", label: "CRM", icon: Share2 }
    ]
  },
  { href: "/forms", label: "Forms", icon: FileText },
  {
    href: "/packages",
    label: "Packages",
    icon: Package,
    children: [{ href: "/packages", label: "Package Library", icon: Package }]
  },
] satisfies ReadonlyArray<NavigationItem>;

export function isActivePath(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
