// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Lick Detector Component (controlled)
// Receives notes from the parent's shared useNoteCapture instance.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { dtwMatch, tabToReferenceNotes, type DTWResult } from '../../engine/dtwMatcher'
import { LICK_MAP } from '../../data/lickLibrary'
import type { CapturedNote } from '../../engine/noteCapture'

interface LickDetectorProps {
  lickId: string
  notes: CapturedNote[]
  isListening: boolean
  onScore?: (pitchScore: number, timingScore: number) => void
}

function scoreColor(semitones: number): string {
  if (semitones <= 1) return '#4ADE80'
  if (semitones <= 3) return '#f5a623'
  return '#e74c3c'
}

export function LickDetector({ lickId, notes, isListening, onScore }: LickDetectorProps) {
  const lick = LICK_MAP.get(lickId)
  const [result, setResult] = useState<DTWResult | null>(null)

  const refNotes = useMemo(() => lick ? tabToReferenceNotes(lick.tab) : [], [lick])

  useEffect(() => {
    if (!lick || notes.length < 3) return
    setResult(dtwMatch(notes, refNotes))
  }, [notes, lick, refNotes])

  if (!lick) {
    return <div className="tuner-error">Lick not found: {lickId}</div>
  }

  const overallScore = result
    ? Math.round(0.6 * result.noteAccuracy + 0.4 * result.timingAccuracy)
    : null

  return (
    <div className="lick-detector">
      <div className="lick-detector-title">{lick.name}</div>
      <div className="lick-detector-desc">{lick.description}</div>

      {/* Reference notes row */}
      <div className="lick-ref-label">Reference:</div>
      <div className="lick-note-row">
        {refNotes.map((ref, i) => {
          const pair = result?.alignedPairs.find((p) => p.ref === ref)
          const matched = pair !== undefined
          return (
            <div
              key={i}
              className="lick-note-chip"
              style={matched ? { backgroundColor: scoreColor(pair.semitones), color: '#fff' } : {}}
            >
              {ref.note}{ref.octave}
              {matched && pair.semitones > 1 && (
                <span className="lick-note-offset">+{pair.semitones}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Captured notes */}
      {notes.length > 0 && (
        <>
          <div className="lick-ref-label">You played:</div>
          <div className="lick-note-row lick-note-row-played">
            {notes.slice(-refNotes.length * 2).map((n, i) => (
              <div key={i} className="lick-note-chip lick-note-chip-played">
                {n.note}{n.octave}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Score card */}
      {result && overallScore !== null && (
        <div className="lick-score-card">
          <div className="lick-score-row">
            <span>Notes</span>
            <div className="roll-score-bar">
              <div className="roll-score-fill" style={{ width: `${result.noteAccuracy}%` }} />
            </div>
            <span className="lick-score-pct">{result.noteAccuracy}%</span>
          </div>
          <div className="lick-score-row">
            <span>Timing</span>
            <div className="roll-score-bar">
              <div className="roll-score-fill" style={{ width: `${result.timingAccuracy}%` }} />
            </div>
            <span className="lick-score-pct">{result.timingAccuracy}%</span>
          </div>
          <div className="lick-score-row lick-score-overall">
            <span>Overall</span>
            <div className="roll-score-bar">
              <div className="roll-score-fill lick-score-fill-overall" style={{ width: `${overallScore}%` }} />
            </div>
            <span className="lick-score-pct">{overallScore}%</span>
          </div>
          {onScore && (
            <button
              className="tool-btn tool-btn-active"
              onClick={() => onScore(result.noteAccuracy, result.timingAccuracy)}
            >
              ✓ Use Score
            </button>
          )}
        </div>
      )}

      {!result && isListening && (
        <div className="roll-waiting">
          Play the melody notes… ({notes.length} captured)
        </div>
      )}
      {!isListening && notes.length === 0 && (
        <div className="roll-waiting">Tap Listen above, then play the lick</div>
      )}
    </div>
  )
}
