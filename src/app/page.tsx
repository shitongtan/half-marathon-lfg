import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/supabase'
import Link from 'next/link'

export default async function HomePage() {
  const session = await getSession()

  if (session) {
    const { data: plan } = await db
      .from('TrainingPlan')
      .select('id')
      .eq('userId', session.userId)
      .maybeSingle()
    if (plan) redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Half Marathon LFG</h1>
            <p className="mt-3 text-lg text-gray-400 leading-relaxed">
              Training that adapts to your Strava data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
            <div className="text-orange-400 text-sm font-semibold mb-1">Personalized Plan</div>
            <p className="text-gray-400 text-sm leading-relaxed">15-week program built around your current fitness</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
            <div className="text-orange-400 text-sm font-semibold mb-1">Strava Sync</div>
            <p className="text-gray-400 text-sm leading-relaxed">Your runs are automatically logged</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
            <div className="text-orange-400 text-sm font-semibold mb-1">Coach Notes</div>
            <p className="text-gray-400 text-sm leading-relaxed">Every session has guidance so you train smarter</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/api/strava/auth"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#fc4c02] hover:bg-[#e34300] text-white font-semibold text-base transition-colors duration-150 shadow-lg shadow-orange-900/30"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect Strava &amp; Start Training
          </Link>
          <p className="text-xs text-gray-600">We only read your running activities — we never post on your behalf</p>
        </div>
      </div>
    </main>
  )
}
