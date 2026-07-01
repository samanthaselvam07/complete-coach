import { anatomicalFilterLabels } from "@/lib/training/muscle-volume";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  rating: number;
  videos: number;
  variations: number;
}

export const muscleGroups = anatomicalFilterLabels;
