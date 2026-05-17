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

  // Start date: next Monday on or after today
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() + daysUntilMonday);
  const startDate = start.toISOString().split("T")[0];
  const raceDate = "2026-08-30";

  const plan = generatePlan({
    avgPaceSecsPerKm: user.avgPaceSecsPerKm,
    weeklyMileageKm: user.weeklyMileageKm,
    longestRecentRunKm,
    startDate,
    raceDate,
  });

  const { valid, violations } = validatePlanMileageRamp(plan.weeks);
  if (!valid) console.warn("[plan/generate] Mileage ramp violations:", violations);

  try {
    // Delete existing plan
    const { data: existing } = await db
      .from("TrainingPlan")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    if (existing) {
      const { data: weeks } = await db.from("TrainingWeek").select("id").eq("planId", existing.id);
      const weekIds = (weeks ?? []).map((w) => w.id);
      if (weekIds.length > 0) {
        await db.from("Workout").delete().in("weekId", weekIds);
      }
      await db.from("TrainingWeek").delete().eq("planId", existing.id);
      await db.from("TrainingPlan").delete().eq("id", existing.id);
    }

    // Create plan
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
