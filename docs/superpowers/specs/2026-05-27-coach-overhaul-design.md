# Banjo Buddy Coach Overhaul — Design Spec

**Date:** 2026-05-27
**Status:** Design approved, ready for implementation planning
**Scope:** Replace the existing dual-mode app (Quick Pick / Deep Dive) with a single assessment-driven coaching experience.

---

## Problem

Intermediate banjo players land on Banjo Buddy and ask *"where do I start?"* The current app answers this two ways:

- **Deep Dive** offers a 100-skill curriculum DAG, FSRS scheduling, skill tree, and pathway view — too prescriptive, too scattered (per project_direction memory dated 2026-04-16).
- **Quick Pick** offers a library of licks/rolls/songs/chords/scales — too unstructured, recreates the "where do I start?" problem inside a bigger menu.

Neither mode actually answers the question. The mode picker itself is a "where do I start" decision in miniature.

## Solution Overview

A single assessment-driven app. After auth + API key setup, every user takes a one-time chat assessment with a Claude-powered coach. The coach produces an initial set of 5–7 personalized goals; the dashboard surfaces 1 focus goal + 1–2 explore goals (Weekly Focus). Every ~7 days a check-in chat updates goal states based on activity and conversation. The library remains accessible as a secondary tab — items are no longer the destination; they're the building blocks goals reference.

---

## Architectural Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Assessment format | Chat (LLM) + library tag confirmation step | Captures nuance that forms/checkboxes can't; reuses existing Claude API plumbing |
| 2 | Plan shape | Weekly Focus (1 focus + 1–2 explore + "see all") | Answers "what now" without recreating the inventory problem |
| 3 | Refresh cadence | LLM check-in every ~7 days + manual escape hatch | Conversational continuity beats mechanical refresh; weekly cap prevents fatigue |
| 4 | Mode strategy | Replace both modes (Quick Pick + Deep Dive) | Mode pickers reproduce the same decision problem; assessment is the new front door |
| 5 | Practice flow | Hybrid (items → existing players; optional Start Session sequenced flow) | Most practice is noodling; guided flow opt-in for users who want structure |
| 6 | Progress tracking | Passive logging + editable tags + optional reflection | Multiple signals for the check-in chat to draw on |
| 7 | Goal lifecycle | Persistent entities with state transitions (focus / explore / backlog / mastered / shelved) | Continuity makes "Weekly Focus" meaningful; enables completion satisfaction + history |
| 8 | Auth & API key gating | Auth optional (guest mode OK); API key required before app proceeds | Matches existing offline-first ethos; API key is non-negotiable for AI features |
| 9 | Pedagogical scaffolding | Flat concept tags (~15–20) replace 100-skill DAG | Enough structure for LLM reasoning without DAG maintenance burden |

Pruning calls (implicitly approved):
- **Achievements**: kept dormant; unlock criteria rewired to goal-completion events in Phase 7
- **Streaks**: kept; any practice counts (no curriculum dependency)
- **Teacher mode**: retired (existed to filter the skill curriculum, which is gone)

---

## User Flows

### First-time user

```
Splash
  → AuthScreen (skippable → guest mode)
  → API key setup (required, blocks app)
  → Assessment chat (6–10 turns, ~3–5 min)
      └─ Ends with library tag confirmation: 3–5 prominent items, "Got it / Working / New"
  → LLM generates initial plan (5–7 goals; 1 focus + 1–2 explore + rest in "see all")
  → Plan dashboard
```

### Returning user (< 7 days since last check-in)

```
Splash → Plan dashboard
```

### Returning user (≥ 7 days since last check-in)

```
Splash → Plan dashboard with "Time to check in" prompt
  → User taps prompt → CheckInChat (4–6 turns, ~2 min)
  → LLM proposes 0–2 goal changes; user reviews + confirms
  → Updated dashboard
```

### Manual refresh (escape hatch)

```
Dashboard → "Refresh plan" button → CheckInChat (same flow, any time)
```

### Practicing a goal

```
Goal card on dashboard:
  ├─ Tap supporting item → existing player (LickPlayer / SongPlayer / FretboardDiagram)
  │   └─ Inline tag affordance (Got it / Working / New) — Phase 6
  └─ Tap "▶ Guided session" → sequenced flow with auto-advance — Phase 5
      └─ Ends with 3-button reflection per item ("solid / sloppy / new to me")
```

### Library tab

Always available as a sidebar / secondary tab. Same 7 categories as today: Chord Charts, Circle of 5ths, Roll Repo, Lick Library, Scales, Song Studio, Roll Generator. Tags are live; activity logs passively.

### Offline behavior

- Dashboard, library, players, custom rolls, tab scanner: work offline
- Assessment, check-in: blocked with "needs connection" message
- Overdue check-in while offline: prompt persists; user practices normally

---

## Data Model

### New Dexie tables

**`goals`**
```ts
{
  id: string                          // uuid
  title: string                       // LLM-generated
  description: string                 // LLM-generated context
  status: 'focus' | 'explore' | 'backlog' | 'mastered' | 'shelved'
  supportingItemRefs: ItemRef[]
  conceptTags: string[]               // for LLM context
  createdAt: string                   // ISO
  updatedAt: string
  completedAt?: string
  history: GoalHistoryEntry[]         // status changes for LLM memory across check-ins
}

type ItemRef =
  | { kind: 'lick'; id: string }
  | { kind: 'roll'; id: string }
  | { kind: 'song-section'; songId: string; sectionId: string }
  | { kind: 'chord'; id: string }
  | { kind: 'scale'; id: string }

type GoalHistoryEntry = {
  at: string                          // ISO
  from: GoalStatus
  to: GoalStatus
  reason?: string                     // LLM-provided
  checkInId?: string
}
```

**Status semantics:**
- `focus` — currently the user's primary attention. **Hard constraint: max 1 goal at a time.** Dashboard renders it most prominently.
- `explore` — actively in rotation, secondary attention. **Soft constraint: 1–2 goals.** Dashboard renders alongside focus.
- `backlog` — known and ready, not currently surfaced. Lives behind the "see all" link. The check-in LLM can promote a `backlog` goal to `explore` or `focus`.
- `mastered` — completed. Visible in history; doesn't count toward active limits.
- `shelved` — explicitly retired without mastering (e.g., user lost interest, LLM saw it wasn't a fit). Visible in history.

**`itemTags`** — per-user live tags
```ts
{
  itemRef: string                     // stringified composite key (kind:id) for indexing
  tag: 'got-it' | 'working' | 'new'
  updatedAt: string
}
```

**`checkInRecords`** — audit log
```ts
{
  id: string
  kind: 'assessment' | 'checkin'
  startedAt: string
  endedAt: string
  transcript: Message[]               // local-only, not synced
  goalDeltas: GoalDelta[]
  apiCost?: number
}
```

### New static data

**`src/data/conceptTags.ts`** — flat taxonomy, ~15–20 entries:
```ts
{
  id: 'forward-roll'
  label: 'Forward Roll'
  description: 'T-I-M-T or T-M-T-I pattern, foundation of Scruggs style'
}
```

Seed list (subject to refinement during Phase 1):
- forward-roll, backward-roll, alternating-thumb, forward-reverse, foggy-mtn-roll
- pinch, hammer-on, pull-off, slide, choke
- syncopation, melodic-pivot, chord-melody, drop-thumb
- G-position, D-position, C-position, F-shape, barre
- fast-tempo-stamina

### Modifications to existing data

- `LICK_LIBRARY`, `ROLL_PATTERNS`, `SONG_SECTIONS`, `CHORD_DIAGRAMS`, `SCALE_LIBRARY` → add `tags: string[]` (concept-tag IDs); one-time data migration
- `userProfiles` → add `lastCheckInAt`, `nextCheckInDueAt`, `assessmentCompletedAt`
- `sessionItems` → drop skill-specific fields; add `goalId?: string` so the check-in chat sees plan-context activity

### Retired tables

- `skillRecords` → deleted in v5 migration (one-time JSON export for user transparency)
- `teacherConfigs`, `teacherClips` → deleted in v6 migration

### Schema version

Dexie v4 → **v5**. Migration adds `goals`, `itemTags`, `checkInRecords`; drops `skillRecords`. One-shot migration on first load after deploy.

### Supabase sync

- `goals`, `itemTags`, `checkInRecords` (without transcript blob) → synced
- Transcripts → local-only (privacy + sync size)
- `conceptTags.ts` → static, no sync

---

## LLM Integration

### Model & calling

- Model: `claude-sonnet-4-6`
- API: Anthropic SDK, browser-side calls with user's saved API key
- Tool use: function-calling for structured outputs (no freeform JSON parsing)
- Streaming: yes, for chat UI responsiveness

### System prompt structure

Every call (assessment or check-in) gets:
1. **Persona** (~200 words) — Scruggs-style banjo coach addressing intermediate players
2. **Concept taxonomy** — full `CONCEPT_TAGS` as JSON
3. **Library catalog** — all items as compact JSON: `{ id, kind, name, key?, role?, conceptTags, brief }`
4. **User state** — current goals, recent 14 days of activity (aggregated), current item tags, last check-in summary
5. **Tool definitions**

Approximate tokens per call: 20–30K input. Static portions (persona, taxonomy, catalog) wrapped in **prompt caching**; user-state and conversation deltas are uncached.

### Tools

**Assessment chat:**
- `propose_initial_plan({ goals: GoalDraft[] })` — emitted once near end of chat; triggers library tag confirmation step.

**Check-in chat:**
- `update_goal({ goalId, status, title?, description?, supportingItemRefs? })`
- `add_goal({ goal: GoalDraft })`
- `retire_goal({ goalId, reason })`
- `acknowledge_no_changes()` — explicit no-op signal

Soft-limit guard: post-conversation, if > 2 goals were changed in a single check-in, surface a confirmation review UI before persisting.

**Future (not in MVP):**
- `query_library({ filters })` — retrieval tool for catalogs > 500 items

### Conversation flows

**Assessment** (~6–10 messages, ~3–5 min, ~$0.05–0.10):
```
LLM opens with background question
User answers
LLM 4–8 follow-ups (tempo, comfort zones, repertoire, frustrations)
LLM emits propose_initial_plan tool call
UI transitions to library tag confirmation step
User taps tags on 3–5 items
System persists goals + tags, lands on dashboard
```

**Check-in** (~4–6 messages, ~2 min, ~$0.01–0.03 with caching):
```
UI seeds with activity summary + current goals (LLM sees, not user)
LLM opens referencing real activity ("You spent most of last week on Foggy Mtn intro...")
User 2–4 turns of reflection
LLM emits 0–2 goal-update tool calls or acknowledge_no_changes
UI surfaces pending changes; user confirms; system persists
```

### Error handling

| Failure mode | Behavior |
|---|---|
| Network drop mid-chat | Transcript persists locally; resume on next attempt; no goal mutations until explicit confirm |
| Invalid tool args (e.g., unknown goalId) | `coachAdapter` validation rejects; LLM gets tool-error response, retries |
| Rate limit / 5xx | Retry once with backoff, then "try again in a moment" UI |
| Invalid API key | Hard fail, surface key management modal |
| Runaway cost | Per-conversation soft cap (~$0.50) with warning at 50% |

### Engine boundaries

| File | Type | Responsibility |
|---|---|---|
| `src/engine/coachPrompts.ts` | pure | Build system prompts from state + catalog |
| `src/engine/coachAdapter.ts` | pure | Validate/normalize LLM tool calls |
| `src/engine/conceptTags.ts` | pure | Taxonomy lookups |
| `src/hooks/useCoachChat.ts` | impure | Streaming session manager + Dexie writes |
| `src/components/Assessment/AssessmentChat.tsx` | UI | Initial assessment surface |
| `src/components/Assessment/LibraryConfirmation.tsx` | UI | Tag 3–5 items at end of assessment |
| `src/components/CheckIn/CheckInChat.tsx` | UI | Recurring check-in surface (shares ~70% with AssessmentChat) |
| `src/components/Plan/PlanDashboard.tsx` | UI | Weekly Focus home |
| `src/components/Plan/GoalCard.tsx` | UI | Single goal display + item list |
| `src/components/Plan/GuidedSession.tsx` | UI | Sequenced practice flow (Phase 5) |

---

## Implementation Phases

### Phase 0 — Cleanup (parallel with Phase 1)

Mostly mechanical. ~3000 lines removed.

- Delete components: `SkillTree`, `Pathway`, `Progress`, `PracticeSession`, current `Dashboard`, `ModeSelect`, `PathPicker`, `Intro/IntroFlow`
- Delete data: `curriculum.ts` (SKILLS[])
- Delete engine: FSRS scheduling + supporting plumbing
- Delete teacher mode components
- Simplify `App.tsx` page-state union
- Audit & salvage uncommitted Quick Pick refocus WIP: keep the +179 chord-diagram additions and Circle of 5ths enhancements; discard mode-select / path-picker / IntroFlow changes

### Phase 1 — Data model & concept tags

- Create `src/data/conceptTags.ts` (~15–20 hand-curated tags)
- Bulk-tag library items (LLM-assisted bootstrap + human review)
- Dexie v5 schema migration
- Sync engine integration for new tables

### Phase 2 — Plan dashboard skeleton (read-only)

- `PlanDashboard`, `GoalCard`
- Library re-housed as secondary tab
- App.tsx routing: dashboard is home

### Phase 3 — Assessment chat + first plan

- `coachPrompts`, `coachAdapter`, `useCoachChat`
- `AssessmentChat`, `LibraryConfirmation`
- API key gate promoted from Settings to startup
- End-to-end first-time flow

### Phase 4 — Check-in chat & 7-day cadence

- `CheckInChat` (reuses Phase 3 infra)
- Goal-diff confirmation UI
- 7-day timer + dashboard prompt
- "Refresh plan" escape hatch
- Soft-limit guard

→ **MVP ships after Phase 4.**

### Phase 5 — Guided session flow (post-MVP)

- `GuidedSession` with auto-advance + reflection
- Goal-card "▶ Guided session" button
- Reflection logged to `sessionItems` with goalId

### Phase 6 — Live tag editing across app (post-MVP)

- Tag affordance in LickPlayer, chord cards, song sections, scale viewer
- Optimistic UI; writes to `itemTags`

### Phase 7 — Polish

- Offline-state UI + disabled buttons
- Cost transparency in Settings
- "Retake initial assessment" trigger
- Achievement rewiring to goal-completion events
- Streak rules: any practice counts

---

## Risks & Callouts

1. **Branch hygiene**: current `feat/lick-source-qc` has both committed lick-QC work and unrelated WIP. Before starting: PR committed lick-QC work to main, decide fate of WIP, branch new `feat/coach-overhaul` from main.
2. **API key on first run**: promoting the API key entry to a startup gate needs a graceful "can't proceed without key" message for offline-first launches.
3. **Bulk tagging**: ~150+ items. LLM-assisted bootstrap + human review. Few hours of work.
4. **No test suite**: per CLAUDE.md, none exists. The pure-function engine modules (`coachPrompts`, `coachAdapter`) are prime candidates for adding minimal vitest coverage — high leverage, low investment.
5. **Achievement compatibility**: existing achievement criteria may reference skills that no longer exist. Audit during Phase 7; rewire to goal events or freeze list as legacy.
6. **Cost transparency**: users should see what their API usage costs them. Settings surface in Phase 7; per-conversation soft cap from day 1.

---

## Out of Scope

Explicitly deferred / not in this design:
- Audio detection for licks/songs (per project_direction memory, back-burnered)
- Tempo tracking per item
- Multi-user / teacher features (retired)
- FSRS spaced repetition (retired)
- Mobile-specific layouts (existing responsive CSS sufficient)
- Voice-based assessment (chat is text-only)
- Goal sharing / social features
- Pre-built "starter plans" for new users (assessment IS the personalization)
