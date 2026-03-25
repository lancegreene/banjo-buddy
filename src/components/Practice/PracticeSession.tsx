import { useState, useEffect, useRef, useMemo } from 'react'
import * as Tone from 'tone'
import { useStore } from '../../store/useStore'
import { SKILLS, SKILL_MAP, type ScoringType } from '../../data/curriculum'
import { evaluateSkillStatus, type RecommendedItem, type SessionPlan } from '../../engine/recommendationEngine'
import type { SelfRating } from '../../db/db'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'
import { createAdaptiveTempoState, evaluateTempoAdjustment, type AdaptiveTempoState } from '../../engine/adaptiveTempo'
import { createTempoRamp, evaluateRampCycle, getCurrentRampBpm, type TempoRampState } from '../../engine/tempoRamp'
import { generateFocusDrill, focusDrillToSessionPlan, type FocusDrillItem } from '../../engine/focusMode'
import { TempoRampView } from './TempoRampView'
import { Metronome } from '../Metronome/Metronome'

import { RollDetector } from '../RollDetector/RollDetector'
import { LiveRollFeedback } from '../RollDetector/LiveRollFeedback'
import { LickDetector } from '../LickDetector/LickDetector'
import { AudioRecorder } from '../AudioRecorder/AudioRecorder'
import { useNoteCapture } from '../../hooks/useNoteCapture'
import { useBanjoSynth } from '../../hooks/useBanjoSynth'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { ROLL_MAP } from '../../data/rollPatterns'
import { BanjoChordDiagram } from '../BanjoChordDiagram/BanjoChordDiagram'
import { CHORD_GROUPS } from '../../data/chordDiagrams'
import { CalibrationWizard } from '../Calibration/CalibrationWizard'
import { loadCalibration } from '../../utils/calibration'
import { ListenButton } from './ListenButton'
import { InteractiveStep } from './InteractiveStep'
import { LessonCarousel } from '../Theory/LessonCarousel'
import { PlayAlong } from './PlayAlong'
import { RealtimeFeedback } from './RealtimeFeedback'
import { SessionSummary } from './SessionSummary'
import { SessionTimer } from './SessionTimer'
import { ChunkDrillPrompt } from './ChunkDrill'
import { MentalPractice } from './MentalPractice'
import { WarmupModal } from './WarmupModal'
import { FretLabPanel } from '../Fretboard/FretLabPanel'
import { NoteHighwayRenderer, type HighwayResult } from '../NoteHighway/NoteHighwayRenderer'
import type { HighwayNote } from '../NoteHighway/noteHighwayTypes'
import { SECTION_MAP } from '../../data/songLibrary'
import { identifyWeakChunks, type ChunkDrill } from '../../engine/autoChunker'
import type { PerformanceMetrics } from '../../types/performance'
import { FingerBalanceMeter } from './FingerBalanceMeter'
import { LiveWeakSpots } from './LiveWeakSpots'
import { TempoModeSelector, type TempoMode } from './TempoModeSelector'
import { createInterleavedTempoState, nextInterleavedBpm, type InterleavedTempoState } from '../../engine/adaptiveTempo'
import { RollClock } from './RollClock'
import { WeakSpotDrills } from './WeakSpotDrills'
import { JamCircle } from './JamCircle'
import { TeacherMediaPlayer } from '../Teaching/TeacherMediaPlayer'
import { VideoRecorder } from '../Teaching/VideoRecorder'
import { AudioRecorderTeacher } from '../Teaching/AudioRecorderTeacher'
import { ImageUploader } from '../Teaching/ImageUploader'
import { TabCropper } from '../Teaching/TabCropper'
import { getClipsForSkillOrPattern } from '../../engine/teacherClipService'
import type { TeacherClip } from '../../db/db'

type PracticeView = 'plan' | 'item' | 'summary' | 'metronome' | 'complete'

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

/** Generate HighwayNote[] from a roll pattern, looping enough cycles to fill `durationSec`. */
function generateHighwayNotes(
  patternId: string,
  bpm: number,
  durationSec: number = 30
): HighwayNote[] {
  const pattern = ROLL_MAP.get(patternId)
  if (!pattern) return []

  const eighthNoteSec = 60 / (bpm * 2) // 8th note interval
  const totalNotes = Math.ceil(durationSec / eighthNoteSec)
  const notes: HighwayNote[] = []

  for (let i = 0; i < totalNotes; i++) {
    const stringNum = pattern.strings[i % pattern.strings.length]
    if (stringNum === null) continue // skip wildcards
    notes.push({
      id: `hw-${i}`,
      string: stringNum,
      fret: 0, // open strings for rolls
      time: i * eighthNoteSec,
      duration: eighthNoteSec * 0.8,
      state: 'upcoming',
    })
  }
  return notes
}

type ActiveTool = 'metronome' | 'roll' | 'lick' | 'recorder' | 'calibrate' | 'listen' | 'play_along' | 'video_record' | 'audio_record' | 'upload_image' | 'upload_tab' | null

function ExerciseView({
  item,
  onComplete,
}: {
  item: RecommendedItem
  onComplete: (achievedBpm: number | null, rating: SelfRating, scores: Record<string, number>, noteEvaluations?: NoteEvaluation[]) => void
}) {
  const openModal = useStore((s) => s.openModal)
  const setOpenModal = useStore((s) => s.setOpenModal)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const skillImageOverrides = useStore((s) => s.skillImageOverrides)
  const isTeacher = activeUserRole === 'teacher'
  const [achievedBpm, setAchievedBpm] = useState<string>(String(item.suggestedBpm ?? ''))
  const [rating, setRating] = useState<SelfRating | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)

  const { skill } = item

  // Teacher demo clips
  const [teacherClips, setTeacherClips] = useState<TeacherClip[]>([])
  useEffect(() => {
    getClipsForSkillOrPattern(skill.id, skill.rollPatternId ?? null).then(setTeacherClips)
  }, [skill.id, skill.rollPatternId])
  const [highwayPlaying, setHighwayPlaying] = useState(false)
  const highwayPlayingRef = useRef(false)
  type RollPanelTab = 'fretlab' | 'pattern' | 'highway'
  const [rollTab, setRollTab] = useState<RollPanelTab>('fretlab')
  const [rollDetectorActive, setRollDetectorActive] = useState(false)
  const rollDetectorRef = useRef(false)

  // Pending scores from analysis tools
  const [pendingRhythm, setPendingRhythm] = useState<number | null>(null)
  const [pendingTempo, setPendingTempo] = useState<number | null>(null)
  const [pendingPitch, setPendingPitch] = useState<number | null>(null)

  // Accumulated note evaluations from LiveRollFeedback
  const noteEvalsRef = useRef<NoteEvaluation[]>([])

  // Tempo mode state
  const [tempoMode, setTempoMode] = useState<TempoMode>('fixed')
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveTempoState | null>(null)
  const [interleavedState, setInterleavedState] = useState<InterleavedTempoState | null>(null)

  // Derive controlled BPM from active tempo mode
  const controlledBpm = tempoMode === 'adaptive' && adaptiveState
    ? adaptiveState.currentBpm
    : tempoMode === 'interleaved' && interleavedState
    ? interleavedState.currentBpm
    : undefined

  function handleTempoModeChange(mode: TempoMode) {
    setTempoMode(mode)
    const baseBpm = item.suggestedBpm ?? 80
    if (mode === 'adaptive') {
      setAdaptiveState(createAdaptiveTempoState(baseBpm))
      setInterleavedState(null)
    } else if (mode === 'interleaved') {
      setInterleavedState(createInterleavedTempoState(baseBpm))
      setAdaptiveState(null)
    } else {
      setAdaptiveState(null)
      setInterleavedState(null)
    }
  }

  // Highway notes generated from roll pattern
  const highwayNotes = useMemo(
    () => skill.rollPatternId ? generateHighwayNotes(skill.rollPatternId, item.suggestedBpm ?? 80) : [],
    [skill.rollPatternId, item.suggestedBpm]
  )
  const highwayNotesRef = useRef(highwayNotes)
  highwayNotesRef.current = highwayNotes

  const highwayRendererRef = useRef<NoteHighwayRenderer | null>(null)
  const highwayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const highwayStartTimeRef = useRef<number>(0)
  const highwayWaitingRef = useRef(false)  // true = listening but waiting for first pick
  const [highwayWaiting, setHighwayWaiting] = useState(false)
  const [highwayHitCount, setHighwayHitCount] = useState(0)
  const [highwayResult, setHighwayResult] = useState<HighwayResult | null>(null)

  const showHighway = rollTab === 'highway' && !!skill.rollPatternId

  // Set up / tear down the renderer when highway tab is active
  useEffect(() => {
    highwayRendererRef.current?.destroy()
    highwayRendererRef.current = null

    if (!showHighway) return

    const timerId = setTimeout(() => {
      const canvas = highwayCanvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const cssW = rect.width || 600
      const cssH = rect.height || 200
      const dpr = window.devicePixelRatio || 1
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const renderer = new NoteHighwayRenderer(canvas, {}, cssW, cssH)
      renderer.setNotes(highwayNotes)
      renderer.setOnComplete((result) => {
        stopListening()
        highwayPlayingRef.current = false
        setHighwayPlaying(false)
        setHighwayResult(result)
      })
      highwayRendererRef.current = renderer
    }, 50)

    return () => {
      clearTimeout(timerId)
      highwayRendererRef.current?.destroy()
      highwayRendererRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHighway, highwayNotes])

  const hasPitch = skill.scoringTypes.includes('pitch') || skill.scoringTypes.includes('string_ring')
  const hasRoll = skill.scoringTypes.includes('rhythm')
  const hasLick = skill.scoringTypes.includes('audio_match') && !!skill.lickId
  const hasAnalysis = hasRoll || hasLick
  const hasLiveRoll = hasRoll && !!skill.rollPatternId
  const hasSong = !!skill.songId
  const hasInteractiveExercises = skill.exercises.some((ex) => ex.type)

  // Synth for audio demos
  const synth = useBanjoSynth()

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
  } = useNoteCapture({
    onNoteDetected: (captured) => {
      const renderer = highwayRendererRef.current
      if (!renderer || !highwayPlayingRef.current) return

      // First pick triggers the highway animation
      if (highwayWaitingRef.current) {
        highwayStartTimeRef.current = performance.now()
        renderer.setCurrentTime(0)
        renderer.start()
        highwayWaitingRef.current = false
        setHighwayWaiting(false)
      }

      const elapsedSec = (captured.timestamp - highwayStartTimeRef.current) / 1000
      const windowSec = 0.3 // 300ms hit window
      const notes = highwayNotesRef.current
      // Find closest upcoming note within timing window
      let bestMatch: HighwayNote | null = null
      let bestDelta = windowSec
      for (const n of notes) {
        if (n.state !== 'upcoming') continue
        const delta = Math.abs(n.time - elapsedSec)
        if (delta > windowSec) continue
        if (captured.banjoString !== null && n.string !== captured.banjoString) continue
        if (delta < bestDelta) {
          bestDelta = delta
          bestMatch = n
        }
      }
      if (bestMatch) {
        bestMatch.state = 'hit'
        renderer.markNote(bestMatch.id, 'hit')
        setHighwayHitCount(c => c + 1)
      }
    },
  })

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

  // Stop listening when switching away from analysis tools (but not if highway is using the mic)
  useEffect(() => {
    if (activeTool !== 'roll' && activeTool !== 'lick' && isListening && !highwayPlayingRef.current && !rollDetectorRef.current) {
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

      {/* ── Compact header row ── */}
      <div className="ev-header">
        <div className="ev-header-top">
          <h2 className="ev-title">{skill.name}</h2>
          {item.suggestedBpm && <span className="ev-target-bpm">{item.suggestedBpm} BPM</span>}
          <div className="ev-badges">
            <span className="ev-chip">{PATH_LABELS[skill.path] ?? skill.path}</span>
            <span className="ev-chip">Mo. {skill.month}</span>
            {skill.isMilestone && <span className="ev-chip ev-chip-milestone">Milestone</span>}
            {skill.scoringTypes.map((t) => (
              <span key={t} className="ev-chip" style={{ borderColor: SCORING_BADGES[t].color, color: SCORING_BADGES[t].color }}>
                {SCORING_BADGES[t].label}
              </span>
            ))}
          </div>
        </div>
        <p className="ev-desc">{skill.description}</p>
        {item.reason.includes('prerequisites') && skill.prerequisites.length > 0 && (
          <div className="ev-prereq-banner">
            <span className="ev-prereq-icon">◈</span>
            <span>Prerequisites: {skill.prerequisites.map((id) => SKILL_MAP.get(id)?.name ?? id).join(', ')}</span>
          </div>
        )}
      </div>

      {/* ── Two-column grid ── */}
      <div className="ev-grid">

        {/* ── LEFT: Visual panel + Exercises ── */}
        <div className="ev-col-main">

          <BpmProgressBar item={item} />

          {/* Skill reference image (admin override takes priority) */}
          {(() => {
            const override = skillImageOverrides.get(skill.id)
            if (override) {
              return (
                <div className="ev-skill-image">
                  <img src={override.imageUrl} alt={override.alt} className="ev-skill-img" />
                  {override.caption && <p className="ev-skill-img-caption">{override.caption}</p>}
                </div>
              )
            }
            if (skill.image) {
              return (
                <div className="ev-skill-image">
                  <img src={skill.image.src} alt={skill.image.alt} className="ev-skill-img" />
                  {skill.image.caption && <p className="ev-skill-img-caption">{skill.image.caption}</p>}
                </div>
              )
            }
            return null
          })()}

          {/* Unified roll panel (Pattern / Weak Spots / Highway) */}
          {skill.rollPatternId && (() => {
            const pattern = ROLL_MAP.get(skill.rollPatternId!)
            if (!pattern) return null
            return (
              <div className="ev-roll-panel">
                <div className="ev-roll-tabs">
                  <button className={`ev-roll-tab ${rollTab === 'fretlab' ? 'ev-roll-tab-active' : ''}`} onClick={() => { if (rollDetectorActive) { stopListening(); setRollDetectorActive(false); rollDetectorRef.current = false } setRollTab('fretlab') }}>Fret Lab</button>
                  <button className={`ev-roll-tab ${rollTab === 'pattern' ? 'ev-roll-tab-active' : ''}`} onClick={() => { setRollTab('pattern') }}>Pattern</button>
                  <button className={`ev-roll-tab ${rollTab === 'highway' ? 'ev-roll-tab-active' : ''}`} onClick={() => { if (rollDetectorActive) { stopListening(); setRollDetectorActive(false); rollDetectorRef.current = false } setRollTab('highway') }}>Play Along</button>
                </div>
                <div className="ev-roll-body">
                  {rollTab === 'pattern' && (
                    <>
                      <BanjoTabDiagram
                        strings={pattern.strings}
                        fingers={pattern.fingers}
                        label={pattern.name}
                        playedStrings={rollDetectorActive ? notes.map(n => n.banjoString ?? 0) : undefined}
                      />
                      <div className="roll-detector-controls">
                        <button
                          className={`btn btn-sm ${rollDetectorActive ? 'btn-stop-detect' : 'btn-primary'}`}
                          onClick={() => {
                            if (rollDetectorActive) {
                              stopListening()
                              synth.stop()
                              Tone.getTransport().stop()
                              Tone.getTransport().cancel()
                              setRollDetectorActive(false)
                              rollDetectorRef.current = false
                            } else {
                              clearNotes()
                              startListening()
                              setRollDetectorActive(true)
                              rollDetectorRef.current = true
                            }
                          }}
                        >
                          {rollDetectorActive ? '■ Stop Detector' : '● Enable Roll Detector'}
                        </button>
                        {rollDetectorActive && (
                          <span className="roll-detector-status">
                            Listening... {notes.length} notes
                          </span>
                        )}
                      </div>

                      {/* Live weak spot + finger balance meters (visible when detector active) */}
                      {rollDetectorActive && noteEvalsRef.current.length >= 4 && (
                        <>
                          <LiveWeakSpots evaluations={noteEvalsRef.current} patternId={skill.rollPatternId!} />
                          <FingerBalanceMeter evaluations={noteEvalsRef.current} patternId={skill.rollPatternId!} />
                        </>
                      )}
                    </>
                  )}
                  {rollTab === 'fretlab' && (
                    <FretLabPanel
                      rollPatternId={skill.rollPatternId ?? null}
                      lickId={skill.lickId ?? null}
                      bpm={controlledBpm}
                    />
                  )}
                  {rollTab === 'highway' && (
                    <>
                      <canvas ref={highwayCanvasRef} className="note-highway-canvas" />
                      <div className="note-highway-controls">
                        <button
                          className={`btn btn-sm ${highwayPlaying ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => {
                            const renderer = highwayRendererRef.current
                            if (!renderer) return
                            if (highwayPlaying) {
                              renderer.stop()
                              stopListening()
                              synth.stop()
                              Tone.getTransport().stop()
                              Tone.getTransport().cancel()
                              highwayPlayingRef.current = false
                              highwayWaitingRef.current = false
                              setHighwayPlaying(false)
                              setHighwayWaiting(false)
                            } else {
                              stopListening()
                              startListening()
                              setHighwayHitCount(0)
                              setHighwayResult(null)
                              const fresh = highwayNotes.map(n => ({ ...n, state: 'upcoming' as const }))
                              renderer.setNotes(fresh)
                              renderer.setCurrentTime(0)
                              // Don't start animation yet — wait for first pick
                              highwayWaitingRef.current = true
                              setHighwayWaiting(true)
                              highwayPlayingRef.current = true
                              setHighwayPlaying(true)
                            }
                          }}
                        >
                          {highwayPlaying ? '■ Stop' : '▶ Start'}
                        </button>
                        {highwayPlaying && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                            {highwayWaiting ? 'Pick a string to begin...' : `Hits: ${highwayHitCount}`}
                          </span>
                        )}
                      </div>
                      {highwayResult && (
                        <div className={`highway-result ${highwayResult.percent >= 80 ? 'highway-result-good' : highwayResult.percent >= 50 ? 'highway-result-ok' : 'highway-result-poor'}`}>
                          <span className="highway-result-percent">{highwayResult.percent}%</span>
                          <span className="highway-result-detail">
                            {highwayResult.hits}/{highwayResult.total} notes hit
                          </span>
                          <span className="highway-result-label">
                            {highwayResult.percent >= 90 ? 'Excellent!' : highwayResult.percent >= 80 ? 'Great job!' : highwayResult.percent >= 50 ? 'Keep practicing' : 'Try slowing down'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Fret Lab for lick skills (no roll pattern) */}
          {!skill.rollPatternId && skill.lickId && (
            <div className="ev-roll-panel">
              <div className="ev-roll-tabs">
                <button className="ev-roll-tab ev-roll-tab-active">Fret Lab</button>
              </div>
              <div className="ev-roll-body">
                <FretLabPanel
                  rollPatternId={null}
                  lickId={skill.lickId}
                  bpm={controlledBpm}
                />
              </div>
            </div>
          )}

          {/* Weak spot drills (auto-generated from historical accuracy data) */}
          {hasLiveRoll && skill.rollPatternId && (
            <WeakSpotDrills
              skillId={skill.id}
              patternId={skill.rollPatternId}
              currentBpm={item.suggestedBpm ?? 80}
            />
          )}

          {/* Teacher demo clips */}
          {teacherClips.length > 0 && (
            <TeacherMediaPlayer
              clips={teacherClips}
              editable={isTeacher}
              onClipsReordered={() => getClipsForSkillOrPattern(skill.id, skill.rollPatternId ?? null).then(setTeacherClips)}
            />
          )}

          {/* Exercises — carousel for theory lessons, list for others */}
          {hasInteractiveExercises && skill.exercises.every((ex) => ex.type) ? (
            <LessonCarousel
              exercises={skill.exercises}
              synth={synth}
              notes={notes}
              isListening={isListening}
              startListening={startListening}
              stopListening={stopListening}
              clearNotes={clearNotes}
              defaultBpm={item.suggestedBpm}
            />
          ) : (
            <div className="exercise-steps">
              <h3 className="steps-title">Exercises</h3>
              {skill.exercises.map((ex, i) => (
                ex.type ? (
                  <InteractiveStep key={i} exercise={ex} stepNumber={i + 1} synth={synth} notes={notes} isListening={isListening} startListening={startListening} stopListening={stopListening} clearNotes={clearNotes} onPass={() => {}} onFail={() => {}} defaultBpm={item.suggestedBpm} hideTabDiagram={!!skill.rollPatternId} />
                ) : (
                  <div key={i} className="exercise-step">
                    <span className="step-num">{i + 1}</span>
                    <span className="step-instruction">{ex.instruction}</span>
                    {ex.bpm && <span className="step-bpm">@ {ex.bpm} BPM</span>}
                  </div>
                )
              ))}
            </div>
          )}

          {/* Chord diagrams */}
          {skill.chordId && (() => {
            const shapes = CHORD_GROUPS[skill.chordId!]
            if (!shapes?.length) return null
            return (
              <div className="chord-diagram-row">
                {shapes.map((chord) => <BanjoChordDiagram key={chord.id} chord={chord} />)}
              </div>
            )
          })()}

          {/* Mastery criteria */}
          <div className="mastery-criteria">
            <span className="mastery-criteria-label">What success looks like</span>
            <p className="mastery-criteria-text">{skill.masteryCriteria}</p>
          </div>
        </div>

        {/* ── RIGHT: Tools + Log ── */}
        <div className="ev-col-tools">

          {/* Tools — collapsible panel */}
          <details className="ev-tools-panel" open={activeTool !== null}>
            <summary className="ev-tools-summary">
              <span className="ev-tools-summary-icon">🛠</span>
              <span>Tools</span>
              {activeTool && <span className="ev-tools-active-dot" />}
            </summary>
            <div className="ev-tools">
              {hasSong && <button className={`tool-btn ${activeTool === 'play_along' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('play_along')}>▶ Along</button>}
              <button className={`tool-btn ${activeTool === 'metronome' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('metronome')}>♩ Metro</button>
              {hasPitch && <button className={`tool-btn${skill.id === 'setup_strings_and_picking' && openModal !== 'tuner' ? ' tool-btn-pulse' : ''}`} onClick={() => setOpenModal('tuner')}>◎ Tuner</button>}
              {(hasAnalysis || hasPitch) && <button className={`tool-btn ${activeTool === 'recorder' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('recorder')}>● Rec</button>}
              <button className={`tool-btn tool-btn-cal ${activeTool === 'calibrate' ? 'tool-btn-active' : ''} ${loadCalibration() ? 'tool-btn-cal-saved' : ''}`} onClick={() => toggleTool('calibrate')} title="Calibrate audio detection">⚙ Cal</button>
              <button className={`tool-btn ${activeTool === 'video_record' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('video_record')} title="Record video clip">🎥 Video</button>
              <button className={`tool-btn ${activeTool === 'audio_record' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('audio_record')} title="Record audio clip">🎤 Audio</button>
              <button className={`tool-btn ${activeTool === 'upload_image' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('upload_image')} title="Upload image">🖼 Img</button>
              <button className={`tool-btn ${activeTool === 'upload_tab' ? 'tool-btn-active' : ''}`} onClick={() => toggleTool('upload_tab')} title="Upload tablature">🎵 Tab</button>
            </div>
          </details>
          {skill.id === 'setup_strings_and_picking' && openModal !== 'tuner' && (
            <div className="tool-btn-hint" onClick={() => setOpenModal('tuner')}>↑ Tap the Tuner button to start tuning!</div>
          )}

          {/* Tempo mode selector (only for skills with roll patterns) */}
          {hasLiveRoll && (
            <TempoModeSelector
              mode={tempoMode}
              onChange={handleTempoModeChange}
              currentBpm={controlledBpm ?? null}
            />
          )}

          {/* Jam Circle — spatial audio toggle */}
          {hasLiveRoll && (
            <JamCircle
              onToggleSpatial={(on) => synth.setSpatial(on)}
              isPlaying={synth.isPlaying}
              currentBeat={synth.currentBeat}
            />
          )}

          {/* Inline tool panels */}
          {activeTool === 'metronome' && <div className="inline-tool-panel"><Metronome controlledBpm={controlledBpm} /></div>}

          {activeTool === 'recorder' && <div className="inline-tool-panel"><AudioRecorder skillId={skill.id} bpm={item.suggestedBpm} analyserRef={analyserRef} streamRef={streamRef} /></div>}
          {activeTool === 'calibrate' && <div className="inline-tool-panel"><CalibrationWizard onClose={() => setActiveTool(null)} /></div>}
          {activeTool === 'play_along' && skill.songId && <div className="inline-tool-panel"><PlayAlong songId={skill.songId} sectionId={skill.songSectionId} bpm={item.suggestedBpm ?? 70} synth={synth} /></div>}
          {activeTool === 'video_record' && (
            <div className="inline-tool-panel">
              <VideoRecorder
                skillId={skill.id}
                rollPatternId={skill.rollPatternId}
                onSaved={() => {
                  setActiveTool(null)
                  getClipsForSkillOrPattern(skill.id, skill.rollPatternId ?? null).then(setTeacherClips)
                }}
                onCancel={() => setActiveTool(null)}
              />
            </div>
          )}
          {activeTool === 'audio_record' && (
            <div className="inline-tool-panel">
              <AudioRecorderTeacher
                skillId={skill.id}
                rollPatternId={skill.rollPatternId}
                onSaved={() => {
                  setActiveTool(null)
                  getClipsForSkillOrPattern(skill.id, skill.rollPatternId ?? null).then(setTeacherClips)
                }}
                onCancel={() => setActiveTool(null)}
              />
            </div>
          )}
          {activeTool === 'upload_image' && (
            <div className="inline-tool-panel">
              <ImageUploader
                skillId={skill.id}
                rollPatternId={skill.rollPatternId}
                onSaved={() => {
                  setActiveTool(null)
                  getClipsForSkillOrPattern(skill.id, skill.rollPatternId ?? null).then(setTeacherClips)
                }}
                onCancel={() => setActiveTool(null)}
              />
            </div>
          )}
          {activeTool === 'upload_tab' && (
            <div className="inline-tool-panel">
              <TabCropper
                skillId={skill.id}
                rollPatternId={skill.rollPatternId}
                onSaved={() => {
                  setActiveTool(null)
                  getClipsForSkillOrPattern(skill.id, skill.rollPatternId ?? null).then(setTeacherClips)
                }}
                onCancel={() => setActiveTool(null)}
              />
            </div>
          )}

          {/* Realtime feedback + Roll Clock */}
          {noteEvalsRef.current.length > 0 && (
            <>
              <RealtimeFeedback evaluations={noteEvalsRef.current} />
              {hasLiveRoll && rollDetectorActive && (
                <RollClock
                  evaluations={noteEvalsRef.current}
                  patternId={skill.rollPatternId!}
                  cursor={noteEvalsRef.current.length > 0 ? noteEvalsRef.current[noteEvalsRef.current.length - 1].position : 0}
                />
              )}
            </>
          )}

          {/* Pending scores */}
          {(pendingRhythm !== null || pendingPitch !== null || pendingTempo !== null) && (
            <div className="pending-scores">
              {pendingRhythm !== null && <span className="pending-score-chip">Rhythm: {pendingRhythm}%</span>}
              {pendingPitch !== null && <span className="pending-score-chip">Pitch: {pendingPitch}%</span>}
              {pendingTempo !== null && <span className="pending-score-chip">Tempo: {pendingTempo}%</span>}
            </div>
          )}

          {/* Log result — compact */}
          <div className="ev-log">
            <h3 className="steps-title">Log Result</h3>
            {skill.progressBpm !== null && (
              <div className="achieved-bpm-row">
                <label className="achieved-bpm-label">BPM:</label>
                <input type="number" className="achieved-bpm-input" value={achievedBpm} onChange={(e) => setAchievedBpm(e.target.value)} min={20} max={300} placeholder="e.g. 80" />
              </div>
            )}
            <div className="rating-row">
              {ratings.map((r) => (
                <button key={r.value} className={`rating-btn ${rating === r.value ? 'rating-btn-selected' : ''}`} onClick={() => setRating(r.value)}>
                  <span className="rating-emoji">{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary" disabled={!rating} onClick={() => {
              const bpm = achievedBpm ? parseInt(achievedBpm) : null
              const scores: Record<string, number> = {}
              if (pendingRhythm !== null) scores.rhythm = pendingRhythm
              if (pendingPitch !== null) scores.pitch = pendingPitch
              if (pendingTempo !== null) scores.tempo = pendingTempo
              const evals = noteEvalsRef.current.length > 0 ? noteEvalsRef.current : undefined
              onComplete(bpm && !isNaN(bpm) ? bpm : null, rating!, scores, evals)
            }}>
              Mark Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Module-level flag: once warmup is skipped, don't show again until page reload
let warmupSkippedThisSession = false

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
  const [focusPlan, setFocusPlan] = useState<SessionPlan | null>(null)
  const [loadingFocus, setLoadingFocus] = useState(false)
  const [lastItemMetrics, setLastItemMetrics] = useState<PerformanceMetrics | null>(null)
  const [lastItemChunks, setLastItemChunks] = useState<ChunkDrill[]>([])
  const [lastItemNextReview, setLastItemNextReview] = useState<string | null>(null)
  const [showWarmup, setShowWarmup] = useState(false)

  async function handleFocusMode() {
    setLoadingFocus(true)
    const drillItems = await generateFocusDrill(skillRecords)
    if (drillItems.length > 0) {
      setFocusPlan(focusDrillToSessionPlan(drillItems))
    }
    setLoadingFocus(false)
  }

  // Single-skill mode: when user taps a skill from the SkillTree
  const selectedSkill = selectedSkillId ? SKILL_MAP.get(selectedSkillId) ?? null : null
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
  const isTeacher = activeUserRole === 'teacher'

  // Check if the selected skill is locked
  const isSelectedLocked = selectedSkill
    ? evaluateSkillStatus(selectedSkill, skillRecords.get(selectedSkill.id) ?? null, skillRecords, disabled, isTeacher) === 'locked'
    : false

  const singleSkillItem: RecommendedItem | null = selectedSkill
    ? {
        skill: selectedSkill,
        record: skillRecords.get(selectedSkill.id) ?? null,
        reason: isSelectedLocked ? 'Preview (prerequisites needed)' : 'Selected from skill tree',
        suggestedBpm: selectedSkill.progressBpm ?? null,
        priority: 0,
      }
    : null

  const activePlan = focusPlan ?? sessionPlan
  const allItems = singleSkillItem
    ? [singleSkillItem]
    : activePlan
    ? [...(activePlan.newSkills), ...(activePlan.activeWork), ...(activePlan.maintenance)]
    : []

  // Auto-start into exercise view for single-skill mode (show warmup first)
  useEffect(() => {
    if (singleSkillItem && (view === 'plan' || view === 'complete')) {
      setCurrentIndex(0)
      setCompletedIds([])
      clearNewlyUnlocked()
      if (warmupSkippedThisSession) {
        startSession().then(() => setView('item'))
      } else {
        setShowWarmup(true)
      }
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

  async function handleItemComplete(achievedBpm: number | null, rating: SelfRating, scores: Record<string, number>, noteEvaluations?: NoteEvaluation[]) {
    const item = allItems[currentIndex]
    if (!item) return

    clearNewlyUnlocked()
    await logSessionItem(item.skill.id, achievedBpm, rating, scores, noteEvaluations)
    setCompletedIds((prev) => [...prev, item.skill.id])

    // Get metrics from store for summary
    const metrics = useStore.getState().lastMetrics
    setLastItemMetrics(metrics)

    // Check for weak chunks if we have note evaluations and a roll pattern
    if (noteEvaluations && noteEvaluations.length > 0 && item.skill.rollPatternId) {
      const chunks = identifyWeakChunks(noteEvaluations, item.skill.rollPatternId, achievedBpm ?? 80)
      setLastItemChunks(chunks)
    } else {
      setLastItemChunks([])
    }

    // Get next review date from updated skill record
    const updatedRecord = useStore.getState().skillRecords.get(item.skill.id)
    setLastItemNextReview(updatedRecord?.fsrsNextReview ?? updatedRecord?.srNextReview ?? null)

    // Show summary if we have metrics, otherwise advance directly
    if (metrics) {
      setView('summary')
    } else if (currentIndex < allItems.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      await endSession()
      setView('complete')
    }
  }

  async function handleSummaryContinue() {
    setLastItemMetrics(null)
    setLastItemChunks([])
    setLastItemNextReview(null)
    if (currentIndex < allItems.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setView('item')
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

  function getNextSkillId(): string | null {
    if (!selectedSkillId) return null
    const currentIdx = SKILLS.findIndex((s) => s.id === selectedSkillId)
    if (currentIdx < 0) return null
    // Find the next skill in curriculum order that isn't disabled or locked
    for (let i = currentIdx + 1; i < SKILLS.length; i++) {
      const skill = SKILLS[i]
      if (disabled.has(skill.id)) continue
      const status = evaluateSkillStatus(skill, skillRecords.get(skill.id) ?? null, skillRecords, disabled, isTeacher)
      if (status !== 'locked') return skill.id
    }
    return null
  }

  const nextSkillId = singleSkillItem ? getNextSkillId() : null

  function handleDone() {
    if (singleSkillItem) {
      clearSelectedSkill()
    } else {
      setPage('dashboard')
    }
  }

  function handleNextSkill() {
    if (nextSkillId) {
      practiceSkill(nextSkillId)
    } else {
      clearSelectedSkill()
    }
  }

  // Locked skills now open normally with a prereq banner (see ev-prereq-banner in ExerciseView)

  if (!singleSkillItem && (!sessionPlan || allItems.length === 0)) {
    return (
      <div className="practice-empty">
        <h2>No practice items ready</h2>
        <p>Go to the Dashboard and select your learning path to get started.</p>
        <button className="btn btn-primary" onClick={() => setPage('dashboard')}>Back to Dashboard</button>
      </div>
    )
  }

  const warmupOverlay = showWarmup ? (
    <WarmupModal
      onComplete={() => { warmupSkippedThisSession = true; setShowWarmup(false); handleStart() }}
      onSkip={() => { warmupSkippedThisSession = true; setShowWarmup(false); handleStart() }}
    />
  ) : null

  if (view === 'plan') {
    return (
      <div className="practice-plan-view">
        {warmupOverlay}
        <h2>{focusPlan ? 'Focus Mode' : "Today's Session"}</h2>
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

        <div className="practice-plan-actions">
          <button className="btn btn-primary" onClick={() => {
            if (warmupSkippedThisSession) {
              handleStart()
            } else {
              setShowWarmup(true)
            }
          }}>
            Begin Session
          </button>
          {!focusPlan && (
            <button
              className="btn btn-secondary"
              onClick={handleFocusMode}
              disabled={loadingFocus}
            >
              {loadingFocus ? 'Analyzing...' : 'Focus Mode'}
            </button>
          )}
          {focusPlan && (
            <button
              className="btn btn-secondary"
              onClick={() => setFocusPlan(null)}
            >
              Back to Normal Plan
            </button>
          )}
        </div>

      </div>
    )
  }

  if (view === 'summary' && lastItemMetrics) {
    const currentItem = allItems[currentIndex]
    return (
      <div className="practice-session">
        {warmupOverlay}
        <SessionSummary
          metrics={lastItemMetrics}
          nextReviewDate={lastItemNextReview}
          skillName={currentItem?.skill.name ?? 'Practice'}
          onContinue={handleSummaryContinue}
        />
        {lastItemChunks.length > 0 && currentItem?.skill.rollPatternId && (
          <ChunkDrillPrompt
            chunks={lastItemChunks}
            patternName={currentItem.skill.name}
            onDismiss={handleSummaryContinue}
            onDrill={() => handleSummaryContinue()}
          />
        )}
      </div>
    )
  }

  if (view === 'complete') {
    return (
      <div className="practice-complete">
        {warmupOverlay}
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
        {singleSkillItem ? (
          <div className="practice-complete-actions">
            <button className="btn btn-primary" onClick={handleNextSkill}>
              {nextSkillId
                ? `Move to: ${SKILL_MAP.get(nextSkillId)?.name ?? 'Next Skill'} →`
                : 'Back to Skills'}
            </button>
            {nextSkillId && (
              <button className="btn btn-secondary" onClick={handleDone}>
                Back to Skills
              </button>
            )}
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleDone}>
            Back to Dashboard
          </button>
        )}
      </div>
    )
  }

  const currentItem = allItems[currentIndex]

  if (!currentItem) {
    return (
      <div className="practice-session">
        {warmupOverlay}
        <div className="no-session-content">
          <p>No skill selected.</p>
          <button className="btn btn-primary" onClick={() => setPage('dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="practice-session">
      {warmupOverlay}
      {/* Back button for single-skill mode */}
      {singleSkillItem && (
        <button className="practice-back-btn" onClick={() => clearSelectedSkill()}>
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

      <SessionTimer totalMinutes={30} onTimeUp={() => {}} />

      {/* Unlock notification */}
      {newlyUnlocked.length > 0 && (
        <div className="unlock-banner">
          🔓 Unlocked: {newlyUnlocked.map((id) => SKILL_MAP.get(id)?.name).join(', ')}
        </div>
      )}

      <ExerciseView item={currentItem} onComplete={handleItemComplete} />

      {singleSkillItem ? (
        <button className="skip-btn" onClick={() => clearSelectedSkill()}>
          ← Skills
        </button>
      ) : (
        <button className="skip-btn" onClick={handleSkip}>
          Skip this item →
        </button>
      )}
    </div>
  )
}
