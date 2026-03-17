import { useMemo } from 'react'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'

interface Props {
  evaluations: NoteEvaluation[]
  maxVisible?: number
}

export function RealtimeFeedback({ evaluations, maxVisible = 16 }: Props) {
  const recent = useMemo(
    () => evaluations.slice(-maxVisible),
    [evaluations, maxVisible]
  )

  if (recent.length === 0) return null

  return (
    <div className="realtime-feedback">
      <div className="feedback-dots">
        {recent.map((ev, i) => (
          <span
            key={i}
            className={`feedback-dot ${ev.isHit ? 'feedback-dot-hit' : 'feedback-dot-miss'}`}
            title={`String ${ev.expectedString ?? '?'} → ${ev.playedString ?? '?'}${ev.timingErrorMs !== null ? ` (${ev.timingErrorMs > 0 ? '+' : ''}${ev.timingErrorMs}ms)` : ''}`}
          />
        ))}
      </div>
      <div className="feedback-stats">
        <span className="feedback-stat">
          {recent.filter(e => e.isHit).length}/{recent.length} hits
        </span>
      </div>
    </div>
  )
}
