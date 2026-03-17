// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Weekly Challenge Engine
// Rotates challenges by date, tracks completion.
// ─────────────────────────────────────────────────────────────────────────────

import { db, newId, nowISO } from '../db/db'
import { SKILLS } from '../data/curriculum'

export interface Challenge {
  id: string
  title: string
  description: string
  skillId: string
  targetBpm: number
  targetAccuracy: number
  weekStart: string   // ISO date (Monday)
}

// Generate a rotating challenge based on the current week
export function getCurrentChallenge(): Challenge {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekStart = monday.toISOString().slice(0, 10)

  // Use week number as seed for deterministic rotation
  const weekNum = Math.floor(monday.getTime() / (7 * 24 * 60 * 60 * 1000))

  // Filter to skills with BPM targets
  const bpmSkills = SKILLS.filter(s => s.progressBpm && s.progressBpm >= 60)
  if (bpmSkills.length === 0) {
    return {
      id: `challenge-${weekStart}`,
      title: 'Practice Challenge',
      description: 'Practice any skill 3 times this week',
      skillId: SKILLS[0]?.id ?? '',
      targetBpm: 60,
      targetAccuracy: 70,
      weekStart,
    }
  }

  const skill = bpmSkills[weekNum % bpmSkills.length]
  const targetBpm = skill.progressBpm! + 10

  return {
    id: `challenge-${weekStart}`,
    title: `${skill.name} Speed Challenge`,
    description: `Hit ${targetBpm} BPM with 80%+ accuracy on ${skill.name}`,
    skillId: skill.id,
    targetBpm,
    targetAccuracy: 80,
    weekStart,
  }
}

export async function checkChallengeCompletion(
  challenge: Challenge,
  userId: string
): Promise<boolean> {
  const items = await db.sessionItems
    .where('[skillId+completedAt]')
    .between(
      [challenge.skillId, challenge.weekStart],
      [challenge.skillId, challenge.weekStart + '\uffff']
    )
    .toArray()

  return items.some(item =>
    (item.achievedBpm ?? 0) >= challenge.targetBpm &&
    (item.compositeScore ?? 0) >= challenge.targetAccuracy
  )
}

export interface ExportableSession {
  skillName: string
  date: string
  bpm: number | null
  score: number | null
  duration: number | null
}

export function exportSessionAsJson(sessions: ExportableSession[]): string {
  return JSON.stringify({
    app: 'Banjo Buddy',
    exportedAt: nowISO(),
    sessions,
  }, null, 2)
}
