// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useBanjoSynth Hook
// React hook wrapping BanjoSynth lifecycle. Manages play/stop state and
// exposes currentBeat for driving tab diagram cursors.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react'
import { BanjoSynth, type TabNote } from '../engine/banjoSynth'

export interface UseBanjoSynthReturn {
  playNote: (stringNum: number, fret?: number) => void
  playRoll: (patternId: string, bpm: number, cycles?: number) => void
  playSection: (measures: { notes: TabNote[] }[], bpm: number) => void
  playSequence: (notes: TabNote[], bpm: number) => void
  stop: () => void
  isPlaying: boolean
  currentBeat: number | null
}

export function useBanjoSynth(): UseBanjoSynthReturn {
  const synthRef = useRef<BanjoSynth | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)

  // Lazily create synth on first use
  function getSynth(): BanjoSynth {
    if (!synthRef.current) {
      synthRef.current = new BanjoSynth()
    }
    return synthRef.current
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
    }
  }, [])

  const handleBeat = useCallback((beat: number) => {
    setCurrentBeat(beat)
  }, [])

  const stop = useCallback(() => {
    getSynth().stopCurrent()
    setIsPlaying(false)
    setCurrentBeat(null)
  }, [])

  const playNote = useCallback((stringNum: number, fret: number = 0) => {
    getSynth().playNote(stringNum, fret)
  }, [])

  const playRoll = useCallback((patternId: string, bpm: number, cycles: number = 2) => {
    const synth = getSynth()
    synth.stopCurrent()
    setIsPlaying(true)
    setCurrentBeat(0)

    const playback = synth.playRoll(patternId, bpm, cycles, handleBeat)
    playback.promise.then(() => {
      setIsPlaying(false)
      setCurrentBeat(null)
    })
  }, [handleBeat])

  const playSection = useCallback((measures: { notes: TabNote[] }[], bpm: number) => {
    const synth = getSynth()
    synth.stopCurrent()
    setIsPlaying(true)
    setCurrentBeat(0)

    const playback = synth.playSection(measures, bpm, handleBeat)
    playback.promise.then(() => {
      setIsPlaying(false)
      setCurrentBeat(null)
    })
  }, [handleBeat])

  const playSequence = useCallback((notes: TabNote[], bpm: number) => {
    const synth = getSynth()
    synth.stopCurrent()
    setIsPlaying(true)
    setCurrentBeat(0)

    const playback = synth.playSequence(notes, bpm, handleBeat)
    playback.promise.then(() => {
      setIsPlaying(false)
      setCurrentBeat(null)
    })
  }, [handleBeat])

  return { playNote, playRoll, playSection, playSequence, stop, isPlaying, currentBeat }
}
