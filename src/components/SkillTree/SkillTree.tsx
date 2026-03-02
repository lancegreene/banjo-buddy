import { useMemo, useRef, useEffect } from 'react'
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

  const months = useMemo(() => {
    if (!user) return []
    const pathSkills = SKILLS.filter((s) => s.path === user.path || s.path === 'all')
    const maxMonth = Math.max(...pathSkills.map((s) => s.month))
    return Array.from({ length: maxMonth }, (_, i) => ({
      month: i + 1,
      skills: pathSkills.filter((s) => s.month === i + 1),
    }))
  }, [user, skillRecords])

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
      {months.map(({ month, skills }) => (
        <div key={month} className="skill-tree-month">
          <div className="skill-month-header">
            <span className="skill-month-label">Month {month}</span>
            <span className="skill-month-count">{skills.length} skills</span>
          </div>
          <div className="skill-card-grid">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} isCurrent={skill.id === currentSkillId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
