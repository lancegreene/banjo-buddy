// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Pattern Editor
// Visual editor for creating and editing custom roll patterns.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { db, newId, nowISO } from '../../db/db'
import type { CustomRollPattern } from '../../db/db'
import { refreshRollMap } from '../../data/rollPatterns'
import { refreshSkillMap } from '../../data/curriculum'
import { useStore } from '../../store/useStore'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'

type Finger = 'T' | 'I' | 'M'

interface RollPatternEditorProps {
  pattern?: CustomRollPattern
  onSave: () => void
  onCancel: () => void
}

export function RollPatternEditor({ pattern, onSave, onCancel }: RollPatternEditorProps) {
  const user = useStore((s) => s.user)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const [name, setName] = useState(pattern?.name ?? '')
  const [description, setDescription] = useState(pattern?.description ?? '')
  const [strings, setStrings] = useState<(number | null)[]>(
    pattern?.strings?.length ? [...pattern.strings] : [null, null, null, null, null, null, null, null]
  )
  const [fingers, setFingers] = useState<Finger[]>(
    pattern?.fingers?.length ? [...pattern.fingers] : ['T', 'I', 'M', 'T', 'I', 'M', 'T', 'I']
  )
  const [addAsSkill, setAddAsSkill] = useState(pattern?.addAsSkill ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const beatCount = strings.length

  function setString(index: number, value: number | null) {
    const next = [...strings]
    next[index] = value
    setStrings(next)
  }

  function setFinger(index: number, value: Finger) {
    const next = [...fingers]
    next[index] = value
    setFingers(next)
  }

  function addBeat() {
    if (beatCount >= 16) return
    setStrings([...strings, null])
    setFingers([...fingers, 'T'])
  }

  function removeBeat() {
    if (beatCount <= 4) return
    setStrings(strings.slice(0, -1))
    setFingers(fingers.slice(0, -1))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (strings.every(s => s === null)) {
      setError('At least one beat must have a string assigned')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const now = nowISO()
      if (pattern) {
        await db.customRollPatterns.update(pattern.id, {
          name: name.trim(),
          description: description.trim(),
          strings,
          fingers,
          addAsSkill,
          updatedAt: now,
        })
      } else {
        const newPattern: CustomRollPattern = {
          id: `custom_${newId().slice(0, 8)}`,
          name: name.trim(),
          description: description.trim(),
          strings,
          fingers,
          addAsSkill,
          createdBy: user?.id ?? 'local',
          createdAt: now,
          updatedAt: now,
        }
        await db.customRollPatterns.add(newPattern)
      }

      await refreshRollMap(user?.id, activeUserRole, user?.teacherId)
      await refreshSkillMap(user?.id, activeUserRole, user?.teacherId)
      onSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="roll-editor">
      <h3 className="roll-editor-title">{pattern ? 'Edit Pattern' : 'New Roll Pattern'}</h3>

      {/* Name */}
      <div className="roll-editor-field">
        <label className="roll-editor-label">Name</label>
        <input
          type="text"
          className="roll-editor-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. My Custom Roll"
        />
      </div>

      {/* Description */}
      <div className="roll-editor-field">
        <label className="roll-editor-label">Description</label>
        <input
          type="text"
          className="roll-editor-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. T-I-M pattern with..."
        />
      </div>

      {/* Beat count */}
      <div className="roll-editor-field">
        <label className="roll-editor-label">Beats: {beatCount}</label>
        <div className="roll-editor-beat-controls">
          <button className="btn btn-sm" onClick={removeBeat} disabled={beatCount <= 4}>−</button>
          <button className="btn btn-sm" onClick={addBeat} disabled={beatCount >= 16}>+</button>
        </div>
      </div>

      {/* Beat grid */}
      <div className="roll-editor-grid">
        {strings.map((str, i) => (
          <div key={i} className="roll-editor-beat">
            <span className="roll-editor-beat-num">{i + 1}</span>
            {/* String buttons — 1 to 5 top to bottom (matches tab diagram) */}
            <div className="roll-editor-string-col">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  className={`roll-editor-string-btn ${str === s ? 'roll-editor-string-btn-active' : ''}`}
                  onClick={() => setString(i, str === s ? null : s)}
                  title={`String ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* Finger buttons */}
            <div className="roll-editor-finger-col">
              {(['T', 'I', 'M'] as Finger[]).map(f => (
                <button
                  key={f}
                  className={`roll-editor-finger-btn ${fingers[i] === f ? 'roll-editor-finger-btn-active' : ''}`}
                  onClick={() => setFinger(i, f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add as skill checkbox */}
      <div className="roll-editor-field">
        <label className="roll-editor-checkbox">
          <input
            type="checkbox"
            checked={addAsSkill}
            onChange={e => setAddAsSkill(e.target.checked)}
          />
          <span>Add as a practice skill (appears in Skills list for students)</span>
        </label>
      </div>

      {/* Preview */}
      <div className="roll-editor-preview">
        <span className="roll-editor-label">Preview</span>
        <BanjoTabDiagram
          strings={strings}
          fingers={fingers}
          label={name || 'Untitled Pattern'}
        />
      </div>

      {/* Error */}
      {error && <div className="roll-editor-error">{error}</div>}

      {/* Actions */}
      <div className="roll-editor-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : pattern ? 'Update Pattern' : 'Save Pattern'}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
