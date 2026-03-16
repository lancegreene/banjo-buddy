// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Quiz Exercise
// Multiple-choice questions with immediate feedback and explanation.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { QuizQuestion } from '../../data/curriculum'

interface QuizExerciseProps {
  questions: QuizQuestion[]
  onComplete: (score: number) => void
}

export function QuizExercise({ questions, onComplete }: QuizExerciseProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const question = questions[currentIdx]

  function handleAnswer(optionIdx: number) {
    if (isAnswered) return
    setSelectedOption(optionIdx)
    setIsAnswered(true)
    if (optionIdx === question.correctIndex) {
      setCorrectCount((c) => c + 1)
    }
  }

  function handleNext() {
    if (currentIdx + 1 >= questions.length) {
      const finalCorrect = correctCount + (selectedOption === question.correctIndex ? 0 : 0)
      // correctCount was already updated in handleAnswer
      setIsComplete(true)
      const score = Math.round((correctCount / questions.length) * 100)
      onComplete(score)
      return
    }
    setCurrentIdx((i) => i + 1)
    setSelectedOption(null)
    setIsAnswered(false)
  }

  if (isComplete) {
    const score = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="quiz-complete">
        <div className="quiz-complete-score">{score}%</div>
        <p className="quiz-complete-text">
          {correctCount} of {questions.length} correct
        </p>
      </div>
    )
  }

  return (
    <div className="quiz-exercise">
      <div className="quiz-progress">
        Question {currentIdx + 1} of {questions.length}
      </div>

      <p className="quiz-prompt">{question.prompt}</p>

      <div className="quiz-options">
        {question.options.map((option, i) => {
          let className = 'quiz-option'
          if (isAnswered) {
            if (i === question.correctIndex) className += ' quiz-option-correct'
            else if (i === selectedOption) className += ' quiz-option-wrong'
          } else if (i === selectedOption) {
            className += ' quiz-option-selected'
          }

          return (
            <button key={i} className={className} onClick={() => handleAnswer(i)}>
              <span className="quiz-option-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="quiz-option-text">{option}</span>
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <div className="quiz-feedback">
          <p className={`quiz-feedback-result ${selectedOption === question.correctIndex ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`}>
            {selectedOption === question.correctIndex ? 'Correct!' : 'Not quite.'}
          </p>
          <p className="quiz-explanation">{question.explanation}</p>
          <button className="btn btn-primary" onClick={handleNext}>
            {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  )
}
