import { useEffect } from 'react'
import './App.css'
import { useStore, type Page } from './store/useStore'
import { Dashboard } from './components/Dashboard/Dashboard'
import { PracticeSession } from './components/Practice/PracticeSession'
import { SkillTree } from './components/SkillTree/SkillTree'
import { Metronome } from './components/Metronome/Metronome'
import { Tuner } from './components/Tuner/Tuner'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '⌂' },
  { id: 'skill-tree', label: 'Skills', icon: '◈' },
  { id: 'metronome', label: 'Metronome', icon: '♩' },
  { id: 'tuner', label: 'Tuner', icon: '◎' },
]

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'dashboard':    return <Dashboard />
    case 'practice':     return <PracticeSession />
    case 'skill-tree':   return <SkillTree />
    case 'metronome':    return <Metronome />
    case 'tuner':        return <Tuner />
    default:             return <Dashboard />
  }
}

export default function App() {
  const page = useStore((s) => s.currentPage)
  const setPage = useStore((s) => s.setPage)
  const loadUser = useStore((s) => s.loadUser)
  const isLoading = useStore((s) => s.isLoading)

  useEffect(() => {
    loadUser()
  }, [])

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
      <main className="app-content">
        <PageContent page={page} />
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? 'nav-btn-active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
