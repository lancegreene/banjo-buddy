// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Detector Component
// Evaluates after every 8 open-string notes: stars if matched, 👎 if not.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
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
const RESULT_DISPLAY_MS = 1800

interface DetectionEvent {
  rollName: string
  stars: number   // 0 = miss, 1–3 = star rating
  bpm: number
}

interface RollDetectorProps {
  notes: CapturedNote[]
  isListening: boolean
  targetBpm?: number
  onScore?: (rhythmScore: number, tempoScore: number) => void
  onClear?: () => void
}

function calcBpm(gaps: number[]): number {
  if (gaps.length === 0) return 0
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return mean > 0 ? Math.round(30000 / mean) : 0
}

function calcStars(compositeScore: number, achievedBpm: number, targetBpm?: number): number {
  const qualityStars = compositeScore >= 85 ? 3 : compositeScore >= 70 ? 2 : 1
  if (!targetBpm || achievedBpm === 0) return qualityStars
  const pctDiff = (Math.abs(achievedBpm - targetBpm) / targetBpm) * 100
  const bpmStars = pctDiff < 5 ? 3 : pctDiff < 15 ? 2 : 1
  return Math.min(qualityStars, bpmStars)
}

export function RollDetector({ notes, isListening, targetBpm, onScore, onClear }: RollDetectorProps) {
  const [rollResult, setRollResult] = useState<RollDetectionResult | null>(null)
  const [history, setHistory] = useState<DetectionEvent[]>([])
  // null = idle, 'miss' = thumbs down, number = star count
  const [flashResult, setFlashResult] = useState<number | 'miss' | null>(null)
  const [flashRollName, setFlashRollName] = useState('')
  const waitingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  // Evaluate after every 8 open-string notes
  useEffect(() => {
    const openCount = notes.filter((n) => n.banjoString !== null).length

    if (openCount < TRACE_LENGTH) {
      setRollResult(null)
      return
    }
    if (waitingRef.current) return

    const result = detectRolls(notes)
    setRollResult(result)
    waitingRef.current = true

    const best = result.bestMatch
    if (best) {
      const achievedBpm = calcBpm(best.interNoteGapsMs)
      const stars = calcStars(best.compositeScore, achievedBpm, targetBpm)
      setFlashResult(stars)
      setFlashRollName(best.pattern.name)
      setHistory((prev) =>
        [{ rollName: best.pattern.name, stars, bpm: achievedBpm }, ...prev].slice(0, 5)
      )
      onScore?.(best.sequenceScore, best.timingScore)
    } else {
      setFlashResult('miss')
      setFlashRollName('')
      setHistory((prev) =>
        [{ rollName: 'Miss', stars: 0, bpm: 0 }, ...prev].slice(0, 5)
      )
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFlashResult(null)
      waitingRef.current = false
      onClear?.()
    }, RESULT_DISPLAY_MS)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  const openNotes = notes.filter((n) => n.banjoString !== null).slice(-TRACE_LENGTH)

  return (
    <div className="roll-detector">
      <div className="roll-detector-title">Roll Detector</div>

      {/* Detection history */}
      {history.length > 0 && (
        <div className="roll-history">
          {history.map((evt, i) => (
            <div
              key={i}
              className={`roll-history-badge ${i === 0 ? 'roll-history-badge-latest' : ''}`}
              style={{ opacity: Math.max(0.3, 1 - i * 0.18) }}
            >
              {evt.stars === 0 ? (
                <span className="roll-miss-icon-sm">👎</span>
              ) : (
                <span className="roll-history-stars">
                  {Array.from({ length: 3 }).map((_, s) => (
                    <span key={s} className={s < evt.stars ? 'star-on' : 'star-off'}>★</span>
                  ))}
                </span>
              )}
              <span className="roll-history-name">{evt.rollName}</span>
              {evt.bpm > 0 && <span className="roll-history-bpm">{evt.bpm} BPM</span>}
            </div>
          ))}
        </div>
      )}

      {/* Result flash */}
      {flashResult !== null && (
        flashResult === 'miss' ? (
          <div className="roll-star-flash roll-star-flash-miss">
            <div className="roll-miss-icon">👎</div>
            <div className="roll-star-label">Miss — try again!</div>
            {rollResult && rollResult.allMatches.length > 0 && (
              <div className="roll-miss-closest">
                Closest: {rollResult.allMatches[0].pattern.name} ({rollResult.allMatches[0].compositeScore}%)
              </div>
            )}
          </div>
        ) : (
          <div className="roll-star-flash">
            <div className="roll-star-icons">
              {Array.from({ length: 3 }).map((_, s) => (
                <span key={s} className={`roll-star ${s < flashResult ? 'roll-star-on' : 'roll-star-off'}`}>
                  ★
                </span>
              ))}
            </div>
            <div className="roll-star-label">{flashRollName}</div>
            {targetBpm && rollResult?.bestMatch && (
              <div className="roll-star-bpm">
                {calcBpm(rollResult.bestMatch.interNoteGapsMs)} / {targetBpm} BPM
              </div>
            )}
          </div>
        )
      )}

      {/* Live note trace — 8 slots */}
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

      {/* Waiting message */}
      {flashResult === null && (
        <div className="roll-waiting">
          {!isListening
            ? 'Tap Listen above, then play a roll pattern'
            : openNotes.length < TRACE_LENGTH
            ? `Play a roll… (${openNotes.length} / ${TRACE_LENGTH} notes)`
            : 'Evaluating…'}
        </div>
      )}
    </div>
  )
}
