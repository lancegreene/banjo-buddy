// ─────────────────────────────────────────────────────────────────────────────
// useTabPlayback — Playback state machine for LickPlayer.
// Owns: isPlaying, bpm, loop, countIn, synthMuted, clickOn, currentStep, phase.
// Does NOT drive the tab cursor — FretboardDiagram's internal interval does that
// while `autoPlay` is on. This hook coordinates count-in + metronome click around it.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'

export type PlaybackPhase = 'idle' | 'countin' | 'playing'

export interface UseTabPlaybackOptions {
  bpmDefault: number
  countInBeats?: number  // default 4
}

export interface UseTabPlaybackReturn {
  // State
  isPlaying: boolean
  phase: PlaybackPhase
  bpm: number
  loop: boolean
  countInOn: boolean
  synthMuted: boolean
  clickOn: boolean
  countInRemaining: number  // 4 → 3 → 2 → 1 → 0
  currentStep: number       // mirrored from FretboardDiagram.onActiveStepChange

  // Control
  play: () => void
  stop: () => void
  toggleLoop: () => void
  toggleCountIn: () => void
  toggleSynthMuted: () => void
  toggleClick: () => void
  setBpm: (bpm: number) => void
  setCurrentStep: (step: number) => void
}

export function useTabPlayback(options: UseTabPlaybackOptions): UseTabPlaybackReturn {
  const { bpmDefault, countInBeats = 4 } = options

  const [phase, setPhase] = useState<PlaybackPhase>('idle')
  const [bpm, setBpmState] = useState(bpmDefault)
  const [loop, setLoop] = useState(true)
  const [countInOn, setCountInOn] = useState(true)
  const [synthMuted, setSynthMuted] = useState(false)
  const [clickOn, setClickOn] = useState(true)
  const [countInRemaining, setCountInRemaining] = useState(0)
  const [currentStep, setCurrentStepState] = useState(-1)

  const countInIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clickAudioRef = useRef<AudioContext | null>(null)

  const playClickSound = useCallback(() => {
    if (!clickAudioRef.current) {
      clickAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = clickAudioRef.current
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1200, now)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  }, [])

  const stop = useCallback(() => {
    if (countInIntervalRef.current) { clearInterval(countInIntervalRef.current); countInIntervalRef.current = null }
    if (clickIntervalRef.current) { clearInterval(clickIntervalRef.current); clickIntervalRef.current = null }
    setPhase('idle')
    setCountInRemaining(0)
    setCurrentStepState(-1)
  }, [])

  const startMainPlayback = useCallback(() => {
    setPhase('playing')
  }, [])

  const play = useCallback(() => {
    if (phase !== 'idle') return

    if (countInOn) {
      setPhase('countin')
      setCountInRemaining(countInBeats)
      const tickMs = (60 / bpm) * 1000
      let remaining = countInBeats
      // Fire first click immediately
      if (clickOn) playClickSound()
      countInIntervalRef.current = setInterval(() => {
        remaining -= 1
        setCountInRemaining(remaining)
        if (remaining <= 0) {
          if (countInIntervalRef.current) { clearInterval(countInIntervalRef.current); countInIntervalRef.current = null }
          startMainPlayback()
        } else if (clickOn) {
          playClickSound()
        }
      }, tickMs)
    } else {
      startMainPlayback()
    }
  }, [phase, countInOn, bpm, clickOn, countInBeats, playClickSound, startMainPlayback])

  // Click-track while playing — ticks on every other step (half-note pulse at input BPM)
  useEffect(() => {
    if (phase !== 'playing' || !clickOn) return
    const tickMs = (60 / bpm) * 1000 * 2  // every 2 steps
    // Fire a click on entering the playing phase
    playClickSound()
    clickIntervalRef.current = setInterval(() => {
      playClickSound()
    }, tickMs)
    return () => {
      if (clickIntervalRef.current) { clearInterval(clickIntervalRef.current); clickIntervalRef.current = null }
    }
  }, [phase, clickOn, bpm, playClickSound])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countInIntervalRef.current) clearInterval(countInIntervalRef.current)
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current)
      clickAudioRef.current?.close()
    }
  }, [])

  return {
    isPlaying: phase === 'playing',
    phase,
    bpm,
    loop,
    countInOn,
    synthMuted,
    clickOn,
    countInRemaining,
    currentStep,
    play,
    stop,
    toggleLoop: () => setLoop(v => !v),
    toggleCountIn: () => setCountInOn(v => !v),
    toggleSynthMuted: () => setSynthMuted(v => !v),
    toggleClick: () => setClickOn(v => !v),
    setBpm: (next: number) => setBpmState(Math.max(40, Math.min(160, Math.round(next)))),
    setCurrentStep: setCurrentStepState,
  }
}
