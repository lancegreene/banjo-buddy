import { useState, useEffect } from 'react'
import { ACHIEVEMENTS, type AchievementDef } from '../../data/achievements'
import { getEarnedAchievements } from '../../engine/achievementTracker'
import { useStore } from '../../store/useStore'

export function AchievementList() {
  const user = useStore(s => s.user)
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getEarnedAchievements(user.id).then(list => {
      setEarned(new Set(list.map(a => a.def.id)))
      setLoading(false)
    })
  }, [user])

  if (loading) return <div className="achievements-loading">Loading achievements...</div>

  const categories = ['streak', 'skills', 'speed', 'time', 'special'] as const
  const categoryLabels: Record<string, string> = {
    streak: 'Streaks',
    skills: 'Skills',
    speed: 'Speed',
    time: 'Practice Time',
    special: 'Special',
  }

  return (
    <div className="achievements-page">
      <h2 className="achievements-title">Achievements</h2>
      <p className="achievements-subtitle">
        {earned.size} / {ACHIEVEMENTS.length} earned
      </p>

      {categories.map(cat => {
        const items = ACHIEVEMENTS.filter(a => a.category === cat)
        return (
          <div key={cat} className="achievements-category">
            <h3 className="achievements-category-title">{categoryLabels[cat]}</h3>
            <div className="achievements-grid">
              {items.map(def => (
                <AchievementCard key={def.id} def={def} earned={earned.has(def.id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AchievementCard({ def, earned }: { def: AchievementDef; earned: boolean }) {
  return (
    <div className={`achievement-card ${earned ? 'achievement-card-earned' : 'achievement-card-locked'}`}>
      <div className="achievement-icon">{earned ? '★' : '☆'}</div>
      <div className="achievement-info">
        <span className="achievement-name">{def.title}</span>
        <span className="achievement-desc">{def.description}</span>
      </div>
    </div>
  )
}
