import { create } from 'zustand'
import { db, getOrCreateUser, nowISO } from '../db/db'
import type { UserProfile } from '../db/db'
import { refreshRollMap } from '../data/rollPatterns'
import { enqueueSync } from '../db/sync'
import type { Path } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Page union — narrowed in Task 0.4 to a Phase-0 placeholder shape.
// Task 0.6 will replace this with the coach-driven routing.
// ─────────────────────────────────────────────────────────────────────────────
export type Page = 'splash' | 'auth' | 'placeholder-home'
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
  setPage: (page) => set({ currentPage: page, navMode: page === 'placeholder-home' ? 'home' : 'section' }),
  goHome: () => set({ currentPage: 'placeholder-home', navMode: 'home' }),
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
        showLoginScreen: false,
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
    set({ user: { ...user, path } })
  },

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
