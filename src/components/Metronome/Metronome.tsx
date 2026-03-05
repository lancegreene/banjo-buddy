import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

const MIN_BPM = 40
const MAX_BPM = 220
const BPM_STEP = 5

interface MetronomeProps {
  controlledBpm?: number  // when set, overrides internal BPM state
}

export function Metronome({ controlledBpm }: MetronomeProps = {}) {
  const [bpm, setBpm] = useState(controlledBpm ?? 80)
  const [isRunning, setIsRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [inputBpm, setInputBpm] = useState('80')

  const loopRef = useRef<Tone.Loop | null>(null)
  const synthRef = useRef<Tone.Synth | null>(null)
  const accentSynthRef = useRef<Tone.Synth | null>(null)
  const beatRef = useRef(0)

  // Sync controlled BPM from parent
  useEffect(() => {
    if (controlledBpm !== undefined) {
      updateBpm(controlledBpm)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledBpm])

  // Tap tempo
  const tapTimesRef = useRef<number[]>([])
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: -6,
    }).toDestination()

    accentSynthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: 0,
    }).toDestination()

    return () => {
      stop()
      synthRef.current?.dispose()
      accentSynthRef.current?.dispose()
    }
  }, [])

  const stop = useCallback(() => {
    loopRef.current?.stop()
    loopRef.current?.dispose()
    loopRef.current = null
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    beatRef.current = 0
    setBeat(0)
    setIsRunning(false)
  }, [])

  const start = useCallback(async () => {
    await Tone.start()
    Tone.getTransport().bpm.value = bpm
    beatRef.current = 0

    loopRef.current = new Tone.Loop((time) => {
      const currentBeat = beatRef.current % beatsPerMeasure
      if (currentBeat === 0) {
        accentSynthRef.current?.triggerAttackRelease('A5', '32n', time)
      } else {
        synthRef.current?.triggerAttackRelease('E5', '32n', time)
      }
      beatRef.current++
      // Schedule UI update on next frame
      Tone.getDraw().schedule(() => {
        setBeat(beatRef.current % beatsPerMeasure)
      }, time)
    }, '4n')

    loopRef.current.start(0)
    Tone.getTransport().start()
    setIsRunning(true)
  }, [bpm, beatsPerMeasure])

  function toggle() {
    if (isRunning) {
      stop()
    } else {
      start()
    }
  }

  function updateBpm(newBpm: number) {
    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, newBpm))
    setBpm(clamped)
    setInputBpm(String(clamped))
    if (isRunning) {
      Tone.getTransport().bpm.value = clamped
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputBpm(e.target.value)
    const n = parseInt(e.target.value)
    if (!isNaN(n)) updateBpm(n)
  }

  function handleInputBlur() {
    const n = parseInt(inputBpm)
    if (isNaN(n)) setInputBpm(String(bpm))
    else updateBpm(n)
  }

  function handleTap() {
    const now = Date.now()
    tapTimesRef.current.push(now)

    // Reset if gap > 3 seconds
    if (tapTimesRef.current.length > 1) {
      const last = tapTimesRef.current[tapTimesRef.current.length - 2]
      if (now - last > 3000) {
        tapTimesRef.current = [now]
        return
      }
    }

    // Keep last 8 taps
    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current = tapTimesRef.current.slice(-8)
    }

    // Need at least 2 taps
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1])
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      updateBpm(Math.round(60000 / avg))
    }

    // Auto-clear taps after 3 seconds of inactivity
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    tapTimeoutRef.current = setTimeout(() => {
      tapTimesRef.current = []
    }, 3000)
  }

  const beatDots = Array.from({ length: beatsPerMeasure }, (_, i) => i)

  return (
    <div className="metronome">
      <h2 className="tool-title">Metronome</h2>

      {/* Beat indicator */}
      <div className="beat-dots">
        {beatDots.map((i) => (
          <div
            key={i}
            className={`beat-dot ${isRunning && beat === i ? 'beat-dot-active' : ''} ${i === 0 ? 'beat-dot-accent' : ''}`}
          />
        ))}
      </div>

      {/* BPM display */}
      <div className="bpm-display">
        <button className="bpm-adj-btn" onClick={() => updateBpm(bpm - BPM_STEP)} aria-label="Decrease BPM">−</button>
        <div className="bpm-input-wrap">
          <input
            type="number"
            className="bpm-input"
            value={inputBpm}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={MIN_BPM}
            max={MAX_BPM}
            aria-label="BPM"
          />
          <span className="bpm-label">BPM</span>
        </div>
        <button className="bpm-adj-btn" onClick={() => updateBpm(bpm + BPM_STEP)} aria-label="Increase BPM">+</button>
      </div>

      {/* BPM slider */}
      <input
        type="range"
        className="bpm-slider"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => updateBpm(parseInt(e.target.value))}
        aria-label="BPM slider"
      />
      <div className="bpm-range-labels">
        <span>{MIN_BPM}</span>
        <span>{MAX_BPM}</span>
      </div>

      {/* Time signature */}
      <div className="time-sig-row">
        <span className="time-sig-label">Beats per measure:</span>
        {[2, 3, 4, 6].map((n) => (
          <button
            key={n}
            className={`time-sig-btn ${beatsPerMeasure === n ? 'active' : ''}`}
            onClick={() => { setBeatsPerMeasure(n); beatRef.current = 0 }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="metronome-controls">
        <button
          className={`play-btn ${isRunning ? 'play-btn-stop' : ''}`}
          onClick={toggle}
          aria-label={isRunning ? 'Stop metronome' : 'Start metronome'}
        >
          {isRunning ? '■ Stop' : '▶ Start'}
        </button>
        <button className="tap-btn" onClick={handleTap} aria-label="Tap tempo">
          Tap
        </button>
      </div>

      {/* Common BPM presets */}
      <div className="bpm-presets">
        <span className="presets-label">Presets</span>
        {[60, 80, 100, 120, 140, 160].map((preset) => (
          <button
            key={preset}
            className={`preset-btn ${bpm === preset ? 'active' : ''}`}
            onClick={() => updateBpm(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
