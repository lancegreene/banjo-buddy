// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Admin Panel
// Database stats, user management, data export/clear tools.
// Only visible to users with isAdmin flag.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
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

  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [stats, setStats] = useState<DbStats | null>(null)
  const [confirmClearId, setConfirmClearId] = useState<string | null>(null)
  const [confirmResetDb, setConfirmResetDb] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

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
