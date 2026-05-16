import { prisma } from "@/lib/prisma";
import { generateTrainingPlan } from "@/lib/claude";
import { validatePlanMileageRamp } from "@/lib/training";
import { getSession } from "@/lib/session";
import type { ClaudePlanResponse } from "@/types/plan";

export async function POST(_req: Request): Promise<Response> {
  // 1. Auth check
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Load user from DB
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      stravaAthleteId: true,
      avgPaceSecsPerKm: true,
      weeklyMileageKm: true,
      progressionRate: true,
      optimizationMode: true,
      goalFinishTimeSecs: true,
    },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // 3. Require Strava connection
  if (!user.stravaAthleteId) {
    return Response.json({ error: "Connect Strava first" }, { status: 400 });
  }

  // 4. Compute startDate: next Monday on or after today
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() + daysUntilMonday);
  const startDate = start.toISOString().split("T")[0];

  // 5. Plan constants
  const raceDate = "2026-08-30";
  const totalWeeks = 15;

  // 6. Get last 5 runs for context
  const recentActivities = await prisma.stravaActivity.findMany({
    where: {
      userId: user.id,
      type: "Run",
    },
    orderBy: { startDate: "desc" },
    take: 5,
    select: {
      startDate: true,
      distanceMeters: true,
      avgPaceSecsPerKm: true,
    },
  });

  const recentRuns = recentActivities.map((a) => ({
    date: a.startDate.toISOString().split("T")[0],
    distanceKm: a.distanceMeters / 1000,
    paceSecsPerKm: a.avgPaceSecsPerKm,
  }));

  // 7. Generate plan via Claude
  let plan: ClaudePlanResponse;
  try {
    plan = await generateTrainingPlan({
      avgPaceSecsPerKm: user.avgPaceSecsPerKm,
      weeklyMileageKm: user.weeklyMileageKm,
      progressionRate: user.progressionRate,
      optimizationMode: user.optimizationMode,
      goalFinishTimeSecs: user.goalFinishTimeSecs,
      startDate,
      raceDate,
      totalWeeks,
      recentRuns,
    });
  } catch (err) {
    console.error("[plan/generate] Claude error:", err);
    return Response.json(
      { error: "Failed to generate training plan" },
      { status: 500 }
    );
  }

  // 8. Validate mileage ramp — log but don't block
  const { valid, violations } = validatePlanMileageRamp(plan.weeks);
  if (!valid) {
    console.warn(
      "[plan/generate] Mileage ramp violations detected:",
      violations
    );
  }

  // 9. Write to DB in a transaction
  let planId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing plan for this user
      const existing = await tx.trainingPlan.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (existing) {
        // Delete workouts → weeks → plan (cascade via nested deletes)
        await tx.workout.deleteMany({
          where: { week: { planId: existing.id } },
        });
        await tx.trainingWeek.deleteMany({
          where: { planId: existing.id },
        });
        await tx.trainingPlan.delete({
          where: { id: existing.id },
        });
      }

      // Create new TrainingPlan
      const newPlan = await tx.trainingPlan.create({
        data: {
          userId: user.id,
          startDate: new Date(startDate),
          raceDate: new Date(raceDate),
          version: 1,
        },
      });

      // Create TrainingWeeks and Workouts
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

      return newPlan;
    });

    planId = result.id;
  } catch (err) {
    console.error("[plan/generate] DB write error:", err);
    return Response.json(
      { error: "Failed to save training plan" },
      { status: 500 }
    );
  }

  // 10. Return summary
  return Response.json({ planId, totalWeeks, startDate, raceDate });
}
