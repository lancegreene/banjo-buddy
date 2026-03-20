import { useState, useEffect } from 'react'
import './styles/tokens.css'
import './App.css'
import { useStore, type Page, type ToolModal } from './store/useStore'
import { useTheme } from './hooks/useTheme'
import { Splash } from './components/Splash/Splash'
import { Dashboard } from './components/Dashboard/Dashboard'
import { PracticeSession } from './components/Practice/PracticeSession'
import { SkillTree } from './components/SkillTree/SkillTree'
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

const NAV_ITEMS: { id: Page | ToolModal; label: string; icon: string; tour: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '⌂', tour: 'nav-home' },
  { id: 'pathway', label: 'Pathway', icon: '⟠', tour: 'nav-pathway' },
  { id: 'skill-tree', label: 'Skills', icon: '◈', tour: 'nav-skills' },
  { id: 'progress', label: 'Progress', icon: '▦', tour: 'nav-progress' },
  { id: 'achievements', label: 'Awards', icon: '★', tour: 'nav-awards' },
  { id: 'settings', label: 'Settings', icon: '⚙', tour: 'nav-settings' },
  { id: 'metronome', label: 'Metro', icon: '♩', tour: 'nav-metro' },
  { id: 'tuner', label: 'Tuner', icon: '◎', tour: 'nav-tuner' },
]

const MODAL_IDS = new Set<string>(['metronome', 'tuner'])
const SPLIT_PAGES = new Set<Page>(['skill-tree', 'pathway'])

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'dashboard':     return <Dashboard />
    case 'practice':      return <PracticeSession />
    case 'progress':      return <ProgressPage />
    case 'achievements':  return <AchievementList />
    case 'settings':      return <SettingsPage />
    default:              return <Dashboard />
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

  const { theme, toggleTheme } = useTheme()
  const { celebration, dismiss: dismissCelebration } = useCelebration()
  const openModal = useStore((s) => s.openModal)
  const setOpenModal = useStore((s) => s.setOpenModal)
  const [splashDismissed, setSplashDismissed] = useState(
    () => sessionStorage.getItem('banjo-splash-seen') === 'true'
  )
  const [introDone, setIntroDone] = useState(
    () => localStorage.getItem('banjo-buddy-intro-done') === 'true'
  )
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem('banjo-buddy-onboarded') === 'true'
  )

  useEffect(() => {
    loadUser()
  }, [])

  // Auto-start tour after login if user opted in during intro
  useEffect(() => {
    if (tourPending && !showLoginScreen) {
      const timer = setTimeout(() => startTour(), 600)
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
          setOnboardingDone(true)
        }}
      />
    )
  }

  // Login screen gate — always shown until a user is selected
  if (showLoginScreen) {
    return <UserPicker />
  }

  const isSplitPage = SPLIT_PAGES.has(page)

  return (
    <div className="app">
      {/* User badge + account menu (top-right) */}
      <UserBadge theme={theme} onToggleTheme={toggleTheme} />

      {/* Site tour overlay */}
      <SiteTour />

      {/* Confetti overlay for celebrations */}
      <ConfettiEffect trigger={newlyUnlocked.length > 0 || celebration?.type === 'confetti'} />

      {/* Achievement toast */}
      <AchievementToast
        achievement={newAchievements.length > 0 ? newAchievements[0] : null}
        onDismiss={clearNewAchievements}
      />

      {isSplitPage ? (
        <main className="app-content-split">
          {page === 'skill-tree' ? <SkillTree /> : <Pathway />}
          <div className="skill-tree-main">
            {selectedSkillId ? <PracticeSession /> : <BanjoWatermark />}
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
          <div className="tool-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tool-modal-header">
              <button className="tool-modal-close" onClick={() => setOpenModal(null)}>✕</button>
            </div>
            <div className="tool-modal-body">
              {openModal === 'metronome' ? <Metronome /> : <Tuner />}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            data-tour={item.tour}
            className={`nav-btn ${
              MODAL_IDS.has(item.id)
                ? openModal === item.id ? 'nav-btn-active' : ''
                : page === item.id ? 'nav-btn-active' : ''
            }`}
            onClick={() => {
              if (MODAL_IDS.has(item.id)) {
                setOpenModal(openModal === item.id ? null : item.id as ToolModal)
              } else {
                setOpenModal(null)
                setPage(item.id as Page)
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
