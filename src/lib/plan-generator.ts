import type { ClaudePlanResponse, ClaudePlanWeek, ClaudePlanWorkout, WorkoutType } from "@/types/plan";

// Hal Higdon Novice 2 inspired 15-week half-marathon plan
// Weeks 1-5: Base, 6-10: Build (tempo introduced), 11-13: Peak, 14: Taper, 15: Race

interface WeekTemplate {
  focus: string;
  notes: string;
  days: DayTemplate[];
}

interface DayTemplate {
  dayOfWeek: number; // 0=Mon
  workoutType: WorkoutType;
  distanceKm?: number; // relative to long run scale factor
  durationMins?: number; // for cross-train
  role: "easy" | "tempo" | "long" | "recovery" | "rest" | "cross" | "race";
}

const WEEK_TEMPLATES: WeekTemplate[] = [
  // Week 1 — Base
  {
    focus: "Base Building",
    notes: "Your first week is all about establishing a routine. Keep every run at a truly easy, conversational pace — you should be able to hold a full sentence without gasping. Don't worry about speed yet.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.0 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 1.0 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 30 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.7 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.0 },
    ],
  },
  // Week 2 — Base
  {
    focus: "Base Building",
    notes: "Building on last week. Your body is adapting — you may feel tired mid-week, which is normal. Prioritise sleep and stay hydrated.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.1 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 1.1 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 30 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.8 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.15 },
    ],
  },
  // Week 3 — Base
  {
    focus: "Base Building",
    notes: "Longest week so far. The long run is the centrepiece — go slow, walk if you need to, and finish strong. It's not about pace, it's about time on feet.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.2 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 1.2 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 35 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.8 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.35 },
    ],
  },
  // Week 4 — Cutback
  {
    focus: "Recovery Week",
    notes: "Planned cutback week — mileage drops to let your body absorb the last 3 weeks of training. Don't skip it. Recovery is where fitness is actually built.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 0.9 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 0.9 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 30 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.6 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.0 },
    ],
  },
  // Week 5 — Build
  {
    focus: "Base Building",
    notes: "Back to building. You should feel fresher after last week's recovery. Your aerobic fitness is quietly improving even when it doesn't feel like it.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.3 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 1.3 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 35 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.9 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.5 },
    ],
  },
  // Week 6 — Build (first tempo)
  {
    focus: "Build Phase",
    notes: "Tempo run introduced for the first time. A tempo pace should feel 'comfortably hard' — you can speak a few words but not a full sentence. This raises your lactate threshold, the key to racing faster.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.3 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.0 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 35 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.9 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.65 },
    ],
  },
  // Week 7 — Build
  {
    focus: "Build Phase",
    notes: "Second tempo run. You should feel more comfortable with the effort level now. Focus on even splits — the same pace throughout rather than starting fast and dying.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.4 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.1 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 40 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 1.0 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.8 },
    ],
  },
  // Week 8 — Cutback
  {
    focus: "Recovery Week",
    notes: "Second cutback week. Trust the process — dropping mileage now means you'll come back stronger next week. Use the extra energy to focus on sleep and nutrition.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.0 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 1.0 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 30 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.7 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.5 },
    ],
  },
  // Week 9 — Peak build
  {
    focus: "Build Phase",
    notes: "Biggest training block. You're building serious fitness now. The long run this week should feel hard by the end — that's the point. Fuel well before and after.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.5 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.2 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 40 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 1.0 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 2.0 },
    ],
  },
  // Week 10 — Peak
  {
    focus: "Peak Phase",
    notes: "Race pace work begins. You now have enough base to start practising the pace you'll run on race day. It should feel controlled — not a sprint, not easy.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.5 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.3 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 40 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 1.0 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 2.2 },
    ],
  },
  // Week 11 — Peak
  {
    focus: "Peak Phase",
    notes: "You're near your training peak. This week includes your biggest long run yet — approach it like a mini race. Start slow, finish strong. Practice taking water/gels if you plan to on race day.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.6 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.3 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 40 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 1.0 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 2.4 },
    ],
  },
  // Week 12 — Peak (longest long run)
  {
    focus: "Peak Phase",
    notes: "Peak week — your longest long run of the entire training block. After this, it's all downhill to race day. Complete this and you'll know you can finish the half. Run the last 3km at goal pace.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.6 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.4 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 40 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 1.1 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 2.6 },
    ],
  },
  // Week 13 — Taper begins
  {
    focus: "Taper",
    notes: "Taper starts. Volume drops but intensity stays. You may feel sluggish or even question your fitness — this is completely normal and called 'taper madness'. Trust the training you've done.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 1.2 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Tempo", role: "tempo", distanceKm: 1.0 },
      { dayOfWeek: 3, workoutType: "Cross-Train", role: "cross", durationMins: 30 },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.8 },
      { dayOfWeek: 6, workoutType: "Long Run", role: "long", distanceKm: 1.8 },
    ],
  },
  // Week 14 — Full taper
  {
    focus: "Taper",
    notes: "Final taper week. Short, easy runs only — your legs are storing energy for Sunday. No heroics. Lay out your race kit, plan your nutrition, and get to bed early.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 0.8 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Easy Run", role: "easy", distanceKm: 0.7 },
      { dayOfWeek: 3, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Recovery", role: "recovery", distanceKm: 0.5 },
      { dayOfWeek: 6, workoutType: "Rest", role: "rest" },
    ],
  },
  // Week 15 — Race week
  {
    focus: "Race Week",
    notes: "Race week. Two short shakeout runs, then race day Sunday. You are ready. The training is done — now it's just execution. Start slower than you think you need to, and you'll have energy to finish strong.",
    days: [
      { dayOfWeek: 0, workoutType: "Easy Run", role: "easy", distanceKm: 0.5 },
      { dayOfWeek: 1, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 2, workoutType: "Recovery", role: "recovery", distanceKm: 0.4 },
      { dayOfWeek: 3, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 4, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 5, workoutType: "Rest", role: "rest" },
      { dayOfWeek: 6, workoutType: "Long Run", role: "race", distanceKm: 21.1 },
    ],
  },
];

const COACH_NOTES: Record<string, string[]> = {
  easy: [
    "Keep this run truly easy — you should be able to hold a full conversation without gasping. This pace builds your aerobic engine safely without stressing your joints or tendons.",
    "Easy runs are the foundation of all endurance training. Going too fast defeats the purpose. If in doubt, slow down — the benefits come from consistency, not intensity.",
    "This is an aerobic conditioning run. Your body is building more capillaries and mitochondria at this effort. Slow is productive.",
  ],
  tempo: [
    "Tempo pace is 'comfortably hard' — you can say a few words but not a full sentence. This session raises your lactate threshold, which is the single biggest predictor of half-marathon performance.",
    "Run the first kilometre slightly slower to warm up, then settle into a steady, controlled effort. Even splits are the goal — avoid going out too fast.",
    "This is the most important quality session of the week. The discomfort is productive. Focus on relaxed form, especially your shoulders and hands.",
  ],
  long: [
    "The long run is the cornerstone of half-marathon training. Run it at least 60–90 seconds per km slower than your goal race pace. Finishing matters more than pace today.",
    "Start conservatively — the last few kilometres should feel challenging, not the first. Practice your race-day nutrition strategy: take water or a gel if you plan to during the race.",
    "Time on feet is what matters here, not pace. If you need to walk, walk. Every kilometre trains your body to burn fat efficiently and builds mental resilience for race day.",
  ],
  recovery: [
    "Recovery runs flush out residual fatigue from harder sessions earlier in the week. Keep the effort very low — this should feel almost embarrassingly slow. That's correct.",
    "This run should feel effortless. Its purpose is active recovery, not fitness gain. Running slow here means you'll run fast when it counts.",
    "Think of this as a 20-minute walk with a slight jog. Heart rate should stay well below 65% of max. If your legs feel heavy, that's fine — just keep moving.",
  ],
  cross: [
    "Cross-training gives your running muscles a break while keeping your cardiovascular fitness high. Swimming, cycling, yoga, or strength work all count. Avoid high-impact activities.",
    "Use this session to strengthen muscles that running neglects — hips, glutes, and core. A strong core protects your lower back and improves running economy.",
    "Low-impact cardio today: cycling, swimming, or an elliptical. Keep the effort moderate. This session builds aerobic fitness without adding stress to your joints.",
  ],
  rest: [
    "Full rest day. Resist the urge to 'make up' missed mileage — rest is a training stimulus. Your muscles repair and grow stronger during recovery, not during the run itself.",
    "Rest. Sleep well, eat well, and let your body adapt to the training load. Skipping rest days is the most common cause of injury in recreational runners.",
    "Active rest if you like — a walk or gentle stretching is fine. But no running. Your tendons and connective tissue need more recovery time than your cardiovascular system does.",
  ],
  race: [
    "Race day. Start at the back of your expected finishing group — the first 5km should feel too easy. You'll pass people in the second half if you go out controlled. Enjoy every kilometre: this is what 15 weeks of work was for.",
  ],
};

function getCoachNote(role: string, weekNumber: number): string {
  const notes = COACH_NOTES[role] ?? COACH_NOTES.rest;
  return notes[weekNumber % notes.length];
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Base distances (km) for a casual runner starting point
const BASE_EASY_KM = 5;
const BASE_LONG_KM = 8;
const BASE_TEMPO_KM = 4;
const BASE_RECOVERY_KM = 3;

function resolveDistance(
  template: DayTemplate,
  scaleFactor: number
): number | null {
  if (!template.distanceKm) return null;

  switch (template.role) {
    case "long":
      return Math.round(BASE_LONG_KM * template.distanceKm * scaleFactor * 10) / 10;
    case "easy":
      return Math.round(BASE_EASY_KM * template.distanceKm * scaleFactor * 10) / 10;
    case "tempo":
      return Math.round(BASE_TEMPO_KM * template.distanceKm * scaleFactor * 10) / 10;
    case "recovery":
      return Math.round(BASE_RECOVERY_KM * template.distanceKm * scaleFactor * 10) / 10;
    case "race":
      return 21.1;
    default:
      return null;
  }
}

function resolvePace(
  role: string,
  avgPaceSecsPerKm: number
): { min: number; max: number } | null {
  if (role === "rest" || role === "cross") return null;

  switch (role) {
    case "easy":
      // Easy = current pace + 45-60s/km, expressed as min/km decimal
      return {
        min: (avgPaceSecsPerKm + 40) / 60,
        max: (avgPaceSecsPerKm + 65) / 60,
      };
    case "recovery":
      return {
        min: (avgPaceSecsPerKm + 60) / 60,
        max: (avgPaceSecsPerKm + 90) / 60,
      };
    case "tempo":
      // Tempo = current pace - 15-25s/km
      return {
        min: (avgPaceSecsPerKm - 25) / 60,
        max: (avgPaceSecsPerKm - 10) / 60,
      };
    case "long":
      return {
        min: (avgPaceSecsPerKm + 50) / 60,
        max: (avgPaceSecsPerKm + 80) / 60,
      };
    case "race":
      // Race pace roughly = tempo pace
      return {
        min: (avgPaceSecsPerKm - 20) / 60,
        max: (avgPaceSecsPerKm + 10) / 60,
      };
    default:
      return null;
  }
}

export function generatePlan(params: {
  avgPaceSecsPerKm: number | null;
  weeklyMileageKm: number | null;
  startDate: string;
  raceDate: string;
}): ClaudePlanResponse {
  const { startDate, raceDate } = params;

  // Default to a casual runner if no Strava data
  const avgPace = params.avgPaceSecsPerKm ?? 390; // ~6:30/km default
  const weeklyMileage = params.weeklyMileageKm ?? 12;

  // Scale factor: ratio of user's current weekly mileage to our template base (~24km)
  // Clamped between 0.6 and 1.4 to keep plan sane
  const scaleFactor = Math.min(1.4, Math.max(0.6, weeklyMileage / 24));

  const start = new Date(startDate);
  const weeks: ClaudePlanWeek[] = [];

  WEEK_TEMPLATES.forEach((template, i) => {
    const weekNumber = i + 1;
    const weekStart = addDays(start, i * 7);

    const workouts: ClaudePlanWorkout[] = template.days.map((day) => {
      const date = addDays(weekStart, day.dayOfWeek);
      const distanceKm =
        day.role === "rest" || day.role === "cross"
          ? null
          : resolveDistance(day, scaleFactor);
      const pace = resolvePace(day.role, avgPace);
      const round2 = (n: number) => Math.round(n * 100) / 100;

      return {
        dayOfWeek: day.dayOfWeek,
        date: formatDate(date),
        workoutType: day.workoutType,
        distanceKm,
        durationMins: day.durationMins ?? null,
        targetPaceMin: pace ? round2(pace.min) : null,
        targetPaceMax: pace ? round2(pace.max) : null,
        coachNote: getCoachNote(day.role, weekNumber),
      };
    });

    const totalKm = workouts.reduce((s, w) => s + (w.distanceKm ?? 0), 0);

    weeks.push({
      weekNumber,
      startDate: formatDate(weekStart),
      focus: template.focus,
      totalKm: Math.round(totalKm * 10) / 10,
      notes: template.notes,
      workouts,
    });
  });

  return { weeks };
}
