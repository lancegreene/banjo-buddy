// ─── ModeTour — Quick Pick feature tour shown on first entry ─────────────────
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TourSlide {
  icon: string
  title: string
  description: string
}

const SLIDES: TourSlide[] = [
  { icon: '🎸', title: 'Chord Charts', description: 'Browse major, minor, and 7th chord shapes for banjo.' },
  { icon: '🔄', title: 'Roll Repo', description: 'All the classic Scruggs picking patterns with tab and playback.' },
  { icon: '🎵', title: 'Licks & Songs', description: 'Learn bluegrass licks and full song arrangements.' },
  { icon: '🎼', title: 'Scales & Theory', description: 'Explore scales, the Circle of Fifths, and key relationships.' },
  { icon: '⏱️', title: 'Warm Up', description: '5-minute guided roll practice to get your fingers moving.' },
]

interface ModeTourProps {
  onComplete: () => void
}

export function ModeTour({ onComplete }: ModeTourProps) {
  const [step, setStep] = useState(0)
  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]

  return (
    <div className="mode-tour-backdrop">
      <div className="mode-tour">
        <div className="mode-tour-header">
          <span className="mode-tour-mode">Quick Pick</span>
          <button className="mode-tour-skip" onClick={onComplete}>Skip</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="mode-tour-slide"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <span className="mode-tour-icon">{slide.icon}</span>
            <h2 className="mode-tour-title">{slide.title}</h2>
            <p className="mode-tour-desc">{slide.description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mode-tour-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`mode-tour-dot ${i === step ? 'mode-tour-dot-active' : ''}`} />
          ))}
        </div>

        <button
          className="mode-tour-next"
          onClick={() => isLast ? onComplete() : setStep(step + 1)}
        >
          {isLast ? "Let's Go!" : 'Next'}
        </button>
      </div>
    </div>
  )
}
