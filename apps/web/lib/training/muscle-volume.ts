export const anatomyMuscleGroups = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Core",
  "Torso",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Full Body"
] as const;

export type AnatomyMuscleGroup = (typeof anatomyMuscleGroups)[number];

export interface MuscleVolumeRow {
  muscleGroup: AnatomyMuscleGroup;
  sets: number;
  intensity: number;
  riveProperties: FitnessVisualsRiveMuscleProperty[];
}

export interface MuscleVolumeExercise {
  sets: string;
  exerciseName?: string;
  primaryMuscles?: string[];
  bodyPart?: string;
}

export interface MuscleVolumeDay {
  exercises: MuscleVolumeExercise[];
}

export const fitnessVisualsRiveMuscleProperties = [
  "flexorCarpiUlnaris",
  "posteriorDeltoid",
  "triceps",
  "latissimusDorsi",
  "gluteusMaximus",
  "bicepsFemoris",
  "semitendinosus",
  "adductorMagnus",
  "erectorSpinae",
  "pectoralisMajor",
  "deltoids",
  "trapezius",
  "sternocleidomastoid",
  "biceps",
  "brachialis",
  "brachioradialis",
  "flexorCarpiRadialis",
  "extensorCarpiUlnaris",
  "abs",
  "externalObliques",
  "rectusFemoris",
  "vastusLateralis",
  "vastusMedialis",
  "sartorius",
  "gluteusMedius",
  "tibialisAnterior",
  "gastrocnemius",
  "soleus"
] as const;

export type FitnessVisualsRiveMuscleProperty = (typeof fitnessVisualsRiveMuscleProperties)[number];

export interface AnatomicalFilterOption {
  label: string;
  group: AnatomyMuscleGroup;
  riveProperties: FitnessVisualsRiveMuscleProperty[];
}

export const anatomicalFilterOptions = [
  { label: "Pectoralis Major", group: "Chest", riveProperties: ["pectoralisMajor"] },
  { label: "Latissimus Dorsi", group: "Back", riveProperties: ["latissimusDorsi"] },
  { label: "Trapezius", group: "Back", riveProperties: ["trapezius"] },
  { label: "Erector Spinae", group: "Back", riveProperties: ["erectorSpinae"] },
  { label: "Deltoids", group: "Shoulders", riveProperties: ["deltoids"] },
  { label: "Posterior Deltoid", group: "Shoulders", riveProperties: ["posteriorDeltoid"] },
  { label: "Biceps", group: "Biceps", riveProperties: ["biceps"] },
  { label: "Brachialis", group: "Biceps", riveProperties: ["brachialis"] },
  { label: "Brachioradialis", group: "Biceps", riveProperties: ["brachioradialis"] },
  { label: "Triceps", group: "Triceps", riveProperties: ["triceps"] },
  { label: "Abs", group: "Core", riveProperties: ["abs"] },
  { label: "External Obliques", group: "Core", riveProperties: ["externalObliques"] },
  { label: "Rectus Femoris", group: "Quads", riveProperties: ["rectusFemoris"] },
  { label: "Vastus Lateralis", group: "Quads", riveProperties: ["vastusLateralis"] },
  { label: "Vastus Medialis", group: "Quads", riveProperties: ["vastusMedialis"] },
  { label: "Sartorius", group: "Quads", riveProperties: ["sartorius"] },
  { label: "Adductor Magnus", group: "Quads", riveProperties: ["adductorMagnus"] },
  { label: "Gluteus Medius", group: "Glutes", riveProperties: ["gluteusMedius"] },
  { label: "Gluteus Maximus", group: "Glutes", riveProperties: ["gluteusMaximus"] },
  { label: "Biceps Femoris", group: "Hamstrings", riveProperties: ["bicepsFemoris"] },
  { label: "Semitendinosus", group: "Hamstrings", riveProperties: ["semitendinosus"] },
  { label: "Gastrocnemius", group: "Calves", riveProperties: ["gastrocnemius"] },
  { label: "Soleus", group: "Calves", riveProperties: ["soleus"] },
  { label: "Tibialis Anterior", group: "Calves", riveProperties: ["tibialisAnterior"] },
  { label: "Sternocleidomastoid", group: "Torso", riveProperties: ["sternocleidomastoid"] },
  { label: "Flexor Carpi Radialis", group: "Torso", riveProperties: ["flexorCarpiRadialis"] },
  { label: "Flexor Carpi Ulnaris", group: "Torso", riveProperties: ["flexorCarpiUlnaris"] },
  { label: "Extensor Carpi Ulnaris", group: "Torso", riveProperties: ["extensorCarpiUlnaris"] }
] as const satisfies AnatomicalFilterOption[];

export const anatomicalFilterLabels = anatomicalFilterOptions.map((option) => option.label);

const anatomicalFilterOptionMap = new Map(anatomicalFilterOptions.map((option) => [normalizeOptionKey(option.label), option]));

const fitnessVisualsRiveMuscleMap: Partial<Record<AnatomyMuscleGroup, FitnessVisualsRiveMuscleProperty[]>> = {
  Chest: ["pectoralisMajor"],
  Shoulders: ["deltoids", "posteriorDeltoid"],
  Back: ["trapezius", "latissimusDorsi", "erectorSpinae"],
  Biceps: ["biceps", "brachialis", "brachioradialis"],
  Triceps: ["triceps"],
  Core: ["abs", "externalObliques"],
  Torso: ["abs", "externalObliques"],
  Quads: ["rectusFemoris", "vastusLateralis", "vastusMedialis", "sartorius", "adductorMagnus"],
  Hamstrings: ["bicepsFemoris", "semitendinosus"],
  Glutes: ["gluteusMedius", "gluteusMaximus"],
  Calves: ["gastrocnemius", "soleus", "tibialisAnterior"],
  "Full Body": [
    "pectoralisMajor",
    "deltoids",
    "posteriorDeltoid",
    "trapezius",
    "latissimusDorsi",
    "erectorSpinae",
    "biceps",
    "brachialis",
    "brachioradialis",
    "triceps",
    "abs",
    "externalObliques",
    "rectusFemoris",
    "vastusLateralis",
    "vastusMedialis",
    "sartorius",
    "adductorMagnus",
    "gluteusMedius",
    "gluteusMaximus",
    "bicepsFemoris",
    "semitendinosus",
    "gastrocnemius",
    "soleus",
    "tibialisAnterior"
  ]
};

export function calculateTrainingDayMuscleVolume(day: MuscleVolumeDay): MuscleVolumeRow[] {
  const setTotals = new Map<AnatomyMuscleGroup, number>(anatomyMuscleGroups.map((muscleGroup) => [muscleGroup, 0]));
  const rivePropertiesByGroup = new Map<AnatomyMuscleGroup, Set<FitnessVisualsRiveMuscleProperty>>(
    anatomyMuscleGroups.map((muscleGroup) => [muscleGroup, new Set<FitnessVisualsRiveMuscleProperty>()])
  );

  day.exercises.forEach((exercise) => {
    const sets = parseExerciseSetVolume(exercise.sets);

    if (sets <= 0) {
      return;
    }

    resolveExerciseMuscles(exercise).forEach((muscleGroup) => {
      setTotals.set(muscleGroup, (setTotals.get(muscleGroup) ?? 0) + sets);
    });

    resolveExerciseRiveProperties(exercise).forEach(({ muscleGroup, riveProperties }) => {
      const groupProperties = rivePropertiesByGroup.get(muscleGroup);

      riveProperties.forEach((riveProperty) => groupProperties?.add(riveProperty));
    });
  });

  const maxSets = Math.max(...Array.from(setTotals.values()), 0);

  return anatomyMuscleGroups.map((muscleGroup) => {
    const sets = setTotals.get(muscleGroup) ?? 0;

    return {
      muscleGroup,
      sets,
      intensity: maxSets > 0 ? sets / maxSets : 0,
      riveProperties: Array.from(rivePropertiesByGroup.get(muscleGroup) ?? [])
    };
  });
}

export function getActiveRiveMuscleProperties(volumeRows: MuscleVolumeRow[]) {
  const activeProperties = volumeRows.flatMap((row) => {
    if (row.sets <= 0) {
      return [];
    }

    return row.riveProperties.length > 0 ? row.riveProperties : (fitnessVisualsRiveMuscleMap[row.muscleGroup] ?? []);
  });

  return Array.from(new Set(activeProperties));
}

export function parseExerciseSetVolume(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export function resolveExerciseMuscles(exercise: MuscleVolumeExercise): AnatomyMuscleGroup[] {
  const candidates = [...(exercise.primaryMuscles ?? []), exercise.bodyPart].filter(Boolean);
  const mappedMuscles = candidates
    .map((muscle) => normalizeMuscleGroup(muscle))
    .filter((muscleGroup): muscleGroup is AnatomyMuscleGroup => Boolean(muscleGroup));

  if (mappedMuscles.length > 0) {
    return Array.from(new Set(mappedMuscles));
  }

  return inferMuscleGroupsFromExerciseName(exercise.exerciseName);
}

function resolveExerciseRiveProperties(exercise: MuscleVolumeExercise) {
  const candidates = [...(exercise.primaryMuscles ?? []), exercise.bodyPart].filter((candidate): candidate is string => Boolean(candidate));
  const resolvedProperties = candidates.flatMap((candidate) => {
    const exactOption = anatomicalFilterOptionMap.get(normalizeOptionKey(candidate));
    const muscleGroup = normalizeMuscleGroup(candidate);

    if (exactOption) {
      return [{ muscleGroup: exactOption.group, riveProperties: [...exactOption.riveProperties] }];
    }

    if (!muscleGroup) {
      return [];
    }

    return [{ muscleGroup, riveProperties: fitnessVisualsRiveMuscleMap[muscleGroup] ?? [] }];
  });

  if (resolvedProperties.length === 0) {
    return inferMuscleGroupsFromExerciseName(exercise.exerciseName).map((muscleGroup) => ({
      muscleGroup,
      riveProperties: fitnessVisualsRiveMuscleMap[muscleGroup] ?? []
    }));
  }

  const dedupedByGroup = new Map<AnatomyMuscleGroup, Set<FitnessVisualsRiveMuscleProperty>>();

  resolvedProperties.forEach(({ muscleGroup, riveProperties }) => {
    const groupProperties = dedupedByGroup.get(muscleGroup) ?? new Set<FitnessVisualsRiveMuscleProperty>();

    riveProperties.forEach((riveProperty) => groupProperties.add(riveProperty));
    dedupedByGroup.set(muscleGroup, groupProperties);
  });

  return Array.from(dedupedByGroup, ([muscleGroup, riveProperties]) => ({
    muscleGroup,
    riveProperties: Array.from(riveProperties)
  }));
}

export function normalizeMuscleGroup(value?: string | null): AnatomyMuscleGroup | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  const aliases: Record<string, AnatomyMuscleGroup> = {
    abs: "Core",
    abdominal: "Core",
    abdominals: "Core",
    arms: "Biceps",
    bicep: "Biceps",
    biceps: "Biceps",
    calves: "Calves",
    calf: "Calves",
    chest: "Chest",
    core: "Core",
    forearm: "Torso",
    forearms: "Torso",
    glute: "Glutes",
    glutes: "Glutes",
    hamstring: "Hamstrings",
    hamstrings: "Hamstrings",
    hip: "Glutes",
    hips: "Glutes",
    lats: "Back",
    legs: "Quads",
    "lower body": "Quads",
    lowerbody: "Quads",
    lower_back: "Back",
    lowerback: "Back",
    posterior_chain: "Hamstrings",
    posteriorchain: "Hamstrings",
    "posterior chain": "Hamstrings",
    quads: "Quads",
    quadriceps: "Quads",
    "upper body": "Back",
    upperbody: "Back",
    shoulders: "Shoulders",
    torso: "Torso",
    triceps: "Triceps",
    "full body": "Full Body",
    fullbody: "Full Body"
  };

  const anatomicalFilterOption = anatomicalFilterOptionMap.get(normalizedValue);

  if (anatomicalFilterOption) {
    return anatomicalFilterOption.group;
  }

  return aliases[normalizedValue] ?? null;
}

function inferMuscleGroupsFromExerciseName(value?: string | null): AnatomyMuscleGroup[] {
  const normalizedValue = value?.trim().toLowerCase() ?? "";

  if (!normalizedValue) {
    return [];
  }

  const rules: Array<{ pattern: RegExp; groups: AnatomyMuscleGroup[] }> = [
    { pattern: /\b(squat|lunge|split squat|leg press|step[- ]?up|leg extension)\b/, groups: ["Quads", "Glutes"] },
    { pattern: /\b(deadlift|romanian deadlift|rdl|hip thrust|glute bridge|leg curl|hamstring curl)\b/, groups: ["Hamstrings", "Glutes"] },
    { pattern: /\b(bench|chest press|push[- ]?up|pec|flye|fly)\b/, groups: ["Chest", "Triceps", "Shoulders"] },
    { pattern: /\b(row|pulldown|pull[- ]?up|chin[- ]?up|lat|face pull)\b/, groups: ["Back", "Biceps"] },
    { pattern: /\b(shoulder press|overhead press|lateral raise|front raise|rear delt)\b/, groups: ["Shoulders"] },
    { pattern: /\b(curl|bicep)\b/, groups: ["Biceps"] },
    { pattern: /\b(tricep|pushdown|skull crusher|dip)\b/, groups: ["Triceps"] },
    { pattern: /\b(crunch|plank|sit[- ]?up|leg raise|pallof|core|ab)\b/, groups: ["Core"] },
    { pattern: /\b(calf|calves)\b/, groups: ["Calves"] }
  ];

  return rules.find((rule) => rule.pattern.test(normalizedValue))?.groups ?? [];
}

function normalizeOptionKey(value: string) {
  return value.trim().toLowerCase();
}
