import Link from 'next/link'

export function StravaConnectBanner() {
  return (
    <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-orange-300">Connect Strava to get started</p>
        <p className="text-sm text-gray-400 mt-0.5">
          Sync your runs so we can build a personalized training plan
        </p>
      </div>
      <Link
        href="/api/strava/auth"
        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fc4c02] hover:bg-[#e34300] text-white text-sm font-semibold transition-colors"
      >
        Connect Strava
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  )
}
