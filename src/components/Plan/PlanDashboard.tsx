import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { GoalCard } from './GoalCard'
import { CheckInPrompt } from './CheckInPrompt'
import type { Goal, ItemRef } from '../../types/coach'

export function PlanDashboard() {
  const goals = useStore((s) => s.goals)
  const loadGoals = useStore((s) => s.loadGoals)
  const setPage = useStore((s) => s.setPage)
  const setLibrarySelection = useStore((s) => s.setLibrarySelection)
  const setActiveSessionGoal = useStore((s) => s.setActiveSessionGoal)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  const buckets = useMemo(() => {
    const out = {
      focus: [] as Goal[],
      explore: [] as Goal[],
      backlog: [] as Goal[],
      mastered: [] as Goal[],
      shelved: [] as Goal[],
    }
    for (const g of goals) out[g.status].push(g)
    return out
  }, [goals])

  const handleItemClick = (ref: ItemRef) => {
    setLibrarySelection(ref)
    setPage('library')
  }

  const handleStartSession = (goal: Goal) => {
    setActiveSessionGoal(goal.id)
    setPage('guided-session')
  }

  if (goals.length === 0) {
    return (
      <div className="plan-dashboard plan-dashboard--empty">
        <h2>No plan yet</h2>
        <p>Take the assessment to generate your first plan.</p>
      </div>
    )
  }

  const hasHiddenGoals =
    buckets.backlog.length + buckets.mastered.length + buckets.shelved.length > 0

  return (
    <div className="plan-dashboard">
      <header className="plan-dashboard-header">
        <h1>Your Plan</h1>
        <span className="plan-dashboard-subtitle">This week</span>
        <button
          className="plan-dashboard-refresh"
          onClick={() => setPage('check-in')}
        >
          Refresh plan
        </button>
      </header>

      <CheckInPrompt />

      {buckets.focus.map((g) => (
        <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} onStartSession={handleStartSession} />
      ))}
      {buckets.explore.map((g) => (
        <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} onStartSession={handleStartSession} />
      ))}

      {hasHiddenGoals && (
        <button
          className="plan-dashboard-see-all"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll
            ? 'Hide'
            : `See all (${buckets.backlog.length + buckets.mastered.length + buckets.shelved.length} more)`}
        </button>
      )}

      {showAll && (
        <section className="plan-dashboard-backlog">
          {buckets.backlog.length > 0 && (
            <>
              <h2>Up next</h2>
              {buckets.backlog.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} onStartSession={handleStartSession} />
              ))}
            </>
          )}
          {buckets.mastered.length > 0 && (
            <>
              <h2>Mastered</h2>
              {buckets.mastered.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} onStartSession={handleStartSession} />
              ))}
            </>
          )}
          {buckets.shelved.length > 0 && (
            <>
              <h2>Shelved</h2>
              {buckets.shelved.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} onStartSession={handleStartSession} />
              ))}
            </>
          )}
        </section>
      )}
    </div>
  )
}
