// ─── FretboardDiagram — Tab strip with note playback ─────────────────────────
//
// NOTE: The photo-based banjo neck overlay has been archived to
// _archive/BanjoNeck.tsx. This component now renders the info bar + tab strip.

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  type FretNote,
  EXAMPLE_CRIPPLE_CREEK,
} from '../../data/fretboardNotes'
import { BanjoSynth } from '../../engine/banjoSynth'

// ─── String colors — consistent color per string for fast scanning ──────────

const STRING_COLORS: Record<number, string> = {
  1: '#FF6B6B', // String 1 (D4) — red
  2: '#4ADE80', // String 2 (B3) — green
  3: '#4A9EFF', // String 3 (G3) — blue
  4: '#F5A623', // String 4 (D3) — amber
  5: '#C084FC', // String 5 (G4) — purple
}

// ─── Display Steps — group simultaneous notes (pinches) ─────────────────────

interface DisplayStep {
  notes: FretNote[]   // 1 = single note, 2+ = pinch
  startIndex: number  // index into the original FretNote[] array
}

function buildDisplaySteps(notes: FretNote[]): DisplayStep[] {
  const steps: DisplayStep[] = []
  let i = 0
  while (i < notes.length) {
    const note = notes[i]
    if (note.group != null) {
      const groupNotes = [note]
      let j = i + 1
      while (j < notes.length && notes[j].group === note.group) {
        groupNotes.push(notes[j])
        j++
      }
      steps.push({ notes: groupNotes, startIndex: i })
      i = j
    } else {
      steps.push({ notes: [note], startIndex: i })
      i++
    }
  }
  return steps
}

// ─── Component Props ─────────────────────────────────────────────────────────

interface FretboardDiagramProps {
  notes?: FretNote[]
  currentIndex?: number
  lookahead?: number
  autoPlay?: boolean
  bpm?: number
  showNoteNames?: boolean
  /** If true, synth does not play notes on activeStep changes. Cursor still advances. */
  synthMuted?: boolean
  /** If false, playback stops after the last step instead of looping. Default: true. */
  loop?: boolean
  /** Called when playback reaches the final step in a non-looping pass. */
  onComplete?: () => void
  /** Called with the current active step index on every change. */
  onActiveStepChange?: (step: number) => void
}

// ─── Tab Cell Formatting — technique notation (2S4, 0H2, 3P2) ──────────────

function formatTabCell(note: FretNote): string {
  const fret = note.fret === 0 ? '0' : String(note.fret)
  if (!note.technique || note.slideToFret == null) return fret
  const dest = note.slideToFret
  if (note.technique === 'slide') return `${fret}S${dest}`
  if (note.technique === 'hammer') return `${fret}H${dest}`
  if (note.technique === 'pull') return `${fret}P${dest}`
  return fret
}

// ─── ASCII Tab Strip — real tablature look with 5 string lines ──────────────

const STRING_LABELS: Record<number, string> = {
  1: 'D4', 2: 'B3', 3: 'G3', 4: 'D3', 5: 'G4',
}
const NOTES_PER_MEASURE = 8

function TabStrip({ steps, activeStep, onStepClick, showNoteNames }: {
  steps: DisplayStep[]
  activeStep: number
  onStepClick?: (stepIdx: number) => void
  showNoteNames?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const strings = [1, 2, 3, 4, 5]

  // Auto-scroll to keep active step visible
  useEffect(() => {
    if (activeStep < 0 || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-tab-step="${activeStep}"]`) as HTMLElement
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeStep])

  // Group steps into measures of 8
  const measures: DisplayStep[][] = []
  for (let i = 0; i < steps.length; i += NOTES_PER_MEASURE) {
    measures.push(steps.slice(i, i + NOTES_PER_MEASURE))
  }

  // Compute max cell width per step (technique notation like 2S5 is wider)
  function cellWidth(step: DisplayStep): number {
    let max = 1
    for (const n of step.notes) {
      max = Math.max(max, formatTabCell(n).length)
    }
    return max
  }

  // Render dashes to fill a given character width
  function dashes(count: number): string {
    return '-'.repeat(count)
  }

  return (
    <div className="ascii-tab">
      {/* Fixed string labels */}
      <div className="ascii-tab-labels">
        {strings.map(str => (
          <div key={str} className="ascii-tab-label" style={{ color: STRING_COLORS[str] }}>
            {STRING_LABELS[str]}
          </div>
        ))}
        <div className="ascii-tab-label ascii-tab-label-finger">Pick</div>
        {showNoteNames && <div className="ascii-tab-label ascii-tab-label-note">Note</div>}
      </div>

      {/* Scrollable tab body */}
      <div className="ascii-tab-scroll" ref={scrollRef}>
        {measures.map((measure, mIdx) => {
          const baseIdx = mIdx * NOTES_PER_MEASURE
          return (
            <div key={mIdx} className="ascii-tab-measure">
              {/* Opening bar line */}
              <div className="ascii-tab-col ascii-tab-bar">
                {strings.map(str => (
                  <div key={str} className="ascii-tab-cell">|</div>
                ))}
                <div className="ascii-tab-cell ascii-tab-cell-finger">&nbsp;</div>
                {showNoteNames && <div className="ascii-tab-cell ascii-tab-cell-note">&nbsp;</div>}
              </div>

              {measure.map((step, noteIdx) => {
                const globalIdx = baseIdx + noteIdx
                const isActive = globalIdx === activeStep
                const isPlayed = activeStep >= 0 && globalIdx < activeStep
                const isNext = globalIdx === activeStep + 1
                const w = cellWidth(step)

                // Dash separator before each note (1 char wide)
                const dashCol = (
                  <div className="ascii-tab-col ascii-tab-dash" key={`d${noteIdx}`}>
                    {strings.map(str => (
                      <div key={str} className="ascii-tab-cell" style={{ color: 'rgba(255,255,255,0.2)' }}>-</div>
                    ))}
                    <div className="ascii-tab-cell ascii-tab-cell-finger">&nbsp;</div>
                    {showNoteNames && <div className="ascii-tab-cell ascii-tab-cell-note">&nbsp;</div>}
                  </div>
                )

                // Finger label
                const fingers = step.notes
                  .map(n => n.finger || '')
                  .filter(Boolean)
                const fingerLabel = fingers.length > 1 ? fingers.join('+') : fingers[0] ?? ''

                // Note column
                const noteCol = (
                  <div
                    key={`n${noteIdx}`}
                    data-tab-step={globalIdx}
                    className={`ascii-tab-col ascii-tab-note ${isActive ? 'ascii-tab-active' : ''} ${isPlayed ? 'ascii-tab-played' : ''} ${isNext ? 'ascii-tab-next' : ''}`}
                    style={{ cursor: onStepClick ? 'pointer' : undefined }}
                    onClick={onStepClick ? () => onStepClick(globalIdx) : undefined}
                  >
                    {strings.map(str => {
                      const noteOnString = step.notes.find(n => n.string === str)
                      if (noteOnString) {
                        const text = formatTabCell(noteOnString)
                        const padded = w > text.length
                          ? text + dashes(w - text.length)
                          : text
                        return (
                          <div key={str} className="ascii-tab-cell ascii-tab-cell-fret" style={{ color: STRING_COLORS[str] }}>
                            {padded}
                          </div>
                        )
                      }
                      return (
                        <div key={str} className="ascii-tab-cell" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {dashes(w)}
                        </div>
                      )
                    })}
                    <div className="ascii-tab-cell ascii-tab-cell-finger" style={{ color: STRING_COLORS[step.notes[0]?.string] }}>
                      {fingerLabel}
                    </div>
                    {showNoteNames && (
                      <div className="ascii-tab-cell ascii-tab-cell-note" style={{ color: STRING_COLORS[step.notes[0]?.string] }}>
                        {step.notes.map(n => n.note?.replace(/\d+$/, '') ?? '').join('+')}
                      </div>
                    )}
                  </div>
                )

                return [dashCol, noteCol]
              })}

              {/* Trailing dash + closing bar for last measure */}
              <div className="ascii-tab-col ascii-tab-dash">
                {strings.map(str => (
                  <div key={str} className="ascii-tab-cell" style={{ color: 'rgba(255,255,255,0.2)' }}>-</div>
                ))}
                <div className="ascii-tab-cell ascii-tab-cell-finger">&nbsp;</div>
                {showNoteNames && <div className="ascii-tab-cell ascii-tab-cell-note">&nbsp;</div>}
              </div>
              {mIdx === measures.length - 1 && (
                <div className="ascii-tab-col ascii-tab-bar">
                  {strings.map(str => (
                    <div key={str} className="ascii-tab-cell">|</div>
                  ))}
                  <div className="ascii-tab-cell ascii-tab-cell-finger">&nbsp;</div>
                  {showNoteNames && <div className="ascii-tab-cell ascii-tab-cell-note">&nbsp;</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Info Bar Helpers ────────────────────────────────────────────────────────

function formatInfoNotes(stepNotes: FretNote[]): { noteNames: string; detail: string } {
  if (stepNotes.length === 1) {
    const n = stepNotes[0]
    let detail = `String ${n.string} • ${n.fret === 0 ? 'Open' : `Fret ${n.fret}`}`
    if (n.finger) detail += ` • ${n.finger === 'T' ? 'Thumb' : n.finger === 'I' ? 'Index' : 'Middle'}`
    if (n.technique === 'slide' && n.slideToFret != null) detail += ` • Slide → Fret ${n.slideToFret}`
    if (n.technique === 'hammer' && n.slideToFret != null) detail += ` • Hammer-on → Fret ${n.slideToFret}`
    if (n.technique === 'pull' && n.slideToFret != null) detail += ` • Pull-off → Fret ${n.slideToFret}`
    if (n.duration && n.duration !== 'eighth') {
      const durNames: Record<string, string> = { whole: 'Whole', half: 'Half', quarter: 'Quarter', sixteenth: '16th' }
      detail += ` • ${durNames[n.duration] || n.duration} note`
    }
    return { noteNames: n.note, detail }
  }
  // Pinch: multiple simultaneous notes
  const noteNames = stepNotes.map(n => n.note).join(' + ')
  const strings = stepNotes.map(n => `S${n.string}`).join('+')
  const fingers = stepNotes.map(n => n.finger === 'T' ? 'Thumb' : n.finger === 'I' ? 'Index' : 'Middle').join(' + ')
  return { noteNames, detail: `${strings} • ${fingers} (pinch)` }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FretboardDiagram({
  notes = EXAMPLE_CRIPPLE_CREEK,
  currentIndex = -1,
  autoPlay = false,
  bpm = 120,
  showNoteNames = false,
  synthMuted = false,
  loop = true,
  onComplete,
  onActiveStepChange,
}: FretboardDiagramProps) {
  const steps = useMemo(() => buildDisplaySteps(notes), [notes])
  const [activeStep, setActiveStep] = useState(() => {
    if (currentIndex < 0) return -1
    return steps.findIndex(s => s.startIndex >= currentIndex)
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const synthRef = useRef<BanjoSynth | null>(null)

  // Lazily get synth instance
  function getSynth(): BanjoSynth {
    if (!synthRef.current) synthRef.current = new BanjoSynth()
    return synthRef.current
  }

  // Dispose synth on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.dispose()
      synthRef.current = null
    }
  }, [])

  // Play note(s) audio when activeStep changes
  useEffect(() => {
    if (activeStep < 0 || activeStep >= steps.length) return
    onActiveStepChange?.(activeStep)
    if (synthMuted) return
    const stepNotes = steps[activeStep].notes
    for (const n of stepNotes) {
      getSynth().playNote(n.string, n.fret)
    }
  }, [activeStep, steps, synthMuted, onActiveStepChange])

  useEffect(() => {
    if (!autoPlay) {
      const stepIdx = currentIndex < 0 ? -1 : steps.findIndex(s => s.startIndex >= currentIndex)
      setActiveStep(stepIdx)
    }
  }, [currentIndex, autoPlay, steps])

  useEffect(() => {
    if (!autoPlay || steps.length === 0) return
    const ms = (60 / bpm) * 1000
    setActiveStep(0)
    intervalRef.current = setInterval(() => {
      let completed = false
      setActiveStep((prev) => {
        const next = prev + 1
        if (next >= steps.length) {
          if (loop) return 0
          completed = true
          return prev  // stay on last step
        }
        return next
      })
      if (completed) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        onComplete?.()
      }
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoPlay, bpm, steps, loop, onComplete])

  const activeStepData = activeStep >= 0 && activeStep < steps.length ? steps[activeStep] : null
  const activeNotes = activeStepData?.notes ?? []

  const info = activeNotes.length > 0 ? formatInfoNotes(activeNotes) : null

  return (
    <div className="fretboard-diagram">
      {/* Info bar */}
      <div className="fretboard-info-bar">
        {info ? (
          <>
            <span className="fretboard-info-note" style={{ color: STRING_COLORS[activeNotes[0].string] }}>
              {info.noteNames}
            </span>
            <span className="fretboard-info-detail">
              {info.detail}
            </span>
            <span className="fretboard-info-counter">
              {activeStep + 1} / {steps.length}
            </span>
          </>
        ) : (
          <span className="fretboard-info-detail">
            {autoPlay ? 'Starting...' : 'Tap to advance notes'}
          </span>
        )}
      </div>

      {/* Scrolling tab strip */}
      <TabStrip steps={steps} activeStep={activeStep} onStepClick={(idx) => setActiveStep(idx)} showNoteNames={showNoteNames} />
    </div>
  )
}
