// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Settings Page
// Teacher/admin settings: custom roll patterns, future: lessons, media uploads.
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
    const allPatterns = await db.customRollPatterns.orderBy('createdAt').reverse().toArray()
    // Filter by visibility: teachers see all, students see theirs + teacher's, solo sees own
    let visible = allPatterns
    if (user) {
      if (activeUserRole === 'teacher') {
        visible = allPatterns
      } else if (activeUserRole === 'student' && user.teacherId) {
        visible = allPatterns.filter((p) => p.createdBy === user.id || p.createdBy === user.teacherId)
      } else {
        visible = allPatterns.filter((p) => p.createdBy === user.id)
      }
    }
    setCustomPatterns(visible)
  }

  useEffect(() => {
    loadCustomPatterns()
  }, [user?.id, activeUserRole])

  async function handleDelete(id: string) {
    await db.customRollPatterns.delete(id)
    enqueueSync('customRollPatterns', id, 'delete', {} as any)
    await refreshRollMap(user?.id, activeUserRole, user?.teacherId)
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

  async function handleToggleRole() {
    const store = useStore.getState()
    if (isTeacher) {
      // Switch back to solo mode
      await store.loginAsGuest()
      store.setPage('settings')
    } else {
      // Switch to teacher mode — find or create a teacher profile
      let teacherId: string | null = null
      const existingTeachers = store.teachers
      if (existingTeachers.length > 0) {
        teacherId = existingTeachers[0].id
      } else {
        await store.createTeacher(user?.name ?? 'Teacher')
        const updated = useStore.getState().teachers
        if (updated.length > 0) teacherId = updated[0].id
      }
      if (teacherId) {
        await store.loginAsTeacher(teacherId)
        store.setPage('settings')
      }
    }
  }

  return (
    <div className="settings-page" data-tour="settings-page">
      <h1 className="settings-title">Settings</h1>

      {/* Role Toggle */}
      <section className="settings-section">
        <div className="settings-role-toggle">
          <div className="settings-role-info">
            <span className="settings-role-badge">{isTeacher ? 'Teacher Mode' : activeUserRole === 'student' ? 'Student Mode' : 'Solo Mode'}</span>
            <p className="settings-role-desc">
              {isTeacher
                ? 'You can manage students.'
                : 'Switch to Teacher Mode to manage students.'}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleToggleRole}>
            {isTeacher ? 'Switch to Solo' : 'Switch to Teacher'}
          </button>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="settings-section">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            useStore.getState().startTour()
            useStore.getState().setPage('dashboard')
          }}
        >
          Take a Tour
        </button>
      </section>

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
          onClick={() => useStore.getState().setPage('fretboard-lab')}
        >
          Fretboard Lab
        </button>
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

      {/* Teacher Tools — only visible when logged in as Teacher */}
      {isTeacher && (
        <section className="settings-section" data-tour="settings-teacher">
          <div className="settings-section-header">
            <div>
              <h2 className="settings-section-title">Teacher Tools</h2>
              <p className="settings-section-desc">
                Manage students.
              </p>
            </div>
          </div>

          <div className="settings-teacher-content">
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
      <section className="settings-section" data-tour="settings-patterns">
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
