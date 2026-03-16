// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Tempo Ramp State Machine (BPM Ladder)
// Start at 60% of target, play 2 cycles, step up 5 BPM if accuracy > 85%.
// ─────────────────────────────────────────────────────────────────────────────

const BPM_STEP = 5
const CYCLES_PER_STEP = 2
const PASS_THRESHOLD = 85    // accuracy % to advance
const FAIL_THRESHOLD = 60    // accuracy % to drop back
const START_PERCENT = 0.6

export interface TempoRampStep {
  bpm: number
  status: 'pending' | 'active' | 'passed' | 'failed'
  accuracies: number[]
}

export interface TempoRampState {
  targetBpm: number
  steps: TempoRampStep[]
  currentStepIndex: number
  cyclesAtStep: number
  isComplete: boolean
  highestPassed: number | null
}

export function createTempoRamp(targetBpm: number): TempoRampState {
  const startBpm = Math.round((targetBpm * START_PERCENT) / 5) * 5
  const steps: TempoRampStep[] = []

  for (let bpm = startBpm; bpm <= targetBpm; bpm += BPM_STEP) {
    steps.push({ bpm, status: 'pending', accuracies: [] })
  }

  // Ensure target is included
  if (steps.length === 0 || steps[steps.length - 1].bpm !== targetBpm) {
    steps.push({ bpm: targetBpm, status: 'pending', accuracies: [] })
  }

  if (steps.length > 0) {
    steps[0].status = 'active'
  }

  return {
    targetBpm,
    steps,
    currentStepIndex: 0,
    cyclesAtStep: 0,
    isComplete: false,
    highestPassed: null,
  }
}

export function evaluateRampCycle(
  state: TempoRampState,
  cycleAccuracy: number
): TempoRampState {
  if (state.isComplete) return state

  const steps = state.steps.map((s) => ({ ...s, accuracies: [...s.accuracies] }))
  const idx = state.currentStepIndex
  const step = steps[idx]
  if (!step) return { ...state, isComplete: true }

  step.accuracies.push(cycleAccuracy)
  const newCyclesAtStep = state.cyclesAtStep + 1

  // Not enough cycles yet
  if (newCyclesAtStep < CYCLES_PER_STEP) {
    return { ...state, steps, cyclesAtStep: newCyclesAtStep }
  }

  // Evaluate average accuracy over the cycles at this step
  const avgAccuracy = step.accuracies.reduce((a, b) => a + b, 0) / step.accuracies.length

  if (avgAccuracy >= PASS_THRESHOLD) {
    // Pass — advance to next step
    step.status = 'passed'
    const highestPassed = step.bpm

    if (idx + 1 >= steps.length) {
      // Completed all steps
      return { ...state, steps, isComplete: true, highestPassed, cyclesAtStep: 0 }
    }

    steps[idx + 1].status = 'active'
    return {
      ...state,
      steps,
      currentStepIndex: idx + 1,
      cyclesAtStep: 0,
      highestPassed,
    }
  } else if (avgAccuracy < FAIL_THRESHOLD && idx > 0) {
    // Fail hard — drop back one step
    step.status = 'failed'
    steps[idx - 1].status = 'active'
    steps[idx - 1].accuracies = []
    return {
      ...state,
      steps,
      currentStepIndex: idx - 1,
      cyclesAtStep: 0,
    }
  } else {
    // Marginal — retry same step
    step.accuracies = []
    return { ...state, steps, cyclesAtStep: 0 }
  }
}

export function getCurrentRampBpm(state: TempoRampState): number {
  return state.steps[state.currentStepIndex]?.bpm ?? state.targetBpm
}
