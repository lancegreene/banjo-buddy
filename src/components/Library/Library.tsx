// ─── Library — Browse rolls, licks, and songs with FretLab-style tab viewer ──
import { useState, useMemo } from 'react'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { RollGenerator } from '../RollGenerator/RollGenerator'
import { getAllPatterns, type RollPattern } from '../../data/rollPatterns'
import { LICK_LIBRARY, type LickReference } from '../../data/lickLibrary'
import { SONGS, type Song } from '../../data/songLibrary'
import { rollPatternToFretNotes, lickToFretNotes, sectionToFretNotes } from '../../engine/rollToFretNotes'
import type { FretNote } from '../../data/fretboardNotes'

type LibraryTab = 'rolls' | 'licks' | 'songs' | 'generate'

const TAB_DEFS: { id: LibraryTab; label: string; color: string }[] = [
  { id: 'rolls', label: 'Roll Repo', color: '#26a69a' },
  { id: 'licks', label: 'Lick Library', color: '#66bb6a' },
  { id: 'songs', label: 'Song Studio', color: '#42a5f5' },
  { id: 'generate', label: 'Generate', color: '#ab47bc' },
]

const BPM_PRESETS = [60, 80, 100, 120, 140]

export function Library() {
  const [tab, setTab] = useState<LibraryTab>('rolls')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [bpm, setBpm] = useState(100)

  // ── Data sources ──
  const rolls = useMemo(() => getAllPatterns(), [])
  const licks = LICK_LIBRARY
  const songs = SONGS

  // ── Resolve selected item to FretNote[] ──
  const { notes, label } = useMemo((): { notes: FretNote[]; label: string } => {
    if (!selectedId) return { notes: [], label: '' }

    if (tab === 'rolls') {
      const pattern = rolls.find(r => r.id === selectedId)
      if (!pattern) return { notes: [], label: '' }
      return { notes: rollPatternToFretNotes(pattern), label: pattern.name }
    }

    if (tab === 'licks') {
      const lick = licks.find(l => l.id === selectedId)
      if (!lick) return { notes: [], label: '' }
      return { notes: lickToFretNotes(lick.notes), label: lick.name }
    }

    if (tab === 'songs') {
      const song = songs.find(s => s.id === selectedId)
      if (!song) return { notes: [], label: '' }
      const section = selectedSectionId
        ? song.sections.find(s => s.id === selectedSectionId)
        : song.sections[0]
      if (!section) return { notes: [], label: '' }
      return { notes: sectionToFretNotes(section.measures), label: `${song.name} — ${section.name}` }
    }

    return { notes: [], label: '' }
  }, [tab, selectedId, selectedSectionId, rolls, licks, songs])

  // When switching tabs, clear selection
  function handleTabChange(newTab: LibraryTab) {
    if (newTab !== tab) {
      setTab(newTab)
      setSelectedId(null)
      setSelectedSectionId(null)
      setAutoPlay(false)
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setSelectedSectionId(null)
    setAutoPlay(false)
    // Set default BPM for licks/songs
    if (tab === 'licks') {
      const lick = licks.find(l => l.id === id)
      if (lick) setBpm(lick.referenceBpm)
    } else if (tab === 'songs') {
      const song = songs.find(s => s.id === id)
      if (song) setBpm(song.defaultBpm)
    }
  }

  return (
    <div className="library">
      {/* Tab selector */}
      <div className="library-tabs">
        {TAB_DEFS.map(t => (
          <button
            key={t.id}
            className={`library-tab ${tab === t.id ? 'library-tab-active' : ''}`}
            style={{ '--lib-tab-color': t.color } as React.CSSProperties}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Item buttons */}
      {tab !== 'generate' && (
      <div className="library-items">
        {tab === 'rolls' && rolls.map(r => (
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

        {tab === 'licks' && licks.map(l => (
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

        {tab === 'songs' && songs.map(s => (
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
      </div>
      )}

      {/* Song section selector (only for songs with multiple sections) */}
      {tab === 'songs' && selectedId && (() => {
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
      {tab !== 'generate' && selectedId && notes.length > 0 && (
        <div className="library-viewer">
          <div className="library-viewer-label">{label}</div>

          <FretboardDiagram
            notes={notes}
            bpm={bpm}
            autoPlay={autoPlay}
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
      {tab !== 'generate' && !selectedId && (
        <div className="library-empty">
          Select a {tab === 'rolls' ? 'roll' : tab === 'licks' ? 'lick' : 'song'} above to view its tab
        </div>
      )}

      {tab === 'generate' && (
        <RollGenerator />
      )}
    </div>
  )
}
