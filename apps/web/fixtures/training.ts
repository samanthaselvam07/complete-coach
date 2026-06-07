import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TrainingStat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

export interface TrainingProgramSummary {
  id: string;
  name: string;
  clients: number;
  duration: string;
  progress: number;
  nextSession: string;
}

export interface RecentWorkout {
  client: string;
  program: string;
  date: string;
  performance: string;
  trend: "up" | "down";
}

export interface AssignedProgram {
  id: string;
  name: string;
  clientName: string;
  activeClientCount: number;
  progress: number;
  weeksTotal: number;
  startDate: string;
  lastEdited: string;
  color: string;
  icon: string;
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  uses: number;
  weeks: number;
  color: string;
  badge: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  rating: number;
  videos: number;
  variations: number;
}

export const trainingStats: TrainingStat[] = [
  { label: "Active Athletes", value: "40", icon: Users, color: "bg-indigo-50 text-indigo-600" },
  { label: "Avg. Compliance", value: "92%", icon: TrendingUp, color: "bg-green-50 text-green-600" },
  { label: "Sessions This Week", value: "156", icon: Calendar, color: "bg-orange-50 text-orange-600" },
  { label: "Hours Trained", value: "2,340", icon: Clock, color: "bg-purple-50 text-purple-600" }
];

export const trainingPrograms: TrainingProgramSummary[] = [
  {
    id: "elite-strength",
    name: "Elite Strength - Phase 2",
    clients: 12,
    duration: "8 weeks",
    progress: 45,
    nextSession: "Tomorrow, 6:00 AM"
  },
  {
    id: "endurance-foundation",
    name: "Endurance Foundation",
    clients: 8,
    duration: "12 weeks",
    progress: 30,
    nextSession: "Today, 4:00 PM"
  },
  {
    id: "olympic-prep",
    name: "Olympic Weightlifting Prep",
    clients: 5,
    duration: "6 weeks",
    progress: 80,
    nextSession: "Wednesday, 8:00 AM"
  },
  {
    id: "mobility-recovery",
    name: "Mobility & Recovery",
    clients: 15,
    duration: "4 weeks",
    progress: 60,
    nextSession: "Friday, 10:00 AM"
  }
];

export const recentWorkouts: RecentWorkout[] = [
  { client: "Marcus Rodriguez", program: "Elite Strength - Phase 2", date: "2h ago", performance: "+8%", trend: "up" },
  { client: "Emma Thompson", program: "Endurance Foundation", date: "4h ago", performance: "+5%", trend: "up" },
  { client: "David Chen", program: "Olympic Weightlifting Prep", date: "Yesterday", performance: "-2%", trend: "down" }
];

export const assignedPrograms: AssignedProgram[] = [
  {
    id: "hypertrophy-phase-ii",
    name: "Hypertrophy Phase II",
    clientName: "Marcus Chen",
    activeClientCount: 5,
    progress: 65,
    weeksTotal: 8,
    startDate: "Oct 15, 2023",
    lastEdited: "Yesterday",
    color: "bg-purple-100 text-purple-700",
    icon: "A"
  },
  {
    id: "functional-power",
    name: "Functional Power",
    clientName: "Sarah Jenkins",
    activeClientCount: 3,
    progress: 45,
    weeksTotal: 12,
    startDate: "Oct 20, 2023",
    lastEdited: "Yesterday",
    color: "bg-orange-100 text-orange-700",
    icon: "B"
  },
  {
    id: "metabolic-reset",
    name: "Metabolic Reset",
    clientName: "David Miller",
    activeClientCount: 2,
    progress: 80,
    weeksTotal: 6,
    startDate: "Sep 28, 2023",
    lastEdited: "2h ago",
    color: "bg-blue-100 text-blue-700",
    icon: "C"
  }
];

export const programTemplates: ProgramTemplate[] = [
  {
    id: "body-recomp-v3",
    name: "Body Recomp v3",
    description: "12-week evidence-based hypertrophy program with cardio integration.",
    uses: 8,
    weeks: 12,
    color: "bg-indigo-600",
    badge: "UPDATED"
  },
  {
    id: "powerbuilding-peak",
    name: "PowerBuilding Peak",
    description: "8-week strength-focused periodization plan integrating dynamic movements.",
    uses: 15,
    weeks: 8,
    color: "bg-purple-600",
    badge: "NEW"
  },
  {
    id: "hybrid-athlete-v2",
    name: "Hybrid Athlete v2",
    description: "10-week concurrent training template that balances strength and aerobic capacity.",
    uses: 12,
    weeks: 10,
    color: "bg-orange-600",
    badge: "TRENDING"
  }
];

export const exerciseCategories = ["All", "Chest", "Back", "Quads", "Hamstrings", "Shoulders", "Abs", "Core"];

export const exercises: Exercise[] = [
  { id: "high-bar-back-squat", name: "High-Bar Back Squat", category: "Quads", rating: 4.8, videos: 3, variations: 5 },
  { id: "incline-db-press", name: "Incline DB Press", category: "Chest", rating: 4.9, videos: 2, variations: 4 },
  { id: "wide-grip-pull-ups", name: "Wide-Grip Pull-Ups", category: "Back", rating: 4.7, videos: 4, variations: 3 },
  { id: "seated-cable-row", name: "Seated Cable Row", category: "Back", rating: 4.6, videos: 2, variations: 6 },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", category: "Quads", rating: 4.9, videos: 3, variations: 4 },
  { id: "hanging-knee-raises", name: "Hanging Knee Raises", category: "Abs", rating: 4.5, videos: 2, variations: 3 },
  { id: "conventional-deadlift", name: "Conventional Deadlift", category: "Hamstrings", rating: 5, videos: 5, variations: 7 },
  { id: "military-push-up", name: "Military Push-Up", category: "Chest", rating: 4.4, videos: 2, variations: 8 }
];

export const muscleGroups = ["Chest", "Back", "Glutes", "Hamstrings", "Shoulders", "Triceps", "Torso", "Quads"];
