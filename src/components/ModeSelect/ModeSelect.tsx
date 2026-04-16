// src/components/ModeSelect/ModeSelect.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Mode Select
// Tour-style flow explaining Quick Pick vs Deep Dive, then choice.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onSelect: (mode: 'quick-pick' | 'deep-dive') => void
}

interface Slide {
  title: string
  description: string
  icon: string
  accent?: string
}

const SLIDES: Slide[] = [
  {
    icon: '🪕',
    title: 'Two Ways to Learn',
    description: 'Banjo Buddy has two modes designed for different styles of practice. Let us show you what each one offers.',
  },
  {
    icon: '⚡',
    title: 'Quick Pick',
    description: 'Browse chord charts, roll patterns, licks, scales, and songs. Play along at your own pace — no curriculum, no tracking. Just pick and play.',
    accent: '#E8A838',
  },
  {
    icon: '🗺️',
    title: 'Deep Dive',
    description: 'Follow a structured curriculum with real-time note detection, progress tracking, skill trees, and achievements. Your full practice coach.',
    accent: '#4A9EFF',
  },
]

export function ModeSelect({ onSelect }: Props) {
  const [step, setStep] = useState(0)
  const showChoice = step >= SLIDES.length

  return (
    <div className="mode-select">
      <AnimatePresence mode="wait">
        {!showChoice ? (
          <motion.div
            key={step}
            className="mode-tour-slide"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <span className="mode-tour-icon">{SLIDES[step].icon}</span>
            <h2 className="mode-tour-title" style={SLIDES[step].accent ? { color: SLIDES[step].accent } : undefined}>
              {SLIDES[step].title}
            </h2>
            <p className="mode-tour-desc">{SLIDES[step].description}</p>
          </motion.div>
        ) : (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="mode-select-title">How do you want to play?</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {!showChoice ? (
        <div className="mode-tour-controls">
          <div className="mode-tour-dots">
            {SLIDES.map((_, i) => (
              <span key={i} className={`mode-tour-dot ${i === step ? 'mode-tour-dot-active' : ''}`} />
            ))}
          </div>
          <div className="mode-tour-btns">
            <button className="mode-tour-skip" onClick={() => setStep(SLIDES.length)}>Skip</button>
            <button className="mode-tour-next" onClick={() => setStep(step + 1)}>
              {step === SLIDES.length - 1 ? 'Choose Your Mode' : 'Next'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mode-select-cards">
          <button className="mode-card mode-card-quick" onClick={() => onSelect('quick-pick')}>
            <span className="mode-card-icon">&#9835;</span>
            <span className="mode-card-name">Quick Pick</span>
            <span className="mode-card-desc">Browse rolls, licks, and songs. Play along at your own pace.</span>
          </button>
          <button className="mode-card mode-card-deep" onClick={() => onSelect('deep-dive')}>
            <span className="mode-card-icon">&#9776;</span>
            <span className="mode-card-name">Deep Dive</span>
            <span className="mode-card-desc">Follow the full curriculum with guided practice and progress tracking.</span>
          </button>
        </div>
      )}
    </div>
  )
}
