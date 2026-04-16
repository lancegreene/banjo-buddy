# Lick Library Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pitch-only lick schema with a tab-based schema supporting role/key/leadsTo taxonomy, build an interactive LickPlayer (cursor + count-in + loop + click + synth-mute), and populate Wave 1 with 30 licks.

**Architecture:** Licks migrate from `ReferenceNote[]` to `TabNote[]` (the same shape songs use). A new `LickPlayer` component wraps the existing `FretboardDiagram` and adds count-in, metronome click track, synth-mute, and loop/tempo controls via a new `useTabPlayback` hook. Library UI gains role/key/leadsTo filter chips. DTW engine and LickDetector stay in tree but go dormant. Nine existing chord licks get upgraded (IDs preserved); five song-phrase licks are deleted along with two curriculum references.

**Tech Stack:** React 18 + TypeScript + Vite, Zustand, Dexie, Tone.js (via BanjoSynth), Web Audio. No test suite — verification via `npx tsc --noEmit`, `npx vite build`, and manual browser smoke tests per CLAUDE.md convention.

**Spec:** `docs/superpowers/specs/2026-04-16-lick-library-foundation-design.md`

---

## Important deviations from default skill workflow

1. **No unit tests.** Project has no test suite (confirmed in CLAUDE.md and via grep). "Write failing test → run → make pass" pattern does not apply. Replace with: write code → `npx tsc --noEmit` passes → `npx vite build` succeeds → manual browser smoke test for UI changes → commit. This is a CLAUDE.md-level project convention that overrides the skill's TDD default.

2. **Worktree.** Not required. Spec was approved for direct work on `main`; no parallel workstreams conflict.

3. **FretboardDiagram reuse.** The existing `FretboardDiagram` already has `autoPlay`, `bpm`, `currentIndex` props, an internal `setInterval` playback loop, cursor highlighting (`activeStep`), and click-to-jump. This plan extends it with small additive props (`synthMuted`, `loop`, `onComplete`) rather than duplicating the rendering.

4. **Timing quirk.** `FretboardDiagram` currently uses `ms = (60 / bpm) * 1000` per step — one quarter-note per step at the input BPM. This plan keeps that behavior. Click-track "every other step" maps to a half-note pulse at the input BPM. Do not try to fix this in scope.

---

## File structure

### Created

```
src/components/LickPlayer/
  LickPlayer.tsx           # Wraps FretboardDiagram + controls
  useTabPlayback.ts        # Playback state machine: play/pause, countIn, loop, click, synthMute
```

### Modified

```
src/data/lickLibrary.ts                    # New schema, 9 upgraded chord licks (wave 1a)
src/data/curriculum.ts                     # Remove 2 broken lickId references
src/engine/dtwMatcher.ts                   # Inline local ReferenceNote type
src/engine/rollToFretNotes.ts              # Delete lickToFretNotes + ReferenceNote import
src/components/Fretboard/FretboardDiagram.tsx  # Add synthMuted, loop, onComplete props
src/components/Library/Library.tsx         # Role/key/leadsTo filters + LickPlayer for licks
src/App.css                                # LickPlayer styles
```

### Unchanged (dormant)

```
src/components/LickDetector/LickDetector.tsx      # Still works for existing skill wirings
src/components/Practice/PracticeSession.tsx       # Still references LickDetector
src/hooks/useNoteCapture.ts                       # Roll detection still active
```

---

## Phase 1 — Schema + data migration (1 commit)

### Task 1: Define the new LickReference schema

**Files:**
- Modify: `src/data/lickLibrary.ts:1-25` (top types)

- [ ] **Step 1: Open `src/data/lickLibrary.ts` and replace the top-of-file type definitions**

Replace lines 1-24 (header comment + `ReferenceNote`, `LickType`, `LickReference` interfaces) with:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Lick Reference Library
// Licks are reusable, role-tagged building blocks played over a chord.
// Stored as TabNote[] (same shape as songs) — rendered by FretboardDiagram.
// ─────────────────────────────────────────────────────────────────────────────

import type { TabNote } from '../engine/banjoSynth'

export type LickRole = 'basic' | 'fill' | 'ending' | 'transition' | 'combination'

export interface LickReference {
  id: string
  name: string
  description: string
  key: string              // 'G' | 'C' | 'D' | ...
  role: LickRole
  leadsTo?: string         // chord name; only for role === 'transition'
  chord?: string           // primary chord context for basic/fill/ending
  measureCount: 1 | 2      // 2 only for 'combination'
  referenceBpm: number
  source?: string          // e.g. 'Splitting the Licks, p.11'
  tab: TabNote[]
}
```

- [ ] **Step 2: Do not touch the `LICK_LIBRARY` array body yet — Task 4 rewrites it.** The file will not compile between Task 1 and Task 4. That is expected.

### Task 2: Inline `ReferenceNote` type into `dtwMatcher.ts`

**Files:**
- Modify: `src/engine/dtwMatcher.ts:9` (the import line)

- [ ] **Step 1: Replace the `ReferenceNote` import with a local type definition**

At the top of `src/engine/dtwMatcher.ts`, replace line 9:

```ts
import type { ReferenceNote } from '../data/lickLibrary'
```

with:

```ts
// Local type — was previously exported from lickLibrary before the TabNote migration.
// Kept here so the dormant DTW pipeline still compiles; no new code feeds it.
interface ReferenceNote {
  note: string
  octave: number
  durationRatio: number
}
```

- [ ] **Step 2: Verify no other imports of `ReferenceNote` from lickLibrary remain**

Run: `grep -rn "ReferenceNote" src/`
Expected: only hits are inside `src/engine/dtwMatcher.ts` and `src/engine/rollToFretNotes.ts`. `rollToFretNotes.ts` is handled in Task 3.

### Task 3: Delete `lickToFretNotes` from `rollToFretNotes.ts`

**Files:**
- Modify: `src/engine/rollToFretNotes.ts:5, 111-125` (remove import + function)

- [ ] **Step 1: Delete the `ReferenceNote` import line**

Remove line 5: `import type { ReferenceNote } from '../data/lickLibrary'`

- [ ] **Step 2: Delete the `lickToFretNotes` function (lines 111-125)**

Delete the entire block starting with the comment `/** Convert lick reference notes into FretNote[] ... */` through the closing `}` of the function.

- [ ] **Step 3: Also delete `findStringAndFret` and `noteToSemitone` *if they are now unused***

Run: `grep -n "findStringAndFret\|noteToSemitone" src/engine/rollToFretNotes.ts`
If they are only used by `lickToFretNotes`, delete them too. If `sectionToFretNotes` also uses `noteToSemitone`, leave `noteToSemitone` in place and only delete `findStringAndFret`.

### Task 4: Rewrite `LICK_LIBRARY` body with 9 upgraded chord licks

**Files:**
- Modify: `src/data/lickLibrary.ts:25-293` (replace the old 15-lick array)

- [ ] **Step 1: Replace the `LICK_LIBRARY` export and tail helpers**

The original 15-lick array becomes a 9-lick array. Five song-phrase licks (`foggy_mountain_a1`, `foggy_mountain_a2`, `cripple_creek_intro`, `cripple_creek_a`, `cripple_creek_b`) are **deleted entirely**. The remaining 9 chord licks are upgraded to `TabNote[]`.

Replace everything from `export const LICK_LIBRARY` to end-of-file with:

```ts
export const LICK_LIBRARY: LickReference[] = [
  // ── G Chord Licks ────────────────────────────────────────────────────────────
  {
    id: 'g_lick_basic',
    name: 'G-Lick — Basic (the "Godfather")',
    description: 'The classic Scruggs-style phrase-ending lick in G. Pull-off from 3rd to open on string 2, resolve to open G.',
    key: 'G', role: 'ending', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 2, fret: 3, beat: 0, finger: 'I', technique: 'pull', slideToFret: 0 },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_tag',
    name: 'G-Lick — Tag Ending',
    description: 'Classic Scruggs tag lick — a variation of the G-lick used to end songs.',
    key: 'G', role: 'ending', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Earl Scruggs and the 5-String Banjo, vol 1',
    tab: [
      { string: 1, fret: 0, beat: 0, finger: 'M' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 3, fret: 0, beat: 2, finger: 'T' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 1, fret: 0, beat: 4, finger: 'M' },
      { string: 2, fret: 0, beat: 5, finger: 'I' },
      { string: 3, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_forward_roll',
    name: 'G-Lick — Forward Roll Variation',
    description: 'The G-lick melodic contour played over a forward roll pattern.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },

  // ── C Chord Licks ────────────────────────────────────────────────────────────
  {
    id: 'c_lick_basic',
    name: 'C-Lick — Basic',
    description: 'Basic phrase over C chord. Uses the C chord shape (index on 2nd string 1st fret, middle on 4th string 2nd fret).',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 2, fret: 1, beat: 0, finger: 'I' },
      { string: 4, fret: 2, beat: 1, finger: 'T' },
      { string: 3, fret: 0, beat: 2, finger: 'T' },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 1, fret: 0, beat: 4, finger: 'M' },
      { string: 4, fret: 2, beat: 5, finger: 'T' },
      { string: 2, fret: 1, beat: 6, finger: 'I' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'c_lick_hammer',
    name: 'C-Lick — Hammer-On Variation',
    description: 'C chord lick with hammer-on from open B to C on string 2.',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 4, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I', technique: 'hammer', slideToFret: 1 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 3, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 1, beat: 4, finger: 'I' },
      { string: 4, fret: 2, beat: 5, finger: 'T' },
      { string: 1, fret: 0, beat: 6, finger: 'M' },
      { string: 2, fret: 1, beat: 7, finger: 'I' },
    ],
  },
  {
    id: 'c_lick_fill',
    name: 'C-Lick — Fill-In',
    description: 'Transitional C chord lick used between vocal lines or during chord changes.',
    key: 'C', role: 'fill', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 1, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 4, fret: 2, beat: 4, finger: 'T' },
      { string: 3, fret: 0, beat: 5, finger: 'T' },
      { string: 2, fret: 1, beat: 6, finger: 'I' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },

  // ── D Chord Licks ────────────────────────────────────────────────────────────
  {
    id: 'd_lick_basic',
    name: 'D-Lick — Basic',
    description: 'Basic phrase over D/D7 chord. Uses D chord shape and resolves back toward G.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 4, fret: 0, beat: 0, finger: 'T' },
      { string: 3, fret: 2, beat: 1, finger: 'T' },
      { string: 2, fret: 3, beat: 2, finger: 'I' },
      { string: 1, fret: 0, beat: 3, finger: 'M' },
      { string: 5, fret: 0, beat: 4, finger: 'T' },
      { string: 3, fret: 2, beat: 5, finger: 'T' },
      { string: 2, fret: 3, beat: 6, finger: 'I' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'd_lick_pull_off',
    name: 'D-Lick — Pull-Off Variation',
    description: 'D chord lick featuring a pull-off from A to G on string 3.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 4, fret: 0, beat: 0, finger: 'T' },
      { string: 3, fret: 2, beat: 1, finger: 'T', technique: 'pull', slideToFret: 0 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 3, beat: 4, finger: 'I' },
      { string: 3, fret: 2, beat: 5, finger: 'T' },
      { string: 1, fret: 0, beat: 6, finger: 'M' },
      { string: 5, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'd_lick_transition',
    name: 'D-Lick — Transition to G',
    description: 'D7 lick that smoothly resolves back to G — essential for I-IV-V progressions.',
    key: 'D', role: 'transition', chord: 'D', leadsTo: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 3, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 3, fret: 0, beat: 5, finger: 'T' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
]

export const LICK_MAP = new Map(LICK_LIBRARY.map((l) => [l.id, l]))

/** Get unique keys present in the lick library, in definition order. */
export function getLickKeys(): string[] {
  const seen = new Set<string>()
  const keys: string[] = []
  for (const l of LICK_LIBRARY) {
    if (!seen.has(l.key)) { seen.add(l.key); keys.push(l.key) }
  }
  return keys
}

/** Get unique roles present in the lick library, in definition order. */
export function getLickRoles(): LickRole[] {
  const seen = new Set<LickRole>()
  const roles: LickRole[] = []
  for (const l of LICK_LIBRARY) {
    if (!seen.has(l.role)) { seen.add(l.role); roles.push(l.role) }
  }
  return roles
}

/** Get unique `leadsTo` targets from transition licks. */
export function getLickLeadsToTargets(): string[] {
  const seen = new Set<string>()
  const targets: string[] = []
  for (const l of LICK_LIBRARY) {
    if (l.leadsTo && !seen.has(l.leadsTo)) { seen.add(l.leadsTo); targets.push(l.leadsTo) }
  }
  return targets
}

export const LICK_ROLES: { id: LickRole; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'fill', label: 'Fill-In' },
  { id: 'ending', label: 'Ending' },
  { id: 'transition', label: 'Transition' },
  { id: 'combination', label: 'Combination' },
]
```

- [ ] **Step 2: Remove exports that no longer exist**

The old file exported `LICK_TYPES` and `type LickType`. These are deleted. Task 6 will update the one consumer (`Library.tsx`).

### Task 5: Remove broken `lickId` references from curriculum

**Files:**
- Modify: `src/data/curriculum.ts:748` (remove `lickId: 'cripple_creek_intro'`)
- Modify: `src/data/curriculum.ts:1928` (remove `lickId: 'foggy_mountain_a1'`)

- [ ] **Step 1: Open `src/data/curriculum.ts` and find line 748**

Delete the line:

```ts
    lickId: 'cripple_creek_intro',
```

Verify the surrounding skill (`cripple_creek_mastered` area) still has a `detect: { kind: 'section', ... }` block that handles practice-time detection. Do not modify anything else on this skill.

- [ ] **Step 2: Find line 1928 and delete**

Delete the line:

```ts
    lickId: 'foggy_mountain_a1',
```

Verify the surrounding `foggy_mountain_breakdown` skill still has a `detect: { kind: 'section', ... }` block. Do not modify anything else.

- [ ] **Step 3: Verify no other broken lick references remain**

Run: `grep -n "lickId:" src/data/curriculum.ts`
Expected lines (with lick IDs that exist in the new LICK_LIBRARY):

```
g_lick_basic
g_lick_tag
g_lick_forward_roll
c_lick_basic
c_lick_hammer
c_lick_fill
d_lick_basic
d_lick_pull_off
d_lick_transition
```

Any reference to `cripple_creek_intro`, `foggy_mountain_a1`, `foggy_mountain_a2`, `cripple_creek_a`, or `cripple_creek_b` inside a `lickId:` field is a leftover — delete it.

### Task 6: Patch `Library.tsx` for compile (temporary filter stub)

**Files:**
- Modify: `src/components/Library/Library.tsx:9, 65-89, 101-104`

The Library component currently imports `LICK_TYPES` and `type LickType`, uses `lickType` state, and calls `lickToFretNotes(lick.notes)`. All four are broken. This task just makes it compile; Phase 3 will build the proper role-based UI.

- [ ] **Step 1: Update the lickLibrary import**

Replace line 9:

```ts
import { LICK_LIBRARY, getLickKeys, LICK_TYPES, type LickType } from '../../data/lickLibrary'
```

with:

```ts
import { LICK_LIBRARY, getLickKeys, LICK_ROLES, type LickRole } from '../../data/lickLibrary'
```

- [ ] **Step 2: Remove the `lickToFretNotes` import on line 13**

Change line 13 from:

```ts
import { rollPatternToFretNotes, lickToFretNotes, sectionToFretNotes } from '../../engine/rollToFretNotes'
```

to:

```ts
import { rollPatternToFretNotes, sectionToFretNotes } from '../../engine/rollToFretNotes'
```

- [ ] **Step 3: Replace the `lickType` filter state with `lickRole`**

Find line ~65:

```ts
  const [lickType, setLickType] = useState<LickType | null>(null)
```

Replace with:

```ts
  const [lickRole, setLickRole] = useState<LickRole | null>(null)
```

- [ ] **Step 4: Update the `filteredLicks` memo**

Find the `filteredLicks` useMemo block (~lines 84-89). Replace:

```ts
  const filteredLicks = useMemo(() => {
    return licks.filter(l =>
      (!lickType || l.lickType === lickType) &&
      (!lickKey || l.key === lickKey)
    )
  }, [licks, lickType, lickKey])
```

with:

```ts
  const filteredLicks = useMemo(() => {
    return licks.filter(l =>
      (!lickRole || l.role === lickRole) &&
      (!lickKey || l.key === lickKey)
    )
  }, [licks, lickRole, lickKey])
```

- [ ] **Step 5: Update the lick rendering path**

Find the block around line 101-104:

```ts
    if (category === 'licks') {
      const lick = licks.find(l => l.id === selectedId)
      if (!lick) return { notes: [], label: '' }
      return { notes: lickToFretNotes(lick.notes), label: lick.name }
    }
```

Replace with:

```ts
    if (category === 'licks') {
      const lick = licks.find(l => l.id === selectedId)
      if (!lick) return { notes: [], label: '' }
      // Licks store TabNote[]; wrap as a single measure for sectionToFretNotes.
      return { notes: sectionToFretNotes([{ notes: lick.tab }]), label: lick.name }
    }
```

- [ ] **Step 6: Find any remaining `LICK_TYPES` / `lickType` references in Library.tsx and update**

Run: `grep -n "LICK_TYPES\|lickType" src/components/Library/Library.tsx`
For each hit, swap to the role equivalent. In most places `LICK_TYPES` was used to render filter chips — wire those chips to `LICK_ROLES` + `setLickRole` instead. Keep the UI layout unchanged for now; Phase 3 does the proper redesign.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Build**

Run: `npx vite build`
Expected: succeeds with no errors.

- [ ] **Step 9: Manual smoke test**

Run: `npm run dev`
In the browser:
- Open Library → Lick Library
- Confirm 9 licks render as cards
- Click a G-lick → tab renders (static, via existing FretboardDiagram) — ok if ugly
- Confirm no console errors

- [ ] **Step 10: Commit Phase 1**

```bash
git add src/data/lickLibrary.ts src/data/curriculum.ts src/engine/dtwMatcher.ts src/engine/rollToFretNotes.ts src/components/Library/Library.tsx
git commit -m "$(cat <<'EOF'
refactor(licks): migrate lick schema to TabNote + role/leadsTo taxonomy

- Replace ReferenceNote[] pitch-only shape with TabNote[] (same as songs)
- New taxonomy: role (basic/fill/ending/transition/combination), leadsTo, chord, measureCount, source
- Delete 5 song-phrase licks (foggy_mountain_a1/a2, cripple_creek_intro/a/b) — duplicates of song data
- Remove 2 broken lickId references from curriculum.ts
- Inline ReferenceNote type into dtwMatcher (dormant engine kept compilable)
- Delete lickToFretNotes from rollToFretNotes (obsolete — licks have tab natively)
- Preserve 9 chord lick IDs to avoid curriculum cascade
- Library.tsx patched for compile; full UI redesign in Phase 3

Part 1/3 of lick library foundation. Spec:
docs/superpowers/specs/2026-04-16-lick-library-foundation-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — LickPlayer component (1 commit)

### Task 7: Extend `FretboardDiagram` with optional props

**Files:**
- Modify: `src/components/Fretboard/FretboardDiagram.tsx:54-61` (props), `:291-298, :300-315` (effects)

- [ ] **Step 1: Add new optional props to the interface**

Find lines 54-61:

```ts
interface FretboardDiagramProps {
  notes?: FretNote[]
  currentIndex?: number
  lookahead?: number
  autoPlay?: boolean
  bpm?: number
  showNoteNames?: boolean
}
```

Replace with:

```ts
interface FretboardDiagramProps {
  notes?: FretNote[]
  currentIndex?: number
  lookahead?: number
  autoPlay?: boolean
  bpm?: number
  showNoteNames?: boolean
  /** If true, synth does not play notes on activeStep changes. Cursor still advances. */
  synthMuted?: boolean
  /** If false, playback stops after the last step instead of looping. Default: true. */
  loop?: boolean
  /** Called when playback reaches the final step in a non-looping pass. */
  onComplete?: () => void
  /** Called with the current active step index on every change. */
  onActiveStepChange?: (step: number) => void
}
```

- [ ] **Step 2: Destructure the new props in the component signature**

Find lines 262-268:

```ts
export function FretboardDiagram({
  notes = EXAMPLE_CRIPPLE_CREEK,
  currentIndex = -1,
  autoPlay = false,
  bpm = 120,
  showNoteNames = false,
}: FretboardDiagramProps) {
```

Replace with:

```ts
export function FretboardDiagram({
  notes = EXAMPLE_CRIPPLE_CREEK,
  currentIndex = -1,
  autoPlay = false,
  bpm = 120,
  showNoteNames = false,
  synthMuted = false,
  loop = true,
  onComplete,
  onActiveStepChange,
}: FretboardDiagramProps) {
```

- [ ] **Step 3: Wire `synthMuted` into the synth-trigger effect**

Find lines 291-298:

```ts
  useEffect(() => {
    if (activeStep < 0 || activeStep >= steps.length) return
    const stepNotes = steps[activeStep].notes
    for (const n of stepNotes) {
      getSynth().playNote(n.string, n.fret)
    }
  }, [activeStep, steps])
```

Replace with:

```ts
  useEffect(() => {
    if (activeStep < 0 || activeStep >= steps.length) return
    onActiveStepChange?.(activeStep)
    if (synthMuted) return
    const stepNotes = steps[activeStep].notes
    for (const n of stepNotes) {
      getSynth().playNote(n.string, n.fret)
    }
  }, [activeStep, steps, synthMuted, onActiveStepChange])
```

- [ ] **Step 4: Wire `loop` + `onComplete` into the autoPlay interval**

Find lines 307-315:

```ts
  useEffect(() => {
    if (!autoPlay || steps.length === 0) return
    const ms = (60 / bpm) * 1000
    setActiveStep(0)
    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1 >= steps.length ? 0 : prev + 1))
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoPlay, bpm, steps])
```

Replace with:

```ts
  useEffect(() => {
    if (!autoPlay || steps.length === 0) return
    const ms = (60 / bpm) * 1000
    setActiveStep(0)
    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => {
        const next = prev + 1
        if (next >= steps.length) {
          if (loop) return 0
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
          onComplete?.()
          return prev  // stay on last step
        }
        return next
      })
    }, ms)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoPlay, bpm, steps, loop, onComplete])
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Existing callers of `FretboardDiagram` are unaffected because all new props are optional.

### Task 8: Create `useTabPlayback` hook

**Files:**
- Create: `src/components/LickPlayer/useTabPlayback.ts`

- [ ] **Step 1: Create the file with the full hook**

Create `src/components/LickPlayer/useTabPlayback.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// useTabPlayback — Playback state machine for LickPlayer.
// Owns: isPlaying, bpm, loop, countIn, synthMuted, clickOn, currentStep, phase.
// Does NOT drive the tab cursor — FretboardDiagram's internal interval does that
// while `autoPlay` is on. This hook coordinates count-in + metronome click around it.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'

export type PlaybackPhase = 'idle' | 'countin' | 'playing'

export interface UseTabPlaybackOptions {
  bpmDefault: number
  countInBeats?: number  // default 4
}

export interface UseTabPlaybackReturn {
  // State
  isPlaying: boolean
  phase: PlaybackPhase
  bpm: number
  loop: boolean
  countInOn: boolean
  synthMuted: boolean
  clickOn: boolean
  countInRemaining: number  // 4 → 3 → 2 → 1 → 0
  currentStep: number       // mirrored from FretboardDiagram.onActiveStepChange

  // Control
  play: () => void
  stop: () => void
  toggleLoop: () => void
  toggleCountIn: () => void
  toggleSynthMuted: () => void
  toggleClick: () => void
  setBpm: (bpm: number) => void
  setCurrentStep: (step: number) => void
}

export function useTabPlayback(options: UseTabPlaybackOptions): UseTabPlaybackReturn {
  const { bpmDefault, countInBeats = 4 } = options

  const [phase, setPhase] = useState<PlaybackPhase>('idle')
  const [bpm, setBpmState] = useState(bpmDefault)
  const [loop, setLoop] = useState(true)
  const [countInOn, setCountInOn] = useState(true)
  const [synthMuted, setSynthMuted] = useState(false)
  const [clickOn, setClickOn] = useState(true)
  const [countInRemaining, setCountInRemaining] = useState(0)
  const [currentStep, setCurrentStepState] = useState(-1)

  const countInIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clickAudioRef = useRef<AudioContext | null>(null)

  const playClickSound = useCallback(() => {
    if (!clickAudioRef.current) {
      clickAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = clickAudioRef.current
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1200, now)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  }, [])

  const stop = useCallback(() => {
    if (countInIntervalRef.current) { clearInterval(countInIntervalRef.current); countInIntervalRef.current = null }
    if (clickIntervalRef.current) { clearInterval(clickIntervalRef.current); clickIntervalRef.current = null }
    setPhase('idle')
    setCountInRemaining(0)
    setCurrentStepState(-1)
  }, [])

  const startMainPlayback = useCallback(() => {
    setPhase('playing')
  }, [])

  const play = useCallback(() => {
    if (phase !== 'idle') return

    if (countInOn) {
      setPhase('countin')
      setCountInRemaining(countInBeats)
      const tickMs = (60 / bpm) * 1000
      let remaining = countInBeats
      // Fire first click immediately
      if (clickOn) playClickSound()
      countInIntervalRef.current = setInterval(() => {
        remaining -= 1
        setCountInRemaining(remaining)
        if (remaining <= 0) {
          if (countInIntervalRef.current) { clearInterval(countInIntervalRef.current); countInIntervalRef.current = null }
          startMainPlayback()
        } else if (clickOn) {
          playClickSound()
        }
      }, tickMs)
    } else {
      startMainPlayback()
    }
  }, [phase, countInOn, bpm, clickOn, countInBeats, playClickSound, startMainPlayback])

  // Click-track while playing — ticks on every other step (half-note pulse at input BPM)
  useEffect(() => {
    if (phase !== 'playing' || !clickOn) return
    const tickMs = (60 / bpm) * 1000 * 2  // every 2 steps
    // Fire a click on entering the playing phase
    playClickSound()
    clickIntervalRef.current = setInterval(() => {
      playClickSound()
    }, tickMs)
    return () => {
      if (clickIntervalRef.current) { clearInterval(clickIntervalRef.current); clickIntervalRef.current = null }
    }
  }, [phase, clickOn, bpm, playClickSound])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countInIntervalRef.current) clearInterval(countInIntervalRef.current)
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current)
      clickAudioRef.current?.close()
    }
  }, [])

  return {
    isPlaying: phase === 'playing',
    phase,
    bpm,
    loop,
    countInOn,
    synthMuted,
    clickOn,
    countInRemaining,
    currentStep,
    play,
    stop,
    toggleLoop: () => setLoop(v => !v),
    toggleCountIn: () => setCountInOn(v => !v),
    toggleSynthMuted: () => setSynthMuted(v => !v),
    toggleClick: () => setClickOn(v => !v),
    setBpm: (next: number) => setBpmState(Math.max(40, Math.min(160, Math.round(next)))),
    setCurrentStep: setCurrentStepState,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

### Task 9: Create `LickPlayer` component

**Files:**
- Create: `src/components/LickPlayer/LickPlayer.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/LickPlayer/LickPlayer.tsx`:

```tsx
// ─────────────────────────────────────────────────────────────────────────────
// LickPlayer — Interactive lick player: tab view + cursor + controls.
// Wraps FretboardDiagram and adds count-in, metronome click, synth-mute,
// loop toggle, tempo slider. Spec: 2026-04-16-lick-library-foundation-design.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { LickReference } from '../../data/lickLibrary'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { sectionToFretNotes } from '../../engine/rollToFretNotes'
import { useTabPlayback } from './useTabPlayback'

interface LickPlayerProps {
  lick: LickReference
}

export function LickPlayer({ lick }: LickPlayerProps) {
  const fretNotes = useMemo(
    () => sectionToFretNotes([{ notes: lick.tab }]),
    [lick.tab]
  )

  const pb = useTabPlayback({ bpmDefault: lick.referenceBpm })

  const roleLabel = lick.role.charAt(0).toUpperCase() + lick.role.slice(1)
  const leadsToLabel = lick.leadsTo ? ` → ${lick.leadsTo}` : ''

  return (
    <div className="lick-player">
      {/* Header */}
      <div className="lick-player-header">
        <h3 className="lick-player-name">{lick.name}</h3>
        <div className="lick-player-meta">
          <span className="lick-meta-key">Key: {lick.key}</span>
          <span className="lick-meta-role">
            Role: {roleLabel}{leadsToLabel}
          </span>
          {lick.source && <span className="lick-meta-source">Source: {lick.source}</span>}
        </div>
      </div>

      {/* Tab view */}
      <div className={`lick-player-tab ${lick.measureCount === 2 ? 'lick-player-tab-wide' : ''}`}>
        <FretboardDiagram
          notes={fretNotes}
          autoPlay={pb.isPlaying}
          bpm={pb.bpm}
          loop={pb.loop}
          synthMuted={pb.synthMuted}
          onComplete={pb.stop}
          onActiveStepChange={pb.setCurrentStep}
        />
      </div>

      {/* Count-in overlay */}
      {pb.phase === 'countin' && (
        <div className="lick-player-countin-overlay">
          <div className="lick-player-countin-number">{pb.countInRemaining}</div>
        </div>
      )}

      {/* Controls */}
      <div className="lick-player-controls">
        <button
          type="button"
          className="lick-player-btn lick-player-btn-play"
          onClick={pb.isPlaying || pb.phase === 'countin' ? pb.stop : pb.play}
          aria-label={pb.isPlaying ? 'Stop' : 'Play'}
        >
          {pb.isPlaying || pb.phase === 'countin' ? '■ Stop' : '▶ Play'}
        </button>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={pb.loop} onChange={pb.toggleLoop} />
          <span>🔁 Loop</span>
        </label>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={pb.countInOn} onChange={pb.toggleCountIn} />
          <span>🎵 Count-in</span>
        </label>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={!pb.synthMuted} onChange={pb.toggleSynthMuted} />
          <span>Synth</span>
        </label>

        <label className="lick-player-toggle">
          <input type="checkbox" checked={pb.clickOn} onChange={pb.toggleClick} />
          <span>Click</span>
        </label>

        <div className="lick-player-tempo">
          <span className="lick-player-tempo-label">BPM</span>
          <input
            type="range"
            min={40}
            max={160}
            step={1}
            value={pb.bpm}
            onChange={(e) => pb.setBpm(Number(e.target.value))}
            className="lick-player-tempo-slider"
          />
          <span className="lick-player-tempo-value">{pb.bpm}</span>
        </div>
      </div>

      {/* Description */}
      {lick.description && (
        <p className="lick-player-description">{lick.description}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

### Task 10: Add LickPlayer CSS

**Files:**
- Modify: `src/App.css` (append to end of file)

- [ ] **Step 1: Append LickPlayer styles to App.css**

Append to the end of `src/App.css`:

```css
/* ─── LickPlayer ──────────────────────────────────────────────────────────── */

.lick-player {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--surface-2, #1a1614);
  border: 1px solid var(--border, rgba(245, 166, 35, 0.15));
  border-radius: 12px;
  position: relative;
}

.lick-player-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lick-player-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #f5e6d3);
}

.lick-player-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary, #a89583);
}

.lick-player-meta > span {
  padding: 2px 8px;
  background: rgba(245, 166, 35, 0.08);
  border-radius: 4px;
}

.lick-player-tab {
  width: 100%;
}

.lick-player-tab-wide {
  /* Combination licks: allow the tab strip to scroll if needed */
  overflow-x: auto;
}

.lick-player-countin-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 8, 6, 0.6);
  border-radius: 12px;
  pointer-events: none;
  z-index: 5;
}

.lick-player-countin-number {
  font-size: 96px;
  font-weight: 700;
  color: var(--accent, #f5a623);
  text-shadow: 0 4px 20px rgba(245, 166, 35, 0.6);
}

.lick-player-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.lick-player-btn {
  padding: 8px 16px;
  background: var(--accent, #f5a623);
  color: #1a1410;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.05s ease;
}

.lick-player-btn:active { transform: scale(0.97); }

.lick-player-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary, #f5e6d3);
  cursor: pointer;
  user-select: none;
}

.lick-player-tempo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.lick-player-tempo-label {
  font-size: 12px;
  color: var(--text-secondary, #a89583);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.lick-player-tempo-slider {
  width: 140px;
  accent-color: var(--accent, #f5a623);
}

.lick-player-tempo-value {
  font-family: var(--font-mono, monospace);
  font-size: 14px;
  color: var(--text-primary, #f5e6d3);
  min-width: 28px;
  text-align: right;
}

.lick-player-description {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary, #a89583);
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npx vite build`
Expected: both pass.

- [ ] **Step 3: Manual smoke test — standalone LickPlayer**

Because LickPlayer isn't wired into Library yet, add a temporary mount to check it:
1. In `src/App.tsx` near the top, temporarily import `{ LickPlayer }` and `{ LICK_LIBRARY }`.
2. In one of the dev-only branches, render `<LickPlayer lick={LICK_LIBRARY[0]} />` as an overlay.
3. Run `npm run dev`.
4. Click Play. Verify:
   - 4 audible metronome clicks (count-in)
   - Tab cursor begins advancing, synth plays each note
   - Cursor loops back to beat 0 after reaching the end
   - Toggle Synth off → cursor + click continue, no banjo notes
   - Toggle Loop off + click Play → cursor stops at final step
   - Drag BPM slider → playback restarts at new tempo
5. **REMOVE the temporary mount** before committing.

- [ ] **Step 4: Commit Phase 2**

```bash
git add src/components/Fretboard/FretboardDiagram.tsx src/components/LickPlayer/LickPlayer.tsx src/components/LickPlayer/useTabPlayback.ts src/App.css
git commit -m "$(cat <<'EOF'
feat(licks): add interactive LickPlayer with count-in, loop, click track

- Extend FretboardDiagram with synthMuted, loop, onComplete, onActiveStepChange
- New useTabPlayback hook: state machine for play/stop/count-in/click/mute
- New LickPlayer component: wraps FretboardDiagram, adds controls + count-in overlay
- Metronome click ticks on half-note pulse at input BPM
- Count-in: 4 clicks before playback; does not repeat on loop
- Tempo slider 40-160 BPM; tempo change restarts current measure
- Synth-mute and click-only modes support "I'll play it myself" practice

Part 2/3 of lick library foundation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Library integration (1 commit)

### Task 11: Replace Library.tsx lick filters with role + key + leadsTo chips

**Files:**
- Modify: `src/components/Library/Library.tsx` (filter bar for licks category)

- [ ] **Step 1: Add `lickLeadsTo` filter state**

Near the other lick filter state (around line 65 after Task 6 changes), add:

```ts
  const [lickLeadsTo, setLickLeadsTo] = useState<string | null>(null)
```

- [ ] **Step 2: Import `getLickLeadsToTargets`**

Update the lickLibrary import:

```ts
import { LICK_LIBRARY, getLickKeys, getLickLeadsToTargets, LICK_ROLES, type LickRole } from '../../data/lickLibrary'
```

- [ ] **Step 3: Expand the `filteredLicks` memo**

Replace the `filteredLicks` useMemo:

```ts
  const filteredLicks = useMemo(() => {
    return licks.filter(l =>
      (!lickRole || l.role === lickRole) &&
      (!lickKey || l.key === lickKey) &&
      (!lickLeadsTo || l.leadsTo === lickLeadsTo)
    )
  }, [licks, lickRole, lickKey, lickLeadsTo])
```

- [ ] **Step 4: Update the lick filter chip UI**

Find where the licks filter bar is rendered in Library.tsx. Replace the entire licks-filter block with:

```tsx
{category === 'licks' && (
  <div className="library-filters">
    <div className="library-filter-row">
      <span className="library-filter-label">Role:</span>
      <button
        type="button"
        className={`library-filter-chip ${lickRole === null ? 'is-active' : ''}`}
        onClick={() => setLickRole(null)}
      >
        All
      </button>
      {LICK_ROLES.map(r => (
        <button
          type="button"
          key={r.id}
          className={`library-filter-chip ${lickRole === r.id ? 'is-active' : ''}`}
          onClick={() => setLickRole(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>

    <div className="library-filter-row">
      <span className="library-filter-label">Key:</span>
      <button
        type="button"
        className={`library-filter-chip ${lickKey === null ? 'is-active' : ''}`}
        onClick={() => setLickKey(null)}
      >
        All
      </button>
      {getLickKeys().map(k => (
        <button
          type="button"
          key={k}
          className={`library-filter-chip ${lickKey === k ? 'is-active' : ''}`}
          onClick={() => setLickKey(k)}
        >
          {k}
        </button>
      ))}
    </div>

    {lickRole === 'transition' && (
      <div className="library-filter-row">
        <span className="library-filter-label">Leads to:</span>
        <button
          type="button"
          className={`library-filter-chip ${lickLeadsTo === null ? 'is-active' : ''}`}
          onClick={() => setLickLeadsTo(null)}
        >
          Any
        </button>
        {getLickLeadsToTargets().map(t => (
          <button
            type="button"
            key={t}
            className={`library-filter-chip ${lickLeadsTo === t ? 'is-active' : ''}`}
            onClick={() => setLickLeadsTo(t)}
          >
            {t}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Append CSS for library filter chips if not already present**

Run: `grep -n "library-filter-chip" src/App.css`
If no hits, append to `src/App.css`:

```css
/* ─── Library filter chips ────────────────────────────────────────────────── */

.library-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.library-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.library-filter-label {
  font-size: 12px;
  color: var(--text-secondary, #a89583);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-right: 4px;
}

.library-filter-chip {
  padding: 4px 12px;
  background: transparent;
  color: var(--text-secondary, #a89583);
  border: 1px solid rgba(245, 166, 35, 0.2);
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}

.library-filter-chip:hover {
  background: rgba(245, 166, 35, 0.08);
  color: var(--text-primary, #f5e6d3);
}

.library-filter-chip.is-active {
  background: var(--accent, #f5a623);
  color: #1a1410;
  border-color: var(--accent, #f5a623);
}
```

If filter-chip styles already exist, leave them alone.

### Task 12: Swap Library's lick rendering to LickPlayer

**Files:**
- Modify: `src/components/Library/Library.tsx` (lick detail render path)

- [ ] **Step 1: Import LickPlayer**

Add to imports:

```ts
import { LickPlayer } from '../LickPlayer/LickPlayer'
```

- [ ] **Step 2: Render LickPlayer for the selected lick instead of FretboardDiagram**

Find the lick detail render — the block that currently returns `sectionToFretNotes(...)` for licks (updated in Task 6 Step 5) and feeds it into the generic viewer. Replace the lick-specific viewer logic so that, when `category === 'licks'` and a lick is selected, the component renders `<LickPlayer lick={lick} />` directly rather than the generic FretboardDiagram viewer.

Concrete example — if the existing code has:

```tsx
{selectedId && (
  <FretboardDiagram notes={viewerData.notes} bpm={bpm} autoPlay={autoPlay} />
)}
```

Change the lick path to a conditional:

```tsx
{selectedId && category === 'licks' && (() => {
  const lick = LICK_LIBRARY.find(l => l.id === selectedId)
  return lick ? <LickPlayer lick={lick} /> : null
})()}

{selectedId && category !== 'licks' && (
  <FretboardDiagram notes={viewerData.notes} bpm={bpm} autoPlay={autoPlay} />
)}
```

Preserve the actual existing wiring — this is an illustration of the split, not verbatim replacement code. The key behavior: licks bypass the shared FretboardDiagram wrapper and use LickPlayer instead.

- [ ] **Step 3: Update the lick card list to show the new metadata**

Find the code that renders the lick list/cards. Update each card to show:
- `{lick.name}`
- meta row: `{lick.key} · {lick.role} · {lick.measureCount === 2 ? '2 measures' : '1 measure'} · {lick.referenceBpm} BPM`
- description snippet: `{lick.description.slice(0, 80)}...`

Add a visual distinguisher for combination licks — e.g. a class `lick-card-combination` when `lick.role === 'combination'`.

Example card JSX (adapt to existing card structure):

```tsx
<button
  key={lick.id}
  className={`lick-card ${lick.role === 'combination' ? 'lick-card-combination' : ''} ${selectedId === lick.id ? 'is-selected' : ''}`}
  onClick={() => setSelectedId(lick.id)}
>
  <div className="lick-card-name">{lick.name}</div>
  <div className="lick-card-meta">
    {lick.key} · {lick.role}{lick.leadsTo ? ` → ${lick.leadsTo}` : ''} · {lick.measureCount === 2 ? '2 measures' : '1 measure'} · {lick.referenceBpm} BPM
  </div>
  <div className="lick-card-desc">{lick.description.slice(0, 80)}{lick.description.length > 80 ? '…' : ''}</div>
</button>
```

- [ ] **Step 4: Append CSS for the combination-lick visual distinguisher**

If `.lick-card-combination` is not already styled, append to `src/App.css`:

```css
.lick-card-combination {
  border-left: 3px solid var(--accent, #f5a623);
}
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npx vite build`
Expected: both pass.

- [ ] **Step 6: Full manual smoke test**

Run: `npm run dev` and in the browser:
1. Open Library → Lick Library → 9 lick cards render.
2. Click Role: Ending → only `g_lick_basic` and `g_lick_tag` remain visible.
3. Click Role: Transition → only `d_lick_transition` visible → "Leads to" row appears.
4. Click Leads to: G → `d_lick_transition` still visible.
5. Click a lick → LickPlayer detail view renders with header, tab, controls.
6. Press ▶ Play → count-in runs (4 clicks), then cursor + synth start, loops.
7. Stop → cursor stops, returns to idle.
8. Toggle Synth off → only click continues.
9. Drag BPM to 120 → play → cursor advances faster.
10. Toggle Loop off + Play → cursor stops at last step, no re-start.
11. Switch to Deep Dive mode (if accessible) → open any curriculum skill that references a kept lick ID (e.g., a G-lick skill) → still loads.
12. Console has no new errors.

- [ ] **Step 7: Commit Phase 3**

```bash
git add src/components/Library/Library.tsx src/App.css
git commit -m "$(cat <<'EOF'
feat(library): integrate LickPlayer + role/key/leadsTo filters

- Role chips (Basic/Fill/Ending/Transition/Combination)
- Key chips (derived from getLickKeys)
- "Leads to" chip row shown only when Role = Transition
- Licks render via LickPlayer; other categories unchanged
- Combination licks get amber left-border in the card list
- Meta row shows key · role · measure-count · BPM
- Manual smoke test per spec Section 6.E passed

Part 3/3 of lick library foundation. 9 licks live; Wave 1 data fills to 30 in follow-up commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Wave 1 content: 21 net-new licks

### Task 13: Propose and approve the specific 21-lick list

**Files:** (none modified yet — this is a planning step)

- [ ] **Step 1: Claude proposes the list**

Produce a single Markdown table with 21 rows, columns: **Key | Role | (leadsTo) | Working name | Source page**. Constraints per spec:

- Basic: 5 G (minus 1 existing forward-roll variation) + 5 C (minus 2 existing) + 5 D (minus 2 existing) = **12 new basics**
- Fill: 2 G (new) + 1 C (minus 1 existing) + 1 D (new) = **3 new fills**
- Ending: 2 G (minus 2 existing) + 1 C (new) + 1 D (new) = **2 new endings**
- Transition: 2 (D→G, minus 1 existing) + 2 (G→C) + 1 (C→G) = **4 new transitions**
- Combination: 2 (2-measure) = **2 new combinations**

Total new = 12 + 3 + 2 + 4 + 2 = 23. That's 2 over 21. Reconcile by dropping 2 basics (final: 10 new basics) or 1 basic + 1 ending (final: 11 new basics + 1 new ending). Prefer the distribution with the best source-page coverage.

- [ ] **Step 2: Post the list for user approval**

Wait for user to approve, reorder, rename, or swap entries. Do not transcribe any tab until the list is approved.

- [ ] **Step 3: Split the approved list into batches of ~5**

Group by source-page proximity so one `banjo-theory` agent dispatch can reference one or two pages of source material per batch. Aim for 4-5 batches.

### Task 14: Batch 1 — dispatch banjo-theory agent

**Files:** (modified in the batch commit)
- Modify: `src/data/lickLibrary.ts` — append batch 1 entries to `LICK_LIBRARY`

- [ ] **Step 1: Dispatch the banjo-theory agent with a precise prompt**

Use the `Agent` tool with `subagent_type: "banjo-theory"`. Prompt template (fill in per batch):

```
Transcribe N banjo licks from the source material into LickReference entries.

Source: training_material/SplittingTheLicks_{XX}.jpg (page {page_num})
  (paste paths for images you have access to)

Target licks in this batch:
1. {Working name} — role: {role}, key: {key}{, leadsTo: {target}}
2. ...

For each lick, produce a LickReference object following this TypeScript interface:

(paste the interface from src/data/lickLibrary.ts)

Rules:
- `tab` array: one entry per note, 8 entries per measure (16 for combination)
- `beat` field: 0-7 for 1-measure licks, 0-15 for 2-measure combinations
- `finger`: 'T' | 'I' | 'M' — use the finger notation from the source when present
- `technique`: 'hammer' | 'pull' | 'slide' with `slideToFret` for destination
- `source`: populate with book + page exactly
- `id`: kebab-case, unique, descriptive (e.g. 'g_fill_forward_roll_hammer')
- Do NOT invent notes — if any beat is ambiguous in the source, flag it for review

Output: the N LickReference objects as a single TypeScript snippet ready to paste into the LICK_LIBRARY array. Plus a brief validation note per lick: chord tones checked, technique markers read, duration sums to 8 (or 16).

Return in one message — no clarifying questions, no exploratory tool calls beyond reading the source image(s).
```

- [ ] **Step 2: Review the agent output**

Check each lick for:
- `beat` field present on every tab entry, 0-7 (or 0-15 for combos) no duplicates unless a pinch is intended (pinches share a beat and get `group` auto-assigned by sectionToFretNotes)
- Chord tones sensible for the declared `key` + `chord` (e.g., a G basic lick should lean on G/B/D string choices)
- Technique + slideToFret pairs consistent (slide/hammer/pull all need slideToFret)
- `id` unique (grep against existing LICK_LIBRARY IDs)
- `source` populated

If any lick looks wrong, ask the agent to revise that single lick only.

- [ ] **Step 3: Paste approved licks into `src/data/lickLibrary.ts`**

Append to the `LICK_LIBRARY` array in the appropriate role section (group by role section-comment).

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npx vite build`

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, open each new lick in Library, Play, verify the synth plays something reasonable (chord tones + 8 or 16 beat measure) and the cursor advances cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/data/lickLibrary.ts
git commit -m "$(cat <<'EOF'
feat(licks): add wave 1 batch 1 — {N} licks from {source page range}

- {comma-separated list of lick IDs}

Transcribed by banjo-theory agent, reviewed against source material.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Tasks 15-18: Batches 2-5 — same pattern as Task 14

Each batch: dispatch banjo-theory agent with the batch's lick list + source page(s) → review output → paste into `src/data/lickLibrary.ts` → typecheck + build → smoke test → commit per batch.

- [ ] **Task 15: Batch 2** — repeat Task 14 with the next ~5 licks.
- [ ] **Task 16: Batch 3** — repeat Task 14 with the next ~5 licks.
- [ ] **Task 17: Batch 4** — repeat Task 14 with the next ~5 licks.
- [ ] **Task 18: Batch 5** — repeat Task 14 with the remaining licks (including the 2 combination licks; may be a smaller batch).

After all batches commit, `LICK_LIBRARY` should contain 30 licks matching the Section 5 distribution.

---

## Verification — final gate

- [ ] **Task 19: Final verification sweep**

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: success.

- [ ] **Step 3: Count check**

Run: `grep -c "^    id: '" src/data/lickLibrary.ts`
Expected: `30`

- [ ] **Step 4: ID uniqueness check**

Run: `grep -oP "id: '[^']+'" src/data/lickLibrary.ts | sort | uniq -d`
Expected: empty output (no duplicates).

- [ ] **Step 5: Curriculum skill IDs still resolve**

Run: `grep "lickId:" src/data/curriculum.ts | grep -oP "'[^']+'" > /tmp/curr_ids.txt`
Run: `grep -oP "id: '[^']+'" src/data/lickLibrary.ts | grep -oP "'[^']+'" > /tmp/lib_ids.txt`
Run: `comm -23 <(sort /tmp/curr_ids.txt) <(sort /tmp/lib_ids.txt)`
Expected: empty (every curriculum lickId resolves in lickLibrary).

- [ ] **Step 6: Full manual smoke test**

Per spec Section 6.E — run `npm run dev`, exercise:
- Each role filter shows at least one lick
- "Leads to" filter works
- Each combination lick renders 2 measures side-by-side
- Count-in + loop + click + mute toggles all behave
- Curriculum skill load for a G-lick, C-lick, D-lick each — no console errors

---

## Deferred / follow-up work (not in this plan)

- Wave 2 content: ~40 more licks to reach ~70. Pure data entry. Schema unchanged.
- Deletion of dormant `LickDetector` / `dtwMatcher` — only if user commits to audio detection staying off.
- Song library expansion (separate spec).
- Chord progression per-section roadmap (separate spec).
- Lick-in-song substitution hints (separate spec).

---

## Self-review checklist results

**Spec coverage:** each of Section 1-6 is covered.
- §1 Data model → Tasks 1, 4
- §2 Architecture → Tasks 7, 8, 9, 11, 12
- §3 Play-along UX → Tasks 8, 9, 10
- §4 Library UI → Tasks 11, 12
- §5 Wave 1 corpus → Tasks 4 (9 upgraded), 13-18 (21 new)
- §6 Migration → Tasks 1-5 (schema + deletion + dormant code) + Task 19 (verification)

**Placeholder scan:** no TBD / TODO / "implement later" / "write tests for the above".

**Type consistency:** `LickRole`, `LickReference`, `useTabPlayback`, `LickPlayer`, `synthMuted`, `loop`, `onComplete`, `onActiveStepChange` — same names used everywhere they appear.

**Known quirks documented:**
- FretboardDiagram step = 1 BPM tick at input BPM (not a half-eighth). Click-track tuned to that.
- Tempo change restarts current measure (by way of the existing useEffect bpm dependency).
- No test suite — verification by typecheck + build + manual smoke, per CLAUDE.md.
