import { create } from 'zustand'
import { db, getOrCreateUser, nowISO } from '../db/db'
import type { UserProfile } from '../db/db'
import { refreshRollMap } from '../data/rollPatterns'
import { enqueueSync } from '../db/sync'
import type { Path } from '../types'
import type { Goal, ItemTag, CheckInRecord, TagValue, ItemRef } from '../types/coach'

// ─────────────────────────────────────────────────────────────────────────────
// Page union — Task 2.4 expanded this to cover the coach-driven shell:
// PlanDashboard is the home, Library/Settings/Profile are NavBar siblings,
// and FretboardLab is reachable from Library (not directly tab-routed).
// ─────────────────────────────────────────────────────────────────────────────
export type Page =
  | 'splash'
  | 'auth'
  | 'api-key-gate'
  | 'assessment'
  | 'check-in'
  | 'plan-dashboard'
  | 'library'
  | 'settings'
  | 'profile'
  | 'fretboard-lab'
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

  // User
  user: UserProfile | null
  authUserName: string | null
  authUserEmail: string | null
  setAuthUser: (name: string | null, email: string | null) => void
  loadUser: () => Promise<void>
  setUserPath: (path: Path) => Promise<void>

  // ───────────────────────────────────────────────────────────────────────────
  // COACH OVERHAUL: goals + itemTags + checkInRecords state added in Phase 1
  // ───────────────────────────────────────────────────────────────────────────

  // Coach state
  goals: Goal[]
  itemTags: Record<string, ItemTag>   // keyed by composite id "kind:id"
  currentCheckInId: string | null
  lastCheckInAt: string | null
  assessmentCompletedAt: string | null
  apiKey: string | null
  librarySelection: ItemRef | null    // dashboard → library handoff (Task 3.8)

  // Coach actions
  loadGoals: () => Promise<void>
  loadItemTags: () => Promise<void>
  upsertGoal: (goal: Goal) => Promise<void>
  retireGoal: (goalId: string, reason?: string) => Promise<void>
  setItemTag: (itemRef: ItemRef, tag: TagValue) => Promise<void>
  recordCheckIn: (record: CheckInRecord) => Promise<void>
  markAssessmentComplete: () => Promise<void>
  setApiKey: (key: string) => Promise<void>
  setLastCheckInAt: (iso: string) => Promise<void>
  setLibrarySelection: (ref: ItemRef | null) => void

  // Auth
  showLoginScreen: boolean
  logoutUser: () => Promise<void>

  // Loading / error
  isLoading: boolean
  error: string | null
}

export const useStore = create<AppState>((set, get) => ({
  // ── App shell ─────────────────────────────────────────────────────────────
  currentPage: 'splash',
  navMode: 'home',
  appMode: (sessionStorage.getItem('banjo-buddy-mode') as 'quick-pick' | 'deep-dive') || null,
  setPage: (page) => set({ currentPage: page, navMode: page === 'plan-dashboard' ? 'home' : 'section' }),
  goHome: () => set({ currentPage: 'plan-dashboard', navMode: 'home' }),
  setAppMode: (mode) => {
    sessionStorage.setItem('banjo-buddy-mode', mode)
    set({ appMode: mode })
  },

  // ── Tool modals ───────────────────────────────────────────────────────────
  openModal: null,
  setOpenModal: (modal) => set({ openModal: modal }),
  fretlabPatternId: null,
  setFretlabPatternId: (id) => set({ fretlabPatternId: id }),

  // ── User ──────────────────────────────────────────────────────────────────
  user: null,
  authUserName: null,
  authUserEmail: null,
  setAuthUser: (name, email) => set({ authUserName: name, authUserEmail: email }),

  loadUser: async () => {
    set({ isLoading: true, error: null })
    try {
      const localUser = await getOrCreateUser()
      await refreshRollMap(localUser.id, localUser.role, localUser.teacherId)
      set({
        user: localUser,
        lastCheckInAt: localUser.lastCheckInAt ?? get().lastCheckInAt,
        showLoginScreen: false,
        isLoading: false,
      })
      // Hydrate coach slice for the freshly-loaded user.
      await Promise.all([get().loadGoals(), get().loadItemTags()])
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
    set({ user: { ...user, path } })
  },

  // ── Coach state ───────────────────────────────────────────────────────────
  goals: [],
  itemTags: {},
  currentCheckInId: null,
  lastCheckInAt: null,
  assessmentCompletedAt: localStorage.getItem('banjo-buddy-assessment-at'),
  apiKey: localStorage.getItem('banjo-buddy-anthropic-key'),
  librarySelection: null,

  loadGoals: async () => {
    const userId = get().user?.id
    if (!userId) return
    const goals = await db.goals.where('userId').equals(userId).toArray()
    set({ goals })
  },

  loadItemTags: async () => {
    const userId = get().user?.id
    if (!userId) return
    const tags = await db.itemTags.where('userId').equals(userId).toArray()
    set({ itemTags: Object.fromEntries(tags.map((t) => [t.id, t])) })
  },

  upsertGoal: async (goal) => {
    await db.goals.put(goal)
    await get().loadGoals()
  },

  retireGoal: async (goalId, reason) => {
    const goal = await db.goals.get(goalId)
    if (!goal) return
    const now = nowISO()
    const updated: Goal = {
      ...goal,
      status: 'shelved',
      updatedAt: now,
      completedAt: now,
      history: [
        ...goal.history,
        { at: now, from: goal.status, to: 'shelved', reason },
      ],
    }
    await db.goals.put(updated)
    await get().loadGoals()
  },

  setItemTag: async (itemRef, tag) => {
    const userId = get().user?.id
    if (!userId) return
    const id =
      itemRef.kind === 'song-section'
        ? `song-section:${itemRef.songId}/${itemRef.sectionId}`
        : `${itemRef.kind}:${itemRef.id}`
    const itemTag: ItemTag = {
      id,
      userId,
      itemRef,
      tag,
      updatedAt: nowISO(),
    }
    await db.itemTags.put(itemTag)
    set((s) => ({ itemTags: { ...s.itemTags, [id]: itemTag } }))
  },

  recordCheckIn: async (record) => {
    await db.checkInRecords.put(record)
    set({ lastCheckInAt: record.endedAt })
  },

  markAssessmentComplete: async () => {
    const now = nowISO()
    localStorage.setItem('banjo-buddy-assessment-at', now)
    set({ assessmentCompletedAt: now })
    const userId = get().user?.id
    if (userId) {
      await db.userProfiles.update(userId, { assessmentCompletedAt: now })
    }
  },

  setApiKey: async (key) => {
    localStorage.setItem('banjo-buddy-anthropic-key', key)
    set({ apiKey: key })
  },

  setLastCheckInAt: async (iso) => {
    set({ lastCheckInAt: iso })
    const userId = get().user?.id
    if (userId) {
      await db.userProfiles.update(userId, { lastCheckInAt: iso })
    }
  },

  setLibrarySelection: (ref) => set({ librarySelection: ref }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  showLoginScreen: false,

  logoutUser: async () => {
    const localUser = await getOrCreateUser()
    set({
      user: localUser,
      currentPage: 'splash',
      navMode: 'home',
      showLoginScreen: false,
    })
  },

  // ── Loading / error ───────────────────────────────────────────────────────
  isLoading: false,
  error: null,
}))
