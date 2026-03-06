// ─── Splash / Welcome Screen ────────────────────────────────────────────────

interface SplashProps {
  onEnter: () => void
}

export function Splash({ onEnter }: SplashProps) {
  return (
    <div className="splash">
      <div className="splash-sky" />

      {/* Three mountain ridge layers — back to front */}
      <div className="splash-mountain splash-mountain-back" />
      <div className="splash-mountain splash-mountain-mid" />
      <div className="splash-mountain splash-mountain-front" />

      <div className="splash-content">
        <h1 className="splash-title">Welcome to Banjo Workshop</h1>
        <p className="splash-subtitle">Learn Scruggs-style picking, one roll at a time</p>
        <button className="splash-enter-btn" onClick={onEnter}>
          Start Pickin' &rarr;
        </button>
      </div>
    </div>
  )
}
