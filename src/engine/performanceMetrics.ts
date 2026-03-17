import type { PerformanceMetrics } from '../types/performance'
import type { NoteEvaluation } from './streamingRollMatcher'
import type { CapturedNote } from './noteCapture'
import { Rating } from './fsrs'

// Weights for composite score
const WEIGHTS = {
  timing: 0.25,
  noteAccuracy: 0.30,
  rollEvenness: 0.20,
  dynamics: 0.10,
  tempoStability: 0.15,
}

export function computePerformanceMetrics(
  evaluations: NoteEvaluation[],
  capturedNotes: CapturedNote[],
  targetBpm: number | null
): PerformanceMetrics {
  const timing = computeTimingAccuracy(evaluations, targetBpm)
  const noteAccuracy = computeNoteAccuracy(evaluations)
  const rollEvenness = computeRollEvenness(evaluations)
  const dynamics = computeDynamicConsistency(capturedNotes)
  const tempoStability = computeTempoStability(evaluations, targetBpm)

  const composite = Math.round(
    timing * WEIGHTS.timing +
    noteAccuracy * WEIGHTS.noteAccuracy +
    rollEvenness * WEIGHTS.rollEvenness +
    dynamics * WEIGHTS.dynamics +
    tempoStability * WEIGHTS.tempoStability
  )

  return { timing, noteAccuracy, rollEvenness, dynamics, tempoStability, composite }
}

// 1. Timing accuracy: how close onsets are to the beat grid
function computeTimingAccuracy(evals: NoteEvaluation[], targetBpm: number | null): number {
  if (evals.length < 2 || !targetBpm) return 0

  const expectedIntervalMs = 60000 / (targetBpm * 2) // 8th notes
  const timingErrors = evals
    .filter(e => e.timingErrorMs !== null)
    .map(e => Math.abs(e.timingErrorMs!))

  if (timingErrors.length === 0) return 0

  const avgError = timingErrors.reduce((a, b) => a + b, 0) / timingErrors.length
  // Perfect = 0ms error, 0 score at error >= expectedInterval
  return Math.max(0, Math.round(100 * (1 - avgError / expectedIntervalMs)))
}

// 2. Note accuracy: percentage of correct string hits
function computeNoteAccuracy(evals: NoteEvaluation[]): number {
  if (evals.length === 0) return 0
  const hits = evals.filter(e => e.isHit).length
  return Math.round((hits / evals.length) * 100)
}

// 3. Roll evenness: consistency of inter-onset intervals
function computeRollEvenness(evals: NoteEvaluation[]): number {
  if (evals.length < 3) return 0

  const intervals: number[] = []
  for (let i = 1; i < evals.length; i++) {
    intervals.push(evals[i].timestampMs - evals[i - 1].timestampMs)
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  if (mean <= 0) return 0

  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length
  const cv = Math.sqrt(variance) / mean
  // CV of 0 = perfect, CV of 0.45+ = 0 score
  return Math.max(0, Math.round((1 - cv / 0.45) * 100))
}

// 4. Dynamic consistency: RMS amplitude variance across notes
function computeDynamicConsistency(notes: CapturedNote[]): number {
  if (notes.length < 3) return 0

  // Use clarity as a proxy for relative amplitude when RMS isn't available
  const values = notes.map(n => n.clarity)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean <= 0) return 0

  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  const cv = Math.sqrt(variance) / mean
  // Low CV = consistent dynamics
  return Math.max(0, Math.round((1 - cv / 0.5) * 100))
}

// 5. Tempo stability: BPM drift over time
function computeTempoStability(evals: NoteEvaluation[], targetBpm: number | null): number {
  if (evals.length < 8 || !targetBpm) return 0

  const expectedIntervalMs = 60000 / (targetBpm * 2)

  // Compute instantaneous BPM for each note pair, in windows of 4
  const windowSize = 4
  const windowBpms: number[] = []

  for (let i = windowSize; i < evals.length; i++) {
    const windowInterval = (evals[i].timestampMs - evals[i - windowSize].timestampMs) / windowSize
    if (windowInterval > 0) {
      windowBpms.push(60000 / (windowInterval * 2))
    }
  }

  if (windowBpms.length < 2) return 0

  // Measure drift as max deviation from target
  const maxDrift = Math.max(...windowBpms.map(b => Math.abs(b - targetBpm)))
  // Perfect = 0 drift, 0 score at drift >= 20 BPM
  return Math.max(0, Math.round(100 * (1 - maxDrift / 20)))
}

// Map 5-metric composite to FSRS Rating
export function metricsToFsrsRating(metrics: PerformanceMetrics): Rating {
  if (metrics.composite >= 90) return Rating.Easy
  if (metrics.composite >= 70) return Rating.Good
  if (metrics.composite >= 50) return Rating.Hard
  return Rating.Again
}
