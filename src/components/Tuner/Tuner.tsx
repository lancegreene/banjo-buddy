import { useState, useRef, useCallback, useEffect } from 'react'
import { PitchDetector } from 'pitchy'
import { BANJO_STRINGS, freqToNoteInfo, freqFromNoteOctave } from '../../engine/noteCapture'

// Must stay within ±10¢ for 12 consecutive frames (~0.2 s at 60 fps) to lock
const IN_TUNE_CENTS = 10
const LOCK_FRAMES = 12

// Tuner uses a looser open-string match threshold (0.1) for maximum string detection
function getClosestString(note: string, octave: number, cents: number) {
  const freq = freqFromNoteOctave(note, octave, cents)
  let closest = BANJO_STRINGS[0]
  let minDiff = Infinity
  for (const s of BANJO_STRINGS) {
    const diff = Math.abs(Math.log2(freq / s.freq))
    if (diff < minDiff) { minDiff = diff; closest = s }
  }
  return minDiff < 0.1 ? closest : null
}

// ─── SVG Gauge Arc Helpers ────────────────────────────────────────────────────

const GAUGE_RADIUS = 80
const GAUGE_CX = 100
const GAUGE_CY = 95
const GAUGE_STROKE = 14
// Arc spans from -180° (left) to 0° (right), i.e. top semicircle
const ARC_START_DEG = -180
const ARC_END_DEG = 0

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg)
  const e = polarToXY(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

// Map cents (-50 to +50) to angle (-180° to 0°)
function centsToAngle(c: number): number {
  const clamped = Math.max(-50, Math.min(50, c))
  // -50 → -180°, 0 → -90°, +50 → 0°
  return ARC_START_DEG + ((clamped + 50) / 100) * (ARC_END_DEG - ARC_START_DEG)
}

// Gauge arc segments: [startFraction, endFraction, color]
const GAUGE_SEGMENTS: [number, number, string][] = [
  [0.00, 0.20, '#e74c3c'], // far flat — red
  [0.20, 0.35, '#f5a623'], // flat — yellow
  [0.35, 0.65, '#27ae60'], // in tune — green
  [0.65, 0.80, '#f5a623'], // sharp — yellow
  [0.80, 1.00, '#e74c3c'], // far sharp — red
]

function GaugeArc() {
  return (
    <>
      {GAUGE_SEGMENTS.map(([start, end, color], i) => {
        const startDeg = ARC_START_DEG + start * (ARC_END_DEG - ARC_START_DEG)
        const endDeg = ARC_START_DEG + end * (ARC_END_DEG - ARC_START_DEG)
        return (
          <path
            key={i}
            d={arcPath(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS, startDeg, endDeg)}
            fill="none"
            stroke={color}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="butt"
          />
        )
      })}
    </>
  )
}

function GaugeNeedle({ cents }: { cents: number }) {
  const angle = centsToAngle(cents)
  const tip = polarToXY(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS - GAUGE_STROKE / 2 - 2, angle)
  const base = polarToXY(GAUGE_CX, GAUGE_CY, 18, angle)
  return (
    <line
      className="tuner-gauge-needle"
      x1={base.x} y1={base.y}
      x2={tip.x} y2={tip.y}
    />
  )
}

// ─── Persistent reading type ──────────────────────────────────────────────────

interface GoodReading {
  note: string
  octave: number
  cents: number
  closestString: typeof BANJO_STRINGS[0] | null
}

export function Tuner() {
  const [isListening, setIsListening] = useState(false)
  const [detectedNote, setDetectedNote] = useState<string | null>(null)
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null)
  const [cents, setCents] = useState(0)
  const [clarity, setClarity] = useState(0)
  const [closestString, setClosestString] = useState<typeof BANJO_STRINGS[0] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lockedStrings, setLockedStrings] = useState<Set<number>>(new Set())

  // Persistent last-good-reading — survives low-clarity frames
  const [lastGood, setLastGood] = useState<GoodReading | null>(null)
  const lastGoodRef = useRef<GoodReading | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null)
  const inputRef = useRef<Float32Array | null>(null)
  const lockedRef = useRef<Set<number>>(new Set())
  const inTuneFrames = useRef<Map<number, number>>(new Map())
  const smoothCentsRef = useRef<number>(0)
  const lastStringRef = useRef<number | null>(null)

  const stopListening = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    streamRef.current = null
    smoothCentsRef.current = 0
    lastStringRef.current = null
    setIsListening(false)
    setDetectedNote(null)
    setClarity(0)
    setClosestString(null)
    // Clear persistent reading on stop
    setLastGood(null)
    lastGoodRef.current = null
  }, [])

  const startListening = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      })
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
        const [pitch, cl] = detectorRef.current.findPitch(inputRef.current, audioContext.sampleRate)

        if (cl > 0.80 && pitch > 60 && pitch < 1200) {
          const { note, octave, cents: c } = freqToNoteInfo(pitch)
          const closest = getClosestString(note, octave, c)
          if (closest?.string !== lastStringRef.current) {
            smoothCentsRef.current = c
            lastStringRef.current = closest?.string ?? null
          }
          smoothCentsRef.current = smoothCentsRef.current * 0.75 + c * 0.25
          const smoothCents = Math.round(smoothCentsRef.current)
          const currentlyInTune = Math.abs(smoothCents) <= IN_TUNE_CENTS

          if (closest && !lockedRef.current.has(closest.string)) {
            if (currentlyInTune) {
              const prev = inTuneFrames.current.get(closest.string) ?? 0
              const next = prev + 1
              inTuneFrames.current.set(closest.string, next)
              if (next >= LOCK_FRAMES) {
                lockedRef.current = new Set([...lockedRef.current, closest.string])
                setLockedStrings(new Set(lockedRef.current))
              }
            } else {
              inTuneFrames.current.set(closest.string, 0)
            }
          }

          setDetectedNote(note)
          setDetectedOctave(octave)
          setCents(smoothCents)
          setClarity(cl)
          setClosestString(closest)

          // Update persistent reading
          const reading: GoodReading = { note, octave, cents: smoothCents, closestString: closest }
          lastGoodRef.current = reading
          setLastGood(reading)
        } else {
          setClarity(cl)
        }

        animFrameRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
      setIsListening(false)
    }
  }, [])

  useEffect(() => () => stopListening(), [stopListening])

  function resetTuning() {
    lockedRef.current = new Set()
    inTuneFrames.current = new Map()
    setLockedStrings(new Set())
  }

  // Use lastGood for display so gauge persists between notes
  const display = lastGood
  const isTuned = clarity > 0.85 && detectedNote !== null
  const displayCents = display?.cents ?? 0
  const isInTune = Math.abs(displayCents) <= IN_TUNE_CENTS
  const isSharp = displayCents > IN_TUNE_CENTS
  const isCurrentLocked = display?.closestString ? lockedStrings.has(display.closestString.string) : false
  const allTuned = lockedStrings.size === BANJO_STRINGS.length

  // Display state for the gauge border glow
  let gaugeState: 'idle' | 'detecting' | 'in-tune' | 'locked' = 'idle'
  if (isListening && display) {
    if (isCurrentLocked) gaugeState = 'locked'
    else if (isInTune) gaugeState = 'in-tune'
    else gaugeState = 'detecting'
  }

  return (
    <div className="tuner">
      {/* Open string reference row */}
      <div className="string-reference">
        <span className="string-ref-label">Open strings</span>
        <div className="string-ref-list">
          {BANJO_STRINGS.map((s) => (
            <div
              key={s.string}
              className={[
                'string-ref-item',
                lockedStrings.has(s.string)               ? 'string-ref-locked'  : '',
                isTuned && closestString?.string === s.string &&
                !lockedStrings.has(s.string)               ? 'string-ref-active'  : '',
              ].join(' ')}
            >
              <span className="string-ref-num">{s.string}</span>
              {lockedStrings.has(s.string)
                ? <span className="string-ref-check">✓</span>
                : <span className="string-ref-note">{s.note}<sub>{s.octave}</sub></span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* All strings confirmed */}
      {allTuned && (
        <div className="tuner-all-done">
          All strings in tune!
        </div>
      )}

      {/* Snark-style gauge display — always rendered at full size */}
      <div className={`tuner-gauge tuner-gauge-${gaugeState}`}>
        {/* SVG semicircular gauge — always visible */}
        <svg className="tuner-gauge-svg" viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
          <GaugeArc />
          {display && !isCurrentLocked && <GaugeNeedle cents={displayCents} />}
          {/* Center dot */}
          <circle cx={GAUGE_CX} cy={GAUGE_CY} r="4" fill="#888" />
          {/* Tick marks at -50, 0, +50 */}
          {[-50, 0, 50].map((c) => {
            const a = centsToAngle(c)
            const outer = polarToXY(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS + GAUGE_STROKE / 2 + 2, a)
            const inner = polarToXY(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS + GAUGE_STROKE / 2 - 4, a)
            return (
              <line key={c} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="#555" strokeWidth="1.5" />
            )
          })}
        </svg>

        {/* Below the gauge: note info or status text */}
        {isCurrentLocked && display?.closestString ? (
          <div className="tuner-gauge-locked">
            <div className="tuner-gauge-locked-check">✓</div>
            <div className="tuner-gauge-locked-label">
              String {display.closestString.string} in tune
            </div>
          </div>
        ) : display ? (
          <>
            <div className={`tuner-gauge-note ${isInTune ? 'in-tune' : isSharp ? 'sharp' : 'flat'}`}>
              {display.note}
            </div>
            <div className={`tuner-gauge-cents ${isInTune ? 'in-tune' : isSharp ? 'sharp' : 'flat'}`}>
              {isInTune ? 'In Tune' : `${Math.abs(displayCents)}¢ ${isSharp ? 'sharp ▲' : 'flat ▼'}`}
            </div>
            {display.closestString && (
              <div className="tuner-gauge-string">
                String {display.closestString.string} — {display.closestString.note}{display.closestString.octave}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="tuner-gauge-note idle">—</div>
            <div className="tuner-gauge-cents idle">
              {isListening ? 'Listening…' : 'Tap Start Tuning'}
            </div>
          </>
        )}
      </div>

      {error && <div className="tuner-error">{error}</div>}

      <div className="tuner-actions">
        <button
          className={`play-btn ${isListening ? 'play-btn-stop' : ''}`}
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? '■ Stop' : '🎤 Start Tuning'}
        </button>
        {lockedStrings.size > 0 && (
          <button className="tuner-reset-btn" onClick={resetTuning}>
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
