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
  clarityThreshold: number    // min pitchy clarity (0–1)
  minFreq: number             // Hz floor
  maxFreq: number             // Hz ceiling
  onsetRmsThreshold: number   // absolute RMS floor — gates out silence
  minOnsetGapMs: number       // min ms between consecutive onsets
  pitchChangeCents: number    // cents shift required to count as a new note (string change)
  rmsOnsetRatio: number       // RMS spike ratio for same-string onset detection
  maxNotes: number            // rolling buffer cap
  onsetLockoutMs: number      // hard lockout after onset fires — blocks all re-detection during note's initial ring
}

export const DEFAULT_CONFIG: NoteCaptureConfig = {
  clarityThreshold: 0.60,    // lowered from 0.65: gives more margin on soft index-finger plucks during fast decay
  minFreq: 130,              // lowest open string is D3=146.83 Hz; 130 Hz blocks sub-D3 body/tap noise
  maxFreq: 1200,
  onsetRmsThreshold: 0.007,  // low floor so soft index-finger plucks (string 1) aren't gated
                             // 0.007 vs 0.010: debug data shows missing D4s leave zero trace in the log,
                             // meaning they're plucked below the 0.010 floor; 0.007 catches them.
  minOnsetGapMs: 80,         // secondary guard within detectOnset — lockout is the primary double-trigger block
  pitchChangeCents: 80,      // decay drift on a ringing string can reach ~60c — stay above it
  rmsOnsetRatio: 1.25,       // secondary: less ratio needed — thumb strokes aren't much louder than index
  maxNotes: 64,
  onsetLockoutMs: 80,        // hard lockout after onset — prevents decay-dip/swell re-trigger.
                              // 80ms matches minOnsetGapMs and allows rolls up to ~150 BPM (notes every 100ms).
                              // 120ms was blocking notes at faster tempos.
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
  threshold = 0.12  // 144 cents — lockout reclassification handles transient mismaps (G5/D4 onsets at 435-444 Hz → null → reclassified during lockout).
                    // 0.18 (216¢) caused false G5 onsets from D4's 3/2 partial (~441 Hz) and G3 transients.
                    // Safe: minimum gap between any two open strings is D4↔B3 ≈ 300¢ (half = 150¢).
): BanjoString | null {
  const freq = freqFromNoteOctave(note, octave, cents)

  // Two-pass: fundamentals take priority over octave harmonics.
  // Without priority, D4 (293.66 Hz) ties with D3's octave-up (146.83×2=293.66 Hz).
  // String 4 (D3) appears before string 1 (D4) in BANJO_STRINGS, so a single-pass
  // loop would let the octave harmonic win and mismap D4 onsets to string 4.
  // Separating the passes ensures any fundamental match beats a harmonic match,
  // while B4 (493 Hz) — no open-string fundamental near it — still maps to
  // string 2 (B3) via the harmonic pass.
  let closestFund = BANJO_STRINGS[0], minFundDiff = Infinity
  let closestHarm = BANJO_STRINGS[0], minHarmDiff = Infinity

  for (const s of BANJO_STRINGS) {
    const diff = Math.abs(Math.log2(freq / s.freq))
    if (diff < minFundDiff) { minFundDiff = diff; closestFund = s }
    // Octave-up harmonic: pitchy sometimes locks on 2× the fundamental
    const diffOct = Math.abs(Math.log2(freq / (s.freq * 2)))
    if (diffOct < minHarmDiff) { minHarmDiff = diffOct; closestHarm = s }
  }

  if (minFundDiff < threshold) return closestFund
  if (minHarmDiff < threshold) return closestHarm
  return null
}

export function computeRms(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}

// Hybrid onset detection — two complementary methods:
//
// 1. PITCH CHANGE (primary): a shift ≥ pitchChangeCents from the last detected
//    pitch means a new string was plucked. This is the most reliable signal for
//    rolls because every string-to-string transition produces a large pitch jump
//    (≥200 cents in open G tuning). The index finger plucking string 1 (D4)
//    softly still changes pitch dramatically from the previous string.
//
// 2. RMS SPIKE (secondary): catches same-string consecutive plucks that produce
//    no pitch change — e.g., the double-thumb in Foggy Mountain (5→5→1→...).
//    We use a faster decay (see useNoteCapture) so the smooth baseline recovers
//    quickly between notes.
//
// Either condition is sufficient to fire an onset.
export function detectOnset(
  pitch: number,
  clarity: number,
  rms: number,
  smoothRms: number,      // exponential moving average updated every RAF frame
  lastFreq: number | null,
  lastOnsetTime: number,
  config: NoteCaptureConfig
): boolean {
  if (clarity < config.clarityThreshold) return false
  if (pitch < config.minFreq || pitch > config.maxFreq) return false
  if (rms < config.onsetRmsThreshold) return false
  if (performance.now() - lastOnsetTime < config.minOnsetGapMs) return false

  // Method 1: pitch change (reliable for string-to-string transitions)
  if (lastFreq !== null) {
    const centsDiff = Math.abs(1200 * Math.log2(pitch / lastFreq))
    if (centsDiff >= config.pitchChangeCents) return true
  } else {
    // No prior onset reference — accept any clear frame above the RMS floor.
    // After clearNotes, smoothRms rebuilds during the attack transient, so by the
    // time pitchIsStable=true the RMS ratio has dropped below 1.25. Skip Method 2.
    return true
  }

  // Method 2: RMS spike (same-string or consecutive pluck with no pitch change)
  const ratio = smoothRms > 0 ? rms / smoothRms : 2
  return ratio >= config.rmsOnsetRatio
}
