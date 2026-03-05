// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Banjo Tab Diagram (dot style)
// Shows a roll pattern as colored string dots with finger labels.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'

export type Finger = 'T' | 'I' | 'M'

interface BanjoTabDiagramProps {
  strings: (number | null)[]  // banjo string numbers; null = wildcard (any string)
  fingers?: Finger[]          // optional finger labels per beat
  label?: string              // optional title above diagram
  playedStrings?: number[]    // live played string per beat — enables hit/miss coloring
  evaluations?: NoteEvaluation[]  // richer hit/miss data per beat (streaming mode)
  cursorPosition?: number         // highlights next expected beat with pulse animation
}

// Colors per string — match roll detector
const STRING_COLORS: Record<number, string> = {
  5: '#9b59b6',
  4: '#4a9eff',
  3: '#7ed321',
  2: '#f5a623',
  1: '#e74c3c',
}

const STRING_ORDER = [1, 2, 3, 4, 5] // top to bottom in diagram

// Scruggs 3-finger rule: strings 3, 4, 5 = thumb; strings 1, 2 = alternate I/M
function deriveFingers(strings: (number | null)[]): Finger[] {
  let imToggle = 0
  return strings.map((s) => {
    if (s === null || s >= 3) return 'T'
    const f: Finger = imToggle % 2 === 0 ? 'I' : 'M'
    imToggle++
    return f
  })
}

export function BanjoTabDiagram({ strings, fingers, label, playedStrings, evaluations, cursorPosition }: BanjoTabDiagramProps) {
  const resolvedFingers = fingers ?? deriveFingers(strings)
  const beats = strings.length

  return (
    <div className="banjo-tab-diagram">
      {label && <div className="banjo-tab-label">{label}</div>}
      <div className="banjo-tab-grid" style={{ gridTemplateColumns: `28px repeat(${beats}, 1fr)` }}>
        {/* String labels column + dot rows */}
        {STRING_ORDER.map((stringNum) => (
          <React.Fragment key={stringNum}>
            {/* String label */}
            <div className="banjo-tab-string-label">
              <span style={{ color: STRING_COLORS[stringNum] }}>{stringNum}</span>
            </div>
            {/* Dots for each beat */}
            {strings.map((s, beatIdx) => {
              // Streaming evaluation mode (takes priority over playedStrings)
              const evalItem = evaluations?.[beatIdx]
              const isCursorHere = cursorPosition !== undefined && beatIdx === cursorPosition

              // Legacy playedStrings mode
              const played = playedStrings?.[beatIdx]
              const isPlayed = evalItem !== undefined || played !== undefined
              const expected = s  // null = wildcard

              // Determine hit/miss from evaluations or playedStrings
              let isHit = false
              let isMiss = false
              if (evalItem && s === stringNum) {
                isHit = evalItem.isHit
                isMiss = !evalItem.isHit
              } else if (!evalItem && played !== undefined) {
                isHit = isPlayed && (expected === null || played === stringNum) && s === stringNum
                isMiss = isPlayed && s === stringNum && expected !== null && played !== stringNum
              }

              const isCurrent = isCursorHere && s === stringNum
              const isLegacyCurrent = !evalItem && !isCursorHere && !isPlayed && playedStrings !== undefined && beatIdx === playedStrings.length

              return (
                <div key={beatIdx} className="banjo-tab-cell">
                  {s === stringNum ? (
                    <div
                      className={`banjo-tab-dot banjo-tab-dot-active ${isHit ? 'banjo-tab-dot-hit' : ''} ${isMiss ? 'banjo-tab-dot-miss' : ''} ${isCurrent ? 'banjo-tab-dot-cursor' : ''} ${isLegacyCurrent ? 'banjo-tab-dot-current' : ''}`}
                      style={{ background: STRING_COLORS[stringNum] }}
                    />
                  ) : s === null ? (
                    <div className="banjo-tab-dot banjo-tab-dot-wildcard" />
                  ) : (
                    <div className="banjo-tab-dot banjo-tab-dot-inactive" />
                  )}
                </div>
              )
            })}
          </React.Fragment>
        ))}

        {/* Spacer for label column */}
        <div className="banjo-tab-cell" />
        {/* Finger labels row */}
        {resolvedFingers.map((finger, i) => (
          <div key={`finger-${i}`} className="banjo-tab-finger">
            {finger}
          </div>
        ))}
      </div>
    </div>
  )
}
