// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Detection Engine
// Matches a stream of CapturedNotes against known roll patterns.
// Run this in onNoteDetected callback (~8-10 Hz), NOT in the RAF loop.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapturedNote } from './noteCapture'
import { ROLL_PATTERNS, type RollPattern } from '../data/rollPatterns'

export interface RollMatch {
  pattern: RollPattern
  sequenceScore: number    // 0-100: % of string sequence that matched
  timingScore: number      // 0-100: regularity of inter-note timing
  compositeScore: number   // 0.6 * sequence + 0.4 * timing
  interNoteGapsMs: number[]
}

export interface RollDetectionResult {
  bestMatch: RollMatch | null
  allMatches: RollMatch[]
  isRolling: boolean        // true if bestMatch compositeScore >= 60
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function extractStringSequence(notes: CapturedNote[]): {
  strings: number[]
  timestamps: number[]
} {
  const openNotes = notes.filter((n) => n.banjoString !== null)
  return {
    strings: openNotes.map((n) => n.banjoString!),
    timestamps: openNotes.map((n) => n.timestamp),
  }
}

// Sliding window: best score of any N-length window over detected strings
function scoreSequenceMatch(detected: number[], pattern: (number | null)[]): number {
  const N = pattern.length
  if (detected.length < N) return 0

  let bestScore = 0
  const searchStart = Math.max(0, detected.length - N * 2)

  for (let i = searchStart; i <= detected.length - N; i++) {
    let matches = 0
    for (let j = 0; j < N; j++) {
      const patStr = pattern[j]
      if (patStr === null || patStr === detected[i + j]) matches++
    }
    bestScore = Math.max(bestScore, (matches / N) * 100)
  }

  return bestScore
}

// Coefficient of variation: lower = more regular timing = higher score
function scoreTimingRegularity(timestamps: number[]): number {
  if (timestamps.length < 3) return 0

  const gaps: number[] = []
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(timestamps[i] - timestamps[i - 1])
  }

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
  if (mean === 0) return 0

  const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length
  const cv = Math.sqrt(variance) / mean

  // CV of 0 = perfect = 100. CV >= 0.45 = poor = 0
  return Math.max(0, Math.round((1 - cv / 0.45) * 100))
}

// ── Public API ────────────────────────────────────────────────────────────────

export function detectRolls(notes: CapturedNote[]): RollDetectionResult {
  const { strings, timestamps } = extractStringSequence(notes)

  const matches: RollMatch[] = ROLL_PATTERNS.map((pattern) => {
    const N = pattern.strings.length
    const seqScore = scoreSequenceMatch(strings, pattern.strings)
    const recentTimestamps = timestamps.slice(-N)
    const timingScore = scoreTimingRegularity(recentTimestamps)
    const compositeScore = Math.round(0.6 * seqScore + 0.4 * timingScore)

    const gaps: number[] = []
    for (let i = 1; i < recentTimestamps.length; i++) {
      gaps.push(recentTimestamps[i] - recentTimestamps[i - 1])
    }

    return { pattern, sequenceScore: Math.round(seqScore), timingScore, compositeScore, interNoteGapsMs: gaps }
  }).sort((a, b) => b.compositeScore - a.compositeScore)

  const bestMatch = matches[0].compositeScore >= 50 ? matches[0] : null

  return { bestMatch, allMatches: matches, isRolling: bestMatch !== null }
}
