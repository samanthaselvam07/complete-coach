export interface Food {
  id: string;
  name: string;
  serving: string;
  source: "USDA" | "AUS/NZ" | "EFSA";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  micronutrients?: Record<string, number>;
  category: string;
}
