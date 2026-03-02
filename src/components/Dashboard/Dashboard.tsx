import { useStore } from '../../store/useStore'
import { PATHS } from '../../data/curriculum'
import { getPathProgress } from '../../engine/recommendationEngine'

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
            <span className="path-card-label">{path.label}</span>
            <span className="path-card-desc">{path.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 40
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-label={`${percent}% complete`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e8e8e8" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke="#4a9eff"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="700" fill="#222">
        {percent}%
      </text>
    </svg>
  )
}

function TodaysPlan() {
  const sessionPlan = useStore((s) => s.sessionPlan)
  const setPage = useStore((s) => s.setPage)

  if (!sessionPlan) return null

  const total = sessionPlan.newSkills.length + sessionPlan.activeWork.length + sessionPlan.maintenance.length

  if (total === 0) {
    return (
      <div className="todays-plan">
        <h3 className="section-title">Today's Practice Plan</h3>
        <div className="plan-empty">No skills ready yet. Complete your path selection above.</div>
      </div>
    )
  }

  return (
    <div className="todays-plan">
      <h3 className="section-title">Today's Practice Plan</h3>
      <div className="plan-sections">
        {sessionPlan.newSkills.length > 0 && (
          <div className="plan-section">
            <span className="plan-section-label plan-label-new">New</span>
            {sessionPlan.newSkills.map((item) => (
              <div key={item.skill.id} className="plan-item">
                <span className="plan-item-name">{item.skill.name}</span>
                {item.suggestedBpm && <span className="plan-item-bpm">{item.suggestedBpm} BPM</span>}
              </div>
            ))}
          </div>
        )}
        {sessionPlan.activeWork.length > 0 && (
          <div className="plan-section">
            <span className="plan-section-label plan-label-active">Focus</span>
            {sessionPlan.activeWork.map((item) => (
              <div key={item.skill.id} className="plan-item">
                <span className="plan-item-name">{item.skill.name}</span>
                <span className="plan-item-reason">{item.reason}</span>
                {item.suggestedBpm && <span className="plan-item-bpm">{item.suggestedBpm} BPM</span>}
              </div>
            ))}
          </div>
        )}
        {sessionPlan.maintenance.length > 0 && (
          <div className="plan-section">
            <span className="plan-section-label plan-label-maintenance">Maintenance</span>
            {sessionPlan.maintenance.map((item) => (
              <div key={item.skill.id} className="plan-item">
                <span className="plan-item-name">{item.skill.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="btn btn-primary" onClick={() => setPage('practice')}>
        Start Practice Session
      </button>
    </div>
  )
}

export function Dashboard() {
  const user = useStore((s) => s.user)
  const streak = useStore((s) => s.streak)
  const skillRecords = useStore((s) => s.skillRecords)

  const progress = user ? getPathProgress(user.path, skillRecords) : null

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="app-logo">🪕 Banjo Buddy</h1>
          <p className="dashboard-tagline">Your adaptive banjo practice companion</p>
        </div>
        <div className="streak-badge">
          <span className="streak-fire">🔥</span>
          <span className="streak-count">{streak}</span>
          <span className="streak-label">day streak</span>
        </div>
      </div>

      {/* Progress overview */}
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
              <span className="stat-label">In progress</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: '#ccc' }}>{progress.locked}</span>
              <span className="stat-label">Locked</span>
            </div>
          </div>
        </div>
      )}

      <PathSelector />
      <TodaysPlan />
    </div>
  )
}
