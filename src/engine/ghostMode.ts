// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Ghost Mode Engine
// DTW (Dynamic Time Warping) alignment for comparing live playing against
// a reference recording. Computes per-note timing deltas and overall similarity.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapturedNote } from './noteCapture'

export interface GhostNote {
  string: number
  timestamp: number   // ms from start
  frequency: number
}

export interface AlignmentResult {
  similarity: number           // 0-100 overall match
  noteMatches: NoteMatch[]
  totalRefNotes: number
  matchedNotes: number
  avgTimingDelta: number       // mean absolute timing error in ms
}

export interface NoteMatch {
  refIndex: number
  liveIndex: number | null     // null = missed note
  refNote: GhostNote
  liveNote: GhostNote | null
  timingDeltaMs: number        // positive = late, negative = early
  stringMatch: boolean
}

/**
 * Extract ghost notes from captured notes.
 * Normalizes timestamps to start at 0.
 */
export function capturedToGhostNotes(notes: CapturedNote[]): GhostNote[] {
  if (notes.length === 0) return []
  const startTime = notes[0].timestamp
  return notes
    .filter(n => n.banjoString !== null)
    .map(n => ({
      string: n.banjoString!,
      timestamp: n.timestamp - startTime,
      frequency: n.frequency,
    }))
}

/**
 * Align live notes against reference notes using DTW.
 * Returns per-note match quality and overall similarity.
 */
export function alignWithDTW(
  reference: GhostNote[],
  live: GhostNote[],
  maxTimingWindowMs: number = 500
): AlignmentResult {
  if (reference.length === 0) {
    return { similarity: 0, noteMatches: [], totalRefNotes: 0, matchedNotes: 0, avgTimingDelta: 0 }
  }

  if (live.length === 0) {
    return {
      similarity: 0,
      noteMatches: reference.map((ref, i) => ({
        refIndex: i,
        liveIndex: null,
        refNote: ref,
        liveNote: null,
        timingDeltaMs: 0,
        stringMatch: false,
      })),
      totalRefNotes: reference.length,
      matchedNotes: 0,
      avgTimingDelta: 0,
    }
  }

  const n = reference.length
  const m = live.length

  // Cost function: timing distance + string mismatch penalty
  function cost(ref: GhostNote, liv: GhostNote): number {
    const timeDist = Math.abs(ref.timestamp - liv.timestamp)
    const stringPenalty = ref.string === liv.string ? 0 : 200
    return timeDist + stringPenalty
  }

  // DTW matrix
  const dtw: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(Infinity)
  )
  dtw[0][0] = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = cost(reference[i - 1], live[j - 1])
      dtw[i][j] = c + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1])
    }
  }

  // Trace back the optimal path
  const matches: NoteMatch[] = []
  let i = n, j = m
  const matchedRef = new Set<number>()
  const matchedLive = new Set<number>()

  while (i > 0 && j > 0) {
    const refNote = reference[i - 1]
    const liveNote = live[j - 1]
    const timeDelta = liveNote.timestamp - refNote.timestamp

    // Only count as a match if within timing window
    if (Math.abs(timeDelta) <= maxTimingWindowMs) {
      matchedRef.add(i - 1)
      matchedLive.add(j - 1)
    }

    matches.push({
      refIndex: i - 1,
      liveIndex: j - 1,
      refNote,
      liveNote,
      timingDeltaMs: timeDelta,
      stringMatch: refNote.string === liveNote.string,
    })

    // Step back
    const diagCost = dtw[i - 1][j - 1]
    const leftCost = dtw[i][j - 1]
    const upCost = dtw[i - 1][j]

    if (diagCost <= leftCost && diagCost <= upCost) {
      i--; j--
    } else if (upCost <= leftCost) {
      i--
    } else {
      j--
    }
  }

  // Add unmatched reference notes
  for (let k = 0; k < n; k++) {
    if (!matchedRef.has(k)) {
      matches.push({
        refIndex: k,
        liveIndex: null,
        refNote: reference[k],
        liveNote: null,
        timingDeltaMs: 0,
        stringMatch: false,
      })
    }
  }

  matches.sort((a, b) => a.refIndex - b.refIndex)

  const matched = matches.filter(m => m.liveIndex !== null && m.stringMatch)
  const avgDelta = matched.length > 0
    ? Math.round(matched.reduce((a, b) => a + Math.abs(b.timingDeltaMs), 0) / matched.length)
    : 0

  const similarity = Math.round((matched.length / n) * 100)

  return {
    similarity,
    noteMatches: matches,
    totalRefNotes: n,
    matchedNotes: matched.length,
    avgTimingDelta: avgDelta,
  }
}

/**
 * Extract ghost notes from a recording's audio blob by analyzing it
 * through pitch detection. This is a stub that will be implemented
 * when recordings are available — for now, ghost notes should be
 * captured live during recording via the note detection engine.
 */
export function extractNotesFromRecording(
  _audioBlob: Blob
): Promise<GhostNote[]> {
  // Future: run pitchy analysis offline over the audio buffer
  // For now, ghost notes should be saved alongside recordings
  return Promise.resolve([])
}
