# Coach Overhaul Implementation Plan (MVP — Phases 0–4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual-mode Banjo Buddy app with a single LLM-coached assessment-driven experience: chat assessment → personalized Weekly Focus plan → 7-day check-in chats → persistent goals.

**Architecture:** Anthropic SDK browser-side calls with user's saved API key. Pure-function engine modules (`coachPrompts`, `coachAdapter`) wrapped by `useCoachChat` hook. Dashboard reads goals from Dexie; goals mutate only through validated LLM tool calls or explicit user actions. Library remains as secondary tab.

**Tech Stack:** React 18 + TypeScript, Zustand, Dexie v14, Anthropic SDK, Vitest (new — for pure-function tests), Vite.

**Scope of this plan:** MVP only — Phases 0 through 4 from the design spec. Phases 5 (Guided Session), 6 (Live tag editing across app), and 7 (Polish) will be separate plans after MVP ships.

**Source spec:** `docs/superpowers/specs/2026-05-27-coach-overhaul-design.md`

---

## Prerequisites — Branch Hygiene

Before starting implementation:

- [ ] **Verify branch state**

```bash
git status
git log --oneline -5
```

Confirm current branch is `feat/lick-source-qc` with committed lick-QC work ending at `ef99722` and substantial uncommitted WIP.

- [ ] **PR the committed lick-source-qc work**

Push branch and open a PR for the committed lick-QC commits only (not the WIP):

```bash
git stash push -u -m "wip: quick-pick-refocus before coach overhaul"
git push -u origin feat/lick-source-qc
gh pr create --title "Lick source QC view + Wave 1 source-page bboxes" --body "Adds collapsible source-page QC view to LickPlayer with bboxes for all 30 Wave 1 licks."
```

- [ ] **Branch off main for the overhaul**

After the PR is merged (or while it's in review):

```bash
git checkout main
git pull
git checkout -b feat/coach-overhaul
git stash pop  # restore WIP for later salvage during Phase 0
```

The stashed WIP will be selectively salvaged (chord diagram additions + Circle of 5ths enhancements) in Phase 0; the rest discarded.

---

## File Structure

### New files

| Path | Purpose |
|---|---|
| `src/types/coach.ts` | `Goal`, `GoalStatus`, `ItemRef`, `ItemTag`, `CheckInRecord`, `GoalDraft`, `GoalDelta`, `Message` types |
| `src/data/conceptTags.ts` | Flat taxonomy: `CONCEPT_TAGS: ConceptTag[]` |
| `src/engine/coachPrompts.ts` | Pure: builds system prompts + tool definitions from catalog + user state |
| `src/engine/coachAdapter.ts` | Pure: validates/normalizes LLM tool calls into `GoalDelta[]` |
| `src/engine/conceptTagHelpers.ts` | Pure: tag lookup, item-filtering helpers |
| `src/engine/itemCatalog.ts` | Pure: assembles `LibraryCatalogItem[]` from all data files for LLM context |
| `src/hooks/useCoachChat.ts` | Streaming session manager: orchestrates SDK calls, persists transcript + deltas |
| `src/components/Plan/PlanDashboard.tsx` | Weekly Focus home page |
| `src/components/Plan/GoalCard.tsx` | Single goal display with supporting items |
| `src/components/Plan/CheckInPrompt.tsx` | "Time to check in" banner on dashboard |
| `src/components/Plan/SeeAllGoals.tsx` | Drawer/page showing backlog + mastered/shelved history |
| `src/components/Assessment/AssessmentChat.tsx` | First-run chat UI |
| `src/components/Assessment/LibraryConfirmation.tsx` | Post-chat tag-3-to-5-items step |
| `src/components/CheckIn/CheckInChat.tsx` | Recurring check-in chat UI |
| `src/components/CheckIn/GoalDiffReview.tsx` | "Coach proposes these changes — confirm" UI |
| `src/components/ApiKeyGate/ApiKeyGate.tsx` | Startup-gate version of API key entry |
| `tests/engine/coachPrompts.test.ts` | Vitest coverage for prompt construction |
| `tests/engine/coachAdapter.test.ts` | Vitest coverage for tool-call validation |
| `tests/engine/itemCatalog.test.ts` | Vitest coverage for catalog assembly |
| `vitest.config.ts` | Vitest configuration |
| `scripts/bulk-tag-library.cjs` | LLM-assisted bootstrap for tagging library items |

### Modified files

| Path | Change |
|---|---|
| `src/App.tsx` | Simplify page-state union; new startup gate chain (Splash → Auth → ApiKeyGate → Assessment → Dashboard) |
| `src/db/db.ts` | Add v14 schema: `goals`, `itemTags`, `checkInRecords`; drop `skillRecords` |
| `src/db/sync.ts` | Wire `goals`, `itemTags`, `checkInRecords` (without transcript blob) into sync queue |
| `src/store/useStore.ts` | Add `goals`, `itemTags`, `currentCheckInId`, related actions |
| `src/data/lickLibrary.ts` | Add `tags: string[]` field to each lick |
| `src/data/rollPatterns.ts` | Add `tags: string[]` to each pattern |
| `src/data/songLibrary.ts` | Add `tags: string[]` to each song section |
| `src/data/chordDiagrams.ts` | Add `tags: string[]` (also: salvage from WIP) |
| `src/data/scaleLibrary.ts` | Add `tags: string[]` |
| `src/components/Library/Library.tsx` | Restructure as secondary tab content (drop landing-page role) |
| `src/components/Settings/SettingsPage.tsx` | Remove API key entry (it's now a startup gate); add "Retake initial assessment" later (Phase 7, deferred) |
| `src/components/CircleOfFifths/CircleOfFifths.tsx` | Salvage from WIP if useful |
| `src/App.css` | New styles for assessment chat, goal cards, check-in chat, plan dashboard |
| `CLAUDE.md` | Replace dual-mode architecture docs with coach overview |
| `package.json` | Add `@anthropic-ai/sdk`, `vitest`, `@vitest/ui` |

### Deleted files / directories

| Path | Reason |
|---|---|
| `src/components/SkillTree/` | Deep Dive curriculum view, retired |
| `src/components/Pathway/` | Deep Dive pathway, retired |
| `src/components/Progress/` | Deep Dive progress, retired |
| `src/components/Dashboard/` | Old Dashboard, replaced by Plan/PlanDashboard |
| `src/components/ModeSelect/` | No more mode picker |
| `src/components/Intro/IntroFlow.tsx` | Folded into AssessmentChat |
| `src/components/Practice/PracticeSession.tsx` | Curriculum-based practice, retired |
| `src/components/Teaching/` | Teacher mode, retired |
| `src/components/Onboarding/` | Onboarding flow, retired (folded into assessment) |
| `src/components/Home/` | Old home, replaced by PlanDashboard |
| `src/data/curriculum.ts` | `SKILLS[]` retired |
| `src/engine/fsrs.ts`, `spacedRepetition.ts` | FSRS retired |
| `src/engine/recommendationEngine.ts` | Replaced by LLM coach |
| `src/engine/achievementTracker.ts` | Will be revisited Phase 7; delete for MVP |
| `src/engine/challengeEngine.ts`, `focusMode.ts`, `plateauDetector.ts`, `tempoRamp.ts`, `warmupEngine.ts`, `weakSpotAnalysis.ts`, `weakSpotDrillGenerator.ts`, `coachingCards.ts`, `masteryLevels.ts`, `adaptiveTempo.ts`, `performanceMetrics.ts`, `analyticsQueries.ts`, `autoChunker.ts`, `fingerBalance.ts`, `teacherClipService.ts`, `teacherMode.ts`, `theoryEngine.ts` | Curriculum/Deep-Dive supporting engines, retired |

---

# Phase 0 — Cleanup

Goal: delete unused modes/curriculum surfaces, simplify App.tsx, salvage useful bits from uncommitted WIP. After this phase the app will be in a transitional state — temporary placeholder home page until Phase 2.

### Task 0.1: Audit and salvage from uncommitted WIP

**Files:**
- Inspect: `src/data/chordDiagrams.ts`, `src/components/CircleOfFifths/CircleOfFifths.tsx`
- Discard: `src/components/ModeSelect/`, `src/components/Intro/IntroFlow.tsx` (will be deleted anyway), `src/App.tsx` WIP, `src/components/Dashboard/Dashboard.tsx` WIP

- [ ] **Step 1: Inspect chord diagram additions**

Run:
```bash
git diff main -- src/data/chordDiagrams.ts | head -200
```

Identify the +179 lines added in WIP. They are net-new chord voicings (specific keys × types). These are pure data additions with no dependency on the retired modes — keep them.

- [ ] **Step 2: Inspect Circle of 5ths additions**

Run:
```bash
git diff main -- src/components/CircleOfFifths/CircleOfFifths.tsx
```

Look for additions that enhance the circle (e.g., diatonic chord display, I-IV-V highlighting). Keep changes that work standalone in the library; discard changes that depend on retired mode state.

- [ ] **Step 3: Reset the rest of the WIP**

```bash
# Stage only the keepers
git add src/data/chordDiagrams.ts
git add src/components/CircleOfFifths/CircleOfFifths.tsx
# Discard everything else
git checkout -- src/App.tsx src/components/Auth/AuthScreen.tsx src/components/Dashboard/Dashboard.tsx src/components/Intro/IntroFlow.tsx src/components/ModeSelect/ModeSelect.tsx src/components/Practice/PracticeSession.tsx src/components/Profile/ProfilePage.tsx src/components/Settings/SettingsPage.tsx src/db/db.ts src/store/useStore.ts supabase/migration.sql CLAUDE.md
# Remove untracked WIP files we don't need
rm src/components/ModeSelect/PathPicker.tsx
rm -rf src/components/Fretboard/_archive
```

- [ ] **Step 4: Verify build still passes**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS (no type errors).

- [ ] **Step 5: Commit salvaged additions**

```bash
git commit -m "feat(library): salvage chord additions and circle-of-5ths enhancements from WIP"
```

### Task 0.2: Delete Deep Dive curriculum components

**Files:**
- Delete: `src/components/SkillTree/`, `src/components/Pathway/`, `src/components/Progress/`, `src/components/Practice/PracticeSession.tsx`, `src/components/Dashboard/`, `src/components/Home/`, `src/components/Intro/`, `src/components/Onboarding/`, `src/components/Teaching/`, `src/components/ModeSelect/`

- [ ] **Step 1: Remove directories**

```bash
rm -rf src/components/SkillTree
rm -rf src/components/Pathway
rm -rf src/components/Progress
rm -rf src/components/Home
rm -rf src/components/Intro
rm -rf src/components/Onboarding
rm -rf src/components/Teaching
rm -rf src/components/ModeSelect
rm -rf src/components/Dashboard
```

- [ ] **Step 2: Remove PracticeSession**

```bash
rm src/components/Practice/PracticeSession.tsx
```

If the `Practice/` directory is now empty, remove it too:

```bash
rmdir src/components/Practice 2>/dev/null || true
```

- [ ] **Step 3: Note build will fail temporarily — capture failing imports**

```bash
npx tsc -p tsconfig.app.json --noEmit 2>&1 | head -50
```

This will list every site that imported the deleted modules. Note them — they'll be fixed in Tasks 0.3, 0.4, 0.6.

- [ ] **Step 4: Commit the deletion**

```bash
git add -A
git commit -m "chore(coach): delete Deep Dive curriculum component dirs (build broken until App refactor)"
```

### Task 0.3: Delete curriculum data and recommendation engines

**Files:**
- Delete: `src/data/curriculum.ts`, `src/engine/fsrs.ts`, `src/engine/spacedRepetition.ts`, `src/engine/recommendationEngine.ts`, `src/engine/achievementTracker.ts`, `src/engine/challengeEngine.ts`, `src/engine/focusMode.ts`, `src/engine/plateauDetector.ts`, `src/engine/tempoRamp.ts`, `src/engine/warmupEngine.ts`, `src/engine/weakSpotAnalysis.ts`, `src/engine/weakSpotDrillGenerator.ts`, `src/engine/coachingCards.ts`, `src/engine/masteryLevels.ts`, `src/engine/adaptiveTempo.ts`, `src/engine/performanceMetrics.ts`, `src/engine/analyticsQueries.ts`, `src/engine/autoChunker.ts`, `src/engine/fingerBalance.ts`, `src/engine/teacherClipService.ts`, `src/engine/teacherMode.ts`, `src/engine/theoryEngine.ts`
- Remove: `ts-fsrs` dependency from `package.json`

- [ ] **Step 1: Remove curriculum and retired engines**

```bash
rm src/data/curriculum.ts
rm src/engine/fsrs.ts src/engine/spacedRepetition.ts src/engine/recommendationEngine.ts
rm src/engine/achievementTracker.ts src/engine/challengeEngine.ts src/engine/focusMode.ts
rm src/engine/plateauDetector.ts src/engine/tempoRamp.ts src/engine/warmupEngine.ts
rm src/engine/weakSpotAnalysis.ts src/engine/weakSpotDrillGenerator.ts
rm src/engine/coachingCards.ts src/engine/masteryLevels.ts src/engine/adaptiveTempo.ts
rm src/engine/performanceMetrics.ts src/engine/analyticsQueries.ts src/engine/autoChunker.ts
rm src/engine/fingerBalance.ts src/engine/teacherClipService.ts src/engine/teacherMode.ts
rm src/engine/theoryEngine.ts
```

- [ ] **Step 2: Verify which retired engines have external importers**

```bash
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "engine/(fsrs|spacedRepetition|recommendationEngine|achievementTracker|theoryEngine|masteryLevels|teacherMode)" | head -30
```

Note the importing sites. Most will be in components/store deleted later in this phase, or will need stubbing.

- [ ] **Step 3: Drop ts-fsrs dependency**

Edit `package.json`, remove the `"ts-fsrs": "^5.2.3"` line under `dependencies`. Then:

```bash
npm install
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(coach): delete curriculum data + Deep Dive engine modules + ts-fsrs dep"
```

### Task 0.4: Simplify the Zustand store

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Inspect current store shape**

```bash
grep -nE "skill|fsrs|teacher|pathway|recommendation|warmup|focus|achievement|plateau" src/store/useStore.ts
```

Note each curriculum-related slice — they all get removed.

- [ ] **Step 2: Strip curriculum state**

Remove from `useStore.ts` (preserve the rest verbatim):
- All `skillRecords` / `SKILL_*` state and actions
- FSRS / spaced-repetition fields
- `pathwayProgress`, `currentSession` (curriculum-based session), `warmupQueue`, `focusModeState`
- `achievementUnlocks`, `recommendation*`
- Teacher mode state (`teacherConfig`, `teacherStudents`, etc.)
- Imports of any deleted module

Add a comment marker where coach state will be added in Phase 1:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// COACH OVERHAUL: goals + itemTags + checkInRecords state added in Phase 1
// ─────────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 3: Add temporary placeholder for currentPage**

The page-state union will be replaced in Task 0.6. For now, narrow it to:

```ts
currentPage: 'splash' | 'auth' | 'placeholder-home'
```

This will fail typecheck wherever components reference the old pages — that's fine, we'll fix in 0.6.

- [ ] **Step 4: Build the store**

```bash
npx tsc -p tsconfig.app.json --noEmit src/store/useStore.ts 2>&1 | head -20
```

Expected: clean compile of the store file itself; other files will still fail.

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts
git commit -m "chore(coach): strip curriculum state from Zustand store"
```

### Task 0.5: Drop deprecated Dexie tables

**Files:**
- Modify: `src/db/db.ts`

- [ ] **Step 1: Read the v13 schema**

```bash
sed -n '405,430p' src/db/db.ts
```

Confirm v13 is the latest version block.

- [ ] **Step 2: Add v14 with deprecated tables removed**

Append the new version block in the constructor (immediately after the v13 block). v14 removes `skillRecords`, `teacherConfigs`, `teacherClips`, `skillImageOverrides` (all curriculum/teacher-related). Phase 1 will add coach tables.

```ts
this.version(14).stores({
  // Carry forward all kept tables
  userProfiles: 'id',
  practiceSessions: 'id, userId, startedAt',
  sessionItems: 'id, sessionId',
  recordings: 'id, userId, createdAt',
  streakRecords: 'id, userId',
  noteAccuracyRecords: 'id, userId, recordedAt',
  achievements: 'id, userId',
  customRollPatterns: 'id, userId',
  tabTrainingPairs: 'id, userId, createdAt',
  // Removed: skillRecords, teacherConfigs, teacherClips, skillImageOverrides
}).upgrade(async (tx) => {
  // Drop removed tables explicitly so IndexedDB releases storage
  // (Dexie auto-drops absent tables in upgrade but we make it explicit)
  await Promise.all([
    tx.table('skillRecords').clear().catch(() => undefined),
    tx.table('teacherConfigs').clear().catch(() => undefined),
    tx.table('teacherClips').clear().catch(() => undefined),
    tx.table('skillImageOverrides').clear().catch(() => undefined),
  ])
})
```

- [ ] **Step 3: Remove the table type declarations**

In the `BanjoBuddyDb` class body, remove:

```ts
skillRecords!: Table<SkillRecord>
teacherConfigs!: Table<TeacherConfig>
teacherClips!: Table<TeacherClip>
skillImageOverrides!: Table<SkillImageOverride>
```

Also remove the imports for `SkillRecord`, `TeacherConfig`, `TeacherClip`, `SkillImageOverride` types — those will go to dead code in `types/index.ts`.

- [ ] **Step 4: Typecheck db.ts**

```bash
npx tsc -p tsconfig.app.json --noEmit src/db/db.ts 2>&1 | head -20
```

Expected: clean compile of db.ts itself.

- [ ] **Step 5: Remove dead types from types/index.ts**

Open `src/types/index.ts`, remove `SkillRecord`, `TeacherConfig`, `TeacherClip`, `SkillImageOverride` interfaces.

- [ ] **Step 6: Commit**

```bash
git add src/db/db.ts src/types/index.ts
git commit -m "feat(db): bump Dexie schema to v14, drop curriculum + teacher tables"
```

### Task 0.6: Refactor App.tsx with placeholder home

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the page-state union and routing**

Open `src/App.tsx`. The current file has a `Page` type union with all the deleted pages. Replace the file body roughly as:

```tsx
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Splash from './components/Splash/Splash'
import AuthScreen from './components/Auth/AuthScreen'
import { ToolModals } from './components/ToolModals/ToolModals' // existing tool modals wrapper, if present
import './App.css'

type Page = 'splash' | 'auth' | 'placeholder-home'

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'splash':
      return <Splash />
    case 'auth':
      return <AuthScreen />
    case 'placeholder-home':
      return (
        <div className="placeholder-home">
          <h1>Banjo Buddy</h1>
          <p>Coach experience under construction.</p>
        </div>
      )
  }
}

export default function App() {
  const page = useStore((s) => s.currentPage)
  const initializeApp = useStore((s) => s.initializeApp)

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  return (
    <div className="app">
      <PageContent page={page} />
      <ToolModals />
    </div>
  )
}
```

If `ToolModals` doesn't exist as a wrapper, inline the existing Metronome/Tuner/FretLab modals from the current App.tsx. Preserve everything that's not page-routing.

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS — all stale references should be gone now.

- [ ] **Step 3: Verify dev server runs**

```bash
npm run dev
```

Open the URL. Verify the splash screen advances to auth, you can skip auth, and you land on a "Coach experience under construction" placeholder. Tool modals (metronome, tuner) still openable from wherever they're triggered.

Stop the dev server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(coach): App.tsx routes to placeholder home; old pages removed"
```

### Task 0.7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite architecture section**

Open `CLAUDE.md`. Replace the "Dual-Mode Architecture" section (and its subsections "Startup Gates", "Pages (Deep Dive mode)") with:

```markdown
### Coach-Driven Architecture

After auth + API key setup, every user takes a one-time chat assessment that produces 5–7 personalized goals. The dashboard surfaces 1 "focus" goal + 1–2 "explore" goals; the rest live behind a "see all" view. A 7-day check-in chat updates goal states based on activity and conversation.

### Startup Gates (in order)

Splash → AuthScreen (skippable → guest mode) → ApiKeyGate (required) → AssessmentChat (first-time only) → PlanDashboard

### Pages

`plan-dashboard` (home), `library` (secondary tab), `assessment`, `check-in`, `settings`, `profile`, `fretboard-lab`

**Tool modals** (float over any page): Metronome, Tuner, FretLab
```

Also update the structure block — `engine/`, `components/`, `data/` counts will be lower after Phase 0 cleanup. Use placeholder counts that the engineer will update at end of Phase 0.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): replace dual-mode docs with coach architecture overview"
```

---

# Phase 1 — Data Model & Concept Tags

Goal: introduce `Goal`, `ItemTag`, `CheckInRecord` types and Dexie tables; create flat concept-tag taxonomy; tag all library items.

### Task 1.1: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest @vitest/ui jsdom
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
```

- [ ] **Step 3: Add npm scripts**

In `package.json`, add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Verify Vitest runs with no tests**

```bash
npm test
```

Expected output includes "No test files found, exiting with code 0" (or equivalent). That's fine — there are no tests yet.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): add vitest for pure-function unit tests"
```

### Task 1.2: Define coach types

**Files:**
- Create: `src/types/coach.ts`

- [ ] **Step 1: Create the types file**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coach overhaul types
// Goals, item tags, check-in records, LLM tool-call structures
// ─────────────────────────────────────────────────────────────────────────────

export type GoalStatus =
  | 'focus'      // primary attention, max 1
  | 'explore'    // secondary, soft cap 1-2
  | 'backlog'    // queued, lives behind "see all"
  | 'mastered'   // completed
  | 'shelved'    // retired without mastering

export type ItemRef =
  | { kind: 'lick'; id: string }
  | { kind: 'roll'; id: string }
  | { kind: 'song-section'; songId: string; sectionId: string }
  | { kind: 'chord'; id: string }
  | { kind: 'scale'; id: string }

export interface GoalHistoryEntry {
  at: string                    // ISO
  from: GoalStatus
  to: GoalStatus
  reason?: string               // LLM-provided
  checkInId?: string
}

export interface Goal {
  id: string                    // uuid
  userId: string                // owner (matches userProfiles.id)
  title: string                 // LLM-generated, e.g. "Build forward roll fluency"
  description: string           // LLM-generated context
  status: GoalStatus
  supportingItemRefs: ItemRef[]
  conceptTags: string[]         // CONCEPT_TAG ids
  createdAt: string             // ISO
  updatedAt: string
  completedAt?: string
  history: GoalHistoryEntry[]
}

export type TagValue = 'got-it' | 'working' | 'new'

export interface ItemTag {
  id: string                    // composite "kind:id" — also primary key
  userId: string
  itemRef: ItemRef
  tag: TagValue
  updatedAt: string
}

export interface CoachMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  toolArgs?: unknown
  timestamp: string             // ISO
}

export type GoalDelta =
  | { op: 'add'; goal: Goal }
  | { op: 'update'; goalId: string; before: Partial<Goal>; after: Partial<Goal> }
  | { op: 'retire'; goalId: string; reason?: string }
  | { op: 'noop' }

export interface CheckInRecord {
  id: string                    // uuid
  userId: string
  kind: 'assessment' | 'checkin'
  startedAt: string             // ISO
  endedAt: string
  transcript: CoachMessage[]    // local-only, not synced
  goalDeltas: GoalDelta[]
  apiCost?: number              // USD, computed from token usage
}

export interface GoalDraft {
  title: string
  description: string
  status: GoalStatus
  supportingItemRefs: ItemRef[]
  conceptTags: string[]
}

export interface ConceptTag {
  id: string                    // kebab-case slug, e.g. 'forward-roll'
  label: string                 // display name, e.g. 'Forward Roll'
  description: string           // short LLM-readable description
}

// Compact catalog entry passed to the LLM. Built from library data files.
export interface LibraryCatalogItem {
  id: string
  kind: ItemRef['kind']
  name: string
  key?: string
  role?: string
  conceptTags: string[]
  brief: string                 // 1-line description for LLM context
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/types/coach.ts
git commit -m "feat(coach): add Goal, ItemTag, CheckInRecord, and related types"
```

### Task 1.3: Define concept tag taxonomy

**Files:**
- Create: `src/data/conceptTags.ts`

- [ ] **Step 1: Create the file**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Concept Tag taxonomy
// Flat taxonomy of pedagogical concepts; replaces SKILLS[] DAG.
// Each library item carries 0-3 concept tags.
// ─────────────────────────────────────────────────────────────────────────────

import type { ConceptTag } from '../types/coach'

export const CONCEPT_TAGS: ConceptTag[] = [
  // Rolls
  { id: 'forward-roll', label: 'Forward Roll', description: 'T-I-M-T or T-M-T-I pattern, foundation of Scruggs style' },
  { id: 'backward-roll', label: 'Backward Roll', description: 'M-I-T-M or M-I-T-T descending pattern' },
  { id: 'alternating-thumb', label: 'Alternating Thumb', description: 'Thumb alternates between bass strings (4-2-3-1 type patterns)' },
  { id: 'forward-reverse', label: 'Forward-Reverse Roll', description: 'Hybrid pattern combining forward and reverse motion' },
  { id: 'foggy-mtn-roll', label: 'Foggy Mountain Roll', description: 'T-I-M-T-M-I-M-I — the signature Scruggs licks roll' },

  // Ornaments
  { id: 'pinch', label: 'Pinch', description: 'Two strings plucked simultaneously, typically T+M' },
  { id: 'hammer-on', label: 'Hammer-On', description: 'Fretting-hand articulation to sound a higher note' },
  { id: 'pull-off', label: 'Pull-Off', description: 'Fretting-hand articulation to sound a lower note' },
  { id: 'slide', label: 'Slide', description: 'Slur between fretted notes' },
  { id: 'choke', label: 'Choke', description: 'Bend at the choke position for blues-style expression' },

  // Phrasing
  { id: 'syncopation', label: 'Syncopation', description: 'Accent off the beat; characteristic of Scruggs phrasing' },
  { id: 'melodic-pivot', label: 'Melodic Pivot', description: 'Linear melody woven into the roll pattern' },
  { id: 'chord-melody', label: 'Chord-Melody', description: 'Single-note melody supported by partial chord shapes' },
  { id: 'drop-thumb', label: 'Drop Thumb', description: 'Thumb crosses to higher strings, e.g. 5th string in clawhammer' },

  // Positions
  { id: 'g-position', label: 'G Position', description: 'Open-G voicings and fingering shapes' },
  { id: 'd-position', label: 'D Position', description: 'D-shape voicings up the neck' },
  { id: 'c-position', label: 'C Position', description: 'C-shape voicings up the neck' },
  { id: 'f-shape', label: 'F Shape', description: 'F-shape closed voicings (barre + fingers)' },
  { id: 'barre', label: 'Barre Chords', description: 'Full-barre fretting across strings' },

  // Performance
  { id: 'fast-tempo-stamina', label: 'Fast-Tempo Stamina', description: 'Sustaining clean technique at 110+ bpm' },
]

export const CONCEPT_TAG_MAP: Record<string, ConceptTag> =
  Object.fromEntries(CONCEPT_TAGS.map(t => [t.id, t]))

export function getConceptTag(id: string): ConceptTag | undefined {
  return CONCEPT_TAG_MAP[id]
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/conceptTags.ts
git commit -m "feat(coach): add flat concept tag taxonomy (20 tags)"
```

### Task 1.4: Add `tags` field to library data files

**Files:**
- Modify: `src/data/lickLibrary.ts`, `src/data/rollPatterns.ts`, `src/data/songLibrary.ts`, `src/data/chordDiagrams.ts`, `src/data/scaleLibrary.ts`

- [ ] **Step 1: Add `tags` field to type definitions**

For each library data file, locate the entry type (e.g., `Lick`, `RollPattern`, `Song`, `ChordDiagram`, `Scale`) and add an optional `tags?: string[]` field. Default to `[]` if absent.

Example for `lickLibrary.ts`:

```ts
export interface Lick {
  id: string
  // ... existing fields ...
  tags?: string[]   // concept tag IDs from src/data/conceptTags.ts
}
```

Do the same for the other four files.

- [ ] **Step 2: Tag the library items (bulk)**

This is non-trivial — there are ~150 items. Use Task 1.5 to bootstrap with an LLM script. For now, leave existing data entries unchanged; the field is optional so they default to no tags.

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/lickLibrary.ts src/data/rollPatterns.ts src/data/songLibrary.ts src/data/chordDiagrams.ts src/data/scaleLibrary.ts
git commit -m "feat(coach): add optional tags field to library item types"
```

### Task 1.5: Bulk-tag library items via LLM-assisted script

**Files:**
- Create: `scripts/bulk-tag-library.cjs`

- [ ] **Step 1: Create the script**

```js
// scripts/bulk-tag-library.cjs
// One-shot script: read library data, ask Claude to propose concept tags per item,
// write proposed tags to a JSON review file. Run, review, then merge tags into
// library data files manually.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... node scripts/bulk-tag-library.cjs
//
// Output: scripts/.bulk-tag-proposals.json

const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Load library data by spawning a tiny tsx subprocess that imports the modules
// and emits JSON. Simpler alternative: use ts-node, or parse the .ts files as
// text. Easiest: spawn `tsx -e "..."` to require and dump.
//
// For this script, we use the lightweight approach of hand-editing the data
// after reviewing the JSON output, so we just read the raw .ts and pass it to
// Claude as source for tagging suggestions.

const LIBRARY_PATHS = {
  licks: 'src/data/lickLibrary.ts',
  rolls: 'src/data/rollPatterns.ts',
  songs: 'src/data/songLibrary.ts',
  chords: 'src/data/chordDiagrams.ts',
  scales: 'src/data/scaleLibrary.ts',
}

const conceptTagsSource = fs.readFileSync('src/data/conceptTags.ts', 'utf8')

async function tagFile(kind, filepath) {
  const source = fs.readFileSync(filepath, 'utf8')
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: `You are tagging banjo library items with concept tags. Read the concept taxonomy below, then read the data file, then output a JSON object mapping item id -> array of 0-3 tag ids that apply.

Concept taxonomy:
${conceptTagsSource}

Rules:
- Tag only what's *clearly* present in the item; do not stretch
- Max 3 tags per item; usually 1-2 is right
- Skip items where no tag applies (omit them from the output)
- Output ONLY a JSON object, no commentary`,
    messages: [
      { role: 'user', content: `Tag items in this ${kind} file:\n\n${source}` },
    ],
  })

  const text = msg.content.map(b => b.text || '').join('')
  // Extract JSON from response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response for ${kind}`)
  return JSON.parse(match[0])
}

async function main() {
  const proposals = {}
  for (const [kind, filepath] of Object.entries(LIBRARY_PATHS)) {
    console.log(`Tagging ${kind}...`)
    try {
      proposals[kind] = await tagFile(kind, filepath)
    } catch (err) {
      console.error(`Failed ${kind}:`, err.message)
      proposals[kind] = { error: err.message }
    }
  }
  fs.writeFileSync(
    'scripts/.bulk-tag-proposals.json',
    JSON.stringify(proposals, null, 2)
  )
  console.log('Wrote scripts/.bulk-tag-proposals.json — review and merge manually.')
}

main()
```

- [ ] **Step 2: Install Anthropic SDK as a devDependency** (it'll also be a runtime dep in Phase 3; install now)

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 3: Add proposals file to .gitignore**

Append to `.gitignore`:

```
scripts/.bulk-tag-proposals.json
```

- [ ] **Step 4: Run the script** (requires `ANTHROPIC_API_KEY` env var)

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/bulk-tag-library.cjs
```

Expected: `scripts/.bulk-tag-proposals.json` written with proposals per kind.

- [ ] **Step 5: Merge proposals into library data files**

This step is **manual**. Open `scripts/.bulk-tag-proposals.json`, and for each item, paste the tag array into the corresponding library entry in `src/data/*.ts`. Skim each proposal — reject anything that looks wrong (the LLM occasionally over-tags or invents tag IDs not in the taxonomy).

A simple grep to verify only known tag IDs were used:

```bash
node -e "
const fs = require('fs');
const valid = require('./src/data/conceptTags.ts').match(/id:\s*'([^']+)'/g).map(m => m.match(/'([^']+)'/)[1]);
const proposals = JSON.parse(fs.readFileSync('scripts/.bulk-tag-proposals.json'));
const all = Object.values(proposals).flatMap(o => Object.values(o)).flat();
const bad = [...new Set(all)].filter(t => !valid.includes(t));
console.log('Unknown tag IDs:', bad);
"
```

- [ ] **Step 6: Commit the script and the data-file tag additions**

```bash
git add scripts/bulk-tag-library.cjs .gitignore src/data/
git commit -m "feat(coach): bulk-tag library items with concept tags (LLM-assisted + human review)"
```

### Task 1.6: Add Dexie tables for goals, itemTags, checkInRecords

**Files:**
- Modify: `src/db/db.ts`

- [ ] **Step 1: Import new types**

At the top of `db.ts`, add:

```ts
import type { Goal, ItemTag, CheckInRecord } from '../types/coach'
```

- [ ] **Step 2: Add table declarations**

In the `BanjoBuddyDb` class body (after existing `Table<...>` declarations):

```ts
goals!: Table<Goal>
itemTags!: Table<ItemTag>
checkInRecords!: Table<CheckInRecord>
```

- [ ] **Step 3: Bump to v15 with new tables**

In the constructor, after the v14 block, add:

```ts
this.version(15).stores({
  // Carry forward kept tables (same as v14)
  userProfiles: 'id',
  practiceSessions: 'id, userId, startedAt',
  sessionItems: 'id, sessionId, goalId',
  recordings: 'id, userId, createdAt',
  streakRecords: 'id, userId',
  noteAccuracyRecords: 'id, userId, recordedAt',
  achievements: 'id, userId',
  customRollPatterns: 'id, userId',
  tabTrainingPairs: 'id, userId, createdAt',
  // NEW
  goals: 'id, userId, status, updatedAt',
  itemTags: 'id, userId, updatedAt',
  checkInRecords: 'id, userId, kind, startedAt',
})
```

(Note: also added `goalId` to `sessionItems` index — used in Phase 4 for plan-context activity lookup.)

- [ ] **Step 4: Update SessionItem type to include goalId**

In `src/types/index.ts`, locate the `SessionItem` interface and add:

```ts
goalId?: string  // optional: which plan goal this practice item belongs to
```

Remove any curriculum-related fields from `SessionItem` (e.g., `skillId`, `subSkillId`) if present.

- [ ] **Step 5: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 6: Verify schema in browser**

```bash
npm run dev
```

Open dev server, open browser devtools → Application → IndexedDB → BanjoBuddyDb. Verify version is 15 and tables `goals`, `itemTags`, `checkInRecords` exist. Stop server.

- [ ] **Step 7: Commit**

```bash
git add src/db/db.ts src/types/index.ts
git commit -m "feat(db): add goals, itemTags, checkInRecords tables (v15)"
```

### Task 1.7: Wire sync engine for new tables

**Files:**
- Modify: `src/db/sync.ts`

- [ ] **Step 1: Identify the sync queue mechanism**

```bash
grep -nE "syncQueue|pushPending|toSnake|toCamel" src/db/sync.ts | head -20
```

Each table that syncs to Supabase typically has an entry in a sync registry. Find the registry and add entries for `goals` and `itemTags`. **Exclude `checkInRecords`** from sync because the transcript blob would bloat sync payloads — the design spec says transcripts are local-only.

- [ ] **Step 2: Add `goals` and `itemTags` to sync registry**

Follow the existing pattern for adding a synced table (snake_case mapping, push/pull handlers). The structure depends on how `sync.ts` is organized — find an existing example like `customRollPatterns` and replicate.

For `checkInRecords`, **do not** add to the sync registry. They stay local.

- [ ] **Step 3: Add corresponding Supabase tables**

Open `supabase/migration.sql`. Append:

```sql
-- Coach overhaul: goals, item tags

create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null,
  supporting_item_refs jsonb not null default '[]'::jsonb,
  concept_tags text[] not null default '{}',
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz
);
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_status_idx on public.goals (user_id, status);

create table if not exists public.item_tags (
  id text primary key,                -- composite "kind:id"
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  item_ref jsonb not null,
  tag text not null,
  updated_at timestamptz not null
);
create index if not exists item_tags_user_id_idx on public.item_tags (user_id);

-- RLS
alter table public.goals enable row level security;
alter table public.item_tags enable row level security;

create policy "users can read own goals" on public.goals
  for select using (auth.uid() = user_id);
create policy "users can write own goals" on public.goals
  for all using (auth.uid() = user_id);
create policy "users can read own item_tags" on public.item_tags
  for select using (auth.uid() = user_id);
create policy "users can write own item_tags" on public.item_tags
  for all using (auth.uid() = user_id);
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/sync.ts supabase/migration.sql
git commit -m "feat(sync): wire goals + itemTags into Supabase sync engine; checkInRecords local-only"
```

### Task 1.8: Add coach state to Zustand store

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Add types to store slice**

At the top of `useStore.ts`, import:

```ts
import type { Goal, ItemTag, CheckInRecord, TagValue, ItemRef } from '../types/coach'
import { db } from '../db/db'
```

- [ ] **Step 2: Define the slice shape**

Add inside the store interface:

```ts
// Coach state
goals: Goal[]
itemTags: Record<string, ItemTag>   // keyed by "kind:id"
currentCheckInId: string | null
lastCheckInAt: string | null

// Coach actions
loadGoals: () => Promise<void>
loadItemTags: () => Promise<void>
upsertGoal: (goal: Goal) => Promise<void>
retireGoal: (goalId: string, reason?: string) => Promise<void>
setItemTag: (itemRef: ItemRef, tag: TagValue) => Promise<void>
recordCheckIn: (record: CheckInRecord) => Promise<void>
```

- [ ] **Step 3: Implement actions**

In the `create<...>()` body, after existing actions, add:

```ts
goals: [],
itemTags: {},
currentCheckInId: null,
lastCheckInAt: null,

loadGoals: async () => {
  const userId = get().currentUserId
  if (!userId) return
  const goals = await db.goals.where('userId').equals(userId).toArray()
  set({ goals })
},

loadItemTags: async () => {
  const userId = get().currentUserId
  if (!userId) return
  const tags = await db.itemTags.where('userId').equals(userId).toArray()
  set({ itemTags: Object.fromEntries(tags.map(t => [t.id, t])) })
},

upsertGoal: async (goal) => {
  await db.goals.put(goal)
  await get().loadGoals()
},

retireGoal: async (goalId, reason) => {
  const goal = await db.goals.get(goalId)
  if (!goal) return
  const now = new Date().toISOString()
  const updated: Goal = {
    ...goal,
    status: 'shelved',
    updatedAt: now,
    history: [
      ...goal.history,
      { at: now, from: goal.status, to: 'shelved', reason },
    ],
  }
  await db.goals.put(updated)
  await get().loadGoals()
},

setItemTag: async (itemRef, tag) => {
  const userId = get().currentUserId
  if (!userId) return
  const id = `${itemRef.kind}:${'id' in itemRef ? itemRef.id : `${itemRef.songId}/${itemRef.sectionId}`}`
  const itemTag: ItemTag = {
    id,
    userId,
    itemRef,
    tag,
    updatedAt: new Date().toISOString(),
  }
  await db.itemTags.put(itemTag)
  set((s) => ({ itemTags: { ...s.itemTags, [id]: itemTag } }))
},

recordCheckIn: async (record) => {
  await db.checkInRecords.put(record)
  set({ lastCheckInAt: record.endedAt })
},
```

- [ ] **Step 4: Wire into initializeApp**

In the existing `initializeApp` action body, after auth is confirmed, add:

```ts
await get().loadGoals()
await get().loadItemTags()
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat(store): add coach state slice (goals, itemTags, currentCheckInId)"
```

---

# Phase 2 — Plan Dashboard Skeleton

Goal: build the read-only PlanDashboard reading from Dexie. Display 1 focus + 1–2 explore goals. Wire as the new home page. Library available as a tab.

### Task 2.1: Build the itemCatalog engine

**Files:**
- Create: `src/engine/itemCatalog.ts`
- Create: `tests/engine/itemCatalog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/itemCatalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildLibraryCatalog } from '../../src/engine/itemCatalog'

describe('buildLibraryCatalog', () => {
  it('produces non-empty catalog from library data', () => {
    const catalog = buildLibraryCatalog()
    expect(catalog.length).toBeGreaterThan(0)
  })

  it('each entry has id, kind, name, and conceptTags', () => {
    const catalog = buildLibraryCatalog()
    for (const item of catalog) {
      expect(item.id).toBeTypeOf('string')
      expect(item.kind).toBeTypeOf('string')
      expect(item.name).toBeTypeOf('string')
      expect(Array.isArray(item.conceptTags)).toBe(true)
    }
  })

  it('includes items from all 5 kinds', () => {
    const catalog = buildLibraryCatalog()
    const kinds = new Set(catalog.map(c => c.kind))
    expect(kinds.has('lick')).toBe(true)
    expect(kinds.has('roll')).toBe(true)
    expect(kinds.has('song-section')).toBe(true)
    expect(kinds.has('chord')).toBe(true)
    expect(kinds.has('scale')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- itemCatalog
```

Expected: FAIL with "Cannot find module ../../src/engine/itemCatalog".

- [ ] **Step 3: Implement itemCatalog.ts**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Library catalog builder
// Pure: assembles all library items into LibraryCatalogItem[] for LLM context
// ─────────────────────────────────────────────────────────────────────────────

import type { LibraryCatalogItem } from '../types/coach'
import { LICK_LIBRARY } from '../data/lickLibrary'
import { ROLL_PATTERNS } from '../data/rollPatterns'
import { SONGS } from '../data/songLibrary'
import { CHORD_DIAGRAMS } from '../data/chordDiagrams'
import { SCALE_LIBRARY } from '../data/scaleLibrary'

export function buildLibraryCatalog(): LibraryCatalogItem[] {
  const items: LibraryCatalogItem[] = []

  for (const lick of LICK_LIBRARY) {
    items.push({
      id: lick.id,
      kind: 'lick',
      name: lick.name,
      key: lick.key,
      role: lick.role,
      conceptTags: lick.tags ?? [],
      brief: lick.description ?? `${lick.role} lick in ${lick.key}`,
    })
  }

  for (const roll of ROLL_PATTERNS) {
    items.push({
      id: roll.id,
      kind: 'roll',
      name: roll.name,
      conceptTags: roll.tags ?? [],
      brief: roll.description ?? roll.name,
    })
  }

  for (const song of SONGS) {
    for (const section of song.sections ?? []) {
      items.push({
        id: section.id,
        kind: 'song-section',
        name: `${song.title} — ${section.label}`,
        key: song.key,
        conceptTags: section.tags ?? [],
        brief: section.description ?? `${section.label} of ${song.title}`,
      })
    }
  }

  for (const chord of CHORD_DIAGRAMS) {
    items.push({
      id: chord.id,
      kind: 'chord',
      name: chord.name,
      key: chord.key,
      conceptTags: chord.tags ?? [],
      brief: `${chord.name} chord, ${chord.type ?? 'major'}, ${chord.position ?? 'open'} position`,
    })
  }

  for (const scale of SCALE_LIBRARY) {
    items.push({
      id: scale.id,
      kind: 'scale',
      name: scale.name,
      key: scale.key,
      conceptTags: scale.tags ?? [],
      brief: scale.description ?? scale.name,
    })
  }

  return items
}
```

Note: if any of `lick.description`, `section.description`, etc. don't exist as fields in the existing types, fall back to a default string. The engineer should check existing types and adapt — the `brief` field must always be a non-empty string.

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- itemCatalog
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/itemCatalog.ts tests/engine/itemCatalog.test.ts
git commit -m "feat(coach): add buildLibraryCatalog engine + tests"
```

### Task 2.2: Build the GoalCard component

**Files:**
- Create: `src/components/Plan/GoalCard.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Implement GoalCard**

```tsx
import type { Goal, ItemRef, TagValue } from '../../types/coach'
import { useStore } from '../../store/useStore'

interface GoalCardProps {
  goal: Goal
  onItemClick: (ref: ItemRef) => void
  onStartSession?: (goal: Goal) => void  // optional, undefined in MVP (Phase 5 adds)
}

const STATUS_LABEL: Record<Goal['status'], string> = {
  focus: 'Focus',
  explore: 'Explore',
  backlog: 'Up next',
  mastered: 'Mastered',
  shelved: 'Shelved',
}

const STATUS_COLOR: Record<Goal['status'], string> = {
  focus: 'goal-card--focus',
  explore: 'goal-card--explore',
  backlog: 'goal-card--backlog',
  mastered: 'goal-card--mastered',
  shelved: 'goal-card--shelved',
}

export function GoalCard({ goal, onItemClick, onStartSession }: GoalCardProps) {
  const itemTags = useStore((s) => s.itemTags)

  return (
    <article className={`goal-card ${STATUS_COLOR[goal.status]}`}>
      <header className="goal-card-header">
        <span className="goal-card-status">{STATUS_LABEL[goal.status]}</span>
        <h3 className="goal-card-title">{goal.title}</h3>
        {goal.description && (
          <p className="goal-card-description">{goal.description}</p>
        )}
      </header>
      <ul className="goal-card-items">
        {goal.supportingItemRefs.map((ref, i) => {
          const tagId = `${ref.kind}:${'id' in ref ? ref.id : `${ref.songId}/${ref.sectionId}`}`
          const tag = itemTags[tagId]?.tag
          return (
            <li key={i}>
              <button
                className="goal-card-item"
                onClick={() => onItemClick(ref)}
              >
                <span className="goal-card-item-name">
                  {/* Resolve item name in the dashboard, pass via ref decoration; for now, kind:id */}
                  {ref.kind}: {'id' in ref ? ref.id : `${ref.songId}/${ref.sectionId}`}
                </span>
                {tag && <span className={`tag-badge tag-badge--${tag}`}>{tag}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {onStartSession && (
        <button
          className="goal-card-start-session"
          onClick={() => onStartSession(goal)}
        >
          ▶ Guided session
        </button>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Add styles to App.css**

Append to `src/App.css`:

```css
/* Coach: GoalCard */
.goal-card {
  background: var(--surface-elevated, #2d4a5e);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 3px solid transparent;
}
.goal-card--focus { border-left-color: #d4a04a; }
.goal-card--explore { border-left-color: #4ade80; }
.goal-card--backlog { border-left-color: #94a3b8; opacity: 0.85; }
.goal-card--mastered { border-left-color: #c084fc; opacity: 0.7; }
.goal-card--shelved { opacity: 0.5; }

.goal-card-header { margin-bottom: 10px; }
.goal-card-status {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  opacity: 0.7;
}
.goal-card-title { margin: 4px 0 6px; font-size: 16px; font-weight: 600; }
.goal-card-description { font-size: 13px; opacity: 0.8; margin: 0; }

.goal-card-items { list-style: none; padding: 0; margin: 0; }
.goal-card-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.goal-card-item:hover { background: rgba(255,255,255,0.05); }

.tag-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tag-badge--got-it { background: #1f3d1f; color: #4ade80; }
.tag-badge--working { background: #3d3520; color: #d4a04a; }
.tag-badge--new { background: #2a1f3d; color: #c084fc; }

.goal-card-start-session {
  margin-top: 8px;
  background: transparent;
  border: 1px solid currentColor;
  color: inherit;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Plan/GoalCard.tsx src/App.css
git commit -m "feat(coach): add GoalCard component with status-based styling"
```

### Task 2.3: Build PlanDashboard component

**Files:**
- Create: `src/components/Plan/PlanDashboard.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Implement PlanDashboard**

```tsx
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

  const { focus, explore, backlog, mastered, shelved } = useMemo(() => {
    const buckets = {
      focus: [] as Goal[],
      explore: [] as Goal[],
      backlog: [] as Goal[],
      mastered: [] as Goal[],
      shelved: [] as Goal[],
    }
    for (const g of goals) buckets[g.status].push(g)
    return buckets
  }, [goals])

  const handleItemClick = (ref: ItemRef) => {
    // Phase 3+ wires this to actual library players; for now, console-log
    console.log('open item:', ref)
  }

  if (goals.length === 0) {
    return (
      <div className="plan-dashboard-empty">
        <h2>No plan yet</h2>
        <p>Take the assessment to generate your first plan.</p>
      </div>
    )
  }

  return (
    <div className="plan-dashboard">
      <header className="plan-dashboard-header">
        <h1>Your Plan</h1>
        <span className="plan-dashboard-subtitle">This week</span>
      </header>

      {focus.map((g) => (
        <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
      ))}
      {explore.map((g) => (
        <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
      ))}

      {backlog.length > 0 && (
        <button
          className="plan-dashboard-see-all"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Hide' : 'See all'} ({backlog.length} more)
        </button>
      )}

      {showAll && (
        <section className="plan-dashboard-backlog">
          <h2>Up next</h2>
          {backlog.map((g) => (
            <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
          ))}
          {mastered.length > 0 && (
            <>
              <h2>Mastered</h2>
              {mastered.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
              ))}
            </>
          )}
          {shelved.length > 0 && (
            <>
              <h2>Shelved</h2>
              {shelved.map((g) => (
                <GoalCard key={g.id} goal={g} onItemClick={handleItemClick} />
              ))}
            </>
          )}
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add styles**

Append to `src/App.css`:

```css
/* Coach: PlanDashboard */
.plan-dashboard { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
.plan-dashboard-header { margin-bottom: 24px; }
.plan-dashboard-header h1 { margin: 0; font-size: 24px; }
.plan-dashboard-subtitle {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.6;
}
.plan-dashboard-see-all {
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  color: var(--accent, #d4a04a);
  padding: 12px;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 16px;
}
.plan-dashboard-backlog { margin-top: 24px; }
.plan-dashboard-backlog h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
  margin: 24px 0 8px;
}
.plan-dashboard-empty {
  text-align: center;
  padding: 64px 24px;
  opacity: 0.7;
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Plan/PlanDashboard.tsx src/App.css
git commit -m "feat(coach): add PlanDashboard with focus/explore + see-all backlog"
```

### Task 2.4: Wire PlanDashboard as the home page, add Library tab

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Update Page union**

In `src/store/useStore.ts`, update:

```ts
currentPage: 'splash' | 'auth' | 'plan-dashboard' | 'library' | 'settings' | 'profile' | 'fretboard-lab'
```

- [ ] **Step 2: Add navigation tabs in App.tsx**

```tsx
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Splash from './components/Splash/Splash'
import AuthScreen from './components/Auth/AuthScreen'
import { PlanDashboard } from './components/Plan/PlanDashboard'
import Library from './components/Library/Library'
import SettingsPage from './components/Settings/SettingsPage'
import ProfilePage from './components/Profile/ProfilePage'
import { FretboardLab } from './components/Fretboard/FretboardLab'
import './App.css'

type Page = 'splash' | 'auth' | 'plan-dashboard' | 'library' | 'settings' | 'profile' | 'fretboard-lab'

function NavBar() {
  const page = useStore((s) => s.currentPage)
  const setPage = useStore((s) => s.setCurrentPage)
  const tabs: Array<[Page, string]> = [
    ['plan-dashboard', 'Plan'],
    ['library', 'Library'],
    ['settings', 'Settings'],
    ['profile', 'Profile'],
  ]
  return (
    <nav className="app-nav">
      {tabs.map(([p, label]) => (
        <button
          key={p}
          className={`app-nav-tab ${page === p ? 'active' : ''}`}
          onClick={() => setPage(p)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'splash': return <Splash />
    case 'auth': return <AuthScreen />
    case 'plan-dashboard': return <PlanDashboard />
    case 'library': return <Library />
    case 'settings': return <SettingsPage />
    case 'profile': return <ProfilePage />
    case 'fretboard-lab': return <FretboardLab />
  }
}

export default function App() {
  const page = useStore((s) => s.currentPage)
  const initializeApp = useStore((s) => s.initializeApp)
  const showNav = page !== 'splash' && page !== 'auth'

  useEffect(() => { initializeApp() }, [initializeApp])

  return (
    <div className="app">
      {showNav && <NavBar />}
      <PageContent page={page} />
    </div>
  )
}
```

- [ ] **Step 3: Add NavBar styles**

Append to `src/App.css`:

```css
.app-nav {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  background: var(--surface, #1a1a1a);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}
.app-nav-tab {
  background: transparent;
  border: none;
  color: inherit;
  padding: 8px 16px;
  cursor: pointer;
  opacity: 0.6;
  border-bottom: 2px solid transparent;
}
.app-nav-tab.active {
  opacity: 1;
  border-bottom-color: var(--accent, #d4a04a);
}
```

- [ ] **Step 4: Verify dev server**

```bash
npm run dev
```

Open browser. Confirm:
- Splash → Auth → tabbed shell with NavBar
- Plan tab shows "No plan yet" empty state
- Library tab loads existing Library component
- Settings + Profile tabs load existing components

Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/store/useStore.ts src/App.css
git commit -m "feat(coach): wire PlanDashboard as home + tabbed navigation"
```

### Task 2.5: Manual seed-goal verification

**Files:**
- Temporary: browser devtools

- [ ] **Step 1: Seed a fake focus goal via devtools to verify rendering**

```bash
npm run dev
```

In browser devtools console (with the app loaded and authenticated):

```js
const { db } = await import('./src/db/db.ts')
const userId = (await db.userProfiles.toArray())[0]?.id
const now = new Date().toISOString()
await db.goals.put({
  id: crypto.randomUUID(),
  userId,
  title: 'Build forward roll fluency',
  description: 'You play at 90 bpm cleanly; goal is 110',
  status: 'focus',
  supportingItemRefs: [{ kind: 'roll', id: 'forward-roll-basic' }],
  conceptTags: ['forward-roll'],
  createdAt: now,
  updatedAt: now,
  history: [],
})
window.location.reload()
```

Confirm the goal renders as a focus card on the dashboard. Refresh data, manually verify backlog logic by changing status to `backlog` and adding multiple goals.

- [ ] **Step 2: Clear seed data**

```js
await (await import('./src/db/db.ts')).db.goals.clear()
```

- [ ] **Step 3: No commit** (this is verification only)

---

# Phase 3 — Assessment Chat & First Plan

Goal: build the assessment chat surface that produces a first plan via LLM tool calls; gate startup behind API key entry; integrate library tag confirmation step.

### Task 3.1: Promote API key entry to a startup gate

**Files:**
- Create: `src/components/ApiKeyGate/ApiKeyGate.tsx`
- Modify: `src/components/Settings/SettingsPage.tsx`
- Modify: `src/store/useStore.ts`, `src/App.tsx`

- [ ] **Step 1: Locate the existing API key storage**

```bash
grep -rn "apiKey\|claudeKey\|anthropic" src/ | head -20
```

Note the key name and storage mechanism (likely `localStorage` or Dexie userProfiles).

- [ ] **Step 2: Add state**

In `useStore.ts`:

```ts
apiKey: string | null
setApiKey: (key: string) => Promise<void>
```

Implementation:

```ts
apiKey: localStorage.getItem('banjo-buddy-anthropic-key'),
setApiKey: async (key) => {
  localStorage.setItem('banjo-buddy-anthropic-key', key)
  set({ apiKey: key })
},
```

- [ ] **Step 3: Create ApiKeyGate component**

```tsx
// src/components/ApiKeyGate/ApiKeyGate.tsx
import { useState } from 'react'
import { useStore } from '../../store/useStore'

export function ApiKeyGate() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setApiKey = useStore((s) => s.setApiKey)
  const setCurrentPage = useStore((s) => s.setCurrentPage)

  const submit = async () => {
    if (!input.startsWith('sk-ant-')) {
      setError('Anthropic API keys start with "sk-ant-"')
      return
    }
    await setApiKey(input.trim())
    setCurrentPage('assessment')
  }

  return (
    <div className="api-key-gate">
      <h1>Connect your Claude API key</h1>
      <p>
        Banjo Buddy uses Claude to generate your personalized practice plan.
        Your key is stored locally — never sent anywhere except api.anthropic.com.
      </p>
      <input
        type="password"
        placeholder="sk-ant-..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button onClick={submit} disabled={!input}>Continue</button>
      <p className="hint">
        Don't have a key? Get one at{' '}
        <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
          console.anthropic.com
        </a>
      </p>
    </div>
  )
}
```

Styles in `App.css`:

```css
.api-key-gate {
  max-width: 480px;
  margin: 64px auto;
  padding: 24px;
  text-align: center;
}
.api-key-gate input {
  width: 100%;
  padding: 12px;
  margin: 16px 0;
  background: #2d4a5e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: inherit;
  font-family: monospace;
}
.api-key-gate .error { color: #f87171; }
.api-key-gate .hint { font-size: 12px; opacity: 0.6; }
.api-key-gate button {
  padding: 10px 24px;
  background: var(--accent, #d4a04a);
  color: #000;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.api-key-gate button:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 4: Wire the gate into App.tsx**

Update `Page` union to add `'api-key-gate' | 'assessment'`. Update the routing in `initializeApp` (or a new `determineStartupPage` action):

```ts
determineStartupPage: () => {
  const { apiKey, assessmentCompletedAt } = get()
  if (!apiKey) return 'api-key-gate'
  if (!assessmentCompletedAt) return 'assessment'
  return 'plan-dashboard'
}
```

Then in `App.tsx`, replace the `'splash' → 'auth' → 'placeholder-home'` transition with a chain that calls `determineStartupPage()` after auth.

- [ ] **Step 5: Remove API key field from Settings**

In `src/components/Settings/SettingsPage.tsx`, locate the API key input/save UI and remove it. (Returning users can still update their key by going back to the gate, which Phase 7 will improve. For MVP, removing the Settings entry is acceptable — the key gate runs when key is absent.)

Add a small section "API Connection" with a "Reset key" button:

```tsx
<section>
  <h3>API Connection</h3>
  <button onClick={() => {
    localStorage.removeItem('banjo-buddy-anthropic-key')
    window.location.reload()
  }}>
    Disconnect API key
  </button>
</section>
```

- [ ] **Step 6: Verify**

```bash
npm run dev
```

In a fresh-profile browser (or after clearing localStorage), confirm: Splash → Auth → ApiKeyGate → (placeholder assessment page).

- [ ] **Step 7: Commit**

```bash
git add src/components/ApiKeyGate src/components/Settings src/store/useStore.ts src/App.tsx src/App.css
git commit -m "feat(coach): promote API key entry to startup gate"
```

### Task 3.2: Build coachPrompts engine

**Files:**
- Create: `src/engine/coachPrompts.ts`
- Create: `tests/engine/coachPrompts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/engine/coachPrompts.test.ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, ASSESSMENT_TOOLS, CHECKIN_TOOLS } from '../../src/engine/coachPrompts'
import type { Goal } from '../../src/types/coach'

const sampleGoal: Goal = {
  id: 'g1',
  userId: 'u1',
  title: 'Forward roll @ 110',
  description: 'Stretch tempo',
  status: 'focus',
  supportingItemRefs: [{ kind: 'roll', id: 'forward-roll-basic' }],
  conceptTags: ['forward-roll'],
  createdAt: '2026-05-27T00:00:00Z',
  updatedAt: '2026-05-27T00:00:00Z',
  history: [],
}

describe('buildSystemPrompt', () => {
  it('produces a non-empty string', () => {
    const out = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    expect(out.length).toBeGreaterThan(500)
  })

  it('includes the concept taxonomy', () => {
    const out = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    expect(out).toContain('forward-roll')
  })

  it('includes current goals for check-in', () => {
    const out = buildSystemPrompt({ kind: 'checkin', goals: [sampleGoal], itemTags: [], recentActivity: [] })
    expect(out).toContain('Forward roll @ 110')
  })

  it('includes the catalog with at least one lick', () => {
    const out = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    expect(out).toMatch(/"kind":\s*"lick"/)
  })
})

describe('tool definitions', () => {
  it('assessment tools include propose_initial_plan', () => {
    expect(ASSESSMENT_TOOLS.find(t => t.name === 'propose_initial_plan')).toBeDefined()
  })

  it('check-in tools include update_goal, add_goal, retire_goal, acknowledge_no_changes', () => {
    const names = CHECKIN_TOOLS.map(t => t.name)
    expect(names).toContain('update_goal')
    expect(names).toContain('add_goal')
    expect(names).toContain('retire_goal')
    expect(names).toContain('acknowledge_no_changes')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- coachPrompts
```

Expected: FAIL.

- [ ] **Step 3: Implement coachPrompts.ts**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coach prompt builders
// Pure: assembles system prompts + tool definitions for assessment/check-in chats
// ─────────────────────────────────────────────────────────────────────────────

import type { Goal, ItemTag } from '../types/coach'
import { CONCEPT_TAGS } from '../data/conceptTags'
import { buildLibraryCatalog } from './itemCatalog'

const PERSONA = `You are a Scruggs-style banjo coach helping an intermediate player. The player has past the beginner stage and is working through bluegrass repertoire — they know basic forward and backward rolls, can play a few songs, but are building tempo, ornament technique, and vocabulary.

Your job is to listen to where they are right now (assessment chat) or where they've been this week (check-in chat) and craft personalized goals that point them at concrete library items they can practice. You speak plainly, like an experienced teacher — encouraging but specific. No filler, no "great question" preambles. Ask probing follow-ups when a player's answer is vague (e.g., "what tempo can you hold that cleanly?" or "what's frustrating right now?").

When proposing goals, prefer specific over general ("Push the forward roll to 110 bpm" beats "Get better at rolls"). Tie each goal to 1–3 concrete library items — real songs, licks, rolls — that the player can practice. Keep goals achievable in 1–3 weeks.

Use the concept taxonomy as your pedagogical vocabulary. Use the library catalog as your menu of practiceable items.`

export interface PromptContext {
  kind: 'assessment' | 'checkin'
  goals: Goal[]
  itemTags: ItemTag[]
  recentActivity: { itemRef: { kind: string; id: string }; count: number; lastAt: string }[]
  lastCheckInSummary?: string
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const catalog = buildLibraryCatalog()
  return [
    PERSONA,
    '',
    '# Concept taxonomy',
    JSON.stringify(CONCEPT_TAGS, null, 2),
    '',
    '# Library catalog',
    JSON.stringify(catalog, null, 2),
    '',
    '# Current user state',
    JSON.stringify({
      goals: ctx.goals,
      itemTags: ctx.itemTags,
      recentActivity: ctx.recentActivity,
      lastCheckInSummary: ctx.lastCheckInSummary,
    }, null, 2),
    '',
    ctx.kind === 'assessment'
      ? '# Mode: Initial assessment\nAfter 4–8 substantive turns, emit a single propose_initial_plan tool call with 5–7 goals (1 focus, 1-2 explore, rest backlog). Then stop.'
      : '# Mode: Weekly check-in\nReference real activity in your opener. After 2–4 turns, emit 0–2 goal-change tool calls (update_goal / add_goal / retire_goal) OR acknowledge_no_changes if nothing should change. Soft cap: do not change more than 2 goals in a single check-in unless the user explicitly asks.',
  ].join('\n')
}

const goalDraftSchema = {
  type: 'object',
  required: ['title', 'description', 'status', 'supportingItemRefs', 'conceptTags'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['focus', 'explore', 'backlog', 'mastered', 'shelved'] },
    supportingItemRefs: {
      type: 'array',
      items: {
        type: 'object',
        oneOf: [
          { properties: { kind: { const: 'lick' }, id: { type: 'string' } }, required: ['kind', 'id'] },
          { properties: { kind: { const: 'roll' }, id: { type: 'string' } }, required: ['kind', 'id'] },
          { properties: { kind: { const: 'chord' }, id: { type: 'string' } }, required: ['kind', 'id'] },
          { properties: { kind: { const: 'scale' }, id: { type: 'string' } }, required: ['kind', 'id'] },
          { properties: { kind: { const: 'song-section' }, songId: { type: 'string' }, sectionId: { type: 'string' } }, required: ['kind', 'songId', 'sectionId'] },
        ],
      },
    },
    conceptTags: { type: 'array', items: { type: 'string' } },
  },
}

export const ASSESSMENT_TOOLS = [
  {
    name: 'propose_initial_plan',
    description: 'Emit the proposed initial plan after gathering enough context. Triggers UI transition to library tag confirmation step.',
    input_schema: {
      type: 'object',
      required: ['goals'],
      properties: {
        goals: { type: 'array', items: goalDraftSchema, minItems: 3, maxItems: 8 },
      },
    },
  },
]

export const CHECKIN_TOOLS = [
  {
    name: 'update_goal',
    description: 'Modify an existing goal. Use to promote/demote status or refresh supportingItemRefs.',
    input_schema: {
      type: 'object',
      required: ['goalId'],
      properties: {
        goalId: { type: 'string' },
        status: { type: 'string', enum: ['focus', 'explore', 'backlog', 'mastered', 'shelved'] },
        title: { type: 'string' },
        description: { type: 'string' },
        supportingItemRefs: goalDraftSchema.properties.supportingItemRefs,
      },
    },
  },
  {
    name: 'add_goal',
    description: 'Add a new goal to the plan.',
    input_schema: {
      type: 'object',
      required: ['goal'],
      properties: { goal: goalDraftSchema },
    },
  },
  {
    name: 'retire_goal',
    description: 'Retire a goal (status: shelved or mastered).',
    input_schema: {
      type: 'object',
      required: ['goalId'],
      properties: {
        goalId: { type: 'string' },
        reason: { type: 'string' },
        outcome: { type: 'string', enum: ['mastered', 'shelved'] },
      },
    },
  },
  {
    name: 'acknowledge_no_changes',
    description: 'Explicit signal that no goal changes are warranted from this check-in.',
    input_schema: { type: 'object', properties: {} },
  },
]
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- coachPrompts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/coachPrompts.ts tests/engine/coachPrompts.test.ts
git commit -m "feat(coach): add coachPrompts engine + tests (system prompt + tool defs)"
```

### Task 3.3: Build coachAdapter for tool-call validation

**Files:**
- Create: `src/engine/coachAdapter.ts`
- Create: `tests/engine/coachAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/coachAdapter.test.ts
import { describe, it, expect } from 'vitest'
import { validateGoalDraft, applyGoalDelta, parseToolCall } from '../../src/engine/coachAdapter'
import type { Goal } from '../../src/types/coach'

describe('validateGoalDraft', () => {
  it('accepts a well-formed draft', () => {
    const result = validateGoalDraft({
      title: 'Forward roll',
      description: 'Push to 110',
      status: 'focus',
      supportingItemRefs: [{ kind: 'roll', id: 'forward-roll-basic' }],
      conceptTags: ['forward-roll'],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects missing title', () => {
    const result = validateGoalDraft({
      title: '',
      description: 'x',
      status: 'focus',
      supportingItemRefs: [],
      conceptTags: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects unknown concept tags', () => {
    const result = validateGoalDraft({
      title: 'x',
      description: 'x',
      status: 'focus',
      supportingItemRefs: [{ kind: 'roll', id: 'forward-roll-basic' }],
      conceptTags: ['nonsense-tag'],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects unknown library item refs', () => {
    const result = validateGoalDraft({
      title: 'x',
      description: 'x',
      status: 'focus',
      supportingItemRefs: [{ kind: 'roll', id: 'does-not-exist' }],
      conceptTags: [],
    })
    expect(result.ok).toBe(false)
  })
})

describe('parseToolCall', () => {
  it('parses propose_initial_plan into add deltas', () => {
    const out = parseToolCall(
      { name: 'propose_initial_plan', input: { goals: [{
        title: 'x', description: 'x', status: 'focus',
        supportingItemRefs: [{ kind: 'roll', id: 'forward-roll-basic' }],
        conceptTags: ['forward-roll'],
      }] } },
      'u1',
    )
    expect(out.length).toBe(1)
    expect(out[0].op).toBe('add')
  })

  it('returns noop on acknowledge_no_changes', () => {
    const out = parseToolCall({ name: 'acknowledge_no_changes', input: {} }, 'u1')
    expect(out).toEqual([{ op: 'noop' }])
  })

  it('rejects update_goal targeting unknown id', () => {
    const out = parseToolCall(
      { name: 'update_goal', input: { goalId: 'nonexistent', status: 'mastered' } },
      'u1',
      [] // existing goals
    )
    expect(out.length).toBe(0)
  })
})
```

- [ ] **Step 2: Implement coachAdapter.ts**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coach tool-call adapter
// Pure: validates and normalizes LLM tool calls into GoalDelta[]
// ─────────────────────────────────────────────────────────────────────────────

import type { Goal, GoalDelta, GoalDraft, ItemRef } from '../types/coach'
import { CONCEPT_TAG_MAP } from '../data/conceptTags'
import { buildLibraryCatalog } from './itemCatalog'

const VALID_STATUSES = ['focus', 'explore', 'backlog', 'mastered', 'shelved'] as const

let cachedCatalog: ReturnType<typeof buildLibraryCatalog> | null = null
function knownItemIds(): Set<string> {
  if (!cachedCatalog) cachedCatalog = buildLibraryCatalog()
  return new Set(cachedCatalog.map(c => `${c.kind}:${c.id}`))
}

function refKey(ref: ItemRef): string {
  if (ref.kind === 'song-section') return `song-section:${ref.sectionId}`
  return `${ref.kind}:${ref.id}`
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; reason: string }

export function validateGoalDraft(d: Partial<GoalDraft>): ValidateResult {
  if (!d.title || !d.title.trim()) return { ok: false, reason: 'missing title' }
  if (!d.description || !d.description.trim()) return { ok: false, reason: 'missing description' }
  if (!d.status || !VALID_STATUSES.includes(d.status as any)) {
    return { ok: false, reason: `invalid status: ${d.status}` }
  }
  if (!Array.isArray(d.supportingItemRefs)) return { ok: false, reason: 'supportingItemRefs not an array' }
  if (!Array.isArray(d.conceptTags)) return { ok: false, reason: 'conceptTags not an array' }

  for (const ref of d.supportingItemRefs) {
    if (!knownItemIds().has(refKey(ref))) {
      return { ok: false, reason: `unknown item ref: ${refKey(ref)}` }
    }
  }
  for (const tag of d.conceptTags) {
    if (!CONCEPT_TAG_MAP[tag]) {
      return { ok: false, reason: `unknown concept tag: ${tag}` }
    }
  }
  return { ok: true }
}

export interface ToolCall {
  name: string
  input: any
}

export function parseToolCall(
  call: ToolCall,
  userId: string,
  existingGoals: Goal[] = [],
): GoalDelta[] {
  const now = new Date().toISOString()

  switch (call.name) {
    case 'propose_initial_plan': {
      const drafts = call.input?.goals ?? []
      const deltas: GoalDelta[] = []
      for (const d of drafts) {
        const v = validateGoalDraft(d)
        if (!v.ok) continue
        deltas.push({
          op: 'add',
          goal: {
            id: crypto.randomUUID(),
            userId,
            title: d.title,
            description: d.description,
            status: d.status,
            supportingItemRefs: d.supportingItemRefs,
            conceptTags: d.conceptTags,
            createdAt: now,
            updatedAt: now,
            history: [],
          },
        })
      }
      return deltas
    }

    case 'add_goal': {
      const d = call.input?.goal
      const v = validateGoalDraft(d)
      if (!v.ok) return []
      return [{
        op: 'add',
        goal: {
          id: crypto.randomUUID(),
          userId,
          ...d,
          createdAt: now,
          updatedAt: now,
          history: [],
        },
      }]
    }

    case 'update_goal': {
      const { goalId, ...changes } = call.input ?? {}
      const existing = existingGoals.find(g => g.id === goalId)
      if (!existing) return []
      // Validate the change set against allowed fields
      const allowed: (keyof typeof changes)[] = ['status', 'title', 'description', 'supportingItemRefs']
      const after: Partial<Goal> = {}
      for (const k of allowed) {
        if (k in changes) (after as any)[k] = (changes as any)[k]
      }
      return [{
        op: 'update',
        goalId,
        before: { status: existing.status, title: existing.title, description: existing.description },
        after,
      }]
    }

    case 'retire_goal': {
      const goalId = call.input?.goalId
      if (!existingGoals.find(g => g.id === goalId)) return []
      return [{
        op: 'retire',
        goalId,
        reason: call.input?.reason,
      }]
    }

    case 'acknowledge_no_changes':
      return [{ op: 'noop' }]

    default:
      return []
  }
}

export function applyGoalDelta(delta: GoalDelta, existing: Goal[]): Goal[] {
  switch (delta.op) {
    case 'add':
      return [...existing, delta.goal]
    case 'update': {
      const idx = existing.findIndex(g => g.id === delta.goalId)
      if (idx < 0) return existing
      const now = new Date().toISOString()
      const target = existing[idx]
      const updated: Goal = {
        ...target,
        ...delta.after,
        updatedAt: now,
        history: [
          ...target.history,
          { at: now, from: target.status, to: (delta.after.status ?? target.status), reason: 'updated by check-in' },
        ],
      }
      const copy = [...existing]
      copy[idx] = updated
      return copy
    }
    case 'retire': {
      const idx = existing.findIndex(g => g.id === delta.goalId)
      if (idx < 0) return existing
      const now = new Date().toISOString()
      const target = existing[idx]
      const updated: Goal = {
        ...target,
        status: 'shelved',
        updatedAt: now,
        completedAt: now,
        history: [
          ...target.history,
          { at: now, from: target.status, to: 'shelved', reason: delta.reason },
        ],
      }
      const copy = [...existing]
      copy[idx] = updated
      return copy
    }
    case 'noop':
      return existing
  }
}
```

- [ ] **Step 3: Run tests to verify pass**

```bash
npm test -- coachAdapter
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/coachAdapter.ts tests/engine/coachAdapter.test.ts
git commit -m "feat(coach): add coachAdapter (tool-call validation + GoalDelta application)"
```

### Task 3.4: Build useCoachChat hook

**Files:**
- Create: `src/hooks/useCoachChat.ts`

- [ ] **Step 1: Implement the hook**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useCoachChat hook
// Streaming session manager: orchestrates Anthropic SDK calls, persists deltas
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { useStore } from '../store/useStore'
import { buildSystemPrompt, ASSESSMENT_TOOLS, CHECKIN_TOOLS } from '../engine/coachPrompts'
import { parseToolCall, applyGoalDelta } from '../engine/coachAdapter'
import type { CoachMessage, GoalDelta, CheckInRecord } from '../types/coach'

const MODEL = 'claude-sonnet-4-6'
const PER_CONV_BUDGET_USD = 0.5
// Rough Sonnet 4.6 pricing: input $3/MTok cached input $0.30/MTok output $15/MTok
const PRICING = { inputCached: 0.30, inputUncached: 3.0, output: 15.0 }

export type ChatKind = 'assessment' | 'checkin'

export interface UseCoachChatOptions {
  kind: ChatKind
  onComplete: (deltas: GoalDelta[], record: CheckInRecord) => void
}

export function useCoachChat({ kind, onComplete }: UseCoachChatOptions) {
  const apiKey = useStore((s) => s.apiKey)
  const goals = useStore((s) => s.goals)
  const itemTags = useStore((s) => s.itemTags)
  const userId = useStore((s) => s.currentUserId)

  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeCost, setCumulativeCost] = useState(0)
  const startedAt = useRef<string>(new Date().toISOString())

  const sendUserMessage = useCallback(async (text: string) => {
    if (!apiKey || !userId) {
      setError('Missing API key or user ID')
      return
    }
    if (cumulativeCost > PER_CONV_BUDGET_USD) {
      setError('Cost cap reached for this conversation')
      return
    }

    setError(null)
    setIsStreaming(true)

    const newUserMsg: CoachMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const updatedMessages = [...messages, newUserMsg]
    setMessages(updatedMessages)
    setStreamingText('')

    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    const systemPrompt = buildSystemPrompt({
      kind,
      goals,
      itemTags: Object.values(itemTags),
      recentActivity: [], // Phase 4 wires this from sessionItems
    })

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: [
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ],
        tools: (kind === 'assessment' ? ASSESSMENT_TOOLS : CHECKIN_TOOLS) as any,
        messages: updatedMessages.map(m => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content,
        })) as any,
      })

      // Cost tracking
      const inputCacheRead = (response.usage as any)?.cache_read_input_tokens ?? 0
      const inputUncached = response.usage.input_tokens - inputCacheRead
      const outputTokens = response.usage.output_tokens
      const cost = (inputCacheRead / 1e6) * PRICING.inputCached
                 + (inputUncached / 1e6) * PRICING.inputUncached
                 + (outputTokens / 1e6) * PRICING.output
      setCumulativeCost((c) => c + cost)

      // Process content blocks
      const toolCalls: Array<{ name: string; input: any }> = []
      let assistantText = ''
      for (const block of response.content) {
        if (block.type === 'text') assistantText += block.text
        if (block.type === 'tool_use') {
          toolCalls.push({ name: block.name, input: block.input })
        }
      }

      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      }
      const allMessages = [...updatedMessages, assistantMsg]
      setMessages(allMessages)

      // If LLM emitted tool calls, parse + finalize
      if (toolCalls.length > 0) {
        const allDeltas: GoalDelta[] = []
        for (const call of toolCalls) {
          allDeltas.push(...parseToolCall(call, userId, goals))
        }
        const record: CheckInRecord = {
          id: crypto.randomUUID(),
          userId,
          kind,
          startedAt: startedAt.current,
          endedAt: new Date().toISOString(),
          transcript: allMessages,
          goalDeltas: allDeltas,
          apiCost: cumulativeCost + cost,
        }
        onComplete(allDeltas, record)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setIsStreaming(false)
    }
  }, [apiKey, messages, kind, goals, itemTags, userId, cumulativeCost, onComplete])

  const start = useCallback(async () => {
    // For assessment: LLM emits the opening prompt
    // For check-in: UI seeds context, but the LLM still speaks first
    startedAt.current = new Date().toISOString()
    setMessages([])
    await sendUserMessage(
      kind === 'assessment'
        ? '[BEGIN ASSESSMENT — open the conversation]'
        : '[BEGIN CHECK-IN — open referencing recent activity]'
    )
  }, [kind, sendUserMessage])

  return {
    messages,
    streamingText,
    isStreaming,
    error,
    cumulativeCost,
    sendUserMessage,
    start,
  }
}
```

Note: this implementation uses non-streaming for simplicity. True token streaming via `messages.stream()` is a Phase 7 polish item — for MVP, the response arrives all at once and we set `streamingText` empty.

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS. If `dangerouslyAllowBrowser` type isn't recognized, check the SDK version and use the appropriate type cast.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCoachChat.ts
git commit -m "feat(coach): add useCoachChat hook with Anthropic SDK + cost tracking"
```

### Task 3.5: Build AssessmentChat component

**Files:**
- Create: `src/components/Assessment/AssessmentChat.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Implement AssessmentChat**

```tsx
import { useEffect, useState } from 'react'
import { useCoachChat } from '../../hooks/useCoachChat'
import { useStore } from '../../store/useStore'
import { LibraryConfirmation } from './LibraryConfirmation'
import type { GoalDelta, CheckInRecord } from '../../types/coach'

export function AssessmentChat() {
  const upsertGoal = useStore((s) => s.upsertGoal)
  const recordCheckIn = useStore((s) => s.recordCheckIn)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const markAssessmentComplete = useStore((s) => s.markAssessmentComplete)

  const [pendingDeltas, setPendingDeltas] = useState<GoalDelta[] | null>(null)
  const [pendingRecord, setPendingRecord] = useState<CheckInRecord | null>(null)
  const [input, setInput] = useState('')

  const { messages, isStreaming, error, cumulativeCost, sendUserMessage, start } = useCoachChat({
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
    sendUserMessage(input)
    setInput('')
  }

  const finalize = async (confirmedTags: { itemRef: any; tag: any }[]) => {
    if (!pendingDeltas || !pendingRecord) return
    // Persist all add-deltas
    for (const d of pendingDeltas) {
      if (d.op === 'add') await upsertGoal(d.goal)
    }
    // Persist tags from confirmation step
    const setItemTag = useStore.getState().setItemTag
    for (const { itemRef, tag } of confirmedTags) {
      await setItemTag(itemRef, tag)
    }
    await recordCheckIn(pendingRecord)
    await markAssessmentComplete()
    setCurrentPage('plan-dashboard')
  }

  if (pendingDeltas && pendingRecord) {
    const proposedGoals = pendingDeltas.flatMap(d => d.op === 'add' ? [d.goal] : [])
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
        {messages
          .filter((m) => !m.content.startsWith('[BEGIN'))
          .map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              {m.content}
            </div>
          ))}
        {isStreaming && <div className="chat-msg chat-msg--assistant chat-msg--typing">…</div>}
        {error && <div className="chat-error">{error}</div>}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type your reply..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>Send</button>
      </form>

      <footer className="chat-footer">
        <span className="chat-cost">~${cumulativeCost.toFixed(3)} so far</span>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Add markAssessmentComplete to store**

In `useStore.ts`:

```ts
assessmentCompletedAt: string | null
markAssessmentComplete: () => Promise<void>
```

Implementation:

```ts
assessmentCompletedAt: localStorage.getItem('banjo-buddy-assessment-at'),
markAssessmentComplete: async () => {
  const now = new Date().toISOString()
  localStorage.setItem('banjo-buddy-assessment-at', now)
  set({ assessmentCompletedAt: now })
},
```

- [ ] **Step 3: Add styles**

Append to `src/App.css`:

```css
.assessment-chat { max-width: 720px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; min-height: 80vh; }
.chat-header h2 { margin: 0; }
.chat-subtitle { opacity: 0.6; font-size: 13px; margin: 4px 0 24px; }

.chat-transcript { flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 8px 0; overflow-y: auto; }
.chat-msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.chat-msg--user { align-self: flex-end; background: #d4a04a; color: #000; border-bottom-right-radius: 4px; }
.chat-msg--assistant { align-self: flex-start; background: #2d4a5e; border-bottom-left-radius: 4px; }
.chat-msg--typing { opacity: 0.5; }
.chat-error { color: #f87171; font-size: 13px; padding: 8px; }

.chat-input-form { display: flex; gap: 8px; padding: 12px 0; }
.chat-input-form input { flex: 1; padding: 10px 14px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: inherit; }
.chat-input-form button { padding: 10px 18px; background: var(--accent, #d4a04a); color: #000; border: none; border-radius: 6px; cursor: pointer; }
.chat-input-form button:disabled { opacity: 0.4; cursor: not-allowed; }

.chat-footer { font-size: 11px; opacity: 0.5; text-align: right; padding: 4px 0; }
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Assessment/AssessmentChat.tsx src/store/useStore.ts src/App.css
git commit -m "feat(coach): add AssessmentChat component"
```

### Task 3.6: Build LibraryConfirmation component

**Files:**
- Create: `src/components/Assessment/LibraryConfirmation.tsx`

- [ ] **Step 1: Implement LibraryConfirmation**

```tsx
import { useMemo, useState } from 'react'
import type { Goal, ItemRef, TagValue } from '../../types/coach'
import { buildLibraryCatalog } from '../../engine/itemCatalog'

interface Props {
  proposedGoals: Goal[]
  onConfirm: (tags: { itemRef: ItemRef; tag: TagValue }[]) => void
}

export function LibraryConfirmation({ proposedGoals, onConfirm }: Props) {
  // Pick 3-5 items from the proposed goals' supportingItemRefs
  const itemsToTag = useMemo(() => {
    const refs = proposedGoals.flatMap(g => g.supportingItemRefs).slice(0, 5)
    const catalog = buildLibraryCatalog()
    return refs.map(ref => ({
      ref,
      catalog: catalog.find(c => c.kind === ref.kind && c.id === ('id' in ref ? ref.id : ref.sectionId)),
    }))
  }, [proposedGoals])

  const [tags, setTags] = useState<Record<string, TagValue>>({})

  const keyFor = (ref: ItemRef) =>
    ref.kind === 'song-section' ? `${ref.kind}:${ref.songId}/${ref.sectionId}` : `${ref.kind}:${ref.id}`

  const setTag = (ref: ItemRef, tag: TagValue) => {
    setTags((t) => ({ ...t, [keyFor(ref)]: tag }))
  }

  const handleSubmit = () => {
    const result = itemsToTag
      .filter(({ ref }) => tags[keyFor(ref)])
      .map(({ ref }) => ({ itemRef: ref, tag: tags[keyFor(ref)] }))
    onConfirm(result)
  }

  return (
    <div className="library-confirmation">
      <header>
        <h2>One last thing</h2>
        <p>How do these feel right now?</p>
      </header>

      {itemsToTag.map(({ ref, catalog }) => {
        if (!catalog) return null
        const k = keyFor(ref)
        const current = tags[k]
        return (
          <div key={k} className="lc-item">
            <div className="lc-item-info">
              <div className="lc-item-name">{catalog.name}</div>
              <div className="lc-item-brief">{catalog.brief}</div>
            </div>
            <div className="lc-tag-buttons">
              {(['got-it', 'working', 'new'] as TagValue[]).map(t => (
                <button
                  key={t}
                  className={`tag-btn tag-btn--${t} ${current === t ? 'active' : ''}`}
                  onClick={() => setTag(ref, t)}
                >
                  {t === 'got-it' ? 'Got it' : t === 'working' ? 'Working' : 'New'}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <button className="lc-submit" onClick={handleSubmit}>
        Generate my plan
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add styles**

Append to `src/App.css`:

```css
.library-confirmation { max-width: 640px; margin: 32px auto; padding: 0 16px; }
.library-confirmation header { margin-bottom: 24px; }
.library-confirmation header h2 { margin: 0; }
.library-confirmation header p { opacity: 0.7; margin: 4px 0 0; }

.lc-item { background: #2d4a5e; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.lc-item-info { flex: 1; min-width: 200px; }
.lc-item-name { font-weight: 600; font-size: 14px; }
.lc-item-brief { font-size: 12px; opacity: 0.7; margin-top: 2px; }
.lc-tag-buttons { display: flex; gap: 6px; }
.tag-btn { background: transparent; border: 1px solid currentColor; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; opacity: 0.6; color: inherit; }
.tag-btn.active { opacity: 1; font-weight: 600; }
.tag-btn--got-it { color: #4ade80; }
.tag-btn--working { color: #d4a04a; }
.tag-btn--new { color: #c084fc; }

.lc-submit { width: 100%; padding: 14px; background: var(--accent, #d4a04a); color: #000; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 16px; }
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Assessment/LibraryConfirmation.tsx src/App.css
git commit -m "feat(coach): add LibraryConfirmation step"
```

### Task 3.7: Wire AssessmentChat into App.tsx and verify end-to-end

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add 'assessment' page**

Update `Page` union and switch in App.tsx:

```ts
type Page = 'splash' | 'auth' | 'api-key-gate' | 'assessment' | 'plan-dashboard' | 'library' | 'settings' | 'profile' | 'fretboard-lab'
```

Add case to switch:

```tsx
case 'assessment': return <AssessmentChat />
case 'api-key-gate': return <ApiKeyGate />
```

Update navigation: hide NavBar during `assessment` and `api-key-gate` as well as `splash`/`auth`.

- [ ] **Step 2: Update startup routing logic**

Wherever `initializeApp` or `determineStartupPage` decides the post-auth page:

```ts
if (!apiKey) setPage('api-key-gate')
else if (!assessmentCompletedAt) setPage('assessment')
else setPage('plan-dashboard')
```

- [ ] **Step 3: End-to-end test in browser**

```bash
npm run dev
```

In a fresh-profile browser tab:
1. Skip auth (guest mode)
2. Enter API key (use a valid Anthropic key — needed for the LLM call)
3. AssessmentChat should auto-start; LLM should send the first message within a few seconds
4. Reply 4–6 turns of substantive practice background
5. LLM should eventually emit `propose_initial_plan` tool call
6. UI transitions to LibraryConfirmation
7. Tag 3–5 items, click "Generate my plan"
8. Land on PlanDashboard with goals visible

If any step fails, capture browser console errors and the LLM transcript via the `messages` state.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(coach): wire AssessmentChat into App routing"
```

### Task 3.8: Wire item clicks on dashboard to library players

**Files:**
- Modify: `src/components/Plan/PlanDashboard.tsx`
- Modify: `src/components/Plan/GoalCard.tsx`

- [ ] **Step 1: Resolve item names**

`GoalCard` currently displays `kind:id` for supporting items. Replace with real names from the catalog.

In `GoalCard.tsx`, import:

```ts
import { useMemo } from 'react'
import { buildLibraryCatalog } from '../../engine/itemCatalog'
```

Replace the `goal-card-item-name` display:

```tsx
const catalog = useMemo(() => buildLibraryCatalog(), [])

// Inside the map:
const refKey = ref.kind === 'song-section'
  ? `${ref.kind}:${ref.sectionId}`
  : `${ref.kind}:${'id' in ref ? ref.id : ''}`
const catalogItem = catalog.find(c =>
  c.kind === ref.kind &&
  c.id === ('id' in ref ? ref.id : ref.sectionId)
)
// ...
<span className="goal-card-item-name">{catalogItem?.name ?? refKey}</span>
```

- [ ] **Step 2: Wire onItemClick to open library**

In `PlanDashboard.tsx`, replace the console-log handler:

```ts
const setCurrentPage = useStore((s) => s.setCurrentPage)
const setLibrarySelection = useStore((s) => s.setLibrarySelection) // new action — see step 3

const handleItemClick = (ref: ItemRef) => {
  setLibrarySelection(ref)
  setCurrentPage('library')
}
```

- [ ] **Step 3: Add librarySelection state + handler in store**

In `useStore.ts`:

```ts
librarySelection: ItemRef | null
setLibrarySelection: (ref: ItemRef | null) => void
```

Implementation:

```ts
librarySelection: null,
setLibrarySelection: (ref) => set({ librarySelection: ref }),
```

- [ ] **Step 4: Have Library.tsx auto-open the selected item**

In `src/components/Library/Library.tsx`, add an effect:

```ts
const librarySelection = useStore((s) => s.librarySelection)
const setLibrarySelection = useStore((s) => s.setLibrarySelection)

useEffect(() => {
  if (!librarySelection) return
  // Programmatically navigate to the appropriate category + item:
  // - kind=lick → Lick Library tab, scroll to item, open player
  // - kind=roll → Roll Repo, open player
  // - kind=chord → Chord Charts, open detail
  // - kind=scale → Scales, open detail
  // - kind=song-section → Song Studio, open song + scroll to section
  // Implementation depends on Library.tsx internals — engineer should
  // follow existing tab-switching logic and add ref-based scrolling.

  // Clear selection after handling so back navigation works:
  setLibrarySelection(null)
}, [librarySelection, setLibrarySelection])
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

From PlanDashboard, click a supporting item → should jump to Library → correct sub-tab → item opens. Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/components/Plan src/components/Library src/store/useStore.ts
git commit -m "feat(coach): dashboard item clicks open library players"
```

---

# Phase 4 — Check-in Chat & 7-day Cadence

Goal: build the recurring check-in chat that updates goals; surface a prompt on the dashboard when overdue; add manual "Refresh plan" escape hatch.

### Task 4.1: Build CheckInChat component (shared infra with AssessmentChat)

**Files:**
- Create: `src/components/CheckIn/CheckInChat.tsx`

- [ ] **Step 1: Implement CheckInChat**

It's structurally similar to `AssessmentChat` but uses `kind: 'checkin'` and surfaces a goal-diff review before committing.

```tsx
import { useEffect, useState } from 'react'
import { useCoachChat } from '../../hooks/useCoachChat'
import { useStore } from '../../store/useStore'
import { GoalDiffReview } from './GoalDiffReview'
import { applyGoalDelta } from '../../engine/coachAdapter'
import type { GoalDelta, CheckInRecord } from '../../types/coach'

export function CheckInChat() {
  const goals = useStore((s) => s.goals)
  const upsertGoal = useStore((s) => s.upsertGoal)
  const recordCheckIn = useStore((s) => s.recordCheckIn)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const setLastCheckInAt = useStore((s) => s.setLastCheckInAt)

  const [pendingDeltas, setPendingDeltas] = useState<GoalDelta[] | null>(null)
  const [pendingRecord, setPendingRecord] = useState<CheckInRecord | null>(null)
  const [input, setInput] = useState('')

  const { messages, isStreaming, error, cumulativeCost, sendUserMessage, start } = useCoachChat({
    kind: 'checkin',
    onComplete: (deltas, record) => {
      setPendingDeltas(deltas)
      setPendingRecord(record)
    },
  })

  useEffect(() => { start() }, [start])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendUserMessage(input)
    setInput('')
  }

  const handleConfirmDeltas = async (approvedDeltas: GoalDelta[]) => {
    let updated = goals
    for (const delta of approvedDeltas) {
      updated = applyGoalDelta(delta, updated)
    }
    for (const goal of updated) {
      // Persist all goals (simpler than diffing) — Dexie put is idempotent
      await upsertGoal(goal)
    }
    if (pendingRecord) {
      await recordCheckIn(pendingRecord)
    }
    await setLastCheckInAt(new Date().toISOString())
    setCurrentPage('plan-dashboard')
  }

  if (pendingDeltas && pendingDeltas.length > 0 && pendingDeltas[0].op !== 'noop') {
    return (
      <GoalDiffReview
        deltas={pendingDeltas}
        existingGoals={goals}
        onConfirm={handleConfirmDeltas}
        onSkipAll={() => handleConfirmDeltas([])}
      />
    )
  }

  if (pendingDeltas && pendingDeltas[0]?.op === 'noop') {
    // Acknowledge no-changes: record + return
    handleConfirmDeltas([])
    return <div className="check-in-chat">No changes this week. Carry on!</div>
  }

  return (
    <div className="check-in-chat">
      <header className="chat-header">
        <h2>Weekly check-in</h2>
        <p className="chat-subtitle">A quick chat about how the week went.</p>
      </header>

      <div className="chat-transcript">
        {messages
          .filter((m) => !m.content.startsWith('[BEGIN'))
          .map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>{m.content}</div>
          ))}
        {isStreaming && <div className="chat-msg chat-msg--assistant chat-msg--typing">…</div>}
        {error && <div className="chat-error">{error}</div>}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type your reply..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>Send</button>
      </form>

      <footer className="chat-footer">
        <span className="chat-cost">~${cumulativeCost.toFixed(3)} so far</span>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Add setLastCheckInAt to store**

```ts
setLastCheckInAt: async (iso: string) => {
  set({ lastCheckInAt: iso })
  // also persist to userProfiles
  const userId = get().currentUserId
  if (userId) {
    await db.userProfiles.update(userId, { lastCheckInAt: iso })
  }
},
```

Also add `lastCheckInAt` to the `UserProfile` type in `src/types/index.ts` if not already present.

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/CheckIn/CheckInChat.tsx src/store/useStore.ts src/types/index.ts
git commit -m "feat(coach): add CheckInChat component"
```

### Task 4.2: Build GoalDiffReview UI

**Files:**
- Create: `src/components/CheckIn/GoalDiffReview.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react'
import type { Goal, GoalDelta } from '../../types/coach'

interface Props {
  deltas: GoalDelta[]
  existingGoals: Goal[]
  onConfirm: (approved: GoalDelta[]) => void
  onSkipAll: () => void
}

export function GoalDiffReview({ deltas, existingGoals, onConfirm, onSkipAll }: Props) {
  // Track which deltas are approved (default: all approved)
  const [approved, setApproved] = useState<boolean[]>(deltas.map(() => true))

  const toggle = (i: number) =>
    setApproved((a) => a.map((v, idx) => idx === i ? !v : v))

  const handleConfirm = () => {
    const result = deltas.filter((_, i) => approved[i])
    onConfirm(result)
  }

  const renderDelta = (d: GoalDelta) => {
    switch (d.op) {
      case 'add':
        return <><strong>Add new goal:</strong> {d.goal.title} ({d.goal.status})</>
      case 'update': {
        const existing = existingGoals.find(g => g.id === d.goalId)
        const newStatus = d.after.status
        return <>
          <strong>Update:</strong> {existing?.title}
          {newStatus && existing && newStatus !== existing.status && (
            <> — {existing.status} → <strong>{newStatus}</strong></>
          )}
        </>
      }
      case 'retire': {
        const existing = existingGoals.find(g => g.id === d.goalId)
        return <><strong>Retire:</strong> {existing?.title} ({d.reason ?? 'no reason'})</>
      }
      case 'noop':
        return <em>No changes</em>
    }
  }

  const tooManyChanges = deltas.filter(d => d.op !== 'noop').length > 2

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
        <button className="btn-secondary" onClick={onSkipAll}>Skip all</button>
        <button className="btn-primary" onClick={handleConfirm}>Apply selected</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add styles**

```css
.goal-diff-review { max-width: 640px; margin: 32px auto; padding: 0 16px; }
.goal-diff-review header h2 { margin: 0 0 8px; }
.diff-warn { color: #f5a623; font-size: 13px; padding: 8px; background: #3d3520; border-radius: 4px; margin-top: 8px; }
.goal-diff-review ul { list-style: none; padding: 0; }
.goal-diff-review li { margin: 8px 0; padding: 12px; background: #2d4a5e; border-radius: 6px; }
.goal-diff-review label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; }
.diff-actions { display: flex; gap: 8px; margin-top: 16px; }
.diff-actions button { flex: 1; padding: 12px; border-radius: 6px; cursor: pointer; border: none; font-weight: 600; }
.btn-primary { background: var(--accent, #d4a04a); color: #000; }
.btn-secondary { background: transparent; color: inherit; border: 1px solid rgba(255,255,255,0.2); }
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/CheckIn/GoalDiffReview.tsx src/App.css
git commit -m "feat(coach): add GoalDiffReview UI for check-in confirmation"
```

### Task 4.3: Add CheckInPrompt banner to PlanDashboard

**Files:**
- Create: `src/components/Plan/CheckInPrompt.tsx`
- Modify: `src/components/Plan/PlanDashboard.tsx`

- [ ] **Step 1: Implement CheckInPrompt**

```tsx
import { useStore } from '../../store/useStore'

const CHECK_IN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export function CheckInPrompt() {
  const lastCheckInAt = useStore((s) => s.lastCheckInAt)
  const setCurrentPage = useStore((s) => s.setCurrentPage)

  const overdue = !lastCheckInAt ||
    (Date.now() - new Date(lastCheckInAt).getTime()) > CHECK_IN_INTERVAL_MS

  if (!overdue) return null

  return (
    <div className="check-in-prompt">
      <span>Time to check in — how did the week go?</span>
      <button onClick={() => setCurrentPage('check-in')}>Start check-in</button>
    </div>
  )
}
```

Styles:

```css
.check-in-prompt {
  background: linear-gradient(135deg, #d4a04a 0%, #b8862c 100%);
  color: #000;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.check-in-prompt button {
  background: rgba(0,0,0,0.15);
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 2: Add CheckInPrompt to PlanDashboard**

In `PlanDashboard.tsx`, at the top of the rendered output:

```tsx
import { CheckInPrompt } from './CheckInPrompt'

// inside return:
<CheckInPrompt />
```

- [ ] **Step 3: Add 'check-in' to Page union**

In `useStore.ts` and `App.tsx`, add `'check-in'` to the Page union and add the routing case:

```tsx
case 'check-in': return <CheckInChat />
```

Also add a "Refresh plan" button on PlanDashboard that bypasses the 7-day check:

```tsx
<button
  className="plan-dashboard-refresh"
  onClick={() => setCurrentPage('check-in')}
>
  Refresh plan
</button>
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

After running an assessment, the dashboard should not show a CheckInPrompt (just completed). Manually fast-forward by editing `lastCheckInAt` in devtools:

```js
useStore.setState({ lastCheckInAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() })
```

The CheckInPrompt should appear. Click → CheckInChat starts.

- [ ] **Step 5: Commit**

```bash
git add src/components/Plan src/components/CheckIn src/App.tsx src/store/useStore.ts src/App.css
git commit -m "feat(coach): add CheckInPrompt banner + manual Refresh plan trigger"
```

### Task 4.4: Wire recent activity into check-in context

**Files:**
- Modify: `src/hooks/useCoachChat.ts`

- [ ] **Step 1: Add recent-activity loader**

In `useCoachChat.ts`, before calling `buildSystemPrompt`, replace the empty `recentActivity: []` with a real query:

```ts
import { db } from '../db/db'

// Inside sendUserMessage, just before buildSystemPrompt:
const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
const recentItems = await db.sessionItems
  .where('sessionId') // sessionItems is keyed by session, not date — adapt to existing schema
  .above('')  // get all
  .filter((si) => (si as any).completedAt >= fourteenDaysAgo)
  .toArray()

// Aggregate by itemRef
const counts: Record<string, { itemRef: any; count: number; lastAt: string }> = {}
for (const si of recentItems) {
  const key = (si as any).itemRefKey ?? `${(si as any).itemKind}:${(si as any).itemId}`
  if (!counts[key]) counts[key] = { itemRef: { kind: (si as any).itemKind, id: (si as any).itemId }, count: 0, lastAt: (si as any).completedAt }
  counts[key].count += 1
  if ((si as any).completedAt > counts[key].lastAt) counts[key].lastAt = (si as any).completedAt
}
const recentActivity = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 20)
```

Note: the exact `sessionItems` schema may differ. The engineer should inspect the existing schema and adapt the loader. The goal is to surface the top ~20 items the user practiced in the last 14 days, with counts and most-recent timestamps.

- [ ] **Step 2: Pass to buildSystemPrompt**

```ts
const systemPrompt = buildSystemPrompt({
  kind,
  goals,
  itemTags: Object.values(itemTags),
  recentActivity,
})
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS.

- [ ] **Step 4: Verify in browser**

Run dev server, trigger a check-in, look at the network request payload for the LLM call — confirm `recentActivity` is populated with real data.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCoachChat.ts
git commit -m "feat(coach): wire 14-day recent activity into check-in LLM context"
```

### Task 4.5: End-to-end MVP verification

**Files:**
- None (verification only)

- [ ] **Step 1: Clean profile, run full flow**

```bash
npm run dev
```

In a fresh browser profile (or after clearing localStorage + IndexedDB):

1. **Splash** → progresses to auth
2. **Auth** → skip to guest mode
3. **API key gate** → enter a valid key
4. **Assessment chat** → 4–6 turns of substantive conversation
5. **Library confirmation** → tag 3–5 items
6. **Dashboard** → goals visible, tags reflected
7. Click a supporting item → opens the right library player
8. Manually advance `lastCheckInAt` (devtools) → CheckInPrompt appears
9. Click "Start check-in" → CheckInChat opens
10. Have 2–3 turns of check-in conversation
11. LLM emits tool calls → GoalDiffReview appears
12. Confirm changes → land on dashboard with updated goals

- [ ] **Step 2: Verify Dexie state**

In devtools → Application → IndexedDB → BanjoBuddyDb:
- `goals` table: populated with ~5–7 records
- `itemTags` table: 3–5 records from confirmation step
- `checkInRecords` table: 2 records (1 assessment + 1 check-in)

- [ ] **Step 3: Verify Supabase sync** (if signed in, not guest)

After ~30s, check Supabase dashboard → `goals` and `item_tags` tables should have the same records.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build with no TypeScript errors. Bundle size should be lower than before (due to deleted curriculum code).

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: PASS. All Vitest tests for `itemCatalog`, `coachPrompts`, `coachAdapter` should pass.

- [ ] **Step 6: Final commit (no code changes, but ensures clean state)**

```bash
git status
# Should be clean (no uncommitted changes)
```

If there are uncommitted changes from verification, commit them with a descriptive message.

### Task 4.6: Update CLAUDE.md with finalized architecture

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite key sections**

In `CLAUDE.md`:
- Update engine count (was 35 → now ~10 after deletions; verify with `ls src/engine | wc -l`)
- Update component count (was 38 → recount)
- Update data files list (curriculum.ts gone, conceptTags.ts new)
- Replace dual-mode section with the coach-driven architecture section from Task 0.7
- Update Dexie schema version: was v4, now v15
- Add a "Coach" section briefly describing the LLM flow, prompt caching, and per-conversation cost cap
- Add a note: "tests: vitest covers pure-function engine modules; manual verification via dev server for UI"

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): finalize coach-driven architecture documentation"
```

---

# Post-MVP — Deferred to Future Plans

The following phases from the design spec are **out of scope for this plan** and will get their own implementation plans after MVP ships:

- **Phase 5 — Guided Session flow**: `GuidedSession.tsx` with auto-advance + per-item reflection; goal-card "▶ Guided session" button.
- **Phase 6 — Live tag editing across the app**: Tag affordance baked into `LickPlayer`, chord cards, song section views, scale viewer.
- **Phase 7 — Polish**: offline-state UI, cost transparency in Settings, "Retake initial assessment" trigger, achievement rewiring to goal-completion events, streak rule updates.

---

# Self-Review Checklist (for plan author)

After all tasks pass, the engineer should verify:

- [ ] All 9 architectural decisions from the design spec are implemented
- [ ] First-time user flow works end-to-end (Splash → Auth → API key → Assessment → Dashboard)
- [ ] 7-day check-in cadence triggers a dashboard prompt
- [ ] Manual "Refresh plan" works any time
- [ ] Goals persist with status transitions across sessions (focus / explore / backlog / mastered / shelved)
- [ ] Library items carry tags and tags appear on goal cards
- [ ] Sync engine includes goals + itemTags but excludes checkInRecords transcripts
- [ ] No references remain to deleted modules (`SKILLS`, FSRS, teacher mode, ModeSelect, etc.)
- [ ] Bundle is smaller than pre-overhaul (curriculum + Deep Dive code removed)
- [ ] Vitest tests for `itemCatalog`, `coachPrompts`, `coachAdapter` all pass
- [ ] `npx tsc -p tsconfig.app.json --noEmit` passes cleanly
- [ ] `npm run build` succeeds with no warnings
