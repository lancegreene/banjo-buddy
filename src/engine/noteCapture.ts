// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Note Capture Engine
// Pure functions for pitch detection, RMS, and note onset detection.
// Shared by Tuner, RollDetector, and LickDetector — no React dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Standard 5-string banjo open strings (G tuning)
export const BANJO_STRINGS = [
  { string: 5, note: 'G', octave: 4, freq: 392.0 },
  { string: 4, note: 'D', octave: 3, freq: 146.83 },
  { string: 3, note: 'G', octave: 3, freq: 196.0 },
  { string: 2, note: 'B', octave: 3, freq: 246.94 },
  { string: 1, note: 'D', octave: 4, freq: 293.66 },
]

export type BanjoString = typeof BANJO_STRINGS[0]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CapturedNote {
  note: string
  octave: number
  freq: number
  timestamp: number      // performance.now() at onset
  duration: number       // ms — filled when next note is detected
  clarity: number
  banjoString: number | null  // 1-5 if matched to open string, null if fretted/unknown
}

export interface NoteCaptureConfig {
  clarityThreshold: number     // default 0.85
  minFreq: number              // default 60 Hz
  maxFreq: number              // default 1200 Hz
  onsetRmsThreshold: number    // default 0.015
  minOnsetGapMs: number        // default 100 ms
  pitchChangeCents: number     // default 50 cents
  maxNotes: number             // default 64
}

export const DEFAULT_CONFIG: NoteCaptureConfig = {
  clarityThreshold: 0.78,
  minFreq: 60,
  maxFreq: 1200,
  onsetRmsThreshold: 0.015,
  minOnsetGapMs: 80,
  pitchChangeCents: 50,
  maxNotes: 64,
}

// ── Pure utility functions ────────────────────────────────────────────────────

export function freqToNoteInfo(freq: number): { note: string; octave: number; cents: number } {
  const noteNum = 12 * Math.log2(freq / 440) + 69
  const rounded = Math.round(noteNum)
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12]
  const octave = Math.floor(rounded / 12) - 1
  const cents = Math.round((noteNum - rounded) * 100)
  return { note, octave, cents }
}

export function noteToMidi(note: string, octave: number): number {
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(note)
}

export function freqFromNoteOctave(note: string, octave: number, cents = 0): number {
  const midi = noteToMidi(note, octave)
  return 440 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, cents / 1200)
}

export function getClosestString(
  note: string,
  octave: number,
  cents: number,
  threshold = 0.05  // tighter than Tuner (was 0.1) to reduce fretted-note false positives
): BanjoString | null {
  const freq = freqFromNoteOctave(note, octave, cents)
  let closest = BANJO_STRINGS[0]
  let minDiff = Infinity
  for (const s of BANJO_STRINGS) {
    const diff = Math.abs(Math.log2(freq / s.freq))
    if (diff < minDiff) { minDiff = diff; closest = s }
  }
  return minDiff < threshold ? closest : null
}

export function computeRms(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}

export function detectOnset(
  pitch: number,
  clarity: number,
  rms: number,
  lastFreq: number | null,
  lastOnsetTime: number,
  config: NoteCaptureConfig
): boolean {
  if (clarity < config.clarityThreshold) return false
  if (pitch < config.minFreq || pitch > config.maxFreq) return false
  if (rms < config.onsetRmsThreshold) return false
  if (performance.now() - lastOnsetTime < config.minOnsetGapMs) return false

  if (lastFreq !== null) {
    const centsDiff = Math.abs(1200 * Math.log2(pitch / lastFreq))
    if (centsDiff < config.pitchChangeCents) return false
  }

  return true
}
