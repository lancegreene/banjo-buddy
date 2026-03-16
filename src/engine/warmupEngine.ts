// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Warm-Up Engine
// Generates a 5-min warm-up routine of simple rolls at slow BPM.
// Adapts based on what was practiced recently.
// ─────────────────────────────────────────────────────────────────────────────

import { SKILLS, type Skill } from '../data/curriculum'
import type { SkillRecord } from '../db/db'
import { db } from '../db/db'

export interface WarmUpItem {
  skill: Skill
  suggestedBpm: number
  durationSeconds: number
}

const WARMUP_BPM = 60
const WARMUP_DURATION = 300 // 5 minutes total
const WARMUP_CATEGORIES = ['rolls', 'techniques'] as const

export async function generateWarmUp(
  allRecords: Map<string, SkillRecord>,
  userId: string
): Promise<WarmUpItem[]> {
  // Find recently practiced skill IDs (last 2 days) to avoid
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 2)
  const recentSessions = await db.practiceSessions
    .where('date')
    .above(cutoff.toISOString().slice(0, 10))
    .and((s) => s.userId === userId)
    .toArray()

  const recentSessionIds = new Set(recentSessions.map((s) => s.id))
  const recentItems = await db.sessionItems.toArray()
  const recentSkillIds = new Set(
    recentItems
      .filter((i) => recentSessionIds.has(i.sessionId))
      .map((i) => i.skillId)
  )

  // Find warm-up candidates: simple roll/technique skills that are unlocked+
  const candidates = SKILLS.filter((skill) => {
    if (!WARMUP_CATEGORIES.includes(skill.category as typeof WARMUP_CATEGORIES[number])) return false
    const record = allRecords.get(skill.id)
    if (!record) return false
    if (record.status === 'locked') return false
    // Prefer skills NOT recently practiced for variety
    return true
  })

  // Sort: not-recently-practiced first, then by month (simpler first)
  candidates.sort((a, b) => {
    const aRecent = recentSkillIds.has(a.id) ? 1 : 0
    const bRecent = recentSkillIds.has(b.id) ? 1 : 0
    if (aRecent !== bRecent) return aRecent - bRecent
    return a.month - b.month
  })

  // Take enough skills for ~5 min (60s each)
  const itemCount = Math.min(5, candidates.length)
  const perItemDuration = Math.floor(WARMUP_DURATION / Math.max(1, itemCount))

  return candidates.slice(0, itemCount).map((skill) => ({
    skill,
    suggestedBpm: WARMUP_BPM,
    durationSeconds: perItemDuration,
  }))
}
