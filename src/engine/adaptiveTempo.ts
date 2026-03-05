// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Adaptive Tempo Engine
// State machine that adjusts BPM based on rolling accuracy after each cycle.
// Pure functions — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

const BPM_FLOOR = 40
const BPM_CEILING = 200
const BPM_STEP = 5
const COOLDOWN_CYCLES = 2
const SLOW_DOWN_THRESHOLD = 60  // accuracy % below which we slow down
const SPEED_UP_THRESHOLD = 90   // accuracy % above which we speed up

export interface AdaptiveTempoState {
  currentBpm: number
  cyclesSinceAdjustment: number
  lastDirection: 'up' | 'down' | null
  adjustmentHistory: { cycle: number; fromBpm: number; toBpm: number; accuracy: number }[]
}

export function createAdaptiveTempoState(initialBpm: number): AdaptiveTempoState {
  return {
    currentBpm: Math.max(BPM_FLOOR, Math.min(BPM_CEILING, initialBpm)),
    cyclesSinceAdjustment: 0,
    lastDirection: null,
    adjustmentHistory: [],
  }
}

export function evaluateTempoAdjustment(
  state: AdaptiveTempoState,
  cycleAccuracy: number,
  cycleNumber: number
): AdaptiveTempoState {
  const newCyclesSince = state.cyclesSinceAdjustment + 1

  // Respect cooldown period
  if (newCyclesSince < COOLDOWN_CYCLES) {
    return { ...state, cyclesSinceAdjustment: newCyclesSince }
  }

  let newBpm = state.currentBpm
  let direction: 'up' | 'down' | null = null

  if (cycleAccuracy < SLOW_DOWN_THRESHOLD) {
    newBpm = Math.max(BPM_FLOOR, state.currentBpm - BPM_STEP)
    direction = 'down'
  } else if (cycleAccuracy > SPEED_UP_THRESHOLD) {
    newBpm = Math.min(BPM_CEILING, state.currentBpm + BPM_STEP)
    direction = 'up'
  }

  if (newBpm === state.currentBpm) {
    // No adjustment needed
    return { ...state, cyclesSinceAdjustment: newCyclesSince }
  }

  return {
    currentBpm: newBpm,
    cyclesSinceAdjustment: 0,
    lastDirection: direction,
    adjustmentHistory: [
      ...state.adjustmentHistory,
      { cycle: cycleNumber, fromBpm: state.currentBpm, toBpm: newBpm, accuracy: cycleAccuracy },
    ],
  }
}
