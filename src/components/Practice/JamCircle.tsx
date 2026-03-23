// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Virtual Jam Circle
// Visual circle showing string positions with spatial audio toggle.
// When spatial is on, each string is panned to a different stereo position
// so the player can "hear" string separation through headphones.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

interface Props {
  onToggleSpatial: (enabled: boolean) => void
  isPlaying: boolean
  currentBeat: number | null
}

const POSITIONS = [
  { string: 4, label: '4', note: 'D3', angle: -135, color: '#4a9eff' },
  { string: 3, label: '3', note: 'G3', angle: -90, color: '#27ae60' },
  { string: 5, label: '5', note: 'G4', angle: -45, color: '#9b59b6' },
  { string: 2, label: '2', note: 'B3', angle: 0, color: '#f39c12' },
  { string: 1, label: '1', note: 'D4', angle: 45, color: '#e74c3c' },
]

const SIZE = 140
const CX = SIZE / 2
const CY = SIZE / 2
const R = 50

export function JamCircle({ onToggleSpatial, isPlaying, currentBeat }: Props) {
  const [spatial, setSpatial] = useState(false)

  function toggle() {
    const next = !spatial
    setSpatial(next)
    onToggleSpatial(next)
  }

  return (
    <div className="jam-circle">
      <div className="jam-circle-header">
        <span className="jam-circle-title">Jam Circle</span>
        <button
          className={`jam-circle-toggle ${spatial ? 'jam-circle-toggle-on' : ''}`}
          onClick={toggle}
          title={spatial ? 'Spatial audio ON — strings panned in stereo' : 'Spatial audio OFF — mono mix'}
        >
          {spatial ? '🎧 Spatial On' : '🔈 Mono'}
        </button>
      </div>
      <div className="jam-circle-vis">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Center ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

          {/* String positions around the circle */}
          {POSITIONS.map(pos => {
            const rad = (pos.angle * Math.PI) / 180
            const x = CX + Math.cos(rad) * R
            const y = CY + Math.sin(rad) * R
            const isActive = isPlaying && currentBeat !== null

            return (
              <g key={pos.string}>
                <circle
                  cx={x}
                  cy={y}
                  r={spatial ? 14 : 10}
                  fill={pos.color}
                  opacity={isActive ? 0.9 : 0.4}
                  className={spatial ? 'jam-circle-node-spatial' : ''}
                />
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#fff"
                >
                  {pos.note}
                </text>
              </g>
            )
          })}

          {/* Center label */}
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="rgba(255,255,255,0.4)">
            {spatial ? '3D' : '🪕'}
          </text>
        </svg>
      </div>
      {spatial && (
        <p className="jam-circle-hint">Use headphones for the best spatial effect</p>
      )}
    </div>
  )
}
