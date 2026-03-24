// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Top Navigation Bar + Mobile Bottom Tabs
// Desktop: full horizontal bar. Mobile: top bar (logo+tools) + bottom tabs.
// ─────────────────────────────────────────────────────────────────────────────

import { useStore, type Page, type ToolModal } from '../../store/useStore'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'pathway',      label: 'Pathway',  icon: '◈' },
  { id: 'skill-tree',   label: 'Skills',   icon: '♦' },
  { id: 'progress',     label: 'Progress', icon: '▤' },
  { id: 'achievements', label: 'Awards',   icon: '★' },
  { id: 'settings',     label: 'Settings', icon: '⚙' },
]

const TOOL_ITEMS: { id: ToolModal; label: string; icon: string }[] = [
  { id: 'metronome', label: 'Metronome', icon: '♩' },
  { id: 'tuner',     label: 'Tuner',     icon: '◎' },
  { id: 'fretlab',   label: 'Fret Lab',  icon: '⩩' },
]

function BanjoHomeIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="top-nav-banjo-svg">
      <circle cx="18" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="12" r="7.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <rect x="14" y="15" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.6" />
      <rect x="16" y="22" width="4" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="5" x2="17" y2="22" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
      <line x1="18" y1="4" x2="18" y2="22" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
      <line x1="19" y1="5" x2="19" y2="22" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
      <circle cx="13" cy="18" r="1.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <circle cx="18" cy="26" r="1" fill="currentColor" opacity="0.35" />
      <circle cx="18" cy="30" r="1" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

export function TopNavBar() {
  const page = useStore((s) => s.currentPage)
  const setPage = useStore((s) => s.setPage)
  const goHome = useStore((s) => s.goHome)
  const openModal = useStore((s) => s.openModal)
  const setOpenModal = useStore((s) => s.setOpenModal)

  return (
    <>
      {/* ── Top bar (always visible) ── */}
      <nav className="top-nav">
        <button className="top-nav-home" onClick={goHome} title="Home">
          <BanjoHomeIcon />
          <span className="top-nav-brand">Banjo Buddy</span>
        </button>

        {/* Desktop-only inline nav items */}
        <div className="top-nav-items">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`top-nav-item ${page === item.id ? 'top-nav-item-active' : ''}`}
              onClick={() => { setOpenModal(null); setPage(item.id) }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="top-nav-tools">
          {TOOL_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`top-nav-tool ${openModal === item.id ? 'top-nav-tool-active' : ''}`}
              onClick={() => setOpenModal(openModal === item.id ? null : item.id)}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="bottom-tabs">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`bottom-tab ${page === item.id ? 'bottom-tab-active' : ''}`}
            onClick={() => { setOpenModal(null); setPage(item.id) }}
          >
            <span className="bottom-tab-icon">{item.icon}</span>
            <span className="bottom-tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
