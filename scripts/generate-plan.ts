#!/usr/bin/env npx tsx
/**
 * One-time CLI plan generator.
 * Usage: npx tsx scripts/generate-plan.ts [--user <userId>]
 *
 * Reads fitness metrics from the DB (or uses defaults), generates a 15-week
 * Hal Higdon Novice 2 plan, and writes it to the DB.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { generatePlan } from "../src/lib/plan-generator";
import { validatePlanMileageRamp } from "../src/lib/training";

const prisma = new PrismaClient();

async function main() {
  // Parse optional --user flag
  const userFlagIdx = process.argv.indexOf("--user");
  const explicitUserId = userFlagIdx !== -1 ? process.argv[userFlagIdx + 1] : null;

  // Find target user
  const user = explicitUserId
    ? await prisma.user.findUnique({ where: { id: explicitUserId } })
    : await prisma.user.findFirst({ orderBy: { id: "asc" } });

  if (!user) {
    console.error("No user found in DB. Connect Strava first (run the app and visit /api/strava/auth).");
    process.exit(1);
  }

  console.log(`Generating plan for user ${user.id}`);
  console.log(
    `  Avg pace: ${user.avgPaceSecsPerKm ? Math.floor(user.avgPaceSecsPerKm / 60) + ":" + String(user.avgPaceSecsPerKm % 60).padStart(2, "0") + "/km" : "no data (using 6:30/km default)"}`
  );
  console.log(`  Weekly mileage: ${user.weeklyMileageKm ? user.weeklyMileageKm.toFixed(1) + "km" : "no data (using 12km default)"}`);

  // startDate = next Monday on or after today
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() + daysUntilMonday);
  const startDate = start.toISOString().split("T")[0];
  const raceDate = "2026-08-30";

  console.log(`  Start date: ${startDate}  →  Race date: ${raceDate}`);
  console.log("");

  // Generate
  const plan = generatePlan({
    avgPaceSecsPerKm: user.avgPaceSecsPerKm,
    weeklyMileageKm: user.weeklyMileageKm,
    startDate,
    raceDate,
  });

  // Validate ramp
  const { valid, violations } = validatePlanMileageRamp(plan.weeks);
  if (!valid) {
    console.warn("⚠  Mileage ramp violations (logged, not blocking):", violations);
  }

  // Write to DB in transaction
  await prisma.$transaction(async (tx) => {
    // Remove old plan
    const existing = await tx.trainingPlan.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) {
      await tx.workout.deleteMany({ where: { week: { planId: existing.id } } });
      await tx.trainingWeek.deleteMany({ where: { planId: existing.id } });
      await tx.trainingPlan.delete({ where: { id: existing.id } });
      console.log("Deleted existing plan.");
    }

    // Create new plan
    const newPlan = await tx.trainingPlan.create({
      data: {
        userId: user.id,
        startDate: new Date(startDate),
        raceDate: new Date(raceDate),
        version: 1,
      },
    });

    for (const week of plan.weeks) {
      const trainingWeek = await tx.trainingWeek.create({
        data: {
          planId: newPlan.id,
          weekNumber: week.weekNumber,
          startDate: new Date(week.startDate),
          totalKm: week.totalKm,
          focus: week.focus,
          notes: week.notes,
        },
      });

      for (const workout of week.workouts) {
        await tx.workout.create({
          data: {
            weekId: trainingWeek.id,
            dayOfWeek: workout.dayOfWeek,
            date: new Date(workout.date),
            workoutType: workout.workoutType,
            distanceKm: workout.distanceKm,
            targetPaceMin: workout.targetPaceMin,
            targetPaceMax: workout.targetPaceMax,
            coachNote: workout.coachNote,
            status: "pending",
          },
        });
      }
    }

    console.log(`Plan created (id: ${newPlan.id})`);
  });

  // Print summary
  console.log("\n=== 15-WEEK PLAN SUMMARY ===\n");
  for (const week of plan.weeks) {
    const runs = week.workouts.filter((w) => w.distanceKm);
    const totalKm = week.totalKm.toFixed(1);
    const runSummary = runs.map((w) => `${w.workoutType} ${w.distanceKm}km`).join(", ");
    console.log(`Week ${String(week.weekNumber).padStart(2, " ")}  [${week.focus.padEnd(14)}]  ${totalKm.padStart(5)}km  — ${runSummary}`);
  }

  console.log("\nDone. Open http://localhost:3000/dashboard to view your plan.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
