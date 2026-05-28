import Dexie, { type Table } from 'dexie'
import type { Path } from '../types'
import type { Goal, ItemTag, CheckInRecord } from '../types/coach'

// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Local Database (Dexie / IndexedDB)
// All tables use UUIDs + timestamps so migration to cloud sync is seamless.
// ─────────────────────────────────────────────────────────────────────────────

export type SessionItemType = 'roll' | 'song' | 'exercise' | 'technique' | 'theory'
export type SelfRating = 'felt_good' | 'ok' | 'needs_work'
export type UserRole = 'solo' | 'teacher' | 'student'

// ── Table shapes ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string           // 'local' for legacy solo, UUID for teachers & students
  name: string
  path: Path
  role: UserRole       // 'solo' default, 'teacher' or 'student'
  teacherId: string | null  // for students, points to teacher's user ID
  hasSeenTour?: boolean // false for new students, triggers auto-tour on first login
  isAdmin?: boolean    // admin flag — grants access to admin panel
  createdAt: string    // ISO
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
  goalId?: string                // optional: which plan goal this practice item belongs to
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

export interface Achievement {
  id: string
  achievementId: string      // references achievement definition key
  userId: string
  earnedAt: string           // ISO
  createdAt: string
}

export interface CustomRollPattern {
  id: string                 // 'custom_' + uuid fragment
  name: string
  strings: (number | null)[]
  fingers: ('T' | 'I' | 'M')[]
  description: string
  addAsSkill: boolean        // whether to generate a practice skill for this pattern
  createdBy: string          // userId of the creator
  createdAt: string
  updatedAt: string
}

export interface TabTrainingPair {
  id: string              // UUID
  imageBlob: Blob         // original cropped tab image
  correctedNotes: string  // JSON-serialized FretNote[] — the user-verified ground truth
  noteCount: number       // number of notes (for quick display)
  label: string           // user-provided name (e.g., "Cripple Creek intro")
  createdAt: string       // ISO
}

// ── Database class ────────────────────────────────────────────────────────────

class BanjoBuddyDB extends Dexie {
  userProfiles!: Table<UserProfile>
  practiceSessions!: Table<PracticeSession>
  sessionItems!: Table<SessionItem>
  recordings!: Table<Recording>
  streakRecords!: Table<StreakRecord>
  noteAccuracyRecords!: Table<NoteAccuracyRecord>
  achievements!: Table<Achievement>
  customRollPatterns!: Table<CustomRollPattern>
  tabTrainingPairs!: Table<TabTrainingPair>
  goals!: Table<Goal>
  itemTags!: Table<ItemTag>
  checkInRecords!: Table<CheckInRecord>

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
      return tx.table('skillRecords').toCollection().modify((record: any) => {
        if (record.srInterval === undefined) record.srInterval = null
        if (record.srNextReview === undefined) record.srNextReview = null
      })
    })

    // v5: Add FSRS fields, mastery level, achievements table
    this.version(5).stores({
      userProfiles:       'id, path',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
    }).upgrade((tx) => {
      return tx.table('skillRecords').toCollection().modify((record: any) => {
        if (record.fsrsState === undefined) record.fsrsState = null
        if (record.fsrsNextReview === undefined) record.fsrsNextReview = null
        if (record.masteryLevel === undefined) record.masteryLevel = null
      })
    })

    // v6: Custom roll patterns table
    this.version(6).stores({
      userProfiles:       'id, path',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdAt',
    })

    // v7: Teacher mode — add role/teacherId to userProfiles, teacherConfigs table
    this.version(7).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdAt',
      teacherConfigs:     'id',
    }).upgrade((tx) => {
      return tx.table('userProfiles').toCollection().modify((profile: any) => {
        if (profile.role === undefined) profile.role = 'solo'
        if (profile.teacherId === undefined) profile.teacherId = null
      })
    })

    // v8: Add createdBy to customRollPatterns for per-user ownership
    this.version(8).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdBy, createdAt',
      teacherConfigs:     'id',
    }).upgrade((tx) => {
      // Backfill createdBy with 'local' (the default solo user) for existing patterns
      return tx.table('customRollPatterns').toCollection().modify((pattern: any) => {
        if (pattern.createdBy === undefined) pattern.createdBy = 'local'
      })
    })

    // v9: Teacher video clips table
    this.version(9).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdBy, createdAt',
      teacherConfigs:     'id',
      teacherClips:       'id, teacherId, skillId, rollPatternId, createdAt',
    })

    // v10: Multi-media clips — add mediaType, sourceImageId, nullable blobs
    this.version(10).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdBy, createdAt',
      teacherConfigs:     'id',
      teacherClips:       'id, teacherId, skillId, rollPatternId, mediaType, sourceImageId, createdAt',
    }).upgrade((tx) => {
      return tx.table('teacherClips').toCollection().modify((clip: any) => {
        if (clip.mediaType === undefined) clip.mediaType = 'video'
        if (clip.audioBlob === undefined) clip.audioBlob = null
        if (clip.imageBlob === undefined) clip.imageBlob = null
        if (clip.sourceImageId === undefined) clip.sourceImageId = null
        if (clip.cropRect === undefined) clip.cropRect = null
        if (clip.sortOrder === undefined) clip.sortOrder = null
        // Existing clips have videoBlob as non-null — keep as-is
      })
    })

    // v11: Admin mode — add isAdmin flag to userProfiles
    this.version(11).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdBy, createdAt',
      teacherConfigs:     'id',
      teacherClips:       'id, teacherId, skillId, rollPatternId, mediaType, sourceImageId, createdAt',
    }).upgrade((tx) => {
      return tx.table('userProfiles').toCollection().modify((profile: any) => {
        if (profile.isAdmin === undefined) profile.isAdmin = false
      })
    })

    // v12: Skill image overrides (admin demo photos)
    this.version(12).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdBy, createdAt',
      teacherConfigs:     'id',
      teacherClips:       'id, teacherId, skillId, rollPatternId, mediaType, sourceImageId, createdAt',
      skillImageOverrides:'skillId',
    })

    // v13: Tab OCR training data — image + corrected notes pairs
    this.version(13).stores({
      userProfiles:       'id, path, role',
      skillRecords:       'id, userId, skillId, status, lastPracticed, [userId+skillId], srNextReview, [userId+fsrsNextReview]',
      practiceSessions:   'id, userId, date, startedAt',
      sessionItems:       'id, sessionId, skillId, completedAt, [skillId+completedAt]',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, date, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, skillId, patternId, [skillId+patternId+position], createdAt',
      achievements:       '++id, achievementId, userId, earnedAt',
      customRollPatterns: 'id, name, createdBy, createdAt',
      teacherConfigs:     'id',
      teacherClips:       'id, teacherId, skillId, rollPatternId, mediaType, sourceImageId, createdAt',
      skillImageOverrides:'skillId',
      tabTrainingPairs:   'id, createdAt',
    })

    // v14: Drop curriculum + teacher tables (skillRecords, teacherConfigs,
    // teacherClips, skillImageOverrides). Coach tables will be added in v15.
    this.version(14).stores({
      userProfiles:       'id, role',
      practiceSessions:   'id, userId, startedAt',
      sessionItems:       'id, sessionId, completedAt',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, createdAt',
      achievements:       '++id, achievementId, userId',
      customRollPatterns: 'id, createdBy, createdAt',
      tabTrainingPairs:   'id, createdAt',
      // Removed: skillRecords, teacherConfigs, teacherClips, skillImageOverrides
    }).upgrade(async (tx) => {
      // Explicitly clear removed tables so IndexedDB releases storage
      await Promise.all([
        tx.table('skillRecords').clear().catch(() => undefined),
        tx.table('teacherConfigs').clear().catch(() => undefined),
        tx.table('teacherClips').clear().catch(() => undefined),
        tx.table('skillImageOverrides').clear().catch(() => undefined),
      ])
    })

    // v15: Coach overhaul — add goals, itemTags, checkInRecords. Extend
    // sessionItems index with goalId for plan-context activity queries.
    // No data migration: only adds tables and extends one index.
    this.version(15).stores({
      // Carried forward from v14
      userProfiles:       'id, role',
      practiceSessions:   'id, userId, startedAt',
      sessionItems:       'id, sessionId, completedAt, goalId',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, createdAt',
      achievements:       '++id, achievementId, userId',
      customRollPatterns: 'id, createdBy, createdAt',
      tabTrainingPairs:   'id, createdAt',
      // New coach tables
      goals:              'id, userId, status, updatedAt',
      itemTags:           'id, userId, updatedAt',
      checkInRecords:     'id, userId, kind, startedAt',
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
    role: 'solo',
    teacherId: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  await db.userProfiles.add(user)
  return user
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

// ── Tab training data helpers ─────────────────────────────────────────────────

export async function saveTrainingPair(
  imageBlob: Blob,
  correctedNotes: object[],
  label: string,
): Promise<string> {
  const id = newId()
  await db.tabTrainingPairs.add({
    id,
    imageBlob,
    correctedNotes: JSON.stringify(correctedNotes),
    noteCount: correctedNotes.length,
    label,
    createdAt: nowISO(),
  })
  return id
}

export async function getAllTrainingPairs(): Promise<TabTrainingPair[]> {
  return db.tabTrainingPairs.orderBy('createdAt').reverse().toArray()
}

export async function deleteTrainingPair(id: string): Promise<void> {
  await db.tabTrainingPairs.delete(id)
}

export async function getTrainingPairCount(): Promise<number> {
  return db.tabTrainingPairs.count()
}
