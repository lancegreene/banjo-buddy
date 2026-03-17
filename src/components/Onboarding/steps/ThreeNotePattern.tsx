import { useState, useEffect, useRef } from 'react'
import { useNoteCapture } from '../../../hooks/useNoteCapture'

const TARGET_NOTES = [
  { note: 'G', octave: 4, string: 5, label: 'G (5th)' },
  { note: 'B', octave: 3, string: 2, label: 'B (2nd)' },
  { note: 'D', octave: 4, string: 1, label: 'D (1st)' },
]

interface Props {
  onComplete: () => void
}

export function ThreeNotePattern({ onComplete }: Props) {
  const { notes, isListening, startListening } = useNoteCapture()
  const [matched, setMatched] = useState<boolean[]>([false, false, false])
  const currentTargetRef = useRef(0)
  const completedRef = useRef(false)

  useEffect(() => {
    startListening()
  }, [startListening])

  useEffect(() => {
    if (completedRef.current || notes.length === 0) return

    const latest = notes[notes.length - 1]
    const targetIdx = currentTargetRef.current
    if (targetIdx >= TARGET_NOTES.length) return

    const target = TARGET_NOTES[targetIdx]
    if (latest.note === target.note && Math.abs(latest.octave - target.octave) <= 0) {
      setMatched(prev => {
        const next = [...prev]
        next[targetIdx] = true
        return next
      })
      currentTargetRef.current = targetIdx + 1

      if (targetIdx === TARGET_NOTES.length - 1) {
        completedRef.current = true
        setTimeout(onComplete, 800)
      }
    }
  }, [notes, onComplete])

  return (
    <div className="onboarding-pattern">
      <h2 className="onboarding-title">Play a Mini Pattern</h2>
      <p className="onboarding-desc">Play these three notes in order — take your time!</p>

      <div className="onboarding-note-sequence">
        {TARGET_NOTES.map((t, i) => (
          <div
            key={i}
            className={`onboarding-seq-note ${matched[i] ? 'onboarding-seq-hit' : ''} ${currentTargetRef.current === i ? 'onboarding-seq-current' : ''}`}
          >
            <span className="onboarding-seq-name">{t.label}</span>
            {matched[i] && <span className="onboarding-seq-check">&#10003;</span>}
          </div>
        ))}
      </div>

      {isListening && !completedRef.current && (
        <p className="onboarding-listening">Listening...</p>
      )}
    </div>
  )
}
