// Uses ts-fsrs library for FSRS-5 algorithm
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type RecordLog } from 'ts-fsrs'

// Re-export Rating for consumers
export { Rating } from 'ts-fsrs'

export interface FsrsState {
  card: Card
  log: RecordLog | null
}

const f = fsrs(generatorParameters({ enable_fuzz: true }))

export function createNewFsrsState(): FsrsState {
  return { card: createEmptyCard(), log: null }
}

export function scheduleReview(state: FsrsState, rating: Rating): FsrsState {
  const result = f.repeat(state.card, new Date())
  const scheduled = result[rating]
  return { card: scheduled.card, log: scheduled.log as RecordLog }
}

export function getNextReviewDate(state: FsrsState): string {
  return state.card.due.toISOString().slice(0, 10)
}

export function isDueForReview(state: FsrsState): boolean {
  return new Date() >= state.card.due
}

export function getOverdueDays(state: FsrsState): number {
  const now = new Date()
  const due = state.card.due
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

// Convert legacy 3-bucket (1/3/7 day intervals) to FSRS state
export function convertLegacyBucket(
  srInterval: number | null,
  srNextReview: string | null
): FsrsState {
  const card = createEmptyCard()
  if (!srInterval || !srNextReview) return { card, log: null }

  // Map intervals to approximate FSRS stability
  // Simulate the card having been reviewed with appropriate ratings
  const state: FsrsState = { card, log: null }

  if (srInterval >= 7) {
    // Was at 7-day interval = 3 successful "Good" reviews
    let s = state
    s = scheduleReview(s, Rating.Good)
    s = scheduleReview(s, Rating.Good)
    s = scheduleReview(s, Rating.Good)
    return s
  } else if (srInterval >= 3) {
    // 3-day = 2 successful reviews
    let s = state
    s = scheduleReview(s, Rating.Good)
    s = scheduleReview(s, Rating.Good)
    return s
  } else {
    // 1-day = 1 review
    return scheduleReview(state, Rating.Good)
  }
}

// Map composite performance score to FSRS Rating
export function scoreToRating(compositeScore: number | null, selfRating: string): Rating {
  if (selfRating === 'needs_work' || (compositeScore !== null && compositeScore < 50)) {
    return Rating.Again
  }
  if (compositeScore !== null && compositeScore < 70) {
    return Rating.Hard
  }
  if (selfRating === 'felt_good' && (compositeScore === null || compositeScore >= 90)) {
    return Rating.Easy
  }
  return Rating.Good
}
