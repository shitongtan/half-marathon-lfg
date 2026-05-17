'use client'

import { useState } from 'react'
import type { WorkoutDay, ManualActivity } from '@/types/plan'

const ACTIVITY_EMOJI: Record<string, string> = {
  'Easy Run':   '🏃',
  'Long Run':   '🏃',
  'Tempo':      '⚡',
  'Intervals':  '🔥',
  'Recovery':   '🌊',
  'Cross-Train':'💪',
  'Rest':       '💤',
  'Walk':       '🚶',
  'Hike':       '🥾',
  'Cycling':    '🚴',
  'Swimming':   '🏊',
  'Strength':   '🏋️',
  'Yoga':       '🧘',
  'Pilates':    '🧘',
  'Rowing':     '🚣',
  'HIIT':       '🔥',
  'Other':      '🎯',
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const CROSS_TRAIN_TYPES = ['Cycling','Swimming','Yoga','Strength','Pilates','Rowing','HIIT','Other']

type WCfg = { bg: string; text: string; dot: string; border: string; abbr: string }
const WC: Record<string, WCfg> = {
  'Easy Run':    { bg:'bg-emerald-500/15', text:'text-emerald-300', dot:'bg-emerald-500', border:'border-emerald-500/25', abbr:'Easy Run'   },
  'Long Run':    { bg:'bg-blue-500/15',    text:'text-blue-300',    dot:'bg-blue-500',    border:'border-blue-500/25',    abbr:'Long Run'   },
  'Tempo':       { bg:'bg-amber-500/15',   text:'text-amber-300',   dot:'bg-amber-500',   border:'border-amber-500/25',   abbr:'Tempo'      },
  'Intervals':   { bg:'bg-red-500/15',     text:'text-red-300',     dot:'bg-red-500',     border:'border-red-500/25',     abbr:'Intervals'  },
  'Recovery':    { bg:'bg-violet-500/15',  text:'text-violet-300',  dot:'bg-violet-500',  border:'border-violet-500/25',  abbr:'Recovery'   },
  'Cross-Train': { bg:'bg-cyan-500/15',    text:'text-cyan-300',    dot:'bg-cyan-500',    border:'border-cyan-500/25',    abbr:'X-Train'    },
  'Rest':        { bg:'',                  text:'text-gray-700',    dot:'bg-gray-700',    border:'',                      abbr:'Rest'       },
}

function fmtPace(d: number) {
  const m = Math.floor(d), s = Math.round((d - m) * 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(dateStr: string) {
  return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

type Sel =
  | { kind: 'workout'; workout: WorkoutDay }
  | { kind: 'manual'; activity: ManualActivity }
  | { kind: 'empty'; date: string }

export function CalendarView({
  workouts,
  manualActivities = [],
}: {
  workouts: WorkoutDay[]
  manualActivities?: ManualActivity[]
}) {
  const now = new Date()
  const [offset, setOffset] = useState(0)
  const [sel, setSel] = useState<Sel | null>(null)

  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const yr = ref.getFullYear()
  const mo = ref.getMonth()

  const byDate = new Map<string, WorkoutDay>()
  for (const w of workouts) byDate.set(w.date.slice(0, 10), w)

  const byDateManual = new Map<string, ManualActivity>()
  for (const a of manualActivities) byDateManual.set(a.startDate.slice(0, 10), a)

  const firstDay = new Date(yr, mo, 1)
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const startOff = firstDay.getDay() // 0=Sun, 1=Mon … 6=Sat

  const cells: (Date | null)[] = [
    ...Array(startOff).fill(null),
    ...Array.from({ length: daysInMo }, (_, i) => new Date(yr, mo, i + 1)),
  ]
  while (cells.length % 7) cells.push(null)

  const todayStr = localDateStr(now)

  function selKey(s: Sel): string {
    if (s.kind === 'workout') return s.workout.date.slice(0, 10)
    if (s.kind === 'manual') return s.activity.startDate.slice(0, 10)
    return s.date
  }

  function handleClick(ds: string) {
    const wo = byDate.get(ds)
    const ma = byDateManual.get(ds)
    const alreadySel = sel !== null && selKey(sel) === ds

    if (alreadySel) { setSel(null); return }

    if (wo) {
      setSel({ kind: 'workout', workout: wo })
    } else if (ma) {
      setSel({ kind: 'manual', activity: ma })
    } else if (ds <= todayStr) {
      setSel({ kind: 'empty', date: ds })
    }
  }

  return (
    <>
      <div className="border border-white/8 rounded-2xl overflow-hidden bg-[#111111]">
        {/* Month navigation */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/8">
          <button
            onClick={() => { setOffset(o => o - 1); setSel(null) }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/8 transition-all"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="font-semibold text-white text-base select-none">
            {MONTHS[mo]} <span className="text-gray-500 font-normal">{yr}</span>
          </h2>

          <button
            onClick={() => { setOffset(o => o + 1); setSel(null) }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/8 transition-all"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {offset !== 0 && (
            <button
              onClick={() => { setOffset(0); setSel(null) }}
              className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-white/8">
          {DAY_HEADERS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-gray-600 uppercase tracking-wider select-none">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) {
              return <div key={`pad-${i}`} className="min-h-[80px] sm:min-h-[96px] border-b border-r border-white/8" />
            }

            const ds = localDateStr(day)
            const wo = byDate.get(ds)
            const ma = byDateManual.get(ds)
            const isToday = ds === todayStr
            const isPast = ds < todayStr
            const isPastOrToday = ds <= todayStr
            const isSel = sel !== null && selKey(sel) === ds
            const isRest = wo?.workoutType === 'Rest'
            const cfg = wo ? (WC[wo.workoutType] ?? WC.Rest) : null
            const hasEvent = !!wo && !isRest
            const isClickable = !!(wo || ma || isPastOrToday)

            return (
              <button
                key={ds}
                onClick={() => handleClick(ds)}
                className={[
                  'group relative min-h-[80px] sm:min-h-[96px] p-1.5 sm:p-2 flex flex-col gap-1 text-left',
                  'border-b border-r border-white/8 transition-colors duration-100',
                  isClickable ? 'cursor-pointer hover:bg-white/[0.025]' : 'cursor-default',
                  isSel ? 'bg-white/[0.045]' : '',
                ].join(' ')}
              >
                {/* Day number */}
                <span className={[
                  'w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[12px] sm:text-[13px] font-medium select-none',
                  isToday ? 'bg-blue-500 text-white font-semibold' : '',
                  !isToday ? (isPast ? 'text-gray-600' : 'text-gray-300') : '',
                ].join(' ')}>
                  {day.getDate()}
                </span>

                {/* Plan workout chip */}
                {hasEvent && cfg && (
                  <div className={`relative w-full rounded-[5px] px-1 pt-0.5 pb-1 border ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-center gap-0.5 min-w-0">
                      <span className="text-[12px] leading-none flex-shrink-0" role="img">
                        {ACTIVITY_EMOJI[wo.workoutType] ?? '•'}
                      </span>
                      <p className={`hidden sm:block text-[10px] font-semibold leading-tight truncate ${cfg.text}`}>
                        {cfg.abbr}
                      </p>
                    </div>
                    {(wo.distanceKm || wo.targetPaceMin) && (
                      <p className={`hidden sm:block text-[10px] leading-tight truncate ${cfg.text} opacity-55`}>
                        {wo.distanceKm ? `${wo.distanceKm.toFixed(1)}k` : ''}
                        {wo.distanceKm && wo.targetPaceMin ? ' · ' : ''}
                        {wo.targetPaceMin ? `${fmtPace(wo.targetPaceMin)}/k` : ''}
                      </p>
                    )}
                    {wo.status === 'completed' && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                    {wo.status === 'missed' && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                    )}
                  </div>
                )}

                {/* Manual activity chip (empty days only) */}
                {!wo && ma && (
                  <div className="relative w-full rounded-[5px] px-1 pt-0.5 pb-1 border bg-cyan-500/15 border-cyan-500/25">
                    <div className="flex items-center gap-0.5 min-w-0">
                      <span className="text-[12px] leading-none flex-shrink-0" role="img">
                        {ACTIVITY_EMOJI[ma.type] ?? '🎯'}
                      </span>
                      <p className="hidden sm:block text-[10px] font-semibold leading-tight truncate text-cyan-300">
                        {ma.type}
                      </p>
                    </div>
                    <p className="hidden sm:block text-[10px] leading-tight truncate text-cyan-300 opacity-55">
                      {ma.durationMins} min
                    </p>
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                )}

                {/* Empty past/today: faint + on hover */}
                {!wo && !ma && isPastOrToday && (
                  <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity flex justify-center w-full pb-1">
                    <span className="text-gray-700 text-base leading-none">+</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-white/8 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(WC)
            .filter(([k]) => k !== 'Rest')
            .map(([type, c]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="text-[11px] leading-none" role="img">{ACTIVITY_EMOJI[type] ?? '•'}</span>
                <span className={`text-[11px] ${c.text} opacity-60`}>{type}</span>
              </div>
            ))}
        </div>
      </div>

      {sel?.kind === 'workout' && (
        <WorkoutModal workout={sel.workout} onClose={() => setSel(null)} />
      )}
      {sel?.kind === 'manual' && (
        <ActivityModal date={sel.activity.startDate} activity={sel.activity} onClose={() => setSel(null)} />
      )}
      {sel?.kind === 'empty' && (
        <ActivityModal date={sel.date} onClose={() => setSel(null)} />
      )}
    </>
  )
}

// ─── Workout detail modal ────────────────────────────────────────────────────

function WorkoutModal({ workout, onClose }: { workout: WorkoutDay; onClose: () => void }) {
  const [marking, setMarking] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [actType, setActType] = useState('Cycling')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const cfg = WC[workout.workoutType] ?? WC.Rest
  const isRest = workout.workoutType === 'Rest'
  const isCross = workout.workoutType === 'Cross-Train'

  const wDate = new Date(workout.date.slice(0, 10) + 'T12:00:00')
  const today0 = new Date(); today0.setHours(0, 0, 0, 0)
  const isPastOrToday = wDate <= today0

  const isActionable = workout.status === 'pending' && isPastOrToday && !isRest && !isCross
  const canLog = isPastOrToday && (isRest || isCross) && workout.status === 'pending'
  const isCompleted = workout.status === 'completed'

  async function handleMark(status: 'completed' | 'missed') {
    setMarking(true)
    await fetch(`/api/workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setMarking(false)
    window.location.reload()
  }

  async function handleUndo() {
    setMarking(true)
    await fetch(`/api/workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending', actualDistanceKm: null, stravaActivityId: null }),
    })
    setMarking(false)
    window.location.reload()
  }

  async function handleLog() {
    const mins = parseInt(duration)
    if (!mins) return
    setSaving(true)
    await fetch(`/api/workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        workoutType: 'Cross-Train',
        actualDistanceKm: mins,
        ...(isRest ? { coachNote: actType } : {}),
      }),
    })
    setSaving(false)
    window.location.reload()
  }

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">{fmtDate(workout.date)}</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            {workout.workoutType}
          </span>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* Metrics (non-rest/cross-train runs) */}
      {!isRest && !isCross && (workout.distanceKm || workout.targetPaceMin) && (
        <>
          <div className="flex gap-6 px-5 pb-4">
            {workout.distanceKm && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-0.5">Distance</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {workout.distanceKm.toFixed(1)}<span className="text-sm font-normal text-gray-500 ml-0.5">km</span>
                </p>
              </div>
            )}
            {workout.targetPaceMin && workout.targetPaceMax && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-0.5">Pace</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {fmtPace(workout.targetPaceMin)}<span className="text-sm font-normal text-gray-500">–{fmtPace(workout.targetPaceMax)}/km</span>
                </p>
              </div>
            )}
          </div>
          <div className="h-px bg-white/5" />
        </>
      )}

      {/* Coach note */}
      {workout.coachNote && (
        <div className="px-5 py-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-1.5">
            {isRest && isCompleted ? 'Activity' : 'Coach Note'}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{workout.coachNote}</p>
        </div>
      )}

      {/* Logged info */}
      {workout.actualDistanceKm != null && (
        <>
          <div className="h-px bg-white/5" />
          <div className="px-5 py-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-0.5">Logged</p>
            <p className="text-sm text-gray-300">
              {isCross || (isRest && isCompleted)
                ? `${Math.round(workout.actualDistanceKm)} min`
                : `${workout.actualDistanceKm.toFixed(1)} km`}
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 space-y-2.5 pt-1">
        {isCompleted && (
          <>
            <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 text-sm font-semibold">Completed</span>
              {workout.stravaActivityId && (
                <span className="ml-auto text-[10px] text-gray-600 uppercase tracking-wider font-medium">via Strava</span>
              )}
            </div>
            <button
              onClick={handleUndo}
              disabled={marking}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/8 text-gray-500 hover:text-gray-300 text-sm font-medium border border-white/8 transition-all disabled:opacity-40"
            >
              {marking ? '…' : 'Undo'}
            </button>
          </>
        )}

        {workout.status === 'missed' && (
          <>
            <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 text-sm font-semibold">Missed</span>
            </div>
            <button
              onClick={handleUndo}
              disabled={marking}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/8 text-gray-500 hover:text-gray-300 text-sm font-medium border border-white/8 transition-all disabled:opacity-40"
            >
              {marking ? '…' : 'Undo'}
            </button>
          </>
        )}

        {isActionable && (
          <div className="flex gap-2">
            <button onClick={() => handleMark('completed')} disabled={marking}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-semibold border border-emerald-500/20 transition-all disabled:opacity-40">
              {marking ? '…' : 'Mark Complete'}
            </button>
            <button onClick={() => handleMark('missed')} disabled={marking}
              className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/15 transition-all disabled:opacity-40">
              Missed
            </button>
          </div>
        )}

        {canLog && !showLog && (
          <button onClick={() => setShowLog(true)}
            className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-400 text-sm font-semibold border border-cyan-500/20 transition-all">
            + Log Cross-Training
          </button>
        )}

        {canLog && showLog && (
          <CrossTrainForm
            actType={actType}
            setActType={setActType}
            duration={duration}
            setDuration={setDuration}
            saving={saving}
            onSave={handleLog}
            onCancel={() => setShowLog(false)}
          />
        )}
      </div>
    </Modal>
  )
}

// ─── Activity modal (log new or view/remove existing on empty days) ──────────

function ActivityModal({
  date,
  activity,
  onClose,
}: {
  date: string
  activity?: ManualActivity
  onClose: () => void
}) {
  const isView = !!activity
  const [actType, setActType] = useState(activity?.type ?? 'Cycling')
  const [duration, setDuration] = useState(activity ? String(activity.durationMins) : '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: actType, date: date.slice(0, 10), durationMins: parseInt(duration) }),
    })
    setSaving(false)
    window.location.reload()
  }

  async function handleRemove() {
    setRemoving(true)
    await fetch(`/api/activities/${activity!.id}`, { method: 'DELETE' })
    setRemoving(false)
    window.location.reload()
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">{fmtDate(date)}</p>
          {isView ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold border bg-cyan-500/15 border-cyan-500/25 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-cyan-500" />
              {activity!.type}
            </span>
          ) : (
            <p className="text-base font-semibold text-white">Log Activity</p>
          )}
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {isView ? (
        <div className="px-5 pb-5 space-y-2.5">
          <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 text-sm font-semibold">Completed</span>
            <span className="ml-auto text-sm text-gray-400">{activity!.durationMins} min</span>
          </div>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-gray-500 hover:text-gray-300 text-sm font-medium border border-white/8 transition-all disabled:opacity-40"
          >
            {removing ? '…' : 'Remove'}
          </button>
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-3">
          <CrossTrainForm
            actType={actType}
            setActType={setActType}
            duration={duration}
            setDuration={setDuration}
            saving={saving}
            onSave={handleSave}
            saveLabel="Save Activity"
          />
        </div>
      )}
    </Modal>
  )
}

// ─── Shared primitives ───────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-sm mx-auto bg-[#1c1c1e] rounded-t-[28px] sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden modal-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        {children}
      </div>
    </div>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-gray-500 hover:text-white transition-all mt-1 flex-shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function CrossTrainForm({
  actType, setActType, duration, setDuration, saving, onSave, onCancel, saveLabel = 'Save',
}: {
  actType: string
  setActType: (t: string) => void
  duration: string
  setDuration: (d: string) => void
  saving: boolean
  onSave: () => void
  onCancel?: () => void
  saveLabel?: string
}) {
  return (
    <>
      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Activity type</p>
      <div className="grid grid-cols-4 gap-1.5">
        {CROSS_TRAIN_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setActType(t)}
            className={[
              'py-1.5 rounded-lg text-[11px] font-medium border transition-all',
              actType === t
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/8 text-gray-500 hover:text-gray-300 hover:bg-white/8',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number" min="1" max="600" placeholder="45"
          value={duration} onChange={e => setDuration(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
        <span className="text-sm text-gray-500 w-7">min</span>
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-gray-400 text-sm font-medium border border-white/8 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!duration || saving}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-sm font-semibold border border-cyan-500/20 transition-all disabled:opacity-40"
        >
          {saving ? '…' : saveLabel}
        </button>
      </div>
    </>
  )
}
