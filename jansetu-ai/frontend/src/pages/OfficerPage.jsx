import { useState, useEffect, useCallback } from 'react'
import StatsCards from '../components/StatsCards'
import OfficerDashboard from '../components/OfficerDashboard'
import AnalyticsPanel from '../components/AnalyticsPanel'
import { getDashboardStats } from '../api'

export default function OfficerPage() {
  const [stats, setStats] = useState(null)
  const [tick, setTick] = useState(0)
  const load = useCallback(() => {
    getDashboardStats().then(setStats).catch(console.error)
  }, [])
  useEffect(() => { load() }, [load, tick])
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="reveal inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-corsair">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
            Command Center
          </span>
          <h1 className="reveal reveal-delay-1 font-display italic text-4xl md:text-5xl text-ink leading-tight tracking-tightest">Officer Dashboard</h1>
          <p className="reveal reveal-delay-2 text-lg text-ink-soft mt-1">Manage and track citizen grievances</p>
        </div>
        <button onClick={() => setTick(t => t + 1)} className="btn-secondary text-sm">↻ Refresh Analytics</button>
      </div>
      <div className="no-print">
        <StatsCards stats={stats} />
        <div className="mt-4"><AnalyticsPanel stats={stats} /></div>
      </div>
      <OfficerDashboard refreshSignal={tick} />
    </div>
  )
}