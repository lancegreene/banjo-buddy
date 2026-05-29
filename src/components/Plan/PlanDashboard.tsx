import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { GoalCard } from './GoalCard'
import type { Goal, ItemRef } from '../../types/coach'

export function PlanDashboard() {
  const goals = useStore((s) => s.goals)
  const loadGoals = useStore((s) => s.loadGoals)
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
    // Phase 3 wires this to open library players; for now, log so devs can verify
    // eslint-disable-next-line no-console
    console.log('open item:', ref)
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
      </header>

      {buckets.focus.map((g) => (
        <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
      ))}
      {buckets.explore.map((g) => (
        <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
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
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
              ))}
            </>
          )}
          {buckets.mastered.length > 0 && (
            <>
              <h2>Mastered</h2>
              {buckets.mastered.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
              ))}
            </>
          )}
          {buckets.shelved.length > 0 && (
            <>
              <h2>Shelved</h2>
              {buckets.shelved.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
              ))}
            </>
          )}
        </section>
      )}
    </div>
  )
}
