// ─── IntroFlow — Animated introduction for new users ────────────────────────
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { PATHS, type Path } from '../../data/curriculum'

interface Props {
  onComplete: () => void
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="intro-step intro-step-welcome">
      <div className="intro-banjo-scene">
        {/* Animated banjo with vibrating strings */}
        <svg className="intro-banjo-svg" viewBox="0 0 160 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <circle cx="80" cy="80" r="65" stroke="var(--accent, #D4A04A)" strokeWidth="2.5" opacity="0.9" />
          <circle cx="80" cy="80" r="58" stroke="var(--accent, #D4A04A)" strokeWidth="1" opacity="0.5" />
          {/* Sound hole */}
          <circle cx="80" cy="80" r="12" stroke="var(--accent, #D4A04A)" strokeWidth="1" opacity="0.4" />
          {/* Bridge */}
          <rect x="60" y="100" width="40" height="4" rx="2" fill="var(--accent, #D4A04A)" opacity="0.6" />
          {/* Neck */}
          <rect x="70" y="145" width="20" height="200" rx="3" stroke="var(--accent, #D4A04A)" strokeWidth="2" opacity="0.7" />
          {/* Frets */}
          {[0, 32, 58, 80, 98, 114].map((y, i) => (
            <line key={i} x1="70" y1={155 + y} x2="90" y2={155 + y} stroke="var(--accent, #D4A04A)" strokeWidth="1" opacity="0.4" />
          ))}
          {/* 5th string peg */}
          <circle cx="65" cy="200" r="3" stroke="var(--accent, #D4A04A)" strokeWidth="1" opacity="0.5" />
          {/* Peghead */}
          <path d="M68 345 L68 380 Q68 390 80 390 Q92 390 92 380 L92 345" stroke="var(--accent, #D4A04A)" strokeWidth="2" fill="none" opacity="0.7" />
          {/* Strings - animated vibration */}
          {[72, 76, 80, 84, 88].map((x, i) => (
            <line key={i} x1={x} y1="20" x2={x} y2="140" stroke="var(--accent, #D4A04A)" strokeWidth="0.8" opacity="0.5" className={`intro-string intro-string-${i + 1}`} />
          ))}
        </svg>
        {/* Floating notes */}
        <div className="intro-floating-notes">
          <span className="intro-note intro-note-1">&#9833;</span>
          <span className="intro-note intro-note-2">&#9834;</span>
          <span className="intro-note intro-note-3">&#9835;</span>
        </div>
      </div>

      <h1 className="intro-title">Banjo Buddy</h1>
      <p className="intro-subtitle">Your personal Scruggs-style picking coach</p>

      <button className="intro-btn intro-btn-primary" onClick={onNext}>
        Get Started
      </button>
    </div>
  )
}

// ─── Step 2: How It Works ─────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    icon: (
      <svg viewBox="0 0 48 48" className="intro-icon-svg">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
        <polygon points="20,16 20,32 34,24" fill="currentColor" />
      </svg>
    ),
    label: 'Listen',
    desc: 'Hear each pattern played correctly',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="intro-icon-svg">
        <rect x="18" y="8" width="12" height="32" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="24" cy="30" r="4" fill="currentColor" />
        <path d="M12 24 C12 14 36 14 36 24" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M8 24 C8 10 40 10 40 24" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      </svg>
    ),
    label: 'Practice',
    desc: 'Play along with real-time audio detection',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="intro-icon-svg">
        <polyline points="8,36 16,28 24,32 32,18 40,12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
    label: 'Improve',
    desc: 'Track your speed, accuracy, and streaks',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="intro-icon-svg">
        <path d="M24 6 L28 18 L42 18 L31 26 L35 38 L24 30 L13 38 L17 26 L6 18 L20 18 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    ),
    label: 'Level Up',
    desc: 'Unlock new skills as you progress',
  },
]

function StepHowItWorks({ onNext }: { onNext: () => void }) {
  return (
    <div className="intro-step intro-step-how">
      <h2 className="intro-heading">How It Works</h2>

      <div className="intro-how-grid">
        {HOW_IT_WORKS.map((item, i) => (
          <motion.div
            key={item.label}
            className="intro-how-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
          >
            <div className="intro-how-icon">{item.icon}</div>
            <h3 className="intro-how-label">{item.label}</h3>
            <p className="intro-how-desc">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <button className="intro-btn intro-btn-primary" onClick={onNext}>Next</button>
    </div>
  )
}

// ─── Step 3: String Layout ────────────────────────────────────────────────────

const STRINGS = [
  { num: 1, note: 'D4', finger: 'Middle', color: '#D4A04A' },
  { num: 2, note: 'B3', finger: 'Index', color: '#4ADE80' },
  { num: 3, note: 'G3', finger: 'Thumb', color: '#4A9EFF' },
  { num: 4, note: 'D3', finger: 'Thumb', color: '#C084FC' },
  { num: 5, note: 'G4', finger: 'Thumb', color: '#F5A623' },
]

function StepStrings({ onNext }: { onNext: () => void }) {
  return (
    <div className="intro-step intro-step-strings">
      <h2 className="intro-heading">The 5-String Banjo</h2>
      <p className="intro-subheading">Open G tuning — the standard for Scruggs style</p>

      <div className="intro-strings-diagram">
        {STRINGS.map((s, i) => (
          <motion.div
            key={s.num}
            className="intro-string-row"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.35 }}
          >
            <span className="intro-string-num" style={{ background: s.color }}>{s.num}</span>
            <div className="intro-string-line" style={{ borderColor: s.color }}>
              <span className="intro-string-note">{s.note}</span>
            </div>
            <span className="intro-string-finger">{s.finger}</span>
          </motion.div>
        ))}
        {/* 5th string callout */}
        <motion.div
          className="intro-string5-callout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          String 5 is the short drone string — it starts at the 5th fret
        </motion.div>
      </div>

      <button className="intro-btn intro-btn-primary" onClick={onNext}>Next</button>
    </div>
  )
}

// ─── Step 4: T-I-M Picking ────────────────────────────────────────────────────

function StepPicking({ onNext }: { onNext: () => void }) {
  return (
    <div className="intro-step intro-step-picking">
      <h2 className="intro-heading">T-I-M Picking</h2>
      <p className="intro-subheading">Three fingers, infinite rolls</p>

      <div className="intro-tim-diagram">
        <motion.div
          className="intro-tim-finger"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="intro-tim-circle intro-tim-thumb">T</div>
          <span className="intro-tim-label">Thumb</span>
          <span className="intro-tim-desc">Picks down on strings 3, 4, 5</span>
        </motion.div>

        <motion.div
          className="intro-tim-finger"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="intro-tim-circle intro-tim-index">I</div>
          <span className="intro-tim-label">Index</span>
          <span className="intro-tim-desc">Picks up on string 2</span>
        </motion.div>

        <motion.div
          className="intro-tim-finger"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="intro-tim-circle intro-tim-middle">M</div>
          <span className="intro-tim-label">Middle</span>
          <span className="intro-tim-desc">Picks up on string 1</span>
        </motion.div>
      </div>

      <motion.div
        className="intro-roll-preview"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <span className="intro-roll-title">Forward Roll</span>
        <div className="intro-roll-sequence">
          {['T', 'I', 'M', 'T', 'T', 'M', 'T', 'M'].map((f, i) => (
            <motion.span
              key={i}
              className={`intro-roll-note intro-roll-note-${f.toLowerCase()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 + i * 0.1, duration: 0.2 }}
            >
              {f}
            </motion.span>
          ))}
        </div>
        <span className="intro-roll-pattern">3 - 2 - 1 - 5 - 3 - 1 - 5 - 1</span>
      </motion.div>

      <button className="intro-btn intro-btn-primary" onClick={onNext}>Next</button>
    </div>
  )
}

// ─── Step 5: Pick Your Path ───────────────────────────────────────────────────

function StepPath({ onComplete }: { onComplete: () => void }) {
  const setUserPath = useStore((s) => s.setUserPath)
  const [selected, setSelected] = useState<Path>('newby')

  function handleGo() {
    setUserPath(selected)
    onComplete()
  }

  return (
    <div className="intro-step intro-step-path">
      <h2 className="intro-heading">Pick Your Path</h2>
      <p className="intro-subheading">You can change this anytime in Settings</p>

      <div className="intro-path-cards">
        {PATHS.map((p, i) => (
          <motion.button
            key={p.id}
            className={`intro-path-card ${selected === p.id ? 'intro-path-card-selected' : ''}`}
            onClick={() => setSelected(p.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.35 }}
          >
            <span className="intro-path-label">{p.label}</span>
            <span className="intro-path-desc">{p.description}</span>
          </motion.button>
        ))}
      </div>

      <button className="intro-btn intro-btn-primary" onClick={handleGo}>
        Let's Go!
      </button>
    </div>
  )
}

// ─── Step 6: Tour Prompt ─────────────────────────────────────────────────────

function StepTourPrompt({ onComplete }: { onComplete: () => void }) {
  function handleTakeTour() {
    localStorage.setItem('banjo-buddy-tour-pending', 'true')
    onComplete()
  }

  return (
    <div className="intro-step intro-step-tour">
      <motion.div
        className="intro-tour-icon"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        <svg viewBox="0 0 64 64" className="intro-icon-svg" style={{ width: 80, height: 80 }}>
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <text x="32" y="40" textAnchor="middle" fontSize="28" fill="currentColor" fontWeight="bold">?</text>
        </svg>
      </motion.div>

      <h2 className="intro-heading">Want a Quick Tour?</h2>
      <p className="intro-subheading">
        We can show you around the app — where to find your practice sessions, skills, progress tracking, and more.
      </p>

      <div className="intro-tour-actions">
        <button className="intro-btn intro-btn-primary" onClick={handleTakeTour}>
          Show Me Around
        </button>
        <button className="intro-btn intro-btn-secondary" onClick={onComplete}>
          I'll Explore on My Own
        </button>
      </div>
    </div>
  )
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

const STEPS = ['welcome', 'how', 'strings', 'picking', 'path', 'tour'] as const
type Step = typeof STEPS[number]

export function IntroFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome')

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1])
    }
  }

  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="intro-flow">
      {/* Progress dots */}
      {step !== 'welcome' && (
        <div className="intro-progress">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`intro-progress-dot ${stepIdx >= i ? 'intro-progress-dot-active' : ''}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.3 }}
          className="intro-step-container"
        >
          {step === 'welcome' && <StepWelcome onNext={next} />}
          {step === 'how' && <StepHowItWorks onNext={next} />}
          {step === 'strings' && <StepStrings onNext={next} />}
          {step === 'picking' && <StepPicking onNext={next} />}
          {step === 'path' && <StepPath onComplete={next} />}
          {step === 'tour' && <StepTourPrompt onComplete={onComplete} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
