// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Streaming Song Matcher
// Extends the streaming roll matcher pattern for full song sections.
// Matches by string + fret (not just string). Tracks per-measure accuracy.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapturedNote } from './noteCapture'
import type { Measure } from '../data/songLibrary'
import type { TabNote } from '../engine/banjoSynth'
import { BANJO_STRINGS } from './noteCapture'

export interface SongNoteEvaluation {
  position: number              // absolute note index in section
  measureIndex: number
  beatInMeasure: number
  expectedString: number
  expectedFret: number
  playedString: number | null
  isHit: boolean                // string matches (fret matching is approximate)
  isStringHit: boolean          // just string correct
  timestampMs: number
  technique?: string
}

export interface StreamingSongState {
  cursor: number                    // index into flattened note list
  evaluations: SongNoteEvaluation[]
  measureAccuracies: number[]       // per-measure hit%
  overallAccuracy: number           // overall hit%
  totalNotes: number                // total expected notes
}

/** Flatten a section's measures into an ordered note list with absolute positions */
function flattenMeasures(measures: Measure[]): (TabNote & { measureIndex: number })[] {
  const result: (TabNote & { measureIndex: number })[] = []
  for (let m = 0; m < measures.length; m++) {
    for (const note of measures[m].notes) {
      result.push({ ...note, measureIndex: m })
    }
  }
  return result
}

export function createSongMatcherState(measures: Measure[]): StreamingSongState {
  const allNotes = flattenMeasures(measures)
  return {
    cursor: 0,
    evaluations: [],
    measureAccuracies: measures.map(() => 0),
    overallAccuracy: 0,
    totalNotes: allNotes.length,
  }
}

/** Estimate which fret is being played from frequency + detected string */
function estimateFret(freq: number, stringNum: number): number {
  const stringData = BANJO_STRINGS.find((s) => s.string === stringNum)
  if (!stringData) return 0
  const semitones = 12 * Math.log2(freq / stringData.freq)
  return Math.max(0, Math.round(semitones))
}

export function advanceSongMatcher(
  state: StreamingSongState,
  note: CapturedNote,
  measures: Measure[]
): StreamingSongState {
  const allNotes = flattenMeasures(measures)
  if (state.cursor >= allNotes.length) return state

  const expected = allNotes[state.cursor]
  const playedString = note.banjoString
  const isStringHit = playedString === expected.string

  // For fretted notes, estimate the fret from detected frequency
  let isFretHit = true
  if (expected.fret > 0 && playedString !== null) {
    const detectedFret = estimateFret(note.freq, playedString)
    isFretHit = Math.abs(detectedFret - expected.fret) <= 1  // allow ±1 fret tolerance
  }

  const isHit = isStringHit && isFretHit

  const evaluation: SongNoteEvaluation = {
    position: state.cursor,
    measureIndex: expected.measureIndex,
    beatInMeasure: expected.beat,
    expectedString: expected.string,
    expectedFret: expected.fret,
    playedString,
    isHit,
    isStringHit,
    timestampMs: note.timestamp,
    technique: expected.technique,
  }

  const newEvaluations = [...state.evaluations, evaluation]
  const newCursor = state.cursor + 1

  // Compute per-measure accuracies
  const measureAccuracies = measures.map((_, mi) => {
    const measEvals = newEvaluations.filter((e) => e.measureIndex === mi)
    if (measEvals.length === 0) return 0
    const hits = measEvals.filter((e) => e.isHit).length
    return Math.round((hits / measEvals.length) * 100)
  })

  const totalHits = newEvaluations.filter((e) => e.isHit).length
  const overallAccuracy = Math.round((totalHits / newEvaluations.length) * 100)

  return {
    cursor: newCursor,
    evaluations: newEvaluations,
    measureAccuracies,
    overallAccuracy,
    totalNotes: allNotes.length,
  }
}
