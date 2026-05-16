'use client'

import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import type { WorkoutDay } from '@/types/plan'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatPace(secs: number): string {
  const mins = Math.floor(secs / 60)
  const s = secs % 60
  return `${mins}:${s.toString().padStart(2, '0')}`
}

interface WorkoutDayCardProps {
  workout: WorkoutDay
}

export function WorkoutDayCard({ workout }: WorkoutDayCardProps) {
  const dayLabel = DAY_LABELS[workout.dayOfWeek] ?? '?'
  const isRest = workout.workoutType === 'Rest'
  const workoutDate = new Date(workout.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  workoutDate.setHours(0, 0, 0, 0)
  const isActionable = workout.status === 'pending' && workoutDate <= today

  async function handleMark(status: 'completed' | 'missed') {
    await fetch(`/api/workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  return (
    <div
      className={`bg-[#1a1a1a] rounded-xl border p-4 flex flex-col gap-3 ${
        workout.status === 'completed'
          ? 'border-green-500/20'
          : workout.status === 'missed'
          ? 'border-red-500/20'
          : 'border-white/5'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{dayLabel}</span>
        <StatusDot status={workout.status} />
      </div>

      {isRest ? (
        /* Rest day */
        <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
          <Badge type="Rest" />
          <span className="text-gray-600 text-xs">Rest Day</span>
        </div>
      ) : (
        <>
          {/* Badge + distance */}
          <div className="flex flex-col gap-1.5">
            <Badge type={workout.workoutType} />

            {workout.distanceKm != null && (
              <span className="text-sm font-semibold text-white">
                {workout.distanceKm.toFixed(1)} km
                {workout.targetPaceMin != null && workout.targetPaceMax != null && (
                  <span className="text-gray-500 font-normal">
                    {' '}
                    &middot; {formatPace(workout.targetPaceMin)}–{formatPace(workout.targetPaceMax)}/km
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Coach note */}
          {workout.coachNote && (
            <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-3">
              {workout.coachNote}
            </p>
          )}

          {/* Actual distance if logged */}
          {workout.actualDistanceKm != null && (
            <div className="text-xs text-gray-600">
              Logged:{' '}
              <span className="text-gray-400 font-medium">{workout.actualDistanceKm.toFixed(1)} km</span>
            </div>
          )}

          {/* Action buttons */}
          {isActionable && (
            <div className="flex gap-2 mt-auto pt-1">
              <button
                onClick={() => handleMark('completed')}
                className="flex-1 py-1.5 rounded-lg border border-green-500/40 text-green-400 text-xs font-medium hover:bg-green-500/10 transition-colors"
              >
                Mark Complete
              </button>
              <button
                onClick={() => handleMark('missed')}
                className="flex-1 py-1.5 rounded-lg border border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/10 transition-colors"
              >
                Mark Missed
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
