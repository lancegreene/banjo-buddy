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
const STRING_COOLDOWN_MS = 250

// Max ms to consider a pitch the octave harmonic of a recently-fired string.
// D3 (string 4) produces D4 harmonic (~293Hz) which pitchy reads as string 1;
// block it if string 4 fired within this window.
const OCTAVE_HARMONIC_BLOCK_MS = 350

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
  const lastStringOnsetTime = useRef<Record<number, number>>({})  // per-string last onset timestamp
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

        setCurrentClarity(clarity)

        // Smooth RMS with faster decay (0.70) so the baseline recovers quickly
        // between notes — critical for detecting soft index-finger plucks (string 1)
        // after a louder thumb stroke on strings 3/4.
        const prevSmooth = smoothRmsRef.current
        smoothRmsRef.current = prevSmooth * 0.70 + rms * 0.30

        const now = performance.now()
        const isLocked = now < lockoutUntilRef.current

        if (clarity > config.clarityThreshold && pitch > config.minFreq && pitch < config.maxFreq) {
          setCurrentFreq(pitch)

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
              const lastTime = dStr ? (lastStringOnsetTime.current[dStr.string] ?? 0) : 0
              if (dStr && now - lastTime < STRING_COOLDOWN_MS) {
                decision = 'string_cooldown'
              } else if (dStr && BANJO_STRINGS.some(s =>
                s.string !== dStr.string &&
                (lastStringOnsetTime.current[s.string] ?? 0) > now - OCTAVE_HARMONIC_BLOCK_MS &&
                Math.abs(Math.log2(pitch / s.freq) - 1.0) < 0.12
              )) {
                decision = 'octave_harmonic'
              } else {
                decision = 'onset'
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

          if (!isLocked && (pitchIsStable || isLargePitchJump || isLargeRmsSpike) && detectOnset(pitch, clarity, rms, prevSmooth, lastFreqRef.current, lastOnsetTimeRef.current, config)) {
            const { note, octave, cents } = freqToNoteInfo(pitch)
            const banjoStr = getClosestString(note, octave, cents)

            // Per-string cooldown: block same banjo string from re-triggering within
            // STRING_COOLDOWN_MS. Catches both B4/B3 octave flips (pitchy reads the
            // octave harmonic of the ringing string) and RMS-spike re-triggers.
            if (banjoStr !== null) {
              const lastTime = lastStringOnsetTime.current[banjoStr.string] ?? 0
              if (now - lastTime < STRING_COOLDOWN_MS) {
                animFrameRef.current = requestAnimationFrame(detect)
                return
              }
            }

            // Cross-string octave harmonic block: if pitch is ~1 octave above a recently
            // fired string, it's likely that string's harmonic (e.g. D3 string 4 produces
            // D4 ~293Hz which maps to string 1). Block if the fundamental string fired
            // within OCTAVE_HARMONIC_BLOCK_MS and the new string is a different string.
            if (banjoStr !== null) {
              for (const s of BANJO_STRINGS) {
                if (s.string === banjoStr.string) continue
                const lastTime = lastStringOnsetTime.current[s.string] ?? 0
                if (now - lastTime < OCTAVE_HARMONIC_BLOCK_MS &&
                    Math.abs(Math.log2(pitch / s.freq) - 1.0) < 0.12) {
                  animFrameRef.current = requestAnimationFrame(detect)
                  return
                }
              }
            }

            lockoutUntilRef.current = now + config.onsetLockoutMs

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
            lastFreqRef.current = pitch
            lastOnsetTimeRef.current = now
            if (banjoStr !== null) lastStringOnsetTime.current[banjoStr.string] = now

            setNotes([...notesRef.current])
            onNoteDetectedRef.current?.(captured)
          }
        } else {
          lastClearPitchRef.current = null
          setCurrentFreq(null)
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
    lastStringOnsetTime.current = {}
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
