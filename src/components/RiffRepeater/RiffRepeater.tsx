import { useState, useRef, useEffect, useCallback } from 'react'
import { SpeedControl } from './SpeedControl'

interface Props {
  audioBlob: Blob | null
  onScore?: (accuracy: number) => void
}

export function RiffRepeater({ audioBlob, onScore }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopStart, setLoopStart] = useState(0)
  const [loopEnd, setLoopEnd] = useState(1)
  const [speed, setSpeed] = useState(100)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string>('')

  useEffect(() => {
    if (!audioBlob) return
    const url = URL.createObjectURL(audioBlob)
    urlRef.current = url
    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      setLoopEnd(audio.duration)
    })

    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime >= loopEnd) {
        audio.currentTime = loopStart
      }
    })

    return () => {
      audio.pause()
      URL.revokeObjectURL(url)
    }
  }, [audioBlob]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed / 100
    }
  }, [speed])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.currentTime = loopStart
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, loopStart])

  if (!audioBlob) {
    return (
      <div className="riff-repeater-empty">
        <p>Record a clip first to use the Loop Trainer.</p>
      </div>
    )
  }

  return (
    <div className="riff-repeater">
      <h3 className="riff-repeater-title">Loop Trainer</h3>

      {/* Waveform placeholder - wavesurfer.js integration */}
      <div className="riff-repeater-waveform">
        <div className="riff-repeater-waveform-placeholder">
          <div
            className="riff-repeater-loop-region"
            style={{
              left: `${(loopStart / duration) * 100}%`,
              width: `${((loopEnd - loopStart) / duration) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Loop markers */}
      <div className="riff-repeater-markers">
        <label className="riff-repeater-marker">
          A: <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={loopStart}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (v < loopEnd - 0.5) setLoopStart(v)
            }}
          />
          {loopStart.toFixed(1)}s
        </label>
        <label className="riff-repeater-marker">
          B: <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={loopEnd}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (v > loopStart + 0.5) setLoopEnd(v)
            }}
          />
          {loopEnd.toFixed(1)}s
        </label>
      </div>

      <SpeedControl speed={speed} onSpeedChange={setSpeed} />

      <div className="riff-repeater-controls">
        <button className="btn btn-primary" onClick={togglePlay}>
          {isPlaying ? 'Pause' : 'Play Loop'}
        </button>
      </div>
    </div>
  )
}
