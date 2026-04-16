// ─── Library — Browse rolls, licks, songs, scales, chords with FretLab-style tab viewer ──
import { useState, useMemo } from 'react'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { BanjoChordDiagram } from '../BanjoChordDiagram/BanjoChordDiagram'
import { CircleOfFifths } from '../CircleOfFifths/CircleOfFifths'
import { RollGenerator } from '../RollGenerator/RollGenerator'
import { getAllPatterns } from '../../data/rollPatterns'
import { LICK_LIBRARY, getLickKeys, LICK_TYPES, type LickType } from '../../data/lickLibrary'
import { SONGS } from '../../data/songLibrary'
import { SCALE_LIBRARY, SCALE_CATEGORIES, getScaleKeys, type ScaleCategory } from '../../data/scaleLibrary'
import { CHORD_DIAGRAMS, getChordRoots, getChordVoicings, type ChordCategory } from '../../data/chordDiagrams'
import { rollPatternToFretNotes, lickToFretNotes, sectionToFretNotes } from '../../engine/rollToFretNotes'
import type { FretNote } from '../../data/fretboardNotes'

type LibraryCategory = 'rolls' | 'licks' | 'songs' | 'scales' | 'chords' | 'circle' | 'generate'

// ─── SVG icons for Quick Pick cards ──────────────────────────────────────────
const CatIcon = ({ children }: { children: React.ReactNode }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const ChordIcon = () => <CatIcon><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="7" x2="20" y2="7"/><line x1="8" y1="7" x2="8" y2="22"/><line x1="12" y1="7" x2="12" y2="22"/><line x1="16" y1="7" x2="16" y2="22"/><circle cx="10" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none"/></CatIcon>
const CircleIcon = () => <CatIcon><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><text x="12" y="13.5" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">V</text></CatIcon>
const RollIcon = () => <CatIcon><path d="M4 12h16"/><path d="M4 7h16"/><path d="M4 17h16"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.3" fill="currentColor" stroke="none"/><circle cx="17" cy="7" r="1.3" fill="currentColor" stroke="none"/></CatIcon>
const LickIcon = () => <CatIcon><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></CatIcon>
const ScaleIcon = () => <CatIcon><path d="M3 20l4-6 3 4 4-8 3 5 4-9"/></CatIcon>
const SongIcon = () => <CatIcon><path d="M4 4h16v16H4z" rx="2"/><path d="M8 8h8"/><path d="M8 12h6"/><path d="M8 16h4"/></CatIcon>
const GenerateIcon = () => <CatIcon><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/><path d="M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8M18.4 5.6l-2.8 2.8M5.6 18.4l2.8-2.8"/><circle cx="12" cy="12" r="3"/></CatIcon>

const CATEGORIES: { id: LibraryCategory; label: string; icon: () => JSX.Element; desc: string; color: string; badge?: string }[] = [
  { id: 'chords',   label: 'Chord Charts',    icon: ChordIcon,    desc: 'Major, minor & 7th chord shapes',  color: '#ffa726' },
  { id: 'circle',   label: 'Circle of 5ths',  icon: CircleIcon,   desc: 'Keys, scales & diatonic chords',   color: '#7c4dff' },
  { id: 'rolls',    label: 'Roll Repo',       icon: RollIcon,     desc: 'Scruggs picking patterns',          color: '#26a69a' },
  { id: 'licks',    label: 'Lick Library',    icon: LickIcon,     desc: 'Classic bluegrass licks',           color: '#66bb6a' },
  { id: 'scales',   label: 'Scales',          icon: ScaleIcon,    desc: 'Major, melodic, pentatonic & blues', color: '#ef5350' },
  { id: 'songs',    label: 'Song Studio',     icon: SongIcon,     desc: 'Full song arrangements',            color: '#42a5f5', badge: 'In Progress' },
  { id: 'generate', label: 'Roll Generator',  icon: GenerateIcon, desc: 'Create custom roll patterns',      color: '#ab47bc' },
]

const CHORD_CATEGORIES: { id: ChordCategory; label: string }[] = [
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
  { id: '7th',   label: '7th' },
]

const BPM_PRESETS = [60, 80, 100, 120, 140]

// Standalone categories that don't use the item list / tab viewer
const STANDALONE = new Set<LibraryCategory>(['generate', 'chords', 'circle'])

export function Library() {
  const [category, setCategory] = useState<LibraryCategory | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [bpm, setBpm] = useState(100)
  // Chord filters
  const [chordFilter, setChordFilter] = useState<ChordCategory>('major')
  const [chordRoot, setChordRoot] = useState<string | null>(null)
  // Scale filters
  const [scaleFilter, setScaleFilter] = useState<ScaleCategory | null>(null)
  const [scaleKey, setScaleKey] = useState<string | null>(null)
  // Lick filters
  const [lickType, setLickType] = useState<LickType | null>(null)
  const [lickKey, setLickKey] = useState<string | null>(null)

  // ── Data sources ──
  const rolls = useMemo(() => getAllPatterns(), [])
  const licks = LICK_LIBRARY
  const songs = SONGS
  const scales = SCALE_LIBRARY

  // ── Filtered data ──
  const filteredScales = useMemo(() => {
    return scales.filter(s =>
      (!scaleFilter || s.category === scaleFilter) &&
      (!scaleKey || s.key === scaleKey)
    )
  }, [scales, scaleFilter, scaleKey])

  const filteredLicks = useMemo(() => {
    return licks.filter(l =>
      (!lickType || l.lickType === lickType) &&
      (!lickKey || l.key === lickKey)
    )
  }, [licks, lickType, lickKey])

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
  const isStandalone = category ? STANDALONE.has(category) : false

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
                <span className="library-menu-card-icon"><cat.icon /></span>
                <span className="library-menu-card-label">
                  {cat.label}
                  {cat.badge && <span className="library-menu-card-badge">{cat.badge}</span>}
                </span>
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

      {/* Circle of Fifths — standalone */}
      {category === 'circle' && <CircleOfFifths />}

      {/* ══ Chord charts — filter pills + root buttons + diagram grid ══ */}
      {category === 'chords' && (() => {
        const roots = getChordRoots(chordFilter)
        const activeRoot = chordRoot && roots.includes(chordRoot) ? chordRoot : null
        const visibleChords = activeRoot
          ? getChordVoicings(activeRoot, chordFilter)
          : CHORD_DIAGRAMS.filter(c => c.category === chordFilter && c.position === 'Open')
        return (
          <div className="library-filtered-section">
            <div className="library-filter-row">
              {CHORD_CATEGORIES.map(cc => (
                <button
                  key={cc.id}
                  className={`library-filter-pill ${chordFilter === cc.id ? 'library-filter-pill-active' : ''}`}
                  style={{ '--pill-color': '#ffa726' } as React.CSSProperties}
                  onClick={() => { setChordFilter(cc.id); setChordRoot(null) }}
                >
                  {cc.label}
                </button>
              ))}
            </div>
            <div className="library-key-row">
              {roots.map(root => (
                <button
                  key={root}
                  className={`library-key-btn ${activeRoot === root ? 'library-key-btn-active' : ''}`}
                  style={{ '--pill-color': '#ffa726' } as React.CSSProperties}
                  onClick={() => setChordRoot(activeRoot === root ? null : root)}
                >
                  {root}
                </button>
              ))}
            </div>
            {activeRoot && (
              <div className="library-filter-label">
                {activeRoot} — all positions up the neck
              </div>
            )}
            <div className="library-chord-grid">
              {visibleChords.map(chord => (
                <BanjoChordDiagram key={chord.id} chord={chord} />
              ))}
            </div>
          </div>
        )
      })()}

      {/* ══ Scales — filter pills + key buttons + item list ══ */}
      {category === 'scales' && (() => {
        const keys = getScaleKeys(scaleFilter ?? undefined)
        return (
          <div className="library-filtered-section">
            <div className="library-filter-row">
              <button
                className={`library-filter-pill ${!scaleFilter ? 'library-filter-pill-active' : ''}`}
                style={{ '--pill-color': '#ef5350' } as React.CSSProperties}
                onClick={() => { setScaleFilter(null); setScaleKey(null); setSelectedId(null) }}
              >
                All
              </button>
              {SCALE_CATEGORIES.map(sc => (
                <button
                  key={sc.id}
                  className={`library-filter-pill ${scaleFilter === sc.id ? 'library-filter-pill-active' : ''}`}
                  style={{ '--pill-color': '#ef5350' } as React.CSSProperties}
                  onClick={() => { setScaleFilter(sc.id); setScaleKey(null); setSelectedId(null) }}
                >
                  {sc.label}
                </button>
              ))}
            </div>
            <div className="library-key-row">
              {keys.map(k => (
                <button
                  key={k}
                  className={`library-key-btn ${scaleKey === k ? 'library-key-btn-active' : ''}`}
                  style={{ '--pill-color': '#ef5350' } as React.CSSProperties}
                  onClick={() => { setScaleKey(scaleKey === k ? null : k); setSelectedId(null) }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="library-items">
              {filteredScales.map(s => (
                <button
                  key={s.id}
                  className={`library-item ${selectedId === s.id ? 'library-item-active' : ''}`}
                  onClick={() => handleSelect(s.id)}
                  title={s.description}
                >
                  <span className="library-item-name">{s.name}</span>
                  <span className="library-item-meta">{s.category} · {s.key}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ══ Licks — type pills + key buttons + item list ══ */}
      {category === 'licks' && (() => {
        const keys = getLickKeys()
        return (
          <div className="library-filtered-section">
            <div className="library-filter-row">
              <button
                className={`library-filter-pill ${!lickType ? 'library-filter-pill-active' : ''}`}
                style={{ '--pill-color': '#66bb6a' } as React.CSSProperties}
                onClick={() => { setLickType(null); setLickKey(null); setSelectedId(null) }}
              >
                All
              </button>
              {LICK_TYPES.map(lt => (
                <button
                  key={lt.id}
                  className={`library-filter-pill ${lickType === lt.id ? 'library-filter-pill-active' : ''}`}
                  style={{ '--pill-color': '#66bb6a' } as React.CSSProperties}
                  onClick={() => { setLickType(lt.id); setLickKey(null); setSelectedId(null) }}
                >
                  {lt.label}
                </button>
              ))}
            </div>
            <div className="library-key-row">
              {keys.map(k => (
                <button
                  key={k}
                  className={`library-key-btn ${lickKey === k ? 'library-key-btn-active' : ''}`}
                  style={{ '--pill-color': '#66bb6a' } as React.CSSProperties}
                  onClick={() => { setLickKey(lickKey === k ? null : k); setSelectedId(null) }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="library-items">
              {filteredLicks.map(l => (
                <button
                  key={l.id}
                  className={`library-item ${selectedId === l.id ? 'library-item-active' : ''}`}
                  onClick={() => handleSelect(l.id)}
                  title={l.description}
                >
                  <span className="library-item-name">{l.name}</span>
                  <span className="library-item-meta">{l.key} · {l.referenceBpm} BPM</span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ══ Rolls — simple item list (no filters needed for 7 items) ══ */}
      {category === 'rolls' && (
        <div className="library-filtered-section">
          <div className="library-items library-items-rolls">
            {rolls.map(r => (
              <button
                key={r.id}
                className={`library-item library-item-roll ${selectedId === r.id ? 'library-item-active' : ''}`}
                onClick={() => handleSelect(r.id)}
              >
                <span className="library-item-name">{r.name}</span>
                <span className="library-item-desc library-item-desc-desktop">{r.description}</span>
                <span className="library-item-meta">
                  {r.fingers?.join('-') || r.strings.map(s => s ?? '·').join('-')} · {r.strings.length} notes
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ Songs — item list with key/BPM info ══ */}
      {category === 'songs' && (
        <div className="library-filtered-section">
          <div className="library-items">
            {songs.map(s => (
              <button
                key={s.id}
                className={`library-item library-item-wide ${selectedId === s.id ? 'library-item-active' : ''}`}
                onClick={() => handleSelect(s.id)}
              >
                <span className="library-item-name">{s.name}</span>
                <span className="library-item-meta">
                  Key of {s.key} · {s.defaultBpm}–{s.performanceBpm} BPM · {s.sections.length} section{s.sections.length > 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
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
      {!isStandalone && selectedId && notes.length > 0 && (
        <div className="library-viewer">
          <div className="library-viewer-label">{label}</div>
          {category === 'rolls' && (() => {
            const roll = rolls.find(r => r.id === selectedId)
            return roll?.description ? (
              <div className="library-viewer-desc-mobile">{roll.description}</div>
            ) : null
          })()}

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
      {!isStandalone && !selectedId && (
        <div className="library-empty">
          Select a {category === 'rolls' ? 'roll' : category === 'licks' ? 'lick' : category === 'scales' ? 'scale' : 'song'} above to view its tab
        </div>
      )}
    </div>
  )
}
