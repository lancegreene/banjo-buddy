# Banjo Buddy — Guided Session (Phase 5)

**Date:** 2026-06-04
**Status:** Approved
**Plan source:** Phase 5 of `docs/superpowers/specs/2026-05-27-coach-overhaul-design.md` (deferred from the MVP). Builds on the completed Phases 0–4.

## Problem

The coach-overhaul MVP (Phases 0–4) shipped the assessment, plan dashboard, and weekly check-in. But the check-in runs on empty: nothing in the app records what the user actually practiced. The Phase 4 recent-activity loader reads the legacy `sessionItems` table, which (a) has no real library item reference and (b) is never written post-Phase-0. The coach therefore cannot say "you spent last week on the forward roll" — it has no activity or reflection signal to draw on.

Phase 5 closes that loop. The "▶ Guided session" affordance (already stubbed on `GoalCard` via the optional `onStartSession` prop) becomes a focused flow that walks a goal's supporting items and, critically, **captures the practice signal** — what was practiced and how it felt — in a purpose-built, coach-readable form.

## Goals & non-goals

**Primary goal:** generate coach signal. The sequenced UI is the vehicle; the logged `practiceEvents` + reflection-driven tag updates are the payoff. Success = after a guided session, a subsequent check-in can reference real items and how they felt.

**Non-goals (YAGNI for v1):**
- No timers, rep counts, BPM targets, or auto-play sequencing.
- No scoring, accuracy, or audio detection (that engine stays dormant).
- No separate session-scoring model beyond a grouping `sessionId`.
- Not extracting a shared `ItemPlayer` from the Library page (optional later cleanup).
- Phase 6 (manual inline tag editing across the app) and Phase 7 (polish) remain out of scope.

## Design

### Flow

```
Goal card on dashboard
  └─ Tap "▶ Guided session"
      └─ GuidedSession (full-screen, nav hidden)
          ├─ For each supporting item, in order:
          │    item name + progress ("2 / 4")
          │    + FretboardDiagram (tab player) + play/BPM controls
          │    + "How did that go?"  [ Solid ] [ Sloppy ] [ New to me ]   (+ Skip)
          │      └─ tap reflection → log practiceEvent + upsert itemTag → auto-advance
          └─ After last item → "Practiced N items 🎉" → exit to dashboard
```

"Auto-advance" means advance-on-reflection: tapping a reflection button is what moves to the next item. "Skip" advances without logging.

### 1. Data model — `practiceEvents` table (Dexie v16)

One row per practiced item:

```ts
export type Reflection = 'solid' | 'sloppy' | 'new'

export interface PracticeEvent {
  id: string                 // uuid
  userId: string             // owner (matches userProfiles.id)
  goalId: string             // the goal this session was launched from
  sessionId: string          // groups events from one guided-session run (uuid per run)
  itemRef: ItemRef           // the real library item practiced
  reflection: Reflection     // how it felt
  completedAt: string        // ISO
}
```

- **Dexie v16** adds `practiceEvents` indexed `'id, userId, goalId, completedAt, sessionId'`. No other table changes; v15 stays intact.
- **Synced** to Supabase table `practice_events` (camelCase ↔ snake_case via the existing `toSnake`/`toCamel` path), registered alongside `goals` and `itemTags`. Rationale: the check-in must see activity regardless of which device practiced. `itemRef` serializes as a JSON column (same approach as `goals.supportingItemRefs`).
- New `PracticeEvent` and `Reflection` types live in `src/types/coach.ts`.

### 2. Reflection → tag bridge

The three reflection buttons map onto the existing `TagValue` vocabulary. Tapping one performs **two** writes: append a `PracticeEvent` and upsert the item's tag via the existing `setItemTag` action.

| Button label | `Reflection` | `TagValue` written |
|---|---|---|
| Solid | `solid` | `got-it` |
| Sloppy | `sloppy` | `working` |
| New to me | `new` | `new` |

Rationale: `itemTags` is already serialized into the coach's prompt context (`buildSystemPrompt`), so reflections influence the next check-in with zero new prompt wiring. The `practiceEvents` log then layers counts and recency on top via the recent-activity loader (section 4).

The pure mapping `reflection → TagValue` lives in an engine module (`src/engine/practiceSignal.ts`) so it is unit-testable and reused by any future surface.

### 3. `GuidedSession.tsx`

`src/components/Plan/GuidedSession.tsx` — full-screen, rendered like the chat pages (nav hidden).

- **Self-contained (no props).** Like the other page components, it reads from the store: resolves the active goal as `goals.find(g => g.id === activeSessionGoalId)`, and exits by calling `setPage('plan-dashboard')`. This keeps the `App.tsx` page switch a simple `case 'guided-session': return <GuidedSession />` with no goal-plumbing. If `activeSessionGoalId` is unset or unresolvable, it renders a brief "No session selected" state with an exit button.
- Walks the resolved goal's `supportingItemRefs` in order via a local cursor index.
- **Per item:** renders the item name, a progress indicator ("2 / 4"), the tab player (`FretboardDiagram` fed by the pure converters `rollPatternToFretNotes` / `lickToFretNotes` / `sectionToFretNotes` from `engine/rollToFretNotes.ts`), play/BPM controls, and a "How did that go?" row with the three reflection buttons plus a "Skip" link.
- **On reflection tap:** call `logPracticeEvent` (store action) with `{ goalId, sessionId, itemRef, reflection }`, upsert the tag, then advance the cursor. "Skip" advances without writing.
- **Completion:** after the last item, show a one-line summary and a "Done" button that calls `setPage('plan-dashboard')`.
- An "Exit" affordance is available at any point (returns to dashboard; events already logged persist).
- Items whose `itemRef.kind` has no tab representation (e.g. `chord`) fall back to a static diagram or a name-only card with reflection buttons — the flow never blocks on a missing player.
- A new page value `'guided-session'` is added to the `Page` union (`useStore.ts`) and routed in `App.tsx` (`case 'guided-session': return <GuidedSession ... />`); it is added to the `showNav` exclusion list. The active goal is held in store state `activeSessionGoalId` (the component resolves the `Goal` from `goals`).

### 4. Recent-activity loader rewire

The Phase 4 loader in `useCoachChat` currently reads `sessionItems` keyed on the legacy `skillId`. Replace it with a loader over `practiceEvents`:

- Query `practiceEvents` for the last 14 days (`completedAt` index).
- Aggregate by the **real** `itemRef` (composite key, same convention as `setItemTag`/`itemCatalog`): produce `RecentActivityEntry[]` with the true `itemRef`, `count`, and `lastAt` (max `completedAt`). Take the top ~20 by count.
- Extract the aggregation into a **pure function** (e.g. `aggregateRecentActivity(events, now)` in `src/engine/practiceSignal.ts`) so it is Vitest-testable; the hook just queries Dexie and calls it. This replaces the inline, untested loader.

`RecentActivityEntry` already has the shape `{ itemRef: { kind: string; id: string }; count: number; lastAt: string }`, so the coach prompt and tool schemas need no change — the data simply becomes real.

### 5. Store + sync

- **Store (`useStore.ts`):** add `activeSessionGoalId: string | null` + `setActiveSessionGoal(id)`; `logPracticeEvent(event)` (Dexie `practiceEvents.put` + sync enqueue); a loader is not required for the dashboard (events are read only by the coach loader), keeping the store surface minimal.
- **Sync (`sync.ts`):** register `practiceEvents` in the push/pull registry with the `goals`/`itemTags` mapping; add the Supabase `practice_events` table DDL to the migration notes.

## Architecture

### New files

| File | Type | Responsibility |
|---|---|---|
| `src/engine/practiceSignal.ts` | pure | `reflectionToTag(reflection)` mapping + `aggregateRecentActivity(events, now)` |
| `src/engine/practiceSignal.test.ts` | test | Vitest for the two pure functions |
| `src/components/Plan/GuidedSession.tsx` | UI | Full-screen sequenced practice + reflection capture |

### Modified files

| File | Change |
|---|---|
| `src/types/coach.ts` | Add `PracticeEvent`, `Reflection` |
| `src/db/db.ts` | Dexie v16: add `practiceEvents` table + `PracticeEvent` declaration |
| `src/db/sync.ts` | Register `practiceEvents` (synced) |
| `src/store/useStore.ts` | `activeSessionGoalId` + setter; `logPracticeEvent`; `'guided-session'` in `Page` union |
| `src/App.tsx` | Route `'guided-session'`; add to `showNav` exclusions |
| `src/components/Plan/PlanDashboard.tsx` | Pass `onStartSession` to `GoalCard` |
| `src/hooks/useCoachChat.ts` | Rewire recent-activity loader to `practiceEvents` via `aggregateRecentActivity` |

### Data flow

```
User taps "▶ Guided session" on a GoalCard
  → store.setActiveSessionGoal(goal.id); setPage('guided-session')
    → GuidedSession walks goal.supportingItemRefs
      → per item: FretboardDiagram(player) + reflection buttons
        → tap reflection:
            store.logPracticeEvent({ goalId, sessionId, itemRef, reflection })  → Dexie practiceEvents + sync enqueue
            store.setItemTag(itemRef, reflectionToTag(reflection))               → Dexie itemTags + sync enqueue
            advance cursor
      → Done/Exit → setPage('plan-dashboard')

Later, on a check-in:
  useCoachChat → db.practiceEvents (last 14d) → aggregateRecentActivity()
    → RecentActivityEntry[] with real itemRefs → buildSystemPrompt
      → coach references actual practiced items + their tags
```

## Error handling

| Failure mode | Behavior |
|---|---|
| `goal.supportingItemRefs` empty | GuidedSession shows "Nothing to practice here yet" + exit; no crash |
| Item ref has no tab representation | Fall back to name-only card with reflection buttons; flow continues |
| Dexie write fails mid-session | Surface a non-blocking toast/inline note; cursor still advances (best-effort logging, consistent with offline-first writes elsewhere) |
| Offline | Writes land in Dexie + sync queue as usual; sync drains on reconnect |
| User exits mid-session | Already-logged events persist; no partial-session rollback |

## Testing

- **Vitest (`practiceSignal.test.ts`):** `reflectionToTag` mapping for all three values; `aggregateRecentActivity` — empty input, grouping by itemRef, count + max-`lastAt`, 14-day cutoff boundary, top-20 cap, song-section composite keys.
- **Manual (dev server):** start a session from a focus goal → reflect on each item → verify `practiceEvents` rows and `itemTags` updates in IndexedDB → run a check-in and confirm the opener references the practiced items.
- **Typecheck:** `npx tsc -p tsconfig.app.json --noEmit` — no new errors vs. the branch's pre-existing baseline.
- **Build:** `npm run build` clean.

## Open assumptions (locked during brainstorming)

1. Reflection auto-updates the item's tag (the bridge in §2), in addition to logging an event.
2. No timers / rep counts / BPM targets in v1; advance on reflection tap.
3. `practiceEvents` syncs to Supabase (not local-only).
4. Reuse `FretboardDiagram` + the pure converters directly; do not extract a shared `ItemPlayer` from Library in this phase.
