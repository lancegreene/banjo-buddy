# Guided Session (Phase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "▶ Guided session" flow that walks a goal's supporting items and records purpose-built practice signal (what was practiced + how it felt), then feed that signal back into the coach's check-in context.

**Architecture:** A new synced Dexie table `practiceEvents` (one row per practiced item) is the signal store. A full-screen `GuidedSession` component sequences a goal's `supportingItemRefs`, plays each via the existing `FretboardDiagram`, and on a 3-button reflection writes a `practiceEvent` + upserts the item's tag. A pure `practiceSignal` engine module owns the reflection→tag mapping and the recent-activity aggregation; the Phase-4 loader in `useCoachChat` is rewired to read `practiceEvents` through it.

**Tech Stack:** React 18 + TypeScript, Zustand, Dexie v16/IndexedDB, Vitest for pure functions. Reuses `FretboardDiagram` + `rollToFretNotes` converters.

**Branch:** `feat/guided-session` (already created off the MVP branch; the design spec commit is its tip).

**Verification conventions (this repo):**
- Typecheck: `npx tsc -p tsconfig.app.json --noEmit`. The branch carries a **pre-existing baseline of 24 errors in 7 unrelated files** (BanjoAnatomy, CircleOfFifths, TabOverlayEditor, Library, rhythmAnalysis, tabParser, useWaveSurfer). Success for every task = **no NEW errors** (nothing referencing the files you touched). Do NOT fix the baseline.
- Tests: `npx vitest run <file>` (or `npm test` for all). Only pure-function engine modules are unit-tested.
- Build: `npm run build` (vite only, no tsc gate).
- There is **no UI test suite** — verify components via typecheck + build, not tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/coach.ts` | Modify | Add `Reflection` + `PracticeEvent` types |
| `src/engine/practiceSignal.ts` | Create | Pure: `reflectionToTag()` + `aggregateRecentActivity()` |
| `src/engine/practiceSignal.test.ts` | Create | Vitest for the two pure functions |
| `src/db/db.ts` | Modify | Dexie v16: `practiceEvents` table + declaration |
| `src/db/sync.ts` | Modify | Register `practiceEvents` in push map + add pull block |
| `src/store/useStore.ts` | Modify | `activeSessionGoalId` + setter, `logPracticeEvent`, `'guided-session'` page |
| `src/components/Plan/GuidedSession.tsx` | Create | Full-screen sequenced practice + reflection capture |
| `src/App.tsx` | Modify | Route `'guided-session'`; hide nav |
| `src/components/Plan/PlanDashboard.tsx` | Modify | Pass `onStartSession` to `GoalCard` |
| `src/hooks/useCoachChat.ts` | Modify | Rewire recent-activity loader to `practiceEvents` |
| `src/App.css` | Modify | Guided-session styles |

---

### Task 1: Types — `Reflection` + `PracticeEvent`

**Files:**
- Modify: `src/types/coach.ts`

- [ ] **Step 1: Add the types**

Append after the existing `CheckInRecord` interface in `src/types/coach.ts`:

```ts
export type Reflection = 'solid' | 'sloppy' | 'new'

// One row per item practiced inside a guided session. Purpose-built coach
// signal: carries the real ItemRef so the check-in can name actual items.
export interface PracticeEvent {
  id: string                 // uuid
  userId: string             // owner (matches userProfiles.id)
  goalId: string             // the goal the session was launched from
  sessionId: string          // groups events from one guided-session run
  itemRef: ItemRef           // the real library item practiced
  reflection: Reflection     // how it felt
  completedAt: string        // ISO
}
```

(`ItemRef` is already defined earlier in this file — no new import.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: error count unchanged at the 24-error baseline; nothing referencing `types/coach.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/coach.ts
git commit -m "feat(guided): add PracticeEvent + Reflection types"
```

---

### Task 2: `practiceSignal` engine (TDD)

**Files:**
- Create: `src/engine/practiceSignal.ts`
- Test: `src/engine/practiceSignal.test.ts`

This is a pure module — follow TDD.

- [ ] **Step 1: Write the failing test**

Create `src/engine/practiceSignal.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { reflectionToTag, aggregateRecentActivity } from './practiceSignal'
import type { PracticeEvent } from '../types/coach'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-06-05T12:00:00.000Z').getTime()

function ev(partial: Partial<PracticeEvent>): PracticeEvent {
  return {
    id: crypto.randomUUID(),
    userId: 'u1',
    goalId: 'g1',
    sessionId: 's1',
    itemRef: { kind: 'roll', id: 'forward-roll' },
    reflection: 'solid',
    completedAt: new Date(NOW).toISOString(),
    ...partial,
  }
}

describe('reflectionToTag', () => {
  it('maps each reflection to its tag', () => {
    expect(reflectionToTag('solid')).toBe('got-it')
    expect(reflectionToTag('sloppy')).toBe('working')
    expect(reflectionToTag('new')).toBe('new')
  })
})

describe('aggregateRecentActivity', () => {
  it('returns empty for no events', () => {
    expect(aggregateRecentActivity([], NOW)).toEqual([])
  })

  it('groups by itemRef, counts, and tracks the latest timestamp', () => {
    const older = new Date(NOW - 2 * DAY).toISOString()
    const newer = new Date(NOW - 1 * DAY).toISOString()
    const out = aggregateRecentActivity(
      [
        ev({ completedAt: older }),
        ev({ completedAt: newer }),
        ev({ itemRef: { kind: 'lick', id: 'g-lick' }, completedAt: older }),
      ],
      NOW,
    )
    const roll = out.find((e) => e.itemRef.id === 'forward-roll')!
    expect(roll.count).toBe(2)
    expect(roll.lastAt).toBe(newer)
    expect(out.find((e) => e.itemRef.id === 'g-lick')!.count).toBe(1)
  })

  it('excludes events older than 14 days', () => {
    const out = aggregateRecentActivity(
      [ev({ completedAt: new Date(NOW - 15 * DAY).toISOString() })],
      NOW,
    )
    expect(out).toEqual([])
  })

  it('sorts by count descending and caps at 20 groups', () => {
    const events: PracticeEvent[] = []
    // 25 distinct items, item-i practiced (i+1) times
    for (let i = 0; i < 25; i++) {
      for (let n = 0; n <= i; n++) {
        events.push(ev({ itemRef: { kind: 'roll', id: `roll-${i}` } }))
      }
    }
    const out = aggregateRecentActivity(events, NOW)
    expect(out).toHaveLength(20)
    expect(out[0].count).toBeGreaterThanOrEqual(out[1].count)
    expect(out[0].itemRef.id).toBe('roll-24') // most-practiced
  })

  it('keys song-section refs by songId/sectionId', () => {
    const out = aggregateRecentActivity(
      [
        ev({ itemRef: { kind: 'song-section', songId: 'cripple', sectionId: 'A' } }),
        ev({ itemRef: { kind: 'song-section', songId: 'cripple', sectionId: 'A' } }),
      ],
      NOW,
    )
    expect(out).toHaveLength(1)
    expect(out[0].itemRef).toEqual({ kind: 'song-section', id: 'cripple/A' })
    expect(out[0].count).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/practiceSignal.test.ts`
Expected: FAIL — cannot resolve `./practiceSignal` / functions not defined.

- [ ] **Step 3: Implement the module**

Create `src/engine/practiceSignal.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Practice signal (pure)
// Reflection→tag mapping + recent-activity aggregation over practiceEvents.
// No React, no Dexie — takes plain data in, returns plain data out.
// ─────────────────────────────────────────────────────────────────────────────

import type { PracticeEvent, Reflection, ItemRef, TagValue } from '../types/coach'
import type { RecentActivityEntry } from './coachPrompts'

const ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const MAX_ACTIVITY_GROUPS = 20

// The 3 reflection buttons map onto the existing item-tag vocabulary so the
// coach sees reflections through the itemTags it already reads.
const REFLECTION_TAG: Record<Reflection, TagValue> = {
  solid: 'got-it',
  sloppy: 'working',
  new: 'new',
}

export function reflectionToTag(reflection: Reflection): TagValue {
  return REFLECTION_TAG[reflection]
}

// Flatten an ItemRef to the { kind, id } pair used by RecentActivityEntry and
// the library catalog (song-section id = "songId/sectionId").
function refToKindId(ref: ItemRef): { kind: string; id: string } {
  if (ref.kind === 'song-section') {
    return { kind: 'song-section', id: `${ref.songId}/${ref.sectionId}` }
  }
  return { kind: ref.kind, id: ref.id }
}

/**
 * Aggregate practice events from the last 14 days into RecentActivityEntry[]:
 * one entry per distinct item, with practice count and most-recent timestamp,
 * sorted by count descending and capped at the top 20.
 */
export function aggregateRecentActivity(
  events: PracticeEvent[],
  now: number,
): RecentActivityEntry[] {
  const cutoff = now - ACTIVITY_WINDOW_MS
  const byKey = new Map<string, RecentActivityEntry>()

  for (const e of events) {
    if (new Date(e.completedAt).getTime() < cutoff) continue
    const { kind, id } = refToKindId(e.itemRef)
    const key = `${kind}:${id}`
    const existing = byKey.get(key)
    if (existing) {
      existing.count += 1
      if (e.completedAt > existing.lastAt) existing.lastAt = e.completedAt
    } else {
      byKey.set(key, { itemRef: { kind, id }, count: 1, lastAt: e.completedAt })
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ACTIVITY_GROUPS)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/practiceSignal.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/engine/practiceSignal.ts src/engine/practiceSignal.test.ts
git commit -m "feat(guided): add practiceSignal engine (reflection→tag + recent-activity aggregation) + tests"
```

---

### Task 3: Dexie v16 — `practiceEvents` table

**Files:**
- Modify: `src/db/db.ts`

- [ ] **Step 1: Import the type and declare the table**

In `src/db/db.ts`, extend the coach import (currently line 3):

```ts
import type { Goal, ItemTag, CheckInRecord, PracticeEvent } from '../types/coach'
```

Add a table declaration field to the `BanjoBuddyDB` class, immediately after the `checkInRecords` declaration:

```ts
  checkInRecords!: Table<CheckInRecord>
  practiceEvents!: Table<PracticeEvent>
```

- [ ] **Step 2: Add the v16 version block**

Immediately after the `this.version(15).stores({ ... })` block (and before the closing `}` of the constructor), add:

```ts
    // v16: Guided session — add practiceEvents (purpose-built practice signal).
    // No data migration: only adds one table.
    this.version(16).stores({
      // Carried forward from v15
      userProfiles:       'id, role',
      practiceSessions:   'id, userId, startedAt',
      sessionItems:       'id, sessionId, completedAt, goalId',
      recordings:         'id, sessionItemId, skillId, createdAt',
      streakRecords:      'id, userId, [userId+date]',
      noteAccuracyRecords:'id, sessionItemId, createdAt',
      achievements:       '++id, achievementId, userId',
      customRollPatterns: 'id, createdBy, createdAt',
      tabTrainingPairs:   'id, createdAt',
      goals:              'id, userId, status, updatedAt',
      itemTags:           'id, userId, updatedAt',
      checkInRecords:     'id, userId, kind, startedAt',
      // New guided-session table
      practiceEvents:     'id, userId, goalId, completedAt, sessionId',
    })
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 24-error baseline, nothing referencing `db.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/db/db.ts
git commit -m "feat(guided): add Dexie v16 practiceEvents table"
```

---

### Task 4: Sync wiring for `practiceEvents`

**Files:**
- Modify: `src/db/sync.ts`

Push is queue-driven: a record syncs when (a) its table is in `TABLE_MAP` and (b) a writer calls `enqueueSync` (the store action in Task 5 does this). Pull needs an explicit per-table block.

- [ ] **Step 1: Register the table in the push map**

In `src/db/sync.ts`, add to the `TABLE_MAP` object (after the `itemTags: 'item_tags',` line):

```ts
  goals: 'goals',
  itemTags: 'item_tags',
  practiceEvents: 'practice_events',
```

- [ ] **Step 2: Add a pull block**

In `pullRemoteChanges`, the `itemTags` pull block ends at its closing `}` (right before the `// Update sync timestamp` block). Insert this block immediately after the `itemTags` block and before `// Update sync timestamp`:

```ts
  // Pull practice events (guided session). Append-only + immutable, so pull
  // anything newer than last sync and insert if we don't already have it.
  const { data: remotePracticeEvents } = await supabase
    .from('practice_events')
    .select('*')
    .eq('user_id', userId)
    .gt('completed_at', lastSynced)

  if (remotePracticeEvents) {
    for (const remote of remotePracticeEvents) {
      const local = toCamel(remote) as unknown as PracticeEvent
      const existing = await db.practiceEvents.get(local.id)
      if (!existing) {
        await db.practiceEvents.put(local)
        pulled++
      }
    }
  }
```

The surrounding `userId`, `lastSynced`, and `pulled` identifiers are already in scope (the goals/itemTags blocks use them). Unlike `goals`/`itemTags`, this filters on `completed_at` (PracticeEvent has no `updatedAt`), and the merge is insert-only since events are never mutated.

Add `PracticeEvent` to the existing coach-types import at the top of `sync.ts` — it already imports the sibling types, e.g.:

```ts
import type { PracticeSession, SessionItem, NoteAccuracyRecord, Goal, ItemTag, PracticeEvent } from '../types/coach'
```

Match the file's actual existing import line (some of those types come from `'../db/db'` rather than `'../types/coach'`); only add `PracticeEvent` to whichever line already imports `Goal`/`ItemTag` from `'../types/coach'`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: baseline 24, nothing referencing `sync.ts`.

- [ ] **Step 4: Record the Supabase DDL**

The remote table must exist for push/pull to succeed. Add this SQL to the PR description (and run it in the Supabase SQL editor) — mirrors the `goals`/`item_tags` tables:

```sql
create table if not exists practice_events (
  id uuid primary key,
  user_id uuid not null,
  goal_id text not null,
  session_id text not null,
  item_ref jsonb not null,
  reflection text not null,
  completed_at timestamptz not null
);
```

(No code change for this step — it is an operational note. If guest/local-only, sync silently no-ops and this is irrelevant.)

- [ ] **Step 5: Commit**

```bash
git add src/db/sync.ts
git commit -m "feat(guided): sync practiceEvents (push map + pull block)"
```

---

### Task 5: Store — session state, `logPracticeEvent`, page route

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Add `'guided-session'` to the `Page` union**

In the `export type Page = ...` union near the top of `src/store/useStore.ts`, add the new value after `'check-in'`:

```ts
  | 'check-in'
  | 'guided-session'
  | 'plan-dashboard'
```

- [ ] **Step 2: Declare state + actions on the store interface**

In the store state interface (the `interface` that declares `goals`, `upsertGoal`, `setItemTag`, etc.), add:

```ts
  activeSessionGoalId: string | null
  setActiveSessionGoal: (goalId: string | null) => void
  logPracticeEvent: (
    input: Omit<PracticeEvent, 'id' | 'userId' | 'completedAt'>,
  ) => Promise<void>
```

Ensure the imports at the top of `useStore.ts` include `PracticeEvent` (extend the existing `import type { ... } from '../types/coach'`).

- [ ] **Step 3: Implement the initial state + actions**

Add the initial value next to the other coach state (e.g. near `lastCheckInAt: null,`):

```ts
  activeSessionGoalId: null,
```

Add the actions next to `setItemTag` / `recordCheckIn` in the store implementation:

```ts
  setActiveSessionGoal: (goalId) => set({ activeSessionGoalId: goalId }),

  logPracticeEvent: async (input) => {
    const userId = get().user?.id
    if (!userId) return
    const event: PracticeEvent = {
      id: crypto.randomUUID(),
      userId,
      completedAt: nowISO(),
      ...input,
    }
    await db.practiceEvents.put(event)
    enqueueSync('practiceEvents', event.id, 'upsert', event as unknown as Record<string, unknown>)
  },
```

(`nowISO` and `enqueueSync` are already imported in this file — `enqueueSync` is used by `setProfile`/`loadUser` paths; `nowISO` by the coach actions. Confirm both imports exist; add them if missing: `enqueueSync` from `'../db/sync'`, `nowISO` from `'../db/db'`.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: baseline 24, nothing referencing `useStore.ts`. (Adding `'guided-session'` to `Page` will surface a TS error in `App.tsx`'s exhaustive `PageContent` switch until Task 7 — that is expected and handled there. If you run typecheck now it may report one error in `App.tsx`; that is the only acceptable new error and Task 7 removes it.)

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat(guided): add activeSessionGoalId + logPracticeEvent + guided-session page"
```

---

### Task 6: `GuidedSession` component

**Files:**
- Create: `src/components/Plan/GuidedSession.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Implement the component**

Create `src/components/Plan/GuidedSession.tsx`:

```tsx
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

  const reflect = async (reflection: Reflection) => {
    await logPracticeEvent({ goalId: goal.id, sessionId, itemRef: ref, reflection })
    await setItemTag(ref, reflectionToTag(reflection))
    setPracticed((n) => n + 1)
    advance()
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
```

Note: `FretboardDiagram` owns its own play/tap controls (`autoPlay` defaults false; it shows "Tap to advance notes"). We pass a fixed `bpm={100}`; no BPM control in v1 (YAGNI).

- [ ] **Step 2: Add styles to `src/App.css`**

Append at the end of `src/App.css`:

```css
/* ─── Guided Session ──────────────────────────────────────────────────────── */
.guided-session {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
}
.guided-session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.guided-session-exit {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
}
.guided-session-progress {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}
.guided-session-item { text-align: center; margin: 0; }
.guided-session-noplayer { text-align: center; color: var(--text-secondary); padding: 24px; }
.guided-session-reflect { text-align: center; display: flex; flex-direction: column; gap: 10px; }
.guided-session-reflect-buttons { display: flex; gap: 8px; justify-content: center; }
.guided-session-reflect-buttons button {
  flex: 1;
  max-width: 160px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-primary, rgba(255,255,255,0.2));
  background: var(--bg-secondary, #2d4a5e);
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}
.guided-session-skip {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  align-self: center;
}
.guided-session--empty, .guided-session--done {
  align-items: center;
  justify-content: center;
  text-align: center;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: baseline 24 (plus possibly the one expected `App.tsx` switch error from Task 5, removed in Task 7); nothing referencing `GuidedSession.tsx`. If a converter/data import name mismatches (e.g. `lick.tab`, `section.measures`, `scale.notes`), open `src/components/Library/Library.tsx` lines 128–162 and match its exact field usage — it does the identical resolution.

- [ ] **Step 4: Commit**

```bash
git add src/components/Plan/GuidedSession.tsx src/App.css
git commit -m "feat(guided): add GuidedSession component"
```

---

### Task 7: Wire routing + dashboard launch button

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Plan/PlanDashboard.tsx`

- [ ] **Step 1: Route the page in `App.tsx`**

Add the import alongside the other component imports (near `import { CheckInChat } ...`):

```tsx
import { GuidedSession } from './components/Plan/GuidedSession'
```

In the `PageContent` switch, add after the `case 'check-in':` block:

```tsx
    case 'guided-session':
      return <GuidedSession />
```

In the `showNav` computation, add the guided-session exclusion (full-screen, like the chat pages):

```tsx
    page !== 'assessment' &&
    page !== 'check-in' &&
    page !== 'guided-session'
```

- [ ] **Step 2: Launch the session from `PlanDashboard`**

In `src/components/Plan/PlanDashboard.tsx`, add a store selector near the existing ones:

```tsx
  const setActiveSessionGoal = useStore((s) => s.setActiveSessionGoal)
```

Add a handler next to `handleItemClick`:

```tsx
  const handleStartSession = (goal: Goal) => {
    setActiveSessionGoal(goal.id)
    setPage('guided-session')
  }
```

Pass `onStartSession={handleStartSession}` to EVERY `<GoalCard ... />` usage (there are several — focus, explore, backlog, mastered, shelved). Example:

```tsx
<GoalCard key={g.id} goal={g} onItemClick={handleItemClick} onStartSession={handleStartSession} />
```

(`GoalCard` already renders the "▶ Guided session" button only when `onStartSession` is provided — no change needed in `GoalCard`.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: back to the **24-error baseline exactly** — the `App.tsx` switch is now exhaustive again, and no new errors reference `App.tsx` or `PlanDashboard.tsx`.

Run: `npm run build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Plan/PlanDashboard.tsx
git commit -m "feat(guided): route guided-session page + wire dashboard launch button"
```

---

### Task 8: Rewire the recent-activity loader to `practiceEvents`

**Files:**
- Modify: `src/hooks/useCoachChat.ts`

The Phase-4 loader currently queries `db.sessionItems` and aggregates inline by `skillId`. Replace it with a `practiceEvents` query passed through the tested `aggregateRecentActivity`.

- [ ] **Step 1: Swap the loader**

In `src/hooks/useCoachChat.ts`, find the block added in Phase 4 — the comment starting `// Load the last 14 days of practice from Dexie...` down through the construction of `recentActivity` (the `db.sessionItems.where('completedAt')...` query, the `byKey` Map loop, and the `.sort(...).slice(0, 20)`). Replace that entire block with:

```ts
    // Load the last 14 days of guided-session practice and aggregate it into
    // the shape buildSystemPrompt expects, keyed by the real ItemRef.
    const cutoffIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const events = await db.practiceEvents
      .where('completedAt')
      .aboveOrEqual(cutoffIso)
      .toArray()
    const recentActivity = aggregateRecentActivity(events, Date.now())
```

- [ ] **Step 2: Update imports**

Add the aggregation import near the other engine imports:

```ts
import { aggregateRecentActivity } from '../engine/practiceSignal'
```

Remove the now-unused `RecentActivityEntry` import if it was only used by the old inline loop (the type is no longer referenced in this file — `aggregateRecentActivity` returns it). Leave `db` imported (still used). Verify no other references to the removed `byKey`/`RecentActivityEntry` remain.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 24-error baseline; nothing referencing `useCoachChat.ts`. (A `TS6133` unused-import error means you left a dangling `RecentActivityEntry` import — remove it.)

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS — the existing suites plus the new `practiceSignal` tests (the coach loader change is covered indirectly by `aggregateRecentActivity` tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCoachChat.ts
git commit -m "feat(guided): feed real practiceEvents into the coach recent-activity context"
```

---

### Task 9: End-to-end verification

**Files:**
- None (verification only)

- [ ] **Step 1: Typecheck — no new errors**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: exactly the 24-error baseline in the 7 known unrelated files; zero referencing any file touched in this plan.

- [ ] **Step 2: Tests**

Run: `npm test`
Expected: PASS, including `practiceSignal.test.ts`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Manual smoke test (dev server)**

Run `npm run dev`. With an assessed profile that has at least one goal with supporting items:

1. Dashboard → a goal card now shows "▶ Guided session".
2. Click it → full-screen GuidedSession, nav hidden, first item with tab + reflection buttons.
3. Tap a reflection → advances; repeat to the end → "Practiced N items 🎉" → Done → dashboard.
4. Devtools → IndexedDB → `BanjoBuddyDB` → `practiceEvents`: one row per reflection, with the real `itemRef`, `goalId`, `sessionId`, `reflection`.
5. `itemTags`: the practiced items now carry the mapped tag (solid→got-it, etc.).
6. Trigger a check-in (Refresh plan). Inspect the LLM request payload (Network tab) → `recentActivity` is populated with the real items just practiced.

- [ ] **Step 5: Commit any fixes found**

```bash
git add -A
git commit -m "fix(guided): address issues found during end-to-end verification"
```

(If nothing needed fixing, skip this commit.)
