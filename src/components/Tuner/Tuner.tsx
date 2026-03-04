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

export function Tuner() {
  const [isListening, setIsListening] = useState(false)
  const [detectedNote, setDetectedNote] = useState<string | null>(null)
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null)
  const [cents, setCents] = useState(0)
  const [clarity, setClarity] = useState(0)
  const [closestString, setClosestString] = useState<typeof BANJO_STRINGS[0] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Set of string numbers that have been confirmed in-tune (locked green)
  const [lockedStrings, setLockedStrings] = useState<Set<number>>(new Set())

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null)
  const inputRef = useRef<Float32Array | null>(null)
  // Refs to avoid stale closures inside the RAF loop
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
          // Use raw cents for string matching — smooth value lags on string switches
          const closest = getClosestString(note, octave, c)
          // Snap smoother when switching strings so lock counter starts from truth
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
                // Lock this string — update both ref (for loop) and state (for render)
                lockedRef.current = new Set([...lockedRef.current, closest.string])
                setLockedStrings(new Set(lockedRef.current))
              }
            } else {
              // Reset counter when out of tune
              inTuneFrames.current.set(closest.string, 0)
            }
          }

          setDetectedNote(note)
          setDetectedOctave(octave)
          setCents(smoothCents)
          setClarity(cl)
          setClosestString(closest)
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

  const isTuned = clarity > 0.85 && detectedNote !== null
  const isInTune = Math.abs(cents) <= IN_TUNE_CENTS
  const isSharp = cents > IN_TUNE_CENTS
  const isCurrentLocked = closestString ? lockedStrings.has(closestString.string) : false
  const allTuned = lockedStrings.size === BANJO_STRINGS.length

  // Derive display state for class-based styling
  type DisplayState = 'idle' | 'listening' | 'in-tune' | 'locked'
  let displayState: DisplayState = 'idle'
  if (isListening) {
    if (isCurrentLocked) displayState = 'locked'
    else if (isTuned && isInTune) displayState = 'in-tune'
    else displayState = 'listening'
  }

  return (
    <div className="tuner">
      <h2 className="tool-title">Tuner</h2>

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

      {/* Main display box */}
      <div className={`tuner-display tuner-display-${displayState}`}>
        {displayState === 'idle' && (
          <div className="tuner-waiting">Tap Start Tuning</div>
        )}

        {displayState === 'listening' && !isTuned && (
          <div className="tuner-waiting">Listening…</div>
        )}

        {/* Detecting a note, not yet in-tune */}
        {displayState === 'listening' && isTuned && (
          <>
            <div className="tuner-note">
              {detectedNote}<span className="tuner-octave">{detectedOctave}</span>
            </div>
            <div className={`tuner-cents ${isSharp ? 'sharp' : 'flat'}`}>
              {Math.abs(cents)}¢ {isSharp ? 'sharp ▲' : 'flat ▼'}
            </div>
            {closestString && (
              <div className="tuner-string-match">
                String {closestString.string} ({closestString.note}{closestString.octave})
              </div>
            )}
          </>
        )}

        {/* In tune — hold steady */}
        {displayState === 'in-tune' && (
          <>
            <div className="tuner-note">
              {detectedNote}<span className="tuner-octave">{detectedOctave}</span>
            </div>
            <div className="tuner-cents in-tune">Hold steady…</div>
            {closestString && (
              <div className="tuner-string-match">
                String {closestString.string} ({closestString.note}{closestString.octave})
              </div>
            )}
          </>
        )}

        {/* Locked — green confirmation */}
        {displayState === 'locked' && closestString && (
          <>
            <div className="tuner-locked-check">✓</div>
            <div className="tuner-locked-label">
              String {closestString.string} in tune
            </div>
          </>
        )}
      </div>

      {/* Cents needle — hidden when locked */}
      {isTuned && !isCurrentLocked && (
        <div className="cents-bar">
          <div className="cents-track">
            <div className="cents-center-mark" />
            <div
              className={`cents-needle ${isInTune ? 'in-tune' : ''}`}
              style={{ left: `calc(50% + ${Math.max(-50, Math.min(50, cents))}%)` }}
            />
          </div>
          <div className="cents-labels">
            <span>-50¢</span>
            <span>0</span>
            <span>+50¢</span>
          </div>
        </div>
      )}

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
