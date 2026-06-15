// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — GuidedSession
// Full-screen sequenced practice for one goal. Walks the goal's supporting
// items, plays each with FretboardDiagram, and on a 3-button reflection logs a
// practiceEvent + upserts the item's tag, then auto-advances. Signal-first.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { reflectionToTag } from '../../engine/practiceSignal'
import { rollPatternToFretNotes, sectionToFretNotes } from '../../engine/rollToFretNotes'
import { getAllPatterns } from '../../data/rollPatterns'
import { LICK_LIBRARY } from '../../data/lickLibrary'
import { SONGS } from '../../data/songLibrary'
import { SCALE_LIBRARY } from '../../data/scaleLibrary'
import type { FretNote } from '../../data/fretboardNotes'
import type { ItemRef, Reflection } from '../../types/coach'

const REFLECTIONS: { value: Reflection; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'sloppy', label: 'Sloppy' },
  { value: 'new', label: 'New to me' },
]

// Resolve an ItemRef to playable tab notes + a display label.
// Mirrors the Library viewer's conversion. Chords have no tab → notes: [].
function resolveItem(ref: ItemRef): { notes: FretNote[]; label: string } {
  switch (ref.kind) {
    case 'roll': {
      const pattern = getAllPatterns().find((p) => p.id === ref.id)
      return pattern
        ? { notes: rollPatternToFretNotes(pattern), label: pattern.name }
        : { notes: [], label: ref.id }
    }
    case 'lick': {
      const lick = LICK_LIBRARY.find((l) => l.id === ref.id)
      return lick
        ? { notes: sectionToFretNotes([{ notes: lick.tab }]), label: lick.name }
        : { notes: [], label: ref.id }
    }
    case 'song-section': {
      const song = SONGS.find((s) => s.id === ref.songId)
      const section = song?.sections.find((s) => s.id === ref.sectionId)
      return song && section
        ? { notes: sectionToFretNotes(section.measures), label: `${song.name} — ${section.name}` }
        : { notes: [], label: `${ref.songId}/${ref.sectionId}` }
    }
    case 'scale': {
      const scale = SCALE_LIBRARY.find((s) => s.id === ref.id)
      return scale ? { notes: scale.notes, label: scale.name } : { notes: [], label: ref.id }
    }
    case 'chord':
      return { notes: [], label: ref.id }
  }
}

export function GuidedSession() {
  const activeSessionGoalId = useStore((s) => s.activeSessionGoalId)
  const goals = useStore((s) => s.goals)
  const logPracticeEvent = useStore((s) => s.logPracticeEvent)
  const setItemTag = useStore((s) => s.setItemTag)
  const setPage = useStore((s) => s.setPage)

  const goal = useMemo(
    () => goals.find((g) => g.id === activeSessionGoalId) ?? null,
    [goals, activeSessionGoalId],
  )

  // One session id per run (computed once on mount).
  const [sessionId] = useState(() => crypto.randomUUID())
  const [cursor, setCursor] = useState(0)
  const [practiced, setPracticed] = useState(0)

  const exit = () => setPage('plan-dashboard')

  if (!goal) {
    return (
      <div className="guided-session guided-session--empty">
        <p>No session selected.</p>
        <button className="btn-primary" onClick={exit}>Back to plan</button>
      </div>
    )
  }

  const items = goal.supportingItemRefs
  if (items.length === 0) {
    return (
      <div className="guided-session guided-session--empty">
        <p>Nothing to practice here yet.</p>
        <button className="btn-primary" onClick={exit}>Back to plan</button>
      </div>
    )
  }

  // Completion screen.
  if (cursor >= items.length) {
    return (
      <div className="guided-session guided-session--done">
        <h2>Practiced {practiced} {practiced === 1 ? 'item' : 'items'} 🎉</h2>
        <button className="btn-primary" onClick={exit}>Done</button>
      </div>
    )
  }

  const ref = items[cursor]
  const { notes, label } = resolveItem(ref)

  const advance = () => setCursor((c) => c + 1)

  // Advance the cursor synchronously first so the current item's buttons
  // unmount immediately — this closes the re-entrancy window where a rapid
  // second tap would double-log the same item. The captured ref / goal.id /
  // sessionId remain valid for this render's writes.
  const reflect = (reflection: Reflection) => {
    advance()
    setPracticed((n) => n + 1)
    void logPracticeEvent({ goalId: goal.id, sessionId, itemRef: ref, reflection })
    void setItemTag(ref, reflectionToTag(reflection))
  }

  return (
    <div className="guided-session">
      <header className="guided-session-header">
        <button className="guided-session-exit" onClick={exit}>✕ Exit</button>
        <span className="guided-session-progress">{cursor + 1} / {items.length}</span>
      </header>

      <h2 className="guided-session-item">{label}</h2>

      {notes.length > 0 ? (
        <FretboardDiagram notes={notes} bpm={100} />
      ) : (
        <p className="guided-session-noplayer">No tab for this item — practice it from memory.</p>
      )}

      <div className="guided-session-reflect">
        <p>How did that go?</p>
        <div className="guided-session-reflect-buttons">
          {REFLECTIONS.map((r) => (
            <button key={r.value} onClick={() => reflect(r.value)}>{r.label}</button>
          ))}
        </div>
        <button className="guided-session-skip" onClick={advance}>Skip</button>
      </div>
    </div>
  )
}
