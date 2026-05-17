import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, date, durationMins, distanceKm, notes } = body;

  if (!type || !date || !durationMins) {
    return Response.json({ error: "type, date, and durationMins are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const startDate = new Date(date).toISOString();

  const { error } = await db.from("ManualActivity").insert({
    id,
    userId: session.userId,
    type,
    startDate,
    durationMins: Number(durationMins),
    distanceKm: distanceKm ? Number(distanceKm) : null,
    notes: notes || null,
    workoutId: null,
    createdAt: new Date().toISOString(),
  });

  if (error) {
    console.error("ManualActivity insert error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Auto-match to a plan workout on the same date
  const dateStr = date.slice(0, 10);
  const { data: workout } = await db
    .from("Workout")
    .select("id, weekId, workoutType, status")
    .gte("date", `${dateStr}T00:00:00.000Z`)
    .lt("date", `${dateStr}T23:59:59.999Z`)
    .eq("status", "pending")
    .maybeSingle();

  if (workout) {
    const workoutTypeMatches =
      workout.workoutType === "Cross-Train" ||
      workout.workoutType === "Recovery" ||
      (workout.workoutType === "Rest" && (type === "Yoga" || type === "Stretching"));

    if (workoutTypeMatches) {
      await db
        .from("Workout")
        .update({ status: "completed" })
        .eq("id", workout.id);

      await db
        .from("ManualActivity")
        .update({ workoutId: workout.id })
        .eq("id", id);
    }
  }

  return Response.json({ id, matched: !!workout });
}

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await db
    .from("ManualActivity")
    .select("*")
    .eq("userId", session.userId)
    .order("startDate", { ascending: false });

  return Response.json(data ?? []);
}
