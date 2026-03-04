// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Calibration Storage
// Persists user-specific audio thresholds derived from the CalibrationWizard.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'banjo-buddy-calibration'

export interface CalibrationProfile {
  clarityThreshold: number
  onsetRmsThreshold: number
  calibratedAt: string
}

export function loadCalibration(): CalibrationProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CalibrationProfile
  } catch {
    return null
  }
}

export function saveCalibration(profile: CalibrationProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function clearCalibration(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Analysis ──────────────────────────────────────────────────────────────────

interface RawFrame {
  rms: number
  clarity: number
}

export interface CalibrationAnalysis {
  noiseFloor: number
  softestNote: number
  weakestClarity: number
  suggestedClarityThreshold: number
  suggestedRmsThreshold: number
  frameCount: number
  activeFrameCount: number
}

export function analyzeFrames(frames: RawFrame[]): CalibrationAnalysis {
  const silentFrames = frames.filter((f) => f.clarity < 0.3)
  const activeFrames = frames.filter((f) => f.clarity >= 0.5)

  // Noise floor: 95th-percentile RMS among silent frames
  const silentRms = silentFrames.map((f) => f.rms).sort((a, b) => a - b)
  const noiseFloor = silentRms.length > 0
    ? silentRms[Math.floor(silentRms.length * 0.95)]
    : 0.003

  // Softest note: 10th-percentile RMS among active frames
  const activeRms = activeFrames.map((f) => f.rms).sort((a, b) => a - b)
  const softestNote = activeRms.length > 0
    ? activeRms[Math.floor(activeRms.length * 0.10)]
    : 0.020

  // Weakest clarity: 5th-percentile clarity among active frames
  const clarities = activeFrames.map((f) => f.clarity).sort((a, b) => a - b)
  const weakestClarity = clarities.length > 0
    ? clarities[Math.floor(clarities.length * 0.05)]
    : 0.70

  const suggestedRmsThreshold = Math.max(noiseFloor * 2.5, softestNote * 0.5)
  const suggestedClarityThreshold = Math.max(0.55, weakestClarity * 0.88)

  return {
    noiseFloor,
    softestNote,
    weakestClarity,
    suggestedClarityThreshold: Math.round(suggestedClarityThreshold * 1000) / 1000,
    suggestedRmsThreshold: Math.round(suggestedRmsThreshold * 10000) / 10000,
    frameCount: frames.length,
    activeFrameCount: activeFrames.length,
  }
}
