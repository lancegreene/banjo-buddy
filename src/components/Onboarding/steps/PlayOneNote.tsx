import { useState, useEffect, useRef } from 'react'
import { useNoteCapture } from '../../../hooks/useNoteCapture'

interface Props {
  onComplete: () => void
}

export function PlayOneNote({ onComplete }: Props) {
  const { notes, isListening, startListening } = useNoteCapture()
  const [detected, setDetected] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    startListening()
  }, [startListening])

  useEffect(() => {
    if (completedRef.current) return
    // Look for a G4 (string 5) — open G tuning
    const g4 = notes.find(n =>
      n.note === 'G' && n.octave === 4 && n.clarity > 0.5
    )
    if (g4) {
      setDetected(true)
      completedRef.current = true
      setTimeout(onComplete, 800)
    }
  }, [notes, onComplete])

  return (
    <div className="onboarding-note">
      <h2 className="onboarding-title">Play Your First Note</h2>
      <p className="onboarding-desc">
        Pluck the 5th string (short string, closest to you). It should ring as an open G.
      </p>

      <div className={`onboarding-target-note ${detected ? 'onboarding-target-hit' : ''}`}>
        <span className="onboarding-note-name">G4</span>
        <span className="onboarding-note-string">5th String</span>
      </div>

      {detected && (
        <p className="onboarding-success-text">Got it!</p>
      )}

      {isListening && !detected && (
        <p className="onboarding-listening">Listening...</p>
      )}
    </div>
  )
}
