// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — BPM Trend Chart
// Hand-rolled SVG line chart showing BPM progress over time per skill.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { SKILL_MAP } from '../../data/curriculum'
import { getBpmTimeline, type BpmTimelinePoint } from '../../engine/analyticsQueries'

interface BpmTrendChartProps {
  skillId: string
}

const W = 480
const H = 200
const PAD = { top: 20, right: 20, bottom: 30, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

export function BpmTrendChart({ skillId }: BpmTrendChartProps) {
  const [data, setData] = useState<BpmTimelinePoint[]>([])

  useEffect(() => {
    getBpmTimeline(skillId).then(setData)
  }, [skillId])

  const skill = SKILL_MAP.get(skillId)

  const { points, yMin, yMax, dateLabels } = useMemo(() => {
    if (data.length === 0) return { points: [], yMin: 0, yMax: 100, dateLabels: [] }

    const bpms = data.map((d) => d.bpm)
    const lo = Math.max(0, Math.min(...bpms) - 10)
    const hi = Math.max(...bpms) + 10
    const yRange = hi - lo || 1

    const pts = data.map((d, i) => ({
      x: PAD.left + (data.length === 1 ? PLOT_W / 2 : (i / (data.length - 1)) * PLOT_W),
      y: PAD.top + PLOT_H - ((d.bpm - lo) / yRange) * PLOT_H,
      bpm: d.bpm,
      date: d.date,
      score: d.score,
    }))

    // Pick ~5 date labels
    const step = Math.max(1, Math.floor(data.length / 5))
    const labels = data.filter((_, i) => i % step === 0 || i === data.length - 1)

    return { points: pts, yMin: lo, yMax: hi, dateLabels: labels.map((d, i) => ({
      x: PAD.left + (data.indexOf(d) / Math.max(1, data.length - 1)) * PLOT_W,
      label: new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    })) }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="bpm-trend-chart">
        <p className="bpm-trend-empty">No BPM data yet for this skill.</p>
      </div>
    )
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Threshold lines
  const progressBpm = skill?.progressBpm
  const masteryBpm = skill?.masteryBpm
  const yRange = yMax - yMin || 1

  function bpmToY(bpm: number) {
    return PAD.top + PLOT_H - ((bpm - yMin) / yRange) * PLOT_H
  }

  return (
    <div className="bpm-trend-chart">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD.top + PLOT_H * (1 - pct)
          const bpmLabel = Math.round(yMin + yRange * pct)
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={PAD.left + PLOT_W} y2={y} stroke="#333" strokeWidth="0.5" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#888">{bpmLabel}</text>
            </g>
          )
        })}

        {/* Progress threshold */}
        {progressBpm && progressBpm >= yMin && progressBpm <= yMax && (
          <g>
            <line
              x1={PAD.left} y1={bpmToY(progressBpm)}
              x2={PAD.left + PLOT_W} y2={bpmToY(progressBpm)}
              stroke="#E8A838" strokeWidth="1" strokeDasharray="4 3"
            />
            <text x={PAD.left + PLOT_W + 4} y={bpmToY(progressBpm) + 3} fontSize="9" fill="#E8A838">Progress</text>
          </g>
        )}

        {/* Mastery threshold */}
        {masteryBpm && masteryBpm >= yMin && masteryBpm <= yMax && (
          <g>
            <line
              x1={PAD.left} y1={bpmToY(masteryBpm)}
              x2={PAD.left + PLOT_W} y2={bpmToY(masteryBpm)}
              stroke="#9b59b6" strokeWidth="1" strokeDasharray="4 3"
            />
            <text x={PAD.left + PLOT_W + 4} y={bpmToY(masteryBpm) + 3} fontSize="9" fill="#9b59b6">Mastery</text>
          </g>
        )}

        {/* Data line */}
        <path d={linePath} fill="none" stroke="#4a9eff" strokeWidth="2" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#4a9eff" stroke="#1a1a1a" strokeWidth="1.5">
            <title>{p.date}: {p.bpm} BPM{p.score !== null ? ` (${p.score}%)` : ''}</title>
          </circle>
        ))}

        {/* Date labels */}
        {dateLabels.map((dl, i) => (
          <text key={i} x={dl.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#888">
            {dl.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
