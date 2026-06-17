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
  micronutrients?: Record<string, number>;
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
    micronutrients: {
      vitaminB1: 0.07,
      vitaminB2: 0.12,
      vitaminB3: 13.7,
      vitaminB5: 1.5,
      vitaminB6: 0.6,
      vitaminB12: 0.3,
      folate: 4,
      vitaminA: 13,
      vitaminC: 0,
      vitaminD: 1,
      vitaminE: 0.3,
      vitaminK: 0.3,
      calcium: 15,
      copper: 0.04,
      iron: 1,
      magnesium: 29,
      manganese: 0.02,
      phosphorus: 228,
      potassium: 256,
      selenium: 27.6,
      sodium: 74,
      zinc: 1,
      cystine: 0.35,
      histidine: 0.93,
      isoleucine: 1.62,
      leucine: 2.62,
      lysine: 2.94,
      methionine: 0.85,
      phenylalanine: 1.25,
      threonine: 1.39,
      tryptophan: 0.36,
      tyrosine: 1.16,
      valine: 1.66,
      monounsaturated: 1.2,
      polyunsaturated: 0.8,
      omega3: 0.04,
      ala: 0.03,
      dha: 0.01,
      epa: 0,
      omega6: 0.7,
      aa: 0.03,
      la: 0.65,
      saturated: 1,
      transFats: 0,
      cholesterol: 85
    },
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
    micronutrients: {
      vitaminB1: 0.02,
      vitaminB2: 0.01,
      vitaminB3: 1.6,
      vitaminB5: 0.4,
      vitaminB6: 0.05,
      folate: 8,
      calcium: 3,
      copper: 0.07,
      iron: 0.2,
      magnesium: 12,
      manganese: 0.5,
      phosphorus: 43,
      potassium: 35,
      selenium: 7.5,
      sodium: 1,
      zinc: 0.5,
      starch: 24,
      sugars: 0.1,
      addedSugars: 0
    },
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
    micronutrients: {
      vitaminB1: 0.07,
      vitaminB2: 0.13,
      vitaminB3: 1.7,
      vitaminB5: 1.4,
      vitaminB6: 0.3,
      folate: 81,
      vitaminA: 7,
      vitaminC: 10,
      vitaminE: 2.1,
      vitaminK: 21,
      calcium: 12,
      copper: 0.19,
      iron: 0.6,
      magnesium: 29,
      manganese: 0.1,
      phosphorus: 52,
      potassium: 485,
      selenium: 0.4,
      sodium: 7,
      zinc: 0.6,
      monounsaturated: 9.8,
      polyunsaturated: 1.8,
      omega3: 0.11,
      ala: 0.11,
      omega6: 1.7,
      la: 1.7,
      saturated: 2.1,
      transFats: 0,
      cholesterol: 0,
      sugars: 0.7,
      addedSugars: 0
    },
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
    micronutrients: {
      vitaminB1: 0.46,
      vitaminB2: 0.16,
      vitaminB3: 1.1,
      vitaminB5: 1.3,
      vitaminB6: 0.12,
      folate: 32,
      vitaminE: 0.4,
      vitaminK: 2,
      calcium: 54,
      copper: 0.63,
      iron: 4.7,
      magnesium: 177,
      manganese: 4.9,
      phosphorus: 523,
      potassium: 429,
      selenium: 28.9,
      sodium: 2,
      zinc: 4,
      cystine: 0.41,
      histidine: 0.41,
      isoleucine: 0.69,
      leucine: 1.28,
      lysine: 0.7,
      methionine: 0.31,
      phenylalanine: 0.9,
      threonine: 0.5,
      tryptophan: 0.23,
      tyrosine: 0.57,
      valine: 0.94,
      monounsaturated: 2.2,
      polyunsaturated: 2.5,
      omega3: 0.11,
      ala: 0.11,
      omega6: 2.4,
      la: 2.4,
      saturated: 1.2,
      transFats: 0,
      cholesterol: 0,
      starch: 57,
      sugars: 1,
      addedSugars: 0
    },
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
    micronutrients: {
      vitaminB2: 0.4,
      vitaminB12: 0.6,
      calcium: 120,
      phosphorus: 95,
      potassium: 160,
      sodium: 60,
      cystine: 0.55,
      histidine: 0.48,
      isoleucine: 1.8,
      leucine: 3,
      lysine: 2.6,
      methionine: 0.6,
      phenylalanine: 0.9,
      threonine: 1.8,
      tryptophan: 0.45,
      tyrosine: 0.8,
      valine: 1.6,
      cholesterol: 10
    },
    category: "Proteins"
  }
];
