// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useNoteCapture Hook
// React hook wrapping the note capture engine. Same AudioContext lifecycle
// pattern as Tuner.tsx. Shared by RollDetector and LickDetector.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react'
import { PitchDetector } from 'pitchy'
import {
  type CapturedNote,
  type NoteCaptureConfig,
  DEFAULT_CONFIG,
  BANJO_STRINGS,
  freqToNoteInfo,
  getClosestString,
  computeRms,
  detectOnset,
} from '../engine/noteCapture'
import { loadCalibration } from '../utils/calibration'

export type { CapturedNote }

export interface UseNoteCaptureOptions extends Partial<NoteCaptureConfig> {
  onNoteDetected?: (note: CapturedNote) => void
  debug?: boolean
}

export interface UseNoteCaptureReturn {
  notes: CapturedNote[]
  currentFreq: number | null
  currentClarity: number
  isListening: boolean
  error: string | null
  startListening: () => Promise<void>
  stopListening: () => void
  clearNotes: () => void
  audioContextRef: React.RefObject<AudioContext | null>
  analyserRef: React.RefObject<AnalyserNode | null>
  streamRef: React.RefObject<MediaStream | null>
}

// Minimum ms between onsets on the same banjo string.
// Blocks octave-flip re-triggers (B4 read while B3 rings, ~80–250ms after pluck)
// and RMS-spike re-triggers on ringing strings, without complex EMA threshold logic.
// At 200 BPM with 8th-note rolls, the same string appears every ~300ms minimum.
const STRING_COOLDOWN_MS = 300

// Max ms to consider a pitch the octave harmonic of a recently-fired string.
// D3 (string 4) produces D4 harmonic (~293Hz) which pitchy reads as string 1;
// block it if string 4 fired within this window.
const OCTAVE_HARMONIC_BLOCK_MS = 350

// RMS ratio threshold for overriding the octave harmonic block.
// When candidate onset RMS ≥ this × smoothRms, it's a real fresh pluck,
// not a lingering harmonic from the lower string's ring.
// Data shows: D3 harmonic at 294Hz decays to rms 0.01-0.03,
// while a real D4 pluck arrives at rms 0.05-0.12.
const HARMONIC_OVERRIDE_RMS_RATIO = 2.5

// Minimum RMS for a string-5 (G4) onset to count.
// Ghost onsets from sympathetic resonance arrive at rms 0.005-0.015.
// Real plucks on string 5 are rms 0.03+.
const STRING5_MIN_RMS = 0.025

// Minimum RMS for D3 (string 4) onsets.
// Pitchy sometimes reads D4 plucks at half-frequency (~147 Hz) during the
// attack transient. These misreads have very low RMS compared to a real
// thumb stroke on string 4.
const STRING4_MIN_RMS = 0.035

// Per-string onset info: timestamp + RMS at onset
interface StringOnsetInfo {
  time: number
  rms: number
}

export function useNoteCapture(options: UseNoteCaptureOptions = {}): UseNoteCaptureReturn {
  const calibration = loadCalibration()
  const config: NoteCaptureConfig = { ...DEFAULT_CONFIG, ...calibration, ...options }

  const [notes, setNotes] = useState<CapturedNote[]>([])
  const [currentFreq, setCurrentFreq] = useState<number | null>(null)
  const [currentClarity, setCurrentClarity] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null)
  const inputRef = useRef<Float32Array | null>(null)

  // Onset detection state in refs (avoids stale closures in RAF loop)
  const notesRef = useRef<CapturedNote[]>([])
  const smoothRmsRef = useRef<number>(0)    // exponential moving average of RMS
  const lastFreqRef = useRef<number | null>(null)  // last confirmed onset frequency
  const lastOnsetTimeRef = useRef<number>(0)
  const lastClearPitchRef = useRef<number | null>(null)  // previous frame's clear pitch (stability check)
  const lockoutUntilRef = useRef<number>(0)  // timestamp until which global onset detection is locked
  const lastStringOnsetInfo = useRef<Record<number, StringOnsetInfo>>({})  // per-string onset timestamp + RMS
  const lastOnsetStringRef = useRef<number | null>(null)  // banjoString of the most recent onset (null if unmapped)
  const lockoutReclassifiedRef = useRef(false)  // true once we've reclassified the note during this lockout
  const debugModeRef = useRef(options.debug ?? localStorage.getItem('banjo-debug') === 'true')
  const debugLogRef = useRef<object[]>([])
  const debugStartRef = useRef<number>(0)
  const onNoteDetectedRef = useRef(options.onNoteDetected)
  useEffect(() => { onNoteDetectedRef.current = options.onNoteDetected }, [options.onNoteDetected])

  const stopListening = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    streamRef.current = null
    detectorRef.current = null
    inputRef.current = null
    setIsListening(false)
    setCurrentFreq(null)
    setCurrentClarity(0)
  }, [])

  const startListening = useCallback(async () => {
    setError(null)
    try {
      // Disable browser audio processing — echoCancellation/noiseSuppression/AGC
      // smear the sharp attack transients that banjo picking produces.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      // 1024 samples @ 44100 Hz = ~23 ms window (vs 46 ms at 2048).
      // Smaller window = faster transient response for fast picking.
      analyser.fftSize = 1024
      audioContext.createMediaStreamSource(stream).connect(analyser)

      const detector = PitchDetector.forFloat32Array(analyser.fftSize)
      const input = new Float32Array(detector.inputLength)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      streamRef.current = stream
      detectorRef.current = detector
      inputRef.current = input

      setIsListening(true)

      if (debugModeRef.current) {
        debugLogRef.current = []
        debugStartRef.current = performance.now()
        ;(window as any).__banjoDebug = () => debugLogRef.current
        console.info('[BanjoBuddy] Debug ON — play some rolls, then run:\n  copy(JSON.stringify(window.__banjoDebug()))')
      }

      function detect() {
        if (!analyserRef.current || !detectorRef.current || !inputRef.current) return

        analyserRef.current.getFloatTimeDomainData(inputRef.current)
        const [pitch, clarity] = detectorRef.current.findPitch(inputRef.current, audioContext.sampleRate)
        const rms = computeRms(inputRef.current)

        // Only update React state when values change meaningfully (avoid 60Hz re-renders)
        setCurrentClarity((prev) => Math.abs(prev - clarity) > 0.01 ? clarity : prev)

        // Smooth RMS with faster decay (0.70) so the baseline recovers quickly
        // between notes — critical for detecting soft index-finger plucks (string 1)
        // after a louder thumb stroke on strings 3/4.
        const prevSmooth = smoothRmsRef.current
        smoothRmsRef.current = prevSmooth * 0.70 + rms * 0.30

        const now = performance.now()
        const isLocked = now < lockoutUntilRef.current

        if (clarity > config.clarityThreshold && pitch > config.minFreq && pitch < config.maxFreq) {
          setCurrentFreq((prev) => prev !== null && Math.abs(prev - pitch) < 1 ? prev : pitch)

          // Stability check: require this pitch to agree with the previous clear frame
          // within 30 cents. Filters transient octave errors (G4→G5 for one frame)
          // which would otherwise look like a 1200-cent pitch change.
          const prevClear = lastClearPitchRef.current
          const pitchIsStable = prevClear !== null &&
            Math.abs(1200 * Math.log2(pitch / prevClear)) < 30
          lastClearPitchRef.current = pitch

          // Bypass stability check for large cross-string pitch jumps — pitch oscillates
          // between harmonics for 3-8 frames during the attack transient, so waiting for
          // two consecutive stable frames misses the onset window on many plucks.
          // The stability check is still required for same-string (RMS spike) detection.
          const isLargePitchJump = lastFreqRef.current !== null &&
            Math.abs(1200 * Math.log2(pitch / lastFreqRef.current)) >= config.pitchChangeCents

          // Bypass stability check when RMS spikes hard (≥2× baseline). The peak RMS
          // signal for same-string replucks arrives during the unstable attack frames;
          // by the time pitch settles, the EMA has caught up and the ratio drops below
          // threshold. Analogous to isLargePitchJump but triggered by amplitude.
          // Requires lastFreq to be set: after clearNotes, smoothRms ≈ 0 so any pluck
          // gives a 10-50× ratio. Without this guard the first note fires at the wrong
          // pitch in frame 1 (before pitchy has settled) and locks out the correct reading.
          const isLargeRmsSpike = lastFreqRef.current !== null && prevSmooth > 0 && (rms / prevSmooth) >= 2.0

          if (debugModeRef.current && rms >= config.onsetRmsThreshold && debugLogRef.current.length < 3000) {
            let decision: string
            if (isLocked) {
              decision = 'locked'
            } else if (!pitchIsStable && !isLargePitchJump && !isLargeRmsSpike) {
              decision = 'unstable'
            } else if (!detectOnset(pitch, clarity, rms, prevSmooth, lastFreqRef.current, lastOnsetTimeRef.current, config)) {
              decision = 'no_onset'
            } else {
              const { note: dn, octave: dOct, cents: dc } = freqToNoteInfo(pitch)
              const dStr = getClosestString(dn, dOct, dc)
              // Apply per-string RMS floors (Fix 4 & 5)
              if (dStr && dStr.string === 5 && rms < STRING5_MIN_RMS) {
                decision = 'rms_floor_str5'
              } else if (dStr && dStr.string === 4 && rms < STRING4_MIN_RMS) {
                decision = 'rms_floor_str4'
              } else {
                const lastInfo = dStr ? (lastStringOnsetInfo.current[dStr.string] ?? null) : null
                const lastTime = lastInfo?.time ?? 0
                if (dStr && now - lastTime < STRING_COOLDOWN_MS) {
                  decision = 'string_cooldown'
                } else if (dStr && BANJO_STRINGS.some(s => {
                  if (s.string === dStr.string) return false
                  const sInfo = lastStringOnsetInfo.current[s.string]
                  if (!sInfo) return false
                  const hBlock = (s.string === 4 && dStr.string === 1) ? 200 : OCTAVE_HARMONIC_BLOCK_MS
                  if (now - sInfo.time >= hBlock) return false
                  if (Math.abs(Math.log2(pitch / s.freq) - 1.0) >= 0.12) return false
                  // RMS override: if this onset is strong relative to baseline, it's a real pluck
                  if (prevSmooth > 0 && rms / prevSmooth >= HARMONIC_OVERRIDE_RMS_RATIO) return false
                  return true
                })) {
                  decision = 'octave_harmonic'
                } else {
                  decision = 'onset'
                }
              }
            }
            debugLogRef.current.push({
              t: Math.round(now - debugStartRef.current),
              pitch: Math.round(pitch * 10) / 10,
              clarity: Math.round(clarity * 1000) / 1000,
              rms: Math.round(rms * 10000) / 10000,
              smoothRms: Math.round(prevSmooth * 10000) / 10000,
              stable: pitchIsStable,
              jump: isLargePitchJump,
              spike: isLargeRmsSpike,
              decision,
            })
          }

          // During lockout: once pitch stabilizes, bind cooldown and reclassify note if needed.
          //
          // Onset pitch can be far from the true note during the attack transient:
          //   • 353 Hz (null) → settles to G4 (392 Hz)         — reclassify null → string 5
          //   • 444 Hz (null) → settles to D4 (294 Hz)         — reclassify null → string 1
          //
          // Only reclassify when the onset had NO valid string match (banjoString was null).
          // When the onset already mapped to a valid string, the "settled" pitch during
          // lockout is almost always a partial/harmonic of the real note, not a different
          // string. Data shows: D4 onsets (293Hz → str 1) produce ~400Hz partials that
          // falsely reclassify to G4 (str 5). Limiting to null-onset reclassification
          // eliminates these while preserving the valuable transient→correct-string cases.
          //
          // Only fires once per lockout (first stable settled pitch).
          if (isLocked && !lockoutReclassifiedRef.current && pitchIsStable) {
            const { note: ln, octave: lOct, cents: lc } = freqToNoteInfo(pitch)
            const lockStr = getClosestString(ln, lOct, lc)
            if (lockStr !== null) {
              const existingInfo = lastStringOnsetInfo.current[lockStr.string]
              if (!existingInfo || existingInfo.time < lastOnsetTimeRef.current) {
                lastStringOnsetInfo.current[lockStr.string] = { time: lastOnsetTimeRef.current, rms }
              }
              // Only reclassify if the onset had no valid string match
              if (lastOnsetStringRef.current === null && lockStr.string !== lastOnsetStringRef.current) {
                const prev = notesRef.current
                if (prev.length > 0 && prev[prev.length - 1].timestamp === lastOnsetTimeRef.current) {
                  const last = prev[prev.length - 1]
                  const { note: sNote, octave: sOct } = freqToNoteInfo(pitch)
                  last.banjoString = lockStr.string
                  last.note = sNote
                  last.octave = sOct
                  last.freq = pitch
                }
                lastOnsetStringRef.current = lockStr.string
                lastFreqRef.current = lockStr.freq  // sync to reclassified string's fundamental
                setNotes([...notesRef.current])
              }
              lockoutReclassifiedRef.current = true
            }
          }

          if (!isLocked && (pitchIsStable || isLargePitchJump || isLargeRmsSpike) && detectOnset(pitch, clarity, rms, prevSmooth, lastFreqRef.current, lastOnsetTimeRef.current, config)) {
            const { note, octave, cents } = freqToNoteInfo(pitch)
            const banjoStr = getClosestString(note, octave, cents)

            // Fix 4: Per-string RMS floors — reject ghost onsets from sympathetic resonance.
            // String 5 (G4) ghosts: 400-417 Hz at rms 0.005-0.015 from overtones.
            // String 4 (D3) misreads: pitchy reads D4 plucks at half-frequency with low RMS.
            if (banjoStr !== null && banjoStr.string === 5 && rms < STRING5_MIN_RMS) {
              animFrameRef.current = requestAnimationFrame(detect)
              return
            }
            if (banjoStr !== null && banjoStr.string === 4 && rms < STRING4_MIN_RMS) {
              animFrameRef.current = requestAnimationFrame(detect)
              return
            }

            // Per-string cooldown: block same banjo string from re-triggering within
            // STRING_COOLDOWN_MS. Catches both B4/B3 octave flips (pitchy reads the
            // octave harmonic of the ringing string) and RMS-spike re-triggers.
            if (banjoStr !== null) {
              const lastInfo = lastStringOnsetInfo.current[banjoStr.string]
              if (lastInfo && now - lastInfo.time < STRING_COOLDOWN_MS) {
                animFrameRef.current = requestAnimationFrame(detect)
                return
              }
            }

            // Cross-string octave harmonic block: if pitch is ~1 octave above a recently
            // fired string, it's likely that string's harmonic (e.g. D3 string 4 produces
            // D4 ~293Hz which maps to string 1). Block if the fundamental string fired
            // within the per-pair harmonic window and the new string is a different string.
            //
            // RMS OVERRIDE (Fix 1): if the candidate onset has strong RMS relative to the
            // current baseline (smoothRms), it's a real fresh pluck — not a lingering
            // harmonic. Data shows D3 harmonics decay to rms 0.01-0.03 while D4 plucks
            // arrive at rms 0.05-0.12. Allow through if rms/smoothRms ≥ threshold.
            let harmonicBlocked = false
            if (banjoStr !== null) {
              for (const s of BANJO_STRINGS) {
                if (s.string === banjoStr.string) continue
                const sInfo = lastStringOnsetInfo.current[s.string]
                if (!sInfo) continue
                const harmonicBlockMs = (s.string === 4 && banjoStr.string === 1)
                  ? 200
                  : OCTAVE_HARMONIC_BLOCK_MS
                if (now - sInfo.time < harmonicBlockMs &&
                    Math.abs(Math.log2(pitch / s.freq) - 1.0) < 0.12) {
                  // Check RMS override: strong onset overrides the block
                  const rmsRatio = prevSmooth > 0 ? rms / prevSmooth : 99
                  if (rmsRatio >= HARMONIC_OVERRIDE_RMS_RATIO) {
                    // Real pluck — allow through despite harmonic window
                    break
                  }
                  harmonicBlocked = true
                  break
                }
              }
            }
            if (harmonicBlocked) {
              animFrameRef.current = requestAnimationFrame(detect)
              return
            }

            lockoutUntilRef.current = now + config.onsetLockoutMs
            lockoutReclassifiedRef.current = false

            // Fill duration of previous note
            const prev = notesRef.current
            if (prev.length > 0) {
              prev[prev.length - 1].duration = now - lastOnsetTimeRef.current
            }

            const captured: CapturedNote = {
              note,
              octave,
              freq: pitch,
              timestamp: now,
              duration: 0,
              clarity,
              banjoString: banjoStr?.string ?? null,
            }

            notesRef.current = [...prev.slice(-(config.maxNotes - 1)), captured]
            lastFreqRef.current = banjoStr?.freq ?? pitch  // use string fundamental, not onset transient — prevents phantom pitch-jump onset when harmonic fires (e.g. B3 at 462Hz → lastFreq=246.94Hz not 462Hz)
            lastOnsetTimeRef.current = now
            lastOnsetStringRef.current = banjoStr?.string ?? null
            if (banjoStr !== null) lastStringOnsetInfo.current[banjoStr.string] = { time: now, rms }

            setNotes([...notesRef.current])
            onNoteDetectedRef.current?.(captured)
          }
        } else {
          lastClearPitchRef.current = null
          setCurrentFreq((prev) => prev === null ? prev : null)
        }

        animFrameRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
      setIsListening(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearNotes = useCallback(() => {
    notesRef.current = []
    smoothRmsRef.current = 0
    lastFreqRef.current = null
    lastOnsetTimeRef.current = 0
    lastClearPitchRef.current = null
    lockoutUntilRef.current = 0
    lastStringOnsetInfo.current = {}
    lastOnsetStringRef.current = null
    lockoutReclassifiedRef.current = false
    setNotes([])
  }, [])

  useEffect(() => () => stopListening(), [stopListening])

  return {
    notes,
    currentFreq,
    currentClarity,
    isListening,
    error,
    startListening,
    stopListening,
    clearNotes,
    audioContextRef,
    analyserRef,
    streamRef,
  }
}
