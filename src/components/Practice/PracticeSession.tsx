import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { SKILL_MAP, type ScoringType } from '../../data/curriculum'
import type { RecommendedItem } from '../../engine/recommendationEngine'
import type { SelfRating } from '../../db/db'
import { Metronome } from '../Metronome/Metronome'
import { Tuner } from '../Tuner/Tuner'
import { RollDetector } from '../RollDetector/RollDetector'
import { LickDetector } from '../LickDetector/LickDetector'
import { AudioRecorder } from '../AudioRecorder/AudioRecorder'
import { useNoteCapture } from '../../hooks/useNoteCapture'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { ROLL_MAP } from '../../data/rollPatterns'
import { BanjoChordDiagram } from '../BanjoChordDiagram/BanjoChordDiagram'
import { CHORD_GROUPS } from '../../data/chordDiagrams'
import { CalibrationWizard } from '../Calibration/CalibrationWizard'
import { loadCalibration } from '../../utils/calibration'

type PracticeView = 'plan' | 'item' | 'metronome' | 'complete'

const PATH_LABELS: Record<string, string> = {
  newby: 'Newby',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  all: 'All paths',
}

const SCORING_BADGES: Record<ScoringType, { label: string; color: string }> = {
  self_rate:   { label: 'Self-rated',   color: '#888' },
  rhythm:      { label: 'Rhythm',       color: '#e67e22' },
  pitch:       { label: 'Pitch',        color: '#27ae60' },
  tempo:       { label: 'Tempo',        color: '#2980b9' },
  string_ring: { label: 'String ring',  color: '#8e44ad' },
  audio_match: { label: 'Audio match',  color: '#c0392b' },
}

function BpmProgressBar({ item }: { item: RecommendedItem }) {
  const { skill } = item
  if (!skill.progressBpm) return null

  const maxBpm = skill.masteryBpm ?? skill.progressBpm
  const currentBpm = item.record?.bestBpm ?? 0
  const fillPct = Math.min(100, (currentBpm / maxBpm) * 100)
  const progressMarkerPct = skill.masteryBpm
    ? Math.min(100, (skill.progressBpm / maxBpm) * 100)
    : 100

  return (
    <div className="bpm-progress-section">
      <div className="bpm-progress-header">
        <span className="bpm-progress-label">Your best: <strong>{currentBpm > 0 ? `${currentBpm} BPM` : '—'}</strong></span>
        {skill.masteryBpm
          ? <span className="bpm-progress-label">Mastery: <strong>{skill.masteryBpm} BPM</strong></span>
          : <span className="bpm-progress-label">Goal: <strong>{skill.progressBpm} BPM</strong></span>
        }
      </div>
      <div className="bpm-track">
        <div className="bpm-fill" style={{ width: `${fillPct}%` }} />
        {/* Progress threshold marker */}
        <div className="bpm-marker bpm-marker-progress" style={{ left: `${progressMarkerPct}%` }}>
          <span className="bpm-marker-label">{skill.progressBpm}</span>
        </div>
      </div>
      <div className="bpm-track-legend">
        <span>0</span>
        <span>{maxBpm} BPM</span>
      </div>
    </div>
  )
}

type ActiveTool = 'metronome' | 'tuner' | 'roll' | 'lick' | 'recorder' | 'calibrate' | null

function ExerciseView({
  item,
  onComplete,
}: {
  item: RecommendedItem
  onComplete: (achievedBpm: number | null, rating: SelfRating, scores: Record<string, number>) => void
}) {
  const [achievedBpm, setAchievedBpm] = useState<string>(String(item.suggestedBpm ?? ''))
  const [rating, setRating] = useState<SelfRating | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)

  // Pending scores from analysis tools
  const [pendingRhythm, setPendingRhythm] = useState<number | null>(null)
  const [pendingTempo, setPendingTempo] = useState<number | null>(null)
  const [pendingPitch, setPendingPitch] = useState<number | null>(null)

  const { skill } = item

  const hasPitch = skill.scoringTypes.includes('pitch') || skill.scoringTypes.includes('string_ring')
  const hasRoll = skill.scoringTypes.includes('rhythm')
  const hasLick = skill.scoringTypes.includes('audio_match') && !!skill.lickId
  const hasAnalysis = hasRoll || hasLick

  // Shared audio capture for Roll, Lick, and Recorder panels
  const {
    notes,
    isListening,
    error: audioError,
    startListening,
    stopListening,
    clearNotes,
    analyserRef,
    streamRef,
  } = useNoteCapture()

  function toggleTool(tool: ActiveTool) {
    if (activeTool === tool) {
      // Close: stop audio if it was an analysis tool
      if (tool === 'roll' || tool === 'lick') stopListening()
      setActiveTool(null)
    } else {
      // Stop audio from any previous analysis tool
      if (activeTool === 'roll' || activeTool === 'lick') stopListening()
      clearNotes()
      setActiveTool(tool)
    }
  }

  // Stop listening when switching away from analysis tools
  useEffect(() => {
    if (activeTool !== 'roll' && activeTool !== 'lick' && isListening) {
      stopListening()
    }
  }, [activeTool, isListening, stopListening])

  const ratings: { value: SelfRating; label: string; emoji: string }[] = [
    { value: 'felt_good', label: 'Felt good', emoji: '✓' },
    { value: 'ok', label: 'Getting there', emoji: '~' },
    { value: 'needs_work', label: 'Needs work', emoji: '✗' },
  ]

  return (
    <div className="exercise-view">

      {/* Context */}
      <div className="exercise-context">
        <span className="exercise-ctx-chip">{PATH_LABELS[skill.path] ?? skill.path}</span>
        <span className="exercise-ctx-chip">Month {skill.month}</span>
        {skill.isMilestone && <span className="exercise-ctx-chip exercise-ctx-milestone">Milestone</span>}
        <span className="exercise-ctx-reason">{item.reason}</span>
      </div>

      <div className="exercise-header">
        <h2 className="exercise-title">{skill.name}</h2>
        {item.suggestedBpm && (
          <span className="exercise-target-bpm">Target: {item.suggestedBpm} BPM</span>
        )}
      </div>

      {/* Scoring badges */}
      <div className="scoring-badges">
        {skill.scoringTypes.map((t) => (
          <span
            key={t}
            className="scoring-badge"
            style={{ borderColor: SCORING_BADGES[t].color, color: SCORING_BADGES[t].color }}
          >
            {SCORING_BADGES[t].label}
          </span>
        ))}
      </div>

      <div className="exercise-description">{skill.description}</div>

      {/* Roll pattern diagram — lights up live when roll tool is active */}
      {skill.rollPatternId && (() => {
        const pattern = ROLL_MAP.get(skill.rollPatternId!)
        if (!pattern) return null
        const playedStrings = activeTool === 'roll'
          ? notes.filter((n) => n.banjoString !== null).slice(-8).map((n) => n.banjoString!)
          : undefined
        return (
          <BanjoTabDiagram
            strings={pattern.strings}
            fingers={pattern.fingers}
            label={pattern.name}
            playedStrings={playedStrings}
          />
        )
      })()}

      {/* Chord diagrams — all voicings for this chord */}
      {skill.chordId && (() => {
        const shapes = CHORD_GROUPS[skill.chordId!]
        if (!shapes?.length) return null
        return (
          <div className="chord-diagram-row">
            {shapes.map((chord) => (
              <BanjoChordDiagram key={chord.id} chord={chord} />
            ))}
          </div>
        )
      })()}

      <BpmProgressBar item={item} />

      {/* Exercises */}
      <div className="exercise-steps">
        <h3 className="steps-title">Exercises</h3>
        {skill.exercises.map((ex, i) => (
          <div key={i} className="exercise-step">
            <span className="step-num">{i + 1}</span>
            <span className="step-instruction">{ex.instruction}</span>
            {ex.bpm && <span className="step-bpm">@ {ex.bpm} BPM</span>}
          </div>
        ))}
      </div>

      {/* Assessment */}
      <div className="exercise-assessment">
        <h3 className="steps-title">Assessment</h3>
        <p className="assessment-prompt">{skill.assessmentPrompt}</p>
      </div>

      {/* Mastery criteria */}
      <div className="mastery-criteria">
        <span className="mastery-criteria-label">What success looks like</span>
        <p className="mastery-criteria-text">{skill.masteryCriteria}</p>
      </div>

      {/* Tools row */}
      <div className="exercise-tools">
        <button
          className={`tool-btn ${activeTool === 'metronome' ? 'tool-btn-active' : ''}`}
          onClick={() => toggleTool('metronome')}
        >
          ♩ Metro
        </button>
        {hasPitch && (
          <button
            className={`tool-btn ${activeTool === 'tuner' ? 'tool-btn-active' : ''}`}
            onClick={() => toggleTool('tuner')}
          >
            ◎ Tuner
          </button>
        )}
        {hasRoll && (
          <button
            className={`tool-btn ${activeTool === 'roll' ? 'tool-btn-active' : ''}`}
            onClick={() => toggleTool('roll')}
          >
            ~ Roll
          </button>
        )}
        {hasLick && (
          <button
            className={`tool-btn ${activeTool === 'lick' ? 'tool-btn-active' : ''}`}
            onClick={() => toggleTool('lick')}
          >
            ♫ Lick
          </button>
        )}
        {(hasAnalysis || hasPitch) && (
          <button
            className={`tool-btn ${activeTool === 'recorder' ? 'tool-btn-active' : ''}`}
            onClick={() => toggleTool('recorder')}
          >
            ● Rec
          </button>
        )}
        <button
          className={`tool-btn tool-btn-cal ${activeTool === 'calibrate' ? 'tool-btn-active' : ''} ${loadCalibration() ? 'tool-btn-cal-saved' : ''}`}
          onClick={() => toggleTool('calibrate')}
          title="Calibrate audio detection to your playing style"
        >
          ⚙ Cal
        </button>
      </div>

      {/* Analysis tool Listen/Stop control (shared) */}
      {(activeTool === 'roll' || activeTool === 'lick') && (
        <div className="analysis-controls">
          {audioError && <div className="tuner-error">{audioError}</div>}
          <div className="analysis-control-row">
            <button
              className={`play-btn play-btn-sm ${isListening ? 'play-btn-stop' : ''}`}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? '■ Stop' : '🎤 Listen'}
            </button>
            {notes.length > 0 && (
              <button className="tuner-reset-btn" onClick={clearNotes}>Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Inline tool panels */}
      {activeTool === 'metronome' && (
        <div className="inline-tool-panel"><Metronome /></div>
      )}
      {activeTool === 'tuner' && (
        <div className="inline-tool-panel"><Tuner /></div>
      )}
      {activeTool === 'roll' && (
        <div className="inline-tool-panel">
          <RollDetector
            notes={notes}
            isListening={isListening}
            targetBpm={item.suggestedBpm ?? undefined}
            onScore={(r, t) => { setPendingRhythm(r); setPendingTempo(t) }}
            onClear={clearNotes}
          />
        </div>
      )}
      {activeTool === 'lick' && skill.lickId && (
        <div className="inline-tool-panel">
          <LickDetector
            lickId={skill.lickId}
            notes={notes}
            isListening={isListening}
            onScore={(p, t) => { setPendingPitch(p); setPendingTempo(t) }}
          />
        </div>
      )}
      {activeTool === 'recorder' && (
        <div className="inline-tool-panel">
          <AudioRecorder
            skillId={skill.id}
            bpm={item.suggestedBpm}
            analyserRef={analyserRef}
            streamRef={streamRef}
          />
        </div>
      )}
      {activeTool === 'calibrate' && (
        <div className="inline-tool-panel">
          <CalibrationWizard onClose={() => setActiveTool(null)} />
        </div>
      )}

      {/* Pending scores summary */}
      {(pendingRhythm !== null || pendingPitch !== null || pendingTempo !== null) && (
        <div className="pending-scores">
          {pendingRhythm !== null && <span className="pending-score-chip">Rhythm: {pendingRhythm}%</span>}
          {pendingPitch !== null && <span className="pending-score-chip">Pitch: {pendingPitch}%</span>}
          {pendingTempo !== null && <span className="pending-score-chip">Tempo: {pendingTempo}%</span>}
        </div>
      )}

      {/* Log result */}
      <div className="log-result">
        <h3 className="steps-title">Log your result</h3>

        {skill.progressBpm !== null && (
          <div className="achieved-bpm-row">
            <label className="achieved-bpm-label">BPM achieved:</label>
            <input
              type="number"
              className="achieved-bpm-input"
              value={achievedBpm}
              onChange={(e) => setAchievedBpm(e.target.value)}
              min={20}
              max={300}
              placeholder="e.g. 80"
            />
          </div>
        )}

        <div className="rating-row">
          {ratings.map((r) => (
            <button
              key={r.value}
              className={`rating-btn ${rating === r.value ? 'rating-btn-selected' : ''}`}
              onClick={() => setRating(r.value)}
            >
              <span className="rating-emoji">{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary"
          disabled={!rating}
          onClick={() => {
            const bpm = achievedBpm ? parseInt(achievedBpm) : null
            const scores: Record<string, number> = {}
            if (pendingRhythm !== null) scores.rhythm = pendingRhythm
            if (pendingPitch !== null) scores.pitch = pendingPitch
            if (pendingTempo !== null) scores.tempo = pendingTempo
            onComplete(bpm && !isNaN(bpm) ? bpm : null, rating!, scores)
          }}
        >
          Mark Complete
        </button>
      </div>
    </div>
  )
}

export function PracticeSession() {
  const sessionPlan = useStore((s) => s.sessionPlan)
  const selectedSkillId = useStore((s) => s.selectedSkillId)
  const clearSelectedSkill = useStore((s) => s.clearSelectedSkill)
  const skillRecords = useStore((s) => s.skillRecords)
  const startSession = useStore((s) => s.startSession)
  const endSession = useStore((s) => s.endSession)
  const logSessionItem = useStore((s) => s.logSessionItem)
  const newlyUnlocked = useStore((s) => s.newlyUnlocked)
  const clearNewlyUnlocked = useStore((s) => s.clearNewlyUnlocked)
  const setPage = useStore((s) => s.setPage)

  const [view, setView] = useState<PracticeView>('plan')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedIds, setCompletedIds] = useState<string[]>([])

  // Single-skill mode: when user taps a skill from the SkillTree
  const selectedSkill = selectedSkillId ? SKILL_MAP.get(selectedSkillId) ?? null : null
  const singleSkillItem: RecommendedItem | null = selectedSkill
    ? {
        skill: selectedSkill,
        record: skillRecords.get(selectedSkill.id) ?? null,
        reason: 'Selected from skill tree',
        suggestedBpm: selectedSkill.progressBpm ?? null,
        priority: 0,
      }
    : null

  const allItems = singleSkillItem
    ? [singleSkillItem]
    : sessionPlan
    ? [...(sessionPlan.newSkills), ...(sessionPlan.activeWork), ...(sessionPlan.maintenance)]
    : []

  // Auto-start into exercise view for single-skill mode
  useEffect(() => {
    if (singleSkillItem && view === 'plan') {
      startSession().then(() => setView('item'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkillId])

  useEffect(() => {
    if (newlyUnlocked.length > 0 && view === 'item') {
      // Show unlock notification inline (handled below)
    }
  }, [newlyUnlocked])

  async function handleStart() {
    await startSession()
    setView('item')
    setCurrentIndex(0)
    setCompletedIds([])
  }

  async function handleItemComplete(achievedBpm: number | null, rating: SelfRating, scores: Record<string, number>) {
    const item = allItems[currentIndex]
    if (!item) return

    clearNewlyUnlocked()
    await logSessionItem(item.skill.id, achievedBpm, rating, scores)
    setCompletedIds((prev) => [...prev, item.skill.id])

    if (currentIndex < allItems.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      await endSession()
      setView('complete')
    }
  }

  function handleSkip() {
    if (currentIndex < allItems.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      endSession()
      setView('complete')
    }
  }

  function handleDone() {
    if (singleSkillItem) {
      clearSelectedSkill()
      setPage('skill-tree')
    } else {
      setPage('dashboard')
    }
  }

  if (!singleSkillItem && (!sessionPlan || allItems.length === 0)) {
    return (
      <div className="practice-empty">
        <h2>No practice items ready</h2>
        <p>Go to the Dashboard and select your learning path to get started.</p>
        <button className="btn btn-primary" onClick={() => setPage('dashboard')}>Back to Dashboard</button>
      </div>
    )
  }

  if (view === 'plan') {
    return (
      <div className="practice-plan-view">
        <h2>Today's Session</h2>
        <p className="practice-plan-desc">{allItems.length} items planned</p>

        <div className="practice-plan-list">
          {allItems.map((item, i) => (
            <div key={item.skill.id} className="practice-plan-row">
              <span className="practice-plan-num">{i + 1}</span>
              <span className="practice-plan-name">{item.skill.name}</span>
              {item.suggestedBpm && <span className="practice-plan-bpm">{item.suggestedBpm} BPM</span>}
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={handleStart}>
          Begin Session
        </button>
      </div>
    )
  }

  if (view === 'complete') {
    return (
      <div className="practice-complete">
        <div className="complete-icon">🎉</div>
        <h2>Session Complete!</h2>
        <p>You practiced {completedIds.length} skill{completedIds.length !== 1 ? 's' : ''}.</p>
        {newlyUnlocked.length > 0 && (
          <div className="unlocked-notification">
            <strong>🔓 New skills unlocked:</strong>
            <ul>
              {newlyUnlocked.map((id) => (
                <li key={id}>{SKILL_MAP.get(id)?.name ?? id}</li>
              ))}
            </ul>
          </div>
        )}
        <button className="btn btn-primary" onClick={handleDone}>
          {singleSkillItem ? 'Back to Skills' : 'Back to Dashboard'}
        </button>
      </div>
    )
  }

  const currentItem = allItems[currentIndex]

  return (
    <div className="practice-session">
      {/* Back button for single-skill mode */}
      {singleSkillItem && (
        <button className="practice-back-btn" onClick={() => { clearSelectedSkill(); setPage('skill-tree') }}>
          ← Skills
        </button>
      )}

      {/* Progress bar (hidden in single-skill mode) */}
      {!singleSkillItem && (
        <>
          <div className="session-progress-bar">
            <div
              className="session-progress-fill"
              style={{ width: `${(currentIndex / allItems.length) * 100}%` }}
            />
          </div>
          <div className="session-progress-label">
            {currentIndex + 1} / {allItems.length}
          </div>
        </>
      )}

      {/* Unlock notification */}
      {newlyUnlocked.length > 0 && (
        <div className="unlock-banner">
          🔓 Unlocked: {newlyUnlocked.map((id) => SKILL_MAP.get(id)?.name).join(', ')}
        </div>
      )}

      <ExerciseView item={currentItem} onComplete={handleItemComplete} />

      {singleSkillItem ? (
        <button className="skip-btn" onClick={() => { clearSelectedSkill(); setPage('skill-tree') }}>
          ← Back to Skills
        </button>
      ) : (
        <button className="skip-btn" onClick={handleSkip}>
          Skip this item →
        </button>
      )}
    </div>
  )
}
