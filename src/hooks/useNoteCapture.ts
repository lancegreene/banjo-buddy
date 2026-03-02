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
  freqToNoteInfo,
  getClosestString,
  computeRms,
  detectOnset,
} from '../engine/noteCapture'

export type { CapturedNote }

export interface UseNoteCaptureOptions extends Partial<NoteCaptureConfig> {
  onNoteDetected?: (note: CapturedNote) => void
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

export function useNoteCapture(options: UseNoteCaptureOptions = {}): UseNoteCaptureReturn {
  const config: NoteCaptureConfig = { ...DEFAULT_CONFIG, ...options }

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
  const lastFreqRef = useRef<number | null>(null)
  const lastOnsetTimeRef = useRef<number>(0)
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      audioContext.createMediaStreamSource(stream).connect(analyser)

      const detector = PitchDetector.forFloat32Array(analyser.fftSize)
      const input = new Float32Array(detector.inputLength)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      streamRef.current = stream
      detectorRef.current = detector
      inputRef.current = input

      setIsListening(true)

      function detect() {
        if (!analyserRef.current || !detectorRef.current || !inputRef.current) return

        analyserRef.current.getFloatTimeDomainData(inputRef.current)
        const [pitch, clarity] = detectorRef.current.findPitch(inputRef.current, audioContext.sampleRate)
        const rms = computeRms(inputRef.current)

        setCurrentClarity(clarity)

        if (clarity > config.clarityThreshold && pitch > config.minFreq && pitch < config.maxFreq) {
          setCurrentFreq(pitch)

          if (detectOnset(pitch, clarity, rms, lastFreqRef.current, lastOnsetTimeRef.current, config)) {
            const now = performance.now()
            const { note, octave, cents } = freqToNoteInfo(pitch)
            const banjoStr = getClosestString(note, octave, cents)

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

            setNotes([...notesRef.current])
            onNoteDetectedRef.current?.(captured)
          }
        } else {
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
    lastFreqRef.current = null
    lastOnsetTimeRef.current = 0
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
