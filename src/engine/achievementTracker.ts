// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Achievement Tracker
// Checks conditions after each session, stores earned achievements in Dexie.
// ─────────────────────────────────────────────────────────────────────────────

import { db, newId, nowISO } from '../db/db'
import type { Achievement } from '../db/db'
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements'

export interface AchievementContext {
  currentStreak: number
  totalMinutes: number
  totalSessions: number
  totalItems: number
  skillsByStatus: Record<string, number>
  bestBpm: number
}

export async function checkAchievements(
  userId: string,
  context: AchievementContext
): Promise<AchievementDef[]> {
  // Get already earned achievements
  const earned = await db.achievements
    .where('userId')
    .equals(userId)
    .toArray()
  const earnedIds = new Set(earned.map(a => a.achievementId))

  const newlyEarned: AchievementDef[] = []

  for (const def of ACHIEVEMENTS) {
    if (earnedIds.has(def.id)) continue

    if (isConditionMet(def, context)) {
      // Award the achievement
      const achievement: Achievement = {
        id: newId(),
        achievementId: def.id,
        userId,
        earnedAt: nowISO(),
        createdAt: nowISO(),
      }
      await db.achievements.add(achievement)
      newlyEarned.push(def)
    }
  }

  return newlyEarned
}

function isConditionMet(def: AchievementDef, ctx: AchievementContext): boolean {
  const { condition } = def
  switch (condition.type) {
    case 'streak':
      return ctx.currentStreak >= condition.days
    case 'skills_count': {
      if (condition.status === 'mastered') {
        return (ctx.skillsByStatus['mastered'] ?? 0) >= condition.count
      }
      // 'progressed' includes both progressed and mastered
      return ((ctx.skillsByStatus['progressed'] ?? 0) + (ctx.skillsByStatus['mastered'] ?? 0)) >= condition.count
    }
    case 'bpm_record':
      return ctx.bestBpm >= condition.bpm
    case 'total_minutes':
      return ctx.totalMinutes >= condition.minutes
    case 'total_sessions':
      return ctx.totalSessions >= condition.count
    case 'total_items':
      return ctx.totalItems >= condition.count
  }
}

export async function getEarnedAchievements(userId: string): Promise<{ def: AchievementDef; earnedAt: string }[]> {
  const earned = await db.achievements
    .where('userId')
    .equals(userId)
    .toArray()

  return earned
    .map(a => {
      const def = ACHIEVEMENTS.find(d => d.id === a.achievementId)
      return def ? { def, earnedAt: a.earnedAt } : null
    })
    .filter((x): x is { def: AchievementDef; earnedAt: string } => x !== null)
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
}
