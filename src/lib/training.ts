import type { ClaudePlanWeek } from "@/types/plan";

/**
 * Compute fitness metrics from a list of Strava activities.
 */
export function computeFitnessFromActivities(
  activities: Array<{
    avgPaceSecsPerKm: number | null;
    distanceMeters: number;
    startDate: Date;
  }>
): {
  avgPaceSecsPerKm: number | null;
  weeklyMileageKm: number;
} {
  // Average of last 10 non-null avgPaceSecsPerKm values
  const paces = activities
    .map((a) => a.avgPaceSecsPerKm)
    .filter((p): p is number => p !== null)
    .slice(0, 10);

  const avgPaceSecsPerKm =
    paces.length > 0
      ? paces.reduce((sum, p) => sum + p, 0) / paces.length
      : null;

  // Weekly mileage: sum of distances in last 28 days, divided by 4
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);

  const totalMeters = activities
    .filter((a) => a.startDate >= cutoff)
    .reduce((sum, a) => sum + a.distanceMeters, 0);

  const weeklyMileageKm = totalMeters / 1000 / 4;

  return { avgPaceSecsPerKm, weeklyMileageKm };
}

/**
 * Convert seconds-per-km to "M:SS/km" format, e.g. 360 → "6:00/km".
 */
export function formatPace(secsPerKm: number): string {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  const paddedSecs = secs.toString().padStart(2, "0");
  return `${mins}:${paddedSecs}/km`;
}

/**
 * Validate that no week increases total km by more than 15% vs the previous
 * week. Taper weeks (km drops) are exempt.
 */
export function validatePlanMileageRamp(weeks: ClaudePlanWeek[]): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1];
    const curr = weeks[i];

    // Taper week: km drops — exempt
    if (curr.totalKm <= prev.totalKm) {
      continue;
    }

    const increase = (curr.totalKm - prev.totalKm) / prev.totalKm;
    if (increase > 0.15) {
      violations.push(
        `Week ${curr.weekNumber} increases mileage by ${(increase * 100).toFixed(1)}% ` +
          `(${prev.totalKm.toFixed(1)} → ${curr.totalKm.toFixed(1)} km), exceeding 15% limit`
      );
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Return 1-based week number relative to the plan start date.
 * Clamps to 1 if called before the plan starts.
 */
export function getCurrentWeekNumber(planStartDate: Date): number {
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffMs = now.getTime() - planStartDate.getTime();
  if (diffMs < 0) return 1;
  return Math.floor(diffMs / msPerWeek) + 1;
}

/**
 * Map a progression rate to a human-readable readiness label + colour.
 */
export function getReadinessLabel(progressionRate: number | null): {
  label: string;
  color: string;
} {
  if (progressionRate === null) {
    return { label: "On track", color: "green" };
  }
  if (progressionRate > 1.05) {
    return { label: "Ahead of schedule", color: "blue" };
  }
  if (progressionRate < 0.95) {
    return { label: "Behind — plan adapting", color: "orange" };
  }
  return { label: "On track", color: "green" };
}
