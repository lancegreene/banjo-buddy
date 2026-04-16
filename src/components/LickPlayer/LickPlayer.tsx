// ─────────────────────────────────────────────────────────────────────────────
// LickPlayer — Interactive lick player: tab view + cursor + controls.
// Wraps FretboardDiagram and adds count-in, metronome click, synth-mute,
// loop toggle, tempo slider. Spec: 2026-04-16-lick-library-foundation-design.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { LickReference } from '../../data/lickLibrary'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { sectionToFretNotes } from '../../engine/rollToFretNotes'
import { useTabPlayback } from './useTabPlayback'

interface LickPlayerProps {
  lick: LickReference
}

export function LickPlayer({ lick }: LickPlayerProps) {
  const fretNotes = useMemo(
    () => sectionToFretNotes([{ notes: lick.tab }]),
    [lick.tab]
  )

  const pb = useTabPlayback({ bpmDefault: lick.referenceBpm })

  const roleLabel = lick.role.charAt(0).toUpperCase() + lick.role.slice(1)
  const leadsToLabel = lick.leadsTo ? ` → ${lick.leadsTo}` : ''

  return (
    <div className="lick-player">
      {/* Header */}
      <div className="lick-player-header">
        <h3 className="lick-player-name">{lick.name}</h3>
        <div className="lick-player-meta">
          <span className="lick-meta-key">Key: {lick.key}</span>
          <span className="lick-meta-role">
            Role: {roleLabel}{leadsToLabel}
          </span>
          {lick.source && <span className="lick-meta-source">Source: {lick.source}</span>}
        </div>
      </div>

      {/* Tab view */}
      <div className={`lick-player-tab ${lick.measureCount === 2 ? 'lick-player-tab-wide' : ''}`}>
        <FretboardDiagram
          notes={fretNotes}
          autoPlay={pb.isPlaying}
          bpm={pb.bpm}
          loop={pb.loop}
          synthMuted={pb.synthMuted}
          onComplete={pb.stop}
          onActiveStepChange={pb.handleStepAdvance}
        />
      </div>

      {/* Count-in overlay */}
      {pb.phase === 'countin' && (
        <div className="lick-player-countin-overlay">
          <div className="lick-player-countin-number">{pb.countInRemaining}</div>
        </div>
      )}

      {/* Controls */}
      <div className="lick-player-controls">
        <button
          type="button"
          className="lick-player-btn lick-player-btn-play"
          onClick={pb.isPlaying || pb.phase === 'countin' ? pb.stop : pb.play}
          aria-label={pb.isPlaying ? 'Stop' : 'Play'}
        >
          {pb.isPlaying || pb.phase === 'countin' ? '■ Stop' : '▶ Play'}
        </button>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={pb.loop} onChange={pb.toggleLoop} />
          <span>🔁 Loop</span>
        </label>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={pb.countInOn} onChange={pb.toggleCountIn} />
          <span>🎵 Count-in</span>
        </label>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={!pb.synthMuted} onChange={pb.toggleSynthMuted} />
          <span>Synth</span>
        </label>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={pb.clickOn} onChange={pb.toggleClick} />
          <span>Click</span>
        </label>

        <div className="lick-player-tempo">
          <span className="lick-player-tempo-label">BPM</span>
          <input
            type="range"
            min={40}
            max={160}
            step={1}
            value={pb.bpm}
            onChange={(e) => pb.setBpm(Number(e.target.value))}
            className="lick-player-tempo-slider"
          />
          <span className="lick-player-tempo-value">{pb.bpm}</span>
        </div>
      </div>

      {/* Description */}
      {lick.description && (
        <p className="lick-player-description">{lick.description}</p>
      )}
    </div>
  )
}
