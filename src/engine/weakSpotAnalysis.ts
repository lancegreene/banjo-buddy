// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Weak Spot Analysis
// Queries noteAccuracyRecords to find per-position accuracy stats.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db/db'

export interface PositionStats {
  position: number
  totalAttempts: number
  hitCount: number
  hitRate: number          // 0-100
  avgTimingErrorMs: number | null
}

export interface WeakSpotReport {
  patternId: string
  positionStats: PositionStats[]
  weakestPosition: number | null
  overallAccuracy: number  // 0-100
}

export async function analyzeWeakSpots(
  skillId: string,
  patternId: string,
  windowDays = 30
): Promise<WeakSpotReport> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffISO = cutoff.toISOString()

  const records = await db.noteAccuracyRecords
    .where('[skillId+patternId+position]')
    .between(
      [skillId, patternId, Dexie.minKey],
      [skillId, patternId, Dexie.maxKey]
    )
    .filter((r) => r.createdAt >= cutoffISO)
    .toArray()

  // Group by position
  const byPosition = new Map<number, typeof records>()
  for (const r of records) {
    const arr = byPosition.get(r.position) ?? []
    arr.push(r)
    byPosition.set(r.position, arr)
  }

  // Build stats for positions 0-7
  const positionStats: PositionStats[] = []
  let totalHits = 0
  let totalAttempts = 0

  for (let pos = 0; pos < 8; pos++) {
    const posRecords = byPosition.get(pos) ?? []
    const hits = posRecords.filter((r) => r.isHit).length
    const attempts = posRecords.length

    const timingErrors = posRecords
      .filter((r) => r.timingErrorMs !== null)
      .map((r) => Math.abs(r.timingErrorMs!))
    const avgTimingErrorMs = timingErrors.length > 0
      ? Math.round(timingErrors.reduce((a, b) => a + b, 0) / timingErrors.length)
      : null

    positionStats.push({
      position: pos,
      totalAttempts: attempts,
      hitCount: hits,
      hitRate: attempts > 0 ? Math.round((hits / attempts) * 100) : 0,
      avgTimingErrorMs,
    })

    totalHits += hits
    totalAttempts += attempts
  }

  // Find weakest position (lowest hit rate with at least 3 attempts)
  const eligible = positionStats.filter((s) => s.totalAttempts >= 3)
  const weakest = eligible.length > 0
    ? eligible.reduce((a, b) => (a.hitRate < b.hitRate ? a : b))
    : null

  return {
    patternId,
    positionStats,
    weakestPosition: weakest?.position ?? null,
    overallAccuracy: totalAttempts > 0 ? Math.round((totalHits / totalAttempts) * 100) : 0,
  }
}

// Need Dexie import for minKey/maxKey
import Dexie from 'dexie'
