// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — GoalDiffReview
// After a weekly check-in conversation produces proposed goal changes
// (GoalDeltas), present them as an approve/reject checklist. Defaults all to
// approved; user confirms the selected subset or skips all. Pure presentational
// component — no store access, no side effects beyond the two callbacks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { Goal, GoalDelta } from '../../types/coach'

interface Props {
  deltas: GoalDelta[]
  existingGoals: Goal[]
  onConfirm: (approved: GoalDelta[]) => void
  onSkipAll: () => void
}

export function GoalDiffReview({ deltas, existingGoals, onConfirm, onSkipAll }: Props) {
  const [approved, setApproved] = useState<boolean[]>(deltas.map(() => true))

  const toggle = (i: number) =>
    setApproved((a) => a.map((v, idx) => (idx === i ? !v : v)))

  const handleConfirm = () => {
    onConfirm(deltas.filter((_, i) => approved[i]))
  }

  const renderDelta = (d: GoalDelta) => {
    switch (d.op) {
      case 'add':
        return (
          <>
            <strong>Add new goal:</strong> {d.goal.title} ({d.goal.status})
          </>
        )
      case 'update': {
        const existing = existingGoals.find((g) => g.id === d.goalId)
        const newStatus = d.after.status
        return (
          <>
            <strong>Update:</strong> {existing?.title}
            {newStatus && existing && newStatus !== existing.status && (
              <>
                {' '}
                — {existing.status} → <strong>{newStatus}</strong>
              </>
            )}
          </>
        )
      }
      case 'retire': {
        const existing = existingGoals.find((g) => g.id === d.goalId)
        return (
          <>
            <strong>Retire:</strong> {existing?.title} ({d.reason ?? 'no reason'})
          </>
        )
      }
      case 'noop':
        return <em>No changes</em>
    }
  }

  const tooManyChanges = deltas.filter((d) => d.op !== 'noop').length > 2

  return (
    <div className="goal-diff-review">
      <header>
        <h2>The coach proposes these changes</h2>
        {tooManyChanges && (
          <div className="diff-warn">⚠ More than 2 changes — review carefully.</div>
        )}
      </header>
      <ul>
        {deltas.map((d, i) => (
          <li key={i}>
            <label>
              <input
                type="checkbox"
                checked={approved[i]}
                onChange={() => toggle(i)}
              />
              {renderDelta(d)}
            </label>
          </li>
        ))}
      </ul>
      <div className="diff-actions">
        <button className="btn-secondary" onClick={onSkipAll}>
          Skip all
        </button>
        <button className="btn-primary" onClick={handleConfirm}>
          Apply selected
        </button>
      </div>
    </div>
  )
}
