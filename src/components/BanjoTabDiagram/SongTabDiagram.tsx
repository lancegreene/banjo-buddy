// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Song Tab Diagram
// Multi-measure tablature display for song sections.
// Shows fret numbers, chord labels, technique markers (H/P/SL), and cursor.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import type { Measure } from '../../data/songLibrary'

interface SongTabDiagramProps {
  measures: Measure[]
  label?: string
  currentBeat?: number | null  // absolute beat position across all measures
  hitBeats?: Set<number>       // beats that were hit correctly (play-along mode)
  missBeats?: Set<number>      // beats that were missed
}

const STRING_COLORS: Record<number, string> = {
  5: '#9b59b6',
  4: '#4a9eff',
  3: '#7ed321',
  2: '#f5a623',
  1: '#e74c3c',
}

const STRING_ORDER = [1, 2, 3, 4, 5]

const TECHNIQUE_LABELS: Record<string, string> = {
  hammer: 'H',
  pull: 'P',
  slide: 'SL',
}

export function SongTabDiagram({ measures, label, currentBeat, hitBeats, missBeats }: SongTabDiagramProps) {
  const totalBeats = measures.length * 8

  // Build a lookup: absoluteBeat → TabNote for each string
  const noteGrid = new Map<string, { fret: number; technique?: string; finger?: string }>()
  for (let m = 0; m < measures.length; m++) {
    for (const note of measures[m].notes) {
      const absBeat = m * 8 + note.beat
      const key = `${note.string}-${absBeat}`
      noteGrid.set(key, {
        fret: note.fret,
        technique: note.technique,
        finger: note.finger,
      })
    }
  }

  return (
    <div className="song-tab-diagram">
      {label && <div className="song-tab-label">{label}</div>}

      <div className="song-tab-scroll">
        {/* Chord labels row */}
        <div className="song-tab-chords" style={{ gridTemplateColumns: `28px repeat(${totalBeats}, 1fr)` }}>
          <div />
          {measures.map((m, mi) => (
            <React.Fragment key={mi}>
              <div className="song-tab-chord" style={{ gridColumn: `${mi * 8 + 2} / span 8` }}>
                {m.chord}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Tab grid */}
        <div className="song-tab-grid" style={{ gridTemplateColumns: `28px repeat(${totalBeats}, 1fr)` }}>
          {STRING_ORDER.map((stringNum) => (
            <React.Fragment key={stringNum}>
              <div className="banjo-tab-string-label">
                <span style={{ color: STRING_COLORS[stringNum] }}>{stringNum}</span>
              </div>
              {Array.from({ length: totalBeats }, (_, beatIdx) => {
                const key = `${stringNum}-${beatIdx}`
                const note = noteGrid.get(key)
                const isCursor = currentBeat !== null && currentBeat !== undefined && beatIdx === currentBeat
                const isHit = hitBeats?.has(beatIdx) && note
                const isMiss = missBeats?.has(beatIdx) && note
                const isMeasureBoundary = beatIdx > 0 && beatIdx % 8 === 0

                return (
                  <div
                    key={beatIdx}
                    className={`song-tab-cell ${isMeasureBoundary ? 'song-tab-cell-bar' : ''}`}
                  >
                    {note ? (
                      <div
                        className={`song-tab-note ${isCursor ? 'song-tab-note-cursor' : ''} ${isHit ? 'song-tab-note-hit' : ''} ${isMiss ? 'song-tab-note-miss' : ''}`}
                        style={{ background: STRING_COLORS[stringNum] }}
                      >
                        <span className="song-tab-fret">
                          {note.fret > 0 ? note.fret : ''}
                        </span>
                        {note.technique && (
                          <span className="song-tab-technique">
                            {TECHNIQUE_LABELS[note.technique] ?? ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="song-tab-empty" />
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}

          {/* Finger labels row */}
          <div className="banjo-tab-cell" />
          {Array.from({ length: totalBeats }, (_, beatIdx) => {
            // Find the note at this beat (any string)
            for (const stringNum of STRING_ORDER) {
              const note = noteGrid.get(`${stringNum}-${beatIdx}`)
              if (note?.finger) {
                return (
                  <div key={beatIdx} className="banjo-tab-finger">
                    {note.finger}
                  </div>
                )
              }
            }
            return <div key={beatIdx} className="banjo-tab-finger" />
          })}
        </div>
      </div>
    </div>
  )
}
