import { redirect } from "next/navigation";
import { exchangeCode } from "@/lib/strava";
import { setSession } from "@/lib/session";
import { db } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");

  if (error || !code) redirect("/?error=strava_denied");

  const tokenData = await exchangeCode(code);
  const { athlete, access_token, refresh_token, expires_at } = tokenData;

  // Check if user exists
  const { data: existing } = await db
    .from("User")
    .select("id")
    .eq("stravaAthleteId", athlete.id)
    .maybeSingle();

  let userId: string;

  if (existing) {
    await db.from("User").update({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaTokenExpiresAt: new Date(expires_at * 1000).toISOString(),
    }).eq("id", existing.id);
    userId = existing.id;
  } else {
    const { data: newUser, error: insertError } = await db.from("User").insert({
      id: crypto.randomUUID(),
      stravaAthleteId: athlete.id,
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaTokenExpiresAt: new Date(expires_at * 1000).toISOString(),
      optimizationMode: "finish",
      injuryHistory: "",
      coachingNotes: "",
    }).select("id").single();

    if (insertError || !newUser) throw new Error("Failed to create user");
    userId = newUser.id;
  }

  await setSession(userId);
  redirect("/dashboard");
}
