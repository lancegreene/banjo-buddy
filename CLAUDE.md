# Banjo Buddy

A progressive web app that helps 5-string banjo players learn Scruggs-style picking through real-time audio feedback, curriculum-guided practice sessions, and progress tracking.

## Quick Reference

- **Stack**: React 18 + TypeScript + Vite, Zustand (state), Dexie v4/IndexedDB (persistence), Supabase (auth + sync), Tone.js (synth/metronome), pitchy (pitch detection), ts-fsrs (spaced repetition)
- **Build**: `npm run dev` (dev server), `npm run build` (tsc + vite build)
- **Deploy**: `npm run deploy` (gh-pages)
- **No test suite** — verify changes with `npx tsc --noEmit` and `npx vite build`
- **ESM project**: `"type": "module"` in package.json. Use `.cjs` for any CommonJS scripts.
- **Offline-first**: Dexie is the source of truth; Supabase sync is optional backup.

## Architecture

```
src/
  engine/          32 pure-function modules — no React, no side effects
  hooks/           9 React hooks wrapping engines (useNoteCapture, useBanjoSynth, etc.)
  components/      40+ feature directories (Practice, SkillTree, Library, Fretboard, etc.)
  data/            Static data: curriculum, roll patterns, lick library, songs, chords, achievements
  store/           Zustand store (useStore.ts) — single source of truth for all app state
  db/              Dexie schema (db.ts), Supabase client (supabase.ts), sync engine (sync.ts)
  styles/          Design tokens (tokens.css)
  types/           Shared TypeScript types
  utils/           Small utilities (calibration)
  workers/         Web Worker for essentia.js rhythm analysis
```

### Key Data Flow

1. **Audio in**: `useNoteCapture` hook → pitchy pitch detection → `detectOnset()` → `CapturedNote[]`
2. **Roll detection**: `CapturedNote[]` → `RollDetector` (batch, 8-note) or `LiveRollFeedback` (streaming, per-note)
3. **Session logging**: `logSessionItem()` → Dexie tables → enqueue for Supabase sync
4. **Recommendations**: `buildSessionPlan()` reads skill records + recent accuracy → prioritized practice plan
5. **Sync**: Dexie → sync queue → push to Supabase (every 30s + on reconnect) → pull remote changes

## Navigation & Routing

No React Router — single `<App>` switches on `currentPage` state from the store.

**Startup gates** (in order): Splash → AuthScreen → IntroFlow → OnboardingFlow → SiteTour → Main App

**Pages**: `dashboard`, `practice`, `skill-tree`, `pathway`, `progress`, `achievements`, `settings`, `profile`, `fretboard-lab`

**Tool modals** (float over any page): Metronome, Tuner, FretLab

**Split pages**: `pathway` uses sidebar + content layout with practice on the right.

## Note Detection Engine (Critical Path)

The most complex and tuning-sensitive code. Lives in `src/engine/noteCapture.ts` (pure functions) and `src/hooks/useNoteCapture.ts` (RAF loop + state).

### How Onset Detection Works

Each `requestAnimationFrame` (~16ms):
1. pitchy reads pitch + clarity from 1024-sample FFT window
2. RMS computed from raw audio buffer
3. Smooth RMS updated (EMA, 0.70/0.30 decay)
4. **Stability check**: pitch must agree with previous frame within 30 cents (bypassed for large pitch jumps or RMS spikes)
5. **`detectOnset()`**: two methods — pitch change (≥80 cents) OR RMS spike (≥1.25× smooth)
6. **Guards** (in order): global lockout → per-string RMS floor → same-string cooldown → octave harmonic block (with RMS override)
7. **Lockout reclassification**: after onset fires, pitch may settle to a different string during the 80ms lockout — reclassify the note

### Banjo String Frequencies (Open G Tuning)

| String | Note | Freq (Hz) | Finger |
|--------|------|-----------|--------|
| 5 | G4 | 392.0 | Thumb (short drone) |
| 4 | D3 | 146.83 | Thumb |
| 3 | G3 | 196.0 | Thumb |
| 2 | B3 | 246.94 | Index |
| 1 | D4 | 293.66 | Middle |

### The D3/D4 Octave Problem

**String 1 (D4, 293.66 Hz) and string 4 (D3, 146.83 Hz) are exactly one octave apart.** This is the hardest detection challenge:

- When D3 (string 4) is plucked, its octave harmonic rings at exactly 293.66 Hz — indistinguishable from a D4 pluck by frequency alone
- When D4 (string 1) is plucked, pitchy sometimes reads the initial transient at half-frequency (~147 Hz), looking like D3
- `getClosestString()` uses a two-pass approach: fundamentals take priority over harmonic matches, so 294 Hz → string 1 (correct)
- The **octave harmonic block** prevents D3's lingering harmonic from triggering a false string-1 onset
- The **RMS override** (`HARMONIC_OVERRIDE_RMS_RATIO = 2.5`) lets real D4 plucks through — a fresh pluck has much higher RMS than a decaying harmonic

**When tuning detection constants, always test with a forward roll** (3→2→1→5) — it exercises the D3/D4 boundary on every cycle.

### Detection Constants (useNoteCapture.ts)

| Constant | Value | Purpose |
|----------|-------|---------|
| `STRING_COOLDOWN_MS` | 300 | Same-string re-trigger block |
| `OCTAVE_HARMONIC_BLOCK_MS` | 350 | Cross-string harmonic block window |
| `HARMONIC_OVERRIDE_RMS_RATIO` | 2.5 | RMS ratio to override harmonic block (real pluck vs lingering harmonic) |
| `STRING5_MIN_RMS` | 0.025 | Floor for string 5 — filters ghost onsets from sympathetic resonance |
| `STRING4_MIN_RMS` | 0.035 | Floor for string 4 — filters D4-misreads at half-frequency |

### Debug Mode

Set `localStorage.setItem('banjo-debug', 'true')` in browser console, then listen. After playing, run:
```js
copy(JSON.stringify(window.__banjoDebug()))
```
Paste into `recordedData.txt` for offline analysis with `node analyze.cjs`. Each frame includes: `t, pitch, clarity, rms, smoothRms, stable, jump, spike, decision`.

Decision types: `onset`, `locked`, `no_onset`, `unstable`, `string_cooldown`, `octave_harmonic`, `rms_floor_str5`, `rms_floor_str4`.

## Data Layer

### Static Data Files (src/data/)

| File | Key Exports | Purpose |
|------|-------------|---------|
| `curriculum.ts` | `SKILLS[]`, `SKILL_MAP`, `CATEGORIES` | 100+ skills across 8 categories with prerequisites (DAG), exercises, BPM targets |
| `rollPatterns.ts` | `ROLL_PATTERNS[]`, `ROLL_MAP`, `refreshRollMap()` | 8 built-in Scruggs rolls + custom patterns from DB |
| `lickLibrary.ts` | `LICK_LIBRARY[]`, `LICK_MAP` | Melodic lick references (Foggy Mountain, Cripple Creek, G/C/D licks) for DTW matching |
| `songLibrary.ts` | `SONGS[]`, `SONG_MAP`, `SECTION_MAP` | Full song arrangements with measures, chord changes, tab notes (string/fret/technique) |
| `chordDiagrams.ts` | `CHORD_DIAGRAMS[]`, `CHORD_MAP` | Chord shapes with fret positions |
| `fretboardNotes.ts` | `OPEN_STRINGS`, `getNoteAtFret()` | Banjo fretboard pitch reference |
| `achievements.ts` | `ACHIEVEMENTS[]` | Achievement unlock conditions (streaks, BPM records, skill counts) |

### Database (Dexie v4 / IndexedDB)

12 tables. Key ones:

| Table | Purpose |
|-------|---------|
| `userProfiles` | User identity: solo, teacher, or student; admin flag; curriculum path |
| `skillRecords` | Per-user skill progress: status, BPM, practice count, FSRS state, mastery level |
| `practiceSessions` | Session metadata (start/end timestamps) |
| `sessionItems` | Individual practice items: skill, BPM, scores (rhythm/pitch/tempo/composite), recording ref |
| `noteAccuracyRecords` | Per-note evaluations with `[skillId+patternId+position]` index for weak-spot queries |
| `recordings` | Audio blobs (local only, not synced) |
| `streakRecords` | One record per practice day for streak tracking |
| `achievements` | Earned achievement timestamps |
| `customRollPatterns` | Teacher-created roll patterns with role-based visibility |
| `teacherConfigs` | Per-class/per-student skill overrides, media display settings |
| `teacherClips` | Teacher demo media (video/audio/image/tab crops) attached to skills |
| `skillImageOverrides` | Admin-set override images for skill display (synced via Supabase Storage) |

### Sync Engine (src/db/sync.ts)

Offline-first with eventual consistency:

1. All writes go to Dexie first (instant, works offline)
2. Changes enqueue to `syncQueue` with table name + operation
3. `pushPendingChanges()` upserts/deletes to Supabase (camelCase ↔ snake_case mapping)
4. `pullRemoteChanges()` fetches records newer than last sync, merges into Dexie (remote wins if newer)
5. `startAutoSync()` runs full sync every 30s + on `window.online`
6. Blob fields (audio, video, images) excluded from sync — media stays local

## Auth & Multi-User System

### Authentication

Supabase email/password auth. Session auto-restored on app load. Users can skip auth for local-only mode (`banjo-buddy-auth-skipped` in localStorage).

### User Roles

| Role | Access |
|------|--------|
| **solo** | Default guest mode, single profile, no teacher features |
| **teacher** | Creates/manages students, disables skills, uploads demo clips, custom roll patterns |
| **student** | Linked to a teacher via `teacherId`, sees teacher-filtered curriculum |
| **admin** | `isAdmin` flag — admin panel access, skill image overrides, database stats |

### Teacher Controls

- `disabledSkillIds[]` — class-wide curriculum filter
- `studentOverrides{ [studentId]: disabledSkillIds[] }` — per-student overrides
- Custom roll patterns (visible to their students)
- Demo clips (video/audio/image) attached to skills

## Curriculum & Recommendations

- Skills defined in `src/data/curriculum.ts` with prerequisites forming a DAG
- Categories: `setup`, `theory`, `rolls`, `chords`, `techniques`, `licks`, `songs`, `performance`
- Paths: `newby`, `beginner`, `intermediate`
- Status progression: `locked → unlocked → active → progressed → mastered`
- `buildSessionPlan()` allocates: 25% new skills, 50% active work, 25% maintenance/review
- Factors: BPM gap, recency, practice count, accuracy score, FSRS due date
- Low accuracy (<70%) triggers: higher priority, lower suggested BPM

## FSRS & Mastery

### Spaced Repetition (ts-fsrs)

- FSRS-5 algorithm schedules skill reviews based on composite score + self-rating
- State stored as JSON in `skillRecords.fsrsState`, next review in `fsrsNextReview`
- `isDueForReview()` checks if a skill needs practice

### 5-Level Mastery (engine/masteryLevels.ts)

Introduced → Developing → Competent → Mastered → Fluent

Decays over 30 days of inactivity. Overdue skills show visual indicator in skill tree.

## Library

Browse-only view under Skills page with three tabs:

- **Roll Repo** — all built-in + custom roll patterns
- **Lick Library** — all lick references
- **Song Studio** — all songs with section selector

Each item loads a FretLab-style tab viewer (FretboardDiagram + play/stop + BPM controls). Conversion functions: `rollPatternToFretNotes()`, `lickToFretNotes()`, `sectionToFretNotes()` in `engine/rollToFretNotes.ts`.

## Key Engine Modules

| Module | Purpose |
|--------|---------|
| `noteCapture.ts` | Core pitch detection, onset detection, D3/D4 handling |
| `rollDetection.ts` | Batch roll matching (8+ notes vs all patterns) |
| `streamingRollMatcher.ts` | Per-note streaming roll evaluation with cursor |
| `streamingSongMatcher.ts` | Streaming matcher for full song sections |
| `dtwMatcher.ts` | Dynamic Time Warping for lick comparison |
| `recommendationEngine.ts` | Session planning, skill status evaluation, unlock detection |
| `fsrs.ts` | FSRS-5 spaced repetition scheduling |
| `masteryLevels.ts` | 5-level mastery with decay |
| `performanceMetrics.ts` | Per-note accuracy, timing, rhythm/pitch/tempo scores |
| `weakSpotAnalysis.ts` | Per-position accuracy stats from noteAccuracyRecords |
| `banjoSynth.ts` | Karplus-Strong synthesis for demo playback |
| `adaptiveTempo.ts` | Auto-adjust BPM based on accuracy |
| `tabParser.ts` | Parse ASCII tablature → FretNote[] |
| `tabImageOcr.ts` | Extract tab from images (pattern matching + Claude Vision API) |
| `rollToFretNotes.ts` | Convert rolls/licks/song sections → FretNote[] for fretboard display |
| `achievementTracker.ts` | Check unlock conditions after each session |

## Conventions

- Engine files are **pure functions** — no React imports, no side effects
- Components are in feature directories: `src/components/FeatureName/Component.tsx`
- Single CSS file: `src/App.css` — class names follow BEM-ish pattern (`component-element-modifier`)
- All DB records use `crypto.randomUUID()` for IDs and ISO timestamps
- Zustand store is the bridge between React UI and Dexie persistence
- File header comments use the `// ───` box style
- Supabase column mapping: camelCase (TS) ↔ snake_case (Postgres) via `toSnake()`/`toCamel()`
