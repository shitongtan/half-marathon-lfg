import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  })

  if (!user) redirect('/')

  // No Strava connected or no plan yet — show getting started state
  const noStrava = !user.stravaAthleteId

  const plan = await prisma.trainingPlan.findUnique({
    where: { userId: session.userId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          workouts: { orderBy: { dayOfWeek: 'asc' } },
        },
      },
    },
  })

  // Find current week based on today's date
  const today = new Date()
  const currentWeekRaw = plan?.weeks.find((w) => {
    const start = new Date(w.startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return today >= start && today < end
  }) ?? plan?.weeks[0] ?? null

  // Serialize to plain objects (strip Prisma internals, convert Date → string)
  const currentWeek: WeekData | null = currentWeekRaw
    ? {
        id: currentWeekRaw.id,
        weekNumber: currentWeekRaw.weekNumber,
        startDate: currentWeekRaw.startDate.toISOString(),
        totalKm: currentWeekRaw.totalKm,
        focus: currentWeekRaw.focus,
        notes: currentWeekRaw.notes ?? null,
        workouts: currentWeekRaw.workouts.map((w): WorkoutDay => ({
          id: w.id,
          dayOfWeek: w.dayOfWeek,
          date: w.date.toISOString(),
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

  const totalWeeks = plan?.weeks.length ?? 15
  const weekNumber = currentWeek?.weekNumber ?? 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Navbar
        stravaConnected={!noStrava}
        weekNumber={plan ? weekNumber : undefined}
        totalWeeks={plan ? totalWeeks : undefined}
      />

      {/* Fitness metrics strip — always shown if plan exists */}
      {plan && (
        <FitnessMetrics
          avgPaceSecsPerKm={user.avgPaceSecsPerKm ?? null}
          weeklyMileageKm={user.weeklyMileageKm ?? null}
          progressionRate={user.progressionRate ?? null}
          weekNumber={weekNumber}
          totalWeeks={totalWeeks}
        />
      )}

      {/* Strava connect banner */}
      {noStrava && <StravaConnectBanner />}

      {/* No plan and strava connected → invite to generate */}
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

      {/* No plan and no strava → instructional state */}
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

      {/* Current week workouts */}
      {currentWeek && plan && (
        <WeekCard week={currentWeek} planVersion={plan.version} />
      )}
    </div>
  )
}
