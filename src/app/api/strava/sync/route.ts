import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { refreshTokenIfNeeded, fetchRecentActivities } from "@/lib/strava";

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await db.from("User").select("*").eq("id", session.userId).single();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (!user.stravaAthleteId) return Response.json({ error: "Strava not connected" }, { status: 400 });

  const accessToken = await refreshTokenIfNeeded(user);

  const afterUnixSecs = Math.floor(Date.now() / 1000) - 90 * 24 * 3600;
  const activities = await fetchRecentActivities(accessToken, afterUnixSecs);
  const runs = activities.filter((a) => a.type === "Run");

  for (const activity of runs) {
    const avgPaceSecsPerKm =
      activity.distance > 0
        ? Math.round(activity.moving_time / (activity.distance / 1000))
        : null;

    await db.from("StravaActivity").upsert({
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
    }, { onConflict: "stravaId", ignoreDuplicates: false });
  }

  // Compute fitness metrics from recent runs
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
    activitiesImported: runs.length,
    fitnessMetrics: { avgPaceSecsPerKm, weeklyMileageKm },
  });
}
