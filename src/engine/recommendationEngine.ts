// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Recommendation Engine
//
// Decides what to practice in today's session based on:
//   1. Skill status (locked → unlocked → active → progressed → mastered)
//   2. Days since last practiced (recency)
//   3. BPM gap from progress/mastery thresholds
//   4. Session balance: new material / weak spots / maintenance
// ─────────────────────────────────────────────────────────────────────────────

import { SKILLS, type Skill, type Path } from '../data/curriculum'
import type { SkillRecord, SessionItem } from '../db/db'
import type { SkillStatus } from '../db/db'

export interface RecommendedItem {
  skill: Skill
  record: SkillRecord | null
  reason: string
  suggestedBpm: number | null
  priority: number   // higher = more urgent
}

export interface SessionPlan {
  newSkills: RecommendedItem[]       // 25% of session — newly unlocked skills
  activeWork: RecommendedItem[]      // 50% — below progress BPM, needs focused drilling
  maintenance: RecommendedItem[]     // 25% — progressed/mastered, keep sharp
}

// ── Status evaluation ─────────────────────────────────────────────────────────

export function evaluateSkillStatus(
  skill: Skill,
  record: SkillRecord | null,
  allRecords: Map<string, SkillRecord>
): SkillStatus {
  // Skills with no prerequisites are always unlocked
  const prereqsMet = skill.prerequisites.every((prereqId) => {
    const prereqRecord = allRecords.get(prereqId)
    return prereqRecord && (prereqRecord.status === 'progressed' || prereqRecord.status === 'mastered')
  })

  if (!prereqsMet) return 'locked'
  if (!record || record.status === 'locked') return 'unlocked'

  // For non-BPM skills, trust the stored status (set by deriveNewStatus from self-rating)
  if (skill.progressBpm === null && skill.masteryBpm === null) {
    if (record.status === 'mastered') return 'mastered'
    if (record.status === 'progressed') return 'progressed'
    if (record.practiceCount > 0) return 'active'
    return 'unlocked'
  }

  // BPM-based status
  if (skill.masteryBpm !== null && record.bestBpm !== null && record.bestBpm >= skill.masteryBpm) {
    return 'mastered'
  }
  if (skill.progressBpm !== null && record.bestBpm !== null && record.bestBpm >= skill.progressBpm) {
    return 'progressed'
  }
  if (record.practiceCount > 0) return 'active'

  return 'unlocked'
}

// ── Priority scoring ──────────────────────────────────────────────────────────

function daysSince(isoDate: string | null): number {
  if (!isoDate) return 999
  const ms = Date.now() - new Date(isoDate).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function bpmGapScore(skill: Skill, record: SkillRecord | null): number {
  // How far is the player from their next BPM threshold?
  const currentBpm = record?.bestBpm ?? 0
  const targetBpm = skill.progressBpm ?? skill.masteryBpm
  if (!targetBpm) return 0
  const gap = targetBpm - currentBpm
  // Normalize: bigger gap = higher priority (up to 50 points)
  return Math.min(50, Math.max(0, gap / 2))
}

function recencyScore(record: SkillRecord | null): number {
  // Skills not practiced recently get higher priority (up to 40 points)
  const days = daysSince(record?.lastPracticed ?? null)
  if (days >= 7) return 40
  if (days >= 3) return 25
  if (days >= 1) return 10
  return 0
}

function practiceCountScore(record: SkillRecord | null): number {
  // New skills with low practice counts get a boost
  const count = record?.practiceCount ?? 0
  if (count === 0) return 20
  if (count < 3) return 10
  if (count < 7) return 5
  return 0
}

function accuracyScore(recentItems: SessionItem[]): number {
  if (recentItems.length === 0) return 0
  const scored = recentItems.filter((i) => i.compositeScore !== null)
  if (scored.length === 0) return 0
  const avg = scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length
  // Low accuracy = high priority boost: score 90+ = 0, score 50 = 40, score 0 = 50
  if (avg >= 90) return 0
  return Math.min(50, Math.round((90 - avg) * (50 / 90)))
}

function computePriority(
  skill: Skill,
  record: SkillRecord | null,
  status: SkillStatus,
  recentItems: SessionItem[] = []
): number {
  if (status === 'locked' || status === 'mastered') return 0
  return bpmGapScore(skill, record) + recencyScore(record) + practiceCountScore(record) + accuracyScore(recentItems)
}

// ── BPM suggestion ────────────────────────────────────────────────────────────

function suggestBpm(skill: Skill, record: SkillRecord | null, recentItems: SessionItem[] = []): number | null {
  if (!skill.progressBpm && !skill.masteryBpm) return null

  const current = record?.bestBpm ?? 0
  const target = skill.progressBpm ?? skill.masteryBpm!

  let suggested: number
  if (current === 0) {
    // First time — start at 60% of progress BPM
    suggested = Math.round((target * 0.6) / 5) * 5
  } else if (current >= target) {
    // Already progressed — suggest 5 BPM above current toward mastery
    const masteryTarget = skill.masteryBpm ?? target
    suggested = Math.min(current + 5, masteryTarget)
  } else {
    // Suggest 5 BPM above their last achievement, capped at target
    suggested = Math.min(current + 5, target)
  }

  // If recent accuracy is low, drop suggested BPM to let them clean up
  const scored = recentItems.filter((i) => i.compositeScore !== null)
  if (scored.length > 0) {
    const avgAccuracy = scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length
    if (avgAccuracy < 70) {
      suggested = Math.max(40, suggested - 10)
    }
  }

  return suggested
}

// ── Reason text ───────────────────────────────────────────────────────────────

function buildReason(skill: Skill, record: SkillRecord | null, status: SkillStatus, recentItems: SessionItem[] = []): string {
  if (status === 'unlocked' && (!record || record.practiceCount === 0)) {
    return 'New skill ready to start'
  }

  // Check recent accuracy
  const scored = recentItems.filter((i) => i.compositeScore !== null)
  if (scored.length > 0) {
    const avgAccuracy = Math.round(scored.reduce((a, b) => a + b.compositeScore!, 0) / scored.length)
    if (avgAccuracy < 70) {
      return `Accuracy is ${avgAccuracy}% — slow down and focus on clean notes`
    }
  }

  const days = daysSince(record?.lastPracticed ?? null)
  const bpm = record?.bestBpm ?? 0
  const progressTarget = skill.progressBpm

  if (progressTarget && bpm < progressTarget) {
    const gap = progressTarget - bpm
    return `${gap} BPM from progress threshold (${progressTarget} BPM)`
  }

  if (status === 'progressed') {
    if (days >= 7) return `Not practiced in ${days} days — maintenance needed`
    if (skill.masteryBpm && bpm < skill.masteryBpm) {
      return `Progressed — working toward mastery at ${skill.masteryBpm} BPM`
    }
    return 'Maintenance — keep it sharp'
  }

  if (days >= 3) return `${days} days since last practice`
  return 'Scheduled practice'
}

// ── Main recommendation function ──────────────────────────────────────────────

export function buildSessionPlan(
  path: Path,
  allRecords: Map<string, SkillRecord>,
  targetMinutes = 30,
  recentItemsBySkill: Map<string, SessionItem[]> = new Map()
): SessionPlan {
  // Filter skills for this path
  const pathSkills = SKILLS.filter((s) => s.path === path || s.path === 'all')

  // Evaluate every skill
  const evaluated = pathSkills.map((skill) => {
    const record = allRecords.get(skill.id) ?? null
    const recentItems = recentItemsBySkill.get(skill.id) ?? []
    const status = evaluateSkillStatus(skill, record, allRecords)
    const priority = computePriority(skill, record, status, recentItems)
    const reason = buildReason(skill, record, status, recentItems)
    const suggestedBpm = suggestBpm(skill, record, recentItems)
    return { skill, record, status, priority, reason, suggestedBpm }
  })

  // Bucket by category
  const newSkillCandidates = evaluated
    .filter((e) => e.status === 'unlocked' && e.priority > 0)
    .sort((a, b) => b.priority - a.priority)

  const activeCandidates = evaluated
    .filter((e) => e.status === 'active' && e.priority > 0)
    .sort((a, b) => b.priority - a.priority)

  const maintenanceCandidates = evaluated
    .filter((e) => (e.status === 'progressed') && e.priority > 0)
    .sort((a, b) => b.priority - a.priority)

  // Approximate item counts based on target time
  // Roughly: new item ~8 min, active drill ~5 min, maintenance ~3 min
  const totalSlots = Math.max(3, Math.floor(targetMinutes / 5))
  const newCount = Math.max(1, Math.round(totalSlots * 0.25))
  const activeCount = Math.max(1, Math.round(totalSlots * 0.5))
  const maintCount = Math.max(1, Math.round(totalSlots * 0.25))

  return {
    newSkills: newSkillCandidates.slice(0, newCount).map(({ skill, record, reason, suggestedBpm, priority }) => ({
      skill, record, reason, suggestedBpm, priority,
    })),
    activeWork: activeCandidates.slice(0, activeCount).map(({ skill, record, reason, suggestedBpm, priority }) => ({
      skill, record, reason, suggestedBpm, priority,
    })),
    maintenance: maintenanceCandidates.slice(0, maintCount).map(({ skill, record, reason, suggestedBpm, priority }) => ({
      skill, record, reason, suggestedBpm, priority,
    })),
  }
}

// ── Status update after a session item ───────────────────────────────────────

export interface SessionResult {
  skillId: string
  achievedBpm: number | null
  selfRating: 'felt_good' | 'ok' | 'needs_work'
  compositeScore: number | null
}

export function deriveNewStatus(
  skill: Skill,
  currentRecord: SkillRecord | null,
  result: SessionResult,
  allRecords: Map<string, SkillRecord>
): SkillStatus {
  // Non-BPM skills advance via self-rating
  if (skill.progressBpm === null && skill.masteryBpm === null) {
    const prev = currentRecord?.status ?? 'unlocked'
    if (prev === 'mastered') return 'mastered'
    if (result.selfRating === 'felt_good') {
      return prev === 'progressed' ? 'mastered' : 'progressed'
    }
    return 'active'
  }

  const newBestBpm = Math.max(
    currentRecord?.bestBpm ?? 0,
    result.achievedBpm ?? 0
  )

  // Temporarily build an updated record for evaluation
  const updatedRecord: SkillRecord = {
    ...(currentRecord ?? {
      id: '',
      userId: '',
      skillId: skill.id,
      status: 'unlocked',
      currentBpm: null,
      bestBpm: null,
      practiceCount: 0,
      lastPracticed: null,
      unlockedAt: null,
      progressedAt: null,
      masteredAt: null,
      createdAt: '',
      updatedAt: '',
    }),
    bestBpm: newBestBpm,
    currentBpm: result.achievedBpm,
    practiceCount: (currentRecord?.practiceCount ?? 0) + 1,
  }

  return evaluateSkillStatus(skill, updatedRecord, allRecords)
}

// ── Skills newly unlocked after a status update ───────────────────────────────

export function getNewlyUnlockedSkills(
  updatedSkillId: string,
  newStatus: SkillStatus,
  allRecords: Map<string, SkillRecord>,
  path: Path
): Skill[] {
  if (newStatus !== 'progressed' && newStatus !== 'mastered') return []

  const tempRecords = new Map(allRecords)
  const existing = tempRecords.get(updatedSkillId)
  if (existing) {
    tempRecords.set(updatedSkillId, { ...existing, status: newStatus })
  } else {
    // No record yet (first-ever practice) — create a minimal stub for prereq checks
    tempRecords.set(updatedSkillId, {
      id: '', userId: '', skillId: updatedSkillId,
      status: newStatus, currentBpm: null, bestBpm: null,
      practiceCount: 1, lastPracticed: null,
      unlockedAt: null, progressedAt: null, masteredAt: null,
      createdAt: '', updatedAt: '',
    } as SkillRecord)
  }

  return SKILLS.filter((s) => {
    if (s.path !== path && s.path !== 'all') return false
    if (!s.prerequisites.includes(updatedSkillId)) return false
    const currentRecord = allRecords.get(s.id)
    const wasLocked = evaluateSkillStatus(s, currentRecord ?? null, allRecords) === 'locked'
    const nowUnlocked = evaluateSkillStatus(s, currentRecord ?? null, tempRecords) === 'unlocked'
    return wasLocked && nowUnlocked
  })
}

// ── Summary stats for dashboard ───────────────────────────────────────────────

export interface PathProgress {
  total: number
  locked: number
  unlocked: number
  active: number
  progressed: number
  mastered: number
  percentComplete: number
}

export function getPathProgress(path: Path, allRecords: Map<string, SkillRecord>): PathProgress {
  const pathSkills = SKILLS.filter((s) => s.path === path || s.path === 'all')
  const counts = { locked: 0, unlocked: 0, active: 0, progressed: 0, mastered: 0 }

  for (const skill of pathSkills) {
    const record = allRecords.get(skill.id) ?? null
    const status = evaluateSkillStatus(skill, record, allRecords)
    counts[status]++
  }

  const total = pathSkills.length
  const done = counts.progressed + counts.mastered
  return { total, ...counts, percentComplete: Math.round((done / total) * 100) }
}
