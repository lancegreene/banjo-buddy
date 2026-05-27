// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — App shell (Phase 0 placeholder)
//
// Task 0.6 of the coach overhaul: minimal routing between splash, auth, and a
// placeholder home. Tool modals (Metronome, Tuner, FretLab) still float over
// whatever page is rendered. Dashboard, library, navbar, etc. arrive in Phase 2.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import './styles/tokens.css'
import './App.css'
import { useStore } from './store/useStore'
import { useTheme } from './hooks/useTheme'
import { Splash } from './components/Splash/Splash'
import { AuthScreen } from './components/Auth/AuthScreen'
import { Metronome } from './components/Metronome/Metronome'
import { Tuner } from './components/Tuner/Tuner'
import { FretLabPanel } from './components/Fretboard/FretLabPanel'
import { supabase } from './db/supabase'
import { startAutoSync, stopAutoSync, uploadLocalData } from './db/sync'

function PlaceholderHome() {
  const toggleTheme = useTheme().toggleTheme
  const setOpenModal = useStore((s) => s.setOpenModal)
  return (
    <div className="placeholder-home">
      <h1>Banjo Buddy</h1>
      <p>Coach experience under construction.</p>
      <div className="placeholder-home-tools">
        <button onClick={() => setOpenModal('metronome')}>Metronome</button>
        <button onClick={() => setOpenModal('tuner')}>Tuner</button>
        <button onClick={() => setOpenModal('fretlab')}>FretLab</button>
        <button onClick={toggleTheme}>Toggle theme</button>
      </div>
    </div>
  )
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
  // authed (or skipped auth previously), jump to placeholder-home immediately.
  useEffect(() => {
    if (!authChecked) return
    const hasSkippedAuth = localStorage.getItem('banjo-buddy-auth-skipped') === 'true'
    if (page === 'auth' && (authedUserId || hasSkippedAuth)) {
      setPage('placeholder-home')
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

  return (
    <div className="app">
      {page === 'splash' && (
        <Splash
          onEnter={() => {
            const hasSkippedAuth = localStorage.getItem('banjo-buddy-auth-skipped') === 'true'
            if (authedUserId || hasSkippedAuth) {
              setPage('placeholder-home')
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
            setPage('placeholder-home')
          }}
          onSkip={() => {
            localStorage.setItem('banjo-buddy-auth-skipped', 'true')
            loadUser()
            setPage('placeholder-home')
          }}
        />
      )}

      {page === 'placeholder-home' && <PlaceholderHome />}

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
