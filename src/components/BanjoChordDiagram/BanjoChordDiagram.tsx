// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Banjo Chord Diagram (horizontal fretboard orientation)
// SVG-based chord diagram: nut on left, higher frets to the right.
// Strings run top-to-bottom (5 → 1) — player's view looking down at neck.
// ─────────────────────────────────────────────────────────────────────────────

import { type ChordDiagram, getChordInversion } from '../../data/chordDiagrams'
import { getNoteAtFret, OPEN_STRINGS } from '../../data/fretboardNotes'

// Colors per string — match tab strip / fretboard
const STRING_COLORS: Record<number, string> = {
  5: '#C084FC',
  4: '#F5A623',
  3: '#4A9EFF',
  2: '#4ADE80',
  1: '#FF6B6B',
}

// Display order: string 1 on top → string 5 on bottom (player's view)
const DISPLAY_ORDER = [1, 2, 3, 4, 5]

// ─── Layout constants ────────────────────────────────────────────────────────
const NUM_FRETS = 4
const LEFT = 32       // left margin for open/muted markers
const TOP = 8
const STR_GAP = 18    // pixels between strings
const FRET_W = 34     // pixels per fret width
const NUT_H = 4
const DOT_R = 7

const GRID_W = NUM_FRETS * FRET_W
const GRID_H = (DISPLAY_ORDER.length - 1) * STR_GAP
const W = LEFT + GRID_W + 16
const H = TOP + GRID_H + 16

function strY(idx: number) { return TOP + idx * STR_GAP }
function fretDotX(fret: number) { return LEFT + (fret - 0.5) * FRET_W }

/** Strip octave from note string: "G4" → "G", "C#3" → "C#" */
function noteName(full: string): string { return full.replace(/\d+$/, '') }

/** Get the root letter from chord name: "G" → "G", "Am" → "A", "D7" → "D" */
function chordRoot(chord: ChordDiagram): string { return chord.root }

export function BanjoChordDiagram({ chord }: { chord: ChordDiagram }) {
  const { name, frets, baseFret = 1 } = chord
  const isNut = baseFret === 1
  const root = chordRoot(chord)
  const inversion = getChordInversion(chord)

  return (
    <div className="banjo-chord-diagram">
      <div className="banjo-chord-header">
        <div className="banjo-chord-name">{name}</div>
        {inversion && <div className="banjo-chord-inversion">{inversion}</div>}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Nut or position marker */}
        {isNut ? (
          <rect
            x={LEFT - NUT_H}
            y={TOP - 2}
            width={NUT_H}
            height={GRID_H + 4}
            fill="#999"
            rx={1}
          />
        ) : (
          <text
            x={LEFT - 8}
            y={TOP + GRID_H / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="#888"
            fontWeight="600"
          >
            {baseFret}
          </text>
        )}

        {/* Fret lines (vertical) */}
        {Array.from({ length: NUM_FRETS + 1 }).map((_, i) => (
          <line
            key={i}
            x1={LEFT + i * FRET_W}
            y1={TOP - 2}
            x2={LEFT + i * FRET_W}
            y2={TOP + GRID_H + 2}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        ))}

        {/* String lines (horizontal) */}
        {DISPLAY_ORDER.map((stringNum, idx) => {
          const y = strY(idx)
          return (
            <line
              key={stringNum}
              x1={LEFT}
              y1={y}
              x2={LEFT + GRID_W}
              y2={y}
              stroke={STRING_COLORS[stringNum]}
              strokeWidth={stringNum === 5 || stringNum === 4 ? 2 : 1.2}
              strokeOpacity={0.35}
            />
          )
        })}

        {/* Open / muted markers to the left of nut */}
        {DISPLAY_ORDER.map((stringNum, idx) => {
          const fretVal = frets[stringNum - 1]
          const y = strY(idx)
          const x = LEFT - NUT_H - 10
          if (fretVal === 0) {
            const openNote = noteName(OPEN_STRINGS[stringNum].note)
            const isRoot = openNote === root
            return (
              <g key={`m-${stringNum}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={isRoot ? 7 : 5}
                  fill={isRoot ? STRING_COLORS[stringNum] : 'none'}
                  stroke={STRING_COLORS[stringNum]}
                  strokeWidth={isRoot ? 2 : 1.5}
                />
                <text
                  x={x}
                  y={y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isRoot ? 8 : 7}
                  fontWeight="700"
                  fill={isRoot ? '#111' : STRING_COLORS[stringNum]}
                >
                  {openNote}
                </text>
              </g>
            )
          } else if (fretVal === -1) {
            return (
              <g key={`m-${stringNum}`}>
                <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke="#666" strokeWidth={1.5} />
                <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} stroke="#666" strokeWidth={1.5} />
              </g>
            )
          }
          return null
        })}

        {/* Fretted dots */}
        {DISPLAY_ORDER.map((stringNum, idx) => {
          const fretVal = frets[stringNum - 1]
          if (fretVal <= 0) return null
          const col = fretVal - baseFret + 1
          if (col < 1 || col > NUM_FRETS) return null
          const x = fretDotX(col)
          const y = strY(idx)
          const note = noteName(getNoteAtFret(stringNum, fretVal))
          const isRoot = note === root
          const color = STRING_COLORS[stringNum]
          return (
            <g key={`d-${stringNum}`}>
              {isRoot && <circle cx={x} cy={y} r={DOT_R + 2.5} fill="none" stroke="#fff" strokeWidth={1.5} />}
              <circle cx={x} cy={y} r={DOT_R} fill={color} />
              <text
                x={x}
                y={y + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={note.length > 1 ? 7.5 : 9}
                fontWeight="700"
                fill="#111"
              >
                {note}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
