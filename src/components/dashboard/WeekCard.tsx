import { WorkoutDayCard } from '@/components/dashboard/WorkoutDayCard'
import type { WeekData } from '@/types/plan'

interface WeekCardProps {
  week: WeekData
  planVersion: number
  isCurrent?: boolean
}

export function WeekCard({ week, planVersion, isCurrent }: WeekCardProps) {
  const weekStart = new Date(week.startDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  function fmtDate(d: Date) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <section id={`week-${week.weekNumber}`} className={`space-y-4 scroll-mt-6 rounded-2xl p-4 -mx-4 ${isCurrent ? 'bg-white/[0.03] ring-1 ring-white/10' : ''}`}>
      {/* Week header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Week {week.weekNumber}
            <span className="text-gray-500 font-normal"> — {week.focus}</span>
            {isCurrent && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Current</span>}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {fmtDate(weekStart)} – {fmtDate(weekEnd)}
            {' '}
            <span className="mx-1.5 text-gray-700">·</span>
            {week.totalKm.toFixed(0)} km total
            {planVersion > 1 && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400">
                v{planVersion}
              </span>
            )}
          </p>
        </div>
        {week.notes && (
          <p className="text-xs text-gray-500 italic max-w-xs text-left sm:text-right leading-relaxed">
            {week.notes}
          </p>
        )}
      </div>

      {/* Workout grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {week.workouts.map((workout) => (
          <WorkoutDayCard key={workout.id} workout={workout} />
        ))}
      </div>
    </section>
  )
}
