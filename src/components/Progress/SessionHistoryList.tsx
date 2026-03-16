// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Session History List
// Scrollable list of past sessions with expandable item details.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { getSessionHistory, type SessionHistoryEntry } from '../../engine/analyticsQueries'
import { SKILL_MAP } from '../../data/curriculum'

export function SessionHistoryList() {
  const user = useStore((s) => s.user)
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getSessionHistory(user.id).then(setSessions)
  }, [user])

  if (sessions.length === 0) {
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
        {sessions.map((entry) => {
          const isExpanded = expandedId === entry.session.id
          const dateStr = new Date(entry.session.startedAt).toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric',
          })
          const duration = entry.session.durationMinutes
            ? `${entry.session.durationMinutes} min`
            : '—'

          return (
            <div key={entry.session.id} className="session-history-entry">
              <button
                className="session-history-header"
                onClick={() => setExpandedId(isExpanded ? null : entry.session.id)}
              >
                <span className="session-date">{dateStr}</span>
                <span className="session-duration">{duration}</span>
                <span className="session-item-count">{entry.itemCount} items</span>
                <span className="session-avg-score">
                  {entry.avgScore !== null ? `${entry.avgScore}%` : '—'}
                </span>
                <span className="session-expand-icon">{isExpanded ? '▾' : '▸'}</span>
              </button>

              {isExpanded && (
                <div className="session-history-items">
                  {entry.items.map((item) => {
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
