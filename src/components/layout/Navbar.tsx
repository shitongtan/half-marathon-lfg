'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

interface NavbarProps {
  stravaConnected: boolean
  weekNumber?: number
  totalWeeks?: number
  hasPlan?: boolean
}

export function Navbar({ stravaConnected, weekNumber, totalWeeks, hasPlan }: NavbarProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleRegenerate() {
    if (!confirm('This will delete your current plan and all logged progress. Regenerate?')) return
    setRegenerating(true)
    try {
      await fetch('/api/plan/generate', { method: 'POST' })
      router.refresh()
    } catch {
      // silently fail
    } finally {
      setRegenerating(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncError(data.error ?? 'Sync failed')
      } else {
        router.refresh()
      }
    } catch {
      setSyncError('Network error — try again')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <nav className="mb-8 space-y-1.5">
      <div className="flex items-center justify-between">
        {/* Left: brand + week badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Half Marathon LFG</span>
          </div>

          {weekNumber !== undefined && totalWeeks !== undefined && (
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-400">
              Week {weekNumber} of {totalWeeks}
            </span>
          )}
        </div>

        {/* Right: strava status */}
        <div className="flex items-center gap-2">
          {stravaConnected ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Strava Connected
              </span>
              <button
                onClick={handleSync}
                disabled={syncing || regenerating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-white/10 text-gray-300 hover:bg-[#222] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              {hasPlan && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || syncing}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-white/10 text-gray-400 hover:bg-[#222] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate Plan'}
                </button>
              )}
            </>
          ) : (
            <Link
              href="/api/strava/auth"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#fc4c02] hover:bg-[#e34300] text-white transition-colors"
            >
              Connect Strava
            </Link>
          )}
        </div>
      </div>

      {syncError && (
        <p className="text-xs text-red-400 text-right">{syncError}</p>
      )}
    </nav>
  )
}
