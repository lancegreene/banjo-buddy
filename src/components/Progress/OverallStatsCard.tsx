// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Overall Statistics Card
// Stat grid: total hours, sessions, streaks, skills mastered, avg accuracy.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { getOverallStats, type OverallStats } from '../../engine/analyticsQueries'
import { AnimatedCounter } from '../Motion/AnimatedCounter'

export function OverallStatsCard() {
  const user = useStore((s) => s.user)
  const streak = useStore((s) => s.streak)
  const [stats, setStats] = useState<OverallStats | null>(null)

  useEffect(() => {
    if (!user) return
    getOverallStats(user.id, streak).then(setStats)
  }, [user, streak])

  if (!stats) return null

  const hours = Math.floor(stats.totalMinutes / 60)
  const mins = stats.totalMinutes % 60

  const statItems = [
    { label: 'Total Time', value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, color: '#4a9eff' },
    { label: 'Sessions', value: String(stats.totalSessions), color: '#E8A838' },
    { label: 'Current Streak', value: `${stats.currentStreak}d`, color: '#f5a623' },
    { label: 'Longest Streak', value: `${stats.longestStreak}d`, color: '#e67e22' },
    { label: 'Mastered', value: String(stats.skillsByStatus.mastered ?? 0), color: '#9b59b6' },
    { label: 'Avg Accuracy', value: stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : '—', color: '#27ae60' },
  ]

  return (
    <div className="overall-stats-card">
      <div className="overall-stats-grid">
        {statItems.map((item) => (
          <div key={item.label} className="overall-stat">
            <span className="overall-stat-value" style={{ color: item.color }}>
              {/^\d+$/.test(item.value) ? <AnimatedCounter value={parseInt(item.value)} /> : item.value}
            </span>
            <span className="overall-stat-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
