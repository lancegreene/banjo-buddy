// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Analytics Query Layer
// Pure async functions querying Dexie tables for progress & analytics features.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db/db'
import type { SessionItem, PracticeSession } from '../db/db'

// ── BPM Timeline ────────────────────────────────────────────────────────────

export interface BpmTimelinePoint {
  date: string      // YYYY-MM-DD
  bpm: number
  score: number | null
}

export async function getBpmTimeline(
  skillId: string,
  dateRange?: { start: string; end: string }
): Promise<BpmTimelinePoint[]> {
  let query = db.sessionItems
    .where('[skillId+completedAt]')

  let items: SessionItem[]
  if (dateRange) {
    items = await query
      .between([skillId, dateRange.start], [skillId, dateRange.end + '\uffff'])
      .toArray()
  } else {
    items = await query
      .between([skillId, ''], [skillId, '\uffff'])
      .toArray()
  }

  return items
    .filter((i) => i.achievedBpm !== null)
    .map((i) => ({
      date: i.completedAt.slice(0, 10),
      bpm: i.achievedBpm!,
      score: i.compositeScore,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ── Practice Heatmap ────────────────────────────────────────────────────────

export interface HeatmapDay {
  minutes: number
  itemCount: number
}

export async function getPracticeHeatmap(
  userId: string,
  start: string,
  end: string
): Promise<Map<string, HeatmapDay>> {
  const sessions = await db.practiceSessions
    .where('date')
    .between(start, end + '\uffff')
    .and((s) => s.userId === userId)
    .toArray()

  const sessionIds = new Set(sessions.map((s) => s.id))

  const items = await db.sessionItems
    .where('completedAt')
    .between(start, end + '\uffff')
    .and((i) => sessionIds.has(i.sessionId))
    .toArray()

  // Group items by date
  const itemsByDate = new Map<string, number>()
  for (const item of items) {
    const date = item.completedAt.slice(0, 10)
    itemsByDate.set(date, (itemsByDate.get(date) ?? 0) + 1)
  }

  const result = new Map<string, HeatmapDay>()
  for (const session of sessions) {
    const existing = result.get(session.date)
    const minutes = session.durationMinutes ?? 0
    if (existing) {
      existing.minutes += minutes
    } else {
      result.set(session.date, {
        minutes,
        itemCount: itemsByDate.get(session.date) ?? 0,
      })
    }
  }

  return result
}

// ── Session History ─────────────────────────────────────────────────────────

export interface SessionHistoryEntry {
  session: PracticeSession
  itemCount: number
  items: SessionItem[]
  avgScore: number | null
}

export async function getSessionHistory(
  userId: string,
  dateRange?: { start: string; end: string }
): Promise<SessionHistoryEntry[]> {
  let sessions: PracticeSession[]
  if (dateRange) {
    sessions = await db.practiceSessions
      .where('date')
      .between(dateRange.start, dateRange.end + '\uffff')
      .and((s) => s.userId === userId)
      .toArray()
  } else {
    sessions = await db.practiceSessions
      .where('userId')
      .equals(userId)
      .toArray()
  }

  sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  const result: SessionHistoryEntry[] = []
  for (const session of sessions) {
    const items = await db.sessionItems
      .where('sessionId')
      .equals(session.id)
      .toArray()

    const scored = items.filter((i) => i.compositeScore !== null)
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length)
      : null

    result.push({
      session,
      itemCount: items.length,
      items,
      avgScore,
    })
  }

  return result
}

// ── Skill Aggregate Stats ───────────────────────────────────────────────────

export interface SkillAggregateStats {
  totalCount: number
  avgScore: number | null
  bestBpm: number | null
  worstBpm: number | null
  firstDate: string | null
  lastDate: string | null
}

export async function getSkillAggregateStats(skillId: string): Promise<SkillAggregateStats> {
  const items = await db.sessionItems
    .where('skillId')
    .equals(skillId)
    .toArray()

  if (items.length === 0) {
    return { totalCount: 0, avgScore: null, bestBpm: null, worstBpm: null, firstDate: null, lastDate: null }
  }

  const scored = items.filter((i) => i.compositeScore !== null)
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length)
    : null

  const bpms = items.filter((i) => i.achievedBpm !== null).map((i) => i.achievedBpm!)
  const bestBpm = bpms.length > 0 ? Math.max(...bpms) : null
  const worstBpm = bpms.length > 0 ? Math.min(...bpms) : null

  const dates = items.map((i) => i.completedAt).sort()
  const firstDate = dates[0]?.slice(0, 10) ?? null
  const lastDate = dates[dates.length - 1]?.slice(0, 10) ?? null

  return { totalCount: items.length, avgScore, bestBpm, worstBpm, firstDate, lastDate }
}

// ── Overall Stats ───────────────────────────────────────────────────────────

export interface OverallStats {
  totalMinutes: number
  totalSessions: number
  skillsByStatus: Record<string, number>
  currentStreak: number
  longestStreak: number
  totalItemsCompleted: number
  avgAccuracy: number | null
}

export async function getOverallStats(userId: string, currentStreak: number): Promise<OverallStats> {
  const sessions = await db.practiceSessions
    .where('userId')
    .equals(userId)
    .toArray()

  const totalMinutes = sessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0)

  // Longest streak from streak records
  const streakRecords = await db.streakRecords
    .where('userId')
    .equals(userId)
    .sortBy('date')

  let longestStreak = 0
  let runLength = 0
  let prevDate = ''
  for (const rec of streakRecords) {
    if (prevDate) {
      const prev = new Date(prevDate)
      prev.setDate(prev.getDate() + 1)
      const expected = prev.toISOString().slice(0, 10)
      if (rec.date === expected) {
        runLength++
      } else {
        runLength = 1
      }
    } else {
      runLength = 1
    }
    longestStreak = Math.max(longestStreak, runLength)
    prevDate = rec.date
  }

  // Skills by status
  const skillRecords = await db.skillRecords
    .where('userId')
    .equals(userId)
    .toArray()

  const skillsByStatus: Record<string, number> = { locked: 0, unlocked: 0, active: 0, progressed: 0, mastered: 0 }
  for (const r of skillRecords) {
    skillsByStatus[r.status] = (skillsByStatus[r.status] ?? 0) + 1
  }

  // Total items + avg accuracy
  const sessionIds = new Set(sessions.map((s) => s.id))
  const allItems = await db.sessionItems.toArray()
  const myItems = allItems.filter((i) => sessionIds.has(i.sessionId))
  const scored = myItems.filter((i) => i.compositeScore !== null)
  const avgAccuracy = scored.length > 0
    ? Math.round(scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length)
    : null

  return {
    totalMinutes,
    totalSessions: sessions.length,
    skillsByStatus,
    currentStreak,
    longestStreak,
    totalItemsCompleted: myItems.length,
    avgAccuracy,
  }
}

// ── Recent Accuracy Trend ───────────────────────────────────────────────────

export interface AccuracyTrendPoint {
  date: string
  avgAccuracy: number
}

export async function getRecentAccuracyTrend(
  skillId: string,
  windowDays = 30
): Promise<AccuracyTrendPoint[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffISO = cutoff.toISOString()

  const items = await db.sessionItems
    .where('[skillId+completedAt]')
    .between([skillId, cutoffISO], [skillId, '\uffff'])
    .toArray()

  // Group by date, average compositeScore
  const byDate = new Map<string, number[]>()
  for (const item of items) {
    if (item.compositeScore === null) continue
    const date = item.completedAt.slice(0, 10)
    const arr = byDate.get(date) ?? []
    arr.push(item.compositeScore)
    byDate.set(date, arr)
  }

  return Array.from(byDate.entries())
    .map(([date, scores]) => ({
      date,
      avgAccuracy: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
