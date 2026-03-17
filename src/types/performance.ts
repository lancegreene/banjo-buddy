export interface PerformanceMetrics {
  timing: number      // 0-100 — onset deviation from beat grid
  noteAccuracy: number // 0-100 — pitch match percentage
  rollEvenness: number // 0-100 — stddev of inter-onset intervals
  dynamics: number     // 0-100 — RMS amplitude variance consistency
  tempoStability: number // 0-100 — BPM drift over time window
  composite: number    // 0-100 — weighted average
}

export function createEmptyMetrics(): PerformanceMetrics {
  return { timing: 0, noteAccuracy: 0, rollEvenness: 0, dynamics: 0, tempoStability: 0, composite: 0 }
}
