import { create } from 'zustand'
import { db, getOrCreateUser, getSkillRecordMap, upsertSkillRecord, getCurrentStreak, newId, nowISO, todayDate, getStudents, getStandaloneStudents, createStudent as dbCreateStudent, deleteStudent as dbDeleteStudent, getOrCreateTeacherConfig, updateTeacherConfig, getTeachers, createTeacher as dbCreateTeacher, deleteTeacher as dbDeleteTeacher, markTourSeen, setAdminStatus as dbSetAdminStatus, getAllUsers, getDbStats, clearAllUserData, exportAllData, getAllSkillImageOverrides, putSkillImageOverride, deleteSkillImageOverride as dbDeleteSkillImageOverride } from '../db/db'
import type { UserProfile, SkillRecord, PracticeSession, SessionItem, SelfRating, NoteAccuracyRecord, TeacherConfig, UserRole, SkillImageOverride } from '../db/db'
import { SKILL_MAP, refreshSkillMap, type Path } from '../data/curriculum'
import { buildSessionPlan, deriveNewStatus, getNewlyUnlockedSkills, evaluateSkillStatus, type SessionPlan } from '../engine/recommendationEngine'
import type { NoteEvaluation } from '../engine/streamingRollMatcher'
import { computeSrSchedule } from '../engine/spacedRepetition'
import { saveRecording } from '../engine/recordingService'
import { createNewFsrsState, scheduleReview, scoreToRating, getNextReviewDate, type FsrsState } from '../engine/fsrs'
import { checkAchievements, type AchievementContext } from '../engine/achievementTracker'
import type { AchievementDef } from '../data/achievements'
import { computeMasteryLevel } from '../engine/masteryLevels'
import { computePerformanceMetrics } from '../engine/performanceMetrics'
import type { PerformanceMetrics } from '../types/performance'
import { refreshRollMap } from '../data/rollPatterns'
import { enqueueSync, pullSkillImageOverrides } from '../db/sync'
import { supabase } from '../db/supabase'

export type Page = 'dashboard' | 'practice' | 'skill-tree' | 'pathway' | 'progress' | 'achievements' | 'settings' | 'profile' | 'fretboard-lab'
export type ToolModal = 'metronome' | 'tuner' | 'fretlab'

interface AppState {
  // App shell
  currentPage: Page
  navMode: 'home' | 'section'
  appMode: 'quick-pick' | 'deep-dive' | null
  setPage: (page: Page) => void
  goHome: () => void
  setAppMode: (mode: 'quick-pick' | 'deep-dive') => void

  // Tool modals (shared across pages)
  openModal: ToolModal | null
  setOpenModal: (modal: ToolModal | null) => void
  fretlabPatternId: string | null
  setFretlabPatternId: (id: string | null) => void

  // Single-skill practice (set before navigating to 'practice')
  selectedSkillId: string | null
  practiceSkill: (skillId: string) => void
  clearSelectedSkill: () => void

  // User
  user: UserProfile | null
  streak: number
  authUserName: string | null
  authUserEmail: string | null
  setAuthUser: (name: string | null, email: string | null) => void
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
    scores: { rhythm?: number; pitch?: number; tempo?: number },
    noteEvaluations?: NoteEvaluation[],
    audioBlob?: Blob
  ) => Promise<{ newlyUnlocked: string[] }>

  // Newly unlocked skill IDs (for celebration UI)
  newlyUnlocked: string[]
  clearNewlyUnlocked: () => void

  // Session completion confetti
  showConfetti: boolean
  triggerConfetti: () => void

  // Achievements
  newAchievements: AchievementDef[]
  clearNewAchievements: () => void

  // Last performance metrics (for session summary)
  lastMetrics: PerformanceMetrics | null

  // Multi-user / teacher mode
  activeUserId: string | null
  activeUserRole: UserRole
  teacherConfig: TeacherConfig | null
  disabledSkillIds: Set<string>
  teachers: UserProfile[]
  students: UserProfile[]
  standaloneStudents: UserProfile[]
  showLoginScreen: boolean
  loginAsGuest: () => Promise<void>
  loginAsTeacher: (teacherId: string) => Promise<void>
  loginAsUser: (userId: string) => Promise<void>
  logoutUser: () => void
  createTeacher: (name: string) => Promise<void>
  deleteTeacher: (teacherId: string) => Promise<void>
  createStudent: (name: string) => Promise<void>
  addStandaloneStudent: (name: string) => Promise<void>
  deleteStandaloneStudent: (userId: string) => Promise<void>
  deleteStudent: (userId: string) => Promise<void>
  toggleSkillEnabled: (skillId: string, studentId?: string) => Promise<void>
  getStudentDisabledSkills: (studentId: string) => Set<string>

  // Admin mode
  isAdmin: boolean
  setAdminStatus: (userId: string, isAdmin: boolean) => Promise<void>
  getAllUsers: () => Promise<UserProfile[]>
  getDbStats: () => Promise<{ users: number; skillRecords: number; sessions: number; sessionItems: number; recordings: number; clips: number; patterns: number; achievements: number }>
  clearUserData: (userId: string) => Promise<void>
  exportData: () => Promise<string>

  // Skill image overrides (admin demo photos)
  skillImageOverrides: Map<string, SkillImageOverride>
  loadSkillImageOverrides: () => Promise<void>
  setSkillImageOverride: (skillId: string, imageBlob: Blob, alt: string, caption: string | null, mimeType: string) => Promise<void>
  removeSkillImageOverride: (skillId: string) => Promise<void>

  // Site tour
  tourPending: boolean
  tourActive: boolean
  tourStep: number
  startTour: () => void
  advanceTour: () => void
  dismissTour: () => void

  // Loading / error
  isLoading: boolean
  error: string | null
}

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  navMode: 'home',
  appMode: (sessionStorage.getItem('banjo-buddy-mode') as 'quick-pick' | 'deep-dive') || null,
  setPage: (page) => set({ currentPage: page, navMode: page === 'dashboard' ? 'home' : 'section' }),
  goHome: () => set({ currentPage: 'dashboard', navMode: 'home', selectedSkillId: null }),
  setAppMode: (mode) => {
    sessionStorage.setItem('banjo-buddy-mode', mode)
    set({ appMode: mode })
  },

  openModal: null,
  setOpenModal: (modal) => set({ openModal: modal }),
  fretlabPatternId: null,
  setFretlabPatternId: (id) => set({ fretlabPatternId: id }),

  selectedSkillId: null,
  practiceSkill: (skillId) => set({ selectedSkillId: skillId }),
  clearSelectedSkill: () => set({ selectedSkillId: null }),

  user: null,
  streak: 0,
  authUserName: null,
  authUserEmail: null,
  setAuthUser: (name, email) => set({ authUserName: name, authUserEmail: email }),
  skillRecords: new Map(),
  sessionPlan: null,
  activeSession: null,
  newlyUnlocked: [],
  showConfetti: false,
  newAchievements: [],
  lastMetrics: null,
  tourPending: false,
  tourActive: false,
  tourStep: 0,
  activeUserId: null,
  activeUserRole: 'solo',
  teacherConfig: null,
  disabledSkillIds: new Set(),
  teachers: [],
  students: [],
  standaloneStudents: [],
  showLoginScreen: false,
  isAdmin: false,
  skillImageOverrides: new Map(),

  setAdminStatus: async (userId: string, isAdmin: boolean) => {
    await dbSetAdminStatus(userId, isAdmin)
    // If toggling own status, update local state
    if (userId === get().activeUserId || userId === get().user?.id) {
      set({ isAdmin })
    }
  },

  getAllUsers: async () => {
    return getAllUsers()
  },

  getDbStats: async () => {
    return getDbStats()
  },

  clearUserData: async (userId: string) => {
    await clearAllUserData(userId)
    // If clearing own data, reload skill records
    if (userId === get().activeUserId) {
      const skillRecords = await getSkillRecordMap(userId)
      set({ skillRecords, streak: 0 })
      get().refreshSessionPlan()
    }
  },

  exportData: async () => {
    const data = await exportAllData()
    return JSON.stringify(data, null, 2)
  },

  loadSkillImageOverrides: async () => {
    // Pull latest from Supabase first (best-effort), then load from IndexedDB
    await pullSkillImageOverrides()
    const overrides = await getAllSkillImageOverrides()
    set({ skillImageOverrides: new Map(overrides.map((o) => [o.skillId, o])) })
  },

  setSkillImageOverride: async (skillId, imageBlob, alt, caption, mimeType) => {
    const userId = get().activeUserId ?? get().user?.id ?? 'local'
    const ext = mimeType.split('/')[1] ?? 'jpg'
    const storagePath = `skill-overrides/${skillId}.${ext}`

    let imageUrl: string

    // Try Supabase Storage first, fall back to data URL for local-only
    const { error: uploadError } = await supabase.storage
      .from('Images')
      .upload(storagePath, imageBlob, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      console.warn('[Admin] Supabase Storage upload failed, using local data URL:', uploadError.message)
      // Fallback: convert blob to data URL (works locally, won't sync across devices)
      const reader = new FileReader()
      imageUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(imageBlob)
      })
    } else {
      // Get public URL from Supabase Storage
      const { data: urlData } = supabase.storage
        .from('Images')
        .getPublicUrl(storagePath)
      // Bust cache by appending timestamp
      imageUrl = `${urlData.publicUrl}?t=${Date.now()}`
    }

    const override: SkillImageOverride = {
      skillId,
      imageUrl,
      alt,
      caption,
      mimeType,
      updatedBy: userId,
      updatedAt: nowISO(),
    }
    await putSkillImageOverride(override)
    // Always try to sync metadata to Supabase (even if Storage upload failed, for data URL fallback)
    try {
      const { error: dbError } = await supabase
        .from('skill_image_overrides')
        .upsert({
          skill_id: skillId,
          image_url: imageUrl,
          alt,
          caption,
          mime_type: mimeType,
          updated_by: userId,
          updated_at: override.updatedAt,
        }, { onConflict: 'skill_id' })
      if (dbError) console.warn('[Admin] Failed to sync image override:', dbError.message)
    } catch (e) {
      console.warn('[Admin] Failed to sync image override:', e)
    }
    const overrides = new Map(get().skillImageOverrides)
    overrides.set(skillId, override)
    set({ skillImageOverrides: overrides })
  },

  removeSkillImageOverride: async (skillId) => {
    // Try to delete from storage (best-effort, may fail if different extension)
    const override = get().skillImageOverrides.get(skillId)
    if (override) {
      const ext = override.mimeType.split('/')[1] ?? 'jpg'
      await supabase.storage.from('Images').remove([`skill-overrides/${skillId}.${ext}`])
    }
    await dbDeleteSkillImageOverride(skillId)
    // Direct delete from Supabase
    supabase.from('skill_image_overrides').delete().eq('skill_id', skillId).then(({ error }) => {
      if (error) console.warn('[Admin] Failed to delete image override from Supabase:', error.message)
    })
    const overrides = new Map(get().skillImageOverrides)
    overrides.delete(skillId)
    set({ skillImageOverrides: overrides })
  },

  startTour: () => {
    set({ tourActive: true, tourStep: 0, tourPending: false })
    localStorage.removeItem('banjo-buddy-tour-pending')
  },
  advanceTour: () => {
    set((s) => ({ tourStep: s.tourStep + 1 }))
  },
  dismissTour: () => {
    const userId = get().activeUserId
    set({ tourActive: false, tourStep: 0, tourPending: false })
    localStorage.setItem('banjo-buddy-tour-done', 'true')
    // Mark tour as seen for this user so it doesn't auto-start again
    if (userId) markTourSeen(userId)
  },
  isLoading: false,
  error: null,

  loadUser: async () => {
    set({ isLoading: true, error: null })
    try {
      // Load all teachers and all their students for the login screen
      const teacherList = await getTeachers()
      let allStudents: UserProfile[] = []
      for (const t of teacherList) {
        const s = await getStudents(t.id)
        allStudents = allStudents.concat(s)
      }
      const standalone = await getStandaloneStudents()

      // Also ensure the legacy 'local' user exists (for Guest mode)
      const localUser = await getOrCreateUser()
      await refreshRollMap(localUser.id, localUser.role, localUser.teacherId)
      await refreshSkillMap(localUser.id, localUser.role, localUser.teacherId)

      set({
        user: localUser,
        teachers: teacherList,
        students: allStudents,
        standaloneStudents: standalone,
        showLoginScreen: true,
        activeUserId: null,
        isLoading: false,
      })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  setUserPath: async (path) => {
    const { user } = get()
    if (!user) return
    const updatedAt = nowISO()
    await db.userProfiles.update(user.id, { path, updatedAt })
    enqueueSync('userProfiles', user.id, 'upsert', { ...user, path, updatedAt } as any)
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

  refreshSessionPlan: async () => {
    const { user, skillRecords } = get()
    if (!user) return

    // Fetch recent session items (last 30 days) for accuracy-driven recommendations
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffISO = cutoff.toISOString()

    let recentItemsBySkill = new Map<string, SessionItem[]>()
    try {
      const recentItems = await db.sessionItems
        .where('completedAt')
        .above(cutoffISO)
        .toArray()
      for (const item of recentItems) {
        const arr = recentItemsBySkill.get(item.skillId) ?? []
        arr.push(item)
        recentItemsBySkill.set(item.skillId, arr)
      }
    } catch {
      // Fallback: build plan without recent items
      recentItemsBySkill = new Map()
    }

    const { disabledSkillIds, activeUserRole } = get()
    const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
    const isTeacher = activeUserRole === 'teacher'
    const plan = buildSessionPlan(user.path, skillRecords, 30, recentItemsBySkill, disabled, isTeacher)
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
    enqueueSync('practiceSessions', session.id, 'upsert', session as any)

    // Record streak
    const existingStreak = await db.streakRecords
      .where('[userId+date]').equals([user.id, todayDate()]).first()
    if (!existingStreak) {
      const streakRecord = {
        id: newId(),
        userId: user.id,
        date: todayDate(),
        sessionId: session.id,
        createdAt: nowISO(),
      }
      await db.streakRecords.add(streakRecord)
      enqueueSync('streakRecords', streakRecord.id, 'upsert', streakRecord as any)
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
    enqueueSync('practiceSessions', activeSession.id, 'upsert', { ...activeSession, endedAt, durationMinutes } as any)
    set({ activeSession: null })
  },

  logSessionItem: async (skillId, achievedBpm, selfRating, scores, noteEvaluations, audioBlob) => {
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
    const itemId = newId()
    const item: SessionItem = {
      id: itemId,
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
    enqueueSync('sessionItems', item.id, 'upsert', { ...item, userId: user.id } as any)

    // Save recording if provided
    if (audioBlob) {
      const durationSec = audioBlob.size > 0 ? Math.round(audioBlob.size / 16000) : 0
      await saveRecording(itemId, skillId, audioBlob, durationSec, achievedBpm)
    }

    // Persist per-note accuracy records if provided
    if (noteEvaluations && noteEvaluations.length > 0 && skill.rollPatternId) {
      const now = nowISO()
      const records: NoteAccuracyRecord[] = noteEvaluations.map((ev) => ({
        id: newId(),
        sessionItemId: itemId,
        skillId,
        patternId: skill.rollPatternId!,
        position: ev.position,
        expectedString: ev.expectedString,
        playedString: ev.playedString,
        isHit: ev.isHit,
        timingErrorMs: ev.timingErrorMs,
        createdAt: now,
      }))
      await db.noteAccuracyRecords.bulkAdd(records)
      for (const rec of records) {
        enqueueSync('noteAccuracyRecords', rec.id, 'upsert', { ...rec, userId: user.id } as any)
      }
    }

    // Snapshot records BEFORE the update — getNewlyUnlockedSkills needs the pre-update
    // state to correctly detect which skills transition from locked → unlocked
    const prevSkillRecords = new Map(skillRecords)

    // Update skill record
    const currentRecord = skillRecords.get(skillId) ?? null
    const newBestBpm = Math.max(currentRecord?.bestBpm ?? 0, achievedBpm ?? 0)
    const { disabledSkillIds: currentDisabledIds, activeUserRole: currentUserRole } = get()
    const disabledForDerive = currentUserRole === 'student' ? currentDisabledIds : new Set<string>()
    const newStatus = deriveNewStatus(skill, currentRecord, { skillId, achievedBpm, selfRating, compositeScore: composite }, skillRecords, disabledForDerive)

    // Compute spaced repetition schedule for progressed/mastered skills
    // Legacy 3-bucket SR (kept for backward compat)
    const srFields: { srInterval: number | null; srNextReview: string | null } =
      (newStatus === 'progressed' || newStatus === 'mastered')
        ? (() => {
            const sr = computeSrSchedule(selfRating, composite, currentRecord?.srInterval ?? null)
            return { srInterval: sr.interval, srNextReview: sr.nextReview }
          })()
        : { srInterval: currentRecord?.srInterval ?? null, srNextReview: currentRecord?.srNextReview ?? null }

    // FSRS scheduling (new v2 system)
    let fsrsState: string | null = currentRecord?.fsrsState ?? null
    let fsrsNextReview: string | null = currentRecord?.fsrsNextReview ?? null
    if (newStatus === 'progressed' || newStatus === 'mastered' || newStatus === 'active') {
      try {
        const prevFsrs: FsrsState = fsrsState ? JSON.parse(fsrsState) : createNewFsrsState()
        const rating = scoreToRating(composite, selfRating)
        const newFsrs = scheduleReview(prevFsrs, rating)
        fsrsState = JSON.stringify(newFsrs)
        fsrsNextReview = getNextReviewDate(newFsrs)
      } catch {
        // Fallback: keep previous FSRS state
      }
    }

    // Compute performance metrics for session summary
    let metrics: PerformanceMetrics | null = null
    let masteryLevel = currentRecord?.masteryLevel ?? null
    if (noteEvaluations && noteEvaluations.length > 0) {
      metrics = computePerformanceMetrics(noteEvaluations, [], achievedBpm)
      masteryLevel = computeMasteryLevel(metrics)
      set({ lastMetrics: metrics })
    }

    const skillRecordData = {
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
      ...srFields,
      fsrsState,
      fsrsNextReview,
      masteryLevel,
    }
    await upsertSkillRecord(skillRecordData)
    enqueueSync('skillRecords', currentRecord?.id ?? skillId, 'upsert', skillRecordData as any)

    // Check newly unlocked using the pre-update snapshot so wasLocked is accurate
    const newlyUnlocked = getNewlyUnlockedSkills(skillId, newStatus, prevSkillRecords, user.path, disabledForDerive)

    // Mark newly unlocked skills
    for (const unlockedSkill of newlyUnlocked) {
      const unlockData = {
        userId: user.id,
        skillId: unlockedSkill.id,
        status: 'unlocked' as const,
        unlockedAt: nowISO(),
      }
      await upsertSkillRecord(unlockData)
      enqueueSync('skillRecords', unlockedSkill.id, 'upsert', unlockData as any)
    }

    const finalRecords = await getSkillRecordMap(user.id)
    set({ skillRecords: finalRecords, newlyUnlocked: newlyUnlocked.map((s) => s.id) })
    get().refreshSessionPlan()

    // Check achievements
    try {
      const sessions = await db.practiceSessions.where('userId').equals(user.id).toArray()
      const allItems = await db.sessionItems.toArray()
      const sessionIds = new Set(sessions.map(s => s.id))
      const myItems = allItems.filter(i => sessionIds.has(i.sessionId))
      const bestBpms = myItems.filter(i => i.achievedBpm !== null).map(i => i.achievedBpm!)
      const skillsByStatus: Record<string, number> = {}
      for (const r of finalRecords.values()) {
        skillsByStatus[r.status] = (skillsByStatus[r.status] ?? 0) + 1
      }
      const context: AchievementContext = {
        currentStreak: get().streak,
        totalMinutes: sessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0),
        totalSessions: sessions.length,
        totalItems: myItems.length,
        skillsByStatus,
        bestBpm: bestBpms.length > 0 ? Math.max(...bestBpms) : 0,
      }
      const newAchievements = await checkAchievements(user.id, context)
      if (newAchievements.length > 0) {
        set({ newAchievements: newAchievements })
        // Sync newly earned achievements
        for (const ach of newAchievements) {
          const achRecord = await db.achievements
            .where({ achievementId: ach.id, userId: user.id })
            .first()
          if (achRecord) {
            enqueueSync('achievements', achRecord.id, 'upsert', { ...achRecord, userId: user.id } as any)
          }
        }
      }
    } catch {
      // Non-critical: don't block on achievement check failure
    }

    return { newlyUnlocked: newlyUnlocked.map((s) => s.id) }
  },

  clearNewlyUnlocked: () => set({ newlyUnlocked: [] }),
  clearNewAchievements: () => set({ newAchievements: [] }),

  // ── Login actions ───────────────────────────────────────────────────────

  loginAsGuest: async () => {
    const { user } = get()
    if (!user) return
    // Guest = solo mode, all defaults, no teacher features
    await refreshRollMap(user.id, 'solo', null)
    await refreshSkillMap(user.id, 'solo', null)
    const skillRecords = await getSkillRecordMap(user.id)
    const streak = await getCurrentStreak(user.id)
    const tourPending = localStorage.getItem('banjo-buddy-tour-seen') !== 'true'
    // Pull latest image overrides from Supabase, then load from IndexedDB
    await pullSkillImageOverrides()
    const imgOverrides = await getAllSkillImageOverrides()
    set({
      activeUserId: user.id,
      activeUserRole: 'solo',
      showLoginScreen: false,
      skillRecords,
      streak,
      disabledSkillIds: new Set(),
      tourPending,
      isAdmin: user.isAdmin === true,
      skillImageOverrides: new Map(imgOverrides.map((o) => [o.skillId, o])),
    })
    get().refreshSessionPlan()
  },

  loginAsTeacher: async (teacherId: string) => {
    const teacher = await db.userProfiles.get(teacherId)
    if (!teacher) return
    await refreshRollMap(teacher.id, 'teacher', null)
    await refreshSkillMap(teacher.id, 'teacher', null)
    const config = await getOrCreateTeacherConfig(teacher.id)
    const skillRecords = await getSkillRecordMap(teacher.id)
    const streak = await getCurrentStreak(teacher.id)
    const studentList = await getStudents(teacher.id)
    const tourPending = localStorage.getItem('banjo-buddy-tour-seen') !== 'true'
    await pullSkillImageOverrides()
    const imgOverrides = await getAllSkillImageOverrides()
    set({
      activeUserId: teacher.id,
      activeUserRole: 'teacher',
      showLoginScreen: false,
      user: teacher,
      teacherConfig: config,
      disabledSkillIds: new Set(config.disabledSkillIds),
      students: studentList,
      skillRecords,
      streak,
      tourPending,
      isAdmin: teacher.isAdmin === true,
      skillImageOverrides: new Map(imgOverrides.map((o) => [o.skillId, o])),
    })
    get().refreshSessionPlan()
  },

  loginAsUser: async (userId: string) => {
    // Logging in as a student — load their teacher's config
    const student = await db.userProfiles.get(userId)
    if (!student) return
    let config: TeacherConfig | null = null
    let disabled = new Set<string>()
    if (student.teacherId) {
      config = await getOrCreateTeacherConfig(student.teacherId)
      // Use per-student override if it exists, otherwise fall back to global default
      const overrideList = config.studentOverrides?.[student.id]
      disabled = new Set(overrideList ?? config.disabledSkillIds)
    }
    await refreshRollMap(student.id, 'student', student.teacherId)
    await refreshSkillMap(student.id, 'student', student.teacherId)
    const skillRecords = await getSkillRecordMap(student.id)
    const streak = await getCurrentStreak(student.id)
    // Auto-start tour for new students who haven't seen it yet
    const tourPending = localStorage.getItem('banjo-buddy-tour-seen') !== 'true'
      || student.hasSeenTour === false
      || localStorage.getItem('banjo-buddy-tour-pending') === 'true'
    await pullSkillImageOverrides()
    const imgOverrides = await getAllSkillImageOverrides()
    set({
      activeUserId: student.id,
      activeUserRole: 'student',
      showLoginScreen: false,
      skillRecords,
      streak,
      user: student,
      teacherConfig: config,
      disabledSkillIds: disabled,
      tourPending,
      isAdmin: student.isAdmin === true,
      skillImageOverrides: new Map(imgOverrides.map((o) => [o.skillId, o])),
    })
    get().refreshSessionPlan()
  },

  logoutUser: async () => {
    // Reload all teachers and students for the login screen
    const localUser = await getOrCreateUser()
    const teacherList = await getTeachers()
    let allStudents: UserProfile[] = []
    for (const t of teacherList) {
      const s = await getStudents(t.id)
      allStudents = allStudents.concat(s)
    }
    const standalone = await getStandaloneStudents()

    set({
      user: localUser,
      activeUserId: null,
      activeUserRole: 'solo',
      showLoginScreen: true,
      activeSession: null,
      selectedSkillId: null,
      currentPage: 'dashboard',
      teachers: teacherList,
      students: allStudents,
      standaloneStudents: standalone,
      teacherConfig: null,
      disabledSkillIds: new Set(),
      isAdmin: false,
    })
  },

  createTeacher: async (name: string) => {
    await dbCreateTeacher(name)
    const teacherList = await getTeachers()
    set({ teachers: teacherList })
  },

  deleteTeacher: async (teacherId: string) => {
    await dbDeleteTeacher(teacherId)
    const teacherList = await getTeachers()
    // Reload all students since some may have been deleted
    let allStudents: UserProfile[] = []
    for (const t of teacherList) {
      const s = await getStudents(t.id)
      allStudents = allStudents.concat(s)
    }
    set({ teachers: teacherList, students: allStudents })
  },

  createStudent: async (name: string) => {
    const { user } = get()
    if (!user) return
    const teacherId = user.role === 'teacher' ? user.id : (user.teacherId ?? user.id)
    await dbCreateStudent(name, teacherId, 'newby')
    // Reload students for this teacher
    const studentList = await getStudents(teacherId)
    set({ students: studentList })
  },

  addStandaloneStudent: async (name: string) => {
    await dbCreateStudent(name, null, 'newby')
    const standalone = await getStandaloneStudents()
    set({ standaloneStudents: standalone })
  },

  deleteStandaloneStudent: async (userId: string) => {
    await dbDeleteStudent(userId)
    const standalone = await getStandaloneStudents()
    set({ standaloneStudents: standalone })
  },

  deleteStudent: async (userId: string) => {
    await dbDeleteStudent(userId)
    const { user } = get()
    if (!user) return
    const teacherId = user.role === 'teacher' ? user.id : (user.teacherId ?? user.id)
    const studentList = await getStudents(teacherId)
    set({ students: studentList })
  },

  toggleSkillEnabled: async (skillId: string, studentId?: string) => {
    const { teacherConfig, user, skillRecords } = get()
    if (!teacherConfig) return

    if (studentId) {
      // Per-student override
      const overrides = { ...teacherConfig.studentOverrides }
      const current = new Set(overrides[studentId] ?? teacherConfig.disabledSkillIds)
      if (current.has(skillId)) {
        current.delete(skillId)
      } else {
        current.add(skillId)
      }
      overrides[studentId] = [...current]
      const updated: TeacherConfig = {
        ...teacherConfig,
        studentOverrides: overrides,
      }
      await updateTeacherConfig(updated)
      enqueueSync('teacherConfigs', updated.id, 'upsert', updated as any)
      set({ teacherConfig: updated })
    } else {
      // Global default
      const disabled = new Set(teacherConfig.disabledSkillIds)
      const wasDisabled = disabled.has(skillId)
      if (wasDisabled) {
        disabled.delete(skillId)
      } else {
        disabled.add(skillId)
      }
      const updated: TeacherConfig = {
        ...teacherConfig,
        disabledSkillIds: [...disabled],
      }
      await updateTeacherConfig(updated)
      enqueueSync('teacherConfigs', updated.id, 'upsert', updated as any)

      // When a skill is disabled, unlock any downstream skills whose prereqs are now all met
      if (!wasDisabled && user) {
        const allSkills = [...SKILL_MAP.values()]
        const updatedRecords = new Map(skillRecords)
        let changed = true
        while (changed) {
          changed = false
          for (const skill of allSkills) {
            if (disabled.has(skill.id)) continue
            if (skill.path !== user.path && skill.path !== 'all') continue
            const record = updatedRecords.get(skill.id)
            const status = evaluateSkillStatus(skill, record ?? null, updatedRecords, disabled)
            if (status === 'unlocked' && (!record || record.status === 'locked')) {
              const now = nowISO()
              const newRecord: SkillRecord = {
                id: record?.id ?? newId(),
                userId: user.id,
                skillId: skill.id,
                status: 'unlocked' as const,
                unlockedAt: now,
                bestBpm: record?.bestBpm ?? null,
                currentBpm: record?.currentBpm ?? null,
                practiceCount: record?.practiceCount ?? 0,
                lastPracticed: record?.lastPracticed ?? null,
                progressedAt: record?.progressedAt ?? null,
                masteredAt: record?.masteredAt ?? null,
                srInterval: record?.srInterval ?? null,
                srNextReview: record?.srNextReview ?? null,
                fsrsState: record?.fsrsState ?? null,
                fsrsNextReview: record?.fsrsNextReview ?? null,
                masteryLevel: record?.masteryLevel ?? null,
                createdAt: record?.createdAt ?? now,
                updatedAt: now,
              }
              await upsertSkillRecord(newRecord)
              enqueueSync('skillRecords', newRecord.id, 'upsert', newRecord as any)
              updatedRecords.set(skill.id, newRecord)
              changed = true
            }
          }
        }
        set({ teacherConfig: updated, disabledSkillIds: disabled, skillRecords: updatedRecords })
      } else {
        set({ teacherConfig: updated, disabledSkillIds: disabled })
      }

      get().refreshSessionPlan()
    }
  },

  getStudentDisabledSkills: (studentId: string) => {
    const { teacherConfig } = get()
    if (!teacherConfig) return new Set<string>()
    const overrideList = teacherConfig.studentOverrides?.[studentId]
    return new Set(overrideList ?? teacherConfig.disabledSkillIds)
  },
}))
