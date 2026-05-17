export type WorkoutType =
  | "Easy Run"
  | "Long Run"
  | "Tempo"
  | "Intervals"
  | "Recovery"
  | "Rest"
  | "Cross-Train";

export type WorkoutStatus = "pending" | "completed" | "missed";

export type OptimizationMode = "finish" | "time" | "early";

export interface WorkoutDay {
  id: string;
  dayOfWeek: number;
  date: string;
  workoutType: WorkoutType;
  distanceKm: number | null;
  targetPaceMin: number | null;
  targetPaceMax: number | null;
  coachNote: string;
  status: WorkoutStatus;
  stravaActivityId: string | null;
  actualDistanceKm: number | null;
}

export interface WeekData {
  id: string;
  weekNumber: number;
  startDate: string;
  totalKm: number;
  focus: string;
  notes: string | null;
  workouts: WorkoutDay[];
}

export interface FitnessMetrics {
  avgPaceSecsPerKm: number | null;
  weeklyMileageKm: number | null;
  progressionRate: number | null;
  fitnessLastUpdated: string | null;
}

// Shape Claude must return
export interface ClaudePlanWeek {
  weekNumber: number;
  startDate: string;
  focus: string;
  totalKm: number;
  notes: string;
  workouts: ClaudePlanWorkout[];
}

export interface ClaudePlanWorkout {
  dayOfWeek: number;
  date: string;
  workoutType: WorkoutType;
  distanceKm: number | null;
  durationMins: number | null;
  targetPaceMin: number | null;
  targetPaceMax: number | null;
  coachNote: string;
}

export interface ClaudePlanResponse {
  weeks: ClaudePlanWeek[];
}

export interface ManualActivity {
  id: string;
  type: string;
  startDate: string;
  durationMins: number;
  distanceKm: number | null;
  notes: string | null;
  workoutId: string | null;
}
