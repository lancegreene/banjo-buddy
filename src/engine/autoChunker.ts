import type { NoteEvaluation } from './streamingRollMatcher'

export interface ChunkDrill {
  startPosition: number  // start index in pattern
  endPosition: number    // end index (exclusive)
  accuracy: number       // 0-100
  suggestedBpm: number
  repetitions: number
}

const ACCURACY_THRESHOLD = 70
const BPM_REDUCTION_PERCENT = 20
const DEFAULT_REPS = 3

export function identifyWeakChunks(
  evaluations: NoteEvaluation[],
  patternLength: number,
  currentBpm: number
): ChunkDrill[] {
  if (evaluations.length < patternLength) return []

  const chunks: ChunkDrill[] = []

  // Analyze in groups of patternLength (one full pattern cycle)
  for (let start = 0; start + patternLength <= evaluations.length; start += patternLength) {
    const chunk = evaluations.slice(start, start + patternLength)
    const hits = chunk.filter(e => e.isHit).length
    const accuracy = Math.round((hits / chunk.length) * 100)

    if (accuracy < ACCURACY_THRESHOLD) {
      // Find the weakest contiguous sub-section (half-pattern)
      const halfLen = Math.ceil(patternLength / 2)
      let worstStart = start
      let worstAccuracy = 100

      for (let s = start; s + halfLen <= start + patternLength; s++) {
        const sub = evaluations.slice(s, s + halfLen)
        const subHits = sub.filter(e => e.isHit).length
        const subAcc = Math.round((subHits / sub.length) * 100)
        if (subAcc < worstAccuracy) {
          worstAccuracy = subAcc
          worstStart = s
        }
      }

      chunks.push({
        startPosition: worstStart % patternLength,
        endPosition: (worstStart + halfLen) % patternLength || patternLength,
        accuracy: worstAccuracy,
        suggestedBpm: Math.max(40, Math.round(currentBpm * (1 - BPM_REDUCTION_PERCENT / 100))),
        repetitions: DEFAULT_REPS,
      })
    }
  }

  // Deduplicate overlapping chunks
  const unique = chunks.filter((chunk, idx) =>
    !chunks.some((other, oidx) =>
      oidx < idx && other.startPosition === chunk.startPosition && other.endPosition === chunk.endPosition
    )
  )

  return unique
}
