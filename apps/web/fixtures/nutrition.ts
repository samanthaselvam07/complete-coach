import { Apple, Flame, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NutritionStat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

export interface NutritionPlan {
  id: string;
  name: string;
  clients: number;
  calories: string;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  adherence: number;
}

export interface MealLog {
  client: string;
  meal: string;
  calories: number;
  time: string;
  status: "on-track" | "over" | "under";
}

export interface MealAssignment {
  id: string;
  clientName: string;
  planName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  started: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Food {
  id: string;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  category: string;
}

export const nutritionStats: NutritionStat[] = [
  { label: "Active Meal Plans", value: "53", icon: Apple, color: "bg-green-50 text-green-600" },
  { label: "Avg. Adherence", value: "89%", icon: Flame, color: "bg-orange-50 text-orange-600" },
  { label: "Meals Logged Today", value: "428", icon: Users, color: "bg-indigo-50 text-indigo-600" },
  { label: "Compliance vs Last Week", value: "+12%", icon: TrendingUp, color: "bg-purple-50 text-purple-600" }
];

export const nutritionPlans: NutritionPlan[] = [
  {
    id: "high-performance-macro-split",
    name: "High Performance Macro Split",
    clients: 18,
    calories: "2800-3200",
    macros: { protein: 40, carbs: 35, fats: 25 },
    adherence: 88
  },
  {
    id: "lean-muscle-building",
    name: "Lean Muscle Building",
    clients: 12,
    calories: "2400-2800",
    macros: { protein: 35, carbs: 40, fats: 25 },
    adherence: 92
  },
  {
    id: "endurance-athlete-fuel",
    name: "Endurance Athlete Fuel",
    clients: 9,
    calories: "3000-3500",
    macros: { protein: 25, carbs: 55, fats: 20 },
    adherence: 85
  },
  {
    id: "body-recomposition",
    name: "Body Recomposition",
    clients: 14,
    calories: "2000-2400",
    macros: { protein: 45, carbs: 30, fats: 25 },
    adherence: 90
  }
];

export const recentMealLogs: MealLog[] = [
  { client: "Sarah Martinez", meal: "Breakfast", calories: 620, time: "1h ago", status: "on-track" },
  { client: "Alex Johnson", meal: "Post-Workout", calories: 450, time: "2h ago", status: "on-track" },
  { client: "Emily Davis", meal: "Lunch", calories: 780, time: "3h ago", status: "over" },
  { client: "Michael Lee", meal: "Dinner", calories: 550, time: "5h ago", status: "under" }
];

export const mealAssignments: MealAssignment[] = [
  {
    id: "james-hypertrophy",
    clientName: "James S. Miller",
    planName: "Hypertrophy Phase II",
    calories: 2800,
    protein: 210,
    carbs: 280,
    fats: 93,
    started: "Oct 15, 2023"
  },
  {
    id: "sarah-shred",
    clientName: "Sarah Jenkins",
    planName: "Summer Shred v1",
    calories: 1800,
    protein: 140,
    carbs: 150,
    fats: 60,
    started: "Oct 12, 2023"
  }
];

export const mealTemplates: MealTemplate[] = [
  {
    id: "high-protein-breakfast-bowl",
    name: "High-Protein Breakfast Bowl",
    description: "Protein-rich morning meal",
    calories: 520,
    protein: 35,
    carbs: 48,
    fats: 18
  },
  {
    id: "performance-pre-bed-meal",
    name: "Performance Pre-Bed Meal",
    description: "Slow-digesting protein meal",
    calories: 380,
    protein: 28,
    carbs: 32,
    fats: 14
  },
  {
    id: "classic-optimization-bowl",
    name: "Classic Optimization Bowl",
    description: "Balanced macro meal",
    calories: 650,
    protein: 42,
    carbs: 58,
    fats: 22
  }
];

export const foodCategories = ["All Ingredients", "Proteins", "Carbs", "Fats", "Custom"];

export const foods: Food[] = [
  {
    id: "chicken-breast",
    name: "Chicken Breast",
    serving: "100g, Boneless",
    calories: 165,
    protein: 31,
    carbs: 0,
    fats: 3.6,
    fibre: 0,
    category: "Proteins"
  },
  {
    id: "basmati-rice",
    name: "Basmati Rice",
    serving: "100g, Long Grain",
    calories: 121,
    protein: 3,
    carbs: 25,
    fats: 0.4,
    fibre: 0.4,
    category: "Carbs"
  },
  {
    id: "raw-avocado",
    name: "Raw Avocado",
    serving: "100g",
    calories: 160,
    protein: 2,
    carbs: 9,
    fats: 15,
    fibre: 7,
    category: "Fats"
  },
  {
    id: "boiled-oats",
    name: "Boiled Oats",
    serving: "100g",
    calories: 389,
    protein: 13,
    carbs: 66,
    fats: 7,
    fibre: 10.6,
    category: "Carbs"
  },
  {
    id: "whey-isolate",
    name: "Whey Isolate",
    serving: "30g Scoop",
    calories: 120,
    protein: 27,
    carbs: 1,
    fats: 0.5,
    fibre: 0,
    category: "Proteins"
  }
];
