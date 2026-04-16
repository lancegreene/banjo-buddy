// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Progress Snapshot
// Dashboard widget: BPM trend sparkline + recent score sparkline for the
// most recently practiced skill.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { SKILL_MAP } from '../../data/curriculum'
import { getSkillProgressTrend } from '../../engine/analyticsQueries'

interface TrendPoint {
  date: string
  score: number
  bpm: number | null
}

function Sparkline({ data, color, label, unit }: { data: number[]; color: string; label: string; unit: string }) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 120
  const h = 32
  const pad = 2

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const delta = latest - prev

  return (
    <div className="sparkline-widget">
      <div className="sparkline-label">{label}</div>
      <div className="sparkline-row">
        <svg width={w} height={h} className="sparkline-svg">
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle
            cx={parseFloat(points[points.length - 1].split(',')[0])}
            cy={parseFloat(points[points.length - 1].split(',')[1])}
            r="2.5"
            fill={color}
          />
        </svg>
        <div className="sparkline-value">
          <span className="sparkline-current">{latest}{unit}</span>
          {delta !== 0 && (
            <span className={`sparkline-delta ${delta > 0 ? 'sparkline-delta-up' : 'sparkline-delta-down'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProgressSnapshot() {
  const skillRecords = useStore((s) => s.skillRecords)
  const [trend, setTrend] = useState<TrendPoint[]>([])

  // Find most recently practiced skill with BPM data
  const recentSkillId = useMemo(() => {
    let bestId: string | null = null
    let bestTime = ''
    for (const [id, rec] of skillRecords) {
      if (rec.lastPracticed && rec.lastPracticed > bestTime && rec.bestBpm) {
        bestTime = rec.lastPracticed
        bestId = id
      }
    }
    return bestId
  }, [skillRecords])

  useEffect(() => {
    if (!recentSkillId) return
    getSkillProgressTrend(recentSkillId, 15).then(setTrend)
  }, [recentSkillId])

  if (!recentSkillId || trend.length < 2) return null

  const skill = SKILL_MAP.get(recentSkillId)
  const bpmData = trend.filter(t => t.bpm !== null).map(t => t.bpm!)
  const scoreData = trend.map(t => t.score)

  return (
    <div className="progress-snapshot">
      <h4 className="progress-snapshot-title">{skill?.name ?? 'Recent Skill'}</h4>
      <div className="progress-snapshot-charts">
        {bpmData.length >= 2 && (
          <Sparkline data={bpmData} color="#4a9eff" label="BPM" unit="" />
        )}
        {scoreData.length >= 2 && (
          <Sparkline data={scoreData} color="#E8A838" label="Score" unit="%" />
        )}
      </div>
    </div>
  )
}
