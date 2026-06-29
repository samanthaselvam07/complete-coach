export const resourceCategories = ["Training", "Nutrition", "Recovery", "Mindset"] as const;

export const distributionOptions = [
  { id: "assign", label: "Assign to Clients" },
  { id: "library", label: "Add to Library" },
  { id: "morning", label: "Morning" },
  { id: "anytime", label: "Anytime" }
] as const;
