// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Lesson Carousel
// Step-through carousel for theory lessons. Each exercise is a full-screen
// slide with entrance animations and navigation controls.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { Exercise } from '../../data/curriculum'
import type { UseBanjoSynthReturn } from '../../hooks/useBanjoSynth'
import type { CapturedNote } from '../../engine/noteCapture'
import { NoteValueVisual } from './NoteValueVisual'
import { QuizExercise } from '../Teaching/QuizExercise'
import { ListenButton } from '../Practice/ListenButton'
import { useSpeech } from '../../hooks/useSpeech'

interface LessonCarouselProps {
  exercises: Exercise[]
  synth: UseBanjoSynthReturn
  notes: CapturedNote[]
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  clearNotes: () => void
  defaultBpm?: number | null
}

export function LessonCarousel({
  exercises,
  synth,
  notes,
  isListening,
  startListening,
  stopListening,
  clearNotes,
  defaultBpm,
}: LessonCarouselProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [animating, setAnimating] = useState(false)
  const { speak, stop: stopSpeech, speaking } = useSpeech()

  const total = exercises.length
  const exercise = exercises[currentStep]

  const goTo = useCallback((idx: number, dir: 'next' | 'prev') => {
    if (animating || idx < 0 || idx >= total) return
    synth.stop()
    stopSpeech()
    if (isListening) stopListening()
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setCurrentStep(idx)
      setAnimating(false)
    }, 250)
  }, [animating, total, synth, isListening, stopListening])

  const next = () => goTo(currentStep + 1, 'next')
  const prev = () => goTo(currentStep - 1, 'prev')

  const bpm = exercise.bpm ?? defaultBpm ?? 60

  function playDemo() {
    if (!exercise.demo) return
    const { kind, id, strings, beats, cycles } = exercise.demo
    switch (kind) {
      case 'string':
        if (strings?.length) {
          synth.playSequence(
            strings.map((s, i) => ({ string: s, fret: 0, beat: beats?.[i] ?? i * 2 })),
            Math.max(bpm, 40),
          )
        }
        break
      case 'roll':
        if (id) synth.playRoll(id, bpm, cycles ?? 2)
        break
    }
  }

  // Determine if the current step has a "continue" action or needs user interaction
  const isQuiz = exercise.type === 'quiz' && exercise.quiz
  const isListen = exercise.type === 'listen'
  const isInfo = exercise.type === 'info' || !exercise.type
  const isTry = exercise.type === 'try'
  const isLastStep = currentStep === total - 1

  return (
    <div className="lesson-carousel">
      {/* Progress bar */}
      <div className="lc-progress">
        <div className="lc-progress-fill" style={{ width: `${((currentStep + 1) / total) * 100}%` }} />
      </div>
      <div className="lc-progress-label">
        Step {currentStep + 1} of {total}
      </div>

      {/* Slide */}
      <div className={`lc-slide ${animating ? (direction === 'next' ? 'lc-slide-exit-left' : 'lc-slide-exit-right') : 'lc-slide-enter'}`}>

        {/* Step number badge */}
        <div className="lc-step-badge">{currentStep + 1}</div>

        {/* Instruction text */}
        <div className="lc-instruction-row">
          <p className="lc-instruction">{exercise.instruction}</p>
          <button
            className={`lc-speak-btn ${speaking ? 'lc-speak-btn-active' : ''}`}
            onClick={() => speaking ? stopSpeech() : speak(exercise.instruction)}
            title={speaking ? 'Stop reading' : 'Read aloud'}
          >
            {speaking ? '◼' : '🔊'}
          </button>
        </div>

        {/* Visual (note tree, beat timeline, rest chart) */}
        {exercise.visual && (
          <div className="lc-visual">
            <NoteValueVisual kind={exercise.visual.kind} params={exercise.visual.params} />
          </div>
        )}

        {/* Listen demo */}
        {exercise.demo && (
          <div className="lc-demo">
            <ListenButton
              onPlay={playDemo}
              onStop={() => synth.stop()}
              isPlaying={synth.isPlaying}
              label={isListen ? '♩ Listen' : '♩ Hear Demo'}
              small={false}
            />
          </div>
        )}

        {/* Quiz */}
        {isQuiz && (
          <div className="lc-quiz">
            <QuizExercise
              key={currentStep}
              questions={[exercise.quiz!]}
              onComplete={() => { if (!isLastStep) next() }}
            />
          </div>
        )}

        {/* Try mode */}
        {isTry && (
          <div className="lc-try">
            {!isListening ? (
              <button className="btn btn-primary" onClick={() => { clearNotes(); startListening() }}>
                Start Listening
              </button>
            ) : (
              <div className="lc-try-active">
                <span className="lc-try-dot" />
                <span>Listening... ({notes.length} notes)</span>
                <button className="btn btn-sm" onClick={() => { stopListening() }}>Done</button>
              </div>
            )}
          </div>
        )}

        {/* BPM badge */}
        {exercise.bpm && (
          <span className="lc-bpm">@ {exercise.bpm} BPM</span>
        )}
      </div>

      {/* Navigation */}
      <div className="lc-nav">
        <button
          className="lc-nav-btn"
          onClick={prev}
          disabled={currentStep === 0}
        >
          ← Back
        </button>

        <div className="lc-dots">
          {exercises.map((_, i) => (
            <button
              key={i}
              className={`lc-dot ${i === currentStep ? 'lc-dot-active' : ''} ${i < currentStep ? 'lc-dot-done' : ''}`}
              onClick={() => goTo(i, i > currentStep ? 'next' : 'prev')}
            />
          ))}
        </div>

        {!isQuiz && (
          <button
            className={`lc-nav-btn lc-nav-btn-next ${isLastStep ? 'lc-nav-btn-finish' : ''}`}
            onClick={next}
            disabled={isLastStep}
          >
            {isLastStep ? 'Done' : 'Next →'}
          </button>
        )}
        {isQuiz && (
          <div className="lc-nav-btn" style={{ visibility: 'hidden' }}>Next →</div>
        )}
      </div>
    </div>
  )
}
