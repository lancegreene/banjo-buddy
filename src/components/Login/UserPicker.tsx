// ─── UserPicker — Login screen: Guest, Teacher, or Student ──────────────────
import { useState } from 'react'
import { useStore } from '../../store/useStore'

export function UserPicker() {
  const students = useStore((s) => s.students)
  const loginAsGuest = useStore((s) => s.loginAsGuest)
  const loginAsTeacher = useStore((s) => s.loginAsTeacher)
  const loginAsUser = useStore((s) => s.loginAsUser)
  const deleteStudent = useStore((s) => s.deleteStudent)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="user-picker-backdrop">
      <div className="user-picker">
        <h2 className="user-picker-title">Who's practicing?</h2>

        <div className="user-picker-grid">
          {/* Guest card */}
          <button
            className="user-picker-card"
            onClick={() => loginAsGuest()}
          >
            <span className="user-picker-avatar user-picker-avatar-guest">G</span>
            <span className="user-picker-name">Guest</span>
            <span className="user-picker-role">Solo Practice</span>
          </button>

          {/* Teacher card */}
          <button
            className="user-picker-card user-picker-card-teacher"
            onClick={() => loginAsTeacher()}
          >
            <span className="user-picker-avatar">T</span>
            <span className="user-picker-name">Teacher</span>
            <span className="user-picker-role">Manage Students</span>
          </button>

          {/* Student cards */}
          {students.map((student) => (
            <div key={student.id} className="user-picker-card-wrap">
              <button
                className="user-picker-card"
                onClick={() => loginAsUser(student.id)}
              >
                <span className="user-picker-avatar">
                  {student.name.charAt(0).toUpperCase()}
                </span>
                <span className="user-picker-name">{student.name}</span>
                <span className="user-picker-role">Student</span>
              </button>

              {confirmDelete === student.id ? (
                <div className="user-picker-confirm">
                  <span>Delete {student.name}?</span>
                  <button className="btn btn-sm user-picker-confirm-yes" onClick={async () => { await deleteStudent(student.id); setConfirmDelete(null) }}>
                    Yes
                  </button>
                  <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="user-picker-delete"
                  onClick={() => setConfirmDelete(student.id)}
                  title="Remove student"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        {students.length > 0 && (
          <p className="user-picker-hint">
            Students are created by the Teacher. Log in as Teacher to add or manage students.
          </p>
        )}
      </div>
    </div>
  )
}
