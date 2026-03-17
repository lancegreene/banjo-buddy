import { useMemo } from 'react'
import type { PerformanceMetrics } from '../../types/performance'

interface Props {
  metrics: PerformanceMetrics
  previousMetrics?: PerformanceMetrics | null
  size?: number
}

const AXES: { key: keyof Omit<PerformanceMetrics, 'composite'>; label: string }[] = [
  { key: 'timing', label: 'Timing' },
  { key: 'noteAccuracy', label: 'Notes' },
  { key: 'rollEvenness', label: 'Rolls' },
  { key: 'dynamics', label: 'Dynamics' },
  { key: 'tempoStability', label: 'Tempo' },
]

function polarToCartesian(cx: number, cy: number, r: number, angleIndex: number, total: number) {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function metricsToPath(metrics: PerformanceMetrics, cx: number, cy: number, maxR: number): string {
  return AXES.map((axis, i) => {
    const value = metrics[axis.key] / 100
    const r = value * maxR
    const { x, y } = polarToCartesian(cx, cy, r, i, AXES.length)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + ' Z'
}

export function RadarChart({ metrics, previousMetrics, size = 200 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38

  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  const currentPath = useMemo(() => metricsToPath(metrics, cx, cy, maxR), [metrics, cx, cy, maxR])
  const previousPath = useMemo(
    () => previousMetrics ? metricsToPath(previousMetrics, cx, cy, maxR) : null,
    [previousMetrics, cx, cy, maxR]
  )

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar-chart">
      {/* Grid rings */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={AXES.map((_, i) => {
            const { x, y } = polarToCartesian(cx, cy, maxR * level, i, AXES.length)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="var(--border-primary, #3A3E48)"
          strokeWidth="0.5"
          opacity={0.6}
        />
      ))}

      {/* Axes */}
      {AXES.map((_, i) => {
        const { x, y } = polarToCartesian(cx, cy, maxR, i, AXES.length)
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={x} y2={y}
            stroke="var(--border-primary, #3A3E48)"
            strokeWidth="0.5"
            opacity={0.4}
          />
        )
      })}

      {/* Previous session ghost */}
      {previousPath && (
        <path
          d={previousPath}
          fill="var(--text-tertiary, #706C68)"
          fillOpacity={0.08}
          stroke="var(--text-tertiary, #706C68)"
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity={0.5}
        />
      )}

      {/* Current session */}
      <path
        d={currentPath}
        fill="var(--accent-primary, #D4A04A)"
        fillOpacity={0.2}
        stroke="var(--accent-primary, #D4A04A)"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="500"
          to="0"
          dur="0.8s"
          fill="freeze"
        />
      </path>

      {/* Data points */}
      {AXES.map((axis, i) => {
        const value = metrics[axis.key] / 100
        const { x, y } = polarToCartesian(cx, cy, value * maxR, i, AXES.length)
        return (
          <circle
            key={axis.key}
            cx={x} cy={y} r="3"
            fill="var(--accent-primary, #D4A04A)"
            stroke="var(--bg-primary, #1A1D23)"
            strokeWidth="1.5"
          />
        )
      })}

      {/* Labels */}
      {AXES.map((axis, i) => {
        const { x, y } = polarToCartesian(cx, cy, maxR + 16, i, AXES.length)
        return (
          <text
            key={axis.key}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary, #A8A4A0)"
            fontSize="10"
            fontWeight="600"
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}
