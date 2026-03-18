// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Focus Mode (Weak Spot Drilling)
// Generates a targeted drill from the weakest skills across the curriculum.
// ─────────────────────────────────────────────────────────────────────────────

import { getAllSkills, type Skill } from '../data/curriculum'
import type { SkillRecord, SessionItem } from '../db/db'
import { db } from '../db/db'
import { analyzeWeakSpots, type WeakSpotReport } from './weakSpotAnalysis'
import type { RecommendedItem, SessionPlan } from './recommendationEngine'

export interface FocusDrillItem {
  skill: Skill
  record: SkillRecord | null
  weakSpot: WeakSpotReport | null
  suggestedBpm: number | null
  reason: string
}

export async function generateFocusDrill(
  allRecords: Map<string, SkillRecord>,
  maxItems = 5,
  targetMinutes = 10
): Promise<FocusDrillItem[]> {
  // Find all active/progressed skills with practice data
  const candidates: { skill: Skill; record: SkillRecord; accuracy: number }[] = []

  for (const skill of getAllSkills()) {
    const record = allRecords.get(skill.id)
    if (!record) continue
    if (record.status !== 'active' && record.status !== 'progressed') continue
    if (record.practiceCount < 2) continue

    // Get recent accuracy from session items
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const recentItems = await db.sessionItems
      .where('[skillId+completedAt]')
      .between([skill.id, cutoff.toISOString()], [skill.id, '\uffff'])
      .toArray()

    const scored = recentItems.filter((i) => i.compositeScore !== null)
    if (scored.length === 0) continue

    const avgAccuracy = scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length
    candidates.push({ skill, record, accuracy: avgAccuracy })
  }

  // Sort by lowest accuracy
  candidates.sort((a, b) => a.accuracy - b.accuracy)

  // Take weakest skills
  const selected = candidates.slice(0, maxItems)

  const results: FocusDrillItem[] = []
  for (const { skill, record, accuracy } of selected) {
    // Get weak spot report if roll pattern exists
    let weakSpot: WeakSpotReport | null = null
    if (skill.rollPatternId) {
      weakSpot = await analyzeWeakSpots(skill.id, skill.rollPatternId)
    }

    // Suggest BPM at -10 from current for focused work
    const currentBpm = record.currentBpm ?? record.bestBpm ?? 0
    const suggestedBpm = skill.progressBpm
      ? Math.max(40, Math.min(currentBpm - 10, skill.progressBpm))
      : null

    results.push({
      skill,
      record,
      weakSpot,
      suggestedBpm,
      reason: `Accuracy: ${Math.round(accuracy)}% — needs focused practice`,
    })
  }

  return results
}

export function focusDrillToSessionPlan(items: FocusDrillItem[]): SessionPlan {
  const recommended: RecommendedItem[] = items.map((item) => ({
    skill: item.skill,
    record: item.record,
    reason: item.reason,
    suggestedBpm: item.suggestedBpm,
    priority: 100,
  }))

  return {
    newSkills: [],
    activeWork: recommended,
    maintenance: [],
  }
}
