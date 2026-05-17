import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  const { id } = await context.params;

  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    status?: string;
    actualDistanceKm?: number | null;
    stravaActivityId?: string | null;
    workoutType?: string;
    coachNote?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, workoutType, coachNote } = body;

  if (status !== undefined && !["completed", "missed", "pending"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if ("actualDistanceKm" in body) updateData.actualDistanceKm = body.actualDistanceKm ?? null;
  if ("stravaActivityId" in body) updateData.stravaActivityId = body.stravaActivityId ?? null;
  if (workoutType !== undefined) updateData.workoutType = workoutType;
  if (coachNote !== undefined) updateData.coachNote = coachNote;

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("Workout")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: "Update failed" }, { status: 500 });
  return Response.json(data);
}
