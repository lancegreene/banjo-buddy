// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Live Weak Spot Overlay
// Real-time per-position accuracy bars computed from current session evaluations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'
import { ROLL_MAP } from '../../data/rollPatterns'

interface Props {
  evaluations: NoteEvaluation[]
  patternId: string
}

function barColor(hitRate: number): string {
  if (hitRate >= 90) return '#27ae60'
  if (hitRate >= 70) return '#f39c12'
  return '#e74c3c'
}

export function LiveWeakSpots({ evaluations, patternId }: Props) {
  const pattern = ROLL_MAP.get(patternId)
  const patternLen = pattern?.strings.length ?? 8

  const stats = useMemo(() => {
    const positions = Array.from({ length: patternLen }, (_, i) => ({
      position: i,
      total: 0,
      hits: 0,
      hitRate: 0,
    }))

    for (const ev of evaluations) {
      const pos = ev.position % patternLen
      positions[pos].total++
      if (ev.isHit) positions[pos].hits++
    }

    for (const p of positions) {
      p.hitRate = p.total > 0 ? Math.round((p.hits / p.total) * 100) : 0
    }

    return positions
  }, [evaluations, patternLen])

  const hasData = stats.some(s => s.total > 0)
  if (!hasData) return null

  // Find weakest position with data
  const withData = stats.filter(s => s.total > 0)
  const weakest = withData.length > 0
    ? withData.reduce((a, b) => a.hitRate < b.hitRate ? a : b)
    : null

  return (
    <div className="live-weak-spots">
      <div className="lws-header">
        <span className="lws-title">Live Accuracy</span>
      </div>
      <div className="lws-bars">
        {stats.map((s) => {
          const height = s.total > 0 ? Math.max(8, s.hitRate) : 8
          const isWeakest = weakest && s.position === weakest.position && weakest.hitRate < 80
          return (
            <div key={s.position} className="lws-bar-col">
              <div className="lws-bar-wrap">
                <div
                  className={`lws-bar ${isWeakest ? 'lws-bar-weak' : ''}`}
                  style={{
                    height: `${height}%`,
                    backgroundColor: s.total > 0 ? barColor(s.hitRate) : '#333',
                  }}
                />
              </div>
              <span className="lws-bar-pct">{s.total > 0 ? `${s.hitRate}%` : '—'}</span>
              <span className="lws-bar-str">{pattern?.strings[s.position] ?? s.position + 1}</span>
            </div>
          )
        })}
      </div>
      {weakest && weakest.hitRate < 70 && (
        <div className="lws-hint">
          Position {weakest.position + 1} (string {pattern?.strings[weakest.position] ?? '?'}) — {weakest.hitRate}% hit rate
        </div>
      )}
    </div>
  )
}
