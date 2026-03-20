// ─── Splash / Welcome Screen ────────────────────────────────────────────────

import { useState, useCallback } from 'react'

interface SplashProps {
  onEnter: () => void
}

export function Splash({ onEnter }: SplashProps) {
  const [exiting, setExiting] = useState(false)

  const handleEnter = useCallback(() => {
    if (exiting) return
    setExiting(true)
    // Wait for exit animation to finish before navigating
    setTimeout(onEnter, 1200)
  }, [exiting, onEnter])

  return (
    <div className={`splash ${exiting ? 'splash-exiting' : ''}`}>
      <div className="splash-sky" />

      {/* Three mountain ridge layers — back to front */}
      <div className="splash-mountain splash-mountain-back" />
      <div className="splash-mountain splash-mountain-mid" />
      <div className="splash-mountain splash-mountain-front" />

      <div className="splash-content">
        <h1 className="splash-title">Banjo Buddy</h1>

        {/* 3D banjo illustration with depth, shadows, and specular highlights */}
        <svg className="splash-banjo-svg" viewBox="0 0 200 480" width="180" height="440" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Drumhead gradient — warm parchment with directional light */}
            <radialGradient id="splashDrumhead" cx="0.4" cy="0.35">
              <stop offset="0%" stopColor="#faf5ec" />
              <stop offset="40%" stopColor="#f0e8d8" />
              <stop offset="80%" stopColor="#ddd3c0" />
              <stop offset="100%" stopColor="#c8bca8" />
            </radialGradient>

            {/* Resonator wood — rich mahogany with 3D curvature */}
            <radialGradient id="splashResonator" cx="0.4" cy="0.38" r="0.65">
              <stop offset="0%" stopColor="#b87a4a" />
              <stop offset="35%" stopColor="#a06838" />
              <stop offset="65%" stopColor="#7a4f2f" />
              <stop offset="100%" stopColor="#4a2e18" />
            </radialGradient>

            {/* Chrome rim — multi-stop for realistic metal */}
            <linearGradient id="splashRimShine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a0a0a0" />
              <stop offset="20%" stopColor="#e8e8e8" />
              <stop offset="35%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#d0d0d0" />
              <stop offset="65%" stopColor="#f0f0f0" />
              <stop offset="80%" stopColor="#c0c0c0" />
              <stop offset="100%" stopColor="#909090" />
            </linearGradient>

            {/* Neck wood — dark rosewood with side lighting */}
            <linearGradient id="splashNeckWood" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3a2210" />
              <stop offset="25%" stopColor="#6e4a2c" />
              <stop offset="50%" stopColor="#7a5535" />
              <stop offset="75%" stopColor="#5c3a20" />
              <stop offset="100%" stopColor="#3a2210" />
            </linearGradient>

            {/* Fretboard — dark ebony */}
            <linearGradient id="splashEbony" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0d0a08" />
              <stop offset="40%" stopColor="#1a1410" />
              <stop offset="60%" stopColor="#1e1814" />
              <stop offset="100%" stopColor="#0d0a08" />
            </linearGradient>

            {/* Pearl inlay shimmer */}
            <radialGradient id="splashPearl" cx="0.35" cy="0.3">
              <stop offset="0%" stopColor="#f8f6f0" />
              <stop offset="40%" stopColor="#e8e4d8" />
              <stop offset="100%" stopColor="#c8c4b8" />
            </radialGradient>

            {/* Drop shadow for 3D depth */}
            <filter id="splashShadow">
              <feDropShadow dx="3" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
            </filter>

            {/* Subtle inner glow for drumhead */}
            <filter id="splashInnerGlow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset dx="0" dy="0" result="offsetBlur" />
              <feFlood floodColor="#fff" floodOpacity="0.15" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Specular highlight for chrome */}
            <linearGradient id="splashSpecular" x1="0.3" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Main group with drop shadow */}
          <g filter="url(#splashShadow)">
            {/* ─── Pot Assembly ─── */}
            {/* Back resonator shell — 3D curved wood */}
            <ellipse cx="100" cy="330" rx="75" ry="75" fill="url(#splashResonator)" />
            {/* Resonator edge shadow */}
            <ellipse cx="100" cy="330" rx="75" ry="75" fill="none" stroke="#3a1f0a" strokeWidth="1.5" />

            {/* Chrome flange ring — thick, shiny */}
            <ellipse cx="100" cy="330" rx="71" ry="71" fill="none" stroke="url(#splashRimShine)" strokeWidth="4" />
            {/* Specular line on flange */}
            <ellipse cx="100" cy="330" rx="71" ry="71" fill="none" stroke="url(#splashSpecular)" strokeWidth="1.5" opacity="0.7" />

            {/* Tension hooks */}
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2 - Math.PI / 2
              const x1 = 100 + Math.cos(a) * 67
              const y1 = 330 + Math.sin(a) * 67
              const x2 = 100 + Math.cos(a) * 74
              const y2 = 330 + Math.sin(a) * 74
              return (
                <g key={`hook-${i}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b0b0b0" strokeWidth="1.8" strokeLinecap="round" />
                  {/* Hex nut at end */}
                  <circle cx={x2} cy={y2} r="1.5" fill="#c8c8c8" />
                </g>
              )
            })}

            {/* Drum head */}
            <ellipse cx="100" cy="330" rx="62" ry="62" fill="url(#splashDrumhead)" filter="url(#splashInnerGlow)" />
            {/* Subtle grain texture lines on drumhead */}
            {[0.3, 0.5, 0.7].map((r, i) => (
              <ellipse key={i} cx="100" cy="330" rx={62 * r} ry={62 * r} fill="none" stroke="rgba(180,170,150,0.1)" strokeWidth="0.5" />
            ))}

            {/* Bridge — 3D wooden with shadow */}
            <rect x="82" y="360" width="36" height="6" rx="2" fill="#a08050" />
            <rect x="82" y="360" width="36" height="3" rx="1" fill="#b89060" opacity="0.6" />
            {/* Bridge feet */}
            <rect x="83" y="364" width="3" height="5" rx="0.5" fill="#8b6838" />
            <rect x="114" y="364" width="3" height="5" rx="0.5" fill="#8b6838" />
            {/* String notches on bridge */}
            {[88, 93, 97, 101, 105].map((x, i) => (
              <line key={i} x1={x} y1="360" x2={x} y2="362" stroke="#5a4020" strokeWidth="0.5" />
            ))}

            {/* Tailpiece — chrome */}
            <path d="M86 390 L100 404 L114 390" stroke="#c8c8c8" strokeWidth="2" fill="none" strokeLinecap="round" />
            <rect x="94" y="400" width="12" height="7" rx="2" fill="#b8b8b8" />
            <rect x="94" y="400" width="12" height="3" rx="1" fill="#d8d8d8" opacity="0.5" />

            {/* Armrest */}
            <path d="M38 350 Q26 330 34 305" stroke="url(#splashRimShine)" strokeWidth="3.5" fill="none" strokeLinecap="round" />

            {/* ─── Neck ─── */}
            {/* Neck body — dark rosewood with depth */}
            <rect x="86" y="38" width="28" height="290" rx="4" fill="url(#splashNeckWood)" />
            {/* Left edge highlight */}
            <line x1="86" y1="42" x2="86" y2="325" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Right edge shadow */}
            <line x1="114" y1="42" x2="114" y2="325" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />

            {/* Fretboard overlay — polished ebony */}
            <rect x="88" y="38" width="24" height="285" rx="2" fill="url(#splashEbony)" />

            {/* Fret wires — chrome with highlight */}
            {[0, 40, 72, 100, 124, 145, 163, 179, 193, 205, 215, 224, 232].map((y, i) => (
              <g key={`fret-${i}`}>
                <line x1="88" y1={46 + y} x2="112" y2={46 + y} stroke="#c8c8c8" strokeWidth={i === 0 ? 2.5 : 1.2} />
                {/* Fret top shine */}
                <line x1="88" y1={45.5 + y} x2="112" y2={45.5 + y} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              </g>
            ))}

            {/* Pearl inlays — ornate shapes */}
            {/* 3rd fret — diamond */}
            <path d="M100 80 L104 86 L100 92 L96 86 Z" fill="url(#splashPearl)" opacity="0.75" />
            {/* 5th fret — dot */}
            <circle cx="100" cy="115" r="3" fill="url(#splashPearl)" opacity="0.7" />
            {/* 7th fret — diamond */}
            <path d="M100 140 L103 145 L100 150 L97 145 Z" fill="url(#splashPearl)" opacity="0.7" />
            {/* 10th fret — double dot */}
            <circle cx="96" cy="200" r="2" fill="url(#splashPearl)" opacity="0.65" />
            <circle cx="104" cy="200" r="2" fill="url(#splashPearl)" opacity="0.65" />
            {/* 12th fret — large ornate */}
            <path d="M100 215 L104 220 L104 226 L100 230 L96 226 L96 220 Z" fill="url(#splashPearl)" opacity="0.7" />

            {/* ─── Strings ─── */}
            {[91, 96, 100, 104, 109].map((x, i) => (
              <line key={i} x1={x} y1="42" x2={x} y2="360"
                stroke={`rgba(255,255,255,${0.55 - i * 0.05})`}
                strokeWidth={1.6 - i * 0.15}
              />
            ))}
            {/* 5th string — starts at peg */}
            <line x1="82" y1="185" x2="91" y2="360" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
            {/* 5th string peg — red with shine */}
            <circle cx="80" cy="185" r="4" fill="#c0392b" stroke="#8e2b20" strokeWidth="1" />
            <circle cx="79" cy="183.5" r="1" fill="rgba(255,255,255,0.35)" />

            {/* ─── Peghead ─── */}
            {/* Peghead shape */}
            <path d="M83 38 L83 18 Q83 2 100 2 Q117 2 117 18 L117 38"
              fill="url(#splashNeckWood)" stroke="#2a1f14" strokeWidth="1.2" />
            {/* Peghead overlay — black with sheen */}
            <path d="M86 36 L86 20 Q86 6 100 6 Q114 6 114 20 L114 36"
              fill="#0f0d0a" />
            {/* Light reflection on peghead */}
            <path d="M92 10 L92 30" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />

            {/* Decorative peghead inlay */}
            <path d="M100 12 L104 19 L100 26 L96 19 Z" fill="url(#splashPearl)" opacity="0.6" />
            <circle cx="100" cy="19" r="1.5" fill="rgba(255,255,255,0.3)" />

            {/* Tuning pegs — with 3D depth */}
            {[
              { cx: 75, cy: 16 }, { cx: 75, cy: 32 },
              { cx: 125, cy: 16 }, { cx: 125, cy: 32 },
            ].map((p, i) => (
              <g key={`peg-${i}`}>
                {/* Peg shadow */}
                <circle cx={p.cx + 1} cy={p.cy + 1} r="5.5" fill="rgba(0,0,0,0.3)" />
                {/* Peg body */}
                <circle cx={p.cx} cy={p.cy} r="5.5" fill="#c0392b" stroke="#8e2b20" strokeWidth="1" />
                {/* Peg highlight */}
                <circle cx={p.cx - 1.5} cy={p.cy - 1.5} r="2" fill="rgba(255,255,255,0.25)" />
                {/* Shaft */}
                <line x1={p.cx < 100 ? p.cx + 5 : p.cx - 5} y1={p.cy}
                  x2={p.cx < 100 ? 86 : 114} y2={p.cy}
                  stroke="#888" strokeWidth="2" />
              </g>
            ))}

            {/* Brand text on peghead */}
            <text x="100" y="34" textAnchor="middle" fontSize="5" fontFamily="Georgia, serif" fill="rgba(200,190,170,0.4)">GOLD TONE</text>
          </g>
        </svg>

        <p className="splash-subtitle">Learn Scruggs-style picking, one roll at a time</p>
        <button className="splash-enter-btn" onClick={handleEnter}>
          Start Pickin' &rarr;
        </button>
      </div>
    </div>
  )
}
