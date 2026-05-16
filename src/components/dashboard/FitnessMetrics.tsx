interface FitnessMetricsProps {
  avgPaceSecsPerKm: number | null
  weeklyMileageKm: number | null
  progressionRate: number | null
  weekNumber: number
  totalWeeks: number
}

function formatPace(secs: number): string {
  const mins = Math.floor(secs / 60)
  const s = secs % 60
  return `${mins}:${s.toString().padStart(2, '0')}/km`
}

function readinessLabel(rate: number | null): { text: string; className: string } {
  if (rate === null || (rate >= 0.95 && rate <= 1.05)) {
    return { text: 'On track', className: 'text-green-400' }
  }
  if (rate > 1.05) {
    return { text: 'Ahead of schedule', className: 'text-blue-400' }
  }
  return { text: 'Adapting plan', className: 'text-orange-400' }
}

export function FitnessMetrics({
  avgPaceSecsPerKm,
  weeklyMileageKm,
  progressionRate,
  weekNumber,
  totalWeeks,
}: FitnessMetricsProps) {
  const readiness = readinessLabel(progressionRate)

  const metrics = [
    {
      label: 'Avg Pace',
      value: avgPaceSecsPerKm ? formatPace(avgPaceSecsPerKm) : '—',
      valueClass: 'text-white',
    },
    {
      label: 'Weekly Base',
      value: weeklyMileageKm ? `${weeklyMileageKm.toFixed(1)} km/wk` : '—',
      valueClass: 'text-white',
    },
    {
      label: 'Progress',
      value: `Week ${weekNumber} of ${totalWeeks}`,
      valueClass: 'text-white',
    },
    {
      label: 'Readiness',
      value: readiness.text,
      valueClass: readiness.className,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 flex flex-col gap-1"
        >
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{m.label}</span>
          <span className={`text-base font-semibold ${m.valueClass}`}>{m.value}</span>
        </div>
      ))}
    </div>
  )
}
