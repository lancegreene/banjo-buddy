// ─── Library — Browse rolls, licks, songs, scales with FretLab-style tab viewer ──
import { useState, useMemo } from 'react'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { RollGenerator } from '../RollGenerator/RollGenerator'
import { getAllPatterns } from '../../data/rollPatterns'
import { LICK_LIBRARY } from '../../data/lickLibrary'
import { SONGS } from '../../data/songLibrary'
import { SCALE_LIBRARY } from '../../data/scaleLibrary'
import { rollPatternToFretNotes, lickToFretNotes, sectionToFretNotes } from '../../engine/rollToFretNotes'
import type { FretNote } from '../../data/fretboardNotes'

type LibraryCategory = 'rolls' | 'licks' | 'songs' | 'scales' | 'generate'

const CATEGORIES: { id: LibraryCategory; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'rolls',    label: 'Roll Repo',    icon: '🔄', desc: 'Scruggs picking patterns',          color: '#26a69a' },
  { id: 'licks',    label: 'Lick Library',  icon: '🎵', desc: 'Classic bluegrass licks',           color: '#66bb6a' },
  { id: 'songs',    label: 'Song Studio',   icon: '🎶', desc: 'Full song arrangements',            color: '#42a5f5' },
  { id: 'scales',   label: 'Scales',        icon: '🎼', desc: 'Major, melodic, pentatonic & blues', color: '#ef5350' },
  { id: 'generate', label: 'Roll Generator', icon: '🎲', desc: 'Create custom roll patterns',      color: '#ab47bc' },
]

const BPM_PRESETS = [60, 80, 100, 120, 140]

export function Library() {
  const [category, setCategory] = useState<LibraryCategory | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [bpm, setBpm] = useState(100)

  // ── Data sources ──
  const rolls = useMemo(() => getAllPatterns(), [])
  const licks = LICK_LIBRARY
  const songs = SONGS
  const scales = SCALE_LIBRARY

  // ── Resolve selected item to FretNote[] ──
  const { notes, label } = useMemo((): { notes: FretNote[]; label: string } => {
    if (!selectedId || !category) return { notes: [], label: '' }

    if (category === 'rolls') {
      const pattern = rolls.find(r => r.id === selectedId)
      if (!pattern) return { notes: [], label: '' }
      return { notes: rollPatternToFretNotes(pattern), label: pattern.name }
    }

    if (category === 'licks') {
      const lick = licks.find(l => l.id === selectedId)
      if (!lick) return { notes: [], label: '' }
      return { notes: lickToFretNotes(lick.notes), label: lick.name }
    }

    if (category === 'songs') {
      const song = songs.find(s => s.id === selectedId)
      if (!song) return { notes: [], label: '' }
      const section = selectedSectionId
        ? song.sections.find(s => s.id === selectedSectionId)
        : song.sections[0]
      if (!section) return { notes: [], label: '' }
      return { notes: sectionToFretNotes(section.measures), label: `${song.name} — ${section.name}` }
    }

    if (category === 'scales') {
      const scale = scales.find(s => s.id === selectedId)
      if (!scale) return { notes: [], label: '' }
      return { notes: scale.notes, label: scale.name }
    }

    return { notes: [], label: '' }
  }, [category, selectedId, selectedSectionId, rolls, licks, songs, scales])

  function handleBack() {
    setCategory(null)
    setSelectedId(null)
    setSelectedSectionId(null)
    setAutoPlay(false)
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setSelectedSectionId(null)
    setAutoPlay(false)
    if (category === 'licks') {
      const lick = licks.find(l => l.id === id)
      if (lick) setBpm(lick.referenceBpm)
    } else if (category === 'songs') {
      const song = songs.find(s => s.id === id)
      if (song) setBpm(song.defaultBpm)
    } else if (category === 'scales') {
      const scale = scales.find(s => s.id === id)
      if (scale) setBpm(scale.defaultBpm)
    }
  }

  const activeCat = CATEGORIES.find(c => c.id === category)

  // ── Main menu: category cards ──
  if (!category) {
    return (
      <div className="library">
        <div className="library-menu">
          <div className="library-menu-title">Quick Pick</div>
          <div className="library-menu-cards">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="library-menu-card"
                style={{ '--cat-color': cat.color } as React.CSSProperties}
                onClick={() => setCategory(cat.id)}
              >
                <span className="library-menu-card-icon">{cat.icon}</span>
                <span className="library-menu-card-label">{cat.label}</span>
                <span className="library-menu-card-desc">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Sub-level: items within a category ──
  return (
    <div className="library">
      {/* Back button + category title */}
      <div className="library-header">
        <button className="library-back-btn" onClick={handleBack}>← Back</button>
        <span className="library-header-title" style={{ color: activeCat?.color }}>
          {activeCat?.icon} {activeCat?.label}
        </span>
      </div>

      {/* Generate tab — standalone */}
      {category === 'generate' && <RollGenerator />}

      {/* Item buttons */}
      {category !== 'generate' && (
        <div className="library-items">
          {category === 'rolls' && rolls.map(r => (
            <button
              key={r.id}
              className={`library-item ${selectedId === r.id ? 'library-item-active' : ''}`}
              onClick={() => handleSelect(r.id)}
              title={r.description}
            >
              <span className="library-item-name">{r.name}</span>
              <span className="library-item-meta">{r.strings.length} notes</span>
            </button>
          ))}

          {category === 'licks' && licks.map(l => (
            <button
              key={l.id}
              className={`library-item ${selectedId === l.id ? 'library-item-active' : ''}`}
              onClick={() => handleSelect(l.id)}
              title={l.description}
            >
              <span className="library-item-name">{l.name}</span>
              <span className="library-item-meta">{l.referenceBpm} BPM</span>
            </button>
          ))}

          {category === 'songs' && songs.map(s => (
            <button
              key={s.id}
              className={`library-item ${selectedId === s.id ? 'library-item-active' : ''}`}
              onClick={() => handleSelect(s.id)}
              title={`Key of ${s.key} — ${s.defaultBpm}-${s.performanceBpm} BPM`}
            >
              <span className="library-item-name">{s.name}</span>
              <span className="library-item-meta">Key of {s.key}</span>
            </button>
          ))}

          {category === 'scales' && scales.map(s => (
            <button
              key={s.id}
              className={`library-item ${selectedId === s.id ? 'library-item-active' : ''}`}
              onClick={() => handleSelect(s.id)}
              title={s.description}
            >
              <span className="library-item-name">{s.name}</span>
              <span className="library-item-meta">{s.category} • {s.key}</span>
            </button>
          ))}
        </div>
      )}

      {/* Song section selector */}
      {category === 'songs' && selectedId && (() => {
        const song = songs.find(s => s.id === selectedId)
        if (!song || song.sections.length <= 1) return null
        const activeSectionId = selectedSectionId ?? song.sections[0]?.id
        return (
          <div className="library-sections">
            {song.sections.map(sec => (
              <button
                key={sec.id}
                className={`library-section-btn ${activeSectionId === sec.id ? 'library-section-btn-active' : ''}`}
                onClick={() => { setSelectedSectionId(sec.id); setAutoPlay(false) }}
              >
                {sec.name}
              </button>
            ))}
          </div>
        )
      })()}

      {/* FretLab-style tab viewer */}
      {category !== 'generate' && selectedId && notes.length > 0 && (
        <div className="library-viewer">
          <div className="library-viewer-label">{label}</div>

          <FretboardDiagram
            notes={notes}
            bpm={bpm}
            autoPlay={autoPlay}
            showNoteNames={category === 'scales'}
          />

          {/* Controls */}
          <div className="library-controls">
            <button
              className={`fretlab-play-btn ${autoPlay ? 'fretlab-play-btn-active' : ''}`}
              onClick={() => setAutoPlay(!autoPlay)}
            >
              {autoPlay ? '■ Stop' : '▶ Play'}
            </button>

            <div className="fretlab-bpm-control">
              <button className="fretlab-bpm-adj" onClick={() => setBpm(Math.max(40, bpm - 10))}>−</button>
              <span className="fretlab-bpm-display">{bpm} <small>BPM</small></span>
              <button className="fretlab-bpm-adj" onClick={() => setBpm(Math.min(200, bpm + 10))}>+</button>
            </div>
          </div>

          <div className="fretlab-presets">
            {BPM_PRESETS.map(p => (
              <button
                key={p}
                className={`fretlab-preset ${bpm === p ? 'fretlab-preset-active' : ''}`}
                onClick={() => setBpm(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {category !== 'generate' && !selectedId && (
        <div className="library-empty">
          Select a {category === 'rolls' ? 'roll' : category === 'licks' ? 'lick' : category === 'scales' ? 'scale' : 'song'} above to view its tab
        </div>
      )}
    </div>
  )
}
