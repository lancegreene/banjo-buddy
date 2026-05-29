// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — LibraryConfirmation (stub)
// Task 3.6 will implement the real library item confirmation/tagging UI.
// ─────────────────────────────────────────────────────────────────────────────

import type { Goal, ItemRef, TagValue } from '../../types/coach'

interface Props {
  proposedGoals: Goal[]
  onConfirm: (tags: { itemRef: ItemRef; tag: TagValue }[]) => void
}

export function LibraryConfirmation({ proposedGoals, onConfirm }: Props) {
  return (
    <div className="library-confirmation">
      <h2>Confirm your library items</h2>
      <p>Coming in Task 3.6. {proposedGoals.length} goals proposed.</p>
      <button onClick={() => onConfirm([])}>Skip tagging and generate plan</button>
    </div>
  )
}
