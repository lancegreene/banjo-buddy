// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Live Roll Feedback
// Streaming per-note feedback for practicing a specific roll pattern.
// Replaces batch RollDetector when a specific rollPatternId is known.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import type { CapturedNote } from '../../engine/noteCapture'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'
import {
  createRollMatcherState,
  advanceRollMatcher,
  type StreamingRollState,
} from '../../engine/streamingRollMatcher'
import { ROLL_MAP } from '../../data/rollPatterns'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'

const STRING_COLORS: Record<number, string> = {
  5: '#9b59b6',
  4: '#4a9eff',
  3: '#7ed321',
  2: '#f5a623',
  1: '#e74c3c',
}

interface LiveRollFeedbackProps {
  patternId: string
  notes: CapturedNote[]
  isListening: boolean
  targetBpm: number | null
  onCycleComplete?: (cycleAccuracy: number, cycleCount: number) => void
  onScore?: (rhythmScore: number, tempoScore: number) => void
  onEvaluations?: (evaluations: NoteEvaluation[]) => void
}

export function LiveRollFeedback({
  patternId,
  notes,
  isListening,
  targetBpm,
  onCycleComplete,
  onScore,
  onEvaluations,
}: LiveRollFeedbackProps) {
  const [matcherState, setMatcherState] = useState<StreamingRollState>(() =>
    createRollMatcherState(patternId)
  )
  const processedCountRef = useRef(0)
  const prevCycleCountRef = useRef(0)

  const pattern = ROLL_MAP.get(patternId)
  const patternLen = pattern?.strings.length ?? 8

  // Reset when patternId changes or notes are cleared
  useEffect(() => {
    setMatcherState(createRollMatcherState(patternId))
    processedCountRef.current = 0
    prevCycleCountRef.current = 0
  }, [patternId])

  // Reset when notes array is cleared (length drops to 0)
  useEffect(() => {
    if (notes.length === 0) {
      setMatcherState(createRollMatcherState(patternId))
      processedCountRef.current = 0
      prevCycleCountRef.current = 0
    }
  }, [notes.length, patternId])

  // Process new notes as they arrive
  useEffect(() => {
    const openNotes = notes.filter((n) => n.banjoString !== null)
    if (openNotes.length <= processedCountRef.current) return

    let state = matcherState
    for (let i = processedCountRef.current; i < openNotes.length; i++) {
      state = advanceRollMatcher(state, openNotes[i], targetBpm)
    }
    processedCountRef.current = openNotes.length
    setMatcherState(state)

    // Fire callbacks
    onEvaluations?.(state.evaluations)

    if (state.cycleCount > prevCycleCountRef.current) {
      prevCycleCountRef.current = state.cycleCount

      // Calculate cycle accuracy from the last patternLen evaluations before this cycle boundary
      const cycleStart = state.evaluations.length - state.currentCycleEvals.length - patternLen
      const cycleEvals = state.evaluations.slice(
        Math.max(0, cycleStart),
        cycleStart + patternLen
      )
      const cycleHits = cycleEvals.filter((e) => e.isHit).length
      const cycleAccuracy = Math.round((cycleHits / patternLen) * 100)

      onCycleComplete?.(cycleAccuracy, state.cycleCount)
      onScore?.(state.rollingAccuracy, state.rollingTimingScore)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  if (!pattern) {
    return <div className="live-roll-feedback">Unknown pattern: {patternId}</div>
  }

  const currentPosition = matcherState.cursor % patternLen
  const currentCycleEvals = matcherState.currentCycleEvals
  const expectedString = pattern.strings[currentPosition]

  // Derive finger for guidance
  const fingers = pattern.fingers
  const expectedFinger = fingers
    ? fingers[currentPosition]
    : expectedString === null || expectedString >= 3
    ? 'T'
    : undefined

  // Build per-beat evaluation slots for current cycle
  const beatSlots: (NoteEvaluation | null)[] = Array.from({ length: patternLen }, (_, i) =>
    currentCycleEvals[i] ?? null
  )

  return (
    <div className="live-roll-feedback">
      <div className="live-roll-title">{pattern.name} — Live Feedback</div>

      {/* Tab diagram with cursor — use currentCycleEvals so evaluation
          positions stay aligned with beat columns. evaluations.slice(-patternLen)
          spans across cycles and shifts the X marker to the wrong beat. */}
      <BanjoTabDiagram
        strings={pattern.strings}
        fingers={pattern.fingers}
        evaluations={
          currentCycleEvals.length > 0
            ? currentCycleEvals
            : matcherState.evaluations.slice(-patternLen)
        }
        cursorPosition={currentPosition}
      />

      {/* Per-note hit/miss slots */}
      <div className="live-roll-slots">
        {beatSlots.map((evalItem, i) => {
          const isCurrent = i === currentCycleEvals.length
          return (
            <div
              key={i}
              className={`live-roll-slot ${
                evalItem
                  ? evalItem.isHit
                    ? 'live-roll-slot-hit'
                    : 'live-roll-slot-miss'
                  : ''
              } ${isCurrent ? 'live-roll-slot-current' : ''}`}
            >
              {evalItem ? (
                evalItem.isHit ? (
                  <span className="live-roll-slot-icon">&#10003;</span>
                ) : (
                  <span className="live-roll-slot-miss-detail">
                    <span className="live-roll-slot-icon">&#10007;</span>
                    <span className="live-roll-slot-miss-text">
                      exp {evalItem.expectedString}, got {evalItem.playedString ?? '?'}
                    </span>
                  </span>
                )
              ) : (
                <span className="live-roll-slot-num">{i + 1}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Guidance text */}
      {isListening && (
        <div className="live-roll-guidance">
          {currentCycleEvals.length < patternLen ? (
            <>
              Next: string{' '}
              <span
                className="live-roll-guidance-string"
                style={{ color: expectedString ? STRING_COLORS[expectedString] : '#888' }}
              >
                {expectedString ?? 'any'}
              </span>
              {expectedFinger && (
                <span className="live-roll-guidance-finger">
                  {' '}({expectedFinger === 'T' ? 'thumb' : expectedFinger === 'I' ? 'index' : 'middle'})
                </span>
              )}
            </>
          ) : (
            <span>Cycle complete! Keep going...</span>
          )}
        </div>
      )}

      {/* Rolling accuracy bar */}
      {matcherState.evaluations.length > 0 && (
        <div className="live-roll-accuracy">
          <div className="live-roll-accuracy-header">
            <span>Accuracy</span>
            <span className="live-roll-accuracy-pct">{matcherState.rollingAccuracy}%</span>
          </div>
          <div className="live-roll-accuracy-track">
            <div
              className={`live-roll-accuracy-fill ${
                matcherState.rollingAccuracy >= 90
                  ? 'live-roll-accuracy-good'
                  : matcherState.rollingAccuracy >= 70
                  ? 'live-roll-accuracy-ok'
                  : 'live-roll-accuracy-bad'
              }`}
              style={{ width: `${matcherState.rollingAccuracy}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="live-roll-stats">
        <span className="live-roll-stat">
          Cycles: {matcherState.cycleCount}
        </span>
        <span className="live-roll-stat">
          Notes: {matcherState.evaluations.length}
        </span>
        {matcherState.rollingTimingScore > 0 && (
          <span className="live-roll-stat">
            Timing: {matcherState.rollingTimingScore}%
          </span>
        )}
      </div>

      {/* Waiting message */}
      {matcherState.evaluations.length === 0 && (
        <div className="live-roll-waiting">
          {!isListening
            ? 'Tap Listen above, then play the pattern'
            : 'Play the roll pattern...'}
        </div>
      )}

      {/* Haptic on miss */}
      <MissHaptic evaluations={matcherState.evaluations} />
    </div>
  )
}

// Tiny component that fires haptic on miss
function MissHaptic({ evaluations }: { evaluations: NoteEvaluation[] }) {
  const lastCountRef = useRef(0)

  useEffect(() => {
    if (evaluations.length > lastCountRef.current) {
      const latest = evaluations[evaluations.length - 1]
      if (!latest.isHit && navigator.vibrate) {
        navigator.vibrate(50)
      }
      lastCountRef.current = evaluations.length
    }
  }, [evaluations])

  return null
}
