import { useState, useEffect } from 'react'
import './styles/tokens.css'
import './App.css'
import { useStore, type Page, type ToolModal } from './store/useStore'
import { useTheme } from './hooks/useTheme'
import { Splash } from './components/Splash/Splash'
import { PracticeSession } from './components/Practice/PracticeSession'
import { SkillTreeNav, SkillTreeContent } from './components/SkillTree/SkillTree'
import { Metronome } from './components/Metronome/Metronome'
import { Tuner } from './components/Tuner/Tuner'
import { Pathway } from './components/Pathway/Pathway'
import { ProgressPage } from './components/Progress/ProgressPage'
import { AchievementList } from './components/Achievements/AchievementList'
import { AchievementToast } from './components/Achievements/AchievementToast'
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow'
import { PageTransition } from './components/Motion/PageTransition'
import { ConfettiEffect } from './components/Celebrations/ConfettiEffect'
import { useCelebration } from './hooks/useCelebration'
import { SettingsPage } from './components/Settings/SettingsPage'
import { UserPicker } from './components/Login/UserPicker'
import { UserBadge } from './components/Login/UserBadge'
import { IntroFlow } from './components/Intro/IntroFlow'
import { SiteTour } from './components/Tour/SiteTour'
import { FretboardLab } from './components/Fretboard/FretboardLab'
import { FretLabPanel } from './components/Fretboard/FretLabPanel'
import { HomePage } from './components/Home/HomePage'
import { TopNavBar } from './components/Home/TopNavBar'
import { ProfilePage } from './components/Profile/ProfilePage'
import { AuthScreen } from './components/Auth/AuthScreen'
import { ModeSelect } from './components/ModeSelect/ModeSelect'
import { Library } from './components/Library/Library'
import { supabase } from './db/supabase'
import { startAutoSync, stopAutoSync, uploadLocalData, setOnAfterPull } from './db/sync'
const SPLIT_PAGES = new Set<Page>(['pathway'])

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'dashboard':     return <HomePage />
    case 'practice':      return <PracticeSession />
    case 'progress':      return <ProgressPage />
    case 'achievements':  return <AchievementList />
    case 'settings':      return <SettingsPage />
    case 'profile':       return <ProfilePage />
    case 'fretboard-lab': return <FretboardLab />
    default:              return <HomePage />
  }
}

function BanjoWatermark() {
  return (
    <div className="skill-tree-empty">
      <svg className="skill-tree-watermark" viewBox="0 0 200 520" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Banjo head (drum) */}
        <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 3" />
        {/* Tension hooks around rim */}
        {[...Array(16)].map((_, i) => {
          const a = (i / 16) * Math.PI * 2 - Math.PI / 2
          const x1 = 100 + Math.cos(a) * 78
          const y1 = 100 + Math.sin(a) * 78
          const x2 = 100 + Math.cos(a) * 85
          const y2 = 100 + Math.sin(a) * 85
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" />
        })}
        {/* Bridge */}
        <rect x="75" y="120" width="50" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        {/* Tailpiece */}
        <path d="M85 178 L100 190 L115 178" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="100" y1="185" x2="100" y2="195" stroke="currentColor" strokeWidth="1" />
        {/* Strings on head */}
        <line x1="88" y1="30" x2="88" y2="178" stroke="currentColor" strokeWidth="0.5" />
        <line x1="94" y1="22" x2="94" y2="178" stroke="currentColor" strokeWidth="0.5" />
        <line x1="100" y1="18" x2="100" y2="178" stroke="currentColor" strokeWidth="0.5" />
        <line x1="106" y1="22" x2="106" y2="178" stroke="currentColor" strokeWidth="0.5" />
        <line x1="112" y1="30" x2="112" y2="178" stroke="currentColor" strokeWidth="0.5" />
        {/* Neck */}
        <rect x="88" y="185" width="24" height="260" rx="3" stroke="currentColor" strokeWidth="2" />
        {/* Frets */}
        {[0, 38, 70, 98, 122, 143, 161, 177].map((y, i) => (
          <line key={i} x1="88" y1={195 + y} x2="112" y2={195 + y} stroke="currentColor" strokeWidth="1" />
        ))}
        {/* Fret dots */}
        <circle cx="100" cy="252" r="2.5" fill="currentColor" opacity="0.5" />
        <circle cx="100" cy="308" r="2.5" fill="currentColor" opacity="0.5" />
        <circle cx="100" cy="355" r="2.5" fill="currentColor" opacity="0.5" />
        {/* 5th string peg (short string - Gibson style) */}
        <circle cx="83" cy="250" r="4" stroke="currentColor" strokeWidth="1.2" />
        <line x1="87" y1="250" x2="88" y2="250" stroke="currentColor" strokeWidth="0.8" />
        {/* Peghead */}
        <path d="M86 445 L86 490 Q86 505 100 505 Q114 505 114 490 L114 445" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* Tuning pegs */}
        <circle cx="80" cy="460" r="4" stroke="currentColor" strokeWidth="1" />
        <circle cx="80" cy="478" r="4" stroke="currentColor" strokeWidth="1" />
        <circle cx="120" cy="460" r="4" stroke="currentColor" strokeWidth="1" />
        <circle cx="120" cy="478" r="4" stroke="currentColor" strokeWidth="1" />
        {/* Decorative scroll text */}
        <text x="100" y="498" textAnchor="middle" fontSize="7" fontFamily="Georgia, serif" fill="currentColor" opacity="0.7">BANJO BUDDY</text>
      </svg>
      <p className="skill-tree-empty-text">Select a skill to start practicing</p>
    </div>
  )
}

export default function App() {
  const page = useStore((s) => s.currentPage)
  const navMode = useStore((s) => s.navMode)
  const setPage = useStore((s) => s.setPage)
  const loadUser = useStore((s) => s.loadUser)
  const isLoading = useStore((s) => s.isLoading)
  const selectedSkillId = useStore((s) => s.selectedSkillId)
  const newAchievements = useStore((s) => s.newAchievements)
  const clearNewAchievements = useStore((s) => s.clearNewAchievements)
  const newlyUnlocked = useStore((s) => s.newlyUnlocked)
  const showLoginScreen = useStore((s) => s.showLoginScreen)
  const tourPending = useStore((s) => s.tourPending)
  const startTour = useStore((s) => s.startTour)
  const dismissTour = useStore((s) => s.dismissTour)
  const [showTourOffer, setShowTourOffer] = useState(false)
  const [skillCategory, setSkillCategory] = useState<import('./data/curriculum').SkillCategory | 'library' | null>(null)

  const { theme, toggleTheme } = useTheme()
  const { celebration, dismiss: dismissCelebration } = useCelebration()
  const appMode = useStore((s) => s.appMode)
  const setAppMode = useStore((s) => s.setAppMode)
  const openModal = useStore((s) => s.openModal)
  const setOpenModal = useStore((s) => s.setOpenModal)
  const fretlabPatternId = useStore((s) => s.fretlabPatternId)
  const [splashDismissed, setSplashDismissed] = useState(
    () => sessionStorage.getItem('banjo-splash-seen') === 'true'
  )
  const [introDone, setIntroDone] = useState(
    () => localStorage.getItem('banjo-buddy-intro-done') === 'true'
  )
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem('banjo-buddy-onboarded') === 'true'
  )
  const [authChecked, setAuthChecked] = useState(false)
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)

  // Check for existing Supabase session on mount
  useEffect(() => {
    // Refresh in-memory caches after sync pulls new data
    setOnAfterPull(() => {
      useStore.getState().loadSkillImageOverrides()
    })

    const setAuthUser = useStore.getState().setAuthUser
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthedUserId(session.user.id)
        setAuthUser(session.user.user_metadata?.name ?? null, session.user.email ?? null)
        startAutoSync(session.user.id)
      }
      setAuthChecked(true)
    })

    // Listen for auth state changes (login/logout/token refresh)
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

  useEffect(() => {
    loadUser()
  }, [])

  // Show tour offer after login if this is a new user
  useEffect(() => {
    if (tourPending && !showLoginScreen) {
      const timer = setTimeout(() => setShowTourOffer(true), 600)
      return () => clearTimeout(timer)
    }
  }, [tourPending, showLoginScreen])

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading Banjo Buddy…</p>
      </div>
    )
  }

  if (!splashDismissed) {
    return (
      <Splash
        onEnter={() => {
          sessionStorage.setItem('banjo-splash-seen', 'true')
          setSplashDismissed(true)
        }}
      />
    )
  }

  // Intro gate: educational walkthrough for first-time users
  if (!introDone) {
    return (
      <IntroFlow
        onComplete={() => {
          localStorage.setItem('banjo-buddy-intro-done', 'true')
          setIntroDone(true)
        }}
      />
    )
  }

  // Onboarding gate: mic setup + note testing
  if (!onboardingDone) {
    return (
      <OnboardingFlow
        onComplete={() => {
          localStorage.setItem('banjo-buddy-onboarded', 'true')
          localStorage.setItem('banjo-buddy-tour-pending', 'true')
          setOnboardingDone(true)
        }}
      />
    )
  }

  // Auth gate — show login/signup if not authenticated and no local skip
  const hasSkippedAuth = localStorage.getItem('banjo-buddy-auth-skipped') === 'true'
  if (authChecked && !authedUserId && !hasSkippedAuth) {
    return (
      <AuthScreen
        onAuth={async (userId, email, role) => {
          setAuthedUserId(userId)
          useStore.getState().setAuthUser(null, email)
          // Migrate local data to cloud account if this is first auth
          const migrated = localStorage.getItem('banjo-buddy-data-migrated')
          if (!migrated) {
            await uploadLocalData('local', userId)
            localStorage.setItem('banjo-buddy-data-migrated', 'true')
          }
          if (role) {
            localStorage.setItem('banjo-buddy-preferred-role', role)
          }
          startAutoSync(userId)
          loadUser()
        }}
        onSkip={() => {
          localStorage.setItem('banjo-buddy-auth-skipped', 'true')
          loadUser()
        }}
      />
    )
  }

  // Login screen gate — skip if authenticated via Supabase
  if (showLoginScreen) {
    if (authedUserId || hasSkippedAuth) {
      // Auto-login — use preferred role if set
      const store = useStore.getState()
      if (!store.activeUserId) {
        const preferredRole = localStorage.getItem('banjo-buddy-preferred-role')
        if (preferredRole === 'teacher') {
          // Find or create a teacher profile, then log in as teacher
          const teachers = store.teachers
          if (teachers.length > 0) {
            store.loginAsTeacher(teachers[0].id)
          } else {
            store.createTeacher(store.authUserName ?? 'Teacher').then(() => {
              const updated = useStore.getState().teachers
              if (updated.length > 0) useStore.getState().loginAsTeacher(updated[0].id)
              else store.loginAsGuest()
            })
          }
        } else {
          store.loginAsGuest()
        }
      }
      return (
        <div className="app-loading">
          <div className="loading-spinner" />
          <p>Loading Banjo Buddy…</p>
        </div>
      )
    }
    return <UserPicker />
  }

  // Mode select gate — show choice if user hasn't picked yet
  const savedMode = localStorage.getItem('banjo-buddy-mode')
  if (!savedMode) {
    return <ModeSelect />
  }

  // Quick Pick route — Library-first layout
  if (appMode === 'quick-pick') {
    return (
      <div className="app">
        <UserBadge theme={theme} onToggleTheme={toggleTheme} />
        <main className="app-content app-content-home" style={{ paddingTop: 16 }}>
          <Library />
        </main>
        <button className="mode-switch-btn" onClick={() => setAppMode('deep-dive')}>
          Switch to Deep Dive
        </button>
        {openModal === 'metronome' && <Metronome />}
        {openModal === 'tuner' && <Tuner />}
      </div>
    )
  }

  const isSplitPage = SPLIT_PAGES.has(page)

  return (
    <div className={`app ${navMode === 'home' ? 'app-home-mode' : ''}`}>
      {/* Top nav bar (visible when in a section, not on home) */}
      {navMode === 'section' && <TopNavBar />}
      <button className="mode-switch-btn" onClick={() => setAppMode('quick-pick')}>
        Switch to Quick Pick
      </button>

      {/* User badge + account menu (top-right) */}
      <UserBadge theme={theme} onToggleTheme={toggleTheme} />

      {/* Site tour overlay */}
      <SiteTour />

      {/* Tour offer modal for new users */}
      {showTourOffer && (
        <div className="tour-offer-overlay">
          <div className="tour-offer-modal">
            <h2>Welcome to Banjo Buddy!</h2>
            <p>Would you like a quick tour to get familiar with the app?</p>
            <div className="tour-offer-actions">
              <button
                className="tour-offer-btn tour-offer-btn-primary"
                onClick={() => { setShowTourOffer(false); localStorage.setItem('banjo-buddy-tour-seen', 'true'); startTour() }}
              >
                Show Me Around
              </button>
              <button
                className="tour-offer-btn tour-offer-btn-secondary"
                onClick={() => { setShowTourOffer(false); localStorage.setItem('banjo-buddy-tour-seen', 'true'); dismissTour() }}
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti overlay for celebrations */}
      <ConfettiEffect trigger={newlyUnlocked.length > 0 || celebration?.type === 'confetti'} />

      {/* Achievement toast */}
      <AchievementToast
        achievement={newAchievements.length > 0 ? newAchievements[0] : null}
        onDismiss={clearNewAchievements}
      />

      {navMode === 'home' ? (
        <main className="app-content app-content-home">
          <HomePage />
        </main>
      ) : page === 'skill-tree' ? (
        <main className={`app-content-skills ${selectedSkillId ? 'mobile-practice-active' : ''}`}>
          <SkillTreeNav activeCategory={skillCategory} onSelect={(cat) => { setSkillCategory(cat); useStore.getState().clearSelectedSkill() }} />
          <div className="stc-content-area">
            {selectedSkillId ? (
              <>
                <button
                  className="mobile-back-btn"
                  onClick={() => useStore.getState().clearSelectedSkill()}
                >
                  ← Back to Skills
                </button>
                <PracticeSession />
              </>
            ) : (
              <SkillTreeContent activeCategory={skillCategory} onSelectCategory={setSkillCategory} />
            )}
          </div>
        </main>
      ) : isSplitPage ? (
        <main className={`app-content-split ${selectedSkillId ? 'mobile-practice-active' : ''}`}>
          <Pathway />
          <div className="skill-tree-main" data-tour="skill-tree-main">
            {selectedSkillId ? (
              <>
                <button
                  className="mobile-back-btn"
                  onClick={() => useStore.getState().clearSelectedSkill()}
                >
                  ← Back to Pathway
                </button>
                <PracticeSession />
              </>
            ) : <BanjoWatermark />}
          </div>
        </main>
      ) : (
        <main className="app-content">
          <PageTransition pageKey={page}>
            <PageContent page={page} />
          </PageTransition>
        </main>
      )}

      {/* Tool modals (Metronome / Tuner) */}
      {openModal && (
        <div className="tool-modal-backdrop" onClick={() => setOpenModal(null)}>
          <div className={`tool-modal ${openModal === 'fretlab' ? 'tool-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="tool-modal-header">
              <button className="tool-modal-close" onClick={() => setOpenModal(null)}>✕</button>
            </div>
            <div className="tool-modal-body">
              {openModal === 'metronome' ? <Metronome /> : openModal === 'tuner' ? <Tuner /> : <FretLabPanel rollPatternId={fretlabPatternId} bpm={100} />}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav removed — navigation is now via home cards + top bar */}
    </div>
  )
}
