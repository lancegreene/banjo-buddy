// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Practice Heatmap (GitHub-style)
// 52-week SVG grid, color intensity = practice minutes.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { getPracticeHeatmap, type HeatmapDay } from '../../engine/analyticsQueries'

interface PracticeHeatmapProps {
  weeks?: number       // 52 for full, 4 for mini
  mini?: boolean
}

const CELL_SIZE = 12
const CELL_GAP = 2
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', '']

function intensityColor(minutes: number): string {
  if (minutes === 0) return '#2d2d2d'
  if (minutes < 10) return '#0e4429'
  if (minutes < 20) return '#006d32'
  if (minutes < 40) return '#26a641'
  return '#39d353'
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function PracticeHeatmap({ weeks = 52, mini = false }: PracticeHeatmapProps) {
  const user = useStore((s) => s.user)
  const [data, setData] = useState<Map<string, HeatmapDay>>(new Map())
  const [tooltip, setTooltip] = useState<{ date: string; day: HeatmapDay | null; x: number; y: number } | null>(null)

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - weeks * 7 + 1)
    // Align start to Sunday
    start.setDate(start.getDate() - start.getDay())
    return { startDate: start, endDate: end }
  }, [weeks])

  useEffect(() => {
    if (!user) return
    getPracticeHeatmap(user.id, formatDate(startDate), formatDate(endDate)).then(setData)
  }, [user, startDate, endDate])

  // Build grid: array of weeks, each week = array of days
  const grid = useMemo(() => {
    const result: { date: string; dayOfWeek: number }[][] = []
    const cursor = new Date(startDate)
    let currentWeek: { date: string; dayOfWeek: number }[] = []

    while (cursor <= endDate) {
      const dow = cursor.getDay()
      if (dow === 0 && currentWeek.length > 0) {
        result.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push({ date: formatDate(cursor), dayOfWeek: dow })
      cursor.setDate(cursor.getDate() + 1)
    }
    if (currentWeek.length > 0) result.push(currentWeek)
    return result
  }, [startDate, endDate])

  const svgWidth = grid.length * (CELL_SIZE + CELL_GAP) + (mini ? 0 : 28)
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + (mini ? 0 : 4)
  const labelOffset = mini ? 0 : 28

  return (
    <div className="practice-heatmap">
      {!mini && <h3 className="section-title">Practice Activity</h3>}
      <div className="heatmap-scroll">
        <svg width={svgWidth} height={svgHeight} className="heatmap-svg">
          {/* Day labels */}
          {!mini && DAY_LABELS.map((label, i) => (
            label ? (
              <text
                key={i}
                x={12}
                y={i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 1}
                textAnchor="middle"
                fontSize="9"
                fill="#888"
              >
                {label}
              </text>
            ) : null
          ))}

          {/* Cells */}
          {grid.map((week, wi) => (
            week.map((day) => {
              const hd = data.get(day.date)
              const minutes = hd?.minutes ?? 0
              return (
                <rect
                  key={day.date}
                  x={labelOffset + wi * (CELL_SIZE + CELL_GAP)}
                  y={day.dayOfWeek * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={intensityColor(minutes)}
                  className="heatmap-cell"
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGRectElement).getBoundingClientRect()
                    setTooltip({ date: day.date, day: hd ?? null, x: rect.x, y: rect.y })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: tooltip.x, top: tooltip.y - 36, position: 'fixed' }}
        >
          {new Date(tooltip.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {tooltip.day
            ? ` — ${tooltip.day.minutes} min, ${tooltip.day.itemCount} skills`
            : ' — No practice'}
        </div>
      )}

      {/* Legend */}
      {!mini && (
        <div className="heatmap-legend">
          <span className="heatmap-legend-label">Less</span>
          {[0, 5, 15, 25, 45].map((m) => (
            <span
              key={m}
              className="heatmap-legend-cell"
              style={{ background: intensityColor(m), width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 }}
            />
          ))}
          <span className="heatmap-legend-label">More</span>
        </div>
      )}
    </div>
  )
}
