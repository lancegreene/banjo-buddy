// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Settings Page
//
// Phase 0 placeholder: teacher-mode UI, the "Take a tour" button, and the
// Fretboard Lab navigation were dropped when the corresponding store slices
// and pages were retired in Task 0.4. The custom-roll editor, recording
// studio, and banjo anatomy viewer all still work standalone.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { db } from '../../db/db'
import type { CustomRollPattern } from '../../db/db'
import { enqueueSync } from '../../db/sync'
import { refreshRollMap, ROLL_PATTERNS } from '../../data/rollPatterns'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { RollPatternEditor } from './RollPatternEditor'
import { useStore } from '../../store/useStore'
import { RecordingStudio } from './RecordingStudio'
import { BanjoAnatomy } from '../BanjoAnatomy/BanjoAnatomy'

type SettingsView = 'list' | 'create' | 'edit' | 'recording_studio' | 'banjo_anatomy'

export function SettingsPage() {
  const user = useStore((s) => s.user)

  const [customPatterns, setCustomPatterns] = useState<CustomRollPattern[]>([])
  const [settingsView, setSettingsView] = useState<SettingsView>('list')
  const [editingPattern, setEditingPattern] = useState<CustomRollPattern | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadCustomPatterns() {
    const allPatterns = await db.customRollPatterns.orderBy('createdAt').reverse().toArray()
    // Phase 0: solo only — show this user's patterns.
    const visible = user
      ? allPatterns.filter((p) => p.createdBy === user.id)
      : allPatterns
    setCustomPatterns(visible)
  }

  useEffect(() => {
    loadCustomPatterns()
  }, [user?.id])

  async function handleDelete(id: string) {
    await db.customRollPatterns.delete(id)
    enqueueSync('customRollPatterns', id, 'delete', {} as any)
    await refreshRollMap(user?.id, user?.role, user?.teacherId)
    loadCustomPatterns()
  }

  function handleEdit(pattern: CustomRollPattern) {
    setEditingPattern(pattern)
    setSettingsView('edit')
  }

  function handleEditorSave() {
    setSettingsView('list')
    setEditingPattern(null)
    loadCustomPatterns()
  }

  function handleEditorCancel() {
    setSettingsView('list')
    setEditingPattern(null)
  }

  if (settingsView === 'create' || settingsView === 'edit') {
    return (
      <div className="settings-page">
        <RollPatternEditor
          pattern={editingPattern ?? undefined}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      </div>
    )
  }

  if (settingsView === 'recording_studio') {
    return (
      <div className="settings-page">
        <button className="btn btn-sm settings-back-btn" onClick={() => setSettingsView('list')}>
          &larr; Back to Settings
        </button>
        <RecordingStudio />
      </div>
    )
  }

  if (settingsView === 'banjo_anatomy') {
    return (
      <div className="settings-page">
        <BanjoAnatomy onExit={() => setSettingsView('list')} />
      </div>
    )
  }

  return (
    <div className="settings-page" data-tour="settings-page">
      <h1 className="settings-title">Settings</h1>

      {/* Experimental */}
      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2 className="settings-section-title">Experimental</h2>
            <p className="settings-section-desc">
              New features in development. Try them out and let us know what you think.
            </p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setSettingsView('banjo_anatomy')}
        >
          Banjo Anatomy Tour
        </button>
      </section>

      {/* Recording Studio */}
      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2 className="settings-section-title">Recording Studio</h2>
            <p className="settings-section-desc">
              Record your playing, import audio files, and build a library of reference tracks.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setSettingsView('recording_studio')}>
            Open Studio
          </button>
        </div>
      </section>

      {/* Custom Roll Patterns */}
      <section className="settings-section" data-tour="settings-patterns">
        <div className="settings-section-header">
          <div>
            <h2 className="settings-section-title">Custom Roll Patterns</h2>
            <p className="settings-section-desc">
              Create your own roll patterns. Custom patterns appear alongside the defaults everywhere in the app.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setSettingsView('create')}>
            + New Pattern
          </button>
        </div>

        {/* Custom patterns list */}
        {customPatterns.length > 0 && (
          <div className="settings-pattern-list">
            <h3 className="settings-list-label">Your Patterns</h3>
            {customPatterns.map(pattern => {
              const isExpanded = expandedId === pattern.id
              return (
                <div key={pattern.id} className="settings-pattern-card">
                  <button
                    className="settings-pattern-header"
                    onClick={() => setExpandedId(isExpanded ? null : pattern.id)}
                  >
                    <div className="settings-pattern-info">
                      <span className="settings-pattern-name">{pattern.name}</span>
                      <span className="settings-pattern-meta">
                        {pattern.strings.length} beats · {pattern.strings.filter(s => s !== null).length} notes
                      </span>
                    </div>
                    <span className="settings-pattern-expand">{isExpanded ? '▾' : '▸'}</span>
                  </button>

                  {isExpanded && (
                    <div className="settings-pattern-detail">
                      {pattern.description && (
                        <p className="settings-pattern-desc">{pattern.description}</p>
                      )}
                      <BanjoTabDiagram
                        strings={pattern.strings}
                        fingers={pattern.fingers}
                        label={pattern.name}
                      />
                      <div className="settings-pattern-actions">
                        <button className="btn btn-sm" onClick={() => handleEdit(pattern)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm settings-delete-btn"
                          onClick={() => handleDelete(pattern.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {customPatterns.length === 0 && (
          <div className="settings-empty">
            No custom patterns yet. Click "+ New Pattern" to create one.
          </div>
        )}

        {/* Default patterns reference */}
        <div className="settings-pattern-list settings-defaults">
          <h3 className="settings-list-label">Default Patterns</h3>
          {ROLL_PATTERNS.map(pattern => {
            const isExpanded = expandedId === pattern.id
            return (
              <div key={pattern.id} className="settings-pattern-card settings-pattern-default">
                <button
                  className="settings-pattern-header"
                  onClick={() => setExpandedId(isExpanded ? null : pattern.id)}
                >
                  <div className="settings-pattern-info">
                    <span className="settings-pattern-name">{pattern.name}</span>
                    <span className="settings-pattern-meta">{pattern.description}</span>
                  </div>
                  <span className="settings-pattern-expand">{isExpanded ? '▾' : '▸'}</span>
                </button>

                {isExpanded && (
                  <div className="settings-pattern-detail">
                    <BanjoTabDiagram
                      strings={pattern.strings}
                      fingers={pattern.fingers}
                      label={pattern.name}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
