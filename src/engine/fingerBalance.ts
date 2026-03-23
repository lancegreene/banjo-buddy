// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Finger Velocity Balance
// Computes per-finger (T/I/M) hit rates and evenness from NoteEvaluations.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { NoteEvaluation } from './streamingRollMatcher'

export type Finger = 'T' | 'I' | 'M'

export interface FingerStat {
  count: number
  hits: number
  hitRate: number  // 0-100
  pct: number      // % of total notes attributed to this finger
}

export interface FingerBalance {
  thumb: FingerStat
  index: FingerStat
  middle: FingerStat
  evenness: number  // 0-100 — how even the hit rates are across fingers
}

function emptyStat(): FingerStat {
  return { count: 0, hits: 0, hitRate: 0, pct: 0 }
}

export function computeFingerBalance(
  evaluations: NoteEvaluation[],
  fingers: Finger[]
): FingerBalance {
  const stats: Record<Finger, FingerStat> = {
    T: emptyStat(),
    I: emptyStat(),
    M: emptyStat(),
  }

  if (evaluations.length === 0 || fingers.length === 0) {
    return { thumb: stats.T, index: stats.I, middle: stats.M, evenness: 0 }
  }

  for (const ev of evaluations) {
    const finger = fingers[ev.position % fingers.length]
    if (!finger) continue
    stats[finger].count++
    if (ev.isHit) stats[finger].hits++
  }

  const total = evaluations.length
  for (const f of ['T', 'I', 'M'] as Finger[]) {
    const s = stats[f]
    s.hitRate = s.count > 0 ? Math.round((s.hits / s.count) * 100) : 0
    s.pct = Math.round((s.count / total) * 100)
  }

  // Evenness: how close the hit rates are to each other (only for fingers that appear)
  const activeRates = (['T', 'I', 'M'] as Finger[])
    .filter(f => stats[f].count > 0)
    .map(f => stats[f].hitRate)

  let evenness = 100
  if (activeRates.length >= 2) {
    const mean = activeRates.reduce((a, b) => a + b, 0) / activeRates.length
    const maxDev = Math.max(...activeRates.map(r => Math.abs(r - mean)))
    // 0 deviation = 100 evenness, 50+ deviation = 0 evenness
    evenness = Math.max(0, Math.round(100 * (1 - maxDev / 50)))
  }

  return {
    thumb: stats.T,
    index: stats.I,
    middle: stats.M,
    evenness,
  }
}
