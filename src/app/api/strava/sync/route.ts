import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { refreshTokenIfNeeded, fetchRecentActivities } from "@/lib/strava";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.stravaAthleteId) {
    return Response.json(
      { error: "Strava account not connected" },
      { status: 400 }
    );
  }

  const accessToken = await refreshTokenIfNeeded(user);

  const afterUnixSecs = Math.floor(Date.now() / 1000) - 90 * 24 * 3600;
  const activities = await fetchRecentActivities(accessToken, afterUnixSecs);

  const runs = activities.filter((a) => a.type === "Run");

  for (const activity of runs) {
    await prisma.stravaActivity.upsert({
      where: { stravaId: BigInt(activity.id) },
      create: {
        stravaId: BigInt(activity.id),
        userId: user.id,
        name: activity.name,
        type: activity.type,
        startDate: new Date(activity.start_date),
        distanceMeters: activity.distance,
        movingTimeSecs: activity.moving_time,
        avgPaceSecsPerKm:
          activity.distance > 0
            ? Math.round(activity.moving_time / (activity.distance / 1000))
            : null,
        avgHeartRate: activity.average_heartrate ?? null,
      },
      update: {
        name: activity.name,
        type: activity.type,
        startDate: new Date(activity.start_date),
        distanceMeters: activity.distance,
        movingTimeSecs: activity.moving_time,
        avgPaceSecsPerKm:
          activity.distance > 0
            ? Math.round(activity.moving_time / (activity.distance / 1000))
            : null,
        avgHeartRate: activity.average_heartrate ?? null,
      },
    });
  }

  // Compute fitness metrics
  const recentRuns = await prisma.stravaActivity.findMany({
    where: { userId: user.id, type: "Run" },
    orderBy: { startDate: "desc" },
    take: 10,
  });

  const pacesWithValues = recentRuns
    .map((r) => r.avgPaceSecsPerKm)
    .filter((p): p is number => p !== null);

  const avgPaceSecsPerKm =
    pacesWithValues.length > 0
      ? Math.round(
          pacesWithValues.reduce((sum, p) => sum + p, 0) /
            pacesWithValues.length
        )
      : null;

  const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 3600 * 1000);
  const recentRuns28d = await prisma.stravaActivity.findMany({
    where: {
      userId: user.id,
      type: "Run",
      startDate: { gte: twentyEightDaysAgo },
    },
  });

  const totalDistanceKm = recentRuns28d.reduce(
    (sum, r) => sum + r.distanceMeters / 1000,
    0
  );
  const weeklyMileageKm = totalDistanceKm / 4;

  // Compute progression rate
  const completedWorkouts = await prisma.workout.findMany({
    where: {
      week: { plan: { userId: user.id } },
      status: "completed",
      stravaActivityId: { not: null },
    },
    include: { week: true },
  });

  let progressionRate = 1.0;

  if (completedWorkouts.length > 0) {
    const ratios: number[] = [];

    for (const workout of completedWorkouts) {
      if (!workout.targetPaceMin || !workout.stravaActivityId) continue;

      const stravaActivity = await prisma.stravaActivity.findUnique({
        where: { id: workout.stravaActivityId },
      });

      if (!stravaActivity?.avgPaceSecsPerKm) continue;

      const targetPaceSecs = workout.targetPaceMin * 60;
      const ratio = targetPaceSecs / stravaActivity.avgPaceSecsPerKm;
      ratios.push(ratio);
    }

    if (ratios.length > 0) {
      progressionRate =
        ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      avgPaceSecsPerKm,
      weeklyMileageKm,
      progressionRate,
      fitnessLastUpdated: new Date(),
    },
  });

  return Response.json({
    activitiesImported: runs.length,
    fitnessMetrics: {
      avgPaceSecsPerKm,
      weeklyMileageKm,
      progressionRate,
    },
  });
}
