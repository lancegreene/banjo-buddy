// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Circular Roll Clock
// SVG ring showing the 8-note pattern cycle with a sweeping cursor,
// color-coded hit/miss markers, and finger labels.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'
import { ROLL_MAP } from '../../data/rollPatterns'

interface Props {
  evaluations: NoteEvaluation[]
  patternId: string
  cursor: number  // current position in pattern (0-7)
}

const SIZE = 160
const CX = SIZE / 2
const CY = SIZE / 2
const R_OUTER = 68
const R_INNER = 44
const R_MID = (R_OUTER + R_INNER) / 2

const STRING_COLORS: Record<number, string> = {
  1: '#e74c3c',
  2: '#f39c12',
  3: '#27ae60',
  4: '#4a9eff',
  5: '#9b59b6',
}

function polarToXY(angle: number, radius: number): [number, number] {
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius]
}

export function RollClock({ evaluations, patternId, cursor }: Props) {
  const pattern = ROLL_MAP.get(patternId)
  if (!pattern) return null

  const len = pattern.strings.length
  const sliceAngle = (2 * Math.PI) / len
  const startAngle = -Math.PI / 2 // 12 o'clock

  // Compute per-position stats from recent evaluations (last 3 cycles)
  const recentEvals = evaluations.slice(-len * 3)
  const positionStats = useMemo(() => {
    const stats = Array.from({ length: len }, () => ({ hits: 0, total: 0 }))
    for (const ev of recentEvals) {
      const pos = ev.position % len
      stats[pos].total++
      if (ev.isHit) stats[pos].hits++
    }
    return stats
  }, [recentEvals, len])

  // Cursor angle
  const cursorAngle = startAngle + (cursor % len) * sliceAngle

  return (
    <div className="roll-clock">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background ring */}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={R_OUTER - R_INNER} />

        {/* Position segments */}
        {Array.from({ length: len }, (_, i) => {
          const stringNum = pattern.strings[i]
          if (stringNum === null) return null

          const a1 = startAngle + i * sliceAngle + 0.04
          const a2 = startAngle + (i + 1) * sliceAngle - 0.04
          const color = STRING_COLORS[stringNum] ?? '#888'
          const stat = positionStats[i]
          const hitRate = stat.total > 0 ? stat.hits / stat.total : 0
          const opacity = stat.total > 0 ? 0.25 + hitRate * 0.55 : 0.15

          const [x1o, y1o] = polarToXY(a1, R_OUTER)
          const [x2o, y2o] = polarToXY(a2, R_OUTER)
          const [x2i, y2i] = polarToXY(a2, R_INNER)
          const [x1i, y1i] = polarToXY(a1, R_INNER)

          const path = `M ${x1o} ${y1o} A ${R_OUTER} ${R_OUTER} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${R_INNER} ${R_INNER} 0 0 0 ${x1i} ${y1i} Z`

          // Label position
          const labelAngle = startAngle + (i + 0.5) * sliceAngle
          const [lx, ly] = polarToXY(labelAngle, R_MID)

          const finger = pattern.fingers?.[i]

          return (
            <g key={i}>
              <path d={path} fill={color} opacity={opacity} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="700"
                fill={color}
                opacity={0.9}
              >
                {finger ?? stringNum}
              </text>
            </g>
          )
        })}

        {/* Cursor indicator */}
        {(() => {
          const [cx, cy] = polarToXY(cursorAngle, R_OUTER + 6)
          return (
            <circle
              cx={cx}
              cy={cy}
              r={5}
              fill="#fff"
              className="roll-clock-cursor"
            />
          )
        })()}

        {/* Sweep line */}
        {(() => {
          const [lx, ly] = polarToXY(cursorAngle, R_OUTER + 2)
          return (
            <line
              x1={CX}
              y1={CY}
              x2={lx}
              y2={ly}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          )
        })()}

        {/* Center info */}
        {recentEvals.length > 0 && (() => {
          const totalHits = recentEvals.filter(e => e.isHit).length
          const pct = Math.round((totalHits / recentEvals.length) * 100)
          return (
            <>
              <text x={CX} y={CY - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff">{pct}%</text>
              <text x={CX} y={CY + 10} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">accuracy</text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}
