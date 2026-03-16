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

        {/* Banjo silhouette */}
        <svg className="splash-banjo-svg" viewBox="0 0 80 200" width="80" height="200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="40" cy="145" rx="34" ry="34" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
          <circle cx="40" cy="145" r="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x="37" y="20" width="6" height="125" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <rect x="32" y="14" width="16" height="10" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          {/* Tuning pegs */}
          <circle cx="30" cy="18" r="2.5" fill="rgba(255,255,255,0.6)" />
          <circle cx="50" cy="18" r="2.5" fill="rgba(255,255,255,0.6)" />
          <circle cx="30" cy="26" r="2" fill="rgba(255,255,255,0.5)" />
          <circle cx="50" cy="26" r="2" fill="rgba(255,255,255,0.5)" />
          {/* 5th string peg */}
          <circle cx="28" cy="70" r="2" fill="rgba(255,255,255,0.5)" />
          {/* Strings */}
          <line x1="36" y1="24" x2="36" y2="175" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          <line x1="38.5" y1="24" x2="38.5" y2="175" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          <line x1="41" y1="24" x2="41" y2="175" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          <line x1="43.5" y1="24" x2="43.5" y2="175" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          <line x1="30" y1="70" x2="36" y2="175" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
          {/* Bridge */}
          <rect x="33" y="160" width="14" height="2" rx="1" fill="rgba(255,255,255,0.5)" />
        </svg>

        <p className="splash-subtitle">Learn Scruggs-style picking, one roll at a time</p>
        <button className="splash-enter-btn" onClick={onEnter}>
          Start Pickin' &rarr;
        </button>
      </div>
    </div>
  )
}
