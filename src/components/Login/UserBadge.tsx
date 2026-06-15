// ─── UserBadge — Shows current user avatar + account menu ─────────────────────
//
// Phase 0 placeholder: the "Profile" navigation target was removed when the
// Page union was narrowed in Task 0.4. The badge still renders the avatar
// and sign-out actions; profile navigation will return in Phase 1.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../db/supabase'
import { stopAutoSync } from '../../db/sync'

interface Props {
  theme: string
  onToggleTheme: () => void
}

export function UserBadge({ theme, onToggleTheme }: Props) {
  const user = useStore((s) => s.user)
  const authUserName = useStore((s) => s.authUserName)
  const authUserEmail = useStore((s) => s.authUserEmail)
  const [open, setOpen] = useState(false)

  if (!user) return null

  const displayName = authUserName || authUserEmail || user.name || 'Guest'
  const initial = displayName.charAt(0).toUpperCase()
  const isAuthed = !!authUserEmail

  async function handleSignOut() {
    setOpen(false)
    stopAutoSync()
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    useStore.getState().setAuthUser(null, null)
    localStorage.removeItem('banjo-buddy-auth-skipped')
    localStorage.removeItem('banjo-buddy-data-migrated')
    localStorage.removeItem('banjo-buddy-preferred-role')
    window.location.reload()
  }

  return (
    <div className="user-badge-wrap" data-tour="user-badge">
      <button className="user-badge" onClick={() => setOpen(!open)} title="Account menu">
        <span className="user-badge-avatar">
          {initial}
        </span>
      </button>

      {open && (
        <>
          <div className="user-badge-backdrop" onClick={() => setOpen(false)} />
          <div className="user-badge-menu">
            <div className="user-badge-menu-header">
              <span className="user-badge-menu-name">{displayName}</span>
              {authUserEmail && <span className="user-badge-menu-role">{authUserEmail}</span>}
              {!isAuthed && <span className="user-badge-menu-role">Local account</span>}
            </div>
            <div className="user-badge-menu-divider" />
            <button className="user-badge-menu-item" onClick={() => { onToggleTheme(); }}>
              {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
            </button>
            {isAuthed ? (
              <button className="user-badge-menu-item user-badge-menu-signout" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <button className="user-badge-menu-item" onClick={() => {
                setOpen(false)
                localStorage.removeItem('banjo-buddy-auth-skipped')
                window.location.reload()
              }}>
                Sign in
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
