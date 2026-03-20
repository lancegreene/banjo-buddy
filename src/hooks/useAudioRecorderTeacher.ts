// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useAudioRecorderTeacher Hook
// Audio-only recording for teacher demo clips. Separate from the practice mic.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'

const MAX_DURATION_MS = 120_000 // 2 minutes max

function getSupportedAudioMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return 'audio/webm'
}

export interface UseAudioRecorderTeacherReturn {
  isRecording: boolean
  durationMs: number
  audioBlob: Blob | null
  audioUrl: string | null
  micLevel: number              // 0-1 RMS for level meter
  startMic: () => Promise<void>
  stopMic: () => void
  startRecording: () => void
  stopRecording: () => void
  clearRecording: () => void
  error: string | null
}

export function useAudioRecorderTeacher(): UseAudioRecorderTeacherReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const levelRafRef = useRef<number>(0)
  const mimeType = useRef(getSupportedAudioMimeType())

  const startMic = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up analyser for level meter
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser

      // Start level meter loop
      const buf = new Float32Array(analyser.fftSize)
      function updateLevel() {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        setMicLevel(Math.sqrt(sum / buf.length))
        levelRafRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied')
    }
  }, [])

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
    cancelAnimationFrame(levelRafRef.current)
    setMicLevel(0)
  }, [])

  const startRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return

    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
    chunksRef.current = []

    const mr = new MediaRecorder(stream, {
      mimeType: mimeType.current,
      audioBitsPerSecond: 128_000,
    })

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType.current })
      const url = URL.createObjectURL(blob)
      setAudioBlob(blob)
      setAudioUrl(url)
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoStopRef.current) clearTimeout(autoStopRef.current)
    }

    mediaRecorderRef.current = mr
    startTimeRef.current = Date.now()
    mr.start(100)

    setIsRecording(true)
    setDurationMs(0)
    timerRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current)
    }, 200)

    autoStopRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, MAX_DURATION_MS)
  }, [audioUrl])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
  }, [])

  const clearRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDurationMs(0)
    chunksRef.current = []
  }, [audioUrl])

  return {
    isRecording,
    durationMs,
    audioBlob,
    audioUrl,
    micLevel,
    startMic,
    stopMic,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  }
}
