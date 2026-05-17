import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export async function DELETE(_request: Request, context: { params: Params }) {
  const { id } = await context.params;

  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await db
    .from("ManualActivity")
    .delete()
    .eq("id", id)
    .eq("userId", session.userId);

  if (error) return Response.json({ error: "Delete failed" }, { status: 500 });
  return Response.json({ ok: true });
}
