import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

const MIN_BPM = 40
const MAX_BPM = 220
const BPM_STEP = 5

interface MetronomeProps {
  controlledBpm?: number  // when set, overrides internal BPM state
}

// ─── SVG Metronome Illustration ───────────────────────────────────────────────

function MetronomeBody({ bpm, isRunning, beat }: { bpm: number; isRunning: boolean; beat: number }) {
  // Pendulum swing duration = one beat in seconds
  const swingDuration = 60 / bpm

  // BPM tick marks on the face — positioned along the center strip
  const bpmTicks = [40, 60, 80, 100, 120, 144, 176, 208]

  return (
    <div className="metro-body">
      <svg className="metro-svg" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
        {/* Wooden base */}
        <path d="M 30 250 L 170 250 L 175 270 Q 175 278 167 278 L 33 278 Q 25 278 25 270 Z"
          fill="url(#woodGrain)" stroke="#8B6914" strokeWidth="1" />

        {/* Main pyramid body */}
        <path d="M 56 250 L 85 32 Q 100 20 115 32 L 144 250 Z"
          fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />

        {/* Inner face plate — dark recessed area */}
        <path d="M 62 245 L 88 48 Q 100 38 112 48 L 138 245 Z"
          fill="#111" stroke="#2a2a2a" strokeWidth="0.5" />

        {/* Center scale strip */}
        <rect x="95" y="55" width="10" height="185" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />

        {/* BPM scale markings */}
        {bpmTicks.map((t, i) => {
          // Map BPM to Y position: 40 BPM at bottom (y≈230), 208 at top (y≈65)
          const y = 230 - (i / (bpmTicks.length - 1)) * 165
          const isHighlight = Math.abs(bpm - t) < BPM_STEP
          return (
            <g key={t}>
              <line x1="87" y1={y} x2="113" y2={y}
                stroke={isHighlight ? '#f5a623' : '#555'} strokeWidth={isHighlight ? 1.2 : 0.6} />
              <text x="82" y={y + 3} textAnchor="end"
                fill={isHighlight ? '#f5a623' : '#666'} fontSize={isHighlight ? '8' : '7'}
                fontWeight={isHighlight ? '700' : '400'}
                fontFamily="system-ui, sans-serif">
                {t}
              </text>
            </g>
          )
        })}

        {/* Pivot point at top */}
        <circle cx="100" cy="38" r="4" fill="#888" stroke="#555" strokeWidth="1" />

        {/* Pendulum arm + weight — swings from pivot */}
        <g
          className={`metro-pendulum ${isRunning ? 'metro-pendulum-swinging' : ''}`}
          style={{
            transformOrigin: '100px 38px',
            animationDuration: isRunning ? `${swingDuration}s` : undefined,
          }}
        >
          {/* Arm */}
          <line x1="100" y1="38" x2="100" y2="230" stroke="#c0c0c0" strokeWidth="2.5"
            strokeLinecap="round" />
          {/* Weight (slider) — position based on BPM: higher BPM = weight closer to pivot */}
          {(() => {
            const weightY = 80 + ((MAX_BPM - bpm) / (MAX_BPM - MIN_BPM)) * 130
            return (
              <>
                <rect x="91" y={weightY - 8} width="18" height="16" rx="2"
                  fill="#d4af37" stroke="#b8960c" strokeWidth="1" />
                <line x1="93" y1={weightY - 2} x2="107" y2={weightY - 2}
                  stroke="#c9a020" strokeWidth="0.5" />
                <line x1="93" y1={weightY + 2} x2="107" y2={weightY + 2}
                  stroke="#c9a020" strokeWidth="0.5" />
              </>
            )
          })()}
        </g>

        {/* Top cap / crown */}
        <path d="M 88 32 Q 100 18 112 32" fill="#333" stroke="#444" strokeWidth="1" />

        {/* Beat flash overlay — pulses on accent */}
        {isRunning && beat === 0 && (
          <rect x="62" y="245" width="76" height="4" rx="1" fill="#f5a623" opacity="0.7">
            <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" fill="freeze" />
          </rect>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="woodGrain" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8943e" />
            <stop offset="20%" stopColor="#daa74a" />
            <stop offset="40%" stopColor="#c8943e" />
            <stop offset="60%" stopColor="#b8842e" />
            <stop offset="80%" stopColor="#daa74a" />
            <stop offset="100%" stopColor="#c8943e" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

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
      {/* Classic metronome illustration with swinging pendulum */}
      <MetronomeBody bpm={bpm} isRunning={isRunning} beat={beat} />

      {/* Beat indicator dots */}
      <div className="metro-beat-row">
        {beatDots.map((i) => (
          <div
            key={i}
            className={`metro-dot ${isRunning && beat === i ? 'metro-dot-active' : ''} ${i === 0 ? 'metro-dot-accent' : ''}`}
          />
        ))}
      </div>

      {/* BPM display with +/- */}
      <div className="metro-bpm-row">
        <button className="metro-adj-btn" onClick={() => updateBpm(bpm - BPM_STEP)} aria-label="Decrease BPM">−</button>
        <div className="metro-bpm-center">
          <input
            type="number"
            className="metro-bpm-input"
            value={inputBpm}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={MIN_BPM}
            max={MAX_BPM}
            aria-label="BPM"
          />
          <span className="metro-bpm-label">BPM</span>
        </div>
        <button className="metro-adj-btn" onClick={() => updateBpm(bpm + BPM_STEP)} aria-label="Increase BPM">+</button>
      </div>

      {/* Slider */}
      <input
        type="range"
        className="metro-slider"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => updateBpm(parseInt(e.target.value))}
        aria-label="BPM slider"
      />

      {/* Time signature */}
      <div className="metro-timesig-row">
        {[2, 3, 4, 6].map((n) => (
          <button
            key={n}
            className={`metro-timesig-btn ${beatsPerMeasure === n ? 'metro-timesig-active' : ''}`}
            onClick={() => { setBeatsPerMeasure(n); beatRef.current = 0 }}
          >
            {n}/4
          </button>
        ))}
      </div>

      {/* Play / Stop + Tap */}
      <div className="metro-actions">
        <button
          className={`metro-play-btn ${isRunning ? 'metro-play-btn-active' : ''}`}
          onClick={toggle}
          aria-label={isRunning ? 'Stop metronome' : 'Start metronome'}
        >
          {isRunning ? '■' : '▶'}
        </button>
        <button className="metro-tap-btn" onClick={handleTap} aria-label="Tap tempo">
          TAP
        </button>
      </div>

      {/* Presets */}
      <div className="metro-presets">
        {[60, 80, 100, 120, 140, 160].map((preset) => (
          <button
            key={preset}
            className={`metro-preset ${bpm === preset ? 'metro-preset-active' : ''}`}
            onClick={() => updateBpm(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
