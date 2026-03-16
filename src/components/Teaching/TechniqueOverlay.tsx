// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Technique Overlay
// SVG annotation overlay for technique guides (finger positions, motion arrows).
// ─────────────────────────────────────────────────────────────────────────────

interface AnnotationArrow {
  x1: number; y1: number
  x2: number; y2: number
  label?: string
  color?: string
}

interface AnnotationCircle {
  cx: number; cy: number
  r?: number
  label?: string
  color?: string
}

interface TechniqueOverlayProps {
  width: number
  height: number
  arrows?: AnnotationArrow[]
  circles?: AnnotationCircle[]
}

export function TechniqueOverlay({ width, height, arrows = [], circles = [] }: TechniqueOverlayProps) {
  if (arrows.length === 0 && circles.length === 0) return null

  return (
    <svg
      className="technique-overlay"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#f5a623" />
        </marker>
      </defs>

      {arrows.map((a, i) => (
        <g key={`arrow-${i}`}>
          <line
            x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke={a.color ?? '#f5a623'}
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          {a.label && (
            <text
              x={(a.x1 + a.x2) / 2}
              y={(a.y1 + a.y2) / 2 - 6}
              textAnchor="middle"
              fontSize="11"
              fill={a.color ?? '#f5a623'}
              fontWeight="600"
            >
              {a.label}
            </text>
          )}
        </g>
      ))}

      {circles.map((c, i) => (
        <g key={`circle-${i}`}>
          <circle
            cx={c.cx} cy={c.cy} r={c.r ?? 12}
            fill="none"
            stroke={c.color ?? '#e74c3c'}
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          {c.label && (
            <text
              x={c.cx} y={c.cy + 4}
              textAnchor="middle"
              fontSize="10"
              fill={c.color ?? '#e74c3c'}
              fontWeight="600"
            >
              {c.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
