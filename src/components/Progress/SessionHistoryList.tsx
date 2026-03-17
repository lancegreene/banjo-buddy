// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Session History List
// Sessions grouped by day with expandable item details.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { getSessionHistory, type SessionHistoryEntry } from '../../engine/analyticsQueries'
import { SKILL_MAP } from '../../data/curriculum'

interface DayGroup {
  dateKey: string
  dateLabel: string
  totalItems: number
  totalMinutes: number
  avgScore: number | null
  items: SessionHistoryEntry['items'][number][]
}

function groupByDay(sessions: SessionHistoryEntry[]): DayGroup[] {
  const map = new Map<string, DayGroup>()

  for (const entry of sessions) {
    if (entry.itemCount === 0) continue

    const d = new Date(entry.session.startedAt)
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

    let group = map.get(dateKey)
    if (!group) {
      group = {
        dateKey,
        dateLabel: d.toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric',
        }),
        totalItems: 0,
        totalMinutes: 0,
        avgScore: null,
        items: [],
      }
      map.set(dateKey, group)
    }

    group.totalItems += entry.itemCount
    group.totalMinutes += entry.session.durationMinutes ?? 0
    group.items.push(...entry.items)
  }

  // Compute avg score per day
  for (const group of map.values()) {
    const scored = group.items.filter(i => i.compositeScore !== null)
    if (scored.length > 0) {
      group.avgScore = Math.round(
        scored.reduce((sum, i) => sum + i.compositeScore!, 0) / scored.length
      )
    }
  }

  return Array.from(map.values())
}

export function SessionHistoryList() {
  const user = useStore((s) => s.user)
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getSessionHistory(user.id).then(setSessions)
  }, [user])

  const days = useMemo(() => groupByDay(sessions), [sessions])

  if (days.length === 0) {
    return (
      <div className="session-history">
        <h3 className="section-title">Session History</h3>
        <p className="session-history-empty">No sessions recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="session-history">
      <h3 className="section-title">Session History</h3>
      <div className="session-history-list">
        {days.map((day) => {
          const isExpanded = expandedDay === day.dateKey
          const duration = day.totalMinutes > 0 ? `${day.totalMinutes} min` : '—'

          return (
            <div key={day.dateKey} className="session-history-entry">
              <button
                className="session-history-header"
                onClick={() => setExpandedDay(isExpanded ? null : day.dateKey)}
              >
                <span className="session-date">{day.dateLabel}</span>
                <span className="session-duration">{duration}</span>
                <span className="session-item-count">{day.totalItems} items</span>
                <span className="session-avg-score">
                  {day.avgScore !== null ? `${day.avgScore}%` : '—'}
                </span>
                <span className="session-expand-icon">{isExpanded ? '▾' : '▸'}</span>
              </button>

              {isExpanded && (
                <div className="session-history-items">
                  {day.items.map((item) => {
                    const skill = SKILL_MAP.get(item.skillId)
                    const rating = item.selfRating === 'felt_good' ? '✓'
                      : item.selfRating === 'ok' ? '~'
                      : item.selfRating === 'needs_work' ? '✗' : '—'

                    return (
                      <div key={item.id} className="session-history-item">
                        <span className="shi-name">{skill?.name ?? item.skillId}</span>
                        {item.achievedBpm !== null && (
                          <span className="shi-bpm">{item.achievedBpm} BPM</span>
                        )}
                        <span className="shi-rating">{rating}</span>
                        {item.compositeScore !== null && (
                          <span className="shi-score">{item.compositeScore}%</span>
                        )}
                        {item.hasRecording && <span className="shi-recording" title="Has recording">🔊</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
