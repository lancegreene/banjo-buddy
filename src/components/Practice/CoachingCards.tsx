// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coaching Cards
// Actionable tips shown in the session summary based on metric scores.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { PerformanceMetrics } from '../../types/performance'
import { generateCoachingCards } from '../../engine/coachingCards'

interface Props {
  metrics: PerformanceMetrics
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '!',
  warn: '~',
  good: '✓',
}

export function CoachingCards({ metrics }: Props) {
  const cards = useMemo(() => generateCoachingCards(metrics), [metrics])

  if (cards.length === 0) return null

  return (
    <div className="coaching-cards">
      <h4 className="coaching-cards-title">Coaching Tips</h4>
      {cards.map((card) => (
        <div key={card.metric} className={`coaching-card coaching-card-${card.severity}`}>
          <div className="coaching-card-header">
            <span className="coaching-card-icon">{SEVERITY_ICON[card.severity]}</span>
            <span className="coaching-card-metric">{card.title}</span>
            <span className="coaching-card-score">{card.score}</span>
          </div>
          <p className="coaching-card-tip">{card.tip}</p>
        </div>
      ))}
    </div>
  )
}
