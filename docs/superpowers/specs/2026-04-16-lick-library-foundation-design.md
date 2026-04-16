# Banjo Buddy — Lick Library Foundation

**Date:** 2026-04-16
**Status:** Design — awaiting user review
**Target audience:** intermediate 5-string banjo players (Scruggs-style)

## Problem

The current Lick Library is thin: 15 licks total (5 song phrases + 3 G / 3 C / 3 D chord licks). It does not reflect the lick-based vocabulary intermediate players work from — the vocabulary laid out in Janet Davis's *Splitting the Licks* and Earl Scruggs's books (both owned, in `training_material/`).

Two structural gaps prevent simply adding more data:

1. **Schema is too narrow.** `LickReference.lickType: 'chord' | 'song'` cannot express the role/purpose taxonomy used in the source books (fill, ending, transition/leads-to, combination).
2. **Representation is pitch-only.** Licks are stored as `ReferenceNote[]` (pitch + octave + duration) for DTW matching. They cannot be rendered as tab without a pitch→fret heuristic, and that heuristic breaks on up-the-neck passages and ambiguous notes — the exact cases intermediate material covers. Meanwhile, songs already use `TabNote[]` (string/fret/finger/technique) and render fine.

Additionally, the user has decided to put audio detection and the Deep Dive curriculum on the back burner. This removes the last reason to keep licks in the pitch-only detection format.

## Goals

- Replace the lick schema with one that expresses role, chord context, and transition targets.
- Upgrade licks to `TabNote[]` representation so they render correctly and consistently with songs.
- Deliver an **interactive lick player** — visual cursor + metronome + count-in + loop + synth-mute — so licks feel like a practice tool, not a static page.
- Populate Wave 1 with 30 licks sourced from the user's owned books, organized by role × key.
- Establish a schema and architecture that Wave 2 (remaining ~40 licks to ~70 total) extends without engineering work.

## Non-goals

- Audio detection / DTW matching against new licks (back-burnered at user request).
- Deep Dive curriculum integration (Deep Dive itself is pending rework).
- Song library expansion (separate future spec).
- Chord progression display for song sections (separate future spec).
- A lick authoring UI (hand-authoring for Wave 1 is faster than building an editor).
- FSRS scheduling, self-rating, favorites, search — all deferred.

## Approach

Approach **B — Full integrated delivery**. Schema change + 30 licks (wave 1) + role/key/leadsTo filters + the full play-along rig (cursor, tempo, count-in, loop, click, synth-mute), shipped together. Wave 1 proves the pipeline end-to-end; Wave 2 is pure data entry against a validated schema.

Rejected: A (data-only — leaves the "interactive big step from the page" unmet), C (lick authoring tool — premature; 30 licks is a weekend of transcription, weeks to build a good editor).

---

## Section 1 — Data model

```ts
export type LickRole = 'basic' | 'fill' | 'ending' | 'transition' | 'combination'

export interface LickReference {
  id: string
  name: string
  description: string
  key: string              // 'G' | 'C' | 'D' | ...
  role: LickRole
  leadsTo?: string         // chord name; only for role === 'transition'
  chord?: string           // primary chord context for basic/fill/ending
  measureCount: 1 | 2      // 2 only for 'combination' licks
  referenceBpm: number     // learning tempo
  source?: string          // e.g. 'Splitting the Licks, p.11'
  tab: TabNote[]           // shared shape with songs: string, fret, beat, finger, technique
}
```

**Decisions:**
- `role` + optional `leadsTo` covers 90% of filtering needs; `leadsTo` is the one bit of extra context that distinguishes transitions from fills in a useful way.
- `chord` is separate from `role` because fill/ending licks are also chord-anchored; only transitions have a *target* chord.
- `measureCount` is explicit so the player and renderer know up front. Combination licks render double-wide; the beat counter spans 16 beats instead of 8.
- `tab: TabNote[]` uses the same type songs use. One rendering pipeline. No pitch→fret heuristic.
- `source` pins each lick to a verifiable origin for future review and for student trust.

**Dropped:** `lickType: 'chord' | 'song'`, `notes: ReferenceNote[]`. Song phrases move out of the lick library entirely — they are song fragments, not reusable building blocks, and were duplicates of data already in `songLibrary.ts`.

---

## Section 2 — Architecture

### New & modified files

```
src/
  data/
    lickLibrary.ts              [rewritten]  new schema + 30 licks
  engine/
    rollToFretNotes.ts          [modified]   delete lickToFretNotes; drop ReferenceNote import
    dtwMatcher.ts               [modified]   inline a private ReferenceNote type (was re-exported from lickLibrary)
  components/
    LickPlayer/                 [new]
      LickPlayer.tsx            interactive player: tab + cursor + controls
      useTabPlayback.ts         hook: playback state machine, BPM-timed dispatch
    Library/
      Library.tsx               [modified]   new filters (role, leadsTo); LickPlayer replaces FretboardDiagram for licks
    LickDetector/               [unchanged, dormant]
```

### Data flow (playback)

```
Library filters → user picks lick → <LickPlayer lick={...} />
                                        │
                                        ├── useTabPlayback({ tab, bpm, loop, countIn, clickOn, synthMuted })
                                        │     - RAF loop; advances `currentBeat` at (60/bpm)s intervals
                                        │     - On beat boundary: if !synthMuted → banjoSynth.playNote(notes at beat)
                                        │                          if clickOn     → metronome tick on beats 0,2,4,6
                                        │     - On last beat: loop ? reset : stop
                                        │
                                        └── renders FretboardDiagram(tab, highlightedBeat=currentBeat)
```

### Boundaries

- `useTabPlayback` is **tab-agnostic**. Accepts any `TabNote[]`. Named for reuse when song playback gets modernized.
- `LickPlayer` is lick-specific — knows `role`, `leadsTo`, `source`, handles 2-measure combination layout.
- `FretboardDiagram` gets one new optional prop: `highlightedBeat?: number`. All other rendering unchanged.
- Playback state is component-local. No Dexie, no Zustand store, no sessions. Licks are pure reference/practice material.

### Implementation note

Existing `components/Practice/PlayAlong.tsx` likely has reusable cadence/tempo logic. Implementation task: audit PlayAlong.tsx, extract common primitives into `useTabPlayback`, keep PlayAlong working unchanged.

---

## Section 3 — Play-along UX spec

### Detail view layout

```
┌─────────────────────────────────────────────────────────┐
│ [Lick name]          "Basic G-lick" (ending)            │
│ Key: G  Role: ending  Source: Splitting the Licks p.11  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┬─────────────┐   2-measure combination  │
│  │  Measure 1  │  Measure 2  │   (or 1 wide for most)   │
│  │ ─●──●──○──● │ ─○──●──●──● │   ● = highlighted beat   │
│  │ ─○──○──●──○ │ ─●──○──○──○ │       (the cursor)       │
│  │  T  I  M  T │  I  M  T  I │                          │
│  └─────────────┴─────────────┘                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ▶ Play   🔁 Loop   🎵 Count-in   [Synth ●○ Click ●○]  │
│  BPM  [  80 ]  ◯─────────●──────◯   (40 ────── 160)    │
├─────────────────────────────────────────────────────────┤
│  [Description text from the lick]                       │
└─────────────────────────────────────────────────────────┘
```

### Behavior

- **Cursor:** discrete per-beat highlight (amber background + outline using theme tokens). No between-beat animation.
- **Play/Pause:** play → count-in (if on) → loop. Pause halts at current beat; resume picks up there.
- **Count-in:** 4 metronome clicks at current tempo, no synth. After click 4, beat 0 fires. Default **on**. Does **not** re-run on each loop iteration, only at initial play.
- **Loop:** wrap to beat 0 after last beat. Default **on**.
- **Click track:** metronome ticks on every even beat (0, 2, 4, 6 for 1-measure licks; 0, 2, 4, 6, 8, 10, 12, 14 for 2-measure combination licks) — quarter-note pulse. Default **on**.
- **Synth mute:** cursor + click continue, no banjo notes. The "I'll play it myself" mode.
- **Tempo slider:** 40–160 BPM, integer snap. Changing tempo mid-play restarts the current measure at the new tempo.
- **Stop state:** cursor parks on beat 0, measure 1.

### Deferred

- No waveform, accuracy feedback, recording (detection-adjacent, back-burnered).
- No per-section looping. Combination licks loop as a whole unit.
- No independent click volume. Reuse existing metronome tone.
- No keyboard shortcuts.

---

## Section 4 — Library UI changes

### Filters

```
Role:     [ All ] [Basic] [Fill] [Ending] [Transition] [Combination]
Key:      [ All ] [ G ] [ C ] [ D ] [ A ] ...
Leads to: (shown only when Role = Transition) [ Any ] [ C ] [ D ] [ G ] ...
```

- Chips. Single-select within each row.
- "Leads to" row hidden unless Role = Transition.

### Lick list card

```
┌──────────────────────────────────────────┐
│ G-Lick — Basic                           │
│ G · basic · 1 measure · 80 BPM           │
│ "Classic Scruggs phrase-ending lick..."  │
└──────────────────────────────────────────┘
```

- Card fields: name; meta row (key / role / measure-count / BPM); description snippet.
- Combination licks get a subtle amber border to stand out in the list.
- Click → opens LickPlayer detail view. Back button restores filter state.

### Unchanged

- Library's outer shell (category picker, nav).
- Other categories (Rolls, Chords, Circle of 5ths, Scales, Song Studio, Roll Generator).
- Static `FretboardDiagram` remains the viewer for rolls, songs, scales, chords. Only licks switch to `LickPlayer`.

### Not included

- No search box (filters sufficient for 30-70 licks).
- No favorites / bookmarks.
- No "related licks" cross-linking.
- No grid/list view toggle.

---

## Section 5 — Wave 1 corpus (30 licks)

### Role × key distribution

| Role        | G | C | D | Total |
|-------------|---|---|---|-------|
| Basic       | 5 | 5 | 5 | 15    |
| Fill        | 2 | 1 | 1 | 4     |
| Ending      | 2 | 1 | 1 | 4     |
| Transition  | 2 (D→G), 2 (G→C), 1 (C→G) |   |   | 5     |
| Combination | 2 (2-measure)             |   |   | 2     |
| **Total**   |   |   |   | **30** |

### Sourcing

Every lick must come from a book the user owns. Primary: Janet Davis, *Splitting the Licks*, p.10-12 and surrounding pages. Secondary: Earl Scruggs, *Earl Scruggs and the 5-String Banjo*, vols 1-2. Each lick's `source` field cites book + page.

### Migration of existing 15 licks

**Keep + upgrade to `TabNote`** (9 licks — IDs preserved to avoid curriculum cascade):
- `g_lick_basic`, `g_lick_tag`, `g_lick_forward_roll`
- `c_lick_basic`, `c_lick_hammer`, `c_lick_fill`
- `d_lick_basic`, `d_lick_pull_off`, `d_lick_transition`

**Delete** (5 song-phrase licks — duplicates of data already in `songLibrary.ts`):
- `foggy_mountain_a1`, `foggy_mountain_a2`, `cripple_creek_intro`, `cripple_creek_a`, `cripple_creek_b`

Wave 1 = **9 upgraded + 21 net-new = 30 licks**.

### Execution approach

1. Schema + 9 upgraded licks authored directly by Claude (source is the existing in-repo tab notation).
2. For the 21 net-new licks: dispatch the `banjo-theory` subagent per page of source material. Subagent parses the book photograph, produces TabNote sequences, validates chord context and technique markers.
3. User reviews each batch before commit. Catching transcription errors at data entry is far cheaper than after the library ships.

### Left flexible for implementation

- Specific lick selection within each role/key bucket — proposed by Claude before transcription, approved by user, driven by transcription clarity + song-context coverage.
- Per-lick `referenceBpm` — defaults 80 for chord licks; matches song tempo for song-adjacent licks.

### Wave 2 preview (not in this spec)

Remaining ~40 licks to reach ~70. Same schema, pure data-entry. No new engineering.

---

## Section 6 — Migration & housekeeping

### A. Schema migration of 9 chord licks

- Rewrite `g_lick_basic` … `d_lick_transition` to the new shape.
- **IDs preserved.** 9 curriculum skills reference these IDs (confirmed via grep at spec time). Keeping IDs stable avoids a cascade of curriculum edits.
- Derive `tab: TabNote[]` from the original tab notation in each existing lick's description/comments, cross-checked against source books.

### B. Deletion of 5 song-phrase licks

- Remove from `lickLibrary.ts`.
- **Curriculum fix:** 2 skills currently reference deleted IDs via `lickId:`
  - `curriculum.ts:748` — `cripple_creek_mastered` references `cripple_creek_intro`
  - `curriculum.ts:1928` — `foggy_mountain_breakdown` references `foggy_mountain_a1`
- Fix: remove the `lickId` field from those two skills. Each already has a parallel `detect: { kind: 'section', id: '...' }` that handles section-level detection when/if detection re-activates.

### C. Dormant code — left untouched

- `components/LickDetector/LickDetector.tsx` — still referenced by `PracticeSession.tsx` and curriculum. No new licks feed it, but it still compiles.
- `engine/dtwMatcher.ts` — inline a private `ReferenceNote` type inside the file (was imported from `lickLibrary`, which no longer exports it). Keeps the file compilable without reviving the old schema.

### D. Deletions

- `engine/rollToFretNotes.ts::lickToFretNotes` — delete. New licks have `tab` natively.
- `lickLibrary.ts` exports: drop `ReferenceNote`, drop `LickType`, drop `LICK_TYPES` (replaced by role chips), drop `getLickKeys` if unused after filter refactor (verify at implementation time).

### E. Verification gates (no test suite per CLAUDE.md)

1. `npx tsc --noEmit` passes.
2. `npx vite build` succeeds.
3. Manual browser smoke test:
   - Library → Lick Library → filter by each role shows expected counts.
   - Open a Basic G-lick → LickPlayer renders tab → Play runs count-in, cursor advances, synth fires, loops cleanly.
   - Toggle Synth-Mute + Click → only metronome plays, cursor still advances.
   - Open a Combination lick → 2-measure side-by-side layout.
   - Open a Transition lick → `→ G` badge; filter "leads to G" finds it.
   - Deep Dive → open `g_lick_basic_skill` → still loads (IDs preserved).

### F. Commit discipline

1. Schema change + 9 upgraded licks + curriculum cleanup (minimum viable compile).
2. `useTabPlayback` hook + `LickPlayer` component.
3. `Library.tsx` filter update + LickPlayer integration.
4. New lick batches — one commit per ~5 licks, each reviewed by user before commit.

---

## Risks

- **Transcription accuracy.** The primary risk. Mis-read tab photographs → wrong frets or fingerings in the library. Mitigation: `banjo-theory` subagent per page, user review before commit, `source` field pinning each lick to verifiable origin.
- **PlayAlong extraction scope creep.** Auditing `PlayAlong.tsx` for reusable primitives could turn into an unplanned refactor. Mitigation: if extraction isn't clean in ~1 hour, write `useTabPlayback` fresh and leave PlayAlong alone.
- **Cursor/audio timing drift.** `requestAnimationFrame` cadence vs `Tone.js` synth scheduling can desync at low BPM. Mitigation: use `Tone.Transport` or explicit `setTimeout` scheduling tied to the same clock the synth uses; do not mix clocks.

## Follow-ups (separate specs)

- **Wave 2 lick corpus** — ~40 more licks to reach ~70 total. Pure data entry.
- **Song library expansion** — 5-10 intermediate tunes from Scruggs vol 2 + common bluegrass repertoire.
- **Chord progression display** — per-section chord roadmap for songs.
- **Song section → lick suggestions** — cross-linking Janet Davis's "substitute this lick at this measure" teaching approach.
