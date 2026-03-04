import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { SKILLS, type Skill } from '../../data/curriculum'
import { evaluateSkillStatus } from '../../engine/recommendationEngine'
import type { SkillStatus } from '../../db/db'

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

function SkillCard({ skill, isCurrent }: { skill: Skill; isCurrent: boolean }) {
  const skillRecords = useStore((s) => s.skillRecords)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const ref = useRef<HTMLDivElement>(null)

  const record = skillRecords.get(skill.id) ?? null
  const status = evaluateSkillStatus(skill, record, skillRecords)

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isCurrent])

  const bpmDisplay = record?.bestBpm
    ? `${record.bestBpm} BPM`
    : skill.progressBpm
    ? `Goal: ${skill.progressBpm} BPM`
    : null

  const isPlayable = status !== 'locked'

  return (
    <div
      ref={ref}
      className={`skill-card skill-card-${status} ${isPlayable ? 'skill-card-clickable' : ''} ${isCurrent ? 'skill-card-current' : ''}`}
      onClick={isPlayable ? () => practiceSkill(skill.id) : undefined}
      title={isPlayable ? `Practice: ${skill.name}` : 'Complete prerequisites to unlock'}
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
      {bpmDisplay && (
        <div className="skill-card-bpm">{bpmDisplay}</div>
      )}
      <div className="skill-card-status">{STATUS_LABELS[status]}</div>
      {record?.practiceCount ? (
        <div className="skill-card-count">{record.practiceCount} sessions</div>
      ) : null}
      {isPlayable && <div className="skill-card-practice-hint">Tap to practice →</div>}
    </div>
  )
}

export function SkillTree() {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)

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

  const currentMonth = useMemo(() => {
    if (!currentSkillId) return 1
    return SKILLS.find((s) => s.id === currentSkillId)?.month ?? 1
  }, [currentSkillId])

  const months = useMemo(() => {
    if (!user) return []
    const pathSkills = SKILLS.filter((s) => s.path === user.path || s.path === 'all')
    const maxMonth = Math.max(...pathSkills.map((s) => s.month))
    return Array.from({ length: maxMonth }, (_, i) => ({
      month: i + 1,
      skills: pathSkills.filter((s) => s.month === i + 1),
    }))
  }, [user, skillRecords])

  // Months start collapsed; current month starts open
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(() => new Set([currentMonth]))
  // Week 1-2 groups start collapsed within each month
  const [expandedEarlyWeeks, setExpandedEarlyWeeks] = useState<Set<number>>(new Set())

  // Auto-expand month when current skill changes
  useEffect(() => {
    setExpandedMonths((prev) => {
      if (prev.has(currentMonth)) return prev
      return new Set([...prev, currentMonth])
    })
  }, [currentMonth])

  const toggleMonth = (month: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  const toggleEarlyWeeks = (month: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedEarlyWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  if (!user) return null

  const pathLabels: Record<string, string> = {
    newby: 'Newby Path',
    beginner: 'Beginner Path',
    intermediate: 'Intermediate Path',
  }

  return (
    <div className="skill-tree">
      <div className="skill-tree-header">
        <h2>{pathLabels[user.path]}</h2>
        <p className="skill-tree-subtitle">Your skill progression map. Skills unlock as you progress.</p>
      </div>

      {/* Legend */}
      <div className="skill-legend">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="skill-legend-item">
            <span className="skill-legend-dot" style={{ background: STATUS_COLORS[status as SkillStatus] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Month sections */}
      {months.map(({ month, skills }) => {
        const isOpen = expandedMonths.has(month)
        const earlySkills = skills.filter((s) => (s.week ?? 99) <= 2)
        const laterSkills = skills.filter((s) => (s.week ?? 99) >= 3)
        const earlyOpen = expandedEarlyWeeks.has(month)
        const totalCount = skills.length

        return (
          <div key={month} className={`skill-tree-month ${isOpen ? 'skill-tree-month-open' : ''}`}>
            <div className="skill-month-header" onClick={() => toggleMonth(month)}>
              <div className="skill-month-header-left">
                <span className="skill-month-toggle">{isOpen ? '▾' : '▸'}</span>
                <span className="skill-month-label">Month {month}</span>
              </div>
              <span className="skill-month-count">{totalCount} skills</span>
            </div>

            {isOpen && (
              <div className="skill-month-content">
                {/* Weeks 1-2 collapsible group */}
                {earlySkills.length > 0 && (
                  <div className="skill-week-group">
                    <div className="skill-week-header" onClick={(e) => toggleEarlyWeeks(month, e)}>
                      <span className="skill-week-toggle">{earlyOpen ? '▾' : '▸'}</span>
                      <span className="skill-week-label">Weeks 1–2</span>
                      <span className="skill-week-count">{earlySkills.length} skills</span>
                    </div>
                    {earlyOpen && (
                      <div className="skill-card-grid skill-card-grid-compact">
                        {earlySkills.map((skill) => (
                          <SkillCard key={skill.id} skill={skill} isCurrent={skill.id === currentSkillId} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Weeks 3-4 and beyond — always visible when month is open */}
                {laterSkills.length > 0 && (
                  <div className="skill-card-grid">
                    {laterSkills.map((skill) => (
                      <SkillCard key={skill.id} skill={skill} isCurrent={skill.id === currentSkillId} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
