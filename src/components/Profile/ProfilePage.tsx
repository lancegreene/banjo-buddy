// ─── ProfilePage — User profile and account settings ──────────────────────────
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../db/supabase'
import { stopAutoSync } from '../../db/sync'
import type { Path } from '../../data/curriculum'

const PATH_OPTIONS: { value: Path; label: string; desc: string }[] = [
  { value: 'newby', label: 'Newby', desc: 'Just getting started — learn the basics of Scruggs-style picking' },
  { value: 'beginner', label: 'Beginner', desc: 'Know the basics — ready for more patterns and techniques' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable with rolls — time for licks, songs, and speed' },
]

export function ProfilePage() {
  const user = useStore((s) => s.user)
  const authUserName = useStore((s) => s.authUserName)
  const authUserEmail = useStore((s) => s.authUserEmail)
  const setUserPath = useStore((s) => s.setUserPath)
  const streak = useStore((s) => s.streak)
  const skillRecords = useStore((s) => s.skillRecords)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(authUserName ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!user) return null

  const displayName = authUserName || authUserEmail || user.name || 'Guest'
  const isAuthed = !!authUserEmail

  // Skill stats
  const totalSkills = skillRecords.size
  const mastered = [...skillRecords.values()].filter(r => r.status === 'mastered').length
  const progressed = [...skillRecords.values()].filter(r => r.status === 'progressed').length
  const active = [...skillRecords.values()].filter(r => r.status === 'active').length

  async function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: trimmed },
      })
      if (error) throw error
      useStore.getState().setAuthUser(trimmed, authUserEmail)
      setEditingName(false)
      setMessage('Name updated!')
    } catch (err: any) {
      setMessage(err.message ?? 'Failed to update name')
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    stopAutoSync()
    useStore.getState().setAuthUser(null, null)
    localStorage.removeItem('banjo-buddy-auth-skipped')
    localStorage.removeItem('banjo-buddy-data-migrated')
    window.location.reload()
  }

  return (
    <div className="profile-page">
      <h1 className="profile-title">Profile</h1>

      {/* Avatar + name */}
      <div className="profile-header">
        <div className="profile-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          {editingName ? (
            <div className="profile-name-edit">
              <input
                type="text"
                className="profile-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button className="btn btn-sm btn-primary" onClick={handleSaveName} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-sm" onClick={() => { setEditingName(false); setNameInput(authUserName ?? '') }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="profile-name-row">
              <h2 className="profile-name">{displayName}</h2>
              {isAuthed && (
                <button className="btn btn-sm profile-edit-btn" onClick={() => { setEditingName(true); setNameInput(authUserName ?? '') }}>
                  Edit
                </button>
              )}
            </div>
          )}
          {authUserEmail && <p className="profile-email">{authUserEmail}</p>}
          {!isAuthed && <p className="profile-email">Local account — data saved on this device only</p>}
        </div>
      </div>

      {message && <div className="profile-message">{message}</div>}

      {/* Stats */}
      <section className="profile-section">
        <h3 className="profile-section-title">Stats</h3>
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-value">{streak}</span>
            <span className="profile-stat-label">Day streak</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{totalSkills}</span>
            <span className="profile-stat-label">Skills started</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{mastered}</span>
            <span className="profile-stat-label">Mastered</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{progressed}</span>
            <span className="profile-stat-label">Progressed</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{active}</span>
            <span className="profile-stat-label">Active</span>
          </div>
        </div>
      </section>

      {/* Learning Path */}
      <section className="profile-section">
        <h3 className="profile-section-title">Learning Path</h3>
        <div className="profile-paths">
          {PATH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`profile-path-card ${user.path === opt.value ? 'profile-path-active' : ''}`}
              onClick={() => setUserPath(opt.value)}
            >
              <span className="profile-path-name">{opt.label}</span>
              <span className="profile-path-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Account actions */}
      <section className="profile-section">
        <h3 className="profile-section-title">Account</h3>
        {isAuthed ? (
          <div className="profile-account-actions">
            <p className="profile-account-note">Signed in with {authUserEmail}. Your data syncs automatically.</p>
            <button className="btn btn-secondary profile-signout-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <div className="profile-account-actions">
            <p className="profile-account-note">
              You're using a local account. Sign in to sync your progress across devices.
            </p>
            <button className="btn btn-primary" onClick={() => {
              localStorage.removeItem('banjo-buddy-auth-skipped')
              window.location.reload()
            }}>
              Sign In / Create Account
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
