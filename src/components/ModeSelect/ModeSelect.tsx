// src/components/ModeSelect/ModeSelect.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Mode Select
// Quick Pick / Deep Dive choice screen shown on first visit.
// ─────────────────────────────────────────────────────────────────────────────

import { useStore } from '../../store/useStore'

export function ModeSelect() {
  const setAppMode = useStore((s) => s.setAppMode)

  return (
    <div className="mode-select">
      <h1 className="mode-select-title">How do you want to play?</h1>
      <div className="mode-select-cards">
        <button className="mode-card mode-card-quick" onClick={() => setAppMode('quick-pick')}>
          <span className="mode-card-icon">&#9835;</span>
          <span className="mode-card-name">Quick Pick</span>
          <span className="mode-card-desc">Browse rolls, licks, and songs. Play along at your own pace.</span>
        </button>
        <button className="mode-card mode-card-deep" onClick={() => setAppMode('deep-dive')}>
          <span className="mode-card-icon">&#9776;</span>
          <span className="mode-card-name">Deep Dive</span>
          <span className="mode-card-desc">Follow the full curriculum with guided practice and progress tracking.</span>
        </button>
      </div>
    </div>
  )
}
