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
//   - Only shows current + next note on the fretboard (minimal clutter)
//   - Scrolling tab strip below gives sequential/timing context

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type FretNote,
  TOTAL_FRETS,
  STRING_5_START_FRET,
  EXAMPLE_CRIPPLE_CREEK,
} from '../../data/fretboardNotes'

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

// ─── Tab Strip ──────────────────────────────────────────────────────────────

function TabStrip({ notes, activeIdx }: { notes: FretNote[]; activeIdx: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to keep active note centered
  useEffect(() => {
    if (activeIdx < 0 || !scrollRef.current) return
    const container = scrollRef.current
    const activeEl = container.querySelector(`[data-tab-idx="${activeIdx}"]`) as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeIdx])

  // Group notes into strings 1-5 for tab display
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
      </div>
      <div className="fretboard-tab-scroll" ref={scrollRef}>
        <div className="fretboard-tab-grid">
          {strings.map((str) => (
            <div key={str} className="fretboard-tab-row">
              {notes.map((note, idx) => {
                const isOnString = note.string === str
                const isActive = idx === activeIdx
                const isPlayed = activeIdx >= 0 && idx < activeIdx
                const isNext = idx === activeIdx + 1
                return (
                  <div
                    key={idx}
                    data-tab-idx={isOnString ? idx : undefined}
                    className={`fretboard-tab-cell ${
                      isOnString ? 'fretboard-tab-cell-note' : ''
                    } ${isActive && isOnString ? 'fretboard-tab-cell-active' : ''
                    } ${isPlayed && isOnString ? 'fretboard-tab-cell-played' : ''
                    } ${isNext && isOnString ? 'fretboard-tab-cell-next' : ''}`}
                    style={isOnString ? { color: STRING_COLORS[str] } : undefined}
                  >
                    {isOnString ? (note.fret === 0 ? '0' : note.fret) : '—'}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Picking finger row */}
          <div className="fretboard-tab-row fretboard-tab-row-finger">
            {notes.map((note, idx) => {
              const isActive = idx === activeIdx
              const isPlayed = activeIdx >= 0 && idx < activeIdx
              const isNext = idx === activeIdx + 1
              const label = note.finger === 'T' ? 'T' : note.finger === 'I' ? 'I' : note.finger === 'M' ? 'M' : ''
              return (
                <div
                  key={idx}
                  className={`fretboard-tab-cell fretboard-tab-cell-finger ${
                    isActive ? 'fretboard-tab-cell-active' : ''
                  } ${isPlayed ? 'fretboard-tab-cell-played' : ''
                  } ${isNext ? 'fretboard-tab-cell-next' : ''}`}
                  style={{ color: STRING_COLORS[note.string] }}
                >
                  {label}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FretboardDiagram({
  notes = EXAMPLE_CRIPPLE_CREEK,
  currentIndex = -1,
  autoPlay = false,
  bpm = 120,
}: FretboardDiagramProps) {
  const [activeIdx, setActiveIdx] = useState(currentIndex)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!autoPlay) setActiveIdx(currentIndex)
  }, [currentIndex, autoPlay])

  useEffect(() => {
    if (!autoPlay || notes.length === 0) return
    const ms = (60 / bpm) * 1000
    setActiveIdx(0)
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1 >= notes.length ? 0 : prev + 1))
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoPlay, bpm, notes])

  const handleTap = useCallback(() => {
    if (autoPlay) return
    setActiveIdx((prev) => {
      if (prev < 0) return 0
      return prev + 1 >= notes.length ? 0 : prev + 1
    })
  }, [autoPlay, notes.length])

  const activeNote = activeIdx >= 0 && activeIdx < notes.length ? notes[activeIdx] : null
  const nextNote = activeIdx >= 0 && activeIdx + 1 < notes.length ? notes[activeIdx + 1] : null

  return (
    <div className="fretboard-diagram">
      {/* Info bar */}
      <div className="fretboard-info-bar">
        {activeNote ? (
          <>
            <span className="fretboard-info-note" style={{ color: STRING_COLORS[activeNote.string] }}>
              {activeNote.note}
            </span>
            <span className="fretboard-info-detail">
              String {activeNote.string} • {activeNote.fret === 0 ? 'Open' : `Fret ${activeNote.fret}`}
              {activeNote.finger && ` • ${activeNote.finger === 'T' ? 'Thumb' : activeNote.finger === 'I' ? 'Index' : 'Middle'}`}
            </span>
            <span className="fretboard-info-counter">
              {activeIdx + 1} / {notes.length}
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

          {/* Next note (ghost) */}
          {nextNote && <NoteMarker note={nextNote} state="next" />}

          {/* Active note */}
          {activeNote && <NoteMarker note={activeNote} state="active" />}

          {/* String color overlay when plucked */}
          {activeNote && (() => {
            const str = activeNote.string
            const y = stringY(str)
            const startX = str === 5 ? fretX(STRING_5_START_FRET) : NUT_X
            const color = STRING_COLORS[str]
            return (
              <g>
                <line x1={startX} y1={y} x2={IMG_W} y2={y}
                  stroke={color} strokeWidth={14} opacity={0.3} />
                <line x1={startX} y1={y} x2={IMG_W} y2={y}
                  stroke={color} strokeWidth={8} opacity={0.5} />
                <line x1={startX} y1={y} x2={IMG_W} y2={y}
                  stroke={color} strokeWidth={3} opacity={1}
                  className="fretboard-string-plucked" />
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Scrolling tab strip */}
      <TabStrip notes={notes} activeIdx={activeIdx} />
    </div>
  )
}
