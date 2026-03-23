// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Weak-Spot Exercise Generator
// Procedurally generates targeted mini-drills from position accuracy data.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { WeakSpotReport, PositionStats } from './weakSpotAnalysis'
import { ROLL_MAP } from '../data/rollPatterns'

export interface DrillExercise {
  id: string
  title: string
  description: string
  pattern: (number | null)[]     // string numbers for the drill
  fingers: ('T' | 'I' | 'M')[]
  targetPositions: number[]      // positions this drill targets
  suggestedBpm: number
  reps: number
}

/**
 * Generate targeted exercises from weak spot data.
 * Produces 1-3 drills focusing on the weakest positions.
 */
export function generateWeakSpotDrills(
  report: WeakSpotReport,
  currentBpm: number,
  maxDrills: number = 3
): DrillExercise[] {
  const pattern = ROLL_MAP.get(report.patternId)
  if (!pattern) return []

  // Find positions that need work (< 80% hit rate with >= 3 attempts)
  const weakPositions = report.positionStats
    .filter(s => s.totalAttempts >= 3 && s.hitRate < 80)
    .sort((a, b) => a.hitRate - b.hitRate)

  if (weakPositions.length === 0) return []

  const drills: DrillExercise[] = []
  const drillBpm = Math.max(40, currentBpm - 20) // slow down significantly for drills

  // Drill 1: Isolation — repeat the weakest position's note 4x then full pattern
  const weakest = weakPositions[0]
  drills.push(makeIsolationDrill(weakest, pattern, drillBpm))

  // Drill 2: Bracket — play the note before, the weak note, and the note after, looped
  if (weakPositions.length >= 1) {
    drills.push(makeBracketDrill(weakest, pattern, drillBpm))
  }

  // Drill 3: Accent — full pattern but accent (mentally focus on) the weak positions
  if (weakPositions.length >= 2) {
    drills.push(makeAccentDrill(weakPositions.slice(0, 3), pattern, drillBpm + 10))
  }

  return drills.slice(0, maxDrills)
}

function makeIsolationDrill(
  weak: PositionStats,
  pattern: { strings: (number | null)[]; fingers?: ('T' | 'I' | 'M')[]; name: string },
  bpm: number
): DrillExercise {
  const pos = weak.position
  const str = pattern.strings[pos]
  const finger = pattern.fingers?.[pos] ?? 'T'
  const stringLabel = str !== null ? `string ${str}` : 'rest'

  // 4x the weak note, then the full pattern
  const drillPattern: (number | null)[] = [str, str, str, str, ...pattern.strings]
  const drillFingers: ('T' | 'I' | 'M')[] = [
    finger, finger, finger, finger,
    ...(pattern.fingers ?? pattern.strings.map(() => 'T' as const)),
  ]

  return {
    id: `isolation-${pos}`,
    title: `Isolate Position ${pos + 1}`,
    description: `Repeat ${stringLabel} (${finger}) 4 times, then play the full ${pattern.name}. Focus on clean contact at position ${pos + 1}. Currently ${weak.hitRate}% accuracy.`,
    pattern: drillPattern,
    fingers: drillFingers,
    targetPositions: [pos],
    suggestedBpm: bpm,
    reps: 4,
  }
}

function makeBracketDrill(
  weak: PositionStats,
  pattern: { strings: (number | null)[]; fingers?: ('T' | 'I' | 'M')[]; name: string },
  bpm: number
): DrillExercise {
  const len = pattern.strings.length
  const pos = weak.position
  const before = (pos - 1 + len) % len
  const after = (pos + 1) % len

  // 3-note bracket repeated 4 times
  const bracketPattern: (number | null)[] = []
  const bracketFingers: ('T' | 'I' | 'M')[] = []
  for (let i = 0; i < 4; i++) {
    bracketPattern.push(pattern.strings[before], pattern.strings[pos], pattern.strings[after])
    bracketFingers.push(
      pattern.fingers?.[before] ?? 'T',
      pattern.fingers?.[pos] ?? 'T',
      pattern.fingers?.[after] ?? 'T',
    )
  }

  const finger = pattern.fingers?.[pos] ?? 'T'
  return {
    id: `bracket-${pos}`,
    title: `Bracket Position ${pos + 1}`,
    description: `Play the notes around position ${pos + 1}: before → target → after. This builds muscle memory for the transition into and out of the weak spot (${finger}, ${weak.hitRate}% accuracy).`,
    pattern: bracketPattern,
    fingers: bracketFingers,
    targetPositions: [pos],
    suggestedBpm: bpm,
    reps: 4,
  }
}

function makeAccentDrill(
  weakPositions: PositionStats[],
  pattern: { strings: (number | null)[]; fingers?: ('T' | 'I' | 'M')[]; name: string },
  bpm: number
): DrillExercise {
  const posLabels = weakPositions.map(w => `${w.position + 1}`).join(', ')

  return {
    id: `accent-${weakPositions.map(w => w.position).join('-')}`,
    title: 'Accent Weak Spots',
    description: `Play the full ${pattern.name} but mentally accent positions ${posLabels}. Slightly exaggerate the pick stroke at those positions to build strength and precision.`,
    pattern: [...pattern.strings],
    fingers: [...(pattern.fingers ?? pattern.strings.map(() => 'T' as const))],
    targetPositions: weakPositions.map(w => w.position),
    suggestedBpm: bpm,
    reps: 6,
  }
}
