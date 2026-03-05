// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Weak Spot Chart
// 8-bar chart showing per-position accuracy for a roll pattern.
// Red (<70%), yellow (70-90%), green (90%+).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { analyzeWeakSpots, type WeakSpotReport } from '../../engine/weakSpotAnalysis'
import { ROLL_MAP } from '../../data/rollPatterns'

interface WeakSpotChartProps {
  skillId: string
  patternId: string
  windowDays?: number
}

function barColor(hitRate: number): string {
  if (hitRate >= 90) return '#27ae60' // green
  if (hitRate >= 70) return '#f39c12' // yellow
  return '#e74c3c'                     // red
}

export function WeakSpotChart({ skillId, patternId, windowDays = 30 }: WeakSpotChartProps) {
  const [report, setReport] = useState<WeakSpotReport | null>(null)

  useEffect(() => {
    analyzeWeakSpots(skillId, patternId, windowDays).then(setReport)
  }, [skillId, patternId, windowDays])

  if (!report) return null

  const pattern = ROLL_MAP.get(patternId)
  const hasData = report.positionStats.some((s) => s.totalAttempts > 0)
  if (!hasData) return null

  return (
    <div className="weak-spot-chart">
      <div className="weak-spot-header">
        <span className="weak-spot-title">Position Accuracy</span>
        <span className="weak-spot-overall">Overall: {report.overallAccuracy}%</span>
      </div>

      <div className="weak-spot-bars">
        {report.positionStats.map((stat) => {
          const height = stat.totalAttempts > 0 ? Math.max(4, stat.hitRate) : 4
          const isWeakest = stat.position === report.weakestPosition
          return (
            <div key={stat.position} className="weak-spot-bar-col">
              <div className="weak-spot-bar-wrap">
                <div
                  className={`weak-spot-bar ${isWeakest ? 'weak-spot-bar-weakest' : ''}`}
                  style={{
                    height: `${height}%`,
                    backgroundColor: stat.totalAttempts > 0 ? barColor(stat.hitRate) : '#444',
                  }}
                />
              </div>
              <div className="weak-spot-bar-label">
                {stat.totalAttempts > 0 ? `${stat.hitRate}%` : '—'}
              </div>
              <div className="weak-spot-bar-pos">
                {pattern?.strings[stat.position] ?? stat.position + 1}
              </div>
            </div>
          )
        })}
      </div>

      {report.weakestPosition !== null && (
        <div className="weak-spot-hint">
          Weakest: position {report.weakestPosition + 1} (string{' '}
          {pattern?.strings[report.weakestPosition] ?? '?'})
        </div>
      )}
    </div>
  )
}
