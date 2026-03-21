// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Note Value Visual
// Animated SVG diagrams for teaching rhythm and note values.
// Three modes: note_tree, beat_timeline, rest_chart
// Beat timeline plays click sounds via Tone.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export type VisualKind = 'note_tree' | 'beat_timeline' | 'rest_chart'

interface NoteValueVisualProps {
  kind: VisualKind
  params?: Record<string, unknown>
}

// ── Note symbols as SVG paths ────────────────────────────────────────────────

function WholeNote({ x, y, size = 16 }: { x: number; y: number; size?: number }) {
  return (
    <ellipse cx={x} cy={y} rx={size * 0.55} ry={size * 0.38}
      fill="none" stroke="currentColor" strokeWidth="1.8" />
  )
}

function HalfNote({ x, y, size = 16 }: { x: number; y: number; size?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={size * 0.5} ry={size * 0.35}
        fill="none" stroke="currentColor" strokeWidth="1.8" transform={`rotate(-15 ${x} ${y})`} />
      <line x1={x + size * 0.45} y1={y} x2={x + size * 0.45} y2={y - size * 2}
        stroke="currentColor" strokeWidth="1.8" />
    </g>
  )
}

function QuarterNote({ x, y, size = 16 }: { x: number; y: number; size?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={size * 0.5} ry={size * 0.35}
        fill="currentColor" transform={`rotate(-15 ${x} ${y})`} />
      <line x1={x + size * 0.45} y1={y} x2={x + size * 0.45} y2={y - size * 2}
        stroke="currentColor" strokeWidth="1.8" />
    </g>
  )
}

function EighthNote({ x, y, size = 16 }: { x: number; y: number; size?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={size * 0.5} ry={size * 0.35}
        fill="currentColor" transform={`rotate(-15 ${x} ${y})`} />
      <line x1={x + size * 0.45} y1={y} x2={x + size * 0.45} y2={y - size * 2}
        stroke="currentColor" strokeWidth="1.8" />
      <path d={`M ${x + size * 0.45} ${y - size * 2} Q ${x + size * 1.2} ${y - size * 1.2} ${x + size * 0.8} ${y - size * 0.5}`}
        fill="none" stroke="currentColor" strokeWidth="1.8" />
    </g>
  )
}

function SixteenthNote({ x, y, size = 16 }: { x: number; y: number; size?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={size * 0.5} ry={size * 0.35}
        fill="currentColor" transform={`rotate(-15 ${x} ${y})`} />
      <line x1={x + size * 0.45} y1={y} x2={x + size * 0.45} y2={y - size * 2}
        stroke="currentColor" strokeWidth="1.8" />
      <path d={`M ${x + size * 0.45} ${y - size * 2} Q ${x + size * 1.2} ${y - size * 1.2} ${x + size * 0.8} ${y - size * 0.5}`}
        fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d={`M ${x + size * 0.45} ${y - size * 1.6} Q ${x + size * 1.2} ${y - size * 0.8} ${x + size * 0.8} ${y - size * 0.1}`}
        fill="none" stroke="currentColor" strokeWidth="1.8" />
    </g>
  )
}

// ── Note Value Tree ──────────────────────────────────────────────────────────

function NoteTree() {
  const [visibleLevel, setVisibleLevel] = useState(0)

  useEffect(() => {
    if (visibleLevel < 4) {
      const timer = setTimeout(() => setVisibleLevel((l) => l + 1), 800)
      return () => clearTimeout(timer)
    }
  }, [visibleLevel])

  const levels = [
    { label: 'Whole note', beats: '4 beats', count: 1, Note: WholeNote },
    { label: 'Half notes', beats: '2 beats each', count: 2, Note: HalfNote },
    { label: 'Quarter notes', beats: '1 beat each', count: 4, Note: QuarterNote },
    { label: 'Eighth notes', beats: '½ beat each', count: 8, Note: EighthNote },
    { label: 'Sixteenth notes', beats: '¼ beat each', count: 16, Note: SixteenthNote },
  ]

  const rowHeight = 52
  const width = 380
  const leftLabel = 90

  return (
    <div className="note-visual note-tree">
      <svg viewBox={`0 0 ${width} ${levels.length * rowHeight + 20}`} className="note-tree-svg">
        {levels.map((level, li) => {
          const y = li * rowHeight + 30
          const visible = li <= visibleLevel
          const noteAreaWidth = width - leftLabel - 20
          const spacing = noteAreaWidth / level.count

          return (
            <g key={li} className={`note-tree-row ${visible ? 'note-tree-row-visible' : ''}`}
              style={{ animationDelay: `${li * 0.15}s` }}>
              <text x={8} y={y + 4} className="note-tree-label" fontSize="11" fill="currentColor">
                {level.label}
              </text>
              <text x={8} y={y + 17} className="note-tree-beats" fontSize="9" fill="currentColor" opacity="0.6">
                {level.beats}
              </text>

              {li > 0 && (
                <line x1={leftLabel + noteAreaWidth / 2} y1={y - rowHeight + 28}
                  x2={leftLabel + noteAreaWidth / 2} y2={y - 10}
                  stroke="currentColor" strokeWidth="0.5" opacity="0.3"
                  strokeDasharray="3 2" />
              )}

              {Array.from({ length: Math.min(level.count, 16) }).map((_, ni) => {
                const nx = leftLabel + spacing * ni + spacing / 2
                return <level.Note key={ni} x={nx} y={y + 6} size={li >= 3 ? 10 : 14} />
              })}

              <text x={width - 8} y={y + 8} textAnchor="end" fontSize="10"
                fill="currentColor" opacity="0.5" fontFamily="monospace">
                = 4 beats
              </text>
            </g>
          )
        })}
      </svg>
      <button className="note-visual-replay" onClick={() => setVisibleLevel(0)}>
        ↻ Replay
      </button>
    </div>
  )
}

// ── Beat Timeline ────────────────────────────────────────────────────────────
// Animated horizontal measure with beat markers + click sounds

function BeatTimeline({ params }: { params?: Record<string, unknown> }) {
  const subdivision = (params?.subdivision as number) ?? 4
  const totalDots = subdivision === 1 ? 1 : subdivision
  const [activeDot, setActiveDot] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)

  const bpm = (params?.bpm as number) ?? 80
  const beatMs = (60 / bpm) * 1000
  const intervalMs = subdivision <= 4 ? beatMs : beatMs / 2

  // Synths for click sound
  const clickRef = useRef<Tone.Synth | null>(null)
  const accentRef = useRef<Tone.Synth | null>(null)

  useEffect(() => {
    clickRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
      volume: -8,
    }).toDestination()
    accentRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: -2,
    }).toDestination()

    return () => {
      clickRef.current?.dispose()
      accentRef.current?.dispose()
    }
  }, [])

  // Play click on each dot activation
  useEffect(() => {
    if (activeDot < 0 || activeDot >= totalDots) return
    const isDownbeat = subdivision <= 4
      ? true // every dot is a beat for quarters and larger
      : activeDot % (subdivision / 4) === 0

    if (isDownbeat) {
      accentRef.current?.triggerAttackRelease('A5', '32n')
    } else {
      clickRef.current?.triggerAttackRelease('E5', '32n')
    }
  }, [activeDot, totalDots, subdivision])

  useEffect(() => {
    if (!isPlaying) return
    if (activeDot >= totalDots) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => setActiveDot((d) => d + 1), intervalMs)
    return () => clearTimeout(timer)
  }, [isPlaying, activeDot, totalDots, intervalMs])

  const start = useCallback(async () => {
    await Tone.start()
    const ctx = Tone.getContext().rawContext
    if (ctx && ctx.state !== 'running') {
      await (ctx as AudioContext).resume()
    }
    setActiveDot(0)
    setIsPlaying(true)
  }, [])

  function dotLabel(i: number): string {
    if (subdivision <= 4) return String(i + 1)
    if (subdivision === 8) {
      return i % 2 === 0 ? String(Math.floor(i / 2) + 1) : '&'
    }
    const sub = ['', 'e', '&', 'a']
    return i % 4 === 0 ? String(Math.floor(i / 4) + 1) : sub[i % 4]
  }

  return (
    <div className="note-visual beat-timeline">
      <div className="beat-timeline-header">
        <span className="beat-timeline-title">
          {subdivision <= 1 ? 'Whole note' : subdivision === 2 ? 'Half notes' : subdivision === 4 ? 'Quarter notes' : subdivision === 8 ? 'Eighth notes' : 'Sixteenth notes'}
          {' '} — 1 measure of 4/4
        </span>
      </div>
      <div className="beat-timeline-bar">
        {[1, 2, 3].map((i) => (
          <div key={i} className="beat-timeline-divider"
            style={{ left: `${(i / 4) * 100}%` }} />
        ))}
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            className={`beat-dot ${i < activeDot ? 'beat-dot-played' : ''} ${i === activeDot ? 'beat-dot-active' : ''} ${i % (subdivision / 4 || 1) === 0 ? 'beat-dot-downbeat' : ''}`}
            style={{ left: `${(i / totalDots) * 100 + (100 / totalDots / 2)}%` }}
          >
            <span className="beat-dot-label">{dotLabel(i)}</span>
          </div>
        ))}
      </div>
      <button className="note-visual-play" onClick={start}>
        {isPlaying ? '♩ Playing...' : '▶ Play with Sound'}
      </button>
    </div>
  )
}

// ── Rest Chart ───────────────────────────────────────────────────────────────

function RestChart() {
  const rests = [
    { name: 'Whole rest', beats: '4 beats', symbol: '𝄻', desc: 'Hangs from line' },
    { name: 'Half rest', beats: '2 beats', symbol: '𝄼', desc: 'Sits on line' },
    { name: 'Quarter rest', beats: '1 beat', symbol: '𝄽', desc: 'Zigzag shape' },
    { name: 'Eighth rest', beats: '½ beat', symbol: '𝄾', desc: 'One flag' },
    { name: 'Sixteenth rest', beats: '¼ beat', symbol: '𝄿', desc: 'Two flags' },
  ]

  return (
    <div className="note-visual rest-chart">
      <div className="rest-chart-grid">
        {rests.map((r, i) => (
          <div key={i} className="rest-chart-item">
            <span className="rest-chart-symbol">{r.symbol}</span>
            <span className="rest-chart-name">{r.name}</span>
            <span className="rest-chart-beats">{r.beats}</span>
            <span className="rest-chart-desc">{r.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function NoteValueVisual({ kind, params }: NoteValueVisualProps) {
  switch (kind) {
    case 'note_tree':
      return <NoteTree />
    case 'beat_timeline':
      return <BeatTimeline params={params} />
    case 'rest_chart':
      return <RestChart />
    default:
      return null
  }
}
