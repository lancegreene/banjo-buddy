// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Home Page
// Card-grid landing page. Left: Continue hero + progress ring.
// Right: Collectible-style cards for each app section.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useStore, type Page, type ToolModal } from '../../store/useStore'
import { SKILL_MAP } from '../../data/curriculum'
import { getPathProgress } from '../../engine/recommendationEngine'
import type { SkillStatus } from '../../db/db'

// ─── Icons (inline SVGs, currentColor) ──────────────────────────────────────

function PathwayIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      <path d="M8 32 C12 28, 16 20, 20 20 S28 12, 32 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="32" r="3" fill="currentColor" opacity="0.4" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" opacity="0.6" />
      <circle cx="32" cy="8" r="3" fill="currentColor" />
      <path d="M30 6 L32 8 L30 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SkillsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      {/* Fingerpick shape */}
      <path d="M14 28 L14 16 C14 12, 20 8, 20 8 C20 8, 26 12, 26 16 L26 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 28 C14 32, 26 32, 26 28" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="12" x2="20" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="20" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      <rect x="6" y="24" width="6" height="10" rx="1.5" fill="currentColor" opacity="0.3" />
      <rect x="14" y="18" width="6" height="16" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="22" y="12" width="6" height="22" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="30" y="6" width="6" height="28" rx="1.5" fill="currentColor" />
      <path d="M8 22 L16 16 L24 10 L32 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  )
}

function AwardsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      <path d="M20 4 L23 14 L34 14 L25 21 L28 32 L20 25 L12 32 L15 21 L6 14 L17 14 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = 20 + Math.cos(rad) * 10
        const y1 = 20 + Math.sin(rad) * 10
        const x2 = 20 + Math.cos(rad) * 14
        const y2 = 20 + Math.sin(rad) * 14
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      })}
    </svg>
  )
}

function ToolsIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      {/* Tuning fork */}
      <path d="M16 6 L16 18 M24 6 L24 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 18 Q16 24, 20 24 Q24 24, 24 18" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="20" y1="24" x2="20" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MetronomeIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      <path d="M12 34 L16 8 L24 8 L28 34 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1" />
      <line x1="20" y1="30" x2="14" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="10" r="2.5" fill="currentColor" />
      <line x1="12" y1="34" x2="28" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TunerIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M20 10 L20 20 L28 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
      {/* Tick marks */}
      <line x1="20" y1="5" x2="20" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="33" y1="20" x2="35" y2="20" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="20" x2="5" y2="20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function BanjoLogo() {
  return (
    <div className="home-logo" data-tour="home-logo">
      <svg viewBox="0 0 48 48" fill="none" className="home-logo-svg">
        {/* Head (drum) */}
        <circle cx="24" cy="15" r="13" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="15" r="10" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
        <circle cx="24" cy="15" r="9" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 2" opacity="0.25" />
        {/* Tension hooks */}
        {[...Array(10)].map((_, i) => {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2
          const x1 = 24 + Math.cos(a) * 10
          const y1 = 15 + Math.sin(a) * 10
          const x2 = 24 + Math.cos(a) * 13
          const y2 = 15 + Math.sin(a) * 13
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" opacity="0.3" />
        })}
        {/* Bridge */}
        <rect x="19" y="20" width="10" height="1.8" rx="0.9" fill="currentColor" opacity="0.5" />
        {/* Neck */}
        <rect x="21.5" y="28" width="5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        {/* Strings */}
        <line x1="23" y1="6" x2="23" y2="28" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
        <line x1="24" y1="5" x2="24" y2="28" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
        <line x1="25" y1="6" x2="25" y2="28" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
        {/* 5th string peg */}
        <circle cx="17" cy="24" r="1.8" stroke="currentColor" strokeWidth="0.9" fill="none" />
        <line x1="18.8" y1="24" x2="21.5" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        {/* Fret dots */}
        <circle cx="24" cy="33" r="1.2" fill="currentColor" opacity="0.3" />
        <circle cx="24" cy="38" r="1.2" fill="currentColor" opacity="0.3" />
      </svg>
      <div className="home-logo-text">
        <span className="home-logo-title">Banjo Buddy</span>
        <span className="home-logo-sub">Kid Tested, Earl Scruggs Approved</span>
      </div>
    </div>
  )
}

function FretLabIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="home-card-icon">
      {/* Strings */}
      {[10, 16, 22, 28, 34].map((y) => (
        <line key={y} x1="4" y1={y} x2="36" y2={y} stroke="currentColor" strokeWidth="1" opacity="0.5" />
      ))}
      {/* Frets */}
      {[10, 18, 26, 34].map((x) => (
        <line key={x} x1={x} y1="8" x2={x} y2="36" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      ))}
      {/* Dots */}
      <circle cx="14" cy="16" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="22" cy="28" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="30" cy="10" r="3" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

// ─── Card data ──────────────────────────────────────────────────────────────

interface CardItem {
  id: string
  label: string
  desc: string
  icon: () => JSX.Element
  page?: Page
  color: string
}

const CARDS: CardItem[] = [
  { id: 'pathway',      label: 'Pathway',  desc: 'Follow your learning path',   icon: PathwayIcon,  page: 'pathway',      color: '#4a9eff' },
  { id: 'skill-tree',   label: 'Skills',   desc: 'Browse & practice skills',    icon: SkillsIcon,   page: 'skill-tree',   color: '#4a7c59' },
  { id: 'progress',     label: 'Progress', desc: 'Track your improvement',      icon: ProgressIcon, page: 'progress',     color: '#E8A838' },
  { id: 'achievements', label: 'Awards',   desc: 'Earn badges & milestones',    icon: AwardsIcon,   page: 'achievements', color: '#c084fc' },
  { id: 'settings',     label: 'Settings', desc: 'Customize your experience',   icon: SettingsIcon, page: 'settings',     color: '#94a3b8' },
]

const TOOL_CARDS: { id: ToolModal; label: string; icon: () => JSX.Element; color: string }[] = [
  { id: 'metronome', label: 'Metronome', icon: MetronomeIcon, color: '#22d3ee' },
  { id: 'tuner',     label: 'Tuner',     icon: TunerIcon,     color: '#f472b6' },
  { id: 'fretlab',   label: 'Fret Lab',  icon: FretLabIcon,   color: '#34d399' },
]

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<SkillStatus, string> = {
  locked: '#ccc', unlocked: '#4a9eff', active: '#f5a623', progressed: '#4ADE80', mastered: '#9b59b6',
}
const STATUS_LABELS: Record<SkillStatus, string> = {
  locked: 'Locked', unlocked: 'Ready to start', active: 'In progress', progressed: 'Progressed', mastered: 'Mastered',
}

// ─── Progress Ring ──────────────────────────────────────────────────────────

function ProgressRing({ percent }: { percent: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width="108" height="108" viewBox="0 0 108 108" className="home-progress-ring">
      <circle cx="54" cy="54" r={r} fill="none" stroke="var(--border-primary)" strokeWidth="8" />
      <circle
        cx="54" cy="54" r={r}
        fill="none" stroke="#4a9eff" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 54 54)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="54" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700" fill="var(--text-primary)">
        {percent}%
      </text>
    </svg>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HomePage() {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const sessionPlan = useStore((s) => s.sessionPlan)
  const setPage = useStore((s) => s.setPage)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const setOpenModal = useStore((s) => s.setOpenModal)
  const streak = useStore((s) => s.streak)
  const disabledSkillIds = useStore((s) => s.disabledSkillIds)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const [toolsExpanded, setToolsExpanded] = useState(false)

  const disabled = activeUserRole === 'student' ? disabledSkillIds : new Set<string>()
  const isTeacher = activeUserRole === 'teacher'
  const progress = user ? getPathProgress(user.path, skillRecords, disabled, isTeacher) : null

  // Find most recently practiced skill for "Continue" card
  let currentSkillId: string | null = null
  let latestTime = ''
  for (const [id, record] of skillRecords) {
    if (record.lastPracticed && record.lastPracticed > latestTime) {
      latestTime = record.lastPracticed
      currentSkillId = id
    }
  }
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
    <div className="home-page" data-tour="home-page">
      {/* ─── Left column: hero + progress ─── */}
      <div className="home-left">
        <BanjoLogo />

        <div className="home-streak" data-tour="home-streak">
          <span className="home-streak-fire">🔥</span>
          <strong>{streak}</strong> day streak
          {lastPracticedLabel && (
            <span className="home-last-practiced">· Last played {lastPracticedLabel}</span>
          )}
        </div>

        {/* Continue card */}
        {skill ? (
          <div className="home-continue" data-tour="home-continue" onClick={() => { setPage('skill-tree'); practiceSkill(skill.id) }}>
            <div className="home-continue-label">Continue where you left off</div>
            <div className="home-continue-skill">
              <span className="home-continue-dot" style={{ background: STATUS_COLORS[status] }} />
              <span className="home-continue-name">{skill.name}</span>
            </div>
            <div className="home-continue-meta">
              <span>{STATUS_LABELS[status]}</span>
              {record?.bestBpm && <span>· Best: {record.bestBpm} BPM</span>}
            </div>
            <span className="home-continue-arrow">→</span>
          </div>
        ) : (
          <div className="home-continue home-continue-empty">
            <div className="home-continue-name">Welcome!</div>
            <div className="home-continue-meta">Pick a skill card to get started</div>
          </div>
        )}

        {/* Progress ring + stats */}
        {progress && (
          <div className="home-progress" data-tour="home-progress">
            <ProgressRing percent={progress.percentComplete} />
            <div className="home-progress-stats">
              <div className="home-stat">
                <span className="home-stat-val" style={{ color: '#E8A838' }}>{progress.mastered + progress.progressed}</span>
                <span className="home-stat-lbl">Complete</span>
              </div>
              <div className="home-stat">
                <span className="home-stat-val" style={{ color: '#f5a623' }}>{progress.active}</span>
                <span className="home-stat-lbl">Active</span>
              </div>
              <div className="home-stat">
                <span className="home-stat-val" style={{ color: 'var(--text-tertiary)' }}>{progress.locked}</span>
                <span className="home-stat-lbl">Locked</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Right column: card grid ─── */}
      <div className="home-right">
        <div className="home-card-grid" data-tour="home-cards">
          {CARDS.map((card) => (
            <button
              key={card.id}
              className="home-card"
              style={{ '--card-accent': card.color } as React.CSSProperties}
              onClick={() => card.page && setPage(card.page)}
            >
              <div className="home-card-shine" />
              <div className="home-card-icon-wrap">
                <card.icon />
              </div>
              <div className="home-card-label">{card.label}</div>
              <div className="home-card-desc">{card.desc}</div>
            </button>
          ))}

          {/* Tools card — expands to show sub-cards */}
          {!toolsExpanded ? (
            <button
              className="home-card home-card-tools"
              style={{ '--card-accent': '#22d3ee' } as React.CSSProperties}
              onClick={() => setToolsExpanded(true)}
            >
              <div className="home-card-shine" />
              <div className="home-card-icon-wrap">
                <ToolsIcon />
              </div>
              <div className="home-card-label">Tools</div>
              <div className="home-card-desc">Metronome, Tuner & Fret Lab</div>
              <span className="home-card-badge">3</span>
            </button>
          ) : (
            <div className="home-tools-expanded">
              {TOOL_CARDS.map((tool) => (
                <button
                  key={tool.id}
                  className="home-card home-card-mini"
                  style={{ '--card-accent': tool.color } as React.CSSProperties}
                  onClick={() => setOpenModal(tool.id)}
                >
                  <div className="home-card-shine" />
                  <div className="home-card-icon-wrap">
                    <tool.icon />
                  </div>
                  <div className="home-card-label">{tool.label}</div>
                </button>
              ))}
              <button className="home-tools-close" onClick={() => setToolsExpanded(false)}>✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
