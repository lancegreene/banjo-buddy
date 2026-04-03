# Banjo Buddy

A progressive web app that helps 5-string banjo players learn Scruggs-style picking through real-time audio feedback, curriculum-guided practice sessions, and progress tracking.

## Quick Reference

- **Stack**: React 18 + TypeScript + Vite, Zustand (state), Dexie v4/IndexedDB (persistence), Supabase (auth + sync), Tone.js (synth/metronome), pitchy (pitch detection), ts-fsrs (spaced repetition), ONNX Runtime Web (digit/label classification)
- **Build**: `npm run dev` (dev server), `npm run build` (tsc + vite build)
- **Deploy**: `npm run deploy` (gh-pages)
- **No test suite** — verify changes with `npx tsc --noEmit` and `npx vite build`
- **ESM project**: `"type": "module"` in package.json. Use `.cjs` for any CommonJS scripts.
- **Offline-first**: Dexie is the source of truth; Supabase sync is optional backup.

## Architecture

```
src/
  engine/          34 pure-function modules — no React, no side effects
  hooks/           9 React hooks wrapping engines (useNoteCapture, useBanjoSynth, etc.)
  components/      35 feature directories (Practice, SkillTree, Library, Fretboard, etc.)
  data/            Static data: curriculum, roll patterns, lick library, songs, chords, achievements
  store/           Zustand store (useStore.ts) — single source of truth for all app state
  db/              Dexie schema (db.ts), Supabase client (supabase.ts), sync engine (sync.ts)
  styles/          Design tokens (tokens.css)
  types/           Shared TypeScript types
  utils/           Small utilities (calibration)
  workers/         Web Worker for essentia.js rhythm analysis
scripts/           Python training pipeline (digit/label CNN → ONNX export)
public/models/     ONNX models: digit-classifier.onnx, label-classifier.onnx
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

## Tab Scanning Pipeline (Fretboard Lab)

Image-to-tab conversion for importing printed/digital banjo tablature. Entry point: `FretboardLab.tsx` → image upload → crop → `TabOverlayEditor.tsx`.

### Pipeline Steps

1. **Staff line detection** (`tabImageOcr.ts:detectStaffLines`) — horizontal coverage scoring: for each row, measures what fraction of the image width is dark. Staff lines score 50%+ coverage (span full width), unlike notes (localized). Finds peaks, then selects best group of 5 evenly-spaced ones using pair-based gap extrapolation.
2. **Note position detection** (`tabImageOcr.ts:detectNotePositions`) — scans columns between staff lines for dark pixel clusters, applies size/concentration filters to separate notes from stems/beams.
3. **Local digit classification** (`digitClassifier.ts`) — ONNX Runtime Web loads `digit-classifier.onnx` (LeNet-5 variant, ~200KB). Crops 32x32 grayscale patches at each note position, classifies fret number (0-9). Includes 9→0 heuristic: circled zeros in real tabs misread as "9" — auto-correct when confidence < 97%.
4. **Local label classification** (`digitClassifier.ts`) — loads `label-classifier.onnx` for finger labels (T/I/M). Low accuracy on real images (~25% confidence) — trained on synthetic data only. Falls back to string-based defaults (lines 3-5→T, 2→I, 1→M).
5. **Vision API fallback** (`tabImageOcr.ts:callVisionModel`) — Claude claude-sonnet-4-6 reads annotated image with numbered arrows. "Read Tab (AI)" button does frets + labels in one call (~$0.005/scan). "Read Frets" button uses local model only (free).
6. **Overlay editor** (`TabOverlayEditor.tsx`) — interactive canvas overlay for reviewing/correcting detected notes, adjusting staff lines, setting frets/fingers/techniques/durations/groups.
7. **Training data collection** — corrected results saved to `tabTrainingPairs` (IndexedDB) for model retraining. Export as JSON with base64 images.

### Synthetic Data Generation

`syntheticTabGenerator.ts` renders thousands of tab images via Canvas with randomized fonts, sizes, noise, rotation, line weights. Generates both full images and 32x32 digit crops with ground truth. Circled zeros render "0" text inside circle to match real tab notation.

### Training Pipeline (`scripts/`)

```bash
python scripts/train_digit_model.py --data export.json --epochs 30 --output public/models/digit-classifier.onnx
```

LeNet-5 variant CNN (Conv→ReLU→Pool ×3 → FC). Trains on exported JSON from TabTrainingManager. Outputs ONNX for browser inference.

### Key Heuristics

- **9→0 correction**: `if (fret === 9 && confidence < 0.97) fret = 0` — circled open-string notation reads as "9"
- **Label crop position**: always at `lineYs[4] + lineGap * 0.8` (below bottom staff line), NOT relative to each note's line
- **Vision API JSON parsing**: extract from markdown code fences first, then non-greedy `{...}` fallback — the model sometimes repeats JSON with commentary

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
| `tourSteps.ts` | Tour step definitions | Guided tour sequence for onboarding |

### Database (Dexie v4 / IndexedDB)

13 tables. Key ones:

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
| `tabTrainingPairs` | Tab image + corrected notes for digit model training |

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
- Status progression: `locked -> unlocked -> active -> progressed -> mastered`
- `buildSessionPlan()` allocates: 25% new skills, 50% active work, 25% maintenance/review
- Factors: BPM gap, recency, practice count, accuracy score, FSRS due date
- Low accuracy (<70%) triggers: higher priority, lower suggested BPM

## FSRS & Mastery

### Spaced Repetition (ts-fsrs)

- FSRS-5 algorithm schedules skill reviews based on composite score + self-rating
- State stored as JSON in `skillRecords.fsrsState`, next review in `fsrsNextReview`
- `isDueForReview()` checks if a skill needs practice

### 5-Level Mastery (engine/masteryLevels.ts)

Introduced -> Developing -> Competent -> Mastered -> Fluent

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
| `weakSpotDrillGenerator.ts` | Generate targeted drills for weak positions |
| `banjoSynth.ts` | Karplus-Strong synthesis for demo playback |
| `adaptiveTempo.ts` | Auto-adjust BPM based on accuracy |
| `tabParser.ts` | Parse ASCII tablature -> FretNote[] |
| `tabImageOcr.ts` | Staff line detection, note detection, Vision API integration |
| `digitClassifier.ts` | ONNX model loading + digit/label inference |
| `syntheticTabGenerator.ts` | Canvas-rendered synthetic tab images for training |
| `rollToFretNotes.ts` | Convert rolls/licks/song sections -> FretNote[] for fretboard display |
| `achievementTracker.ts` | Check unlock conditions after each session |
| `theoryEngine.ts` | Music theory utilities (scales, intervals, chord construction) |
| `fingerBalance.ts` | Analyze finger usage distribution across practice |
| `coachingCards.ts` | Generate practice tips based on performance patterns |
| `rhythmAnalysis.ts` | Rhythm pattern analysis (uses Web Worker with essentia.js) |
| `teacherMode.ts` | Teacher curriculum management and student filtering |
| `challengeEngine.ts` | Practice challenge/goal generation |
| `focusMode.ts` | Focused practice session management |
| `warmupEngine.ts` | Generate warmup exercise sequences |
| `plateauDetector.ts` | Detect when a student plateaus on a skill |
| `autoChunker.ts` | Auto-segment practice into logical chunks |
| `tempoRamp.ts` | Gradual tempo increase during practice |
| `imageCropService.ts` | Image cropping utilities for teacher clips |
| `teacherClipService.ts` | Teacher demo media management |
| `recordingService.ts` | Audio recording utilities |
| `analyticsQueries.ts` | Dexie queries for progress analytics |
| `spacedRepetition.ts` | Legacy spaced repetition (pre-FSRS) |

## Conventions

- Engine files are **pure functions** — no React imports, no side effects
- Components are in feature directories: `src/components/FeatureName/Component.tsx`
- Single CSS file: `src/App.css` — class names follow BEM-ish pattern (`component-element-modifier`)
- All DB records use `crypto.randomUUID()` for IDs and ISO timestamps
- Zustand store is the bridge between React UI and Dexie persistence
- File header comments use the `// ───` box style
- Supabase column mapping: camelCase (TS) ↔ snake_case (Postgres) via `toSnake()`/`toCamel()`
