import { redirect } from "next/navigation";
import { exchangeCode } from "@/lib/strava";
import { setSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");

  if (error || !code) {
    redirect("/?error=strava_denied");
  }

  const tokenData = await exchangeCode(code);
  const { athlete, access_token, refresh_token, expires_at } = tokenData;

  const user = await prisma.user.upsert({
    where: { stravaAthleteId: athlete.id },
    create: {
      stravaAthleteId: athlete.id,
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaTokenExpiresAt: new Date(expires_at * 1000),
    },
    update: {
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaTokenExpiresAt: new Date(expires_at * 1000),
    },
  });

  await setSession(user.id);
  redirect("/dashboard");
}
