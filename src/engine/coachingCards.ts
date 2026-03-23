// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coaching Cards Engine
// Generates actionable coaching tips based on per-metric scores.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { PerformanceMetrics } from '../types/performance'

export type Severity = 'good' | 'warn' | 'critical'

export interface CoachingCard {
  metric: string
  score: number
  severity: Severity
  title: string
  tip: string
}

interface MetricRule {
  key: keyof Omit<PerformanceMetrics, 'composite'>
  label: string
  criticalTip: string
  warnTip: string
}

const RULES: MetricRule[] = [
  {
    key: 'timing',
    label: 'Timing',
    criticalTip: 'Your picking is rushing or dragging. Slow down 10-15 BPM and count "1-and-2-and" out loud while playing.',
    warnTip: 'Timing is close but not locked in. Try tapping your foot on the beat and focusing on the "and" counts.',
  },
  {
    key: 'noteAccuracy',
    label: 'Note Accuracy',
    criticalTip: 'Too many wrong strings are being hit. Anchor your picking hand on the head and practice the pattern slowly, watching your fingers.',
    warnTip: 'A few stray notes are slipping through. Focus on right-hand finger placement — each finger owns its string.',
  },
  {
    key: 'rollEvenness',
    label: 'Roll Evenness',
    criticalTip: 'Notes are bunching up or spacing out unevenly. Play the pattern at half speed with a metronome, aiming for perfectly even spacing.',
    warnTip: 'Spacing is mostly even but has small gaps. Try practicing with the metronome set to eighth notes to lock in the subdivision.',
  },
  {
    key: 'dynamics',
    label: 'Dynamics',
    criticalTip: 'Volume varies too much between fingers. Practice rest strokes to build equal strength across thumb, index, and middle.',
    warnTip: 'Some notes are louder than others. Check if your picks are the same gauge and your hand position is consistent.',
  },
  {
    key: 'tempoStability',
    label: 'Tempo Stability',
    criticalTip: 'Your speed drifts during the pattern. Start slower than you think you need to — speed up only when the current BPM feels effortless.',
    warnTip: 'Slight tempo drift detected. Try recording yourself and listening back — it helps internalize a steady pulse.',
  },
]

export function generateCoachingCards(
  metrics: PerformanceMetrics,
): CoachingCard[] {
  const cards: CoachingCard[] = []

  for (const rule of RULES) {
    const score = metrics[rule.key]

    if (score < 60) {
      cards.push({
        metric: rule.label,
        score,
        severity: 'critical',
        title: `${rule.label} needs attention`,
        tip: rule.criticalTip,
      })
    } else if (score < 80) {
      cards.push({
        metric: rule.label,
        score,
        severity: 'warn',
        title: `${rule.label} could improve`,
        tip: rule.warnTip,
      })
    }
  }

  // Sort critical first, then warn; max 3 cards
  cards.sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, warn: 1, good: 2 }
    return order[a.severity] - order[b.severity]
  })

  return cards.slice(0, 3)
}
