import { prisma } from "@/lib/prisma";
import type {
  StravaTokenResponse,
  StravaActivitySummary,
} from "@/types/strava";

export function getStravaAuthUrl(): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  return (
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=activity:read_all` +
    `&approval_prompt=auto`
  );
}

export async function exchangeCode(
  code: string
): Promise<StravaTokenResponse> {
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
  if (!response.ok) {
    throw new Error(`Strava token exchange failed: ${response.status}`);
  }
  return response.json() as Promise<StravaTokenResponse>;
}

export async function refreshTokenIfNeeded(user: {
  id: string;
  stravaAccessToken: string | null;
  stravaRefreshToken: string | null;
  stravaTokenExpiresAt: Date | null;
}): Promise<string> {
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  const tokenExpiresAt = user.stravaTokenExpiresAt?.getTime() ?? 0;
  const needsRefresh =
    !user.stravaAccessToken ||
    !user.stravaRefreshToken ||
    tokenExpiresAt < fiveMinutesFromNow;

  if (!needsRefresh) {
    return user.stravaAccessToken!;
  }

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

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpiresAt: new Date(data.expires_at * 1000),
    },
  });

  return data.access_token;
}

export async function fetchRecentActivities(
  accessToken: string,
  afterUnixSecs: number
): Promise<StravaActivitySummary[]> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${afterUnixSecs}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) {
    throw new Error(`Strava activities fetch failed: ${response.status}`);
  }
  return response.json() as Promise<StravaActivitySummary[]>;
}
