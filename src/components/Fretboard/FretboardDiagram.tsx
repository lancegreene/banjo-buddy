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

// ─── Tab Strip — now operates on DisplayStep[] for pinch support ────────────

function TabStrip({ steps, activeStep, onStepClick }: {
  steps: DisplayStep[]
  activeStep: number
  onStepClick?: (stepIdx: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to keep active step centered
  useEffect(() => {
    if (activeStep < 0 || !scrollRef.current) return
    const container = scrollRef.current
    const activeEl = container.querySelector(`[data-tab-step="${activeStep}"]`) as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeStep])

  const strings = [1, 2, 3, 4, 5]

  return (
    <div className="fretboard-tab-strip">
      <div className="fretboard-tab-labels">
        {strings.map((str) => (
          <div
            key={str}
            className="fretboard-tab-label"
            style={{ color: STRING_COLORS[str] }}
          >
            {str === 1 ? 'D4' : str === 2 ? 'B3' : str === 3 ? 'G3' : str === 4 ? 'D3' : 'G4'}
          </div>
        ))}
        <div className="fretboard-tab-label fretboard-tab-label-finger">Pick</div>
        {steps.some(s => s.notes.some(n => n.duration && n.duration !== 'eighth')) && (
          <div className="fretboard-tab-label fretboard-tab-label-finger">Dur</div>
        )}
      </div>
      <div className="fretboard-tab-scroll" ref={scrollRef}>
        <div className="fretboard-tab-grid">
          {strings.map((str) => (
            <div key={str} className="fretboard-tab-row">
              {steps.map((step, stepIdx) => {
                const noteOnString = step.notes.find(n => n.string === str)
                const isActive = stepIdx === activeStep
                const isPlayed = activeStep >= 0 && stepIdx < activeStep
                const isNext = stepIdx === activeStep + 1
                const isPinch = step.notes.length > 1
                return (
                  <div
                    key={stepIdx}
                    data-tab-step={noteOnString ? stepIdx : undefined}
                    className={`fretboard-tab-cell ${
                      noteOnString ? 'fretboard-tab-cell-note' : ''
                    } ${isActive && noteOnString ? 'fretboard-tab-cell-active' : ''
                    } ${isPlayed && noteOnString ? 'fretboard-tab-cell-played' : ''
                    } ${isNext && noteOnString ? 'fretboard-tab-cell-next' : ''
                    } ${noteOnString?.technique ? `fretboard-tab-cell-${noteOnString.technique}` : ''
                    } ${isPinch && noteOnString ? 'fretboard-tab-cell-pinch' : ''}`}
                    style={noteOnString ? { color: STRING_COLORS[str], cursor: 'pointer' } : undefined}
                    onClick={noteOnString && onStepClick ? () => onStepClick(stepIdx) : undefined}
                  >
                    {noteOnString ? formatTabCell(noteOnString) : '—'}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Picking finger row */}
          <div className="fretboard-tab-row fretboard-tab-row-finger">
            {steps.map((step, stepIdx) => {
              const isActive = stepIdx === activeStep
              const isPlayed = activeStep >= 0 && stepIdx < activeStep
              const isNext = stepIdx === activeStep + 1
              const fingers = step.notes
                .map(n => n.finger === 'T' ? 'T' : n.finger === 'I' ? 'I' : n.finger === 'M' ? 'M' : '')
                .filter(Boolean)
              const label = fingers.length > 1 ? fingers.join('+') : fingers[0] ?? ''
              const primaryColor = STRING_COLORS[step.notes[0].string]
              return (
                <div
                  key={stepIdx}
                  className={`fretboard-tab-cell fretboard-tab-cell-finger ${
                    isActive ? 'fretboard-tab-cell-active' : ''
                  } ${isPlayed ? 'fretboard-tab-cell-played' : ''
                  } ${isNext ? 'fretboard-tab-cell-next' : ''}`}
                  style={{ color: primaryColor }}
                >
                  {label}
                </div>
              )
            })}
          </div>
          {/* Duration row (only if any non-eighth durations present) */}
          {steps.some(s => s.notes.some(n => n.duration && n.duration !== 'eighth')) && (
            <div className="fretboard-tab-row fretboard-tab-row-finger">
              {steps.map((step, stepIdx) => {
                const isActive = stepIdx === activeStep
                const isPlayed = activeStep >= 0 && stepIdx < activeStep
                const isNext = stepIdx === activeStep + 1
                const dur = step.notes[0]?.duration || 'eighth'
                const DUR_LABELS: Record<string, string> = {
                  whole: 'W', half: 'H', quarter: 'Q', eighth: '8', sixteenth: '16',
                }
                return (
                  <div
                    key={stepIdx}
                    className={`fretboard-tab-cell fretboard-tab-cell-finger fretboard-tab-cell-dur ${
                      isActive ? 'fretboard-tab-cell-active' : ''
                    } ${isPlayed ? 'fretboard-tab-cell-played' : ''
                    } ${isNext ? 'fretboard-tab-cell-next' : ''}`}
                  >
                    {DUR_LABELS[dur] || '8'}
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
      <TabStrip steps={steps} activeStep={activeStep} onStepClick={(idx) => setActiveStep(idx)} />
    </div>
  )
}
