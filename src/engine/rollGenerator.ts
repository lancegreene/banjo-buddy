// src/engine/rollGenerator.ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Scruggs Roll Generator
// Pure function: constraints → valid RollPattern. No React, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import type { RollPattern } from '../data/rollPatterns'

export type Finger = 'T' | 'I' | 'M'

export interface RollConstraints {
  startingFinger: Finger | null       // null = any
  startingString: number | null       // 1-5, null = any
  mustIncludeStrings: number[]        // e.g. [5, 2] — must appear at least once
  thumbOnDownbeats: boolean           // force T on positions 0 and/or 4
  allowConsecutiveThumb: boolean      // allow T-T adjacency
  string5Frequency: 'never' | 'once' | 'twice' | 'any'
  directionalBias: 'none' | 'forward' | 'backward' | 'mixed'
}

export const DEFAULT_CONSTRAINTS: RollConstraints = {
  startingFinger: null,
  startingString: null,
  mustIncludeStrings: [],
  thumbOnDownbeats: true,
  allowConsecutiveThumb: false,
  string5Frequency: 'any',
  directionalBias: 'none',
}

// Scruggs finger-to-string mapping
const FINGER_STRINGS: Record<Finger, number[]> = {
  T: [3, 4, 5],
  I: [2, 3],
  M: [1],
}

// Reverse: which fingers can play each string
const STRING_FINGERS: Record<number, Finger[]> = {
  1: ['M'],
  2: ['I'],
  3: ['T', 'I'],
  4: ['T'],
  5: ['T'],
}

function getValidPairs(position: number, prev: { finger: Finger; string: number } | null, constraints: RollConstraints): { finger: Finger; string: number }[] {
  const pairs: { finger: Finger; string: number }[] = []

  for (const [strStr, fingers] of Object.entries(STRING_FINGERS)) {
    const str = Number(strStr)
    for (const finger of fingers) {
      // No consecutive same-finger (except thumb if allowed)
      if (prev && finger === prev.finger) {
        if (finger !== 'T' || !constraints.allowConsecutiveThumb) continue
      }
      // Thumb on downbeats constraint
      if (constraints.thumbOnDownbeats && (position === 0 || position === 4)) {
        if (finger !== 'T') continue
      }
      // Starting finger constraint
      if (position === 0 && constraints.startingFinger && finger !== constraints.startingFinger) continue
      // Starting string constraint
      if (position === 0 && constraints.startingString && str !== constraints.startingString) continue

      pairs.push({ finger, string: str })
    }
  }

  return pairs
}

function countString5(pattern: { string: number }[]): number {
  return pattern.filter(p => p.string === 5).length
}

function checkString5(pattern: { string: number }[], constraints: RollConstraints): boolean {
  const count = countString5(pattern)
  switch (constraints.string5Frequency) {
    case 'never': return count === 0
    case 'once': return count === 1
    case 'twice': return count === 2
    case 'any': return true
  }
}

function checkMustInclude(pattern: { string: number }[], constraints: RollConstraints): boolean {
  const present = new Set(pattern.map(p => p.string))
  return constraints.mustIncludeStrings.every(s => present.has(s))
}

function directionalScore(pattern: { string: number }[], bias: RollConstraints['directionalBias']): number {
  if (bias === 'none') return 1
  let forwardMoves = 0
  let backwardMoves = 0
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i].string < pattern[i - 1].string) forwardMoves++ // lower string number = higher pitch = "forward"
    if (pattern[i].string > pattern[i - 1].string) backwardMoves++
  }
  if (bias === 'forward') return forwardMoves - backwardMoves
  if (bias === 'backward') return backwardMoves - forwardMoves
  // mixed: reward both directions
  return Math.min(forwardMoves, backwardMoves)
}

/**
 * Generate a valid 8-note Scruggs-style roll pattern.
 * Returns null if no valid pattern can be produced after maxAttempts.
 */
export function generateRoll(constraints: RollConstraints = DEFAULT_CONSTRAINTS, maxAttempts = 200): RollPattern | null {
  let bestPattern: { finger: Finger; string: number }[] | null = null
  let bestScore = -Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pattern: { finger: Finger; string: number }[] = []
    let valid = true

    for (let pos = 0; pos < 8; pos++) {
      const prev = pos > 0 ? pattern[pos - 1] : null
      const candidates = getValidPairs(pos, prev, constraints)

      // Filter out string 5 if we've hit the limit
      const filtered = candidates.filter(c => {
        if (c.string === 5) {
          const currentCount = countString5(pattern)
          if (constraints.string5Frequency === 'never') return false
          if (constraints.string5Frequency === 'once' && currentCount >= 1) return false
          if (constraints.string5Frequency === 'twice' && currentCount >= 2) return false
        }
        return true
      })

      if (filtered.length === 0) { valid = false; break }

      // Weighted random selection
      const pick = filtered[Math.floor(Math.random() * filtered.length)]
      pattern.push(pick)
    }

    if (!valid || pattern.length !== 8) continue
    if (!checkString5(pattern, constraints)) continue
    if (!checkMustInclude(pattern, constraints)) continue

    const score = directionalScore(pattern, constraints.directionalBias)
    if (score > bestScore) {
      bestScore = score
      bestPattern = pattern
    }
  }

  if (!bestPattern) return null

  const id = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    name: `Generated Roll`,
    strings: bestPattern.map(p => p.string),
    fingers: bestPattern.map(p => p.finger),
    description: 'Custom roll created with the Roll Generator',
  }
}
