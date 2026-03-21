import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { getAllSkills, SKILL_MAP, CATEGORIES, type Skill, type SkillCategory } from '../../data/curriculum'
import { evaluateSkillStatus } from '../../engine/recommendationEngine'
import type { SkillStatus } from '../../db/db'
import { getEffectiveMastery, masteryLevelToLabel, MASTERY_COLORS } from '../../engine/masteryLevels'
import { isDueForReview as isFsrsDue } from '../../engine/fsrs'

const STATUS_LABELS: Record<SkillStatus, string> = {
  locked: 'Locked',
  unlocked: 'Ready to start',
  active: 'In progress',
  progressed: 'Progressed',
  mastered: 'Mastered',
}

const STATUS_COLORS: Record<SkillStatus, string> = {
  locked: '#ccc',
  unlocked: '#4a9eff',
  active: '#f5a623',
  progressed: '#7ed321',
  mastered: '#9b59b6',
}

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  setup: '#78909c',
  theory: '#7e57c2',
  rolls: '#26a69a',
  chords: '#ef5350',
  techniques: '#ff7043',
  licks: '#66bb6a',
  songs: '#42a5f5',
  performance: '#ffa726',
}

function SkillCard({ skill, isCurrent, compact, isSelected, onNavigateToSkill, isDisabledByTeacher }: {
  skill: Skill
  isCurrent: boolean
  compact?: boolean
  isSelected?: boolean
  onNavigateToSkill?: (skillId: string) => void
  isDisabledByTeacher?: boolean
}) {
  const skillRecords = useStore((s) => s.skillRecords)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const ref = useRef<HTMLDivElement>(null)
  const [showPrereqs, setShowPrereqs] = useState(false)

  const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
  const isTeacher = activeUserRole === 'teacher'
  const record = skillRecords.get(skill.id) ?? null
  const status = evaluateSkillStatus(skill, record, skillRecords, disabled, isTeacher)

  const isLocked = status === 'locked'

  // Build unmet prerequisites list for locked skills (skip disabled prereqs — they're auto-met)
  const unmetPrereqs = isLocked
    ? skill.prerequisites
        .filter((id) => {
          if (disabled.has(id)) return false
          const r = skillRecords.get(id)
          return !r || (r.practiceCount === 0 && r.status !== 'active' && r.status !== 'progressed' && r.status !== 'mastered')
        })
        .map((id) => ({ id, name: SKILL_MAP.get(id)?.name ?? id, status: evaluateSkillStatus(SKILL_MAP.get(id)!, skillRecords.get(id) ?? null, skillRecords, disabled, isTeacher) }))
    : []

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Auto-expand prereqs panel when navigated to a locked skill
      if (isLocked && unmetPrereqs.length > 0) {
        setShowPrereqs(true)
      }
    }
  }, [isCurrent])

  function handleClick() {
    practiceSkill(skill.id)
  }

  function handlePrereqToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setShowPrereqs((prev) => !prev)
  }

  function handlePrereqClick(prereqId: string) {
    practiceSkill(prereqId)
    if (onNavigateToSkill) {
      onNavigateToSkill(prereqId)
    }
    setShowPrereqs(false)
  }

  if (compact) {
    return (
      <div ref={ref} className={`skill-card-compact-wrap ${showPrereqs ? 'skill-card-prereqs-open' : ''}`}>
        <div
          className={`skill-card-compact skill-card-${status} skill-card-clickable ${isSelected ? 'skill-card-selected' : ''} ${isDisabledByTeacher ? 'skill-card-teacher-disabled' : ''}`}
          onClick={handleClick}
          title={`${isLocked ? '(Prereqs needed) ' : ''}${skill.name}`}
        >
          <span
            className="skill-status-dot"
            style={{ background: STATUS_COLORS[status] }}
          />
          <span className="skill-card-compact-name">{skill.name}</span>
          {skill.isInformational || skill.category === 'theory' || skill.category === 'setup'
            ? <span className="skill-type-badge skill-type-study">Study</span>
            : <span className="skill-type-badge skill-type-practice">Practice</span>
          }
          {record?.masteryLevel && (() => {
            const isOverdue = record.fsrsState ? (() => { try { return isFsrsDue(JSON.parse(record.fsrsState)); } catch { return false; } })() : false
            const effective = getEffectiveMastery(record.masteryLevel, isOverdue)
            return (
              <span
                className={`mastery-indicator mastery-indicator-${effective} ${isOverdue ? 'mastery-indicator-overdue' : ''}`}
              >
                {masteryLevelToLabel(effective)}
              </span>
            )
          })()}
          {skill.isMilestone && <span className="skill-milestone-badge">🎯</span>}
          {isDisabledByTeacher && <span className="skill-disabled-badge">disabled</span>}
          {isLocked && unmetPrereqs.length > 0 && (
            <span className="skill-prereq-toggle" onClick={handlePrereqToggle}>{showPrereqs ? '▾' : '▸'}</span>
          )}
        </div>

        {/* Prerequisite links panel */}
        {showPrereqs && unmetPrereqs.length > 0 && (
          <div className="skill-prereq-panel">
            <span className="skill-prereq-label">Complete first:</span>
            {unmetPrereqs.map((prereq) => (
              <button
                key={prereq.id}
                className={`skill-prereq-link skill-prereq-link-${prereq.status}`}
                onClick={() => handlePrereqClick(prereq.id)}
              >
                <span
                  className="skill-status-dot"
                  style={{ background: STATUS_COLORS[prereq.status] }}
                />
                <span className="skill-prereq-link-name">{prereq.name}</span>
                <span className="skill-prereq-link-arrow">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const bpmDisplay = record?.bestBpm
    ? `${record.bestBpm} BPM`
    : skill.progressBpm
    ? `Goal: ${skill.progressBpm} BPM`
    : null

  const catLabel = CATEGORIES.find((c) => c.id === skill.category)?.label ?? skill.category

  return (
    <div
      ref={ref}
      className={`skill-card skill-card-${status} skill-card-clickable ${isCurrent ? 'skill-card-current' : ''}`}
      onClick={handleClick}
      title={`${isLocked ? '(Prereqs needed) ' : ''}${skill.name}`}
    >
      {isCurrent && <div className="skill-card-here-badge">← Here</div>}
      <div className="skill-card-header">
        <span
          className="skill-status-dot"
          style={{ background: STATUS_COLORS[status] }}
          title={STATUS_LABELS[status]}
        />
        <span className="skill-card-name">{skill.name}</span>
        {skill.isMilestone && <span className="skill-milestone-badge">🎯</span>}
      </div>
      <span
        className="skill-category-badge"
        style={{ background: CATEGORY_COLORS[skill.category] }}
      >
        {catLabel}
      </span>
      {bpmDisplay && (
        <div className="skill-card-bpm">{bpmDisplay}</div>
      )}
      <div className="skill-card-status">{STATUS_LABELS[status]}</div>
      {record?.practiceCount ? (
        <div className="skill-card-count">{record.practiceCount} sessions</div>
      ) : null}
      {isPlayable && <div className="skill-card-practice-hint">Tap to practice →</div>}

      {/* Prerequisite links for locked full cards */}
      {showPrereqs && unmetPrereqs.length > 0 && (
        <div className="skill-prereq-panel">
          <span className="skill-prereq-label">Complete first:</span>
          {unmetPrereqs.map((prereq) => (
            <button
              key={prereq.id}
              className={`skill-prereq-link skill-prereq-link-${prereq.status}`}
              onClick={(e) => { e.stopPropagation(); handlePrereqClick(prereq.id) }}
            >
              <span
                className="skill-status-dot"
                style={{ background: STATUS_COLORS[prereq.status] }}
              />
              <span className="skill-prereq-link-name">{prereq.name}</span>
              <span className="skill-prereq-link-arrow">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SkillTree() {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const selectedSkillId = useStore((s) => s.selectedSkillId)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)

  // Find most recently practiced skill to highlight
  const currentSkillId = useMemo(() => {
    let bestId: string | null = null
    let latestTime = ''
    for (const [id, record] of skillRecords) {
      if (record.lastPracticed && record.lastPracticed > latestTime) {
        latestTime = record.lastPracticed
        bestId = id
      }
    }
    return bestId
  }, [skillRecords])

  // Determine which category the current skill belongs to
  const currentCategory = useMemo(() => {
    if (!currentSkillId) return CATEGORIES[0].id
    return SKILL_MAP.get(currentSkillId)?.category ?? CATEGORIES[0].id
  }, [currentSkillId])

  // Also auto-expand category of selected skill
  const selectedCategory = useMemo(() => {
    if (!selectedSkillId) return null
    return SKILL_MAP.get(selectedSkillId)?.category ?? null
  }, [selectedSkillId])

  // Group skills by category, filtered by user path + disabled skills
  const categories = useMemo(() => {
    if (!user) return []
    let pathSkills = getAllSkills().filter((s) => s.path === user.path || s.path === 'all')
    // Students don't see disabled skills; teachers see all
    if (activeUserRole === 'student') {
      pathSkills = pathSkills.filter((s) => !disabledSkillIds.has(s.id))
    }
    return CATEGORIES
      .map(({ id, label }) => ({
        id,
        label,
        skills: pathSkills
          .filter((s) => s.category === id)
          .sort((a, b) => a.month - b.month || (a.week ?? 99) - (b.week ?? 99)),
      }))
      .filter((cat) => cat.skills.length > 0)
  }, [user, skillRecords, activeUserRole, disabledSkillIds])

  // Categories start collapsed; current category starts open
  const [expandedCategories, setExpandedCategories] = useState<Set<SkillCategory>>(
    () => new Set([currentCategory])
  )

  // Auto-expand category when current skill changes
  useEffect(() => {
    setExpandedCategories((prev) => {
      if (prev.has(currentCategory)) return prev
      return new Set([...prev, currentCategory])
    })
  }, [currentCategory])

  // Auto-expand category of selected skill
  useEffect(() => {
    if (selectedCategory) {
      setExpandedCategories((prev) => {
        if (prev.has(selectedCategory)) return prev
        return new Set([...prev, selectedCategory])
      })
    }
  }, [selectedCategory])

  const toggleCategory = (catId: SkillCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const [search, setSearch] = useState('')
  const searchLower = search.toLowerCase().trim()

  // Track which skill ID to scroll to (set when navigating to a prereq)
  const [scrollToSkillId, setScrollToSkillId] = useState<string | null>(null)

  // Navigate to a skill: expand its category and scroll to it
  function handleNavigateToSkill(skillId: string) {
    const targetSkill = SKILL_MAP.get(skillId)
    if (!targetSkill) return

    // Expand the target skill's category
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.add(targetSkill.category)
      return next
    })

    // Trigger scroll after category expands
    setScrollToSkillId(skillId)
    // Clear after a short delay so the effect can re-trigger for repeated clicks
    setTimeout(() => setScrollToSkillId(null), 500)
  }

  if (!user) return null

  return (
    <div className="skill-tree-sidebar" data-tour="skill-tree-sidebar">
      <div className="skill-tree-header">
        <h2>Skills</h2>
      </div>
      <input
        className="sidebar-search"
        type="text"
        placeholder="Search skills…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Category sections */}
      {categories.map(({ id, label, skills: catSkills }, catIdx) => {
        const filtered = searchLower
          ? catSkills.filter((s) => s.name.toLowerCase().includes(searchLower))
          : catSkills
        if (filtered.length === 0) return null
        const isOpen = searchLower ? true : expandedCategories.has(id)
        const color = CATEGORY_COLORS[id]

        return (
          <div key={id} className={`skill-tree-category ${isOpen ? 'skill-tree-category-open' : ''}`} {...(catIdx === 0 ? { 'data-tour': 'skill-category-first' } : {})}>
            <div
              className="skill-category-header"
              style={{ borderLeftColor: color }}
              onClick={() => toggleCategory(id)}
            >
              <div className="skill-category-header-left">
                <span className="skill-category-toggle">{isOpen ? '▾' : '▸'}</span>
                <span className="skill-category-label" style={{ color }}>{label}</span>
              </div>
              <span className="skill-category-count">{filtered.length}</span>
            </div>

            {isOpen && (
              <div className="skill-category-content">
                <div className="skill-card-compact-list">
                  {filtered.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isCurrent={skill.id === currentSkillId || skill.id === scrollToSkillId}
                      compact
                      isSelected={skill.id === selectedSkillId}
                      onNavigateToSkill={handleNavigateToSkill}
                      isDisabledByTeacher={activeUserRole === 'teacher' && disabledSkillIds.has(skill.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
