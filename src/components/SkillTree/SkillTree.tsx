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

// ─── Category Icons ──────────────────────────────────────────────────────────

function SetupIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <path d="M20 8 L20 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 28 L30 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="28" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="26" cy="28" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function TheoryIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <rect x="8" y="6" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="14" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="19" x2="26" y2="19" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="24" x2="22" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="28" cy="28" r="5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <text x="28" y="30.5" textAnchor="middle" fontSize="7" fill="currentColor" fontWeight="bold">♩</text>
    </svg>
  )
}

function RollsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <path d="M4 20 Q10 10, 16 20 Q22 30, 28 20 Q34 10, 40 20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M4 28 Q10 18, 16 28 Q22 38, 28 28 Q34 18, 40 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
      <circle cx="10" cy="14" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="22" cy="14" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="34" cy="14" r="2" fill="currentColor" opacity="0.8" />
    </svg>
  )
}

function ChordsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      {[12, 18, 24, 30].map(x => <line key={x} x1={x} y1="8" x2={x} y2="34" stroke="currentColor" strokeWidth="1" opacity="0.4" />)}
      {[14, 20, 26, 32].map(y => <line key={y} x1="10" y1={y} x2="32" y2={y} stroke="currentColor" strokeWidth="1.5" opacity="0.3" />)}
      <circle cx="18" cy="17" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="24" cy="23" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="12" cy="23" r="3" fill="currentColor" opacity="0.8" />
    </svg>
  )
}

function TechniquesIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <path d="M14 28 L14 16 C14 12, 20 8, 20 8 C20 8, 26 12, 26 16 L26 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 28 C14 32, 26 32, 26 28" stroke="currentColor" strokeWidth="2" />
      <path d="M18 16 L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M18 20 L24 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

function LicksIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <path d="M6 30 L12 18 L18 24 L24 12 L30 20 L36 10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="10" r="2.5" fill="currentColor" />
    </svg>
  )
}

function SongsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <circle cx="14" cy="28" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="19" y1="28" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
      <path d="M19 10 L30 7 L30 17 L19 20" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
    </svg>
  )
}

function PerformanceIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="stc-icon">
      <path d="M20 4 L23 14 L34 14 L25 21 L28 32 L20 25 L12 32 L15 21 L6 14 L17 14 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
    </svg>
  )
}

const CATEGORY_ICONS: Record<SkillCategory, () => JSX.Element> = {
  setup: SetupIcon,
  theory: TheoryIcon,
  rolls: RollsIcon,
  chords: ChordsIcon,
  techniques: TechniquesIcon,
  licks: LicksIcon,
  songs: SongsIcon,
  performance: PerformanceIcon,
}

// ─── Skill Card (used in main content area) ──────────────────────────────────

function SkillCard({ skill, isCurrent, isSelected, onNavigateToSkill, isDisabledByTeacher }: {
  skill: Skill
  isCurrent: boolean
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
      if (isLocked && unmetPrereqs.length > 0) setShowPrereqs(true)
    }
  }, [isCurrent])

  function handleClick() { practiceSkill(skill.id) }

  function handlePrereqClick(prereqId: string) {
    practiceSkill(prereqId)
    if (onNavigateToSkill) onNavigateToSkill(prereqId)
    setShowPrereqs(false)
  }

  return (
    <div ref={ref} className={`stc-skill-card stc-skill-${status} ${isSelected ? 'stc-skill-selected' : ''} ${isDisabledByTeacher ? 'stc-skill-disabled' : ''}`}>
      <div className="stc-skill-card-inner" onClick={handleClick} title={skill.name}>
        <div className="stc-skill-shine" />
        <span className="stc-skill-status-dot" style={{ background: STATUS_COLORS[status] }} />
        <div className="stc-skill-text">
          <span className="stc-skill-name">{skill.name}</span>
          <span className="stc-skill-desc">{skill.description}</span>
        </div>
        <div className="stc-skill-meta">
          <span className="stc-skill-status-label">{STATUS_LABELS[status]}</span>
          {record?.bestBpm && <span className="stc-skill-bpm">{record.bestBpm} BPM</span>}
          {record?.masteryLevel && (() => {
            const isOverdue = record.fsrsState ? (() => { try { return isFsrsDue(JSON.parse(record.fsrsState)); } catch { return false; } })() : false
            const effective = getEffectiveMastery(record.masteryLevel, isOverdue)
            return (
              <span className={`mastery-indicator mastery-indicator-${effective} ${isOverdue ? 'mastery-indicator-overdue' : ''}`}>
                {masteryLevelToLabel(effective)}
              </span>
            )
          })()}
          {skill.isMilestone && <span className="skill-milestone-badge">🎯</span>}
          {isDisabledByTeacher && <span className="skill-disabled-badge">disabled</span>}
        </div>
      </div>

      {isLocked && unmetPrereqs.length > 0 && (
        <div className="stc-skill-prereqs">
          <button className="stc-prereq-toggle" onClick={() => setShowPrereqs(p => !p)}>
            {showPrereqs ? '▾' : '▸'} Prerequisites
          </button>
          {showPrereqs && (
            <div className="skill-prereq-panel">
              {unmetPrereqs.map((prereq) => (
                <button key={prereq.id} className={`skill-prereq-link skill-prereq-link-${prereq.status}`} onClick={() => handlePrereqClick(prereq.id)}>
                  <span className="skill-status-dot" style={{ background: STATUS_COLORS[prereq.status] }} />
                  <span className="skill-prereq-link-name">{prereq.name}</span>
                  <span className="skill-prereq-link-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Compact Skill Row (for expanded sidebar) ───────────────────────────────

function SkillRow({ skill }: { skill: Skill }) {
  const skillRecords = useStore((s) => s.skillRecords)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const selectedSkillId = useStore((s) => s.selectedSkillId)

  const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
  const isTeacher = activeUserRole === 'teacher'
  const record = skillRecords.get(skill.id) ?? null
  const status = evaluateSkillStatus(skill, record, skillRecords, disabled, isTeacher)

  return (
    <div
      className={`stc-row stc-row-${status} ${skill.id === selectedSkillId ? 'stc-row-selected' : ''}`}
      onClick={() => practiceSkill(skill.id)}
      title={skill.name}
    >
      <span className="stc-row-dot" style={{ background: STATUS_COLORS[status] }} />
      <span className="stc-row-name">{skill.name}</span>
    </div>
  )
}

// ─── Sidebar Nav (slim icons, expandable to full skill list) ─────────────────

export function SkillTreeNav({ activeCategory, onSelect }: {
  activeCategory: SkillCategory | null
  onSelect: (cat: SkillCategory | null) => void
}) {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const [expanded, setExpanded] = useState(false)

  const categories = useMemo(() => {
    if (!user) return []
    let pathSkills = getAllSkills().filter((s) => s.path === user.path || s.path === 'all')
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

  const [expandedCats, setExpandedCats] = useState<Set<SkillCategory>>(() => new Set())

  function toggleCat(catId: SkillCategory) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  if (!user) return null

  // ── Expanded: full sidebar with category accordions + skill list ──
  if (expanded) {
    return (
      <div className="stc-nav stc-nav-expanded" data-tour="skill-tree-sidebar">
        <div className="stc-nav-top-row">
          <h2>Skills</h2>
          <button className="stc-nav-toggle" onClick={() => setExpanded(false)} title="Collapse sidebar">
            «
          </button>
        </div>
        <div className="stc-nav-list">
          {categories.map(({ id, label, skills }) => {
            const color = CATEGORY_COLORS[id]
            const Icon = CATEGORY_ICONS[id]
            const isOpen = expandedCats.has(id)
            return (
              <div key={id} className="stc-nav-section">
                <button
                  className={`stc-nav-section-header ${activeCategory === id ? 'stc-nav-section-active' : ''}`}
                  onClick={() => { onSelect(id); toggleCat(id) }}
                  style={{ '--stc-nav-color': color } as React.CSSProperties}
                >
                  <div className="stc-nav-icon"><Icon /></div>
                  <span className="stc-nav-section-label">{label}</span>
                  <span className="stc-nav-section-count">{skills.length}</span>
                  <span className="stc-nav-section-arrow">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="stc-nav-section-skills">
                    {skills.map(skill => (
                      <SkillRow key={skill.id} skill={skill} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Collapsed: slim icon strip ──
  return (
    <div className="stc-nav" data-tour="skill-tree-sidebar">
      <div className="stc-nav-header">
        <h2>Skills</h2>
        <button className="stc-nav-toggle" onClick={() => setExpanded(true)} title="Expand sidebar">
          »
        </button>
      </div>
      <button
        className={`stc-nav-item ${activeCategory === null ? 'stc-nav-item-active' : ''}`}
        onClick={() => onSelect(null)}
      >
        <svg viewBox="0 0 40 40" fill="none" className="stc-nav-icon">
          <rect x="6" y="6" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
          <rect x="22" y="6" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
          <rect x="6" y="22" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
          <rect x="22" y="22" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="stc-nav-label">All</span>
      </button>
      {categories.map(({ id, label }) => {
        const Icon = CATEGORY_ICONS[id]
        const color = CATEGORY_COLORS[id]
        return (
          <button
            key={id}
            className={`stc-nav-item ${activeCategory === id ? 'stc-nav-item-active' : ''}`}
            style={{ '--stc-nav-color': color } as React.CSSProperties}
            onClick={() => onSelect(id)}
          >
            <div className="stc-nav-icon"><Icon /></div>
            <span className="stc-nav-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Content (category cards + skill cards) ─────────────────────────────

export function SkillTreeContent({ activeCategory, onSelectCategory }: {
  activeCategory: SkillCategory | null
  onSelectCategory: (cat: SkillCategory | null) => void
}) {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const selectedSkillId = useStore((s) => s.selectedSkillId)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)

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

  const categories = useMemo(() => {
    if (!user) return []
    let pathSkills = getAllSkills().filter((s) => s.path === user.path || s.path === 'all')
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

  const [search, setSearch] = useState('')
  const searchLower = search.toLowerCase().trim()

  const [scrollToSkillId, setScrollToSkillId] = useState<string | null>(null)

  function handleNavigateToSkill(skillId: string) {
    const targetSkill = SKILL_MAP.get(skillId)
    if (!targetSkill) return
    onSelectCategory(targetSkill.category)
    setScrollToSkillId(skillId)
    setTimeout(() => setScrollToSkillId(null), 500)
  }

  if (!user) return null

  const isSearching = searchLower.length > 0
  const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
  const isTeacher = activeUserRole === 'teacher'

  return (
    <div className="stc-main" data-tour="skill-tree-main">
      <div className="stc-main-top">
        <input
          className="stc-search"
          type="text"
          placeholder="Search skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isSearching ? (
        <div className="stc-skill-grid">
          {categories.flatMap(({ skills }) =>
            skills.filter(s => s.name.toLowerCase().includes(searchLower))
          ).map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isCurrent={skill.id === scrollToSkillId}
              isSelected={skill.id === selectedSkillId}
              onNavigateToSkill={handleNavigateToSkill}
              isDisabledByTeacher={isTeacher && disabledSkillIds.has(skill.id)}
            />
          ))}
        </div>
      ) : activeCategory ? (
        <div className="stc-expanded">
          <button className="stc-back-btn" onClick={() => onSelectCategory(null)}>
            ← All Categories
          </button>
          <div className="stc-expanded-header" style={{ '--stc-cat-color': CATEGORY_COLORS[activeCategory] } as React.CSSProperties}>
            {(() => { const Icon = CATEGORY_ICONS[activeCategory]; return <Icon /> })()}
            <h3>{categories.find(c => c.id === activeCategory)?.label}</h3>
            <span className="stc-expanded-count">
              {categories.find(c => c.id === activeCategory)?.skills.length} skills
            </span>
          </div>
          <div className="stc-skill-grid">
            {categories
              .find(c => c.id === activeCategory)
              ?.skills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isCurrent={skill.id === currentSkillId || skill.id === scrollToSkillId}
                  isSelected={skill.id === selectedSkillId}
                  onNavigateToSkill={handleNavigateToSkill}
                  isDisabledByTeacher={isTeacher && disabledSkillIds.has(skill.id)}
                />
              ))}
          </div>
        </div>
      ) : (
        <div className="stc-category-grid">
          {categories.map(({ id, label, skills: catSkills }) => {
            const color = CATEGORY_COLORS[id]
            const Icon = CATEGORY_ICONS[id]
            let completed = 0
            for (const s of catSkills) {
              const r = skillRecords.get(s.id)
              const st = evaluateSkillStatus(s, r ?? null, skillRecords, disabled, isTeacher)
              if (st === 'progressed' || st === 'mastered') completed++
            }

            return (
              <button
                key={id}
                className="stc-category-card"
                style={{ '--card-accent': color } as React.CSSProperties}
                onClick={() => onSelectCategory(id)}
              >
                <div className="stc-category-shine" />
                <div className="stc-category-icon-wrap">
                  <Icon />
                </div>
                <div className="stc-category-label">{label}</div>
                <div className="stc-category-count">{completed}/{catSkills.length}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Legacy export (keeps old import working) ────────────────────────────────

export function SkillTree() {
  const [activeCategory, setActiveCategory] = useState<SkillCategory | null>(null)
  return (
    <>
      <SkillTreeNav activeCategory={activeCategory} onSelect={setActiveCategory} />
      <SkillTreeContent activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
    </>
  )
}
