// ─── UserPicker — Login screen: Guest, Students, Teachers (with students) ────
import { useState } from 'react'
import { useStore } from '../../store/useStore'

export function UserPicker() {
  const teachers = useStore((s) => s.teachers)
  const students = useStore((s) => s.students)
  const standaloneStudents = useStore((s) => s.standaloneStudents)
  const loginAsGuest = useStore((s) => s.loginAsGuest)
  const loginAsTeacher = useStore((s) => s.loginAsTeacher)
  const loginAsUser = useStore((s) => s.loginAsUser)
  const createTeacher = useStore((s) => s.createTeacher)
  const deleteTeacher = useStore((s) => s.deleteTeacher)
  const addStandaloneStudent = useStore((s) => s.addStandaloneStudent)
  const deleteStandaloneStudent = useStore((s) => s.deleteStandaloneStudent)

  const [newTeacherName, setNewTeacherName] = useState('')
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleAddTeacher() {
    const trimmed = newTeacherName.trim()
    if (!trimmed) return
    await createTeacher(trimmed)
    setNewTeacherName('')
    setShowAddTeacher(false)
  }

  async function handleAddStudent() {
    const trimmed = newStudentName.trim()
    if (!trimmed) return
    await addStandaloneStudent(trimmed)
    setNewStudentName('')
    setShowAddStudent(false)
  }

  // Group teacher-assigned students by teacherId
  const studentsByTeacher = new Map<string, typeof students>()
  for (const s of students) {
    if (s.teacherId) {
      const arr = studentsByTeacher.get(s.teacherId) ?? []
      arr.push(s)
      studentsByTeacher.set(s.teacherId, arr)
    }
  }

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

          {/* Standalone student cards */}
          {standaloneStudents.map((student) => (
            <div key={student.id} className="user-picker-card-wrapper">
              <button
                className="user-picker-card"
                onClick={() => loginAsUser(student.id)}
              >
                <span className="user-picker-avatar user-picker-avatar-student">
                  {student.name.charAt(0).toUpperCase()}
                </span>
                <span className="user-picker-name">{student.name}</span>
                <span className="user-picker-role">Student</span>
              </button>

              {confirmDeleteId === student.id ? (
                <div className="user-picker-confirm user-picker-confirm-inline">
                  <span>Remove?</span>
                  <button
                    className="btn btn-sm user-picker-confirm-yes"
                    onClick={async () => { await deleteStandaloneStudent(student.id); setConfirmDeleteId(null) }}
                  >
                    Yes
                  </button>
                  <button className="btn btn-sm" onClick={() => setConfirmDeleteId(null)}>
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="user-picker-delete user-picker-delete-student"
                  onClick={() => setConfirmDeleteId(student.id)}
                  title="Remove student"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Teacher groups */}
        {teachers.map((teacher) => {
          const teacherStudents = studentsByTeacher.get(teacher.id) ?? []
          return (
            <div key={teacher.id} className="user-picker-teacher-group">
              <div className="user-picker-teacher-header">
                <button
                  className="user-picker-card user-picker-card-teacher"
                  onClick={() => loginAsTeacher(teacher.id)}
                >
                  <span className="user-picker-avatar">
                    {teacher.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="user-picker-name">{teacher.name}</span>
                  <span className="user-picker-role">Teacher</span>
                </button>

                {confirmDeleteId === teacher.id ? (
                  <div className="user-picker-confirm">
                    <span>Remove {teacher.name}?</span>
                    <button
                      className="btn btn-sm user-picker-confirm-yes"
                      onClick={async () => { await deleteTeacher(teacher.id); setConfirmDeleteId(null) }}
                    >
                      Yes
                    </button>
                    <button className="btn btn-sm" onClick={() => setConfirmDeleteId(null)}>
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="user-picker-delete"
                    onClick={() => setConfirmDeleteId(teacher.id)}
                    title="Remove teacher and all their students"
                  >
                    &times;
                  </button>
                )}
              </div>

              {teacherStudents.length > 0 && (
                <div className="user-picker-student-list">
                  {teacherStudents.map((student) => (
                    <button
                      key={student.id}
                      className="user-picker-card user-picker-card-student"
                      onClick={() => loginAsUser(student.id)}
                    >
                      <span className="user-picker-avatar user-picker-avatar-student">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="user-picker-name">{student.name}</span>
                      <span className="user-picker-role">Student</span>
                    </button>
                  ))}
                </div>
              )}

              {teacherStudents.length === 0 && (
                <p className="user-picker-hint">
                  No students yet. Log in as {teacher.name} to add students.
                </p>
              )}
            </div>
          )
        })}

        {/* Add Student / Add Teacher */}
        <div className="user-picker-add-section">
          {showAddStudent ? (
            <div className="user-picker-add-form">
              <input
                type="text"
                className="user-picker-add-input"
                placeholder="Student name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                autoFocus
              />
              <button className="btn btn-sm btn-primary" onClick={handleAddStudent}>
                Add
              </button>
              <button className="btn btn-sm" onClick={() => { setShowAddStudent(false); setNewStudentName('') }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm user-picker-add-teacher-btn"
              onClick={() => setShowAddStudent(true)}
            >
              + Add Student
            </button>
          )}

          {showAddTeacher ? (
            <div className="user-picker-add-form">
              <input
                type="text"
                className="user-picker-add-input"
                placeholder="Teacher name"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeacher()}
                autoFocus
              />
              <button className="btn btn-sm btn-primary" onClick={handleAddTeacher}>
                Add
              </button>
              <button className="btn btn-sm" onClick={() => { setShowAddTeacher(false); setNewTeacherName('') }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm user-picker-add-teacher-btn"
              onClick={() => setShowAddTeacher(true)}
            >
              + Add Teacher
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
