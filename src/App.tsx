// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — App shell
//
// Task 2.4 of the coach overhaul: PlanDashboard is the home page, NavBar
// switches between Plan / Library / Settings / Profile. FretboardLab is
// reachable from Library (and through the FretLab tool modal). Tool modals
// (Metronome, Tuner, FretLab) still float over whatever page is rendered.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import './styles/tokens.css'
import './App.css'
import { useStore } from './store/useStore'
import type { Page } from './store/useStore'
import { useTheme } from './hooks/useTheme'
import { Splash } from './components/Splash/Splash'
import { AuthScreen } from './components/Auth/AuthScreen'
import { Metronome } from './components/Metronome/Metronome'
import { Tuner } from './components/Tuner/Tuner'
import { FretLabPanel } from './components/Fretboard/FretLabPanel'
import { PlanDashboard } from './components/Plan/PlanDashboard'
import { Library } from './components/Library/Library'
import { SettingsPage } from './components/Settings/SettingsPage'
import { ProfilePage } from './components/Profile/ProfilePage'
import { FretboardLab } from './components/Fretboard/FretboardLab'
import { ApiKeyGate } from './components/ApiKeyGate/ApiKeyGate'
import { AssessmentChat } from './components/Assessment/AssessmentChat'
import { CheckInChat } from './components/CheckIn/CheckInChat'
import { supabase } from './db/supabase'
import { startAutoSync, stopAutoSync, uploadLocalData } from './db/sync'

function NavBar() {
  const page = useStore((s) => s.currentPage)
  const setPage = useStore((s) => s.setPage)
  const tabs: Array<[Page, string]> = [
    ['plan-dashboard', 'Plan'],
    ['library', 'Library'],
    ['settings', 'Settings'],
    ['profile', 'Profile'],
  ]
  return (
    <nav className="app-nav">
      {tabs.map(([p, label]) => (
        <button
          key={p}
          className={`app-nav-tab ${page === p ? 'active' : ''}`}
          onClick={() => setPage(p)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

// Decide where the user belongs after auth/skip-auth completes. The gates are
// linear: no API key → collect one; key but no assessment → run assessment;
// otherwise → land on the plan dashboard.
function determineNextPage(): Page {
  const { apiKey, assessmentCompletedAt } = useStore.getState()
  if (!apiKey) return 'api-key-gate'
  if (!assessmentCompletedAt) return 'assessment'
  return 'plan-dashboard'
}

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'splash':
      // Splash is rendered by the App shell directly (it needs the onEnter
      // callback wired to local auth state), so this branch is unreachable
      // when showNav is true. Returning null keeps the switch exhaustive.
      return null
    case 'auth':
      // Same story as splash — AuthScreen is rendered by the shell with the
      // bootstrap callbacks. NavBar is hidden in this state.
      return null
    case 'api-key-gate':
      return <ApiKeyGate />
    case 'assessment':
      return <AssessmentChat />
    case 'check-in':
      return <CheckInChat />
    case 'plan-dashboard':
      return <PlanDashboard />
    case 'library':
      return <Library />
    case 'settings':
      return <SettingsPage />
    case 'profile':
      return <ProfilePage />
    case 'fretboard-lab':
      return <FretboardLab />
  }
}

export default function App() {
  const page = useStore((s) => s.currentPage)
  const setPage = useStore((s) => s.setPage)
  const loadUser = useStore((s) => s.loadUser)
  const isLoading = useStore((s) => s.isLoading)
  const openModal = useStore((s) => s.openModal)
  const setOpenModal = useStore((s) => s.setOpenModal)
  const fretlabPatternId = useStore((s) => s.fretlabPatternId)

  // Ensure the document-level theme attribute is applied
  useTheme()

  const [authChecked, setAuthChecked] = useState(false)
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)

  // ── Supabase session bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    const setAuthUser = useStore.getState().setAuthUser

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthedUserId(session.user.id)
        setAuthUser(session.user.user_metadata?.name ?? null, session.user.email ?? null)
        startAutoSync(session.user.id)
      }
      setAuthChecked(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthedUserId(session.user.id)
        setAuthUser(session.user.user_metadata?.name ?? null, session.user.email ?? null)
        startAutoSync(session.user.id)
      } else {
        setAuthedUserId(null)
        setAuthUser(null, null)
        stopAutoSync()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Initial user load ───────────────────────────────────────────────────────
  useEffect(() => {
    loadUser()
  }, [loadUser])

  // ── Page advancement once auth is resolved ─────────────────────────────────
  // While we're sitting on the splash, decide where to go next when the user
  // taps "Enter" (handled below). If we land on `auth` but the user is already
  // authed (or skipped auth previously), jump to plan-dashboard immediately.
  useEffect(() => {
    if (!authChecked) return
    const hasSkippedAuth = localStorage.getItem('banjo-buddy-auth-skipped') === 'true'
    if (page === 'auth' && (authedUserId || hasSkippedAuth)) {
      setPage(determineNextPage())
    }
  }, [page, authChecked, authedUserId, setPage])

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading Banjo Buddy…</p>
      </div>
    )
  }

  const showNav =
    page !== 'splash' &&
    page !== 'auth' &&
    page !== 'api-key-gate' &&
    page !== 'assessment' &&
    page !== 'check-in'

  return (
    <div className="app">
      {showNav && <NavBar />}

      {page === 'splash' && (
        <Splash
          onEnter={() => {
            const hasSkippedAuth = localStorage.getItem('banjo-buddy-auth-skipped') === 'true'
            if (authedUserId || hasSkippedAuth) {
              setPage(determineNextPage())
            } else {
              setPage('auth')
            }
          }}
        />
      )}

      {page === 'auth' && (
        <AuthScreen
          onAuth={async (userId, email, role) => {
            setAuthedUserId(userId)
            useStore.getState().setAuthUser(null, email)
            // Migrate local data to cloud account on first auth
            const migrated = localStorage.getItem('banjo-buddy-data-migrated')
            if (!migrated) {
              await uploadLocalData('local', userId)
              localStorage.setItem('banjo-buddy-data-migrated', 'true')
            }
            if (role) {
              localStorage.setItem('banjo-buddy-preferred-role', role)
            }
            startAutoSync(userId)
            await loadUser()
            setPage(determineNextPage())
          }}
          onSkip={() => {
            localStorage.setItem('banjo-buddy-auth-skipped', 'true')
            loadUser()
            setPage(determineNextPage())
          }}
        />
      )}

      {showNav && <PageContent page={page} />}

      {/* Tool modals — float over any page that's open */}
      {openModal && (
        <div className="tool-modal-backdrop" onClick={() => setOpenModal(null)}>
          <div
            className={`tool-modal ${openModal === 'fretlab' ? 'tool-modal-wide' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tool-modal-header">
              <button className="tool-modal-close" onClick={() => setOpenModal(null)}>
                ✕
              </button>
            </div>
            <div className="tool-modal-body">
              {openModal === 'metronome' ? (
                <Metronome />
              ) : openModal === 'tuner' ? (
                <Tuner />
              ) : (
                <FretLabPanel rollPatternId={fretlabPatternId} bpm={100} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
