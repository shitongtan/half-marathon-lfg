import { db } from "@/lib/supabase";
import { generatePlan } from "@/lib/plan-generator";
import { validatePlanMileageRamp } from "@/lib/training";
import { getSession } from "@/lib/session";

export async function POST(): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await db
    .from("User")
    .select("id, stravaAthleteId, avgPaceSecsPerKm, weeklyMileageKm")
    .eq("id", session.userId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (!user.stravaAthleteId) return Response.json({ error: "Connect Strava first" }, { status: 400 });

  const { data: longestRunRow } = await db
    .from("StravaActivity")
    .select("distanceMeters")
    .eq("userId", user.id)
    .eq("type", "Run")
    .order("distanceMeters", { ascending: false })
    .limit(1)
    .maybeSingle();

  const longestRecentRunKm = longestRunRow ? longestRunRow.distanceMeters / 1000 : null;

  // Estimate threshold pace from fastest medium-distance runs (2–15km).
  // These efforts are most likely to reflect lactate-threshold intensity.
  const { data: fastRunRows } = await db
    .from("StravaActivity")
    .select("avgPaceSecsPerKm")
    .eq("userId", user.id)
    .eq("type", "Run")
    .gte("distanceMeters", 2000)
    .lte("distanceMeters", 15000)
    .not("avgPaceSecsPerKm", "is", null)
    .order("avgPaceSecsPerKm", { ascending: true })
    .limit(3);

  let thresholdPaceSecsPerKm: number | null = null;
  const fastPaces = (fastRunRows ?? []).map((r) => r.avgPaceSecsPerKm as number).filter(Boolean);
  if (fastPaces.length > 0) {
    const candidate = Math.round(fastPaces.reduce((s, p) => s + p, 0) / fastPaces.length);
    // Only use if at least 5% faster than avg pace (otherwise it's just another easy run)
    const avgPace = user.avgPaceSecsPerKm ?? 420;
    if (candidate < avgPace * 0.95) {
      thresholdPaceSecsPerKm = candidate;
    }
  }

  // Start date: next Monday on or after today
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() + daysUntilMonday);
  const startDate = start.toISOString().split("T")[0];
  const raceDate = "2026-08-30";

  // Calculate remaining weeks from the new start date to race day
  const raceDateObj = new Date(raceDate + "T00:00:00.000Z");
  const startDateObj = new Date(startDate + "T00:00:00.000Z");
  const daysToRace = (raceDateObj.getTime() - startDateObj.getTime()) / (24 * 3600 * 1000);
  const remainingWeeks = Math.min(15, Math.max(1, Math.ceil(daysToRace / 7)));
  const startWeekIndex = 15 - remainingWeeks;

  const plan = generatePlan({
    avgPaceSecsPerKm: user.avgPaceSecsPerKm,
    weeklyMileageKm: user.weeklyMileageKm,
    longestRecentRunKm,
    thresholdPaceSecsPerKm,
    startDate,
    raceDate,
    totalWeeks: remainingWeeks,
    startWeekIndex,
  });

  const { valid, violations } = validatePlanMileageRamp(plan.weeks);
  if (!valid) console.warn("[plan/generate] Mileage ramp violations:", violations);

  try {
    const { data: existing } = await db
      .from("TrainingPlan")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    let planId: string;

    if (existing) {
      planId = existing.id;

      // Delete only future workouts (today onwards), leaving past ones intact
      const todayISO = today.toISOString().split("T")[0] + "T00:00:00.000Z";
      const { data: allWeeks } = await db.from("TrainingWeek").select("id").eq("planId", planId);
      const allWeekIds = (allWeeks ?? []).map((w) => w.id);

      if (allWeekIds.length > 0) {
        await db.from("Workout").delete().in("weekId", allWeekIds).gte("date", todayISO);

        // Delete weeks that are now empty (all their workouts were in the future)
        const { data: remainingWorkouts } = await db
          .from("Workout")
          .select("weekId")
          .in("weekId", allWeekIds);
        const weeksWithWorkouts = new Set((remainingWorkouts ?? []).map((w) => w.weekId));
        const emptyWeekIds = allWeekIds.filter((id) => !weeksWithWorkouts.has(id));
        if (emptyWeekIds.length > 0) {
          await db.from("TrainingWeek").delete().in("id", emptyWeekIds);
        }
      }
    } else {
      // No existing plan — create a fresh one
      planId = crypto.randomUUID();
      await db.from("TrainingPlan").insert({
        id: planId,
        userId: user.id,
        startDate: new Date(startDate).toISOString(),
        raceDate: new Date(raceDate).toISOString(),
        version: 1,
      });
    }

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

      const workouts = week.workouts.map((w) => ({
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
      }));
      await db.from("Workout").insert(workouts);
    }

    return Response.json({ planId, totalWeeks: plan.weeks.length, startDate, raceDate });
  } catch (err) {
    console.error("[plan/generate] DB write error:", err);
    return Response.json({ error: "Failed to save training plan" }, { status: 500 });
  }
}
