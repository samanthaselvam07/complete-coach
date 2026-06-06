import { hash } from "bcryptjs";
import {
  CheckInStatus,
  ClientStatus,
  FormAssignmentStatus,
  FormStatus,
  FormSubmissionStatus,
  FormType,
  LeadStage,
  LeadStatus,
  ExerciseDifficulty,
  LibraryScope,
  MealPlanAssignmentStatus,
  MealPlanTemplateStatus,
  MembershipRole,
  MembershipStatus,
  PackageBillingInterval,
  PackageStatus,
  PrismaClient,
  TrainingProgramAssignmentStatus,
  TrainingProgramTemplateStatus
} from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { clients } from "../fixtures/clients";
import { leads } from "../fixtures/leads";
import { foods } from "../fixtures/nutrition";
import { packages as fixturePackages } from "../fixtures/operations";
import { exercises } from "../fixtures/training";
import {
  seedEducationSupplementationFoundation,
  seedOperationsFoundation
} from "./seed/education-operations";

const databaseUrl = process.env.DATABASE_URL;
const demoEmail = process.env.DEMO_COACH_EMAIL;
const demoPassword = process.env.DEMO_COACH_PASSWORD;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed Complete Coach data.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "complete-coach-demo" },
    update: {},
    create: {
      name: "Complete Coach Demo",
      slug: "complete-coach-demo",
      timezone: "Australia/Melbourne"
    }
  });

  if (!demoEmail || !demoPassword) {
    console.warn("Skipping demo user seed because DEMO_COACH_EMAIL or DEMO_COACH_PASSWORD is unset.");
    return;
  }

  const user = await prisma.user.upsert({
    where: { email: demoEmail.toLowerCase() },
    update: {
      passwordHash: await hash(demoPassword, 12)
    },
    create: {
      email: demoEmail.toLowerCase(),
      name: "Demo Coach",
      passwordHash: await hash(demoPassword, 12),
      authProvider: "credentials",
      authProviderAccountId: demoEmail.toLowerCase()
    }
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: {
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date()
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date()
    }
  });

  const clientStatusMap = {
    active: ClientStatus.ACTIVE,
    archived: ClientStatus.ARCHIVED,
    new: ClientStatus.NEW,
    deactivated: ClientStatus.DEACTIVATED
  } as const;

  for (const client of clients) {
    const [firstName = client.name, ...lastNameParts] = client.name.split(" ");

    await prisma.client.upsert({
      where: { id: `demo-client-${client.id}` },
      update: {
        firstName,
        lastName: lastNameParts.join(" ") || "Client",
        status: clientStatusMap[client.status],
        packageName: client.packageName,
        checkInDay: client.checkInDay,
        compliance: client.compliance,
        externalClientId: `ext_demo_client_${client.id}`,
        primaryCoachUserId: user.id
      },
      create: {
        id: `demo-client-${client.id}`,
        organizationId: organization.id,
        firstName,
        lastName: lastNameParts.join(" ") || "Client",
        status: clientStatusMap[client.status],
        packageName: client.packageName,
        checkInDay: client.checkInDay,
        startDate: new Date(client.startDate),
        latestCheckInAt: new Date(client.latestCheckIn),
        compliance: client.compliance,
        externalClientId: `ext_demo_client_${client.id}`,
        primaryCoachUserId: user.id,
        profile: {
          create: {
            organizationId: organization.id,
            bio: client.bio,
            goals: [client.protocol],
            medicalNotes: null
          }
        }
      }
    });
  }

  await seedFormsCheckInsAndMetrics(organization.id, user.id);
  await seedTrainingFoundation(organization.id, user.id);
  await seedOperationsFoundation(prisma, organization.id, user.id);
  await seedPaymentsFoundation(organization.id, user.id);
  await seedEducationSupplementationFoundation(prisma, organization.id, user.id);

  const leadStatusMap = {
    hot: LeadStatus.HOT,
    warm: LeadStatus.WARM,
    cold: LeadStatus.COLD
  } as const;

  const leadStageMap = {
    "initial-contact": LeadStage.INITIAL_CONTACT,
    consultation: LeadStage.CONSULTATION,
    proposal: LeadStage.PROPOSAL,
    negotiation: LeadStage.NEGOTIATION,
    "closed-won": LeadStage.CLOSED_WON
  } as const;

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { id: `demo-lead-${lead.id}` },
      update: {
        name: lead.name,
        email: lead.email.toLowerCase(),
        phone: lead.phone,
        source: lead.source,
        status: leadStatusMap[lead.status],
        stage: leadStageMap[lead.stage],
        location: lead.location,
        notes: lead.notes,
        daysInStage: lead.daysInStage,
        assignedUserId: user.id
      },
      create: {
        id: `demo-lead-${lead.id}`,
        organizationId: organization.id,
        name: lead.name,
        email: lead.email.toLowerCase(),
        phone: lead.phone,
        source: lead.source,
        status: leadStatusMap[lead.status],
        stage: leadStageMap[lead.stage],
        location: lead.location,
        notes: lead.notes,
        daysInStage: lead.daysInStage,
        assignedUserId: user.id,
        lastContactAt: new Date()
      }
    });
  }
}

async function seedPaymentsFoundation(organizationId: string, userId: string) {
  const billingIntervalMap = {
    monthly: PackageBillingInterval.MONTHLY,
    "one-time": PackageBillingInterval.ONE_TIME
  } as const;

  for (const coachingPackage of fixturePackages) {
    const billingInterval = billingIntervalMap[coachingPackage.billing as keyof typeof billingIntervalMap];

    await prisma.coachingPackage.upsert({
      where: { id: `demo-package-${coachingPackage.id}` },
      update: {
        name: coachingPackage.name,
        description: coachingPackage.description,
        priceAmount: coachingPackage.price * 100,
        currency: "usd",
        billingInterval,
        status: PackageStatus.ACTIVE,
        featuresJson: coachingPackage.features,
        color: coachingPackage.color,
        createdByUserId: userId
      },
      create: {
        id: `demo-package-${coachingPackage.id}`,
        organizationId,
        name: coachingPackage.name,
        description: coachingPackage.description,
        priceAmount: coachingPackage.price * 100,
        currency: "usd",
        billingInterval,
        status: PackageStatus.ACTIVE,
        featuresJson: coachingPackage.features,
        color: coachingPackage.color,
        createdByUserId: userId
      }
    });
  }
}

async function seedFormsCheckInsAndMetrics(organizationId: string, userId: string) {
  const demoClient = clients[0];

  if (!demoClient) {
    return;
  }

  const clientId = `demo-client-${demoClient.id}`;
  const formId = "demo-weekly-check-in-form";
  const formVersionId = "demo-weekly-check-in-form-v1";
  const assignmentId = "demo-weekly-check-in-assignment";
  const submissionId = "demo-weekly-check-in-submission";
  const checkInId = "demo-weekly-check-in";
  const submittedAt = new Date("2026-05-14T08:30:00.000Z");

  const schemaJson = {
    title: "Weekly Performance Check-In",
    description: "Capture weekly bodyweight, energy, recovery, and notes.",
    fields: [
      {
        id: "body-weight",
        type: "number",
        label: "Body weight",
        required: true,
        metricKey: "body_weight",
        metricUnit: "kg",
        exportPolicy: "metric"
      },
      {
        id: "energy",
        type: "scale",
        label: "Energy score",
        required: true,
        metricKey: "energy_score",
        metricUnit: "score",
        exportPolicy: "metric"
      },
      {
        id: "notes",
        type: "long-text",
        label: "Private weekly notes",
        required: false,
        exportPolicy: "private"
      }
    ]
  };

  await prisma.form.upsert({
    where: { id: formId },
    update: {
      name: "Weekly Performance Check-In",
      description: "Capture weekly bodyweight, energy, recovery, and notes.",
      type: FormType.CHECK_IN,
      status: FormStatus.PUBLISHED,
      createdByUserId: userId
    },
    create: {
      id: formId,
      organizationId,
      name: "Weekly Performance Check-In",
      description: "Capture weekly bodyweight, energy, recovery, and notes.",
      type: FormType.CHECK_IN,
      status: FormStatus.PUBLISHED,
      createdByUserId: userId
    }
  });

  await prisma.formVersion.upsert({
    where: {
      formId_versionNumber: {
        formId,
        versionNumber: 1
      }
    },
    update: {
      schemaJson,
      uiJson: { primaryColor: "#6366f1", successMessage: "Thanks for submitting your check-in." },
      publishedAt: new Date("2026-05-01T00:00:00.000Z"),
      createdByUserId: userId
    },
    create: {
      id: formVersionId,
      organizationId,
      formId,
      versionNumber: 1,
      schemaJson,
      uiJson: { primaryColor: "#6366f1", successMessage: "Thanks for submitting your check-in." },
      publishedAt: new Date("2026-05-01T00:00:00.000Z"),
      createdByUserId: userId
    }
  });

  await prisma.form.update({
    where: { id: formId },
    data: { currentVersionId: formVersionId }
  });

  await prisma.formAssignment.upsert({
    where: { id: assignmentId },
    update: {
      formVersionId,
      clientId,
      status: FormAssignmentStatus.SUBMITTED,
      dueAt: new Date("2026-05-14T09:00:00.000Z")
    },
    create: {
      id: assignmentId,
      organizationId,
      formId,
      formVersionId,
      clientId,
      status: FormAssignmentStatus.SUBMITTED,
      dueAt: new Date("2026-05-14T09:00:00.000Z"),
      createdByUserId: userId
    }
  });

  await prisma.formSubmission.upsert({
    where: { id: submissionId },
    update: {
      answersJson: {
        "body-weight": 88.4,
        energy: 8,
        notes: "Feeling strong with mild soreness after lower session."
      },
      status: FormSubmissionStatus.SUBMITTED,
      submittedAt
    },
    create: {
      id: submissionId,
      organizationId,
      formId,
      formVersionId,
      assignmentId,
      clientId,
      submittedByUserId: userId,
      answersJson: {
        "body-weight": 88.4,
        energy: 8,
        notes: "Feeling strong with mild soreness after lower session."
      },
      status: FormSubmissionStatus.SUBMITTED,
      submittedAt
    }
  });

  await prisma.checkIn.upsert({
    where: { id: checkInId },
    update: {
      formSubmissionId: submissionId,
      status: CheckInStatus.PENDING_REVIEW,
      submittedAt,
      summary: "Weight and energy submitted for coach review."
    },
    create: {
      id: checkInId,
      organizationId,
      clientId,
      formSubmissionId: submissionId,
      status: CheckInStatus.PENDING_REVIEW,
      dueAt: new Date("2026-05-14T09:00:00.000Z"),
      submittedAt,
      summary: "Weight and energy submitted for coach review."
    }
  });

  await prisma.clientMeasurement.upsert({
    where: {
      organizationId_sourceType_sourceId_metricKey: {
        organizationId,
        sourceType: "form_submission",
        sourceId: submissionId,
        metricKey: "body_weight"
      }
    },
    update: {
      clientId,
      measuredAt: submittedAt,
      metricValue: 88.4,
      unit: "kg",
      metadata: { fieldId: "body-weight", label: "Body weight" }
    },
    create: {
      organizationId,
      clientId,
      sourceType: "form_submission",
      sourceId: submissionId,
      measuredAt: submittedAt,
      metricKey: "body_weight",
      metricValue: 88.4,
      unit: "kg",
      metadata: { fieldId: "body-weight", label: "Body weight" }
    }
  });

  await prisma.clientMeasurement.upsert({
    where: {
      organizationId_sourceType_sourceId_metricKey: {
        organizationId,
        sourceType: "form_submission",
        sourceId: submissionId,
        metricKey: "energy_score"
      }
    },
    update: {
      clientId,
      measuredAt: submittedAt,
      metricValue: 8,
      unit: "score",
      metadata: { fieldId: "energy", label: "Energy score" }
    },
    create: {
      organizationId,
      clientId,
      sourceType: "form_submission",
      sourceId: submissionId,
      measuredAt: submittedAt,
      metricKey: "energy_score",
      metricValue: 8,
      unit: "score",
      metadata: { fieldId: "energy", label: "Energy score" }
    }
  });
}

async function seedTrainingFoundation(organizationId: string, userId: string) {
  const demoClient = clients[0];

  if (!demoClient) {
    return;
  }

  const globalExercise = exercises[0];
  const privateExercise = exercises[1];

  if (!globalExercise || !privateExercise) {
    return;
  }

  await prisma.exerciseLibraryItem.upsert({
    where: { id: `global-exercise-${globalExercise.id}` },
    update: {
      name: globalExercise.name,
      category: globalExercise.category,
      primaryMuscles: [globalExercise.category],
      difficulty: ExerciseDifficulty.INTERMEDIATE,
      executionCues: ["Maintain strict positions", "Control the eccentric"]
    },
    create: {
      id: `global-exercise-${globalExercise.id}`,
      scope: LibraryScope.GLOBAL,
      name: globalExercise.name,
      category: globalExercise.category,
      equipment: "Barbell",
      primaryMuscles: [globalExercise.category],
      difficulty: ExerciseDifficulty.INTERMEDIATE,
      defaultSets: 4,
      defaultReps: "6-8",
      defaultRestSeconds: 180,
      defaultRpe: 8,
      executionCues: ["Maintain strict positions", "Control the eccentric"]
    }
  });

  const privateExerciseId = `demo-exercise-${privateExercise.id}`;

  await prisma.exerciseLibraryItem.upsert({
    where: { id: privateExerciseId },
    update: {
      organizationId,
      name: privateExercise.name,
      category: privateExercise.category,
      primaryMuscles: [privateExercise.category],
      difficulty: ExerciseDifficulty.INTERMEDIATE,
      createdByUserId: userId
    },
    create: {
      id: privateExerciseId,
      organizationId,
      scope: LibraryScope.PRIVATE,
      name: privateExercise.name,
      category: privateExercise.category,
      equipment: "Dumbbells",
      primaryMuscles: [privateExercise.category],
      secondaryMuscles: ["Shoulders", "Triceps"],
      difficulty: ExerciseDifficulty.INTERMEDIATE,
      defaultSets: 3,
      defaultReps: "8-12",
      defaultRestSeconds: 120,
      defaultRpe: 8,
      executionCues: ["Retract scapula", "Control eccentric phase"],
      createdByUserId: userId
    }
  });

  const templateJson = {
    days: [
      {
        name: "Upper Strength",
        exercises: [
          {
            exerciseId: privateExerciseId,
            exerciseName: privateExercise.name,
            sets: 3,
            reps: "8-12",
            tempo: "3-1-1",
            restSeconds: 120,
            cues: ["Retract scapula", "Control eccentric phase"],
            notes: "Snapshot seed for M5 training persistence."
          }
        ]
      }
    ]
  };
  const templateId = "demo-training-template-strength-foundation";

  await prisma.trainingProgramTemplate.upsert({
    where: { id: templateId },
    update: {
      name: "Strength Foundation",
      description: "Demo persisted training template.",
      goal: "strength",
      durationWeeks: 8,
      status: TrainingProgramTemplateStatus.PUBLISHED,
      templateJson,
      createdByUserId: userId
    },
    create: {
      id: templateId,
      organizationId,
      name: "Strength Foundation",
      description: "Demo persisted training template.",
      goal: "strength",
      durationWeeks: 8,
      status: TrainingProgramTemplateStatus.PUBLISHED,
      templateJson,
      createdByUserId: userId
    }
  });

  await prisma.trainingProgramAssignment.upsert({
    where: { id: "demo-training-assignment-strength-foundation" },
    update: {
      clientId: `demo-client-${demoClient.id}`,
      templateId,
      name: "Strength Foundation",
      status: TrainingProgramAssignmentStatus.ACTIVE,
      snapshotJson: {
        templateId,
        templateName: "Strength Foundation",
        goal: "strength",
        durationWeeks: 8,
        template: templateJson
      }
    },
    create: {
      id: "demo-training-assignment-strength-foundation",
      organizationId,
      clientId: `demo-client-${demoClient.id}`,
      templateId,
      name: "Strength Foundation",
      status: TrainingProgramAssignmentStatus.ACTIVE,
      startsOn: new Date("2026-05-14T00:00:00.000Z"),
      endsOn: new Date("2026-07-09T00:00:00.000Z"),
      snapshotJson: {
        templateId,
        templateName: "Strength Foundation",
        goal: "strength",
        durationWeeks: 8,
        template: templateJson
      },
      createdByUserId: userId
    }
  });

  const globalFood = foods.find((food) => food.id === "basmati-rice") ?? foods[0];
  const privateFood = foods.find((food) => food.id === "chicken-breast") ?? foods[0];

  await prisma.foodLibraryItem.upsert({
    where: { id: "global-food-basmati-rice" },
    update: {
      organizationId: null,
      scope: LibraryScope.GLOBAL,
      name: globalFood.name,
      category: globalFood.category,
      servingSize: globalFood.serving,
      calories: globalFood.calories,
      proteinGrams: globalFood.protein,
      carbsGrams: globalFood.carbs,
      fatGrams: globalFood.fats,
      metadataJson: { source: "fixture-seed", fixtureId: globalFood.id }
    },
    create: {
      id: "global-food-basmati-rice",
      organizationId: null,
      scope: LibraryScope.GLOBAL,
      name: globalFood.name,
      category: globalFood.category,
      servingSize: globalFood.serving,
      calories: globalFood.calories,
      proteinGrams: globalFood.protein,
      carbsGrams: globalFood.carbs,
      fatGrams: globalFood.fats,
      metadataJson: { source: "fixture-seed", fixtureId: globalFood.id },
      createdByUserId: userId
    }
  });

  await prisma.foodLibraryItem.upsert({
    where: { id: "demo-food-chicken-breast" },
    update: {
      organizationId,
      scope: LibraryScope.PRIVATE,
      name: privateFood.name,
      category: privateFood.category,
      servingSize: privateFood.serving,
      calories: privateFood.calories,
      proteinGrams: privateFood.protein,
      carbsGrams: privateFood.carbs,
      fatGrams: privateFood.fats,
      metadataJson: { source: "fixture-seed", fixtureId: privateFood.id },
      createdByUserId: userId
    },
    create: {
      id: "demo-food-chicken-breast",
      organizationId,
      scope: LibraryScope.PRIVATE,
      name: privateFood.name,
      category: privateFood.category,
      servingSize: privateFood.serving,
      calories: privateFood.calories,
      proteinGrams: privateFood.protein,
      carbsGrams: privateFood.carbs,
      fatGrams: privateFood.fats,
      metadataJson: { source: "fixture-seed", fixtureId: privateFood.id },
      createdByUserId: userId
    }
  });

  const mealTemplateJson = {
    days: [
      {
        name: "Training Day",
        meals: [
          {
            meal: "Breakfast",
            foods: [
              {
                foodId: "demo-food-chicken-breast",
                foodName: privateFood.name,
                servingSize: "200g cooked",
                calories: 330,
                proteinGrams: 62,
                carbsGrams: 0,
                fatGrams: 7
              },
              {
                foodId: "global-food-basmati-rice",
                foodName: globalFood.name,
                servingSize: "250g cooked",
                calories: 303,
                proteinGrams: 8,
                carbsGrams: 63,
                fatGrams: 1
              }
            ]
          }
        ]
      }
    ]
  };
  const mealTemplateId = "demo-meal-template-hypertrophy-fuel";

  await prisma.mealPlanTemplate.upsert({
    where: { id: mealTemplateId },
    update: {
      name: "Hypertrophy Fuel",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: MealPlanTemplateStatus.PUBLISHED,
      templateJson: mealTemplateJson,
      createdByUserId: userId
    },
    create: {
      id: mealTemplateId,
      organizationId,
      name: "Hypertrophy Fuel",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: MealPlanTemplateStatus.PUBLISHED,
      templateJson: mealTemplateJson,
      createdByUserId: userId
    }
  });

  await prisma.mealPlanAssignment.upsert({
    where: { id: "demo-meal-assignment-hypertrophy-fuel" },
    update: {
      clientId: `demo-client-${demoClient.id}`,
      templateId: mealTemplateId,
      name: "Hypertrophy Fuel",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: MealPlanAssignmentStatus.ACTIVE,
      snapshotJson: {
        templateId: mealTemplateId,
        templateName: "Hypertrophy Fuel",
        phase: "Hypertrophy",
        targetCalories: 2800,
        proteinGrams: 210,
        carbsGrams: 280,
        fatGrams: 93,
        template: mealTemplateJson
      }
    },
    create: {
      id: "demo-meal-assignment-hypertrophy-fuel",
      organizationId,
      clientId: `demo-client-${demoClient.id}`,
      templateId: mealTemplateId,
      name: "Hypertrophy Fuel",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: MealPlanAssignmentStatus.ACTIVE,
      startsOn: new Date("2026-05-14T00:00:00.000Z"),
      endsOn: null,
      snapshotJson: {
        templateId: mealTemplateId,
        templateName: "Hypertrophy Fuel",
        phase: "Hypertrophy",
        targetCalories: 2800,
        proteinGrams: 210,
        carbsGrams: 280,
        fatGrams: 93,
        template: mealTemplateJson
      },
      createdByUserId: userId
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
