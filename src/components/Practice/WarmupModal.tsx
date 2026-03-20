// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Warmup Modal
// Full-screen guided warm-up: 3 rolls × 3 BPM tiers (5 min total).
// Auto-advances through each segment — user just plays along.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { ROLL_MAP } from '../../data/rollPatterns'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'

const WARMUP_ROLLS = ['forward_roll', 'backward_roll', 'mixed_roll'] as const
const BPM_TIERS = [80, 100, 120] as const
const TOTAL_DURATION = 5 * 60 // 5 minutes
const SEGMENT_COUNT = WARMUP_ROLLS.length * BPM_TIERS.length // 9
const SEGMENT_DURATION = TOTAL_DURATION / SEGMENT_COUNT // ~33.3s

interface WarmupModalProps {
  onComplete: () => void
  onSkip: () => void
}

export function WarmupModal({ onComplete, onSkip }: WarmupModalProps) {
  const [started, setStarted] = useState(false)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [segmentElapsed, setSegmentElapsed] = useState(0)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const [beat, setBeat] = useState(0)
  const [finished, setFinished] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loopRef = useRef<Tone.Loop | null>(null)
  const synthRef = useRef<Tone.Synth | null>(null)
  const accentSynthRef = useRef<Tone.Synth | null>(null)
  const beatRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const rollIndex = Math.min(Math.floor(segmentIndex / BPM_TIERS.length), WARMUP_ROLLS.length - 1)
  const bpmIndex = segmentIndex % BPM_TIERS.length
  const currentRollId = WARMUP_ROLLS[rollIndex]
  const currentBpm = BPM_TIERS[bpmIndex]
  const currentRoll = ROLL_MAP.get(currentRollId)

  // Init Tone synths
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
      stopMetronome()
      synthRef.current?.dispose()
      accentSynthRef.current?.dispose()
    }
  }, [])

  const stopMetronome = useCallback(() => {
    loopRef.current?.stop()
    loopRef.current?.dispose()
    loopRef.current = null
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    beatRef.current = 0
    setBeat(0)
  }, [])

  const startMetronome = useCallback((bpm: number) => {
    stopMetronome()
    Tone.getTransport().bpm.value = bpm
    beatRef.current = 0

    loopRef.current = new Tone.Loop((time) => {
      const b = beatRef.current % 4
      if (b === 0) {
        accentSynthRef.current?.triggerAttackRelease('A5', '32n', time)
      } else {
        synthRef.current?.triggerAttackRelease('E5', '32n', time)
      }
      beatRef.current++
      Tone.getDraw().schedule(() => {
        setBeat(beatRef.current % 4)
      }, time)
    }, '4n')

    loopRef.current.start(0)
    Tone.getTransport().start()
  }, [stopMetronome])

  // Update metronome BPM when segment changes
  useEffect(() => {
    if (started && !finished) {
      startMetronome(currentBpm)
    }
  }, [segmentIndex, started, finished])

  // Main timer
  useEffect(() => {
    if (!started || finished) return

    timerRef.current = setInterval(() => {
      setTotalElapsed(prev => {
        const next = prev + 1
        if (next >= TOTAL_DURATION) {
          clearInterval(timerRef.current!)
          stopMetronome()
          setFinished(true)
          return TOTAL_DURATION
        }
        return next
      })
      setSegmentElapsed(prev => {
        const next = prev + 1
        if (next >= SEGMENT_DURATION) {
          setSegmentIndex(si => Math.min(si + 1, SEGMENT_COUNT - 1))
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started, finished, stopMetronome])

  async function handleBegin() {
    await Tone.start()
    setStarted(true)
  }

  function handleEnd() {
    if (timerRef.current) clearInterval(timerRef.current)
    stopMetronome()
    onComplete()
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = Math.round(sec) % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const segmentProgress = (segmentElapsed / SEGMENT_DURATION) * 100
  const totalProgress = (totalElapsed / TOTAL_DURATION) * 100
  const timeRemaining = TOTAL_DURATION - totalElapsed

  return (
    <div className="tool-modal-backdrop" onClick={started ? undefined : onSkip}>
      <div className="tool-modal warmup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tool-modal-header">
          <span className="warmup-topbar-title">Warm Up</span>
          {started && !finished && (
            <span className="warmup-topbar-time">{formatTime(timeRemaining)} remaining</span>
          )}
          <button className="warmup-skip-btn" onClick={started ? handleEnd : onSkip}>
            {started ? 'End & Start Session →' : 'Skip →'}
          </button>
        </div>
        <div className="tool-modal-body">

        {/* ── Not started yet ── */}
        {!started && (
          <div className="warmup-intro">
            <h1 className="warmup-intro-title">Ready to warm up?</h1>
            <p className="warmup-intro-desc">
              5 minutes of roll practice to loosen your fingers before you play.
              The metronome will guide you through three rolls at increasing tempos.
            </p>

            <div className="warmup-plan">
              {WARMUP_ROLLS.map((rollId, i) => {
                const roll = ROLL_MAP.get(rollId)
                return (
                  <div key={rollId} className="warmup-plan-row">
                    <span className="warmup-plan-num">{i + 1}</span>
                    <div className="warmup-plan-info">
                      <span className="warmup-plan-name">{roll?.name ?? rollId}</span>
                      <span className="warmup-plan-bpms">{BPM_TIERS.join(' → ')} BPM</span>
                    </div>
                    <span className="warmup-plan-duration">~{Math.round(SEGMENT_DURATION * BPM_TIERS.length / 60)}m</span>
                  </div>
                )
              })}
            </div>

            <button className="btn btn-primary warmup-begin-btn" onClick={handleBegin}>
              Begin Warmup
            </button>
          </div>
        )}

        {/* ── Active warmup ── */}
        {started && !finished && (
          <div className="warmup-active">
            {/* Current roll + BPM */}
            <div className="warmup-current">
              <h1 className="warmup-current-roll">{currentRoll?.name}</h1>
              <div className="warmup-current-bpm">{currentBpm} BPM</div>
            </div>

            {/* Total progress */}
            <div className="warmup-progress-track">
              <div className="warmup-progress-fill" style={{ width: `${totalProgress}%` }} />
              {Array.from({ length: SEGMENT_COUNT - 1 }, (_, i) => (
                <div
                  key={i}
                  className={`warmup-segment-marker ${(i + 1) % BPM_TIERS.length === 0 ? 'warmup-segment-marker-major' : ''}`}
                  style={{ left: `${((i + 1) / SEGMENT_COUNT) * 100}%` }}
                />
              ))}
            </div>

            {/* Segment map */}
            <div className="warmup-segments">
              {WARMUP_ROLLS.map((rollId, ri) => {
                const roll = ROLL_MAP.get(rollId)
                return (
                  <div key={rollId} className={`warmup-seg-group ${ri === rollIndex ? 'warmup-seg-group-active' : ri < rollIndex ? 'warmup-seg-group-done' : ''}`}>
                    <span className="warmup-seg-label">{roll?.name}</span>
                    <div className="warmup-seg-tiers">
                      {BPM_TIERS.map((bpm, bi) => {
                        const idx = ri * BPM_TIERS.length + bi
                        return (
                          <span
                            key={bpm}
                            className={`warmup-seg-tier ${idx === segmentIndex ? 'warmup-seg-tier-active' : idx < segmentIndex ? 'warmup-seg-tier-done' : ''}`}
                          >
                            {bpm}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Segment countdown */}
            <div className="warmup-seg-countdown">
              <div className="warmup-seg-progress">
                <div className="warmup-seg-progress-fill" style={{ width: `${segmentProgress}%` }} />
              </div>
              <span className="warmup-seg-time">{Math.round(SEGMENT_DURATION - segmentElapsed)}s</span>
            </div>

            {/* Beat dots */}
            <div className="warmup-beat-row">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`warmup-beat-dot ${beat === i ? 'warmup-beat-dot-active' : ''} ${i === 0 ? 'warmup-beat-dot-accent' : ''}`} />
              ))}
            </div>

            {/* Roll chart — the main visual focus */}
            <div className="warmup-chart">
              {currentRoll && (
                <BanjoTabDiagram
                  strings={currentRoll.strings}
                  fingers={currentRoll.fingers}
                  label={`${currentRoll.name} — ${currentBpm} BPM`}
                />
              )}
            </div>

            {/* Instruction */}
            <p className="warmup-hint">Play along with the metronome. The pattern will advance automatically.</p>
          </div>
        )}

        {/* ── Finished ── */}
        {finished && (
          <div className="warmup-done">
            <h1 className="warmup-done-title">Warmed up!</h1>
            <p className="warmup-done-desc">Your fingers are ready. Let's practice.</p>
            <button className="btn btn-primary warmup-begin-btn" onClick={onComplete}>
              Start Session
            </button>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}
