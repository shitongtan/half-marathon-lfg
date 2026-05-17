import { db } from "@/lib/supabase";
import type { StravaTokenResponse, StravaActivitySummary } from "@/types/strava";

export function getStravaAuthUrl(): string {
  return (
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${process.env.STRAVA_CLIENT_ID}` +
    `&redirect_uri=${process.env.STRAVA_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=activity:read_all` +
    `&approval_prompt=auto`
  );
}

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Strava token exchange failed: ${response.status}`);
  return response.json() as Promise<StravaTokenResponse>;
}

export async function refreshTokenIfNeeded(user: {
  id: string;
  stravaAccessToken: string | null;
  stravaRefreshToken: string | null;
  stravaTokenExpiresAt: string | null;
}): Promise<string> {
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  const expiresAt = user.stravaTokenExpiresAt ? new Date(user.stravaTokenExpiresAt).getTime() : 0;
  const needsRefresh = !user.stravaAccessToken || !user.stravaRefreshToken || expiresAt < fiveMinutesFromNow;

  if (!needsRefresh) return user.stravaAccessToken!;

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: user.stravaRefreshToken,
    }),
  });
  if (!response.ok) throw new Error(`Strava token refresh failed: ${response.status}`);

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  await db.from("User").update({
    stravaAccessToken: data.access_token,
    stravaRefreshToken: data.refresh_token,
    stravaTokenExpiresAt: new Date(data.expires_at * 1000).toISOString(),
  }).eq("id", user.id);

  return data.access_token;
}

export async function fetchAllActivities(accessToken: string): Promise<StravaActivitySummary[]> {
  const all: StravaActivitySummary[] = [];
  let page = 1;
  while (true) {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error(`Strava activities fetch failed: ${response.status}`);
    const batch = (await response.json()) as StravaActivitySummary[];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 200 || all.length >= 2000) break;
    page++;
  }
  return all;
}
