// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Streaming Roll Matcher
// Tracks cursor position in a roll pattern and evaluates each note as it arrives.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapturedNote } from './noteCapture'
import { ROLL_MAP } from '../data/rollPatterns'

export interface NoteEvaluation {
  position: number              // 0-7 in pattern
  expectedString: number | null
  playedString: number | null
  isHit: boolean
  timestampMs: number
  timingErrorMs: number | null  // vs expected interval from BPM
}

export interface StreamingRollState {
  patternId: string
  cursor: number                // wraps modulo pattern length
  evaluations: NoteEvaluation[]
  currentCycleEvals: NoteEvaluation[]
  cycleCount: number
  rollingAccuracy: number       // hit% over last 16 notes
  rollingTimingScore: number    // 0-100 timing regularity over last 16 notes
}

const ROLLING_WINDOW = 16

export function createRollMatcherState(patternId: string): StreamingRollState {
  return {
    patternId,
    cursor: 0,
    evaluations: [],
    currentCycleEvals: [],
    cycleCount: 0,
    rollingAccuracy: 0,
    rollingTimingScore: 0,
  }
}

export function advanceRollMatcher(
  state: StreamingRollState,
  note: CapturedNote,
  targetBpm: number | null
): StreamingRollState {
  const pattern = ROLL_MAP.get(state.patternId)
  if (!pattern) return state

  const patternLen = pattern.strings.length
  const position = state.cursor % patternLen
  const expectedString = pattern.strings[position]
  const playedString = note.banjoString

  // A hit if the expected string is null (wildcard) or matches the played string
  const isHit = expectedString === null || playedString === expectedString

  // Timing error: compare to expected interval from BPM
  let timingErrorMs: number | null = null
  if (targetBpm && state.evaluations.length > 0) {
    const expectedIntervalMs = 60000 / (targetBpm * 2) // 8th notes at given BPM
    const lastEval = state.evaluations[state.evaluations.length - 1]
    const actualIntervalMs = note.timestamp - lastEval.timestampMs
    timingErrorMs = Math.round(actualIntervalMs - expectedIntervalMs)
  }

  const evaluation: NoteEvaluation = {
    position,
    expectedString,
    playedString,
    isHit,
    timestampMs: note.timestamp,
    timingErrorMs,
  }

  const newEvaluations = [...state.evaluations, evaluation]
  const newCursor = state.cursor + 1

  // Cycle tracking
  const newCycleEvals = [...state.currentCycleEvals, evaluation]
  let cycleCount = state.cycleCount
  let currentCycleEvals = newCycleEvals

  if (newCycleEvals.length >= patternLen) {
    cycleCount++
    currentCycleEvals = []
  }

  // Rolling accuracy over last N notes
  const recentEvals = newEvaluations.slice(-ROLLING_WINDOW)
  const hits = recentEvals.filter((e) => e.isHit).length
  const rollingAccuracy = Math.round((hits / recentEvals.length) * 100)

  // Rolling timing score: coefficient of variation of intervals
  let rollingTimingScore = 0
  if (recentEvals.length >= 3) {
    const intervals: number[] = []
    for (let i = 1; i < recentEvals.length; i++) {
      intervals.push(recentEvals[i].timestampMs - recentEvals[i - 1].timestampMs)
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
    if (mean > 0) {
      const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length
      const cv = Math.sqrt(variance) / mean
      rollingTimingScore = Math.max(0, Math.round((1 - cv / 0.45) * 100))
    }
  }

  return {
    patternId: state.patternId,
    cursor: newCursor,
    evaluations: newEvaluations,
    currentCycleEvals,
    cycleCount,
    rollingAccuracy,
    rollingTimingScore,
  }
}
