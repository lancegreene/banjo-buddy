// ─── CurriculumEditor — Toggle skills on/off, reorder via drag-and-drop ──────
import { useState, useMemo, useRef, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { getAllSkills, CATEGORIES, type SkillCategory, type Skill } from '../../data/curriculum'
import { getAffectedDependents } from '../../engine/teacherMode'
import { updateTeacherConfig } from '../../db/db'
import type { TeacherConfig } from '../../db/db'

interface DraftState {
  disabledIds: Set<string>
  skillOrder: { [category: string]: string[] }
}

export function CurriculumEditor({ onExit }: { onExit: () => void }) {
  const user = useStore((s) => s.user)
  const teacherConfig = useStore((s) => s.teacherConfig)
  const students = useStore((s) => s.students)
  const getStudentDisabledSkills = useStore((s) => s.getStudentDisabledSkills)

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [warningSkillId, setWarningSkillId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const searchLower = search.toLowerCase().trim()

  const allSkills = useMemo(() => getAllSkills(), [])

  // ── Draft state (local, not persisted until Save) ──────────────────────────

  // Compute the initial disabled set from the persisted config
  const persistedDisabled = useMemo(() => {
    if (!teacherConfig) return new Set<string>()
    if (selectedStudentId) return getStudentDisabledSkills(selectedStudentId)
    return new Set(teacherConfig.disabledSkillIds)
  }, [teacherConfig, selectedStudentId, getStudentDisabledSkills])

  const persistedOrder = teacherConfig?.skillOrder ?? {}

  const [draft, setDraft] = useState<DraftState>(() => ({
    disabledIds: new Set(persistedDisabled),
    skillOrder: { ...persistedOrder },
  }))

  // Reset draft when switching students
  function handleStudentChange(studentId: string | null) {
    setSelectedStudentId(studentId)
    setWarningSkillId(null)
    const newDisabled = (() => {
      if (!teacherConfig) return new Set<string>()
      if (studentId) {
        const overrideList = teacherConfig.studentOverrides?.[studentId]
        return new Set(overrideList ?? teacherConfig.disabledSkillIds)
      }
      return new Set(teacherConfig.disabledSkillIds)
    })()
    setDraft({ disabledIds: newDisabled, skillOrder: { ...persistedOrder } })
  }

  // Check if draft differs from persisted
  const hasChanges = useMemo(() => {
    // Check disabled changes
    if (draft.disabledIds.size !== persistedDisabled.size) return true
    for (const id of draft.disabledIds) {
      if (!persistedDisabled.has(id)) return true
    }
    // Check order changes
    for (const cat of Object.keys(draft.skillOrder)) {
      const persisted = persistedOrder[cat]
      const current = draft.skillOrder[cat]
      if (!persisted && current) return true
      if (persisted && !current) return true
      if (persisted && current && (persisted.length !== current.length || persisted.some((id, i) => id !== current[i]))) return true
    }
    return false
  }, [draft, persistedDisabled, persistedOrder])

  const hasStudentOverride = selectedStudentId
    ? teacherConfig?.studentOverrides?.[selectedStudentId] != null
    : false

  // Sort skills within a category using custom order if available
  const sortSkills = useCallback((skills: Skill[], catId: string) => {
    const order = draft.skillOrder[catId]
    if (!order) return skills.sort((a, b) => a.month - b.month || (a.week ?? 99) - (b.week ?? 99))
    const orderMap = new Map(order.map((id, i) => [id, i]))
    return [...skills].sort((a, b) => {
      const ai = orderMap.get(a.id)
      const bi = orderMap.get(b.id)
      if (ai !== undefined && bi !== undefined) return ai - bi
      if (ai !== undefined) return -1
      if (bi !== undefined) return 1
      return a.month - b.month || (a.week ?? 99) - (b.week ?? 99)
    })
  }, [draft.skillOrder])

  const categories = useMemo(() => {
    return CATEGORIES
      .map(({ id, label }) => ({
        id,
        label,
        skills: sortSkills(allSkills.filter((s) => s.category === id), id),
      }))
      .filter((cat) => cat.skills.length > 0)
  }, [allSkills, sortSkills])

  if (!user) return null

  // ── Toggle handlers (modify draft, not DB) ────────────────────────────────

  function handleToggle(skillId: string) {
    const isCurrentlyEnabled = !draft.disabledIds.has(skillId)
    if (isCurrentlyEnabled) {
      const dependents = getAffectedDependents(skillId, allSkills)
        .filter((s) => !draft.disabledIds.has(s.id))
      if (dependents.length > 0) {
        setWarningSkillId(skillId)
        return
      }
    }
    setWarningSkillId(null)
    const next = new Set(draft.disabledIds)
    if (next.has(skillId)) next.delete(skillId)
    else next.add(skillId)
    setDraft({ ...draft, disabledIds: next })
  }

  function confirmDisable(skillId: string) {
    setWarningSkillId(null)
    const next = new Set(draft.disabledIds)
    next.add(skillId)
    setDraft({ ...draft, disabledIds: next })
  }

  function handleToggleCategory(catId: SkillCategory, enable: boolean) {
    const catSkills = allSkills.filter((s) => s.category === catId)
    const next = new Set(draft.disabledIds)
    for (const skill of catSkills) {
      if (enable) next.delete(skill.id)
      else next.add(skill.id)
    }
    setDraft({ ...draft, disabledIds: next })
  }

  // ── Drag-and-drop reordering ──────────────────────────────────────────────

  const dragItem = useRef<{ catId: string; index: number } | null>(null)

  function handleDragStart(catId: string, index: number) {
    dragItem.current = { catId, index }
  }

  function handleDragEnter(catId: string, index: number) {
    if (!dragItem.current) return
    if (dragItem.current.catId !== catId) return // no cross-category
    if (dragItem.current.index === index) return // same position

    const cat = categories.find((c) => c.id === catId)
    if (!cat) return

    const ids = cat.skills.map((s) => s.id)
    const [moved] = ids.splice(dragItem.current.index, 1)
    ids.splice(index, 0, moved)

    setDraft((prev) => ({
      ...prev,
      skillOrder: { ...prev.skillOrder, [catId]: ids },
    }))

    dragItem.current = { catId, index }
  }

  function handleDragEnd() {
    dragItem.current = null
  }

  // ── Save / Discard ────────────────────────────────────────────────────────

  async function handleSave() {
    if (!teacherConfig) return
    setSaving(true)

    const updated: TeacherConfig = { ...teacherConfig }

    if (selectedStudentId) {
      const overrides = { ...updated.studentOverrides }
      overrides[selectedStudentId] = [...draft.disabledIds]
      updated.studentOverrides = overrides
    } else {
      updated.disabledSkillIds = [...draft.disabledIds]
    }

    // Save skill order (applies globally, not per-student)
    updated.skillOrder = draft.skillOrder

    await updateTeacherConfig(updated)
    useStore.setState({ teacherConfig: updated })

    // Update the store's disabledSkillIds if editing the global default
    if (!selectedStudentId) {
      useStore.setState({ disabledSkillIds: draft.disabledIds })
      useStore.getState().refreshSessionPlan()
    }

    setSaving(false)
  }

  function handleDiscard() {
    setDraft({
      disabledIds: new Set(persistedDisabled),
      skillOrder: { ...persistedOrder },
    })
    setWarningSkillId(null)
  }

  function handleExit() {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard and exit?')) return
    }
    onExit()
  }

  function resetToDefault() {
    if (!selectedStudentId || !teacherConfig) return
    const overrides = { ...teacherConfig.studentOverrides }
    delete overrides[selectedStudentId]
    const updated = { ...teacherConfig, studentOverrides: overrides }
    updateTeacherConfig(updated)
    useStore.setState({ teacherConfig: updated })
    // Reset draft to global defaults
    setDraft({
      disabledIds: new Set(updated.disabledSkillIds),
      skillOrder: { ...persistedOrder },
    })
  }

  const warningDependents = warningSkillId
    ? getAffectedDependents(warningSkillId, allSkills).filter((s) => !draft.disabledIds.has(s.id))
    : []

  const selectedStudentName = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)?.name ?? 'Student'
    : null

  return (
    <div className="curriculum-editor">
      <div className="curriculum-editor-top-bar">
        <button className="btn btn-sm settings-back-btn" onClick={handleExit}>
          &larr; Back to Settings
        </button>
        <h2 className="curriculum-editor-title">Curriculum Editor</h2>
        {hasChanges && (
          <div className="curriculum-editor-save-bar">
            <span className="curriculum-editor-unsaved">Unsaved changes</span>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-sm" onClick={handleDiscard}>Discard</button>
          </div>
        )}
      </div>

      <p className="curriculum-editor-desc">
        {selectedStudentId
          ? <>Editing curriculum for <strong>{selectedStudentName}</strong>. {hasStudentOverride ? 'This student has a custom curriculum.' : 'Using default curriculum.'}</>
          : 'Edit the default curriculum for all students. Drag skills to reorder within a category.'
        }
      </p>

      {/* Student selector */}
      {students.length > 0 && (
        <div className="curriculum-student-selector">
          <label className="curriculum-student-label">Editing for:</label>
          <select
            className="curriculum-student-select"
            value={selectedStudentId ?? ''}
            onChange={(e) => handleStudentChange(e.target.value || null)}
          >
            <option value="">All Students (Default)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{teacherConfig?.studentOverrides?.[s.id] ? ' (custom)' : ''}
              </option>
            ))}
          </select>
          {selectedStudentId && hasStudentOverride && (
            <button className="btn btn-sm curriculum-reset-btn" onClick={resetToDefault}>
              Reset to Default
            </button>
          )}
        </div>
      )}

      <input
        className="sidebar-search"
        type="text"
        placeholder="Search skills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Warning modal */}
      {warningSkillId && warningDependents.length > 0 && (
        <div className="curriculum-warning">
          <p>Disabling this skill will affect these dependent skills (their prerequisite will be auto-met):</p>
          <ul>
            {warningDependents.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
          <div className="curriculum-warning-actions">
            <button className="btn btn-sm btn-primary" onClick={() => confirmDisable(warningSkillId)}>
              Disable Anyway
            </button>
            <button className="btn btn-sm" onClick={() => setWarningSkillId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.map(({ id, label, skills }) => {
        const filtered = searchLower
          ? skills.filter((s) => s.name.toLowerCase().includes(searchLower))
          : skills
        if (filtered.length === 0) return null

        const enabledCount = filtered.filter((s) => !draft.disabledIds.has(s.id)).length
        const allEnabled = enabledCount === filtered.length
        const noneEnabled = enabledCount === 0
        const isDraggable = !searchLower // disable drag when searching

        return (
          <div key={id} className="curriculum-category">
            <div className="curriculum-category-header">
              <span className="curriculum-category-label">{label}</span>
              <span className="curriculum-category-count">{enabledCount}/{filtered.length} enabled</span>
              <button
                className="btn btn-sm curriculum-bulk-toggle"
                onClick={() => handleToggleCategory(id, noneEnabled || !allEnabled)}
              >
                {allEnabled ? 'Disable All' : 'Enable All'}
              </button>
            </div>

            <div className="curriculum-skill-list">
              {filtered.map((skill, idx) => {
                const isDisabled = draft.disabledIds.has(skill.id)
                return (
                  <div
                    key={skill.id}
                    className={`curriculum-skill-row ${isDisabled ? 'curriculum-skill-disabled' : ''} ${isDraggable ? 'curriculum-skill-draggable' : ''}`}
                    draggable={isDraggable}
                    onDragStart={() => handleDragStart(id, idx)}
                    onDragEnter={() => handleDragEnter(id, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {isDraggable && <span className="curriculum-skill-grip">{'\u2630'}</span>}
                    <label className="curriculum-skill-label">
                      <input
                        type="checkbox"
                        checked={!isDisabled}
                        onChange={() => handleToggle(skill.id)}
                      />
                      <span className="curriculum-skill-name">{skill.name}</span>
                      {skill.progressBpm && (
                        <span className="curriculum-skill-bpm">{skill.progressBpm} BPM</span>
                      )}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Bottom save bar (when scrolled) */}
      {hasChanges && (
        <div className="curriculum-editor-bottom-bar">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn btn-secondary" onClick={handleDiscard}>Discard</button>
        </div>
      )}
    </div>
  )
}
