import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/supabase'
import { Navbar } from '@/components/layout/Navbar'
import { FitnessMetrics } from '@/components/dashboard/FitnessMetrics'
import { StravaConnectBanner } from '@/components/dashboard/StravaConnectBanner'
import { WeekCard } from '@/components/dashboard/WeekCard'
import { GeneratePlanButton } from '@/components/dashboard/GeneratePlanButton'
import type { WeekData, WorkoutDay, WorkoutType, WorkoutStatus } from '@/types/plan'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const { data: user } = await db.from('User').select('*').eq('id', session.userId).single()
  if (!user) redirect('/')

  const noStrava = !user.stravaAthleteId

  // Fetch plan with weeks and workouts
  const { data: plan } = await db
    .from('TrainingPlan')
    .select('*, TrainingWeek(*, Workout(*))')
    .eq('userId', session.userId)
    .maybeSingle()

  // Sort weeks and workouts
  const sortedPlan = plan
    ? {
        ...plan,
        weeks: [...(plan.TrainingWeek ?? [])].sort((a: { weekNumber: number }, b: { weekNumber: number }) => a.weekNumber - b.weekNumber).map((w: { Workout?: unknown[]; [key: string]: unknown }) => ({
          ...w,
          workouts: [...((w.Workout as { dayOfWeek: number }[]) ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
        })),
      }
    : null

  type DbWeek = { id: string; weekNumber: number; startDate: string; totalKm: number; focus: string; notes: string | null; workouts: { id: string; dayOfWeek: number; date: string; workoutType: string; distanceKm: number | null; targetPaceMin: number | null; targetPaceMax: number | null; coachNote: string; status: string; stravaActivityId: string | null; actualDistanceKm: number | null }[] }
  const today = new Date()
  const currentWeekRaw = (sortedPlan?.weeks as DbWeek[] | undefined)?.find((w) => {
    const start = new Date(w.startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return today >= start && today < end
  }) ?? (sortedPlan?.weeks as DbWeek[] | undefined)?.[0] ?? null

  const currentWeek: WeekData | null = currentWeekRaw
    ? {
        id: currentWeekRaw.id,
        weekNumber: currentWeekRaw.weekNumber,
        startDate: currentWeekRaw.startDate,
        totalKm: currentWeekRaw.totalKm,
        focus: currentWeekRaw.focus,
        notes: currentWeekRaw.notes ?? null,
        workouts: currentWeekRaw.workouts.map((w): WorkoutDay => ({
          id: w.id,
          dayOfWeek: w.dayOfWeek,
          date: w.date,
          workoutType: w.workoutType as WorkoutType,
          distanceKm: w.distanceKm ?? null,
          targetPaceMin: w.targetPaceMin ?? null,
          targetPaceMax: w.targetPaceMax ?? null,
          coachNote: w.coachNote,
          status: w.status as WorkoutStatus,
          stravaActivityId: w.stravaActivityId ?? null,
          actualDistanceKm: w.actualDistanceKm ?? null,
        })),
      }
    : null

  const totalWeeks = sortedPlan?.weeks.length ?? 15
  const weekNumber = currentWeek?.weekNumber ?? 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Navbar
        stravaConnected={!noStrava}
        weekNumber={plan ? weekNumber : undefined}
        totalWeeks={plan ? totalWeeks : undefined}
      />

      {plan && (
        <FitnessMetrics
          avgPaceSecsPerKm={user.avgPaceSecsPerKm ?? null}
          weeklyMileageKm={user.weeklyMileageKm ?? null}
          progressionRate={user.progressionRate ?? null}
          weekNumber={weekNumber}
          totalWeeks={totalWeeks}
        />
      )}

      {noStrava && <StravaConnectBanner />}

      {!plan && !noStrava && (
        <>
          <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/5 p-4">
            <p className="text-sm text-gray-400">
              Strava connected — we can see your recent runs. Generate your plan to get started.
            </p>
          </div>
          <GeneratePlanButton />
        </>
      )}

      {!plan && noStrava && (
        <div className="mt-8 text-center space-y-3">
          <h2 className="text-xl font-bold text-white">Welcome!</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
            Connect your Strava account first. We&apos;ll analyze your running history and build a personalized 15-week half marathon plan.
          </p>
          <Link
            href="/api/strava/auth"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl bg-[#fc4c02] hover:bg-[#e34300] text-white font-semibold text-sm transition-colors"
          >
            Connect Strava to Begin
          </Link>
        </div>
      )}

      {currentWeek && plan && (
        <WeekCard week={currentWeek} planVersion={plan.version} />
      )}
    </div>
  )
}
