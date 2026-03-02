// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Detector Component (controlled)
// Receives notes from the parent's shared useNoteCapture instance.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { detectRolls, type RollDetectionResult } from '../../engine/rollDetection'
import type { CapturedNote } from '../../engine/noteCapture'

const STRING_COLORS: Record<number, string> = {
  1: '#4a9eff',
  2: '#7ed321',
  3: '#f5a623',
  4: '#e74c3c',
  5: '#9b59b6',
}

const TRACE_LENGTH = 8

interface RollDetectorProps {
  notes: CapturedNote[]
  isListening: boolean
  onScore?: (rhythmScore: number, tempoScore: number) => void
}

export function RollDetector({ notes, isListening, onScore }: RollDetectorProps) {
  const [rollResult, setRollResult] = useState<RollDetectionResult | null>(null)

  useEffect(() => {
    if (notes.length >= 4) {
      setRollResult(detectRolls(notes))
    }
  }, [notes])

  const openNotes = notes.filter((n) => n.banjoString !== null).slice(-TRACE_LENGTH)
  const best = rollResult?.bestMatch ?? null
  const topMatches = rollResult?.allMatches.slice(0, 3) ?? []

  return (
    <div className="roll-detector">
      <div className="roll-detector-title">Roll Detector</div>

      {/* Live note trace — last 8 open-string notes */}
      <div className="roll-trace">
        {Array.from({ length: TRACE_LENGTH }).map((_, i) => {
          const note = openNotes[i]
          return (
            <div
              key={i}
              className={`roll-dot ${note ? 'roll-dot-active' : ''}`}
              style={note ? { backgroundColor: STRING_COLORS[note.banjoString!] ?? '#999' } : {}}
            >
              {note ? note.banjoString : '·'}
            </div>
          )
        })}
      </div>
      {openNotes.length > 0 && (
        <div className="roll-trace-label">
          {openNotes.map((n) => `${n.note}${n.octave}`).join(' → ')}
        </div>
      )}

      {/* Best match */}
      {best ? (
        <div className="roll-match-card roll-match-best">
          <div className="roll-match-name">{best.pattern.name}</div>
          <div className="roll-score-bar">
            <div className="roll-score-fill" style={{ width: `${best.compositeScore}%` }} />
          </div>
          <div className="roll-match-scores">
            <span>Sequence: {best.sequenceScore}%</span>
            <span>Timing: {best.timingScore}%</span>
            <span className="roll-composite">{best.compositeScore}%</span>
          </div>
          {onScore && (
            <button
              className="tool-btn tool-btn-active"
              onClick={() => onScore(best.sequenceScore, best.timingScore)}
            >
              ✓ Use Score
            </button>
          )}
        </div>
      ) : isListening ? (
        <div className="roll-waiting">
          {openNotes.length < 4
            ? `Play a roll… (${openNotes.length}/8 open-string notes)`
            : 'No strong roll match yet — keep going'}
        </div>
      ) : (
        <div className="roll-waiting">Tap Listen above, then play a roll pattern</div>
      )}

      {/* Top 3 weak matches */}
      {!best && isListening && openNotes.length >= 4 && topMatches.length > 0 && (
        <div className="roll-all-matches">
          {topMatches.map((m) => (
            <div key={m.pattern.id} className="roll-match-card">
              <span className="roll-match-name">{m.pattern.name}</span>
              <span className="roll-match-scores">
                Seq: {m.sequenceScore}% / Time: {m.timingScore}% — {m.compositeScore}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
