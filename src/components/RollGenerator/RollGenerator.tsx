// src/components/RollGenerator/RollGenerator.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Generator UI
// Constraint controls + live preview with tab diagram and synth playback.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react'
import { generateRoll, DEFAULT_CONSTRAINTS, type RollConstraints, type Finger } from '../../engine/rollGenerator'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { rollPatternToFretNotes } from '../../engine/rollToFretNotes'
import { db } from '../../db/db'
import { refreshRollMap, type RollPattern } from '../../data/rollPatterns'

const BPM_PRESETS = [60, 80, 100, 120, 140]

export function RollGenerator() {
  const [constraints, setConstraints] = useState<RollConstraints>({ ...DEFAULT_CONSTRAINTS })
  const [pattern, setPattern] = useState<RollPattern | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [bpm, setBpm] = useState(100)
  const [saved, setSaved] = useState(false)

  const notes = useMemo(() => {
    if (!pattern) return []
    return rollPatternToFretNotes(pattern)
  }, [pattern])

  const handleGenerate = useCallback(() => {
    setAutoPlay(false)
    setSaved(false)
    const result = generateRoll(constraints)
    setPattern(result)
  }, [constraints])

  const handleSurprise = useCallback(() => {
    setAutoPlay(false)
    setSaved(false)
    const result = generateRoll(DEFAULT_CONSTRAINTS)
    setPattern(result)
  }, [])

  async function handleSave() {
    if (!pattern) return
    const now = new Date().toISOString()
    await db.customRollPatterns.put({
      id: pattern.id,
      name: pattern.name,
      strings: pattern.strings,
      fingers: pattern.fingers!,
      description: pattern.description,
      addAsSkill: false,
      createdBy: 'local',
      createdAt: now,
      updatedAt: now,
    })
    await refreshRollMap()
    setSaved(true)
  }

  function updateConstraint<K extends keyof RollConstraints>(key: K, value: RollConstraints[K]) {
    setConstraints(prev => ({ ...prev, [key]: value }))
  }

  function toggleMustInclude(str: number) {
    setConstraints(prev => {
      const current = prev.mustIncludeStrings
      return {
        ...prev,
        mustIncludeStrings: current.includes(str)
          ? current.filter(s => s !== str)
          : [...current, str],
      }
    })
  }

  return (
    <div className="roll-gen">
      <div className="roll-gen-controls">
        <div className="roll-gen-row">
          <label className="roll-gen-label">Starting finger</label>
          <div className="roll-gen-options">
            {([null, 'T', 'I', 'M'] as (Finger | null)[]).map(f => (
              <button
                key={f ?? 'any'}
                className={`roll-gen-opt ${constraints.startingFinger === f ? 'roll-gen-opt-active' : ''}`}
                onClick={() => updateConstraint('startingFinger', f)}
              >
                {f ?? 'Any'}
              </button>
            ))}
          </div>
        </div>

        <div className="roll-gen-row">
          <label className="roll-gen-label">Starting string</label>
          <div className="roll-gen-options">
            {([null, 1, 2, 3, 4, 5] as (number | null)[]).map(s => (
              <button
                key={s ?? 'any'}
                className={`roll-gen-opt ${constraints.startingString === s ? 'roll-gen-opt-active' : ''}`}
                onClick={() => updateConstraint('startingString', s)}
              >
                {s ?? 'Any'}
              </button>
            ))}
          </div>
        </div>

        <div className="roll-gen-row">
          <label className="roll-gen-label">Must include strings</label>
          <div className="roll-gen-options">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                className={`roll-gen-opt ${constraints.mustIncludeStrings.includes(s) ? 'roll-gen-opt-active' : ''}`}
                onClick={() => toggleMustInclude(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="roll-gen-row">
          <label className="roll-gen-label">String 5 frequency</label>
          <div className="roll-gen-options">
            {(['any', 'never', 'once', 'twice'] as const).map(v => (
              <button
                key={v}
                className={`roll-gen-opt ${constraints.string5Frequency === v ? 'roll-gen-opt-active' : ''}`}
                onClick={() => updateConstraint('string5Frequency', v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="roll-gen-row">
          <label className="roll-gen-label">Direction bias</label>
          <div className="roll-gen-options">
            {(['none', 'forward', 'backward', 'mixed'] as const).map(v => (
              <button
                key={v}
                className={`roll-gen-opt ${constraints.directionalBias === v ? 'roll-gen-opt-active' : ''}`}
                onClick={() => updateConstraint('directionalBias', v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="roll-gen-row">
          <label className="roll-gen-toggle-label">
            <input
              type="checkbox"
              checked={constraints.thumbOnDownbeats}
              onChange={e => updateConstraint('thumbOnDownbeats', e.target.checked)}
            />
            Thumb on downbeats
          </label>
          <label className="roll-gen-toggle-label">
            <input
              type="checkbox"
              checked={constraints.allowConsecutiveThumb}
              onChange={e => updateConstraint('allowConsecutiveThumb', e.target.checked)}
            />
            Allow consecutive thumb
          </label>
        </div>

        <div className="roll-gen-actions">
          <button className="btn btn-primary" onClick={handleGenerate}>Generate Roll</button>
          <button className="btn btn-secondary" onClick={handleSurprise}>Surprise Me</button>
        </div>
      </div>

      {pattern && notes.length > 0 && (
        <div className="roll-gen-preview">
          <div className="library-viewer-label">
            {pattern.fingers?.join('-')} on strings {pattern.strings.join('-')}
          </div>

          <FretboardDiagram
            notes={notes}
            bpm={bpm}
            autoPlay={autoPlay}
          />

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

          <button
            className={`btn ${saved ? 'btn-secondary' : 'btn-primary'} roll-gen-save`}
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? 'Saved to Library' : 'Save to Library'}
          </button>
        </div>
      )}

      {!pattern && (
        <div className="library-empty">
          Set your constraints and hit Generate to create a Scruggs-style roll
        </div>
      )}
    </div>
  )
}
