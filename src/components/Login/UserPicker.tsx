// ─── UserPicker — Login screen ───────────────────────────────────────────────
//
// Phase 0 placeholder: the previous teacher/student picker depended on store
// slices that were removed in Task 0.4 (teachers, students, loginAsTeacher,
// etc.). For now this is a single "Continue as Guest" card. Multi-user
// login is on the back-burner until/unless the coach needs it.
import { useStore } from '../../store/useStore'

export function UserPicker() {
  const user = useStore((s) => s.user)

  function handleGuest() {
    // The store auto-loads the local user on app start; this button just
    // dismisses the login screen.
    useStore.setState({ showLoginScreen: false })
  }

  return (
    <div className="user-picker-backdrop">
      <div className="user-picker">
        <h2 className="user-picker-title">Welcome back</h2>
        <div className="user-picker-grid">
          <button className="user-picker-card" onClick={handleGuest}>
            <span className="user-picker-avatar user-picker-avatar-guest">G</span>
            <span className="user-picker-name">{user?.name ?? 'Guest'}</span>
            <span className="user-picker-role">Solo Practice</span>
          </button>
        </div>
      </div>
    </div>
  )
}
