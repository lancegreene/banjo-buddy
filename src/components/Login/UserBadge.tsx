// ─── UserBadge — Shows current user + switch button ─────────────────────────
import { useStore } from '../../store/useStore'

export function UserBadge() {
  const user = useStore((s) => s.user)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const logoutUser = useStore((s) => s.logoutUser)

  if (!user) return null

  return (
    <div className="user-badge">
      <span className="user-badge-avatar">
        {user.name.charAt(0).toUpperCase()}
      </span>
      <span className="user-badge-name">{user.name}</span>
      <span className="user-badge-role">{activeUserRole === 'teacher' ? 'Teacher' : 'Student'}</span>
      <button className="user-badge-switch" onClick={logoutUser} title="Switch user">
        Switch
      </button>
    </div>
  )
}
