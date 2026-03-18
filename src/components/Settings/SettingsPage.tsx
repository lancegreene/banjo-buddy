// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Settings Page
// Teacher/admin settings: custom roll patterns, future: lessons, media uploads.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { db, nowISO } from '../../db/db'
import type { CustomRollPattern } from '../../db/db'
import { refreshRollMap, ROLL_PATTERNS } from '../../data/rollPatterns'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { RollPatternEditor } from './RollPatternEditor'
import { CurriculumEditor } from './CurriculumEditor'
import { useStore } from '../../store/useStore'

type SettingsView = 'list' | 'create' | 'edit' | 'curriculum'

export function SettingsPage() {
  const activeUserRole = useStore((s) => s.activeUserRole)
  const students = useStore((s) => s.students)
  const createStudent = useStore((s) => s.createStudent)
  const deleteStudent = useStore((s) => s.deleteStudent)

  const [customPatterns, setCustomPatterns] = useState<CustomRollPattern[]>([])
  const [settingsView, setSettingsView] = useState<SettingsView>('list')
  const [editingPattern, setEditingPattern] = useState<CustomRollPattern | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newStudentName, setNewStudentName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const isTeacher = activeUserRole === 'teacher'

  async function loadCustomPatterns() {
    const patterns = await db.customRollPatterns.orderBy('createdAt').reverse().toArray()
    setCustomPatterns(patterns)
  }

  useEffect(() => {
    loadCustomPatterns()
  }, [])

  async function handleDelete(id: string) {
    await db.customRollPatterns.delete(id)
    await refreshRollMap()
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

  if (settingsView === 'curriculum') {
    return (
      <div className="settings-page">
        <button className="btn btn-sm settings-back-btn" onClick={() => setSettingsView('list')}>
          &larr; Back to Settings
        </button>
        <CurriculumEditor />
      </div>
    )
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

  async function handleAddStudent() {
    const trimmed = newStudentName.trim()
    if (!trimmed) return
    await createStudent(trimmed)
    setNewStudentName('')
  }

  async function handleDeleteStudent(id: string) {
    await deleteStudent(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>

      {/* Teacher Tools — only visible when logged in as Teacher */}
      {isTeacher && (
        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2 className="settings-section-title">Teacher Tools</h2>
              <p className="settings-section-desc">
                Manage students and customize the curriculum they see.
              </p>
            </div>
          </div>

          <div className="settings-teacher-content">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setSettingsView('curriculum')}
            >
              Edit Curriculum
            </button>

            <div className="settings-student-manager">
              <h3 className="settings-list-label">Students</h3>

              {students.length === 0 && (
                <p className="settings-empty">No students yet. Add a student below — they'll appear on the login screen.</p>
              )}

              {students.map((student) => (
                <div key={student.id} className="settings-student-row">
                  <span className="settings-student-name">{student.name}</span>
                  {confirmDeleteId === student.id ? (
                    <span className="settings-student-confirm">
                      <button className="btn btn-sm settings-delete-btn" onClick={() => handleDeleteStudent(student.id)}>
                        Confirm
                      </button>
                      <button className="btn btn-sm" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm settings-delete-btn"
                      onClick={() => setConfirmDeleteId(student.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <div className="settings-add-student">
                <input
                  type="text"
                  className="settings-add-student-input"
                  placeholder="Student name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                />
                <button className="btn btn-sm btn-primary" onClick={handleAddStudent}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Custom Roll Patterns */}
      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2 className="settings-section-title">Custom Roll Patterns</h2>
            <p className="settings-section-desc">
              Create your own roll patterns for students to practice.
              Custom patterns appear alongside the defaults everywhere in the app.
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
