// ─── FretboardDiagram — Photo-based banjo fretboard with note overlay ────────
//
// Uses a real photograph of a Gold Tone banjo neck as the background, with
// SVG note markers overlaid at computed fret/string positions.
//
// Orientation (player looking down):
//   Left = peghead/nut (far from body)
//   Right = higher frets → body/pot (near player)
//
// Design choices:
//   - Color-coded by STRING (not finger) for fast visual scanning
//   - Only shows current + next note(s) on the fretboard (minimal clutter)
//   - Scrolling tab strip below gives sequential/timing context
//   - Simultaneous notes (pinches) share a display step and tab column

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  type FretNote,
  TOTAL_FRETS,
  STRING_5_START_FRET,
  EXAMPLE_CRIPPLE_CREEK,
} from '../../data/fretboardNotes'
import { BanjoSynth } from '../../engine/banjoSynth'

// ─── Image & Calibration Constants ───────────────────────────────────────────
const IMG_W = 3494
const IMG_H = 550
const NUT_X = 800
const SCALE_PX = 3600
const FB_TOP_Y = 160
const FB_BOTTOM_Y = 415
const FB_HEIGHT = FB_BOTTOM_Y - FB_TOP_Y

const LONG_STRINGS = [1, 2, 3, 4]
const STRING_PADDING = 0.14
const USABLE_HEIGHT = FB_HEIGHT * (1 - STRING_PADDING * 2)
const STRING_SPACING = USABLE_HEIGHT / (LONG_STRINGS.length - 1)

const STRING_Y_OFFSET: Record<number, number> = {
  1: 10, 2: -5, 3: -15, 4: -30, 5: -15,
}

function stringY(str: number): number {
  const offset = STRING_Y_OFFSET[str] ?? 0
  if (str === 5) return FB_BOTTOM_Y - FB_HEIGHT * STRING_PADDING * 0.3 + offset
  const idx = LONG_STRINGS.indexOf(str)
  return FB_TOP_Y + FB_HEIGHT * STRING_PADDING + STRING_SPACING * idx + offset
}

function fretX(fret: number): number {
  if (fret === 0) return NUT_X
  return NUT_X + SCALE_PX * (1 - Math.pow(2, -fret / 12))
}

function fretCenterX(fret: number, str?: number): number {
  if (fret === 0) {
    if (str === 5) return fretX(STRING_5_START_FRET) - 50
    return NUT_X - 40
  }
  const left = fretX(fret - 1)
  const right = fretX(fret)
  return left + (right - left) * 0.7
}

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
}

// ─── Note Marker ─────────────────────────────────────────────────────────────

function NoteMarker({ note, state }: { note: FretNote; state: 'active' | 'next' }) {
  const cx = fretCenterX(note.fret, note.string)
  const cy = stringY(note.string)
  const color = STRING_COLORS[note.string] ?? '#4ADE80'
  const noteLabel = note.fret === 0 ? 'O' : String(note.fret)
  const isActive = state === 'active'

  const r = isActive ? 28 : 22
  const opacity = isActive ? 1 : 0.55

  // Technique destination marker (slides, hammer-ons, pull-offs)
  const hasDest = note.technique != null && note.slideToFret != null
  const slideCx = hasDest ? fretCenterX(note.slideToFret!, note.string) : 0

  return (
    <g className={`fretboard-note fretboard-note-${state}`} opacity={opacity}>
      {/* Pulse ring for active note */}
      {isActive && (
        <circle
          cx={cx} cy={cy} r={r + 12}
          fill="none" stroke={color} strokeWidth={3}
          opacity={0.4}
          className="fretboard-note-pulse"
        />
      )}

      {/* Technique arrow: line from start fret to destination fret */}
      {hasDest && isActive && (
        <g>
          <line
            x1={cx + r + 4} y1={cy}
            x2={slideCx - r - 4} y2={cy}
            stroke={color} strokeWidth={3} opacity={0.7}
            strokeDasharray="6,4"
          />
          {/* Arrowhead */}
          <polygon
            points={`${slideCx - r - 4},${cy} ${slideCx - r - 16},${cy - 8} ${slideCx - r - 16},${cy + 8}`}
            fill={color} opacity={0.7}
          />
          {/* Destination fret circle */}
          <circle
            cx={slideCx} cy={cy} r={r - 4}
            fill="none" stroke={color} strokeWidth={2.5}
            strokeDasharray="6,3" opacity={0.6}
          />
          <text
            x={slideCx} y={cy + 7}
            textAnchor="middle" fontSize={18} fontWeight={700}
            fill={color} opacity={0.7}
            fontFamily="system-ui, sans-serif"
          >
            {note.slideToFret}
          </text>
        </g>
      )}

      {/* Technique label below note */}
      {isActive && note.technique && (
        <text
          x={cx} y={cy + r + 22}
          textAnchor="middle"
          fontSize={13} fontWeight={700}
          fill={color} opacity={0.8}
          fontFamily="system-ui, sans-serif"
        >
          {note.technique === 'slide' ? 'SLIDE' : note.technique === 'hammer' ? 'HAMMER' : 'PULL'}
        </text>
      )}

      {/* Note circle */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={isActive ? color : 'rgba(0,0,0,0.5)'}
        stroke={color}
        strokeWidth={isActive ? 0 : 2.5}
        filter={isActive ? 'url(#noteGlowActive)' : undefined}
      />

      {/* Fret number */}
      <text
        x={cx}
        y={cy + (isActive ? 8 : 7)}
        textAnchor="middle"
        fontSize={isActive ? 22 : 18}
        fontWeight={700}
        fill={isActive ? '#111' : color}
        fontFamily="system-ui, sans-serif"
      >
        {noteLabel}
      </text>

      {/* String label above active note */}
      {isActive && (
        <text
          x={cx} y={cy - r - 10}
          textAnchor="middle"
          fontSize={16} fontWeight={700}
          fill={color}
          fontFamily="system-ui, sans-serif"
        >
          S{note.string}
        </text>
      )}
    </g>
  )
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
    const stepNotes = steps[activeStep].notes
    for (const n of stepNotes) {
      getSynth().playNote(n.string, n.fret)
    }
  }, [activeStep, steps])

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
      setActiveStep((prev) => (prev + 1 >= steps.length ? 0 : prev + 1))
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoPlay, bpm, steps])

  const handleTap = useCallback(() => {
    if (autoPlay) return
    setActiveStep((prev) => {
      if (prev < 0) return 0
      return prev + 1 >= steps.length ? 0 : prev + 1
    })
  }, [autoPlay, steps.length])

  const activeStepData = activeStep >= 0 && activeStep < steps.length ? steps[activeStep] : null
  const nextStepData = activeStep >= 0 && activeStep + 1 < steps.length ? steps[activeStep + 1] : null
  const activeNotes = activeStepData?.notes ?? []
  const nextNotes = nextStepData?.notes ?? []

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

      {/* Photo fretboard with SVG overlay */}
      <div className="fretboard-photo-wrap" onClick={handleTap}>
        <img
          className="fretboard-photo"
          src={`${import.meta.env.BASE_URL}images/banjo-neck.png`}
          alt="Banjo fretboard"
          draggable={false}
        />
        <svg
          className="fretboard-overlay"
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="noteGlowActive">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base string lines — always visible */}
          {[1, 2, 3, 4].map((str) => (
            <line
              key={`base-${str}`}
              x1={NUT_X} y1={stringY(str)} x2={IMG_W} y2={stringY(str)}
              stroke={STRING_COLORS[str]}
              strokeWidth={2}
              opacity={0.3}
            />
          ))}
          <line
            x1={fretX(STRING_5_START_FRET)} y1={stringY(5)}
            x2={IMG_W} y2={stringY(5)}
            stroke={STRING_COLORS[5]}
            strokeWidth={2}
            opacity={0.3}
          />

          {/* Next note(s) (ghost) */}
          {nextNotes.map((n, i) => <NoteMarker key={`next-${i}`} note={n} state="next" />)}

          {/* Active note(s) */}
          {activeNotes.map((n, i) => <NoteMarker key={`active-${i}`} note={n} state="active" />)}

          {/* String color overlay when plucked — one per active note */}
          {activeNotes.map((n, i) => {
            const str = n.string
            const y = stringY(str)
            const startX = str === 5 ? fretX(STRING_5_START_FRET) : NUT_X
            const color = STRING_COLORS[str]
            return (
              <g key={`glow-${i}`}>
                <line x1={startX} y1={y} x2={IMG_W} y2={y}
                  stroke={color} strokeWidth={14} opacity={0.3} />
                <line x1={startX} y1={y} x2={IMG_W} y2={y}
                  stroke={color} strokeWidth={8} opacity={0.5} />
                <line x1={startX} y1={y} x2={IMG_W} y2={y}
                  stroke={color} strokeWidth={3} opacity={1}
                  className="fretboard-string-plucked" />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Scrolling tab strip */}
      <TabStrip steps={steps} activeStep={activeStep} onStepClick={(idx) => setActiveStep(idx)} showNoteNames={showNoteNames} />
    </div>
  )
}
