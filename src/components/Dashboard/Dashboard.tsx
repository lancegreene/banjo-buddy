import { useStore } from '../../store/useStore'
import { PATHS, SKILL_MAP } from '../../data/curriculum'
import { getPathProgress } from '../../engine/recommendationEngine'
import type { SkillStatus } from '../../db/db'
import { PracticeHeatmap } from '../Progress/PracticeHeatmap'
import { WarmUpCard } from './WarmUpCard'
import { PlateauAlert } from '../Dashboard/PlateauAlert'
import { ChallengeCard } from '../Social/ChallengeCard'

const STATUS_COLORS: Record<SkillStatus, string> = {
  locked: '#ccc',
  unlocked: '#4a9eff',
  active: '#f5a623',
  progressed: '#7ed321',
  mastered: '#9b59b6',
}

const STATUS_LABELS: Record<SkillStatus, string> = {
  locked: 'Locked',
  unlocked: 'Ready to start',
  active: 'In progress',
  progressed: 'Progressed',
  mastered: 'Mastered',
}

function ContinueHero() {
  const skillRecords = useStore((s) => s.skillRecords)
  const sessionPlan = useStore((s) => s.sessionPlan)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const setPage = useStore((s) => s.setPage)
  const streak = useStore((s) => s.streak)

  // Find most recently practiced skill
  let currentSkillId: string | null = null
  let latestTime = ''
  for (const [id, record] of skillRecords) {
    if (record.lastPracticed && record.lastPracticed > latestTime) {
      latestTime = record.lastPracticed
      currentSkillId = id
    }
  }

  // Fall back to first unlocked skill from session plan
  if (!currentSkillId) {
    const first = sessionPlan?.newSkills[0] ?? sessionPlan?.activeWork[0] ?? null
    currentSkillId = first?.skill.id ?? null
  }

  const skill = currentSkillId ? SKILL_MAP.get(currentSkillId) : null
  const record = currentSkillId ? skillRecords.get(currentSkillId) : null
  const status = (record?.status ?? 'unlocked') as SkillStatus

  const lastPracticedLabel = record?.lastPracticed
    ? new Date(record.lastPracticed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <div className="continue-hero">
      <div className="continue-hero-top">
        <div className="continue-hero-meta">
          <span className="streak-badge-inline">
            🔥 <strong>{streak}</strong> day streak
          </span>
          {lastPracticedLabel && (
            <span className="continue-last-practiced">Last practiced {lastPracticedLabel}</span>
          )}
        </div>
      </div>

      {skill ? (
        <div className="continue-hero-card">
          <div className="continue-hero-skill">
            <span
              className="skill-status-dot"
              style={{ background: STATUS_COLORS[status] }}
              title={STATUS_LABELS[status]}
            />
            <div className="continue-hero-info">
              <div className="continue-hero-label">Continue where you left off</div>
              <div className="continue-hero-name">{skill.name}</div>
              <div className="continue-hero-status">{STATUS_LABELS[status]}</div>
              {record?.bestBpm && (
                <div className="continue-hero-bpm">Best: {record.bestBpm} BPM</div>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary continue-hero-btn"
            onClick={() => { setPage('skill-tree'); practiceSkill(skill.id) }}
          >
            Continue Practice →
          </button>
        </div>
      ) : (
        <div className="continue-hero-card continue-hero-empty">
          <div className="continue-hero-name">Welcome to Banjo Buddy!</div>
          <div className="continue-hero-status">Select a skill from the Skills tab to get started</div>
        </div>
      )}
    </div>
  )
}

const PATH_ICONS: Record<string, string> = {
  newby: '\u{1F331}',
  beginner: '\u{1FA95}',
  intermediate: '\u{1F3B5}',
}

function PathSelector() {
  const user = useStore((s) => s.user)
  const setUserPath = useStore((s) => s.setUserPath)

  return (
    <div className="path-selector">
      <h3 className="section-title">Your Learning Path</h3>
      <div className="path-cards">
        {PATHS.map((path) => (
          <button
            key={path.id}
            className={`path-card ${user?.path === path.id ? 'path-card-active' : ''}`}
            onClick={() => setUserPath(path.id)}
          >
            <span className="path-card-icon">{PATH_ICONS[path.id] ?? '\u{1F3B6}'}</span>
            <div className="path-card-text">
              <span className="path-card-label">{path.label}</span>
              <span className="path-card-desc">{path.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-label={`${percent}% complete`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e8e8e8" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke="#4a9eff"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="700" fill="#222">
        {percent}%
      </text>
    </svg>
  )
}

function TodaysPlan() {
  const sessionPlan = useStore((s) => s.sessionPlan)
  const setPage = useStore((s) => s.setPage)
  const practiceSkill = useStore((s) => s.practiceSkill)

  if (!sessionPlan) return null

  const total = sessionPlan.newSkills.length + sessionPlan.activeWork.length + sessionPlan.maintenance.length
  if (total === 0) return null

  const allItems = [
    ...sessionPlan.newSkills.map((i) => ({ ...i, tag: 'New' as const })),
    ...sessionPlan.activeWork.map((i) => ({ ...i, tag: 'Focus' as const })),
    ...sessionPlan.maintenance.map((i) => ({ ...i, tag: 'Maintain' as const })),
  ]

  return (
    <div className="todays-plan">
      <div className="todays-plan-header">
        <h3 className="section-title">Today's Plan</h3>
        <button className="btn-text" onClick={() => setPage('practice')}>
          Full session →
        </button>
      </div>
      <div className="plan-items-compact">
        {allItems.map((item) => (
          <button
            key={item.skill.id}
            className="plan-item-compact"
            onClick={() => practiceSkill(item.skill.id)}
          >
            <span className={`plan-tag plan-tag-${item.tag.toLowerCase()}`}>{item.tag}</span>
            <span className="plan-item-name">{item.skill.name}</span>
            {item.suggestedBpm && <span className="plan-item-bpm">{item.suggestedBpm} BPM</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const setPage = useStore((s) => s.setPage)

  const progress = user ? getPathProgress(user.path, skillRecords) : null

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="app-logo">🪕 Banjo Buddy</h1>
      </div>

      <ContinueHero />

      {progress && (
        <div className="progress-overview">
          <ProgressRing percent={progress.percentComplete} />
          <div className="progress-stats">
            <div className="stat">
              <span className="stat-value" style={{ color: '#7ed321' }}>{progress.mastered + progress.progressed}</span>
              <span className="stat-label">Complete</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: '#f5a623' }}>{progress.active}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: '#ccc' }}>{progress.locked}</span>
              <span className="stat-label">Locked</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini 4-week heatmap */}
      <div className="dashboard-heatmap-section">
        <PracticeHeatmap weeks={4} mini />
        <button className="btn-text" onClick={() => setPage('progress')}>
          View full progress →
        </button>
      </div>

      <WarmUpCard />
      <TodaysPlan />
      <PlateauAlert />
      <ChallengeCard />
      <PathSelector />
    </div>
  )
}
