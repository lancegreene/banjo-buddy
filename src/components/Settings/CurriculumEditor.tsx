// ─── CurriculumEditor — Toggle skills on/off for students ───────────────────
import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { getAllSkills, CATEGORIES, type SkillCategory } from '../../data/curriculum'
import { getAffectedDependents } from '../../engine/teacherMode'

export function CurriculumEditor() {
  const user = useStore((s) => s.user)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const toggleSkillEnabled = useStore((s) => s.toggleSkillEnabled)

  const [search, setSearch] = useState('')
  const [warningSkillId, setWarningSkillId] = useState<string | null>(null)
  const searchLower = search.toLowerCase().trim()

  const allSkills = useMemo(() => getAllSkills(), [])

  const categories = useMemo(() => {
    const pathSkills = allSkills
    return CATEGORIES
      .map(({ id, label }) => ({
        id,
        label,
        skills: pathSkills
          .filter((s) => s.category === id)
          .sort((a, b) => a.month - b.month || (a.week ?? 99) - (b.week ?? 99)),
      }))
      .filter((cat) => cat.skills.length > 0)
  }, [allSkills])

  if (!user) return null

  function handleToggle(skillId: string) {
    const isCurrentlyEnabled = !disabledSkillIds.has(skillId)
    if (isCurrentlyEnabled) {
      // About to disable — check for dependents that are still enabled
      const dependents = getAffectedDependents(skillId, allSkills)
        .filter((s) => !disabledSkillIds.has(s.id))
      if (dependents.length > 0) {
        setWarningSkillId(skillId)
        return
      }
    }
    setWarningSkillId(null)
    toggleSkillEnabled(skillId)
  }

  function confirmDisable(skillId: string) {
    setWarningSkillId(null)
    toggleSkillEnabled(skillId)
  }

  function handleToggleCategory(catId: SkillCategory, enable: boolean) {
    const catSkills = allSkills.filter((s) => s.category === catId)
    for (const skill of catSkills) {
      const isDisabled = disabledSkillIds.has(skill.id)
      if (enable && isDisabled) {
        toggleSkillEnabled(skill.id)
      } else if (!enable && !isDisabled) {
        toggleSkillEnabled(skill.id)
      }
    }
  }

  const warningDependents = warningSkillId
    ? getAffectedDependents(warningSkillId, allSkills).filter((s) => !disabledSkillIds.has(s.id))
    : []

  return (
    <div className="curriculum-editor">
      <h2 className="curriculum-editor-title">Curriculum Editor</h2>
      <p className="curriculum-editor-desc">
        Toggle skills off to hide them from students. Disabled prerequisites are auto-met so students aren't blocked.
      </p>

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

        const enabledCount = filtered.filter((s) => !disabledSkillIds.has(s.id)).length
        const allEnabled = enabledCount === filtered.length
        const noneEnabled = enabledCount === 0

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
              {filtered.map((skill) => {
                const isDisabled = disabledSkillIds.has(skill.id)
                return (
                  <label
                    key={skill.id}
                    className={`curriculum-skill-row ${isDisabled ? 'curriculum-skill-disabled' : ''}`}
                  >
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
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
