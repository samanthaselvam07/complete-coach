import { describe, expect, it } from "vitest";

import {
  calculateTrainingDayMuscleVolume,
  getActiveRiveMuscleProperties,
  normalizeMuscleGroup,
  parseExerciseSetVolume,
  resolveExerciseMuscles
} from "@/lib/training/muscle-volume";

describe("training muscle volume model", () => {
  it("totals set volume by normalized muscle group for a training day", () => {
    const volumeRows = calculateTrainingDayMuscleVolume({
      exercises: [
        { sets: "4", primaryMuscles: ["Quads", "Glutes"] },
        { sets: "3", primaryMuscles: ["Hamstrings"] },
        { sets: "2", bodyPart: "Lats" },
        { sets: "bad", primaryMuscles: ["Chest"] },
        { sets: "1", primaryMuscles: ["Unknown"] }
      ]
    });

    expect(volumeRows.find((row) => row.muscleGroup === "Quads")).toMatchObject({ sets: 4, intensity: 1 });
    expect(volumeRows.find((row) => row.muscleGroup === "Glutes")).toMatchObject({ sets: 4, intensity: 1 });
    expect(volumeRows.find((row) => row.muscleGroup === "Hamstrings")).toMatchObject({ sets: 3, intensity: 0.75 });
    expect(volumeRows.find((row) => row.muscleGroup === "Back")).toMatchObject({ sets: 2, intensity: 0.5 });
    expect(volumeRows.find((row) => row.muscleGroup === "Chest")).toMatchObject({ sets: 0, intensity: 0 });
  });

  it("parses sets and resolves muscle aliases without duplicate group entries", () => {
    expect(parseExerciseSetVolume("5 sets")).toBe(5);
    expect(parseExerciseSetVolume("0")).toBe(0);
    expect(parseExerciseSetVolume("")).toBe(0);
    expect(normalizeMuscleGroup("quadriceps")).toBe("Quads");
    expect(normalizeMuscleGroup("abs")).toBe("Core");
    expect(normalizeMuscleGroup("not tagged")).toBeNull();
    expect(resolveExerciseMuscles({ sets: "3", primaryMuscles: ["Quads", "quadriceps"], bodyPart: "Legs" })).toEqual(["Quads"]);
  });

  it("maps active Complete Coach muscle groups to the Fitness Visuals Rive muscle inputs", () => {
    const volumeRows = calculateTrainingDayMuscleVolume({
      exercises: [
        { sets: "4", primaryMuscles: ["Quads"] },
        { sets: "3", primaryMuscles: ["Hamstrings", "Triceps"] },
        { sets: "3", primaryMuscles: ["Chest"] },
        { sets: "2", primaryMuscles: ["Core"] },
        { sets: "0", primaryMuscles: ["Calves"] }
      ]
    });

    expect(getActiveRiveMuscleProperties(volumeRows)).toEqual([
      "pectoralisMajor",
      "triceps",
      "abs",
      "externalObliques",
      "rectusFemoris",
      "vastusLateralis",
      "vastusMedialis",
      "sartorius",
      "adductorMagnus",
      "bicepsFemoris",
      "semitendinosus"
    ]);
  });

  it("maps exact anatomical filter selections to exact Fitness Visuals Rive muscles", () => {
    const volumeRows = calculateTrainingDayMuscleVolume({
      exercises: [
        { sets: "3", primaryMuscles: ["Pectoralis Major", "Latissimus Dorsi", "Rectus Femoris"] }
      ]
    });

    expect(getActiveRiveMuscleProperties(volumeRows)).toEqual([
      "pectoralisMajor",
      "latissimusDorsi",
      "rectusFemoris"
    ]);
  });
});
