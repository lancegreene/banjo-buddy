// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Interactive Step Component
// Step-by-step lesson UI with state machine:
//   read instruction → [Listen] play demo → [Try It] activate detection → evaluate
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { Exercise } from '../../data/curriculum'
import type { UseBanjoSynthReturn } from '../../hooks/useBanjoSynth'
import type { CapturedNote } from '../../engine/noteCapture'
import { ROLL_MAP } from '../../data/rollPatterns'
import { SECTION_MAP } from '../../data/songLibrary'
import { ListenButton } from './ListenButton'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { SongTabDiagram } from '../BanjoTabDiagram/SongTabDiagram'
import { NoteValueVisual } from '../Theory/NoteValueVisual'
import { QuizExercise } from '../Teaching/QuizExercise'
import { useSpeech } from '../../hooks/useSpeech'

type StepPhase = 'read' | 'listening' | 'trying' | 'result'

interface InteractiveStepProps {
  exercise: Exercise
  stepNumber: number
  synth: UseBanjoSynthReturn
  notes: CapturedNote[]
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  clearNotes: () => void
  onPass: () => void
  onFail: () => void
  defaultBpm?: number | null
  hideTabDiagram?: boolean
}

export function InteractiveStep({
  exercise,
  stepNumber,
  synth,
  notes,
  isListening,
  startListening,
  stopListening,
  clearNotes,
  onPass,
  onFail,
  defaultBpm,
  hideTabDiagram,
}: InteractiveStepProps) {
  const [phase, setPhase] = useState<StepPhase>('read')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const { speak, stop: stopSpeech, speaking } = useSpeech()

  const bpm = exercise.bpm ?? defaultBpm ?? 60
  const threshold = exercise.passThreshold ?? 60

  // Play the demo based on exercise.demo config
  function playDemo() {
    if (!exercise.demo) return

    const { kind, id, strings, cycles } = exercise.demo

    switch (kind) {
      case 'string':
        // Play each string in sequence
        if (strings?.length) {
          const notes = strings.map((s, i) => ({
            string: s,
            fret: 0,
            beat: i * 2, // space them out
          }))
          synth.playSequence(notes, Math.max(bpm, 40))
        }
        break

      case 'roll':
        if (id) {
          synth.playRoll(id, bpm, cycles ?? 2)
        }
        break

      case 'section':
        if (id) {
          const section = SECTION_MAP.get(id)
          if (section) {
            synth.playSection(section.measures, bpm)
          }
        }
        break

      case 'lick':
        // For licks, play through roll pattern if available
        if (id) {
          synth.playRoll(id, bpm, cycles ?? 1)
        }
        break
    }

    setPhase('listening')
  }

  function stopDemo() {
    synth.stop()
    setPhase('read')
  }

  function startTrying() {
    clearNotes()
    startListening()
    setPhase('trying')
  }

  function finishTrying() {
    stopListening()

    // Evaluate accuracy based on detect config
    if (exercise.detect && notes.length > 0) {
      const detectedAccuracy = evaluateAccuracy(exercise, notes)
      setAccuracy(detectedAccuracy)
      setPhase('result')
    } else {
      // No detection — auto-pass
      setAccuracy(100)
      setPhase('result')
    }
  }

  // Get the roll pattern for tab diagram display
  const rollPattern = exercise.detect?.kind === 'roll' && exercise.detect.id
    ? ROLL_MAP.get(exercise.detect.id)
    : null

  // Get section for song tab display
  const songSection = exercise.demo?.kind === 'section' && exercise.demo.id
    ? SECTION_MAP.get(exercise.demo.id)
    : null

  return (
    <div className="interactive-step">
      <div className="interactive-step-header">
        <span className="step-num">{stepNumber}</span>
        <span className="step-instruction">{exercise.instruction}</span>
        <button
          className={`lc-speak-btn ${speaking ? 'lc-speak-btn-active' : ''}`}
          onClick={() => speaking ? stopSpeech() : speak(exercise.instruction)}
          title={speaking ? 'Stop reading' : 'Read aloud'}
        >
          {speaking ? '◼' : '🔊'}
        </button>
        {exercise.bpm && <span className="step-bpm">@ {exercise.bpm} BPM</span>}
      </div>

      {/* Phase-specific content */}
      <div className="interactive-step-body">
        {/* Animated theory visual */}
        {exercise.visual && (
          <NoteValueVisual kind={exercise.visual.kind} params={exercise.visual.params} />
        )}

        {/* Quiz exercise */}
        {exercise.type === 'quiz' && exercise.quiz && (
          <QuizExercise
            questions={[exercise.quiz]}
            onComplete={() => onPass()}
          />
        )}

        {/* Listen button for exercises with demos */}
        {exercise.demo && phase !== 'trying' && (
          <ListenButton
            onPlay={playDemo}
            onStop={stopDemo}
            isPlaying={synth.isPlaying && phase === 'listening'}
            label={exercise.type === 'listen' ? 'Listen' : 'Hear demo'}
            small={exercise.type !== 'listen'}
          />
        )}

        {/* Roll pattern diagram — hidden when parent shows unified roll panel */}
        {rollPattern && phase !== 'trying' && !hideTabDiagram && (
          <BanjoTabDiagram
            strings={rollPattern.strings}
            fingers={rollPattern.fingers}
            label={rollPattern.name}
            cursorPosition={synth.isPlaying ? (synth.currentBeat ?? undefined) : undefined}
          />
        )}

        {/* Song section diagram */}
        {songSection && phase !== 'trying' && (
          <SongTabDiagram
            measures={songSection.measures}
            label={songSection.name}
            currentBeat={synth.isPlaying ? synth.currentBeat : null}
          />
        )}

        {/* Try It button for exercises with detection */}
        {exercise.detect && (phase === 'read' || phase === 'listening') && !synth.isPlaying && (
          <button className="btn btn-try" onClick={startTrying}>
            Try It
          </button>
        )}

        {/* Active trying phase */}
        {phase === 'trying' && (
          <div className="trying-phase">
            <div className="trying-status">
              <span className="trying-dot" />
              Listening... ({notes.length} notes)
            </div>

            {/* Show live roll pattern matching — hidden when parent shows unified roll panel */}
            {rollPattern && !hideTabDiagram && (
              <BanjoTabDiagram
                strings={rollPattern.strings}
                fingers={rollPattern.fingers}
                label={`${rollPattern.name} — playing`}
                playedStrings={notes.map((n) => n.banjoString ?? 0)}
              />
            )}

            <button className="btn btn-stop-try" onClick={finishTrying}>
              Done
            </button>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && accuracy !== null && (
          <div className={`step-result ${accuracy >= threshold ? 'step-result-pass' : 'step-result-fail'}`}>
            <div className="step-result-score">
              {accuracy >= threshold ? 'Pass' : 'Try again'} — {accuracy}%
            </div>
            <div className="step-result-threshold">
              Need {threshold}% to pass
            </div>
            <div className="step-result-actions">
              {accuracy >= threshold ? (
                <button className="btn btn-primary btn-sm" onClick={onPass}>
                  Next Step
                </button>
              ) : (
                <>
                  <button className="btn btn-sm" onClick={() => { setPhase('read'); setAccuracy(null); clearNotes() }}>
                    Retry
                  </button>
                  <button className="btn btn-sm btn-skip" onClick={onFail}>
                    Skip
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info-only steps — no button needed, content speaks for itself */}

        {/* Listen-only steps advance when demo finishes or user clicks next */}
        {exercise.type === 'listen' && !synth.isPlaying && phase !== 'read' && (
          <button className="btn btn-primary btn-sm" onClick={onPass}>
            Next
          </button>
        )}
      </div>
    </div>
  )
}

// ── Accuracy Evaluation ───────────────────────────────────────────────────────

function evaluateAccuracy(exercise: Exercise, notes: CapturedNote[]): number {
  if (!exercise.detect) return 100

  const { kind, id } = exercise.detect

  if (kind === 'roll' && id) {
    const pattern = ROLL_MAP.get(id)
    if (!pattern) return 0

    // Compare played notes against expected pattern, cycling
    let hits = 0
    const total = Math.min(notes.length, 32) // Cap at 4 cycles
    for (let i = 0; i < total; i++) {
      const expected = pattern.strings[i % pattern.strings.length]
      const played = notes[i].banjoString
      if (expected === null || played === expected) hits++
    }
    return total > 0 ? Math.round((hits / total) * 100) : 0
  }

  if (kind === 'section' && id) {
    const section = SECTION_MAP.get(id)
    if (!section) return 0

    // Flatten section notes and compare by string
    const expectedNotes = section.measures.flatMap((m) => m.notes)
    let hits = 0
    const total = Math.min(notes.length, expectedNotes.length)
    for (let i = 0; i < total; i++) {
      if (notes[i].banjoString === expectedNotes[i].string) hits++
    }
    return total > 0 ? Math.round((hits / total) * 100) : 0
  }

  return 0
}
