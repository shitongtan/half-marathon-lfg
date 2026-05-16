import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  const { id } = await context.params;

  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { status?: string; actualDistanceKm?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, actualDistanceKm } = body;
  if (status !== "completed" && status !== "missed") {
    return Response.json({ error: "status must be 'completed' or 'missed'" }, { status: 400 });
  }

  const { data, error } = await db
    .from("Workout")
    .update({ status, actualDistanceKm: actualDistanceKm ?? null })
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: "Update failed" }, { status: 500 });
  return Response.json(data);
}
