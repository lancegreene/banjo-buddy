import Dexie, { type Table } from 'dexie'
import type { Path } from '../data/curriculum'

// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Local Database (Dexie / IndexedDB)
// All tables use UUIDs + timestamps so migration to cloud sync is seamless.
// ─────────────────────────────────────────────────────────────────────────────

export type SkillStatus = 'locked' | 'unlocked' | 'active' | 'progressed' | 'mastered'
export type SessionItemType = 'roll' | 'song' | 'exercise' | 'technique' | 'theory'
export type SelfRating = 'felt_good' | 'ok' | 'needs_work'

// ── Table shapes ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string           // 'local' for Phase 1, UUID for cloud
  name: string
  path: Path
  createdAt: string    // ISO
  updatedAt: string
}

export interface SkillRecord {
  id: string           // UUID
  userId: string
  skillId: string      // references SKILL_MAP key
  status: SkillStatus
  currentBpm: number | null
  bestBpm: number | null
  practiceCount: number
  lastPracticed: string | null   // ISO
  unlockedAt: string | null      // ISO
  progressedAt: string | null    // ISO — when progressBpm first hit
  masteredAt: string | null      // ISO — when masteryBpm first hit
  srInterval: number | null      // days until next review (1, 3, or 7)
  srNextReview: string | null    // ISO date of next scheduled review
  createdAt: string
  updatedAt: string
}

export interface PracticeSession {
  id: string           // UUID
  userId: string
  date: string         // YYYY-MM-DD
  startedAt: string    // ISO
  endedAt: string | null
  durationMinutes: number | null
  notes: string
  createdAt: string
}

export interface SessionItem {
  id: string           // UUID
  sessionId: string
  skillId: string
  type: SessionItemType
  targetBpm: number | null
  achievedBpm: number | null
  selfRating: SelfRating | null
  rhythmScore: number | null     // 0-100
  pitchScore: number | null      // 0-100
  tempoScore: number | null      // 0-100
  compositeScore: number | null  // weighted average
  hasRecording: boolean
  recordingKey: string | null    // IndexedDB blob key
  completedAt: string
}

export interface Recording {
  id: string           // UUID = recordingKey on SessionItem
  sessionItemId: string
  skillId: string
  audioBlob: Blob
  durationSeconds: number
  bpm: number | null
  createdAt: string
}

export interface StreakRecord {
  id: string
  userId: string
  date: string         // YYYY-MM-DD — one record per practice day
  sessionId: string
  createdAt: string
}

export interface NoteAccuracyRecord {
  id: string
  sessionItemId: string
  skillId: string
  patternId: string
  position: number           // 0-7
  expectedString: number | null
  playedString: number | null
  isHit: boolean
  timingErrorMs: number | null
  createdAt: string
}

// ── Database class ────────────────────────────────────────────────────────────

class BanjoBuddyDB extends Dexie {
  userProfiles!: Table<UserProfile>
  skillRecords!: Table<SkillRecord>
  practiceSessions!: Table<PracticeSession>
  sessionItems!: Table<SessionItem>
  recordings!: Table<Recording>
  streakRecords!: Table<StreakRecord>
  noteAccuracyRecords!: Table<NoteAccuracyRecord>

  constructor() {
    super('BanjoBuddyDB')

    this.version(1).stores({
      userProfiles:    'id, path',
      skillRecords:    'id, userId, skillId, status, lastPracticed, [userId+skillId]',
      practiceSessions:'id, userId, date, startedAt',
      sessionItems:    'id, sessionId, skillId, completedAt',
      recordings:      'id, sessionItemId, skillId, createdAt',
      streakRecords:   'id, userId, date, [userId+date]',
    })

    this.version(2).stores({
      userProfiles:       'id, path',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
    })

    // v3: Add compound index for analytics queries
    this.version(3).stores({
      userProfiles:       'id, path',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
    })

    // v4: Add spaced repetition fields to skillRecords
    this.version(4).stores({
      userProfiles:       'id, path',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
    }).upgrade((tx) => {
      // Backfill SR fields as null on existing records
      return tx.table('skillRecords').toCollection().modify((record: SkillRecord) => {
        if (record.srInterval === undefined) record.srInterval = null
        if (record.srNextReview === undefined) record.srNextReview = null
      })
    })
  }
}

export const db = new BanjoBuddyDB()

// ── Helpers ───────────────────────────────────────────────────────────────────

export function newId(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// Get or create the local user profile
export async function getOrCreateUser(): Promise<UserProfile> {
  const existing = await db.userProfiles.get('local')
  if (existing) return existing

  const user: UserProfile = {
    id: 'local',
    name: 'My Profile',
    path: 'newby',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  await db.userProfiles.add(user)
  return user
}

// Get all skill records for the local user as a Map<skillId, SkillRecord>
export async function getSkillRecordMap(userId: string): Promise<Map<string, SkillRecord>> {
  const records = await db.skillRecords.where('userId').equals(userId).toArray()
  return new Map(records.map((r) => [r.skillId, r]))
}

// Upsert a skill record
export async function upsertSkillRecord(record: Partial<SkillRecord> & { skillId: string; userId: string }): Promise<void> {
  const existing = await db.skillRecords
    .where('[userId+skillId]')
    .equals([record.userId, record.skillId])
    .first()

  if (existing) {
    await db.skillRecords.update(existing.id, { ...record, updatedAt: nowISO() })
  } else {
    await db.skillRecords.add({
      id: newId(),
      status: 'locked',
      currentBpm: null,
      bestBpm: null,
      practiceCount: 0,
      lastPracticed: null,
      unlockedAt: null,
      progressedAt: null,
      masteredAt: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      ...record,
    } as SkillRecord)
  }
}

// Calculate current streak from streak records
export async function getCurrentStreak(userId: string): Promise<number> {
  const records = await db.streakRecords
    .where('userId').equals(userId)
    .sortBy('date')

  if (records.length === 0) return 0

  const today = todayDate()
  let streak = 0
  let checkDate = today

  const dateSet = new Set(records.map((r) => r.date))

  while (dateSet.has(checkDate)) {
    streak++
    const d = new Date(checkDate)
    d.setDate(d.getDate() - 1)
    checkDate = d.toISOString().slice(0, 10)
  }

  return streak
}
