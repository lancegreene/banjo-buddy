// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Ear Training Exercise
// App plays a note via synth, user identifies it by tapping buttons.
// Progression: single strings → intervals → chord tones.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useBanjoSynth } from '../../hooks/useBanjoSynth'

interface EarTrainingExerciseProps {
  level?: 'strings' | 'intervals' | 'chords'
  onComplete: (score: number) => void
}

const STRING_NAMES = ['1st (D4)', '2nd (B3)', '3rd (G3)', '4th (D3)', '5th (G4)']
const TOTAL_ROUNDS = 8

export function EarTrainingExercise({ level = 'strings', onComplete }: EarTrainingExerciseProps) {
  const synth = useBanjoSynth()
  const [round, setRound] = useState(0)
  const [correctString, setCorrectString] = useState<number | null>(null)
  const [selectedString, setSelectedString] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const playRandomNote = useCallback(() => {
    const stringNum = Math.floor(Math.random() * 5) + 1
    setCorrectString(stringNum)
    setSelectedString(null)
    setIsAnswered(false)
    setIsPlaying(true)
    synth.playNote(stringNum, 0)
    setTimeout(() => setIsPlaying(false), 1000)
  }, [synth])

  function handleGuess(stringNum: number) {
    if (isAnswered || correctString === null) return
    setSelectedString(stringNum)
    setIsAnswered(true)
    if (stringNum === correctString) {
      setCorrectCount((c) => c + 1)
    }
  }

  function handleNext() {
    if (round + 1 >= TOTAL_ROUNDS) {
      setIsComplete(true)
      onComplete(Math.round((correctCount / TOTAL_ROUNDS) * 100))
      return
    }
    setRound((r) => r + 1)
    playRandomNote()
  }

  if (isComplete) {
    const score = Math.round((correctCount / TOTAL_ROUNDS) * 100)
    return (
      <div className="ear-training-complete">
        <div className="ear-training-score">{score}%</div>
        <p>{correctCount} of {TOTAL_ROUNDS} correct</p>
      </div>
    )
  }

  return (
    <div className="ear-training">
      <div className="ear-training-header">
        <span>Round {round + 1} / {TOTAL_ROUNDS}</span>
        <span>Score: {correctCount}</span>
      </div>

      {correctString === null ? (
        <button className="btn btn-primary" onClick={playRandomNote}>
          Start Ear Training
        </button>
      ) : (
        <>
          <button
            className="btn btn-secondary ear-training-replay"
            onClick={() => {
              synth.playNote(correctString, 0)
              setIsPlaying(true)
              setTimeout(() => setIsPlaying(false), 1000)
            }}
            disabled={isPlaying}
          >
            {isPlaying ? 'Playing...' : 'Replay Note'}
          </button>

          <div className="ear-training-options">
            {[1, 2, 3, 4, 5].map((s) => {
              let className = 'ear-training-option'
              if (isAnswered) {
                if (s === correctString) className += ' ear-training-option-correct'
                else if (s === selectedString) className += ' ear-training-option-wrong'
              }

              return (
                <button
                  key={s}
                  className={className}
                  onClick={() => handleGuess(s)}
                  disabled={isAnswered}
                >
                  {STRING_NAMES[s - 1]}
                </button>
              )
            })}
          </div>

          {isAnswered && (
            <div className="ear-training-feedback">
              <p className={selectedString === correctString ? 'feedback-correct' : 'feedback-wrong'}>
                {selectedString === correctString
                  ? 'Correct!'
                  : `It was the ${STRING_NAMES[correctString - 1]}`}
              </p>
              <button className="btn btn-primary" onClick={handleNext}>
                {round + 1 >= TOTAL_ROUNDS ? 'See Results' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
