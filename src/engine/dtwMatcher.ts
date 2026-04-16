// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — DTW Matcher
// Dynamic Time Warping for comparing a played note sequence against a reference.
// Custom O(N×M) implementation — sequences are 5-15 notes, runs in <1ms.
// ─────────────────────────────────────────────────────────────────────────────

import { NOTE_NAMES } from './noteCapture'
import type { CapturedNote } from './noteCapture'
// Local type — was previously exported from lickLibrary before the TabNote migration.
// Kept here so the dormant DTW pipeline still compiles; no new code feeds it.
interface ReferenceNote {
  note: string
  octave: number
  durationRatio: number
}

export interface AlignedPair {
  captured: CapturedNote
  ref: ReferenceNote
  semitones: number
}

export interface DTWResult {
  normalizedDistance: number   // 0 = perfect match, 1 = no match
  noteAccuracy: number         // 0-100: % of aligned pairs within 2 semitones
  timingAccuracy: number       // 0-100: duration ratio alignment
  alignedPairs: AlignedPair[]
  isComplete: boolean          // true if enough notes were captured to cover the reference
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function semitoneDist(
  note1: string, octave1: number,
  note2: string, octave2: number
): number {
  const midi1 = (octave1 + 1) * 12 + NOTE_NAMES.indexOf(note1)
  const midi2 = (octave2 + 1) * 12 + NOTE_NAMES.indexOf(note2)
  return Math.abs(midi1 - midi2)
}

function noteDistance(captured: CapturedNote, ref: ReferenceNote): number {
  const semitones = semitoneDist(captured.note, captured.octave, ref.note, ref.octave)
  return Math.min(1.0, semitones / 12)
}

// ── Main DTW ──────────────────────────────────────────────────────────────────

export function dtwMatch(
  captured: CapturedNote[],
  reference: ReferenceNote[]
): DTWResult {
  const N = captured.length
  const M = reference.length
  const isComplete = N >= M

  if (N === 0 || M === 0) {
    return { normalizedDistance: 1, noteAccuracy: 0, timingAccuracy: 0, alignedPairs: [], isComplete: false }
  }

  // Build DTW matrix
  const dtw: number[][] = Array.from({ length: N + 1 }, () => new Array(M + 1).fill(Infinity))
  dtw[0][0] = 0

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const cost = noteDistance(captured[i - 1], reference[j - 1])
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],       // insertion (extra notes)
        dtw[i][j - 1],       // deletion (skipped notes)
        dtw[i - 1][j - 1],   // match
      )
    }
  }

  // Traceback to build aligned pairs
  const alignedPairs: AlignedPair[] = []
  let i = N, j = M
  while (i > 0 && j > 0) {
    const diag = dtw[i - 1][j - 1]
    const up   = dtw[i - 1][j]
    const left = dtw[i][j - 1]
    alignedPairs.unshift({
      captured: captured[i - 1],
      ref: reference[j - 1],
      semitones: semitoneDist(captured[i - 1].note, captured[i - 1].octave, reference[j - 1].note, reference[j - 1].octave),
    })
    if (diag <= up && diag <= left) { i--; j-- }
    else if (up <= left) { i-- }
    else { j-- }
  }

  const normalizedDistance = Math.min(1.0, dtw[N][M] / Math.max(N, M))

  // Note accuracy: % of pairs within 2 semitones
  const accurate = alignedPairs.filter((p) => p.semitones <= 2).length
  const noteAccuracy = alignedPairs.length > 0
    ? Math.round((accurate / alignedPairs.length) * 100)
    : 0

  // Timing accuracy: compare captured duration ratios to reference
  const totalCapturedDur = captured.reduce((s, n) => s + (n.duration || 0), 0)
  let timingAccuracy = 0
  if (totalCapturedDur > 0 && alignedPairs.length >= 2) {
    const totalRefRatio = reference.reduce((s, n) => s + n.durationRatio, 0)
    let timingErrors = 0
    for (const pair of alignedPairs) {
      const capturedRatio = (pair.captured.duration / totalCapturedDur) * totalRefRatio
      const refRatio = pair.ref.durationRatio
      if (refRatio > 0) {
        const ratioError = Math.abs(capturedRatio - refRatio) / refRatio
        timingErrors += Math.min(1, ratioError)
      }
    }
    timingAccuracy = Math.max(0, Math.round((1 - timingErrors / alignedPairs.length) * 100))
  }

  return { normalizedDistance, noteAccuracy, timingAccuracy, alignedPairs, isComplete }
}
