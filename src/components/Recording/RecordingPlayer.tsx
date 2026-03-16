// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Recording Player
// Audio playback with tab diagram position sync via requestAnimationFrame.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Recording } from '../../db/db'

interface RecordingPlayerProps {
  recording: Recording
  onClose: () => void
}

export function RecordingPlayer({ recording, onClose }: RecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(recording.durationSeconds)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const url = URL.createObjectURL(recording.audioBlob)
    urlRef.current = url
    return () => {
      URL.revokeObjectURL(url)
      cancelAnimationFrame(rafRef.current)
    }
  }, [recording])

  const tick = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      cancelAnimationFrame(rafRef.current)
    } else {
      audioRef.current.play()
      rafRef.current = requestAnimationFrame(tick)
    }
    setIsPlaying(!isPlaying)
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const dateStr = new Date(recording.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="recording-player">
      <div className="recording-player-header">
        <span className="recording-player-date">{dateStr}</span>
        {recording.bpm && <span className="recording-player-bpm">{recording.bpm} BPM</span>}
        <button className="recording-player-close" onClick={onClose}>✕</button>
      </div>

      <audio
        ref={audioRef}
        src={urlRef.current ?? undefined}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration)
        }}
        onEnded={() => {
          setIsPlaying(false)
          cancelAnimationFrame(rafRef.current)
        }}
      />

      <div className="recording-player-controls">
        <button className="recording-player-play" onClick={togglePlay}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="recording-player-progress">
          <div className="recording-player-track">
            <div className="recording-player-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="recording-player-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
