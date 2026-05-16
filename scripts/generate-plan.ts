#!/usr/bin/env npx tsx
/**
 * One-time CLI plan generator.
 * Usage: npx tsx scripts/generate-plan.ts [--user <userId>]
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generatePlan } from "../src/lib/plan-generator";
import { validatePlanMileageRamp } from "../src/lib/training";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const userFlagIdx = process.argv.indexOf("--user");
  const explicitUserId = userFlagIdx !== -1 ? process.argv[userFlagIdx + 1] : null;

  let user;
  if (explicitUserId) {
    const { data } = await db.from("User").select("*").eq("id", explicitUserId).single();
    user = data;
  } else {
    const { data } = await db.from("User").select("*").limit(1).single();
    user = data;
  }

  if (!user) {
    console.error("No user found. Connect Strava first by visiting /api/strava/auth.");
    process.exit(1);
  }

  console.log(`Generating plan for user ${user.id}`);
  console.log(
    `  Avg pace: ${user.avgPaceSecsPerKm ? Math.floor(user.avgPaceSecsPerKm / 60) + ":" + String(user.avgPaceSecsPerKm % 60).padStart(2, "0") + "/km" : "no data (using 6:30/km default)"}`
  );
  console.log(`  Weekly mileage: ${user.weeklyMileageKm ? user.weeklyMileageKm.toFixed(1) + "km" : "no data (using 12km default)"}`);

  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() + daysUntilMonday);
  const startDate = start.toISOString().split("T")[0];
  const raceDate = "2026-08-30";

  console.log(`  Start date: ${startDate}  →  Race date: ${raceDate}\n`);

  const plan = generatePlan({
    avgPaceSecsPerKm: user.avgPaceSecsPerKm,
    weeklyMileageKm: user.weeklyMileageKm,
    startDate,
    raceDate,
  });

  const { valid, violations } = validatePlanMileageRamp(plan.weeks);
  if (!valid) console.warn("⚠  Mileage ramp violations:", violations);

  // Delete existing plan
  const { data: existing } = await db.from("TrainingPlan").select("id").eq("userId", user.id).maybeSingle();
  if (existing) {
    const { data: weeks } = await db.from("TrainingWeek").select("id").eq("planId", existing.id);
    const weekIds = (weeks ?? []).map((w: { id: string }) => w.id);
    if (weekIds.length > 0) await db.from("Workout").delete().in("weekId", weekIds);
    await db.from("TrainingWeek").delete().eq("planId", existing.id);
    await db.from("TrainingPlan").delete().eq("id", existing.id);
    console.log("Deleted existing plan.");
  }

  const planId = crypto.randomUUID();
  await db.from("TrainingPlan").insert({
    id: planId,
    userId: user.id,
    startDate: new Date(startDate).toISOString(),
    raceDate: new Date(raceDate).toISOString(),
    version: 1,
  });

  for (const week of plan.weeks) {
    const weekId = crypto.randomUUID();
    await db.from("TrainingWeek").insert({
      id: weekId,
      planId,
      weekNumber: week.weekNumber,
      startDate: new Date(week.startDate).toISOString(),
      totalKm: week.totalKm,
      focus: week.focus,
      notes: week.notes,
    });

    await db.from("Workout").insert(
      week.workouts.map((w) => ({
        id: crypto.randomUUID(),
        weekId,
        dayOfWeek: w.dayOfWeek,
        date: new Date(w.date).toISOString(),
        workoutType: w.workoutType,
        distanceKm: w.distanceKm,
        targetPaceMin: w.targetPaceMin,
        targetPaceMax: w.targetPaceMax,
        coachNote: w.coachNote,
        status: "pending",
      }))
    );
  }

  console.log(`Plan created (id: ${planId})\n\n=== 15-WEEK PLAN SUMMARY ===\n`);
  for (const week of plan.weeks) {
    const runs = week.workouts.filter((w) => w.distanceKm);
    const totalKm = week.totalKm.toFixed(1);
    const runSummary = runs.map((w) => `${w.workoutType} ${w.distanceKm}km`).join(", ");
    console.log(`Week ${String(week.weekNumber).padStart(2)} [${week.focus.padEnd(14)}] ${totalKm.padStart(5)}km — ${runSummary}`);
  }

  console.log("\nDone. Open your dashboard to view your plan.");
}

main().catch((err) => { console.error(err); process.exit(1); });
