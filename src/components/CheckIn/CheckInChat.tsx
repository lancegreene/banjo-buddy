// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — CheckInChat
// Weekly check-in chat. Wraps useCoachChat (kind: 'checkin') and, once the LLM
// proposes goal changes, surfaces a GoalDiffReview step before committing them.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useCoachChat } from '../../hooks/useCoachChat'
import { useStore } from '../../store/useStore'
import { applyGoalDelta } from '../../engine/coachAdapter'
import { GoalDiffReview } from './GoalDiffReview'
import type { GoalDelta, CheckInRecord } from '../../types/coach'

export function CheckInChat() {
  const goals = useStore((s) => s.goals)
  const upsertGoal = useStore((s) => s.upsertGoal)
  const recordCheckIn = useStore((s) => s.recordCheckIn)
  const setPage = useStore((s) => s.setPage)

  const [pendingDeltas, setPendingDeltas] = useState<GoalDelta[] | null>(null)
  const [pendingRecord, setPendingRecord] = useState<CheckInRecord | null>(null)
  const [input, setInput] = useState('')
  const [noopCommitted, setNoopCommitted] = useState(false)

  const {
    messages,
    isStreaming,
    error,
    cumulativeCost,
    sendUserMessage,
    start,
  } = useCoachChat({
    kind: 'checkin',
    onComplete: (deltas, record) => {
      setPendingDeltas(deltas)
      setPendingRecord(record)
    },
  })

  // Kick off the conversation exactly once on mount. `start` gets a new
  // identity on every render (its deps churn with chat state), so an
  // unguarded [start] effect re-fires per render — an infinite loop of
  // billable API calls.
  const kickedOff = useRef(false)
  useEffect(() => {
    if (kickedOff.current) return
    kickedOff.current = true
    start()
  }, [start])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendUserMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const fakeEvt = { preventDefault: () => {} } as React.FormEvent
      handleSubmit(fakeEvt)
    }
  }

  const handleConfirmDeltas = async (approvedDeltas: GoalDelta[]) => {
    let updated = goals
    for (const d of approvedDeltas) {
      updated = applyGoalDelta(d, updated)
    }
    for (const g of updated) {
      await upsertGoal(g)
    }
    if (pendingRecord) await recordCheckIn(pendingRecord)
    setPage('plan-dashboard')
  }

  // Whether the LLM proposed any actionable change (i.e. a non-noop delta).
  const hasActionableDeltas =
    pendingDeltas != null && pendingDeltas.some((d) => d.op !== 'noop')

  // No-actionable-changes case: deltas arrived but every one is a noop (or empty).
  // Commit the check-in record (resets the 7-day clock) from an effect so we never
  // setState during render. Guard with noopCommitted so it fires exactly once.
  const noActionableChanges = pendingDeltas != null && !hasActionableDeltas
  useEffect(() => {
    if (noActionableChanges && !noopCommitted) {
      setNoopCommitted(true)
      handleConfirmDeltas([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noActionableChanges, noopCommitted])

  // Actionable changes → review/approve step.
  if (hasActionableDeltas && pendingDeltas) {
    return (
      <GoalDiffReview
        deltas={pendingDeltas}
        existingGoals={goals}
        onConfirm={handleConfirmDeltas}
        onSkipAll={() => handleConfirmDeltas([])}
      />
    )
  }

  // No actionable changes → brief acknowledgement while the effect commits.
  if (noActionableChanges) {
    return (
      <div className="check-in-chat">
        <header className="chat-header">
          <h2>Weekly check-in</h2>
          <p className="chat-subtitle">No changes this week — carry on!</p>
        </header>
      </div>
    )
  }

  return (
    <div className="check-in-chat">
      <header className="chat-header">
        <h2>Weekly check-in</h2>
        <p className="chat-subtitle">
          Let's review how the week went and tune your plan.
        </p>
      </header>

      <div className="chat-transcript">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
            {m.content}
          </div>
        ))}
        {isStreaming && (
          <div className="chat-msg chat-msg--assistant chat-msg--typing">…</div>
        )}
        {error && <div className="chat-error">{error}</div>}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="Type your reply..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          rows={2}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>Send</button>
      </form>

      <footer className="chat-footer">
        <span className="chat-cost">~${cumulativeCost.toFixed(3)} so far</span>
      </footer>
    </div>
  )
}
