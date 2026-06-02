// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — CheckInPrompt
// Dashboard banner nudging a weekly check-in. Renders null unless a check-in is
// overdue (never done, or more than 7 days ago). Clicking routes to the
// check-in chat.
// ─────────────────────────────────────────────────────────────────────────────

import { useStore } from '../../store/useStore'

const CHECK_IN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export function CheckInPrompt() {
  const lastCheckInAt = useStore((s) => s.lastCheckInAt)
  const setPage = useStore((s) => s.setPage)

  const overdue =
    !lastCheckInAt ||
    Date.now() - new Date(lastCheckInAt).getTime() > CHECK_IN_INTERVAL_MS

  if (!overdue) return null

  return (
    <div className="check-in-prompt">
      <span>Time to check in — how did the week go?</span>
      <button onClick={() => setPage('check-in')}>Start check-in</button>
    </div>
  )
}
