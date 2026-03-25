// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Admin Panel
// Database stats, user management, demo image overrides, data export/clear.
// Only visible to users with isAdmin flag.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { SKILLS, CATEGORIES } from '../../data/curriculum'
import type { UserProfile } from '../../db/db'

interface DbStats {
  users: number
  skillRecords: number
  sessions: number
  sessionItems: number
  recordings: number
  clips: number
  patterns: number
  achievements: number
}

export function AdminPanel() {
  const user = useStore((s) => s.user)
  const activeUserId = useStore((s) => s.activeUserId)
  const getAllUsersAction = useStore((s) => s.getAllUsers)
  const getDbStatsAction = useStore((s) => s.getDbStats)
  const clearUserDataAction = useStore((s) => s.clearUserData)
  const exportDataAction = useStore((s) => s.exportData)
  const setAdminStatusAction = useStore((s) => s.setAdminStatus)
  const skillImageOverrides = useStore((s) => s.skillImageOverrides)
  const setSkillImageOverride = useStore((s) => s.setSkillImageOverride)
  const removeSkillImageOverride = useStore((s) => s.removeSkillImageOverride)

  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [stats, setStats] = useState<DbStats | null>(null)
  const [confirmClearId, setConfirmClearId] = useState<string | null>(null)
  const [confirmResetDb, setConfirmResetDb] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  // Demo images state
  const [imageFilter, setImageFilter] = useState('')
  const [editingImageSkillId, setEditingImageSkillId] = useState<string | null>(null)
  const [editAlt, setEditAlt] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetSkillId, setUploadTargetSkillId] = useState<string | null>(null)

  async function loadData() {
    const [users, dbStats] = await Promise.all([
      getAllUsersAction(),
      getDbStatsAction(),
    ])
    setAllUsers(users)
    setStats(dbStats)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleExport() {
    try {
      const json = await exportDataAction()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `banjo-buddy-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('Exported successfully!')
      setTimeout(() => setExportStatus(null), 3000)
    } catch {
      setExportStatus('Export failed')
    }
  }

  async function handleClearUserData(userId: string) {
    await clearUserDataAction(userId)
    setConfirmClearId(null)
    loadData()
  }

  async function handleToggleAdmin(userId: string, currentStatus: boolean) {
    await setAdminStatusAction(userId, !currentStatus)
    loadData()
  }

  async function handleDeactivateAdmin() {
    const userId = activeUserId ?? user?.id
    if (userId) {
      await setAdminStatusAction(userId, false)
    }
  }

  // Demo image handlers
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingSkillId, setUploadingSkillId] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetSkillId) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    const skill = SKILLS.find((s) => s.id === uploadTargetSkillId)
    const defaultAlt = skill?.image?.alt ?? `${skill?.name ?? 'Skill'} demonstration`
    const defaultCaption = skill?.image?.caption ?? null

    setUploadError(null)
    setUploadingSkillId(uploadTargetSkillId)

    try {
      await setSkillImageOverride(
        uploadTargetSkillId,
        file,
        defaultAlt,
        defaultCaption,
        file.type,
      )
      setUploadError('v2: Image saved successfully')
    } catch (err: any) {
      console.error('[Admin] Image upload failed:', err)
      setUploadError('ERROR: ' + (err?.message ?? 'Upload failed'))
    } finally {
      setUploadingSkillId(null)
      setUploadTargetSkillId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function startUpload(skillId: string) {
    setUploadTargetSkillId(skillId)
    fileInputRef.current?.click()
  }

  function startEdit(skillId: string) {
    const override = skillImageOverrides.get(skillId)
    const skill = SKILLS.find((s) => s.id === skillId)
    setEditingImageSkillId(skillId)
    setEditAlt(override?.alt ?? skill?.image?.alt ?? '')
    setEditCaption(override?.caption ?? skill?.image?.caption ?? '')
  }

  async function saveEdit() {
    if (!editingImageSkillId) return
    const override = skillImageOverrides.get(editingImageSkillId)
    if (override) {
      // Update metadata only — no re-upload needed
      const { putSkillImageOverride } = await import('../../db/db')
      const updated = { ...override, alt: editAlt, caption: editCaption || null, updatedAt: new Date().toISOString() }
      await putSkillImageOverride(updated)
      const { enqueueSync } = await import('../../db/sync')
      enqueueSync('skillImageOverrides', editingImageSkillId, 'upsert', updated as any)
      const overrides = new Map(skillImageOverrides)
      overrides.set(editingImageSkillId, updated)
      useStore.setState({ skillImageOverrides: overrides })
    }
    setEditingImageSkillId(null)
  }

  async function handleRevert(skillId: string) {
    await removeSkillImageOverride(skillId)
    setConfirmRevertId(null)
  }

  // Filter and group skills
  const filteredSkills = useMemo(() => {
    const lower = imageFilter.toLowerCase()
    return SKILLS.filter((s) =>
      !lower || s.name.toLowerCase().includes(lower) || s.category.toLowerCase().includes(lower)
    )
  }, [imageFilter])

  const overrideCount = skillImageOverrides.size
  const staticCount = SKILLS.filter((s) => s.image).length

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="settings-section-title">Admin Panel</h2>
          <p className="settings-section-desc">
            Database statistics, user management, and data tools.
          </p>
        </div>
        <button className="btn btn-sm admin-close-btn" onClick={handleDeactivateAdmin}>
          Deactivate Admin
        </button>
      </div>

      {/* Database Stats */}
      {stats && (
        <div className="admin-stats">
          <h3 className="admin-stats-title">Database Stats</h3>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.users}</span>
              <span className="admin-stat-label">Users</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.sessions}</span>
              <span className="admin-stat-label">Sessions</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.sessionItems}</span>
              <span className="admin-stat-label">Items</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.skillRecords}</span>
              <span className="admin-stat-label">Skills</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.recordings}</span>
              <span className="admin-stat-label">Recordings</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.clips}</span>
              <span className="admin-stat-label">Clips</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.patterns}</span>
              <span className="admin-stat-label">Patterns</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.achievements}</span>
              <span className="admin-stat-label">Achievements</span>
            </div>
          </div>
        </div>
      )}

      {/* Demo Images */}
      <div className="admin-images">
        <h3 className="admin-images-title">
          Demo Images
          <span className="admin-images-count">{overrideCount} override{overrideCount !== 1 ? 's' : ''} · {staticCount} static</span>
        </h3>
        <input
          type="text"
          className="admin-images-filter"
          placeholder="Filter skills..."
          value={imageFilter}
          onChange={(e) => setImageFilter(e.target.value)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        {uploadError && (
          <div className="admin-images-error">{uploadError}</div>
        )}
        <div className="admin-images-list">
          {filteredSkills.map((skill) => {
            const override = skillImageOverrides.get(skill.id)
            const hasStatic = !!skill.image
            const hasOverride = !!override
            const status = hasOverride ? 'Override' : hasStatic ? 'Static' : 'None'
            const category = CATEGORIES.find((c) => c.id === skill.category)?.label ?? skill.category
            const isEditing = editingImageSkillId === skill.id

            return (
              <div key={skill.id} className="admin-image-row">
                <div className="admin-image-thumb-wrap">
                  {hasOverride ? (
                    <img src={override.imageUrl} alt={override.alt} className="admin-image-thumb" />
                  ) : hasStatic ? (
                    <img src={skill.image!.src} alt={skill.image!.alt} className="admin-image-thumb" />
                  ) : (
                    <div className="admin-image-thumb admin-image-thumb-empty" />
                  )}
                </div>
                <div className="admin-image-info">
                  <span className="admin-image-name">{skill.name}</span>
                  <span className="admin-image-meta">
                    {category}
                    <span className={`admin-image-status admin-image-status-${status.toLowerCase()}`}>{status}</span>
                  </span>
                </div>
                <div className="admin-image-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => startUpload(skill.id)}
                    disabled={uploadingSkillId === skill.id}
                  >
                    {uploadingSkillId === skill.id ? 'Uploading...' : hasOverride || hasStatic ? 'Replace' : 'Upload'}
                  </button>
                  {hasOverride && (
                    <button className="btn btn-sm" onClick={() => startEdit(skill.id)}>
                      Edit
                    </button>
                  )}
                  {hasOverride && (
                    confirmRevertId === skill.id ? (
                      <span className="settings-student-confirm">
                        <button className="btn btn-sm settings-delete-btn" onClick={() => handleRevert(skill.id)}>
                          Confirm
                        </button>
                        <button className="btn btn-sm" onClick={() => setConfirmRevertId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button className="btn btn-sm settings-delete-btn" onClick={() => setConfirmRevertId(skill.id)}>
                        {hasStatic ? 'Revert' : 'Remove'}
                      </button>
                    )
                  )}
                </div>
                {isEditing && (
                  <div className="admin-image-edit-form">
                    <label className="admin-image-edit-label">
                      Alt text
                      <input
                        type="text"
                        className="admin-image-edit-input"
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder="Image description"
                      />
                    </label>
                    <label className="admin-image-edit-label">
                      Caption
                      <input
                        type="text"
                        className="admin-image-edit-input"
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Optional caption"
                      />
                    </label>
                    <div className="admin-image-edit-actions">
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditingImageSkillId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* User Management */}
      <div className="admin-users">
        <h3 className="admin-users-title">All Users</h3>
        <div className="admin-users-list">
          {allUsers.map((u) => (
            <div key={u.id} className="admin-user-row">
              <div className="admin-user-info">
                <span className="admin-user-name">
                  {u.name}
                  {u.id === activeUserId && <span className="admin-user-you"> (you)</span>}
                </span>
                <span className="admin-user-meta">
                  {u.role} · {u.id === 'local' ? 'local' : u.id.slice(0, 8)} · {new Date(u.createdAt).toLocaleDateString()}
                  {u.isAdmin && ' · admin'}
                </span>
              </div>
              <div className="admin-user-actions">
                <button
                  className={`btn btn-sm ${u.isAdmin ? 'admin-demote-btn' : ''}`}
                  onClick={() => handleToggleAdmin(u.id, u.isAdmin === true)}
                  disabled={u.id === activeUserId}
                  title={u.id === activeUserId ? "Can't change own admin status" : ''}
                >
                  {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>
                {confirmClearId === u.id ? (
                  <span className="settings-student-confirm">
                    <button className="btn btn-sm settings-delete-btn" onClick={() => handleClearUserData(u.id)}>
                      Confirm Clear
                    </button>
                    <button className="btn btn-sm" onClick={() => setConfirmClearId(null)}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn btn-sm settings-delete-btn"
                    onClick={() => setConfirmClearId(u.id)}
                  >
                    Clear Data
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Tools */}
      <div className="admin-tools">
        <h3 className="admin-tools-title">Data Tools</h3>
        <div className="admin-tools-row">
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            Export All Data (JSON)
          </button>
          {exportStatus && <span className="admin-tools-status">{exportStatus}</span>}
        </div>
        <div className="admin-tools-row">
          {confirmResetDb ? (
            <span className="settings-student-confirm">
              <button
                className="btn btn-sm settings-delete-btn"
                onClick={async () => {
                  // Clear IndexedDB entirely
                  const { db: dexieDb } = await import('../../db/db')
                  await dexieDb.delete()
                  setConfirmResetDb(false)
                  window.location.reload()
                }}
              >
                Yes, Reset Everything
              </button>
              <button className="btn btn-sm" onClick={() => setConfirmResetDb(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button
              className="btn btn-sm settings-delete-btn"
              onClick={() => setConfirmResetDb(true)}
            >
              Reset Database
            </button>
          )}
          <span className="admin-tools-warning">
            Deletes all data and reloads the app. Cannot be undone.
          </span>
        </div>
      </div>
    </div>
  )
}
