// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Audio Recorder Component
// Inline panel for Practice Session. Record, playback, waveform, save to DB.
// Shares the MediaStream from useNoteCapture — no second mic permission needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useCallback } from 'react'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { saveRecording as saveRecordingToDb } from '../../engine/recordingService'

interface AudioRecorderProps {
  skillId: string
  sessionItemId?: string   // link recording to a session item if available
  bpm?: number | null
  analyserRef: React.RefObject<AnalyserNode | null>
  streamRef: React.RefObject<MediaStream | null>
  onSaved?: (recordingId: string) => void
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function AudioRecorder({
  skillId,
  sessionItemId,
  bpm,
  analyserRef,
  streamRef,
  onSaved,
}: AudioRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)

  const {
    isRecording,
    durationMs,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder()

  // Draw waveform while recording
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = 2
    ctx.strokeStyle = '#4a9eff'
    ctx.beginPath()

    const sliceWidth = width / bufferLength
    let x = 0
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * height) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    animFrameRef.current = requestAnimationFrame(drawWaveform)
  }, [analyserRef])

  useEffect(() => {
    if (isRecording) {
      drawWaveform()
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isRecording, drawWaveform])

  // After recording stops, draw the static waveform from the blob
  useEffect(() => {
    if (!audioBlob || isRecording) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const ac = new AudioContext()
        const decoded = await ac.decodeAudioData(reader.result as ArrayBuffer)
        const data = decoded.getChannelData(0)
        const { width, height } = canvas
        const step = Math.floor(data.length / width)
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, width, height)
        ctx.strokeStyle = '#7ed321'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < width; i++) {
          const amp = data[i * step] ?? 0
          const y = (height / 2) + amp * (height / 2)
          if (i === 0) ctx.moveTo(i, y)
          else ctx.lineTo(i, y)
        }
        ctx.stroke()
        ac.close()
      } catch { /* ignore decode errors on unsupported formats */ }
    }
    reader.readAsArrayBuffer(audioBlob)
  }, [audioBlob, isRecording])

  async function handleSave() {
    if (!audioBlob) return
    const id = await saveRecordingToDb(
      sessionItemId ?? '',
      skillId,
      audioBlob,
      Math.round(durationMs / 1000),
      bpm ?? null
    )
    onSaved?.(id)
  }

  return (
    <div className="audio-recorder">
      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        className="recorder-waveform"
        width={448}
        height={60}
      />

      {/* Duration display */}
      <div className="recorder-time">
        {formatTime(durationMs)}
      </div>

      {/* Controls */}
      <div className="recorder-controls">
        {!isRecording && !audioBlob && (
          <button
            className="play-btn"
            onClick={() => streamRef.current && startRecording(streamRef.current)}
            disabled={!streamRef.current}
          >
            ● Record
          </button>
        )}
        {isRecording && (
          <button className="play-btn play-btn-stop" onClick={stopRecording}>
            ■ Stop
          </button>
        )}
        {audioBlob && audioUrl && (
          <>
            <audio controls src={audioUrl} className="recorder-playback" />
            <div className="recorder-save-row">
              <button className="play-btn" onClick={handleSave}>
                💾 Save to log
              </button>
              <button className="tuner-reset-btn" onClick={clearRecording}>
                Discard
              </button>
            </div>
          </>
        )}
      </div>

      {!streamRef.current && !isRecording && (
        <div className="roll-waiting">Start the Roll or Lick detector first to enable recording</div>
      )}
    </div>
  )
}
