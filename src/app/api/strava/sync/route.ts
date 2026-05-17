import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { refreshTokenIfNeeded, fetchAllActivities } from "@/lib/strava";

const RUN_WORKOUT_TYPES = new Set(["Easy Run", "Long Run", "Tempo", "Intervals", "Recovery"]);

const STRAVA_TYPE_MAP: Record<string, string> = {
  Run: "Run",
  Walk: "Walk",
  Hike: "Hike",
  Ride: "Cycling",
  VirtualRide: "Cycling",
  EBikeRide: "Cycling",
  Swim: "Swimming",
  WeightTraining: "Strength",
  Workout: "Strength",
  Yoga: "Yoga",
  Pilates: "Pilates",
  Rowing: "Rowing",
  Crossfit: "HIIT",
  Elliptical: "Other",
};

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await db.from("User").select("*").eq("id", session.userId).single();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (!user.stravaAthleteId) return Response.json({ error: "Strava not connected" }, { status: 400 });

  let accessToken: string;
  try {
    accessToken = await refreshTokenIfNeeded(user);
  } catch (e) {
    console.error("[sync] Token refresh failed:", e);
    return Response.json({ error: "Strava token refresh failed — reconnect Strava" }, { status: 401 });
  }

  let activities;
  try {
    activities = await fetchAllActivities(accessToken);
  } catch (e) {
    console.error("[sync] fetchAllActivities failed:", e);
    return Response.json({ error: "Failed to fetch activities from Strava" }, { status: 502 });
  }

  console.log(`[sync] Fetched ${activities.length} total activities from Strava`);

  const runs = activities.filter((a) => a.type === "Run");

  // Upsert all runs into StravaActivity (pace history + fitness metrics)
  for (const activity of runs) {
    const avgPaceSecsPerKm =
      activity.distance > 0
        ? Math.round(activity.moving_time / (activity.distance / 1000))
        : null;

    const { error } = await db.from("StravaActivity").upsert(
      {
        id: crypto.randomUUID(),
        stravaId: activity.id.toString(),
        userId: user.id,
        name: activity.name,
        type: activity.type,
        startDate: new Date(activity.start_date).toISOString(),
        distanceMeters: activity.distance,
        movingTimeSecs: activity.moving_time,
        avgPaceSecsPerKm,
        avgHeartRate: activity.average_heartrate ?? null,
      },
      { onConflict: "stravaId", ignoreDuplicates: false }
    );
    if (error) console.error("[sync] StravaActivity upsert error:", error.message);
  }

  // Fetch already-synced ManualActivity strava IDs to avoid duplicates
  const { data: existingManual, error: existingErr } = await db
    .from("ManualActivity")
    .select("notes")
    .eq("userId", user.id)
    .like("notes", "strava:%");

  if (existingErr) console.error("[sync] existingManual query error:", existingErr.message);

  const existingStravaIds = new Set(
    (existingManual ?? [])
      .map((m: { notes: string | null }) => m.notes?.replace("strava:", ""))
      .filter(Boolean)
  );

  // Match runs to plan workouts
  const matchedStravaIds = new Set<string>();

  const { data: plan } = await db
    .from("TrainingPlan")
    .select("id, TrainingWeek(id)")
    .eq("userId", user.id)
    .maybeSingle();

  if (plan) {
    const weekIds = ((plan.TrainingWeek ?? []) as { id: string }[]).map((w) => w.id);
    if (weekIds.length > 0) {
      for (const activity of runs) {
        const dateStr = new Date(activity.start_date).toISOString().slice(0, 10);
        const actualKm = parseFloat((activity.distance / 1000).toFixed(2));

        const { data: workout } = await db
          .from("Workout")
          .select("id, workoutType, distanceKm")
          .in("weekId", weekIds)
          .gte("date", `${dateStr}T00:00:00.000Z`)
          .lt("date", `${dateStr}T23:59:59.999Z`)
          .eq("status", "pending")
          .maybeSingle();

        if (!workout || !RUN_WORKOUT_TYPES.has(workout.workoutType)) continue;
        const targetKm = workout.distanceKm as number | null;
        if (targetKm !== null && Math.abs(actualKm - targetKm) / targetKm > 0.35) continue;

        await db.from("Workout").update({
          status: "completed",
          actualDistanceKm: actualKm,
          stravaActivityId: String(activity.id),
        }).eq("id", workout.id);

        matchedStravaIds.add(String(activity.id));
      }
    }
  }

  // Save all unmatched activities as ManualActivity so they appear on the calendar.
  // Use start_date_local (not UTC start_date) so the date aligns with the user's timezone.
  const unmatchedRuns = runs.filter((a) => !matchedStravaIds.has(String(a.id)));
  const nonRunActivities = activities.filter((a) => a.type !== "Run");
  const allToSave = [...unmatchedRuns, ...nonRunActivities];

  const toInsert = allToSave
    .filter((a) => !existingStravaIds.has(String(a.id)))
    .map((a) => {
      // start_date_local is the local wall-clock time — slice date portion to get local date
      const localDateStr = (a.start_date_local ?? a.start_date).slice(0, 10);
      return {
        id: crypto.randomUUID(),
        userId: user.id,
        type: STRAVA_TYPE_MAP[a.type] ?? a.type,
        startDate: `${localDateStr}T12:00:00.000Z`,
        durationMins: Math.max(1, Math.round(a.moving_time / 60)),
        distanceKm: a.distance > 0 ? parseFloat((a.distance / 1000).toFixed(2)) : null,
        notes: `strava:${a.id}`,
        workoutId: null,
        createdAt: new Date().toISOString(),
      };
    });

  console.log(`[sync] Inserting ${toInsert.length} new ManualActivity rows`);

  if (toInsert.length > 0) {
    const { error: insertErr } = await db.from("ManualActivity").insert(toInsert);
    if (insertErr) {
      console.error("[sync] ManualActivity insert error:", insertErr.message);
      return Response.json({
        error: `Activity save failed: ${insertErr.message}`,
        activitiesFetched: activities.length,
      }, { status: 500 });
    }
  }

  // Recompute fitness metrics from recent runs
  const { data: recentRuns } = await db
    .from("StravaActivity")
    .select("avgPaceSecsPerKm")
    .eq("userId", user.id)
    .eq("type", "Run")
    .order("startDate", { ascending: false })
    .limit(10);

  const paces = (recentRuns ?? [])
    .map((r) => r.avgPaceSecsPerKm)
    .filter((p): p is number => p !== null);

  const avgPaceSecsPerKm =
    paces.length > 0 ? Math.round(paces.reduce((s, p) => s + p, 0) / paces.length) : null;

  const since28d = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString();
  const { data: runs28d } = await db
    .from("StravaActivity")
    .select("distanceMeters")
    .eq("userId", user.id)
    .eq("type", "Run")
    .gte("startDate", since28d);

  const weeklyMileageKm =
    (runs28d ?? []).reduce((s, r) => s + r.distanceMeters / 1000, 0) / 4;

  await db.from("User").update({
    avgPaceSecsPerKm,
    weeklyMileageKm,
    fitnessLastUpdated: new Date().toISOString(),
  }).eq("id", user.id);

  return Response.json({
    activitiesFetched: activities.length,
    runsImported: runs.length,
    newOnCalendar: toInsert.length,
    fitnessMetrics: { avgPaceSecsPerKm, weeklyMileageKm },
  });
}
