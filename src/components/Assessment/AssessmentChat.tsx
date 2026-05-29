// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — AssessmentChat
// First-time user's chat-based assessment. Wraps useCoachChat and hands off to
// LibraryConfirmation once the LLM has proposed an initial plan.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useCoachChat } from '../../hooks/useCoachChat'
import { useStore } from '../../store/useStore'
import { LibraryConfirmation } from './LibraryConfirmation'
import type { GoalDelta, CheckInRecord, Goal, ItemRef, TagValue } from '../../types/coach'

export function AssessmentChat() {
  const upsertGoal = useStore((s) => s.upsertGoal)
  const recordCheckIn = useStore((s) => s.recordCheckIn)
  const markAssessmentComplete = useStore((s) => s.markAssessmentComplete)
  const setPage = useStore((s) => s.setPage)

  const [pendingDeltas, setPendingDeltas] = useState<GoalDelta[] | null>(null)
  const [pendingRecord, setPendingRecord] = useState<CheckInRecord | null>(null)
  const [input, setInput] = useState('')

  const {
    messages,
    isStreaming,
    error,
    cumulativeCost,
    sendUserMessage,
    start,
  } = useCoachChat({
    kind: 'assessment',
    onComplete: (deltas, record) => {
      setPendingDeltas(deltas)
      setPendingRecord(record)
    },
  })

  useEffect(() => {
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

  const finalize = async (confirmedTags: { itemRef: ItemRef; tag: TagValue }[]) => {
    if (!pendingDeltas || !pendingRecord) return

    // Persist all add-deltas (initial plan)
    for (const d of pendingDeltas) {
      if (d.op === 'add') await upsertGoal(d.goal)
    }

    // Persist tags from the confirmation step
    const setItemTag = useStore.getState().setItemTag
    for (const { itemRef, tag } of confirmedTags) {
      await setItemTag(itemRef, tag)
    }

    await recordCheckIn(pendingRecord)
    await markAssessmentComplete()
    setPage('plan-dashboard')
  }

  // Once the LLM has emitted a plan, transition to the confirmation step.
  if (pendingDeltas && pendingRecord) {
    const proposedGoals: Goal[] = pendingDeltas.flatMap(d => d.op === 'add' ? [d.goal] : [])
    if (proposedGoals.length === 0) {
      // LLM returned no addable goals (validation rejected everything)
      return (
        <div className="assessment-chat">
          <header className="chat-header">
            <h2>Something went wrong</h2>
            <p className="chat-subtitle">
              The coach proposed a plan, but none of the items matched your library.
              Try restarting the assessment.
            </p>
          </header>
          <button
            className="chat-retry"
            onClick={() => {
              setPendingDeltas(null)
              setPendingRecord(null)
              start()
            }}
          >
            Restart assessment
          </button>
        </div>
      )
    }
    return (
      <LibraryConfirmation
        proposedGoals={proposedGoals}
        onConfirm={finalize}
      />
    )
  }

  return (
    <div className="assessment-chat">
      <header className="chat-header">
        <h2>Let's get started</h2>
        <p className="chat-subtitle">
          A few minutes of conversation, then your plan.
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
