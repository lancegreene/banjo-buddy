// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Banjo Chord Diagram (fret grid style)
// SVG-based chord diagram: strings left-to-right (5→4→3→2→1),
// frets top-to-bottom. Colored dots match string colors.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChordDiagram } from '../../data/chordDiagrams'

// Colors per string — match roll detector / tab diagram
const STRING_COLORS: Record<number, string> = {
  5: '#9b59b6',
  4: '#4a9eff',
  3: '#7ed321',
  2: '#f5a623',
  1: '#e74c3c',
}

// Display order: string 5 on left → string 1 on right (standard banjo convention)
const DISPLAY_ORDER = [5, 4, 3, 2, 1]

const W = 130        // SVG total width
const H = 148        // SVG total height
const LEFT = 18      // left margin (for fret number label)
const TOP = 34       // top of nut line
const STR_GAP = 22   // pixels between strings
const FRET_H = 22    // pixels per fret
const NUM_FRETS = 4  // frets shown
const NUT_W = 4      // nut thickness

// X position of each display column (0-indexed)
function strX(col: number) { return LEFT + col * STR_GAP }
// Y center of a fret row (1-based)
function fretDotY(fret: number) { return TOP + (fret - 0.5) * FRET_H }

export function BanjoChordDiagram({ chord }: { chord: ChordDiagram }) {
  const { name, frets, fingers, baseFret = 1 } = chord
  const isNut = baseFret === 1

  return (
    <div className="banjo-chord-diagram">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Chord name */}
        <text
          x={LEFT + 2 * STR_GAP}
          y={12}
          textAnchor="middle"
          fontSize={14}
          fontWeight="700"
          fill="#222"
        >
          {name}
        </text>

        {/* Nut (thick bar) or position marker */}
        {isNut ? (
          <rect
            x={LEFT}
            y={TOP - NUT_W}
            width={4 * STR_GAP}
            height={NUT_W}
            fill="#333"
            rx={1}
          />
        ) : (
          <text x={LEFT - 6} y={TOP + FRET_H / 2} textAnchor="end" fontSize={10} fill="#888">
            {baseFret}
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: NUM_FRETS + 1 }).map((_, i) => (
          <line
            key={i}
            x1={LEFT}
            y1={TOP + i * FRET_H}
            x2={LEFT + 4 * STR_GAP}
            y2={TOP + i * FRET_H}
            stroke="#d0d0d0"
            strokeWidth={1}
          />
        ))}

        {/* String lines */}
        {DISPLAY_ORDER.map((stringNum, col) => {
          const x = strX(col)
          return (
            <line
              key={stringNum}
              x1={x}
              y1={TOP}
              x2={x}
              y2={TOP + NUM_FRETS * FRET_H}
              stroke={STRING_COLORS[stringNum]}
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
          )
        })}

        {/* Open / muted markers above nut */}
        {DISPLAY_ORDER.map((stringNum, col) => {
          const fretVal = frets[stringNum - 1]
          const x = strX(col)
          const y = TOP - NUT_W - 10
          if (fretVal === 0) {
            // Open circle
            return (
              <circle
                key={stringNum}
                cx={x}
                cy={y}
                r={6}
                fill="none"
                stroke={STRING_COLORS[stringNum]}
                strokeWidth={1.5}
              />
            )
          } else if (fretVal === -1) {
            // X = muted
            return (
              <g key={stringNum}>
                <line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} stroke="#aaa" strokeWidth={1.5} />
                <line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5} stroke="#aaa" strokeWidth={1.5} />
              </g>
            )
          }
          return null
        })}

        {/* Fretted dots */}
        {DISPLAY_ORDER.map((stringNum, col) => {
          const fretVal = frets[stringNum - 1]
          if (fretVal <= 0) return null
          const row = fretVal - baseFret + 1
          if (row < 1 || row > NUM_FRETS) return null
          const x = strX(col)
          const y = fretDotY(row)
          const fingerNum = fingers?.[stringNum - 1]
          return (
            <g key={stringNum}>
              <circle cx={x} cy={y} r={9} fill={STRING_COLORS[stringNum]} />
              {fingerNum ? (
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight="700"
                  fill="white"
                >
                  {fingerNum}
                </text>
              ) : null}
            </g>
          )
        })}

        {/* String number labels at bottom */}
        {DISPLAY_ORDER.map((stringNum, col) => (
          <text
            key={stringNum}
            x={strX(col)}
            y={H - 4}
            textAnchor="middle"
            fontSize={10}
            fill={STRING_COLORS[stringNum]}
            fontWeight="600"
          >
            {stringNum}
          </text>
        ))}
      </svg>
    </div>
  )
}
