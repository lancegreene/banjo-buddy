// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Play-Along Component
// Combines synth playback + note detection + streaming song matcher.
// Reference plays through speakers while student plays along on their banjo.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { SONG_MAP, type Song } from '../../data/songLibrary'
import { type UseBanjoSynthReturn } from '../../hooks/useBanjoSynth'
import { useNoteCapture } from '../../hooks/useNoteCapture'
import { createSongMatcherState, advanceSongMatcher, type StreamingSongState } from '../../engine/streamingSongMatcher'
import { SongTabDiagram } from '../BanjoTabDiagram/SongTabDiagram'
import { ListenButton } from './ListenButton'

type PlayAlongPhase = 'ready' | 'playing' | 'complete'

interface PlayAlongProps {
  songId: string
  sectionId?: string        // play only a specific section, or entire song
  bpm: number
  synth: UseBanjoSynthReturn
  onComplete?: (accuracy: number) => void
}

export function PlayAlong({ songId, sectionId, bpm, synth, onComplete }: PlayAlongProps) {
  const song = SONG_MAP.get(songId)
  if (!song) return <div className="play-along-error">Song not found: {songId}</div>

  return <PlayAlongInner song={song} sectionId={sectionId} bpm={bpm} synth={synth} onComplete={onComplete} />
}

function PlayAlongInner({
  song,
  sectionId,
  bpm,
  synth,
  onComplete,
}: {
  song: Song
  sectionId?: string
  bpm: number
  synth: UseBanjoSynthReturn
  onComplete?: (accuracy: number) => void
}) {
  const [phase, setPhase] = useState<PlayAlongPhase>('ready')
  const [muteReference, setMuteReference] = useState(false)
  const [matcherState, setMatcherState] = useState<StreamingSongState | null>(null)

  const {
    notes,
    isListening,
    error: audioError,
    startListening,
    stopListening,
    clearNotes,
  } = useNoteCapture()

  const prevNoteCountRef = useRef(0)

  // Get the measures to play
  const measures = sectionId
    ? song.sections.find((s) => s.id === sectionId)?.measures ?? []
    : song.structure.flatMap((secId) => {
        const sec = song.sections.find((s) => s.id === secId)
        return sec ? sec.measures : []
      })

  const sectionLabel = sectionId
    ? song.sections.find((s) => s.id === sectionId)?.name ?? song.name
    : song.name

  // Process new notes through song matcher
  useEffect(() => {
    if (phase !== 'playing' || !matcherState || notes.length <= prevNoteCountRef.current) return

    let state = matcherState
    for (let i = prevNoteCountRef.current; i < notes.length; i++) {
      state = advanceSongMatcher(state, notes[i], measures)
    }
    prevNoteCountRef.current = notes.length
    setMatcherState(state)

    // Check if we've matched all notes
    if (state.cursor >= state.totalNotes) {
      handleComplete(state)
    }
  }, [notes.length, phase])

  const handleComplete = useCallback((state: StreamingSongState) => {
    stopListening()
    synth.stop()
    setPhase('complete')
    onComplete?.(state.overallAccuracy)
  }, [stopListening, synth, onComplete])

  function handleStart() {
    clearNotes()
    prevNoteCountRef.current = 0
    const state = createSongMatcherState(measures)
    setMatcherState(state)
    setPhase('playing')

    // Start listening for mic input
    startListening()

    // Play reference (unless muted)
    if (!muteReference) {
      synth.playSection(measures, bpm)
    }
  }

  function handleStop() {
    stopListening()
    synth.stop()
    if (matcherState) {
      setPhase('complete')
      onComplete?.(matcherState.overallAccuracy)
    } else {
      setPhase('ready')
    }
  }

  function handleReset() {
    clearNotes()
    prevNoteCountRef.current = 0
    setMatcherState(null)
    setPhase('ready')
  }

  // Build hit/miss beat sets for the diagram
  const hitBeats = new Set<number>()
  const missBeats = new Set<number>()
  if (matcherState) {
    for (const ev of matcherState.evaluations) {
      const absBeat = ev.measureIndex * 8 + ev.beatInMeasure
      if (ev.isHit) hitBeats.add(absBeat)
      else missBeats.add(absBeat)
    }
  }

  return (
    <div className="play-along">
      <div className="play-along-header">
        <h3 className="play-along-title">
          Play Along: {sectionLabel}
        </h3>
        <span className="play-along-bpm">{bpm} BPM</span>
      </div>

      {audioError && <div className="tuner-error">{audioError}</div>}

      {/* Tab diagram */}
      <SongTabDiagram
        measures={measures}
        label={sectionLabel}
        currentBeat={synth.currentBeat}
        hitBeats={hitBeats}
        missBeats={missBeats}
      />

      {/* Controls */}
      <div className="play-along-controls">
        {phase === 'ready' && (
          <>
            <label className="play-along-mute">
              <input
                type="checkbox"
                checked={muteReference}
                onChange={(e) => setMuteReference(e.target.checked)}
              />
              Mute reference (test mode)
            </label>
            <button className="btn btn-primary" onClick={handleStart}>
              Start Play-Along
            </button>
          </>
        )}

        {phase === 'playing' && (
          <>
            <div className="play-along-status">
              <span className="trying-dot" />
              Playing... ({matcherState?.cursor ?? 0} / {matcherState?.totalNotes ?? 0} notes)
            </div>
            {!muteReference && (
              <ListenButton
                onPlay={() => {}}
                onStop={() => synth.stop()}
                isPlaying={synth.isPlaying}
                label="Reference"
                small
              />
            )}
            <button className="btn btn-stop-try" onClick={handleStop}>
              Finish Early
            </button>
          </>
        )}

        {phase === 'complete' && matcherState && (
          <div className="play-along-results">
            <div className="play-along-score">
              <span className="play-along-score-label">Overall Accuracy</span>
              <span className={`play-along-score-value ${matcherState.overallAccuracy >= 70 ? 'score-pass' : 'score-fail'}`}>
                {matcherState.overallAccuracy}%
              </span>
            </div>

            {/* Per-measure breakdown */}
            <div className="play-along-measures">
              {matcherState.measureAccuracies.map((acc, i) => (
                <div key={i} className="play-along-measure-score">
                  <span>M{i + 1}</span>
                  <div className="play-along-measure-bar">
                    <div
                      className={`play-along-measure-fill ${acc >= 70 ? 'fill-pass' : 'fill-fail'}`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                  <span className="play-along-measure-pct">{acc}%</span>
                </div>
              ))}
            </div>

            <div className="play-along-result-actions">
              <button className="btn btn-primary" onClick={handleReset}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
