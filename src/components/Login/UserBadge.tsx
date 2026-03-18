// ─── UserBadge — Shows current user + switch/theme controls ──────────────────
import { useState } from 'react'
import { useStore } from '../../store/useStore'

const ROLE_LABELS: Record<string, string> = {
  solo: 'Guest',
  teacher: 'Teacher',
  student: 'Student',
}

interface Props {
  theme: string
  onToggleTheme: () => void
}

export function UserBadge({ theme, onToggleTheme }: Props) {
  const user = useStore((s) => s.user)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const logoutUser = useStore((s) => s.logoutUser)
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div className="user-badge-wrap">
      <button className="user-badge" onClick={() => setOpen(!open)} title="Account menu">
        <span className="user-badge-avatar">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </button>

      {open && (
        <>
          <div className="user-badge-backdrop" onClick={() => setOpen(false)} />
          <div className="user-badge-menu">
            <div className="user-badge-menu-header">
              <span className="user-badge-menu-name">{user.name}</span>
              <span className="user-badge-menu-role">{ROLE_LABELS[activeUserRole] ?? activeUserRole}</span>
            </div>
            <div className="user-badge-menu-divider" />
            <button className="user-badge-menu-item" onClick={() => { onToggleTheme(); }}>
              {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
            </button>
            <button className="user-badge-menu-item" onClick={() => { setOpen(false); logoutUser(); }}>
              ⇄ Switch user
            </button>
          </div>
        </>
      )}
    </div>
  )
}
