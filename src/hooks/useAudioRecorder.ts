// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useAudioRecorder Hook
// Wraps MediaRecorder. Shares the stream from useNoteCapture to avoid
// requesting a second mic permission.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export interface UseAudioRecorderReturn {
  isRecording: boolean
  durationMs: number
  audioBlob: Blob | null
  audioUrl: string | null
  startRecording: (stream: MediaStream) => void
  stopRecording: () => void
  clearRecording: () => void
  mimeType: string
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef = useRef<string>(getSupportedMimeType())

  const startRecording = useCallback((stream: MediaStream) => {
    // Revoke any previous object URL
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    chunksRef.current = []

    const mr = new MediaRecorder(stream, {
      mimeType: mimeTypeRef.current || undefined,
      audioBitsPerSecond: 128000,
    })

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setAudioBlob(blob)
      setAudioUrl(url)
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }

    mediaRecorderRef.current = mr
    startTimeRef.current = Date.now()
    mr.start(100) // 100ms timeslices

    setIsRecording(true)
    setDurationMs(0)
    timerRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current)
    }, 200)
  }, [audioUrl])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
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
    startRecording,
    stopRecording,
    clearRecording,
    mimeType: mimeTypeRef.current,
  }
}
