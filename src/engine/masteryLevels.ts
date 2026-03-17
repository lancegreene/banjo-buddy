// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — 5-Level Mastery System with Decay
// Introduced → Developing → Competent → Mastered → Fluent
// Score = weighted composite of 5 metrics
// Decay: if overdue per FSRS, effective mastery drops one level (visual only)
// ─────────────────────────────────────────────────────────────────────────────

import type { MasteryLevel } from '../db/db'
import type { PerformanceMetrics } from '../types/performance'

export const MASTERY_LEVELS: MasteryLevel[] = ['introduced', 'developing', 'competent', 'mastered', 'fluent']

export const MASTERY_THRESHOLDS: Record<MasteryLevel, number> = {
  introduced: 0,
  developing: 30,
  competent: 55,
  mastered: 75,
  fluent: 90,
}

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  introduced: '#585450',
  developing: '#4A9EFF',
  competent: '#F5A623',
  mastered: '#4ADE80',
  fluent: '#C084FC',
}

export function computeMasteryLevel(metrics: PerformanceMetrics): MasteryLevel {
  const score = metrics.composite
  if (score >= MASTERY_THRESHOLDS.fluent) return 'fluent'
  if (score >= MASTERY_THRESHOLDS.mastered) return 'mastered'
  if (score >= MASTERY_THRESHOLDS.competent) return 'competent'
  if (score >= MASTERY_THRESHOLDS.developing) return 'developing'
  return 'introduced'
}

export function getEffectiveMastery(
  storedLevel: MasteryLevel | null,
  isOverdue: boolean
): MasteryLevel {
  if (!storedLevel) return 'introduced'
  if (!isOverdue) return storedLevel

  // Decay: drop one level visually
  const idx = MASTERY_LEVELS.indexOf(storedLevel)
  return idx > 0 ? MASTERY_LEVELS[idx - 1] : storedLevel
}

export function masteryLevelToLabel(level: MasteryLevel): string {
  switch (level) {
    case 'introduced': return 'Introduced'
    case 'developing': return 'Developing'
    case 'competent': return 'Competent'
    case 'mastered': return 'Mastered'
    case 'fluent': return 'Fluent'
  }
}
