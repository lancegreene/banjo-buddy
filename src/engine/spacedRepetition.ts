// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Spaced Repetition (Simplified 3-Bucket)
// For maintenance-phase skills: review in 1 / 3 / 7 days based on performance.
// Full SM-2 is overkill for 141 BPM-gated skills.
// ─────────────────────────────────────────────────────────────────────────────

import type { SelfRating } from '../db/db'

export interface SrSchedule {
  interval: number       // days: 1, 3, or 7
  nextReview: string     // ISO date string (YYYY-MM-DD)
}

export function computeSrSchedule(
  selfRating: SelfRating,
  compositeScore: number | null,
  currentInterval: number | null
): SrSchedule {
  const now = new Date()

  // Determine performance quality
  let quality: 'good' | 'ok' | 'poor'
  if (selfRating === 'felt_good' && (compositeScore === null || compositeScore >= 80)) {
    quality = 'good'
  } else if (selfRating === 'needs_work' || (compositeScore !== null && compositeScore < 60)) {
    quality = 'poor'
  } else {
    quality = 'ok'
  }

  // Determine next interval
  let nextInterval: number
  const prev = currentInterval ?? 0

  if (quality === 'good') {
    // Promote: 0→1, 1→3, 3→7, 7→7
    if (prev < 1) nextInterval = 1
    else if (prev < 3) nextInterval = 3
    else nextInterval = 7
  } else if (quality === 'ok') {
    // Hold current interval, minimum 1
    nextInterval = Math.max(1, prev)
  } else {
    // Demote back to 1
    nextInterval = 1
  }

  const reviewDate = new Date(now)
  reviewDate.setDate(reviewDate.getDate() + nextInterval)
  const nextReview = reviewDate.toISOString().slice(0, 10)

  return { interval: nextInterval, nextReview }
}

export function isDueForReview(srNextReview: string | null): boolean {
  if (!srNextReview) return false
  const today = new Date().toISOString().slice(0, 10)
  return srNextReview <= today
}

export function daysTilReview(srNextReview: string | null): number | null {
  if (!srNextReview) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const review = new Date(srNextReview + 'T00:00:00')
  return Math.ceil((review.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
