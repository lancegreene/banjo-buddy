// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Settings Page
// Teacher/admin settings: custom roll patterns, future: lessons, media uploads.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { db, nowISO } from '../../db/db'
import type { CustomRollPattern, TeacherClip, MediaDisplaySettings } from '../../db/db'
import { updateTeacherConfig } from '../../db/db'
import { refreshRollMap, ROLL_PATTERNS } from '../../data/rollPatterns'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { RollPatternEditor } from './RollPatternEditor'
import { CurriculumEditor } from './CurriculumEditor'
import { useStore } from '../../store/useStore'
import { getClipsByTeacher, deleteClip, getMediaStorageUsage, type ClipStorageUsage } from '../../engine/teacherClipService'
import { SKILL_MAP } from '../../data/curriculum'
import { VideoRecorder } from '../Teaching/VideoRecorder'
import { AudioRecorderTeacher } from '../Teaching/AudioRecorderTeacher'
import { ImageUploader } from '../Teaching/ImageUploader'
import { TabCropper } from '../Teaching/TabCropper'
import { RecordingStudio } from './RecordingStudio'
import { BanjoAnatomy } from '../BanjoAnatomy/BanjoAnatomy'

type SettingsView = 'list' | 'create' | 'edit' | 'curriculum' | 'record_video' | 'record_audio' | 'upload_image' | 'upload_tab' | 'edit_clip' | 'recording_studio' | 'banjo_anatomy'

export function SettingsPage() {
  const user = useStore((s) => s.user)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const students = useStore((s) => s.students)
  const createStudent = useStore((s) => s.createStudent)
  const deleteStudent = useStore((s) => s.deleteStudent)
  const teacherConfig = useStore((s) => s.teacherConfig)

  const [customPatterns, setCustomPatterns] = useState<CustomRollPattern[]>([])
  const [settingsView, setSettingsView] = useState<SettingsView>('list')
  const [editingPattern, setEditingPattern] = useState<CustomRollPattern | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newStudentName, setNewStudentName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Teacher clips state
  const [teacherClips, setTeacherClips] = useState<TeacherClip[]>([])
  const [clipStorage, setClipStorage] = useState<ClipStorageUsage | null>(null)
  const [editingClip, setEditingClip] = useState<TeacherClip | null>(null)
  const [clipPlayingId, setClipPlayingId] = useState<string | null>(null)
  const [clipVideoUrls, setClipVideoUrls] = useState<Map<string, string>>(new Map())
  const [confirmDeleteClipId, setConfirmDeleteClipId] = useState<string | null>(null)

  const isTeacher = activeUserRole === 'teacher'

  async function loadClips() {
    if (!user || !isTeacher) return
    const clips = await getClipsByTeacher(user.id)
    setTeacherClips(clips)
    const storage = await getMediaStorageUsage()
    setClipStorage(storage)
    // Revoke old URLs
    clipVideoUrls.forEach((url) => URL.revokeObjectURL(url))
    const urls = new Map<string, string>()
    clips.forEach((c) => {
      const blob = c.videoBlob ?? c.audioBlob ?? c.imageBlob
      if (blob) urls.set(c.id, URL.createObjectURL(blob))
    })
    setClipVideoUrls(urls)
  }

  useEffect(() => {
    loadClips()
    return () => { clipVideoUrls.forEach((url) => URL.revokeObjectURL(url)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isTeacher])

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

  if (settingsView === 'curriculum') {
    return (
      <div className="settings-page">
        <CurriculumEditor onExit={() => setSettingsView('list')} />
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

  if (settingsView === 'record_video' || settingsView === 'edit_clip') {
    return (
      <div className="settings-page">
        <button className="btn btn-sm settings-back-btn" onClick={() => { setSettingsView('list'); setEditingClip(null) }}>
          &larr; Back to Settings
        </button>
        <VideoRecorder
          editClip={editingClip ?? undefined}
          onSaved={() => { setSettingsView('list'); setEditingClip(null); loadClips() }}
          onCancel={() => { setSettingsView('list'); setEditingClip(null) }}
        />
      </div>
    )
  }

  if (settingsView === 'record_audio') {
    return (
      <div className="settings-page">
        <button className="btn btn-sm settings-back-btn" onClick={() => setSettingsView('list')}>
          &larr; Back to Settings
        </button>
        <AudioRecorderTeacher
          onSaved={() => { setSettingsView('list'); loadClips() }}
          onCancel={() => setSettingsView('list')}
        />
      </div>
    )
  }

  if (settingsView === 'upload_image') {
    return (
      <div className="settings-page">
        <button className="btn btn-sm settings-back-btn" onClick={() => setSettingsView('list')}>
          &larr; Back to Settings
        </button>
        <ImageUploader
          onSaved={() => { setSettingsView('list'); loadClips() }}
          onCancel={() => setSettingsView('list')}
        />
      </div>
    )
  }

  if (settingsView === 'upload_tab') {
    return (
      <div className="settings-page">
        <button className="btn btn-sm settings-back-btn" onClick={() => setSettingsView('list')}>
          &larr; Back to Settings
        </button>
        <TabCropper
          onSaved={() => { setSettingsView('list'); loadClips() }}
          onCancel={() => setSettingsView('list')}
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

  return (
    <div className="settings-page" data-tour="settings-page">
      <h1 className="settings-title">Settings</h1>

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

      {/* Teaching Media — only visible when logged in as Teacher */}
      {isTeacher && (
        <section className="settings-section" data-tour="settings-media">
          <div className="settings-section-header">
            <div>
              <h2 className="settings-section-title">Teaching Media</h2>
              <p className="settings-section-desc">
                Record demos, upload images, or add tablature. Students see these during practice.
              </p>
            </div>
          </div>

          <div className="settings-media-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setSettingsView('record_video')}>
              + Video
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setSettingsView('record_audio')}>
              + Audio
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setSettingsView('upload_image')}>
              + Image
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setSettingsView('upload_tab')}>
              + Tab
            </button>
          </div>

          {/* Display size settings */}
          {teacherConfig && <MediaDisplayConfig config={teacherConfig} />}

          {/* Storage usage */}
          {clipStorage && (
            <div className="teacher-clips-storage">
              <div className="teacher-clips-storage-bar">
                <div
                  className={`teacher-clips-storage-fill ${clipStorage.isNearLimit ? 'teacher-clips-storage-warn' : ''}`}
                  style={{ width: `${Math.min(100, (clipStorage.totalBytes / (500 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
              <span className="teacher-clips-storage-text">
                {(clipStorage.totalBytes / (1024 * 1024)).toFixed(1)} MB used · {clipStorage.clipCount} clip{clipStorage.clipCount !== 1 ? 's' : ''}
                {clipStorage.isNearLimit && ' — Approaching storage limit'}
              </span>
            </div>
          )}

          {teacherClips.length > 0 ? (
            <div className="teacher-clips-list">
              {teacherClips.map((clip) => {
                const skillName = clip.skillId ? SKILL_MAP.get(clip.skillId)?.name : null
                const isPlaying = clipPlayingId === clip.id
                return (
                  <div key={clip.id} className="teacher-clips-card">
                    <div className="teacher-clips-card-info">
                      <span className="teacher-clips-card-type">{clip.mediaType ?? 'video'}</span>
                      <span className="teacher-clips-card-title">{clip.title}</span>
                      <span className="teacher-clips-card-meta">
                        {clip.durationSeconds > 0 && <>{clip.durationSeconds.toFixed(0)}s · </>}
                        {skillName && <>{skillName} · </>}
                        {clip.rollPatternId && <>{clip.rollPatternId} · </>}
                        {new Date(clip.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="teacher-clips-card-actions">
                      {(clip.mediaType === 'video' || clip.mediaType === 'audio' || !clip.mediaType) && (
                        <button
                          className="btn btn-sm"
                          onClick={() => setClipPlayingId(isPlaying ? null : clip.id)}
                        >
                          {isPlaying ? '\u25A0 Stop' : '\u25B6 Play'}
                        </button>
                      )}
                      {(clip.mediaType === 'image' || clip.mediaType === 'tab_crop') && (
                        <button
                          className="btn btn-sm"
                          onClick={() => setClipPlayingId(isPlaying ? null : clip.id)}
                        >
                          {isPlaying ? 'Hide' : 'View'}
                        </button>
                      )}
                      {(clip.mediaType === 'video' || clip.mediaType === 'audio' || !clip.mediaType) && (
                        <button
                          className="btn btn-sm"
                          onClick={() => { setEditingClip(clip); setSettingsView('edit_clip') }}
                        >
                          Edit
                        </button>
                      )}
                      {confirmDeleteClipId === clip.id ? (
                        <span className="settings-student-confirm">
                          <button className="btn btn-sm settings-delete-btn" onClick={async () => { await deleteClip(clip.id); setConfirmDeleteClipId(null); loadClips() }}>
                            Confirm
                          </button>
                          <button className="btn btn-sm" onClick={() => setConfirmDeleteClipId(null)}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          className="btn btn-sm settings-delete-btn"
                          onClick={() => setConfirmDeleteClipId(clip.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {isPlaying && clipVideoUrls.has(clip.id) && (
                      <div className="teacher-clips-card-player">
                        {(clip.mediaType === 'video' || !clip.mediaType) && (
                          <video src={clipVideoUrls.get(clip.id)} controls autoPlay playsInline className="teacher-clips-card-video" />
                        )}
                        {clip.mediaType === 'audio' && (
                          <audio src={clipVideoUrls.get(clip.id)} controls autoPlay className="teacher-clips-card-audio" />
                        )}
                        {(clip.mediaType === 'image' || clip.mediaType === 'tab_crop') && (
                          <img src={clipVideoUrls.get(clip.id)} alt={clip.title} className="teacher-clips-card-image" />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="settings-empty">
              No teaching media yet. Use the buttons above to add videos, audio, images, or tabs.
            </div>
          )}
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

// ── Media Display Size Settings ──────────────────────────────────────────────

function MediaDisplayConfig({ config }: { config: import('../../db/db').TeacherConfig }) {
  const ds = config.mediaDisplay ?? {}
  const videoW = ds.videoThumbWidth ?? 216
  const tabW = ds.tabMaxWidth ?? 200
  const imgW = ds.imageMaxWidth ?? 0

  async function update(patch: Partial<MediaDisplaySettings>) {
    const updated = {
      ...config,
      mediaDisplay: { ...ds, ...patch },
    }
    await updateTeacherConfig(updated)
    useStore.setState({ teacherConfig: updated })
  }

  return (
    <div className="media-display-config">
      <h4 className="media-display-config-title">Display Sizes</h4>
      <div className="media-display-config-row">
        <label className="media-display-config-label">Video thumbnail</label>
        <input
          type="range"
          min={100}
          max={400}
          step={10}
          value={videoW}
          onChange={(e) => update({ videoThumbWidth: parseInt(e.target.value) })}
          className="media-display-config-slider"
        />
        <span className="media-display-config-value">{videoW}px</span>
      </div>
      <div className="media-display-config-row">
        <label className="media-display-config-label">Tab image</label>
        <input
          type="range"
          min={100}
          max={600}
          step={10}
          value={tabW}
          onChange={(e) => update({ tabMaxWidth: parseInt(e.target.value) })}
          className="media-display-config-slider"
        />
        <span className="media-display-config-value">{tabW}px</span>
      </div>
      <div className="media-display-config-row">
        <label className="media-display-config-label">Image</label>
        <input
          type="range"
          min={0}
          max={800}
          step={10}
          value={imgW}
          onChange={(e) => update({ imageMaxWidth: parseInt(e.target.value) })}
          className="media-display-config-slider"
        />
        <span className="media-display-config-value">{imgW === 0 ? 'Full' : `${imgW}px`}</span>
      </div>
    </div>
  )
}
