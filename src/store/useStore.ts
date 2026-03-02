import { create } from 'zustand'
import { db, getOrCreateUser, getSkillRecordMap, upsertSkillRecord, getCurrentStreak, newId, nowISO, todayDate } from '../db/db'
import type { UserProfile, SkillRecord, PracticeSession, SessionItem, SelfRating } from '../db/db'
import { SKILL_MAP, type Path } from '../data/curriculum'
import { buildSessionPlan, deriveNewStatus, getNewlyUnlockedSkills, type SessionPlan } from '../engine/recommendationEngine'

export type Page = 'dashboard' | 'practice' | 'skill-tree' | 'progress' | 'metronome' | 'tuner'

interface AppState {
  // App shell
  currentPage: Page
  setPage: (page: Page) => void

  // Single-skill practice (set before navigating to 'practice')
  selectedSkillId: string | null
  practiceSkill: (skillId: string) => void
  clearSelectedSkill: () => void

  // User
  user: UserProfile | null
  streak: number
  loadUser: () => Promise<void>
  setUserPath: (path: Path) => void

  // Skill records (in-memory cache, source of truth is Dexie)
  skillRecords: Map<string, SkillRecord>
  loadSkillRecords: () => Promise<void>

  // Today's session plan
  sessionPlan: SessionPlan | null
  refreshSessionPlan: () => void

  // Active practice session
  activeSession: PracticeSession | null
  startSession: () => Promise<void>
  endSession: () => Promise<void>

  // Log a completed session item
  logSessionItem: (
    skillId: string,
    achievedBpm: number | null,
    selfRating: SelfRating,
    scores: { rhythm?: number; pitch?: number; tempo?: number }
  ) => Promise<{ newlyUnlocked: string[] }>

  // Newly unlocked skill IDs (for celebration UI)
  newlyUnlocked: string[]
  clearNewlyUnlocked: () => void

  // Loading / error
  isLoading: boolean
  error: string | null
}

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  selectedSkillId: null,
  practiceSkill: (skillId) => set({ selectedSkillId: skillId, currentPage: 'practice' }),
  clearSelectedSkill: () => set({ selectedSkillId: null }),

  user: null,
  streak: 0,
  skillRecords: new Map(),
  sessionPlan: null,
  activeSession: null,
  newlyUnlocked: [],
  isLoading: false,
  error: null,

  loadUser: async () => {
    set({ isLoading: true, error: null })
    try {
      const user = await getOrCreateUser()
      const skillRecords = await getSkillRecordMap(user.id)
      const streak = await getCurrentStreak(user.id)
      set({ user, skillRecords, streak, isLoading: false })
      get().refreshSessionPlan()
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  setUserPath: async (path) => {
    const { user } = get()
    if (!user) return
    await db.userProfiles.update(user.id, { path, updatedAt: nowISO() })
    const updated = { ...user, path }
    set({ user: updated })
    get().refreshSessionPlan()
  },

  loadSkillRecords: async () => {
    const { user } = get()
    if (!user) return
    const skillRecords = await getSkillRecordMap(user.id)
    set({ skillRecords })
    get().refreshSessionPlan()
  },

  refreshSessionPlan: () => {
    const { user, skillRecords } = get()
    if (!user) return
    const plan = buildSessionPlan(user.path, skillRecords)
    set({ sessionPlan: plan })
  },

  startSession: async () => {
    const { user } = get()
    if (!user) return
    const session: PracticeSession = {
      id: newId(),
      userId: user.id,
      date: todayDate(),
      startedAt: nowISO(),
      endedAt: null,
      durationMinutes: null,
      notes: '',
      createdAt: nowISO(),
    }
    await db.practiceSessions.add(session)

    // Record streak
    const existingStreak = await db.streakRecords
      .where('[userId+date]').equals([user.id, todayDate()]).first()
    if (!existingStreak) {
      await db.streakRecords.add({
        id: newId(),
        userId: user.id,
        date: todayDate(),
        sessionId: session.id,
        createdAt: nowISO(),
      })
    }

    const streak = await getCurrentStreak(user.id)
    set({ activeSession: session, streak })
  },

  endSession: async () => {
    const { activeSession } = get()
    if (!activeSession) return
    const endedAt = nowISO()
    const durationMinutes = Math.round(
      (new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 60000
    )
    await db.practiceSessions.update(activeSession.id, { endedAt, durationMinutes })
    set({ activeSession: null })
  },

  logSessionItem: async (skillId, achievedBpm, selfRating, scores) => {
    const { user, activeSession, skillRecords } = get()
    if (!user || !activeSession) return { newlyUnlocked: [] }

    const skill = SKILL_MAP.get(skillId)
    if (!skill) return { newlyUnlocked: [] }

    const composite = scores.rhythm !== undefined || scores.pitch !== undefined || scores.tempo !== undefined
      ? Math.round(
          ([scores.rhythm, scores.pitch, scores.tempo]
            .filter((s): s is number => s !== undefined)
            .reduce((a, b) => a + b, 0)) /
          [scores.rhythm, scores.pitch, scores.tempo].filter((s) => s !== undefined).length
        )
      : null

    // Write session item
    const item: SessionItem = {
      id: newId(),
      sessionId: activeSession.id,
      skillId,
      type: 'exercise',
      targetBpm: skill.progressBpm,
      achievedBpm,
      selfRating,
      rhythmScore: scores.rhythm ?? null,
      pitchScore: scores.pitch ?? null,
      tempoScore: scores.tempo ?? null,
      compositeScore: composite,
      hasRecording: false,
      recordingKey: null,
      completedAt: nowISO(),
    }
    await db.sessionItems.add(item)

    // Snapshot records BEFORE the update — getNewlyUnlockedSkills needs the pre-update
    // state to correctly detect which skills transition from locked → unlocked
    const prevSkillRecords = new Map(skillRecords)

    // Update skill record
    const currentRecord = skillRecords.get(skillId) ?? null
    const newBestBpm = Math.max(currentRecord?.bestBpm ?? 0, achievedBpm ?? 0)
    const newStatus = deriveNewStatus(skill, currentRecord, { skillId, achievedBpm, selfRating, compositeScore: composite }, skillRecords)

    await upsertSkillRecord({
      userId: user.id,
      skillId,
      status: newStatus,
      currentBpm: achievedBpm,
      bestBpm: newBestBpm || null,
      practiceCount: (currentRecord?.practiceCount ?? 0) + 1,
      lastPracticed: nowISO(),
      unlockedAt: currentRecord?.unlockedAt ?? nowISO(),
      progressedAt: newStatus === 'progressed' && !currentRecord?.progressedAt ? nowISO() : (currentRecord?.progressedAt ?? null),
      masteredAt: newStatus === 'mastered' && !currentRecord?.masteredAt ? nowISO() : (currentRecord?.masteredAt ?? null),
    })

    // Check newly unlocked using the pre-update snapshot so wasLocked is accurate
    const newlyUnlocked = getNewlyUnlockedSkills(skillId, newStatus, prevSkillRecords, user.path)

    // Mark newly unlocked skills
    for (const unlockedSkill of newlyUnlocked) {
      await upsertSkillRecord({
        userId: user.id,
        skillId: unlockedSkill.id,
        status: 'unlocked',
        unlockedAt: nowISO(),
      })
    }

    const finalRecords = await getSkillRecordMap(user.id)
    set({ skillRecords: finalRecords, newlyUnlocked: newlyUnlocked.map((s) => s.id) })
    get().refreshSessionPlan()

    return { newlyUnlocked: newlyUnlocked.map((s) => s.id) }
  },

  clearNewlyUnlocked: () => set({ newlyUnlocked: [] }),
}))
