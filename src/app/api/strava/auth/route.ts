import { redirect } from "next/navigation";
import { getStravaAuthUrl } from "@/lib/strava";

export async function GET() {
  redirect(getStravaAuthUrl());
}
