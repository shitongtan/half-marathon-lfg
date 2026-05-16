import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { formatPace } from "@/lib/training";
import type { ClaudePlanResponse } from "@/types/plan";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const WorkoutSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  date: z.string(),
  workoutType: z.enum([
    "Easy Run",
    "Long Run",
    "Tempo",
    "Intervals",
    "Recovery",
    "Rest",
    "Cross-Train",
  ]),
  distanceKm: z.number().nullable(),
  durationMins: z.number().nullable(),
  targetPaceMin: z.number().nullable(),
  targetPaceMax: z.number().nullable(),
  coachNote: z.string(),
});

const WeekSchema = z.object({
  weekNumber: z.number().int(),
  startDate: z.string(),
  focus: z.string(),
  totalKm: z.number(),
  notes: z.string(),
  workouts: z.array(WorkoutSchema),
});

const PlanSchema = z.object({ weeks: z.array(WeekSchema) });

// ---------------------------------------------------------------------------
// System prompt (cached — reused across recalibrations)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert running coach specializing in half-marathon training for recreational runners.
You create safe, progressive training plans grounded in proven methodologies:
- Hal Higdon Novice 2 structure: 3 easy runs, 1 long run, 1 cross-train, 2 rest days per week
- 10% rule: weekly mileage MUST NOT increase by more than 10% week-over-week
- Periodization phases:
  * Weeks 1-5: Base Building (easy aerobic runs, build mileage base safely)
  * Weeks 6-10: Build Phase (introduce tempo runs, then intervals — only after base established)
  * Weeks 11-13: Peak Phase (race-pace work, longest long run ~18-19km in week 12)
  * Week 14: Taper (reduce to ~60% of peak volume, maintain intensity)
  * Week 15: Race Week (light shakeout runs only, race on Sunday)
- Never schedule two hard sessions (tempo/intervals) back-to-back
- Long run on Sunday (or Saturday if needed), not both weekend days
- Easy run pace = current avg pace + 45-60 sec/km (truly easy, conversational)
- Tempo pace = current avg pace - 15-30 sec/km
- Injury prevention: max 2 quality sessions/week, adequate recovery

Coach notes for each workout should explain WHY in 2-3 sentences (e.g. "This easy run builds your aerobic base. Keep the effort conversational — you should be able to speak full sentences. The low intensity protects your joints while building your aerobic engine.")

You MUST return a valid JSON object matching this exact schema — no markdown, no extra text:
{
  "weeks": [
    {
      "weekNumber": 1,
      "startDate": "YYYY-MM-DD",
      "focus": "Base Building",
      "totalKm": 24.0,
      "notes": "Coach summary for this week",
      "workouts": [
        {
          "dayOfWeek": 0,
          "date": "YYYY-MM-DD",
          "workoutType": "Easy Run",
          "distanceKm": 5.0,
          "durationMins": null,
          "targetPaceMin": 6.75,
          "targetPaceMax": 7.25,
          "coachNote": "Why this workout in 2-3 sentences."
        }
      ]
    }
  ]
}

workoutType must be one of: "Easy Run", "Long Run", "Tempo", "Intervals", "Recovery", "Rest", "Cross-Train"
dayOfWeek: 0=Monday, 1=Tuesday, ..., 6=Sunday
targetPaceMin/Max in decimal min/km (e.g. 6.5 = 6:30/km). Null for Rest/Cross-Train.
distanceKm: null for Rest and Cross-Train workouts.
durationMins: integer for Cross-Train (e.g. 30), null otherwise.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function secsToHMS(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function callClaude(userMessage: string): Promise<ClaudePlanResponse> {
  return anthropic.messages
    .create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      },
      {
        headers: {
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
      }
    )
    .then((response) => {
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") {
        throw new Error("Claude returned no text content");
      }
      const raw = block.text.trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`Claude response is not valid JSON:\n${raw}`);
      }

      const result = PlanSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `Claude response failed schema validation:\n${JSON.stringify(result.error.issues, null, 2)}\n\nRaw response:\n${raw}`
        );
      }

      return result.data as ClaudePlanResponse;
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateTrainingPlan(params: {
  avgPaceSecsPerKm: number | null;
  weeklyMileageKm: number | null;
  progressionRate: number | null;
  optimizationMode: string;
  goalFinishTimeSecs: number | null;
  startDate: string;
  raceDate: string;
  totalWeeks: number;
  recentRuns: Array<{
    date: string;
    distanceKm: number;
    paceSecsPerKm: number | null;
  }>;
}): Promise<ClaudePlanResponse> {
  const {
    avgPaceSecsPerKm,
    weeklyMileageKm,
    progressionRate,
    optimizationMode,
    goalFinishTimeSecs,
    startDate,
    raceDate,
    totalWeeks,
    recentRuns,
  } = params;

  const paceDisplay =
    avgPaceSecsPerKm !== null
      ? `${avgPaceSecsPerKm} sec/km (${formatPace(avgPaceSecsPerKm)})`
      : "unknown";

  const mileageDisplay =
    weeklyMileageKm !== null ? `${weeklyMileageKm.toFixed(1)} km/week` : "unknown";

  const progressionDisplay =
    progressionRate !== null ? progressionRate.toFixed(2) : "N/A (no plan yet)";

  const goalTimeDisplay =
    goalFinishTimeSecs !== null ? `\n- Goal finish time: ${secsToHMS(goalFinishTimeSecs)}` : "";

  const recentRunsDisplay = JSON.stringify(recentRuns.slice(0, 5), null, 2);

  let adaptationNote = "";
  if (progressionRate !== null && progressionRate > 1.05) {
    adaptationNote =
      "\nThe athlete is adapting faster than expected — you may progress slightly more aggressively while still respecting the 10% rule.";
  } else if (progressionRate !== null && progressionRate < 0.95) {
    adaptationNote =
      "\nThe athlete is behind targets — prioritize recovery and reduce intensity this cycle.";
  }

  const userMessage = `Athlete profile:
- Current average easy pace: ${paceDisplay}
- Average weekly mileage (last 4 weeks): ${mileageDisplay}
- Progression rate vs. plan: ${progressionDisplay} (>1.0 = ahead of targets)
- Optimization mode: ${optimizationMode} (finish = complete safely, time = target finish time, early = compress timeline)${goalTimeDisplay}
- Recent runs: ${recentRunsDisplay}

Plan parameters:
- Start date: ${startDate} (Monday)
- Race date: ${raceDate} (Sunday)
- Total weeks: ${totalWeeks}
- Goal: Complete a 21.1km half marathon${goalFinishTimeSecs !== null ? ` in ${secsToHMS(goalFinishTimeSecs)}` : ""}

Generate a complete ${totalWeeks}-week training plan starting from week 1 through race week.
Personalize pace targets based on the athlete's current fitness.${adaptationNote}`;

  return callClaude(userMessage);
}

export async function recalibrateTrainingPlan(params: {
  currentWeekNumber: number;
  completedWorkouts: Array<{
    date: string;
    workoutType: string;
    actualDistanceKm: number | null;
    targetPaceMin: number | null;
  }>;
  avgPaceSecsPerKm: number | null;
  weeklyMileageKm: number | null;
  progressionRate: number | null;
  optimizationMode: string;
  userNote?: string;
  startDate: string;
  raceDate: string;
  totalWeeks: number;
}): Promise<ClaudePlanResponse> {
  const {
    currentWeekNumber,
    completedWorkouts,
    avgPaceSecsPerKm,
    weeklyMileageKm,
    progressionRate,
    optimizationMode,
    userNote,
    startDate,
    raceDate,
    totalWeeks,
  } = params;

  const paceDisplay =
    avgPaceSecsPerKm !== null
      ? `${avgPaceSecsPerKm} sec/km (${formatPace(avgPaceSecsPerKm)})`
      : "unknown";

  const mileageDisplay =
    weeklyMileageKm !== null ? `${weeklyMileageKm.toFixed(1)} km/week` : "unknown";

  const progressionDisplay =
    progressionRate !== null ? progressionRate.toFixed(2) : "N/A";

  const completedSummary = JSON.stringify(completedWorkouts, null, 2);

  let adaptationNote = "";
  if (progressionRate !== null && progressionRate > 1.05) {
    adaptationNote =
      "\nThe athlete is adapting faster than expected — you may progress slightly more aggressively while still respecting the 10% rule.";
  } else if (progressionRate !== null && progressionRate < 0.95) {
    adaptationNote =
      "\nThe athlete is behind targets — prioritize recovery and reduce intensity this cycle.";
  }

  const userNoteSection = userNote ? `\nAthlete note: "${userNote}"` : "";

  const userMessage = `Recalibration request:
Regenerate weeks ${currentWeekNumber} through ${totalWeeks} only. Weeks 1 through ${currentWeekNumber - 1} are already completed.

Current athlete fitness:
- Current average easy pace: ${paceDisplay}
- Average weekly mileage (last 4 weeks): ${mileageDisplay}
- Progression rate vs. plan: ${progressionDisplay} (>1.0 = ahead of targets)
- Optimization mode: ${optimizationMode}${userNoteSection}

Completed workouts summary:
${completedSummary}

Plan parameters:
- Original start date: ${startDate} (Monday)
- Race date: ${raceDate} (Sunday)
- Total weeks: ${totalWeeks}
- Goal: Complete a 21.1km half marathon

Update the remaining plan (weeks ${currentWeekNumber}–${totalWeeks}) based on the athlete's current fitness.
Return ONLY the weeks from week ${currentWeekNumber} onward — do not include weeks 1–${currentWeekNumber - 1}.
Ensure weekNumber values continue from ${currentWeekNumber} to ${totalWeeks}.${adaptationNote}`;

  return callClaude(userMessage);
}
