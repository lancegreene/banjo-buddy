// ─── Pathway — Linear skill progression sidebar ──────────────────────────────
import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { getAllSkills, SKILL_MAP, type Skill } from '../../data/curriculum'
import { evaluateSkillStatus } from '../../engine/recommendationEngine'
import type { SkillStatus } from '../../db/db'

const STATUS_COLORS: Record<SkillStatus, string> = {
  locked: '#ccc',
  unlocked: '#4a9eff',
  active: '#f5a623',
  progressed: '#7ed321',
  mastered: '#9b59b6',
}

const STATUS_LABELS: Record<SkillStatus, string> = {
  locked: 'Locked',
  unlocked: 'Ready',
  active: 'In progress',
  progressed: 'Progressed',
  mastered: 'Mastered',
}

export function Pathway() {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const selectedSkillId = useStore((s) => s.selectedSkillId)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)

  const orderedSkills = useMemo(() => {
    if (!user) return []
    let skills = getAllSkills()
      .filter((s) => s.path === user.path || s.path === 'all')
    // Students don't see disabled skills
    if (activeUserRole === 'student') {
      skills = skills.filter((s) => !disabledSkillIds.has(s.id))
    }
    return skills.sort((a, b) => a.month - b.month || (a.week ?? 99) - (b.week ?? 99))
  }, [user, skillRecords, activeUserRole, disabledSkillIds])

  // Group by month
  const months = useMemo(() => {
    const map = new Map<number, Skill[]>()
    for (const skill of orderedSkills) {
      const list = map.get(skill.month) ?? []
      list.push(skill)
      map.set(skill.month, list)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [orderedSkills])

  if (!user) return null

  const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
  const isTeacher = activeUserRole === 'teacher'

  // Find the index of the first non-progressed/mastered skill (the "current" frontier)
  const frontierIdx = orderedSkills.findIndex((s) => {
    const r = skillRecords.get(s.id) ?? null
    const status = evaluateSkillStatus(s, r, skillRecords, disabled, isTeacher)
    return status !== 'progressed' && status !== 'mastered'
  })

  function handleClick(skill: Skill) {
    const r = skillRecords.get(skill.id) ?? null
    const status = evaluateSkillStatus(skill, r, skillRecords, disabled, isTeacher)
    if (status === 'locked') return
    practiceSkill(skill.id)
  }

  function getLockedTitle(skill: Skill): string {
    const unmet = skill.prerequisites
      .filter((id) => {
        if (disabled.has(id)) return false
        const r = skillRecords.get(id)
        return !r || (r.practiceCount === 0 && r.status !== 'active' && r.status !== 'progressed' && r.status !== 'mastered')
      })
      .map((id) => SKILL_MAP.get(id)?.name ?? id)
    return unmet.length ? `Complete first: ${unmet.join(', ')}` : 'Complete prerequisites to unlock'
  }

  const [search, setSearch] = useState('')
  const searchLower = search.toLowerCase().trim()

  let globalIdx = 0

  return (
    <div className="pathway-sidebar" data-tour="pathway-sidebar">
      <div className="pathway-header">
        <h2>Pathway</h2>
      </div>
      <input
        className="sidebar-search"
        type="text"
        placeholder="Search skills…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="pathway-timeline" data-tour="pathway-timeline">
        {months.map(([month, skills]) => {
          const filtered = searchLower
            ? skills.filter((s) => s.name.toLowerCase().includes(searchLower))
            : skills
          if (filtered.length === 0) return null
          return (
          <div key={month} className="pathway-month">
            <div className="pathway-month-label">Month {month}</div>
            {filtered.map((skill) => {
              const record = skillRecords.get(skill.id) ?? null
              const status = evaluateSkillStatus(skill, record, skillRecords, disabled, isTeacher)
              const isPlayable = status !== 'locked'
              const isFrontier = globalIdx === frontierIdx
              const idx = globalIdx++
              const done = status === 'progressed' || status === 'mastered'
              const isSelected = skill.id === selectedSkillId

              return (
                <PathwayNode
                  key={skill.id}
                  skill={skill}
                  status={status}
                  isPlayable={isPlayable}
                  isFrontier={isFrontier}
                  isSelected={isSelected}
                  idx={idx}
                  done={done}
                  bpm={record?.bestBpm ?? null}
                  onClick={() => handleClick(skill)}
                  title={isPlayable ? `Practice: ${skill.name}` : getLockedTitle(skill)}
                />
              )
            })}
          </div>
        )})}
      </div>
    </div>
  )
}

function PathwayNode({ skill, status, isPlayable, isFrontier, isSelected, idx, done, bpm, onClick, title }: {
  skill: Skill
  status: SkillStatus
  isPlayable: boolean
  isFrontier: boolean
  isSelected: boolean
  idx: number
  done: boolean
  bpm: number | null
  onClick: () => void
  title: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isSelected])

  return (
    <div
      ref={ref}
      className={`pathway-node ${done ? 'pathway-node-done' : ''} ${isFrontier ? 'pathway-node-current' : ''} ${isPlayable ? 'pathway-node-clickable' : 'pathway-node-locked'} ${isSelected ? 'pathway-node-selected' : ''}`}
      onClick={onClick}
      title={title}
    >
      {idx > 0 && (
        <div className={`pathway-connector ${done ? 'pathway-connector-done' : ''}`} />
      )}

      <div className="pathway-node-dot" style={{ borderColor: STATUS_COLORS[status], background: done ? STATUS_COLORS[status] : '#fff' }}>
        {done && <span className="pathway-check">✓</span>}
        {isFrontier && !done && <span className="pathway-pulse" />}
      </div>

      <div className="pathway-node-content">
        <div className="pathway-node-name">{skill.name}</div>
        <div className="pathway-node-meta">
          <span className="pathway-node-status" style={{ color: STATUS_COLORS[status] }}>
            {STATUS_LABELS[status]}
          </span>
          {bpm ? (
            <span className="pathway-node-bpm">{bpm} BPM</span>
          ) : skill.progressBpm ? (
            <span className="pathway-node-bpm">Goal: {skill.progressBpm} BPM</span>
          ) : null}
          {skill.isMilestone && <span className="pathway-milestone">🎯</span>}
        </div>
      </div>
    </div>
  )
}
