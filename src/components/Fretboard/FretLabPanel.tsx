// ─── FretLabPanel — Compact fretboard tool for inline tool panels ─────────────
import { useState, useMemo, useEffect } from 'react'
import { FretboardDiagram } from './FretboardDiagram'
import { ROLL_MAP } from '../../data/rollPatterns'
import { rollPatternToFretNotes, lickToFretNotes } from '../../engine/rollToFretNotes'
import { LICK_LIBRARY } from '../../data/lickLibrary'
import {
  EXAMPLE_FORWARD_ROLL,
  EXAMPLE_CRIPPLE_CREEK,
  EXAMPLE_FOGGY_MOUNTAIN,
  type FretNote,
} from '../../data/fretboardNotes'

const BPM_PRESETS = [60, 80, 100, 120, 140]

interface FretLabPanelProps {
  rollPatternId: string | null
  lickId?: string | null
  bpm: number
}

export function FretLabPanel({ rollPatternId, lickId, bpm: defaultBpm }: FretLabPanelProps) {
  const [autoPlay, setAutoPlay] = useState(false)
  const [bpm, setBpm] = useState(defaultBpm)
  const defaultSelection = rollPatternId ?? lickId ?? 'forward-roll'
  const [selectedSong, setSelectedSong] = useState<string>(defaultSelection)

  // Sync selection when a different skill's pattern is passed in
  useEffect(() => {
    if (rollPatternId) {
      setSelectedSong(rollPatternId)
      setAutoPlay(false)
    } else if (lickId) {
      setSelectedSong(lickId)
      setAutoPlay(false)
    }
  }, [rollPatternId, lickId])

  // Build available items: current skill pattern/lick + built-in examples
  const songs = useMemo(() => {
    const list: { id: string; label: string; notes: FretNote[] }[] = []

    // Add current skill's roll pattern first if available
    if (rollPatternId) {
      const pattern = ROLL_MAP.get(rollPatternId)
      if (pattern) {
        list.push({
          id: rollPatternId,
          label: pattern.name,
          notes: rollPatternToFretNotes(pattern),
        })
      }
    }

    // Add current skill's lick if available
    if (lickId) {
      const lick = LICK_LIBRARY.find(l => l.id === lickId)
      if (lick) {
        list.push({
          id: lickId,
          label: lick.name,
          notes: lickToFretNotes(lick.notes),
        })
      }
    }

    // Only show extra examples if no skill-specific pattern/lick is loaded
    if (list.length === 0) {
      list.push({ id: 'forward-roll', label: 'Forward Roll', notes: EXAMPLE_FORWARD_ROLL })
      list.push({ id: 'cripple-creek', label: 'Cripple Creek', notes: EXAMPLE_CRIPPLE_CREEK })
      list.push({ id: 'foggy-mountain', label: 'Foggy Mountain', notes: EXAMPLE_FOGGY_MOUNTAIN })
    }

    return list
  }, [rollPatternId, lickId])

  const activeSong = songs.find((s) => s.id === selectedSong) ?? songs[0]

  return (
    <div className="fretlab-panel">
      <div className="fretlab-panel-header">
        <h3 className="fretlab-panel-title">Fret Lab</h3>
      </div>

      {/* Pattern selector pills — hide when only one option */}
      {songs.length > 1 && (
        <div className="fretlab-panel-pills">
          {songs.map((s) => (
            <button
              key={s.id}
              className={`fretlab-pill ${selectedSong === s.id ? 'fretlab-pill-active' : ''}`}
              onClick={() => { setSelectedSong(s.id); setAutoPlay(false) }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Fretboard diagram */}
      <FretboardDiagram
        notes={activeSong.notes}
        bpm={bpm}
        autoPlay={autoPlay}
      />

      {/* Controls */}
      <div className="fretlab-panel-controls">
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

      {/* BPM presets */}
      <div className="fretlab-presets">
        {BPM_PRESETS.map((p) => (
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
  )
}
