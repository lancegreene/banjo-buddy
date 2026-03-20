// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useVideoRecorder Hook
// Manages its own getUserMedia stream for camera+mic video recording.
// Separate from useAudioRecorder which reuses the mic stream from useNoteCapture.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'

const MAX_DURATION_MS = 120_000 // 2 minutes max

function getSupportedVideoMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return 'video/webm'
}

export interface UseVideoRecorderReturn {
  isRecording: boolean
  durationMs: number
  videoBlob: Blob | null
  videoUrl: string | null
  previewStream: MediaStream | null
  startCamera: () => Promise<void>
  stopCamera: () => void
  startRecording: () => void
  stopRecording: () => void
  clearRecording: () => void
  error: string | null
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mimeType = useRef(getSupportedVideoMimeType())

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      })
      streamRef.current = stream
      setPreviewStream(stream)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setPreviewStream(null)
    }
  }, [])

  const startRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return

    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoBlob(null)
    setVideoUrl(null)
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
      setVideoBlob(blob)
      setVideoUrl(url)
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

    // Auto-stop at max duration
    autoStopRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, MAX_DURATION_MS)
  }, [videoUrl])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
  }, [])

  const clearRecording = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoBlob(null)
    setVideoUrl(null)
    setDurationMs(0)
    chunksRef.current = []
  }, [videoUrl])

  return {
    isRecording,
    durationMs,
    videoBlob,
    videoUrl,
    previewStream,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  }
}
