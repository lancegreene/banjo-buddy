import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MicDetection } from './steps/MicDetection'
import { PlayOneNote } from './steps/PlayOneNote'
import { ThreeNotePattern } from './steps/ThreeNotePattern'
import { OnboardingSuccess } from './steps/OnboardingSuccess'

const STEPS = ['mic', 'one-note', 'three-note', 'success'] as const
type Step = typeof STEPS[number]

interface Props {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('mic')

  const advance = useCallback(() => {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1])
    }
  }, [step])

  const stepVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  }

  return (
    <div className="onboarding">
      <div className="onboarding-progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`onboarding-progress-dot ${STEPS.indexOf(step) >= i ? 'onboarding-progress-dot-active' : ''}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="onboarding-step"
        >
          {step === 'mic' && <MicDetection onComplete={advance} />}
          {step === 'one-note' && <PlayOneNote onComplete={advance} />}
          {step === 'three-note' && <ThreeNotePattern onComplete={advance} />}
          {step === 'success' && <OnboardingSuccess onComplete={onComplete} />}
        </motion.div>
      </AnimatePresence>

      {step !== 'success' && (
        <button className="onboarding-skip" onClick={onComplete}>
          Skip Setup →
        </button>
      )}
    </div>
  )
}
